import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import axe from 'axe-core';
import { legacyMarketingFragments, marketingPages } from '../lib/marketing';

const evidence = 'BuildPrompts/1.2.15/evidence';
mkdirSync(`${evidence}/screenshots`, { recursive: true });

test('1.2.15 focused public pages preserve the approved layout and accessibility', async ({ page }) => {
  test.setTimeout(300_000);
  const measurements: object[] = [];
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/v1/')) requests.push(`${request.method()} ${new URL(request.url()).pathname}`); });
  const sizes = [
    { name: 'desktop', width: 1440, height: 900 }, { name: 'laptop', width: 1366, height: 768 },
    { name: 'compact', width: 1280, height: 800 }, { name: 'wide-menu-edge', width: 1101, height: 768 },
    { name: 'menu-edge', width: 1100, height: 768 }, { name: 'tablet', width: 1024, height: 768 },
    { name: 'narrow-tablet', width: 800, height: 900 }, { name: 'mobile', width: 390, height: 844 },
    { name: 'small-mobile', width: 320, height: 568 },
  ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    for (const item of marketingPages) {
      const response = await page.goto(item.href);
      expect(response?.status()).toBe(200);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page).toHaveTitle(`${item.title} · Rooted`);
      await expect(page.locator(`nav a[href="${item.href}"]`)).toHaveAttribute('aria-current', 'page');
      await page.locator('.marketing-site').waitFor();
      const measure = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, viewport: innerWidth, mainTop: document.querySelector('main')!.getBoundingClientRect().top }));
      measurements.push({ route: item.href, size: size.name, ...measure });
      expect(measure.width, `${size.name} ${item.href} horizontal overflow`).toBeLessThanOrEqual(size.width);
      if (size.name === 'laptop') expect(measure.height, `${item.href} desktop page growth`).toBeLessThanOrEqual(size.height * 1.5);
      if (size.name === 'mobile') expect(measure.height, `${item.href} mobile page growth`).toBeLessThanOrEqual(size.height * 2.1);
      if (['desktop', 'mobile', 'small-mobile'].includes(size.name)) {
        await page.screenshot({ path: `${evidence}/screenshots/${item.href.slice(1) || 'home'}-${size.name}.png`, fullPage: true });
      }
      if (['desktop', 'mobile', 'small-mobile'].includes(size.name)) {
        await page.addScriptTag({ content: axe.source });
        const issues = await page.evaluate(async () => {
          const w = window as unknown as { axe: typeof axe };
          return (await w.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }));
        });
        expect(issues, `${item.href} ${size.name} accessibility`).toEqual([]);
      }
    }
  }
  expect(errors).toEqual([]);
  expect(requests, 'Static marketing topics must not require any API calls').toEqual([]);
  writeFileSync(`${evidence}/layout-validation.json`, JSON.stringify({ checkedAt: new Date().toISOString(), measurements, errors, apiRequests: requests }, null, 2));
});

test('1.2.15 navigation, disclosure, keyboard, examples, and tour work in the application', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await nav.getByRole('link', { name: 'Why Rooted', exact: true }).click();
  await expect(page).toHaveURL('/why-rooted');
  await page.goBack(); await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Let Sunday');
  await page.goForward(); await expect(page).toHaveURL('/why-rooted');
  await page.getByRole('button', { name: 'Before Sunday', exact: true }).click();
  await expect(page.getByText('Pray & anticipate', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'After Sunday', exact: true }).click();
  await expect(page.getByText('Live one next step', { exact: true })).toBeVisible();
  await page.locator('#rooted-difference summary').click(); await expect(page.locator('#rooted-difference')).toHaveAttribute('open');
  await expect(page.locator('#rooted-difference strong')).toHaveCount(4);
  await page.goto('/how-it-works');
  for (const [audience, screens] of [['For members', ['Find this week', 'Read & reflect']], ['For your team', ['Workspace', 'Review & share', 'Plan the week']]] as const) {
    await page.getByRole('button', { name: audience, exact: true }).click();
    for (const [index, name] of screens.entries()) {
      await page.getByRole('button', { name: `0${index + 1} ${name}`, exact: true }).click();
      await expect(page.locator('.product-screen img')).toBeVisible();
      await expect.poll(() => page.locator('.product-screen img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      expect(await page.locator('.product-screen a').getAttribute('href')).toMatch(/^\/showcase\/[a-z-]+\.webp$/);
    }
  }
  await page.goto('/ai-co-writer');
  await page.getByRole('button', { name: 'With sermon notes', exact: true }).click();
  await expect(page.getByText(/Our sermon notes focus/)).toBeVisible();
  await page.locator('.context-details summary').click(); await expect(page.locator('.context-details')).toHaveAttribute('open');
  await expect(page.locator('.context-details')).toContainText('Conversations stay scoped to your account and church');
  await page.goto('/questions');
  for (const summary of await page.locator('.faqs summary').all()) { await summary.click(); await expect(summary.locator('..')).toHaveAttribute('open'); }

  for (const width of [1100, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 844 }); await page.goto('/');
    const menu = page.getByRole('button', { name: 'Menu: Home', exact: true });
    await expect(nav).toBeHidden(); await menu.click(); await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.locator('a:visible')).toHaveCount(8);
    await page.keyboard.press('Escape'); await expect(menu).toBeFocused(); await expect(nav).toBeHidden();
    await menu.click(); await nav.getByRole('link', { name: 'How it works', exact: true }).click();
    await expect(page).toHaveURL('/how-it-works'); await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    await page.goBack(); await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  }
  for (const route of ['/sign-in', '/get-started']) {
    await page.goto(route); await page.locator('.menu-toggle').click();
    await expect(page.locator(`nav a[href="${route}"]`)).toHaveAttribute('aria-current', 'page');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator(`.header-actions a[href="${route}"]`)).toHaveAttribute('aria-current', 'page');
    await page.setViewportSize({ width: 320, height: 568 });
  }
  for (const [route, target] of [['/why-rooted', '#example-week'], ['/ai-co-writer', '#example-co-writer']]) {
    await page.goto(route); await page.locator('.page-shortcut').click();
    await expect(page.locator(target)).toBeFocused();
    const top = await page.locator(target).evaluate(node => node.getBoundingClientRect().top);
    const headerBottom = await page.locator('.site-header').evaluate(node => node.getBoundingClientRect().bottom);
    expect(top).toBeGreaterThanOrEqual(headerBottom);
  }
  const unknown = await page.goto('/not-a-rooted-page');
  // Next's existing async workspace catch-all can stream its not-found UI with HTTP 200.
  // Preserve that boundary: no workspace/marketing content and an explicit noindex result.
  expect([200, 404]).toContain(unknown?.status());
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  await expect(page.locator('.marketing-site')).toHaveCount(0);
  expect(await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.some(node => node.getAttribute('content')?.includes('noindex')))).toBe(true);
});

test('1.2.15 legacy homepage links resolve without Back loops and preserve requested examples', async ({ page }) => {
  test.setTimeout(150_000);
  for (const [fragment, target] of Object.entries(legacyMarketingFragments)) {
    await page.goto('/sample-study');
    await page.goto(`/${fragment}`);
    await expect(page).toHaveURL(target);
    if (fragment === '#before-panel') await expect(page.getByRole('button', { name: 'Before Sunday', exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (fragment === '#ai-detailed-panel') await expect(page.getByRole('button', { name: 'With sermon notes', exact: true })).toHaveAttribute('aria-pressed', 'true');
    if (fragment === '#trust') await expect(page.locator('#trust')).toHaveAttribute('open');
    if (fragment === '#the-rooted-difference') await expect(page.locator('#rooted-difference')).toHaveAttribute('open');
    await page.goBack(); await expect(page).toHaveURL('/sample-study');
  }
  await page.goto('/#unknown-section'); await expect(page).toHaveURL('/#unknown-section');
  await page.evaluate(() => { location.hash = '#how-it-works'; }); await expect(page).toHaveURL('/how-it-works');
  await page.goto('/sign-in?returnTo=%2Fstudies&access=contributor#trust');
  await expect(page.locator('a[href^="/api/v1/auth/login?"]')).toHaveAttribute('href', /returnTo=%2Fstudies/);
  expect(new URL(page.url()).pathname).toBe('/sign-in'); expect(new URL(page.url()).searchParams.get('access')).toBe('contributor');
});

test('1.2.15 server-rendered public navigation works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  const link = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Why Rooted', exact: true });
  await expect(link).toBeVisible(); await link.click(); await expect(page).toHaveURL('/why-rooted');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('the message to grow');
  await page.locator('#rooted-difference summary').click(); await expect(page.locator('#rooted-difference')).toHaveAttribute('open');
  await context.close();
});
