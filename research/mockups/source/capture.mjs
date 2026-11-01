import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, rm, stat, readdir, rmdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '..');
const output = root;
const profile = join(root, '.capture-browser');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const screens = JSON.parse(await readFile(join(source, 'screens.json'), 'utf8'));
await mkdir(output, { recursive: true });
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
let browserError;
browser.on('error', error => { browserError = error; });
const pause = duration => new Promise(done => setTimeout(done, duration));
let socket;
let nextId = 0;
const pending = new Map();
const checks = [];
const errors = [];
let currentScreen = '';
function command(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolveCommand, rejectCommand) => {
    const timer = setTimeout(() => { pending.delete(id); rejectCommand(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function visit(id, width = 1440, height = 1050) {
  currentScreen = id;
  await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
  const url = new URL(pathToFileURL(join(source, 'index.html')));
  url.searchParams.set('screen', id);
  await command('Page.navigate', { url: url.href });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`document.readyState === 'complete' && !!document.querySelector('#app h1') && new URLSearchParams(location.search).get('screen') === ${JSON.stringify(id)}`)) break;
    if (attempt === 99) throw new Error(`Page did not load: ${id}`);
    await pause(50);
  }
  await evaluate('document.fonts.ready.then(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))');
}
async function click(selector) {
  await evaluate(`(() => {const target=document.querySelector(${JSON.stringify(selector)});if(!target)throw new Error('Missing control: '+${JSON.stringify(selector)});target.click();})()`);
}
async function check(name, expression) {
  assert.equal(await evaluate(expression), true, name);
  checks.push(name);
}
try {
  let port;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (browserError) throw browserError;
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await pause(100); }
  }
  if (!port) throw new Error('Chrome debugging port unavailable');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, reject) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push({ screen: currentScreen, details: message.params.exceptionDetails });
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    clearTimeout(task.timer);
    if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
  });
  await command('Page.enable');
  await command('Runtime.enable');
  await visit('overview');
  await evaluate('localStorage.clear()');
  for (const screen of screens) {
    await visit(screen.id, screen.width, screen.height);
    await check(`${screen.id}: no horizontal overflow`, 'document.documentElement.scrollWidth <= innerWidth');
    await check(`${screen.id}: one main landmark`, 'document.querySelectorAll("main").length === 1');
    await check(`${screen.id}: required screen content`, `${JSON.stringify(screen.contains)}.every(text=>document.querySelector('main').textContent.includes(text))`);
    if(screen.id === 'sms') await check('SMS blocked scheduling control is fully visible in screenshot', 'Array.from(document.querySelectorAll("button")).find(button=>button.textContent.includes("Schedule SMS")).getBoundingClientRect().bottom < innerHeight');
    if(screen.width === 390) await check(`${screen.id}: primary action visible above navigation`, `(() => {const action=document.querySelector('main .primary');const nav=document.querySelector('.mobile-nav');return !!action && action.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top;})()`);
    const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const data = Buffer.from(screenshot.data, 'base64');
    assert.equal(data.readUInt32BE(16), screen.width, 'PNG width');
    assert.equal(data.readUInt32BE(20), screen.height, 'PNG height');
    assert.ok(data.length > 10000, 'PNG contains rendered content');
    await writeFile(join(output, screen.file), data);
    console.log(`${screen.file} · ${screen.width}×${screen.height} · ${data.length} bytes`);
  }
  await visit('create');
  await visit('blank');
  await check('Scratch editor starts with every field blank', 'Array.from(document.querySelectorAll("[data-draft]")).every(field=>field.value === "")');
  await visit('review');
  await click('#approve-check');
  await click('[data-action="approve-plan"]');
  await check('Direct review fixture cannot approve an unadopted plan', '!state.approved');
  await visit('create');
  await check('Creation has exactly the two requested native options', `JSON.stringify(Array.from(document.querySelector('#creation').options, option=>option.text)) === JSON.stringify(['View proposed study plan','Create study plan from scratch'])`);
  await click('[data-action="create"]');
  await check('Proposed outline starts unadopted', '!state.adopted && Object.keys(state.drafts).length === 0');
  await click('[data-action="adopt-plan"]');
  await check('Explicit adoption creates three draft dates', 'state.adopted && Object.keys(state.drafts).length === 3 && !state.approved');
  await click('[data-day="1"]');
  await check('Day selector switches editor content', 'document.querySelector("#plan-title").value === "To whom shall we go?"');
  await evaluate(`(() => { const field = document.querySelector('#plan-title'); field.value='A personal confession'; field.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await visit('blank');
  await click('[data-day="1"]');
  await check('Draft survives reload', 'document.querySelector("#plan-title").value === "A personal confession"');
  await visit('suggestions');
  await check('Inspecting suggestions does not change drafts', 'state.drafts[1].title === "A personal confession"');
  await click('[data-day="1"]');
  await click('[data-action="adopt-question"]');
  await check('Adopting question preserves other fields', 'state.drafts[1].title === "A personal confession" && state.drafts[1].question === days[1].question');
  await visit('review');
  await click('[data-action="approve-plan"]');
  await check('Plan approval requires review confirmation', '!state.approved');
  await click('#approve-check');
  await click('[data-action="approve-plan"]');
  await check('Plan approval preserves a separate approved snapshot', 'state.approved && state.approvedPlan[1].title === "A personal confession" && !state.contentApproved');
  await visit('blocked');
  await check('Scheduling disabled while content awaits approval', 'document.querySelector("[data-action=schedule]").disabled');
  await click('[data-action="approve-content"]');
  await check('Content approval requires explicit confirmation', '!state.contentApproved');
  await click('#content-check');
  await click('[data-action="approve-content"]');
  await check('Scheduling enables only after both approvals', '!document.querySelector("[data-action=schedule]").disabled');
  await click('[data-action="schedule"]');
  await check('Schedule action records local demo state', 'state.scheduled && screen === "scheduled"');
  await visit('content');
  await evaluate(`(() => {const field=document.querySelector('#devotional');field.value='A revised reflection.';field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await check('Content edits revoke content approval and schedule, preserving approved plan', 'state.approved && !state.contentApproved && !state.scheduled && state.approvedPlan[1].title === "A personal confession"');
  await visit('recovery');
  await click('[data-action="restore"]');
  await check('Recovery restores a draft and retains prior draft backup', 'screen === "blank" && !!localStorage.getItem("gather-before-restore") && !!state.approvedPlan');
  await visit('reflection',390,844);
  await evaluate(`(() => {const field=document.querySelector('#journal');field.value='Help me remain with you.';field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await visit('reflection',390,844);
  await check('Private reflection survives reload', 'document.querySelector("#journal").value === "Help me remain with you."');
  await click('[data-action="finish"]');
  await check('Completing reading returns to member week', 'screen === "member" && state.complete.includes(0)');
  await visit('overview');
  await check('Initial weekly selector has no selected date or editor', 'document.querySelectorAll(".day[aria-pressed=true]").length === 0 && !document.querySelector("[data-draft]") && !!document.querySelector(".choose-date")');
  await click('[data-day="2"]');
  await check('Selecting a date opens its planning pane below date cards', 'document.querySelector("section.card").textContent.includes("Friday") && document.querySelector("section.card").getBoundingClientRect().top > document.querySelector(".daystrip").getBoundingClientRect().bottom');
  await visit('sermons');
  await click('[data-action="save-sermon"]');
  await check('Sermon save requires rights confirmation', '!localStorage.getItem("gather-sermon")');
  await click('#rights');
  await click('[data-action="save-sermon"]');
  await check('Sermon rights confirmation permits a local source save', '!!localStorage.getItem("gather-sermon")');
  await visit('suggestions');
  await evaluate('state.drafts[0]={...state.drafts[0],focus:"My original objective"};persist();render()');
  await click('[data-action="adopt-objective"]');
  await check('Nonempty objective adoption requires a comparison', '!!document.querySelector("#adoption-comparison") && state.drafts[0].focus === "My original objective"');
  await click('[data-action="confirm-objective"]');
  await check('Explicit comparison acceptance replaces only objective', 'state.drafts[0].focus === days[0].focus');
  await click('[data-action="undo-adoption"]');
  await check('Objective adoption can be undone', 'state.drafts[0].focus === "My original objective"');
  await visit('comments');
  await evaluate('document.querySelector("#team-comment").value="@David Chen please review this objective."');
  await click('[data-action="add-team-comment"]');
  await check('Anchored team comment persists locally', 'state.teamComments.length === 1 && document.querySelector("#team-replies").textContent.includes("@David Chen")');
  await visit('discussion',390,844);
  await click('[data-reaction="Encouraged"]');
  await check('Appreciation reaction exposes selected state and count', 'document.querySelector("[data-reaction=Encouraged]").getAttribute("aria-pressed") === "true" && document.querySelector("[data-reaction=Encouraged]").textContent.includes("9")');
  await click('[data-reaction="Encouraged"]');
  await check('Appreciation reaction toggles off', 'document.querySelector("[data-reaction=Encouraged]").getAttribute("aria-pressed") === "false"');
  await click('#signed-in');
  await evaluate('document.querySelector("#discussion-text").value="Thankful for this community."');
  await click('[data-action="post-discussion"]');
  await check('Discussion submission observes demo sign-in boundary', '!state.discussionDraft');
  await click('#signed-in');
  await click('[data-action="post-discussion"]');
  await check('Discussion submission remains pending moderation', 'state.discussionDraft === "Thankful for this community." && document.querySelector(".notice").textContent.includes("Pending review")');
  await click('[data-action="report"]');
  await check('Report action records local moderation state', 'state.reported === true');
  await visit('sms');
  await check('SMS explains distinct publication and quiet-hour deferral', 'document.querySelector("main").textContent.includes("9:00 AM EDT") && document.querySelector("main").textContent.includes("8:00 AM EDT") && document.querySelector("main").textContent.includes("preapproved") && document.querySelector("main").textContent.includes("expires")');
  await evaluate('document.querySelector("#sms-text").value="Demo message changed";document.querySelector("#sms-text").dispatchEvent(new Event("input",{bubbles:true}))');
  await check('SMS phone preview updates with rough provider-validation label', 'document.querySelector("#sms-bubble").textContent === "Demo message changed" && document.querySelector("#segments").textContent.includes("provider validation required")');
  await visit('settings');
  await evaluate('state.approved=true;state.contentApproved=true;state.scheduled=true;document.querySelector("#time-0").value="08:30"');
  await click('[data-action="save-settings"]');
  await check('Editorial time change creates a revision and invalidates both approvals and pending schedule', 'state.planRevision === 4 && !state.approved && !state.contentApproved && !state.scheduled && safeLoad("gather-settings").times[0] === "08:30"');
  assert.equal(errors.length, 0, 'No browser runtime exceptions');
  checks.push('No browser runtime exceptions');
  await evaluate('localStorage.clear()');
  const legacyDirectory=resolve(root,'screenshots');
  assert.equal(dirname(legacyDirectory),root);
  const legacyNames=['01-study-overview.png','02-create-study-plan.png','03-proposed-study-plan.png','04-blank-plan-editor.png','05-optional-ai-suggestions.png','06-review-plan-changes.png','07-approved-study-plan.png','08-daily-content-editor.png','09-schedule-pending-approval.png','10-approved-schedule.png','11-member-study-week.png','12-member-daily-reading.png','13-member-reflection.png','14-draft-recovery.png'];
  const legacyEntries=await readdir(legacyDirectory,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  if(legacyEntries.length){assert.ok(legacyEntries.every(entry=>entry.isFile()&&legacyNames.includes(entry.name)),'Only explicitly owned provisional screenshots may be removed');for(const entry of legacyEntries)await rm(join(legacyDirectory,entry.name));await rmdir(legacyDirectory);}
  await writeFile(join(root,'validation.json'), JSON.stringify({ generatedAt: new Date().toISOString(), method: 'Installed headless Chrome, DevTools protocol; Node built-ins only', screenshots: screens.map(screen=>({file:screen.file,width:screen.width,height:screen.height})), checks, errors },null,2)+'\n');
  console.log(`PASS: ${screens.length} screenshots and ${checks.length} checks.`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    try { await command('Browser.close'); } catch {}
    socket.close();
  }
  browser.kill();
  await pause(500);
  assert.equal(dirname(profile), root);
  assert.equal(await stat(root).then(info=>info.isDirectory()),true);
  for(let attempt=0;attempt<10;attempt++) {
    try {await rm(profile,{recursive:true,force:true});break;} catch(error){if(attempt===9)console.error(`Temporary Chrome profile cleanup: ${error.message}`);await pause(300);}
  }
}
