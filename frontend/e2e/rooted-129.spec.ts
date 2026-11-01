import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const churchId = '10000000-0000-4000-8000-000000000001';
const prefix = `/api/v1/churches/${churchId}`;

async function login(page: Page, persona: string) {
  await page.goto(`/api/v1/auth/login?persona=${persona}`);
  await page.waitForURL(url => !url.pathname.startsWith('/api/'));
  expect((await page.request.get('/api/v1/auth/session')).status()).toBe(200);
}

async function command(context: BrowserContext, path: string, body: unknown, etag?: string, method = 'POST') {
  const session = await (await context.request.get('/api/v1/auth/session')).json();
  return context.request.fetch(prefix + path, { method, headers: { 'X-CSRF-Token': session.csrfToken, 'Idempotency-Key': randomUUID(), ...(etag ? { 'If-Match': etag } : {}) }, data: body });
}

test('1.2.9 J1/J3 UI create → one approval → member response → answer → withdraw → confirmed Hard Delete', async ({ browser, page }) => {
  test.setTimeout(150_000);
  await login(page, 'anna.contributor');
  await page.goto(`/studies?church=${churchId}&month=2026-10`);
  await page.getByRole('button', { name: /Week 3 · Oct 11/ }).click();
  await page.getByRole('button', { name: '+ Add a study date', exact: true }).click();
  await page.getByLabel('Study date', { exact: true }).fill('2026-10-12');
  await page.getByLabel('Assigned contributor', { exact: true }).selectOption('anna.contributor');
  const createdResponse = page.waitForResponse(response => /\/series\/[^/]+\/slots$/.test(response.url()) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add study date', exact: true }).click();
  const created = await createdResponse; expect(created.status(), await created.text()).toBe(201); const slot = await created.json();
  await page.getByRole('button', { name: 'Create study draft', exact: true }).click();
  await expect(page.getByRole('heading',{name:'Bring the study to life.',exact:true})).toBeVisible();
  const title = `A shared hope ${randomUUID().slice(0, 8)}`;
  const body = 'Peter brings his questions to Jesus. Read John 6:68 in its context.';
  await page.getByTestId('content-title').fill(title); await page.getByTestId('content-body').fill(body);
  await page.getByTestId('content-reflection').fill('Where do you turn when life feels uncertain?');
  await page.getByTestId('content-question').fill('What helps you pray during the workday?');
  await page.getByTestId('content-application').fill('Pause before lunch and pray one simple sentence.');
  await page.getByRole('button',{name:'Next: Gain Approval',exact:true}).click();
  const approver = page.getByLabel('Approver', { exact: true });
  await expect.poll(async () => approver.locator('option').allTextContents()).toContain('James Ellis');
  const approverOptions = await approver.locator('option').allTextContents();
  expect(approverOptions).not.toContain('Local contributor');
  expect(approverOptions).not.toContain('Morgan Admin');
  await approver.selectOption('james.contributor');
  const submittedResponse = page.waitForResponse(response => /\/content\/[^/]+\/submit$/.test(response.url()) && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit study for approval', exact: true }).click();
  const submitted = await submittedResponse; expect(submitted.status(), await submitted.text()).toBe(200); const requested = await submitted.json();
  expect(requested.status).toBe('in_review'); expect(requested.head.payload.body).toBe(body); expect(requested.head.payload.application).toContain('before lunch');
  const reviewerContext = await browser.newContext(); const reviewer = await reviewerContext.newPage();
  await login(reviewer, 'james.contributor'); await reviewer.goto(`/studies?church=${churchId}&slot=${slot.id}`);
  const approvedResponse = reviewer.waitForResponse(response => /\/content\/[^/]+\/decisions$/.test(response.url()) && response.request().method() === 'POST');
  await reviewer.getByTestId('content-approve').click();
  const approved = await approvedResponse; expect(approved.status(), await approved.text()).toBe(201); const published = await approved.json();
  expect(published.status).toBe('published'); expect(published.livePublicationId).toBeTruthy();
  await reviewer.screenshot({ path: 'frontend/test-results/129-approved-and-published-desktop.png', fullPage: true });
  const configured = await command(page.context(), '/settings', { readingPolicy: 'members', discussionsEnabled: true }); expect(configured.status()).toBe(200);
  const memberContext = await browser.newContext({ viewport: { width: 390, height: 844 } }); const member = await memberContext.newPage();
  await member.addInitScript(() => {
    const readWindow = window as unknown as { __readChunks: string[] };
    readWindow.__readChunks = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak: (utterance: SpeechSynthesisUtterance) => readWindow.__readChunks.push(utterance.text), pause: () => undefined, resume: () => undefined, cancel: () => undefined, getVoices: () => [] } });
  });
  await login(member, 'riley.member'); await member.goto(`/c/grace`);
  await expect(member.getByRole('link', { name: /Rooted/ }).first()).toBeVisible();
  await expect(member.getByText('Gather', { exact: true })).toHaveCount(0);
  await member.getByRole('link', { name: 'Begin this study', exact: true }).click();
  await expect(member).toHaveURL(new RegExp('/studies/' + published.livePublicationId));
  await expect(member.getByText(body, { exact: true })).toBeVisible();
  await expect(member.getByText(/Negative comments that attack or demean others/)).toBeVisible();
  expect(await member.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(member.getByRole('button', { name: 'Listen to study', exact: true })).toBeEnabled();
  await member.getByRole('button', { name: 'Listen to study', exact: true }).click();
  await expect(member.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(await member.evaluate(() => (window as unknown as { __readChunks: string[] }).__readChunks[0])).toContain(title);
  await member.getByRole('button', { name: 'Pause', exact: true }).click();
  await member.getByRole('button', { name: 'Resume', exact: true }).click();
  await member.getByRole('button', { name: 'Stop', exact: true }).click();

  for (const [label, type] of [['Like', 'like'], ['Inspired', 'fire'], ['Praying', 'praying']]) {
    const saved = member.waitForResponse(response => response.url().endsWith('/my-reaction') && response.request().method() === 'PUT');
    await member.getByRole('button', { name: new RegExp('^' + label + ' ·') }).click();
    const result = await saved; expect(result.status()).toBe(200); expect((await result.json()).type).toBe(type);
    await expect(member.getByRole('button', { name: new RegExp('^' + label + ' ·') })).toHaveAttribute('aria-pressed', 'true');
  }
  await member.getByRole('button', { name: /^Thankful/ }).click();
  await member.getByRole('radio', { name: 'Question', exact: true }).check();
  const questionText = 'How can I pray while my workday is busy?';
  await member.getByLabel('Your comment', { exact: true }).fill(questionText);
  await member.getByRole('button', { name: 'Submit comment', exact: true }).click();
  await expect(member.getByText('Your comment is private while your church reviews it.')).toBeVisible();
  await page.goto(`/engagement?church=${churchId}&publication=${published.livePublicationId}&filter=pending`);
  const question = page.locator('article.comment').filter({ hasText: questionText });
  await question.getByLabel('Moderation reason').fill('A sincere question about prayer.');
  await question.getByRole('button', { name: 'Approve comment', exact: true }).click();
  const unansweredLoaded = page.waitForResponse(response => response.url().includes(`/engagement/studies/${published.livePublicationId}/comments?filter=unanswered`) && response.status() === 200);
  await page.getByLabel('Show comments').selectOption('unanswered');
  await unansweredLoaded;
  const reply = 'Try a brief reminder before lunch. Begin with one sentence.';
  await expect(question.getByLabel('Reply or resolution reason')).toBeVisible();
  await question.getByLabel('Reply or resolution reason').fill(reply);
  await question.getByRole('button', { name: 'Post reply', exact: true }).click();
  await expect(page.getByText('Reply posted. The question is marked answered.')).toBeVisible();
  await member.reload(); await expect(member.getByText(reply, { exact: true })).toBeVisible();
  await member.getByLabel('Your comment', { exact: true }).fill('You are an idiot.');
  await member.getByRole('button', { name: 'Submit comment', exact: true }).click();
  await expect(member.getByText('Your comment was declined. You can revise it or contact your church.')).toBeVisible();
  await member.screenshot({ path: 'frontend/test-results/129-member-question-reply-decline-mobile.png', fullPage: true });
  await reviewer.goto(`/c/grace/studies/${published.livePublicationId}`); await expect(reviewer.getByText('You are an idiot.', { exact: true })).toHaveCount(0);
  await expect(reviewer.getByRole('link', { name: /Rooted/ }).first()).toBeVisible();
  await expect(reviewer.getByText('Gather', { exact: true })).toHaveCount(0);
  await page.goto(`/dashboard?church=${churchId}`); await expect(page.getByRole('heading', { name: 'Study Preparation', exact: true })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Member Engagement', exact: true })).toBeVisible();
  const summary = await (await page.request.get(prefix + `/dashboard?publicationId=${published.livePublicationId}`)).json(); expect(summary.engagement.publicationId).toBe(published.livePublicationId); expect(summary.engagement.questionsNeedingAnswer).toBe(0); expect(summary.engagement.reactions.thankful).toBe(1); expect(summary.engagement.uniqueAudienceOpens).toBe(1);
  await page.screenshot({ path: 'frontend/test-results/129-dashboard-desktop.png', fullPage: true });
  await page.goto(`/engagement?church=${churchId}&publication=${published.livePublicationId}`);
  await expect(page.getByRole('button', { name: 'Delete study', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Withdraw from members', exact: true }).click();
  const withdrawDialog = page.getByRole('dialog'); await withdrawDialog.getByLabel('Reason (required)').fill('Retain the historical artifact while hiding it from members.');
  await withdrawDialog.getByRole('button', { name: 'Withdraw study', exact: true }).click();
  await expect.poll(async () => (await member.request.get(prefix + `/studies/${published.livePublicationId}`)).status()).toBe(404);
  const adminContext = await browser.newContext(); const admin = await adminContext.newPage(); await login(admin, 'morgan.admin');
  await admin.goto(`/engagement?church=${churchId}&publication=${published.livePublicationId}`);
  await expect(admin.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await admin.getByRole('button', { name: 'Hard Delete study', exact: true }).click();
  const purgeDialog = admin.getByRole('dialog'); await expect(purgeDialog.getByText(/irreversible/)).toBeVisible();
  await purgeDialog.getByLabel('Reason (required)').fill('Explicit deletion of a disposable browser test artifact.');
  await expect(purgeDialog.getByRole('button', { name: 'Hard Delete study', exact: true })).toBeDisabled();
  await purgeDialog.getByLabel(`Type the study title to confirm: ${title}`).fill(title);
  await admin.screenshot({ path: 'frontend/test-results/129-hard-delete-warning.png', fullPage: true });
  await purgeDialog.getByRole('button', { name: 'Hard Delete study', exact: true }).click();
  await expect.poll(async () => (await admin.request.get(prefix + `/engagement/studies/${published.livePublicationId}`)).status()).toBe(404);
  await adminContext.close(); await memberContext.close(); await reviewerContext.close();
});

test('1.2.9 J2 move a study across a week and month, update Dashboard, reject an occupied day, then delete its draft', async ({ page }) => {
  await login(page, 'anna.contributor');
  const seriesResponse = await command(page.context(), '/series', { title: 'Move fixture', weekAnchor: '2032-06-01', timeZone: 'UTC', sermonIds: [] }); expect(seriesResponse.status()).toBe(201); const series = await seriesResponse.json();
  const firstResponse = await command(page.context(), `/series/${series.id}/slots`, { localDate: '2032-06-02', localTime: '08:00', timeZone: 'UTC', assigneeIds: ['anna.contributor'] }); expect(firstResponse.status()).toBe(201); const first = await firstResponse.json();
  const occupiedResponse = await command(page.context(), `/series/${series.id}/slots`, { localDate: '2032-06-03', localTime: '08:00', timeZone: 'UTC', assigneeIds: ['anna.contributor'] }); expect(occupiedResponse.status()).toBe(201);
  await page.goto(`/studies?church=${churchId}&slot=${first.id}`);
  await page.getByRole('button', { name: 'Study date & assignment', exact: true }).click();
  await page.getByLabel('Study date', { exact: true }).fill('2032-06-03');
  await page.getByRole('button', { name: 'Save study settings', exact: true }).click();
  await expect(page.getByText(/already reserves this church date/)).toBeVisible();
  await page.getByLabel('Study date', { exact: true }).fill('2032-07-01');
  const movedResponse = page.waitForResponse(response => response.url().endsWith(`/slots/${first.id}`) && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save study settings', exact: true }).click(); expect((await movedResponse).status()).toBe(200);
  await expect(page.getByLabel('Study month')).toHaveValue('2032-07');
  const oldWeek = await (await page.request.get(prefix + '/dashboard?weekStart=2032-05-30')).json(); expect(oldWeek.studies.some((study: { studyId: string }) => study.studyId === first.id)).toBe(false);
  const newWeek = await (await page.request.get(prefix + '/dashboard?weekStart=2032-06-27')).json(); expect(newWeek.studies.some((study: { studyId: string }) => study.studyId === first.id)).toBe(true);
  await page.getByRole('button', { name: 'Delete study', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Delete study', exact: true }).click();
  await expect(page.getByText('Study removed from the active workspace.')).toBeVisible();
  await expect(page.getByTestId(`date-card-${first.id}`)).toHaveCount(0);
});
