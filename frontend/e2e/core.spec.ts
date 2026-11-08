import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import axe, { type AxeResults } from 'axe-core';

const grace = '10000000-0000-4000-8000-000000000001';
const riverside = '10000000-0000-4000-8000-000000000002';
const baseUrl = 'http://127.0.0.1:3002';

async function auditAccessibility(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const auditWindow = window as unknown as { axe: { run: (context: Document, options: object) => Promise<AxeResults> } };
    const results = await auditWindow.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return results.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => node.target) }));
  });
  expect(violations, 'Automated WCAG checks do not replace human full-process review').toEqual([]);
}

async function login(page: Page, persona: 'admin' | 'contributor' | 'pastor' | 'member') {
  await page.goto(`/api/v1/auth/login?persona=${persona}`);
  await page.waitForURL(url => url.origin === baseUrl && !url.pathname.startsWith('/api/'), { timeout: 30_000 });
  const session = await page.request.get('/api/v1/auth/session');
  expect(session.status()).toBe(200);
  return session.json();
}

async function command(context: BrowserContext, method: 'POST' | 'PUT', route: string, body: unknown, etag?: string) {
  const sessionResponse = await context.request.get(`${baseUrl}/api/v1/auth/session`);
  const session = await sessionResponse.json();
  return context.request.fetch(`${baseUrl}/api/v1${route}`, {
    method,
    headers: { 'X-CSRF-Token': session.csrfToken, 'Idempotency-Key': randomUUID(), ...(etag ? { 'If-Match': etag } : {}) },
    data: body
  });
}

test('1.1.3 authorized church teams can upload a logo, review object palette, and activate it', async ({ page }) => {
  await login(page, 'contributor');
  await page.goto(`/theme?church=${grace}`);
  await expect(page.getByRole('heading', { name: 'Make Rooted feel like your church.' })).toBeVisible();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  await page.locator('#church-logo').setInputFiles({ name: 'grace-logo.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Process logo & suggest palette' }).click();
  await expect(page.getByRole('heading', { name: '2. Review the logo palette' })).toBeVisible();
  await page.getByRole('button', { name: 'Save church brand theme' }).click();
  await expect(page.getByText('Church brand theme saved.')).toBeVisible();
  await page.goto(`/dashboard?church=${grace}`);
  await expect(page.locator('.sidebar .brand-logo')).toBeVisible();
});

test('1.1.4 church administrators can edit tenant name without replacing Rooted identity', async ({ page }) => {
  await login(page, 'admin');
  await page.goto(`/settings?church=${grace}`);
  const name = page.locator('#church-identity-name');
  await expect(name).toHaveValue('Grace Community Church');
  await name.fill('Grace Community Church · Rooted Test');
  await page.getByRole('button', { name: 'Save church name' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.church-name')).toContainText('Grace Community Church · Rooted Test');
  await expect(page.locator('.sidebar .brand')).toBeVisible();
  await name.fill('Grace Community Church');
  await page.getByRole('button', { name: 'Save church name' }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.church-name')).toContainText('Grace Community Church');
});

test('1.1.5 standalone theme and account pages provide a safe way back home', async ({ page }) => {
  await login(page, 'admin');
  await page.goto(`/theme?church=${grace}`);
  await page.getByRole('link', { name: '← Return to workspace' }).click();
  await expect(page).toHaveURL(/\/dashboard\?church=/);
  await page.goto(`/user?church=${grace}`);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.locator('input, textarea, select')).toHaveCount(0);
  await page.getByRole('link', { name: '← Return to workspace' }).click();
  await expect(page).toHaveURL(/\/dashboard\?church=/);
  await page.goto('/onboarding');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Rooted home', exact: true })).toBeVisible();
  await expect(page.getByText('separate plan and content review')).toHaveCount(0);
  await expect(page.getByText('Gather', { exact: true })).toHaveCount(0);
});

test('public church pages remain readable after sign-out', async ({ page }) => {
  await login(page, 'member');
  await page.goto(`/c/grace`);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Make room for what matters.' })).toBeVisible();
  expect((await page.request.get('/api/v1/auth/session')).status()).toBe(401);
});

test('1.2.0 calendar view toggles with list view and opens all study details in the visible month', async ({ page }) => {
  await login(page, 'admin');
  const workspace = await (await page.request.get(`/api/v1/churches/${grace}/workspace`)).json();
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: workspace.church.timeZone, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const currentMonth = `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`;
  await page.goto(`/calendar?church=${grace}`);
  await expect(page.getByRole('button', { name: 'Calendar view' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Study month')).toHaveValue(currentMonth);
  const currentSlots = workspace.slots.filter((slot: { localDate: string }) => slot.localDate.startsWith(currentMonth));
  const month = currentSlots.length ? currentMonth : workspace.slots[0].localDate.slice(0, 7);
  if (month !== currentMonth) await page.getByLabel('Study month').fill(month);
  const visibleSlots = workspace.slots.filter((slot: { localDate: string }) => slot.localDate.startsWith(month));
  await expect(page.locator('.calendar-grid')).toBeVisible();
  await expect(page.locator('.calendar-study')).toHaveCount(visibleSlots.length);
  await page.locator('.calendar-study').first().click();
  await expect(page.locator('.calendar-detail-summary')).toBeVisible();
  await page.getByRole('button', { name: 'List view' }).click();
  await expect(page.getByTestId('date-selector')).toBeVisible();
});

test('AC13/14 real OIDC session denies unauthenticated, foreign-tenant and implicit approval access', async ({ browser, page }) => {
  expect((await page.request.get(`/api/v1/churches/${grace}/workspace`)).status()).toBe(401);
  await login(page, 'contributor');
  expect((await page.request.get(`/api/v1/churches/${grace}/workspace`)).status()).toBe(200);
  expect((await page.request.get(`/api/v1/churches/${riverside}/workspace`)).status()).toBe(404);
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await login(memberPage, 'member');
  const denied = await command(memberContext, 'POST', `/churches/${grace}/sermons`, { title: 'Forbidden', preachedDate: '2026-10-18', speaker: 'Member', passages: [], notes: '' });
  expect(denied.status()).toBe(403);
  await memberContext.close();
});

test('AC01/02/03/05/06/10 date-first blank manual plan saves through the real API and survives reload', async ({ page, browser }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await login(adminPage, 'admin');
  const sermonTitle = `Browser sermon ${randomUUID()}`;
  await adminPage.goto('/sermons');
  await adminPage.getByLabel(/^Sermon title/).fill(sermonTitle);
  await adminPage.getByLabel(/^Speaker/).fill('Pastor Jordan');
  await adminPage.getByLabel('Source notes', { exact: true }).fill('Fictional church-authored sermon notes: read John 6:60–69 in context.');
  await adminPage.getByRole('checkbox', { name: 'I have permission to use these sermon notes.' }).check();
  const captured = adminPage.waitForResponse(response => response.url().endsWith(`/churches/${grace}/sermons`) && response.request().method() === 'POST');
  await adminPage.getByRole('button', { name: 'Save sermon', exact: true }).click();
  const sermonResponse = await captured;
  expect(sermonResponse.status()).toBe(201);
  const sermon = await sermonResponse.json();
  const seriesResponse = await command(adminContext, 'POST', `/churches/${grace}/series`, { title: `Browser week ${randomUUID()}`, weekAnchor: '2031-01-06', timeZone: 'America/New_York', sermonIds: [sermon.id] });
  expect(seriesResponse.status()).toBe(201);
  const series = await seriesResponse.json();
  const slotResponse = await command(adminContext, 'POST', `/churches/${grace}/series/${series.id}/slots`, { localDate: '2031-01-06', localTime: '08:00', timeZone: 'America/New_York', assigneeIds: ['contributor'] });
  expect(slotResponse.status()).toBe(201);
  const slot = await slotResponse.json();
  await login(page, 'contributor');
  await page.goto(`/studies?church=${grace}&slot=${slot.id}&month=2031-01`);
  await expect(page.getByTestId('date-selector')).toBeVisible();
  await page.getByTestId(`date-card-${slot.id}`).click();
  await expect(page.getByText('Source & planning notes (optional)', { exact: true })).toHaveCount(0);
  const createdContent = page.waitForResponse(response => /\/plans\/[^/]+\/content$/.test(response.url()) && response.request().method()==='POST');
  await page.getByRole('button',{name:'Create study draft',exact:true}).click();
  const content = await (await createdContent).json();
  for (const field of ['content-title', 'content-references', 'content-body', 'content-reflection', 'content-question', 'content-application']) {
    await expect(page.getByTestId(field)).toHaveValue('');
  }
  const dates = await page.getByTestId('date-selector').boundingBox();
  const pane = await page.locator('.content-section').boundingBox();
  expect(dates && pane && dates.y < pane.y).toBeTruthy();
  await page.getByTestId('content-title').fill('Words of eternal life');
  await page.getByTestId('content-references').fill('John 6:68');
  await page.getByTestId('content-body').fill('Read Peter’s response within its narrative context.');
  await page.getByTestId('content-question').fill('What does Peter’s response invite us to consider?');
  await expect.poll(async () => {
    const response = await page.request.get(`/api/v1/churches/${grace}/content/${content.id}`);
    return (await response.json()).head.payload.discussionQuestion;
  }).toBe('What does Peter’s response invite us to consider?');
  await page.reload();
  await expect(page.getByTestId('content-title')).toHaveValue('Words of eternal life');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await auditAccessibility(page);
  await page.screenshot({ path: 'frontend/test-results/date-first-mobile.png', fullPage: true });
  await adminContext.close();
});

test('AC07/08/09/11/12/22 one contributor approval gates explicit publication and member snapshots', async ({ browser, page }) => {
  const publicationDate = '2031-02-10';
  const staffContext = await browser.newContext();
  const staffPage = await staffContext.newPage();
  await login(staffPage, 'contributor');
  const reviewerContext = await browser.newContext();
  const reviewerPage = await reviewerContext.newPage();
  await login(reviewerPage, 'admin');
  const create = async (context: BrowserContext, route: string, body: unknown, etag?: string, status = 201) => {
    const response = await command(context, 'POST', `/churches/${grace}${route}`, body, etag);
    expect(response.status(), await response.text()).toBe(status);
    return response.json();
  };
  const series = await create(staffContext, '/series', { title: `Publication ${randomUUID()}`, weekAnchor: publicationDate, timeZone: 'America/New_York', sermonIds: [] });
  const slot = await create(staffContext, `/series/${series.id}/slots`, { localDate: publicationDate, localTime: '08:00', timeZone: 'America/New_York', assigneeIds: ['contributor'] });
  let plan = await (await staffContext.request.get(`${baseUrl}/api/v1/churches/${grace}/plans/${slot.planId}`)).json();
  plan = await create(staffContext, `/plans/${plan.id}/revisions`, { baseRevisionId: plan.headRevisionId, payload: { schemaVersion: 1, title: 'Words of eternal life', primaryScripture: { reference: 'John 6:68', translation: null }, learningObjective: 'Consider Peter’s response in its narrative context.', outline: ['Read John 6:60–69', 'Observe the question and response'], discussionQuestion: 'What does Peter recognize?', notes: '', extensions: [] } }, plan.etag);
  let content = await create(staffContext, `/plans/${plan.id}/content`, { mode: 'manual' }, plan.etag);
  const payload = { schemaVersion: 1, title: `Published hope ${randomUUID()}`, body: 'Read John 6:60–69. Consider the setting of Peter’s response.', reflection: 'Pause and reflect on the question Jesus asks.', discussionQuestion: 'What do you notice about Peter’s reply?', application: 'Read the surrounding passage with someone this week.', references: ['John 6:68'], outboundPreview: 'Read today’s reflection with Grace Community.' };
  content = await create(staffContext, `/content/${content.id}/revisions`, { baseRevisionId: content.headRevisionId, payload }, content.etag);
  const denied = await command(reviewerContext, 'POST', `/churches/${grace}/content/${content.id}/publish`, { revisionId: content.headRevisionId, approvalId: randomUUID() }, content.etag);
  expect([404,409]).toContain(denied.status());
  content = await create(staffContext, `/content/${content.id}/submit`, { revisionId: content.headRevisionId, approverId: 'admin', note: 'Review the exact public revision.' }, content.etag, 200);
  await reviewerPage.goto(`/studies?church=${grace}&slot=${slot.id}&month=${publicationDate.slice(0, 7)}`);
  await reviewerPage.getByTestId(`date-card-${slot.id}`).click();
  await reviewerPage.getByTestId('content-approve').click();
  await expect.poll(async () => (await (await staffContext.request.get(`${baseUrl}/api/v1/churches/${grace}/content/${content.id}`)).json()).status).toBe('approved');
  content = await (await staffContext.request.get(`${baseUrl}/api/v1/churches/${grace}/content/${content.id}`)).json();
  const publishedNow = await command(reviewerContext, 'POST', `/churches/${grace}/content/${content.id}/publish`, { revisionId: content.headRevisionId, approvalId: content.approvalId }, content.etag);
  expect(publishedNow.status()).toBe(201);
  content = await (await staffContext.request.get(`${baseUrl}/api/v1/churches/${grace}/content/${content.id}`)).json();
  expect(content.status).toBe('published');
  expect(content.livePublicationId).toBeTruthy();
  const adminContext = await browser.newContext(); const adminPage = await adminContext.newPage();
  await login(adminPage, 'admin');
  const reviewed = await command(adminContext, 'POST', `/churches/${grace}/public-access`, { action: 'enable_read', evidence: 'Browser fixture content reviewed for public reading.' });
  expect(reviewed.status(), await reviewed.text()).toBe(200);
  expect((await command(adminContext, 'POST', `/churches/${grace}/public-access`, { action: 'enable_engagement' })).status()).toBe(200);
  expect((await command(adminContext, 'POST', `/churches/${grace}/settings`, { discussionsEnabled: true })).status()).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/c/grace/studies/${content.livePublicationId}`);
  expect((await page.request.get('/api/v1/auth/session')).status()).toBe(401);
  await expect(page.getByRole('heading', { name: payload.title, exact: true })).toBeVisible();
  await expect(page.getByText(payload.body, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Like ·/ }).click();
  await expect(page.getByRole('button', { name: /^Like ·/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Your name').fill('Browser reader');
  await page.getByLabel('Your comment').fill('A question from a guest browser.');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByText('Your comment was submitted for church review.')).toBeVisible();
  const moderationResponse = await staffContext.request.get(`${baseUrl}/api/v1/churches/${grace}/public-moderation`);
  expect(moderationResponse.status(), await moderationResponse.text()).toBe(200);
  const moderation = await moderationResponse.json();
  const pending = moderation.items.find((item: { body: string; id: string }) => item.body === 'A question from a guest browser.');
  expect(pending).toBeTruthy();
  const approvedComment = await command(staffContext, 'POST', `/churches/${grace}/public-moderation/${pending.id}/decision`, { decision: 'approve', reason: 'Reviewed browser fixture.' });
  expect(approvedComment.status(), await approvedComment.text()).toBe(200);
  await page.reload();
  await expect(page.getByText('A question from a guest browser.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await auditAccessibility(page);
  await page.screenshot({ path: 'frontend/test-results/member-published-mobile.png', fullPage: true });
  const updated = await create(staffContext, `/content/${content.id}/revisions`, { baseRevisionId: content.headRevisionId, payload: { ...payload, title: 'Unapproved replacement must remain private' } }, content.etag);
  expect(updated.status).toBe('draft');
  await page.reload();
  await expect(page.getByRole('heading', { name: payload.title, exact: true })).toBeVisible();
  await expect(page.getByText('Unapproved replacement must remain private')).toHaveCount(0);
  await staffContext.close();
  await reviewerContext.close();
  await adminContext.close();
});

test('AC10/11 independent browser editors preserve stale and offline writing until explicit recovery', async ({ browser, page }) => {
  await login(page, 'contributor');
  const seriesResponse = await command(page.context(), 'POST', `/churches/${grace}/series`, { title: `Recovery ${randomUUID()}`, weekAnchor: '2031-03-17', timeZone: 'America/New_York', sermonIds: [] });
  expect(seriesResponse.status()).toBe(201);
  const series = await seriesResponse.json();
  const slotResponse = await command(page.context(), 'POST', `/churches/${grace}/series/${series.id}/slots`, { localDate: '2031-03-17', localTime: '08:00', timeZone: 'America/New_York', assigneeIds: ['contributor'] });
  expect(slotResponse.status()).toBe(201);
  const slot = await slotResponse.json();
  const basePlan=await(await page.request.get(`/api/v1/churches/${grace}/plans/${slot.planId}`)).json();
  const createdContent=await command(page.context(),'POST',`/churches/${grace}/plans/${basePlan.id}/content`,{mode:'manual'},basePlan.etag);
  expect(createdContent.status()).toBe(201);const content=await createdContent.json();
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await login(otherPage, 'contributor');
  const route = `/studies?church=${grace}&slot=${slot.id}&month=2031-03`;
  await page.goto(route);
  await otherPage.goto(route);
  await expect(page.getByTestId('content-title')).toBeVisible();
  await expect(otherPage.getByTestId('content-title')).toBeVisible();
  await otherContext.setOffline(true);
  await page.getByTestId('content-title').fill('First saved revision');
  await expect.poll(async () => (await (await page.request.get(`/api/v1/churches/${grace}/content/${content.id}`)).json()).head.payload.title).toBe('First saved revision');
  await otherPage.getByTestId('content-title').fill('Second contributor working copy');
  await otherContext.setOffline(false);
  await expect(otherPage.getByRole('heading', { name: 'A newer content revision exists.' })).toBeVisible();
  await expect(otherPage.getByTestId('content-title')).toHaveValue('Second contributor working copy');
  await expect(otherPage.locator('.diff-grid')).toContainText('First saved revision');
  await otherPage.getByRole('button', { name: 'Use resolved fields against latest revision' }).click();
  await expect.poll(async () => (await (await page.request.get(`/api/v1/churches/${grace}/content/${content.id}`)).json()).head.payload.title).toBe('Second contributor working copy');
  await otherContext.setOffline(true);
  await otherPage.getByTestId('content-reflection').fill('Offline reflection that must survive a reload');
  await expect(otherPage.locator('.save-status')).toContainText('not synced');
  await otherContext.setOffline(false);
  await otherPage.reload();
  await otherPage.getByRole('button', { name: 'Restore local content' }).click();
  await expect(otherPage.getByTestId('content-reflection')).toHaveValue('Offline reflection that must survive a reload');
  await expect.poll(async () => (await (await page.request.get(`/api/v1/churches/${grace}/content/${content.id}`)).json()).head.payload.reflection).toBe('Offline reflection that must survive a reload');
  await otherContext.close();
});
