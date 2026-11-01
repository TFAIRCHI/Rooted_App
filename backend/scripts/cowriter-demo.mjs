// Explicitly invoked live browser verification; never included in automated test scripts.
import { chromium, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

if (!process.argv.includes('--run-live')) {
  console.log('Live Azure verification is opt-in: node backend/scripts/cowriter-demo.mjs --run-live');
  process.exit(0);
}
const origin = 'http://127.0.0.1:3000';
const evidence = 'BuildPrompts/1.2.11/evidence';
await mkdir(evidence, { recursive: true });
const reportPath = `${evidence}/live-demo.json`;
const report = existsSync(reportPath) ? JSON.parse(await readFile(reportPath, 'utf8')) : { deployment: 'gpt-5.6-luna', endpointPath: '/openai/v1/responses', requests: [], passed: false };
// The repair flag is only for an explicitly user-authorized one-request extension.
const repair = process.argv.includes('--repair-draft-once');
const requestLimit = repair ? 4 : 3;
if (report.requests.length >= requestLimit) throw new Error('This verification used its live-request allowance. Inspect saved evidence instead of rerunning calls.');
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const context = await browser.newContext({ baseURL: origin, viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
const churchId = '10000000-0000-4000-8000-000000000001';
const prefix = `/api/v1/churches/${churchId}`;
let csrf = '';
async function command(path, body, etag) {
  const response = await context.request.post(prefix + path, { headers: { 'X-CSRF-Token': csrf, 'Idempotency-Key': randomUUID(), ...(etag ? { 'If-Match': etag } : {}) }, data: body });
  if (!response.ok()) throw new Error(`Demo setup failed HTTP ${response.status()}: ${(await response.json()).message}`);
  return response.json();
}
async function saveReport() { await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); }
try {
  // Public fictional local demo credentials, not Azure credentials.
  const login = await context.request.post('/api/v1/auth/demo-login', { data: { username: 'anna.contributor', password: 'RootedDemo!2026A' } });
  if (!login.ok()) throw new Error('Local demo login unavailable. Start npm run dev with demo logins enabled.');
  const session = await (await context.request.get('/api/v1/auth/session')).json(); csrf = session.csrfToken;
  const workspace = await (await context.request.get(prefix + '/workspace')).json();
  if (!report.studyId) {
    let date = '2026-11-02';
    while (workspace.slots.some(slot => slot.localDate === date)) { const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); date = next.toISOString().slice(0, 10); }
    const slot = await command(`/series/${workspace.series[0].id}/slots`, { localDate: date, localTime: '08:00', timeZone: 'America/New_York', assigneeIds: [session.user.id] });
    const plan = await (await context.request.get(prefix + '/plans/' + slot.planId)).json();
    const study = await command(`/plans/${plan.id}/content`, { mode: 'manual' }, plan.etag);
    Object.assign(report, { studyId: study.id, slotId: slot.id, date, originalRevisionId: study.headRevisionId, startedAt: new Date().toISOString() }); await saveReport();
  }
  await page.goto(`/studies?church=${churchId}&month=${report.date.slice(0, 7)}&slot=${report.slotId}`);
  const launcher = page.getByRole('button', { name: 'Open study co-writer' }); await expect(launcher).toBeVisible({ timeout: 30000 }); await launcher.click();
  await expect(page.getByText('Configured · Ready to try', { exact: true })).toBeVisible();
  const transcript = 'Synthetic demo sermon notes: John 6:68. Peter brings uncertainty to Jesus rather than pretending to understand everything. Central theme: trust can coexist with honest questions. Encourage members to name one question and take one small faithful action this week. This is fictional teaching material, not a quotation of Scripture.';
  await page.locator('.cowriter-source summary').click();
  await page.getByLabel('Sermon transcript text').fill(transcript);
  await page.getByRole('checkbox', { name: /I reviewed this text/ }).check();
  await page.getByRole('button', { name: 'Confirm transcript', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Transcript confirmed', exact: true })).toBeVisible();
  await page.locator('.cowriter-source summary').click();
  async function send(kind, task) {
    if (report.requests.length >= requestLimit) throw new Error('Live verification request limit reached');
    const entry = { kind, attemptedAt: new Date().toISOString() }; report.requests.push(entry); await saveReport();
    await page.getByLabel('Co-writer action').selectOption(kind);
    await page.getByRole('textbox', { name: 'Message the study co-writer' }).fill(task);
    const received = page.waitForResponse(response => response.url().endsWith('/cowriter/messages') && response.request().method() === 'POST', { timeout: 60000 });
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    const response = await received, data = await response.json();
    Object.assign(entry, { httpStatus: response.status(), requestId: data.id, status: data.status, usage: data.result?.usage ?? null, model: data.result?.model ?? data.result?.proposal?.provenance?.model ?? null, providerResponseId: data.result?.responseId ?? data.result?.proposal?.provenance?.responseId ?? null });
    await saveReport();
    if (!response.ok() || data.status !== 'completed') throw new Error(data.error ?? data.message ?? 'Azure did not complete this request');
    await expect(page.getByText('Connected · Azure', { exact: true })).toBeVisible();
    return data;
  }
  if (report.requests.length === 0) await send('chat', 'Explain the sermon theme in three simple sentences and ask one focused follow-up question.');
  if (report.requests.length === 1) await send('chat', 'Make your previous explanation even simpler, preserving the distinction between trust and certainty.');
  if (report.requests.length === 2) await send('draft', 'Write a concise selected-day devotional grounded in the reviewed synthetic sermon. Keep the title short and provide all requested fields.');
  else if (repair && report.requests.length === 3) await send('draft', 'Write a concise selected-day devotional grounded in the reviewed synthetic sermon. Return every field with its required source evidence.');
  const before = await (await context.request.get(prefix + '/content/' + report.studyId)).json();
  report.noEditBeforeAdoption = before.headRevisionId === report.originalRevisionId; if (!report.noEditBeforeAdoption) throw new Error('Study changed before explicit adoption');
  const adopt = page.getByRole('button', { name: 'Adopt proposal into saved draft' }); await expect(adopt).toBeVisible();
  await page.screenshot({ path: `${evidence}/live-proposal-desktop.png`, fullPage: true });
  const adoptedResponse = page.waitForResponse(response => /\/cowriter\/requests\/[^/]+\/adopt$/.test(response.url()) && response.request().method() === 'POST');
  await adopt.click(); const adopted = await adoptedResponse; const final = await adopted.json();
  if (!adopted.ok()) throw new Error(final.message ?? 'Adoption failed');
  report.adoptedRevisionId = final.headRevisionId; report.explicitAdoption = final.headRevisionId !== report.originalRevisionId;
  await expect(page.getByText(/Proposal adopted as a new saved draft revision/)).toBeVisible();
  await page.screenshot({ path: `${evidence}/live-adopted-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await page.getByRole('dialog', { name: 'Study co-writer' }).boundingBox(); report.mobilePanelWithinViewport = !!box && box.x >= 0 && box.x + box.width <= 390;
  await page.screenshot({ path: `${evidence}/live-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Close study co-writer' }).click(); await expect(launcher).toBeVisible();
  const foreign = await context.request.get(`/api/v1/churches/10000000-0000-4000-8000-000000000002/content/${report.studyId}/cowriter/requests/${report.requests[0].requestId}`); report.foreignChurchDenied = foreign.status() === 404;
  report.passed = report.explicitAdoption && report.noEditBeforeAdoption && report.mobilePanelWithinViewport && report.foreignChurchDenied;
  if (report.passed) { report.initialBlocker = report.blocker; delete report.blocker; }
  report.finishedAt = new Date().toISOString(); await saveReport(); console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.passed = false; report.blocker = error instanceof Error ? error.message : 'Live verification failed'; await saveReport(); console.error(report.blocker); process.exitCode = 1;
} finally { await context.close(); await browser.close(); }
