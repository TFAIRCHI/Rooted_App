import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import axe from 'axe-core';

const churchId = '10000000-0000-4000-8000-000000000001';
const evidence = 'BuildPrompts/settings-four-views/evidence';
mkdirSync(evidence, { recursive: true });

async function login(page: Page) {
  await page.goto('/api/v1/auth/login?persona=admin');
  await page.waitForURL(url => !url.pathname.startsWith('/api/'));
  expect((await page.request.get('/api/v1/auth/session')).status()).toBe(200);
}

async function accessible(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: typeof axe }).axe;
    return (await engine.run(document.querySelector('main')!, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }));
  });
  expect(violations).toEqual([]);
}

test('settings split keeps church context, functional invitation flow, and four desktop/mobile views', async ({ page }) => {
  await login(page);
  await page.goto(`/settings?church=${churchId}`);
  await expect(page).toHaveURL(`/settings/church?church=${churchId}`);
  const nav = page.getByRole('navigation', { name: 'Workspace' });
  for (const label of ['Dashboard', 'Calendar', 'Create a Study', 'Study Engagement', 'Members & access', 'Church settings', 'Reading & publishing', 'Integrations & assistance']) await expect(nav.getByRole('link', { name: label })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'A workspace shaped by your church.' })).toBeVisible();
  await accessible(page);
  await page.screenshot({ path: `${evidence}/church-desktop.png`, fullPage: true });

  await nav.getByRole('link', { name: 'Reading & publishing' }).click();
  await expect(page).toHaveURL(`/settings/reading?church=${churchId}`);
  await expect(page.getByRole('heading', { name: 'A clear path from study to community.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Public study access' })).toBeVisible();
  await accessible(page);
  await page.screenshot({ path: `${evidence}/reading-desktop.png`, fullPage: true });

  await nav.getByRole('link', { name: 'Integrations & assistance' }).click();
  await expect(page.getByRole('heading', { name: 'Helpful tools. Thoughtful boundaries.' })).toBeVisible();
  await expect(page.getByText('External services are disabled by the operator.')).toBeVisible();
  await page.getByLabel('Assistance profile and biblical guidance').fill('Human church review and Scripture context are required.');
  await page.getByLabel('Profile version').fill('settings-test-v1');
  await page.getByLabel('Monthly hard token limit').fill('12000');
  await page.getByLabel('I confirm the church has permission to use selected sources with these services.').check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Church assistance profile and hard limits saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Monthly hard token limit')).toHaveValue('12000');
  await accessible(page);
  await page.screenshot({ path: `${evidence}/integrations-desktop.png`, fullPage: true });

  await nav.getByRole('link', { name: 'Members & access' }).click();
  await expect(page.getByRole('heading', { name: 'The people shaping the work.' })).toBeVisible();
  await accessible(page);
  await page.getByRole('button', { name: 'Invite person' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const email = `fixture-${randomUUID()}@rooted.test`;
  await dialog.getByLabel('First name').fill('Casey');
  await dialog.getByLabel('Last name').fill('Invitee');
  await dialog.getByLabel('Email address').fill(email);
  await dialog.getByRole('button', { name: /Send invitation to/ }).click();
  await expect(page.getByText(email).first()).toBeVisible();
  const memberRow = page.getByRole('row').filter({ hasText: 'Riley Morgan' });
  await memberRow.getByRole('button', { name: 'Edit access' }).click();
  await page.getByRole('dialog').getByLabel('Reason for change').fill('Verify reversible church access control.');
  await page.getByRole('dialog').getByRole('button', { name: 'Deactivate access' }).click();
  await expect(memberRow.getByText('Inactive')).toBeVisible();
  await memberRow.getByRole('button', { name: 'Edit access' }).click();
  await page.getByRole('dialog').getByLabel('Reason for change').fill('Restore access after the test.');
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivate access' }).click();
  await expect(memberRow.getByText('Active', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${evidence}/members-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The people shaping the work.' })).toBeVisible();
  await page.screenshot({ path: `${evidence}/members-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(nav.getByRole('link', { name: 'Church settings' })).toBeVisible();
});
