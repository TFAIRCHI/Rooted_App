import { readFile, writeFile, readdir, mkdir, stat, access } from 'node:fs/promises';
import { dirname, resolve, relative, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { marked } from 'marked';
import GithubSlugger from 'github-slugger';

const tools = dirname(fileURLToPath(import.meta.url));
const root = resolve(tools, '..');
const diagramsOnly = process.argv.includes('--diagrams-only');
const documentsOnly = process.argv.includes('--documents-only');
if (diagramsOnly && documentsOnly) throw new Error('Choose only one validation scope');
const report = { generatedAt: new Date().toISOString(), scope: diagramsOnly ? 'diagrams-only' : documentsOnly ? 'documents-only' : 'full-package', passed: false, markdown: [], sourceIds: { defined: [], references: 0 }, pngs: [], diagrams: [], ui: [], errors: [] };
if (!diagramsOnly && !documentsOnly) await writeFile(join(tools, 'validation-results.json'), JSON.stringify({ ...report, status: 'running' }, null, 2) + '\n');
const localPath = filename => relative(root, filename).split(sep).join('/');
const fail = (area, message) => report.errors.push({ area, message });
async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.filter(entry => !['node_modules', '.git', '.capture-browser'].includes(entry.name)).map(entry => {
    const filename = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(filename) : [filename];
  }));
  return groups.flat().sort();
}
const files = await filesUnder(root);
const documents = new Map();
if (!diagramsOnly) {
for (const filename of files.filter(filename => extname(filename) === '.md')) {
  const source = await readFile(filename, 'utf8');
  const tokens = marked.lexer(source);
  const slugger = new GithubSlugger();
  const anchors = new Set();
  const links = [];
  const citations = new Set();
  marked.walkTokens(tokens, token => {
    if (token.type === 'heading') {
      const plain = marked.parseInline(token.text).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      anchors.add(slugger.slug(plain));
    }
    if (token.type === 'link' || token.type === 'image') links.push(token.href);
    if (token.type === 'html') {
      for (const match of token.text.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)) anchors.add(match[1]);
      for (const match of token.text.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) links.push(match[1]);
    }
    if (token.type === 'text') {
      for (const match of token.text.matchAll(/\bS\d{2,3}\b/g)) citations.add(match[0]);
    }
  });
  documents.set(filename, { source, anchors, links, citations });
}
for (const [filename, document] of documents) {
  let checked = 0;
  for (const href of document.links) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    checked++;
    try {
      const [pathname, fragment] = href.split('#');
      const target = pathname.split('?')[0] ? resolve(dirname(filename), decodeURIComponent(pathname.split('?')[0])) : filename;
      await access(target);
      if (fragment && documents.has(target) && !documents.get(target).anchors.has(decodeURIComponent(fragment))) throw new Error(`Missing anchor #${fragment}`);
      if (fragment && ['.html', '.htm', '.svg'].includes(extname(target))) {
        const html = await readFile(target, 'utf8');
        const ids = [...html.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
        if (!ids.includes(decodeURIComponent(fragment))) throw new Error(`Missing anchor #${fragment}`);
      }
    } catch (error) { fail('markdown', `${localPath(filename)} → ${href}: ${error.message}`); }
  }
  report.markdown.push({ file: localPath(filename), relativeLinks: checked });
}
const registry = documents.get(join(root, 'sources.md'));
const defined = new Set(registry ? [...registry.source.matchAll(/(?:^#{1,6}\s+(?:\[)?|^\|\s*(?:\*\*|\[)?|<a\s+id=["'])(S\d{2,3})\b/gim)].map(match => match[1].toUpperCase()) : []);
if (!registry || !defined.size) fail('sourceIds', 'sources.md is missing or has no S01-style source definitions');
let references = 0;
for (const [filename, document] of documents) {
  if (filename === join(root, 'sources.md')) continue;
  for (const citation of document.citations) {
    references++;
    if (!defined.has(citation)) fail('sourceIds', `${localPath(filename)} references undefined ${citation}`);
  }
}
report.sourceIds = { defined: [...defined].sort(), references };
if (!documentsOnly) try {
  const screens = JSON.parse(await readFile(join(root, 'mockups/source/screens.json'), 'utf8'));
  if (screens.length !== 14 || new Set(screens.map(screen => screen.file)).size !== 14) fail('png', 'Expected exactly 14 unique screenshot manifest entries');
  const expected = [
    '01-church-admin-dashboard.png', '02-sermon-library-and-ingestion.png',
    '03-weekly-series-date-selector.png', '04-selected-date-creation-dropdown.png',
    '05-ai-proposed-plan.png', '06-manual-plan-editor.png',
    '07-manual-editor-ai-assist-open.png', '08-team-comments-and-revisions.png',
    '09-pastoral-review-and-approval.png', '10-weekly-calendar-and-status-board.png',
    '11-member-mobile-study.png', '12-member-discussion-and-reactions.png',
    '13-sms-preview-and-scheduling.png', '14-church-settings-and-integrations.png'
  ];
  for (const filename of expected) {
    if (!screens.some(screen => screen.file === filename)) fail('png', `Required root mockup missing from manifest: ${filename}`);
  }
  for (const screen of screens) {
    const filename = join(root, 'mockups', screen.file);
    try {
      const bytes = await readFile(filename);
      if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(8) !== 13) throw new Error('Invalid PNG signature or IHDR');
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      if (width !== screen.width || height !== screen.height) throw new Error(`Expected ${screen.width}×${screen.height}, received ${width}×${height}`);
      report.pngs.push({ file: localPath(filename), width, height, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    } catch (error) { fail('png', `${localPath(filename)}: ${error.message}`); }
  }
} catch (error) { fail('png', error.message); }
}

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = resolve(root, `.${pathname}`);
    if (relative(root, filename).startsWith('..') || !(await stat(filename)).isFile()) {
      response.writeHead(404).end();
      return;
    }
    const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
    response.setHeader('Content-Type', types[extname(filename)] || 'application/octet-stream');
    response.end(await readFile(filename));
  } catch { response.writeHead(404).end(); }
});
let browser;
if (!documentsOnly) {
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
  browser = await chromium.launch({ executablePath, channel: executablePath ? undefined : 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(`${origin}/tools/renderer.html`);
  report.browser = await browser.version();
  const diagramFiles = files.filter(filename => filename.startsWith(join(root, 'diagrams') + sep) && extname(filename) === '.mmd');
  if (diagramFiles.length !== 8) fail('mermaid', `Expected 8 .mmd sources, received ${diagramFiles.length}`);
  const expectedDiagrams = ['container-architecture.mmd', 'content-approval-state-machine.mmd', 'data-flow-and-trust-boundaries.mmd', 'ingestion-sequence.mmd', 'plan-approval-state-machine.mmd', 'publishing-sequence.mmd', 'study-lifecycle.mmd', 'system-context.mmd'];
  for (const filename of expectedDiagrams) {
    if (!diagramFiles.includes(join(root, 'diagrams', filename))) fail('mermaid', `Missing required diagram: ${filename}`);
  }
  await page.evaluate(async () => {
    const { default: mermaid } = await import('/tools/node_modules/mermaid/dist/mermaid.esm.min.mjs');
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });
    window.packageMermaid = mermaid;
  });
  await mkdir(join(root, 'diagrams/rendered'), { recursive: true });
  for (const [index, filename] of diagramFiles.entries()) {
    try {
      const source = await readFile(filename, 'utf8');
      const rendered = await page.evaluate(async ({ source, index }) => {
        const parsed = await window.packageMermaid.parse(source);
        const { svg } = await window.packageMermaid.render(`diagram${index}`, source);
        const parsedSvg = new DOMParser().parseFromString(svg, 'image/svg+xml');
        if (parsedSvg.querySelector('parsererror') || parsedSvg.documentElement.nodeName !== 'svg') throw new Error('Renderer did not return valid SVG');
        return { svg, diagramType: parsed.diagramType };
      }, { source, index });
      const output = join(root, 'diagrams/rendered', `${relative(join(root, 'diagrams'), filename).replace(/\.mmd$/, '')}.svg`);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, rendered.svg);
      report.diagrams.push({ source: localPath(filename), sourceSha256: createHash('sha256').update(source).digest('hex'), output: localPath(output), diagramType: rendered.diagramType, bytes: Buffer.byteLength(rendered.svg) });
    } catch (error) { fail('mermaid', `${localPath(filename)}: ${error.message}`); }
  }
  if (!diagramsOnly) {
  const uiErrors = [];
  page.on('pageerror', error => uiErrors.push(error.message));
  async function check(name, operation) {
    try { await operation(); report.ui.push({ name, passed: true }); }
    catch (error) { report.ui.push({ name, passed: false }); fail('ui', `${name}: ${error.message}`); }
  }
  await check('Initial date selector has no editor; selecting date expands the pane below dates', async () => {
    await page.goto(`${origin}/mockups/source/index.html?screen=overview`);
    if (await page.locator('[data-day]').count() !== 3 || await page.locator('[data-day][aria-pressed="true"]').count() !== 0) throw new Error('Initial dates should be unselected');
    if (await page.locator('#creation, [data-draft]').count()) throw new Error('Initial view exposes an editor');
    await page.locator('[data-day="1"]').click();
    const pane = page.locator('section[aria-label="Selected date"]');
    await pane.waitFor({ state: 'visible' });
    const dates = await page.locator('.daystrip').boundingBox();
    const panel = await pane.boundingBox();
    if (!dates || !panel || panel.y < dates.y + dates.height) throw new Error('Expanded pane should follow date cards');
  });
  await check('Exactly two requested creation choices', async () => {
    await page.goto(`${origin}/mockups/source/index.html?screen=create`);
    const choices = await page.locator('#creation option').allTextContents();
    if (JSON.stringify(choices) !== JSON.stringify(['View proposed study plan', 'Create study plan from scratch'])) throw new Error(JSON.stringify(choices));
  });
  await check('Dates precede creation choices and switch selected day', async () => {
    const dates = page.locator('[data-day]');
    if (await dates.count() !== 3) throw new Error('Expected three example study dates');
    const first = await dates.first().boundingBox();
    const choice = await page.locator('#creation').boundingBox();
    if (!first || !choice || first.y >= choice.y) throw new Error('Date selector must appear above creation choices');
    await page.locator('[data-day="1"]').click();
    if (await page.locator('[data-day="1"]').getAttribute('aria-pressed') !== 'true') throw new Error('Date selection did not update');
  });
  await check('Manual creation opens blank editable plan', async () => {
    await page.locator('#creation').selectOption('blank');
    await page.locator('[data-action="create"]').click();
    const fields = page.locator('[data-draft]');
    if (await fields.count() !== 6) throw new Error('Expected six labeled manual plan fields');
    for (const field of await fields.all()) {
      if (await field.inputValue() !== '') throw new Error('Manual field is prefilled');
    }
    await page.locator('#plan-title').fill('Validation draft');
    await page.reload();
    if (await page.locator('#plan-title').inputValue() !== 'Validation draft') throw new Error('Draft did not persist');
  });
  for (const screen of JSON.parse(await readFile(join(root, 'mockups/source/screens.json'), 'utf8'))) {
    await check(`${screen.id}: viewport, main landmark, named controls`, async () => {
      await page.setViewportSize({ width: screen.width, height: screen.height });
      await page.goto(`${origin}/mockups/source/index.html?screen=${screen.id}`);
      const issues = await page.evaluate(() => {
        const failures = [];
        if (document.documentElement.scrollWidth > innerWidth) failures.push('horizontal overflow');
        if (document.querySelectorAll('main').length !== 1) failures.push('expected one main');
        for (const control of document.querySelectorAll('button, input:not([type=hidden]), textarea, select')) {
          if (!control.getBoundingClientRect().width) continue;
          const labels = [...(control.labels || [])].map(label => label.textContent).join('');
          if (!(control.getAttribute('aria-label') || control.getAttribute('aria-labelledby') || labels || control.textContent.trim() || control.getAttribute('title'))) failures.push(`unnamed ${control.tagName}#${control.id}`);
        }
        return failures;
      });
      if (issues.length) throw new Error(issues.join('; '));
    });
  }
  if (uiErrors.length) fail('ui', uiErrors.join('; '));
  report.uiLimitations = 'Basic DOM and interaction checks only; no full accessibility, usability, device, or contrast acceptance claim. Canonical screenshots and extended workflow checks belong to mockups/source/capture.mjs.';
  }
} catch (error) { fail('browser', error.stack || error.message); }
finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
}
report.passed = report.errors.length === 0;
report.status = 'complete';
report.completedAt = new Date().toISOString();
const reportFilename = diagramsOnly ? 'diagram-results.json' : documentsOnly ? 'document-results.json' : 'validation-results.json';
const reportPath = `research/tools/${reportFilename}`;
await writeFile(join(tools, reportFilename), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, scope: report.scope, markdownFiles: report.markdown.length, sourceDefinitions: report.sourceIds.defined.length, sourceReferences: report.sourceIds.references, pngs: report.pngs.length, diagrams: report.diagrams.length, uiChecks: report.ui.length, errors: report.errors, report: reportPath }, null, 2));
process.exitCode = report.passed ? 0 : 1;
