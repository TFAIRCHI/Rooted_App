import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// This command is intentionally restricted to the local release candidate.
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3081');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw new Error('Release check must target a local candidate, not production.');
const root = path.dirname(fileURLToPath(import.meta.url));
const evidence = path.join(root, 'evidence');
await mkdir(path.join(evidence, 'production-screenshots'), { recursive: true });
const publicOrigin = 'https://rooted-together.com';
const routes = ['/', '/why-rooted', '/how-it-works', '/ai-co-writer', '/power-of-four', '/questions', '/get-started', '/sample-study'];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ baseURL: base.origin, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const results = [];
function check(condition, description) { results.push({ description, passed: Boolean(condition) }); if (!condition) throw new Error(description); }
try {
  for (const route of routes) {
    const response = await page.goto(route);
    check(response.status() === 200, `${route} returns HTTP 200`);
    const metadata = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      robots: [...document.querySelectorAll('meta[name="robots"]')].map(n => n.getAttribute('content')),
      og: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
      mainCount: document.querySelectorAll('main').length,
      h1Count: document.querySelectorAll('h1').length,
    }));
    check(Boolean(metadata.description) && metadata.title.endsWith('· Rooted'), `${route} has public title and description`);
    const expected = new URL(route, publicOrigin).href;
    check(metadata.canonical && metadata.og && new URL(metadata.canonical).href === expected && new URL(metadata.og).href === expected, `${route} has correct production canonical and OpenGraph URL`);
    check(metadata.robots.length > 0 && metadata.robots.every(r => r.includes('index') && !r.includes('noindex') && !r.includes('nofollow')), `${route} is indexable with production origin`);
    check(metadata.mainCount === 1 && metadata.h1Count === 1, `${route} retains one main and H1`);
    check(!(await page.locator('body').innerText()).match(/Research prototype|Navigation concept|Preview team path|No AI request is sent/), `${route} excludes prototype UI copy`);
    if (routes.indexOf(route) < 6) {
      await page.screenshot({ path: path.join(evidence, 'production-screenshots', `${route.slice(1) || 'home'}-desktop.png`), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} mobile has no horizontal overflow`);
      await page.screenshot({ path: path.join(evidence, 'production-screenshots', `${route.slice(1) || 'home'}-mobile.png`), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 900 });
    }
  }
  const robots = await (await context.request.get('/robots.txt')).text();
  const sitemap = await (await context.request.get('/sitemap.xml')).text();
  check(routes.every(route => robots.includes(`Allow: ${route}$`)), 'Robots explicitly allows all eight public pages');
  check(robots.includes('Disallow: /') && !robots.includes('Allow: /\n'), 'Robots preserves the public allowlist boundary');
  check(robots.includes('/_next/image') && robots.includes('/showcase/'), 'Robots allows the public application screenshot resources');
  check(routes.every(route => sitemap.includes(new URL(route, publicOrigin).href)), 'Sitemap contains all eight public routes');
  check(!/\/c\/|\/sign-in|\/dashboard|\/settings|\/onboarding/.test(sitemap), 'Sitemap excludes private account/church/workspace paths');
  for (const route of ['/sign-in', '/dashboard', '/c/river-front-church-demo']) {
    const response = await context.request.get(route);
    check(response.headers()['cache-control']?.includes('no-store') && response.headers()['x-robots-tag']?.includes('noindex'), `${route} retains private cache/indexing headers`);
  }
  for (const image of ['member-home', 'member-study', 'team-dashboard', 'team-editor', 'team-calendar']) {
    const response = await context.request.get(`/showcase/${image}.webp`);
    check(response.status() === 200 && response.headers()['content-type']?.includes('image/webp'), `${image} application screenshot is packaged`);
  }
  await page.goto('/how-it-works');
  await page.getByRole('button', { name: 'For your team', exact: true }).click();
  await page.getByRole('button', { name: '03 Plan the week', exact: true }).click();
  await page.locator('.product-screen img').waitFor();
  await page.waitForFunction(() => { const image = document.querySelector('.product-screen img'); return image?.complete && image.naturalWidth > 0; });
  check(true, 'Production-image tour hydrates and optimized calendar image decodes');
  await page.goto('/#ai-detailed-panel');
  await page.waitForURL('**/ai-co-writer#sermon-notes');
  check(await page.getByRole('button', { name: 'With sermon notes', exact: true }).getAttribute('aria-pressed') === 'true', 'Production legacy link preserves the requested example');
  await page.goto('/');
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  check(await page.evaluate(() => visualViewport.scale === 2), 'Browser magnification is permitted');
  await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await page.setViewportSize({ width: 720, height: 450 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Two-times reduced viewport reflows without clipping');
  check(errors.length === 0, 'No browser runtime errors on the production marketing pages');
  await writeFile(path.join(evidence, 'production-discovery.txt'), `ROBOTS\n${robots}\nSITEMAP\n${sitemap}`);
} finally {
  await browser.close();
  await writeFile(path.join(evidence, 'production-candidate-validation.json'), JSON.stringify({ checkedAt: new Date().toISOString(), candidate: base.origin, configuredPublicOrigin: publicOrigin, passed: results.length > 0 && results.every(r => r.passed), results, errors, limitations: ['Candidate API target is Azure-internal and is not exercised locally.', 'Page-scale magnification and reduced-viewport reflow do not replace manual assistive-technology testing.'] }, null, 2));
}
console.log(JSON.stringify({ checks: results.length, passed: results.every(r => r.passed), errors }, null, 2));
