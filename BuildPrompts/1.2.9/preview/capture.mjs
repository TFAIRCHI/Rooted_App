import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const destination = join(directory, 'screenshots');
await mkdir(destination, { recursive: true });
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
const checks = [];
const errors = [];
try {
  for (const screen of [
    { view: 'dashboard', width: 1440, height: 1080, filename: 'dashboard-desktop.png' },
    { view: 'workflow', width: 1440, height: 1080, filename: 'study-workflow-desktop.png' },
    { view: 'member', width: 390, height: 844, filename: 'member-conversation-mobile.png' }
  ]) {
    const page = await browser.newPage({ viewport: { width: screen.width, height: screen.height } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(join(directory, 'index.html')).href + '#' + screen.view);
    await page.locator('#' + screen.view).waitFor({ state: 'visible' });
    if (screen.view === 'workflow') {
      await page.locator('#study-title').fill('A living hope');
      if (await page.locator('#phone-title').textContent() !== 'A living hope') throw new Error('Phone preview did not update');
      await page.locator('#study-title').fill('To whom shall we go?');
      await page.getByRole('button', { name: '2 · Gain Approval', exact: true }).click();
      await page.locator('#approval-panel').waitFor({ state: 'visible' });
      await page.getByRole('button', { name: '1 · Create Study', exact: true }).click();
    }
    if (screen.view === 'dashboard') {
      await page.getByRole('button', { name: 'Delete Words of eternal life', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflows) throw new Error('Horizontal overflow in ' + screen.view);
    await page.screenshot({ path: join(destination, screen.filename), fullPage: true });
    checks.push({ view: screen.view, width: screen.width, screenshot: 'screenshots/' + screen.filename, overflow: overflows });
    await page.close();
  }
  for (const width of [320, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 1024 } });
    for (const view of ['dashboard', 'workflow', 'member']) {
      await page.goto(pathToFileURL(join(directory, 'index.html')).href + '#' + view);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Horizontal overflow at ' + width + ' in ' + view);
      checks.push({ view, width, overflow: false });
    }
    await page.close();
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const result = { generatedAt: new Date().toISOString(), passed: true, scope: 'illustrative-prototype-only', checks, errors };
  await writeFile(join(directory, 'validation.json'), JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} finally {
  await browser.close();
}
