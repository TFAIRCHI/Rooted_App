import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const phase = process.argv[process.argv.indexOf('--phase') + 1];
const phases = ['0', '1A', '1B', '1C', '2', '3', '4'];
if (!process.argv.includes('--phase') || !phases.includes(phase)) {
  console.error('Usage: npm run test:gate -- --phase 0|1A|1B|1C|2|3|4');
  process.exit(1);
}
const evidenceRoot = path.join(root, 'BuildPrompts/1.1.1/evidence/automated');
await mkdir(evidenceRoot, { recursive: true });
const sanitize = value => value.replace(/(https?:\/\/|postgres(?:ql)?:\/\/)([^\s/@:]+):([^\s/@]+)@/g, '$1$2:[REDACTED]@').replace(/(Bearer\s+)[\w.-]+/gi, '$1[REDACTED]');
const checks = [];
const requiredReviews = [];

async function fingerprint() {
  const digest = createHash('sha256');
  const excluded = new Set(['node_modules', '.next', '.next-e2e', 'dist', 'coverage', 'test-results', 'playwright-report', 'results']);
  async function collect(directory) {
    let entries;
    try { entries = await readdir(path.join(root, directory), { withFileTypes: true }); } catch { return; }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (excluded.has(entry.name) || entry.name === 'next-env.d.ts' || entry.name.endsWith('.tsbuildinfo') || entry.name.startsWith('.env') && !entry.name.endsWith('.example')) continue;
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(relative);
      else if (entry.isFile()) digest.update(relative.replaceAll('\\', '/')).update(await readFile(path.join(root, relative)));
    }
  }
  if (phase !== '0') {
    await collect('frontend');
    await collect('backend');
  } else {
    for (const filename of ['docs/decisions.md', 'docs/development.md', 'docs/acceptance-matrix.md', 'BuildPrompts/1.1.1/MASTER_BUILD_PROMPT.md', 'BuildPrompts/1.1.1/TESTING_GATES.md']) {
      try { digest.update(filename).update(await readFile(path.join(root, filename))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  for (const name of ['package.json', 'package-lock.json', 'eslint.config.mjs', 'playwright.config.ts']) {
    try { digest.update(name).update(await readFile(path.join(root, name))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return digest.digest('hex');
}

async function run(label, args) {
  const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  const startedAt = new Date().toISOString();
  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, [npmCli, ...args], { cwd: root, env: { ...process.env, EXTERNAL_SERVICES_ENABLED: 'false' }, windowsHide: true });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { output += chunk; process.stderr.write(chunk); });
    child.once('error', error => resolve({ exitCode: 1, output: `${output}\n${error.message}` }));
    child.once('close', code => resolve({ exitCode: code ?? 1, output }));
  });
  const logPath = path.join(evidenceRoot, `phase-${phase}-${label}.log`);
  await writeFile(logPath, sanitize(result.output));
  const skipped = /# skipped\s+[1-9]|\b[1-9]\d* skipped\b|\b[1-9]\d* todo\b/i.test(result.output);
  checks.push({ label, command: `npm ${args.join(' ')}`, startedAt, finishedAt: new Date().toISOString(), exitCode: result.exitCode, requiredSkipped: skipped, passed: result.exitCode === 0 && !skipped, log: path.relative(root, logPath).replaceAll('\\', '/') });
}

async function documents() {
  const failures = [];
  let links = 0;
  const filenames = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== 'evidence') await walk(path.join(directory, entry.name));
      else if (entry.isFile() && entry.name.endsWith('.md')) filenames.push(path.join(directory, entry.name));
    }
  }
  await walk(path.join(root, 'BuildPrompts'));
  for (const filename of filenames) {
    const source = await readFile(filename, 'utf8');
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(?:https?:|mailto:)/.test(target)) continue;
      try { await access(path.resolve(path.dirname(filename), target.split('#')[0] || path.basename(filename))); links += 1; }
      catch { failures.push(`${path.relative(root, filename)}: ${target}`); }
    }
  }
  const mapping = await readFile(path.join(root, 'docs/acceptance-matrix.md'), 'utf8').catch(() => '');
  for (let index = 1; index <= 29; index += 1) {
    const identifier = `AC${String(index).padStart(2, '0')}`;
    if (!mapping.includes(identifier)) failures.push(`Missing ${identifier} in acceptance matrix`);
  }
  for (const filename of ['docs/decisions.md', 'docs/development.md', 'BuildPrompts/1.1.1/PHASE_TRACKER.md']) {
    try { await access(path.join(root, filename)); } catch { failures.push(`Missing ${filename}`); }
  }
  checks.push({ label: 'prompt-and-readiness-artifacts', passed: failures.length === 0, files: filenames.length, links, failures });
}

const reviewDefinitions = {
  '1B': ['authoring-accessibility'],
  '1C': ['member-accessibility', 'editorial-workflow'],
  '2': ['ai-provider-proof', 'source-rights', 'church-ai-evaluation'],
  '3': ['sms-provider-proof', 'consent-country-policy', 'discussion-accessibility'],
  '4': ['planning-center-provider-proof', 'pilot-recovery', 'security-privacy-review', 'pilot-acceptance']
};

const startedAt = new Date().toISOString();
const initialFingerprint = await fingerprint();
await documents();
await run('research', ['run', 'test:research']);
if (phase !== '0') {
  for (const [label, args] of [
    ['lint', ['run', 'lint']], ['types', ['run', 'typecheck']],
    ['unit', ['run', 'test:unit']], ['integration', ['run', 'test:integration']],
    ['build', ['run', 'build']]
  ]) await run(label, args);
  if (phases.indexOf(phase) >= phases.indexOf('1B')) await run('browser', ['run', 'test:e2e']);
  if (phase === '4') await run('capacity-and-local-recovery', ['run', 'test:capacity']);
}
for (const identifier of phases.slice(0, phases.indexOf(phase) + 1)) {
  for (const review of reviewDefinitions[identifier] ?? []) {
    const filename = path.join(root, 'BuildPrompts/1.1.1/evidence/reviews', `${review}.json`);
    let record;
    try { record = JSON.parse(await readFile(filename, 'utf8')); } catch { record = undefined; }
    let artifactExists = false;
    if (typeof record?.artifact === 'string') {
      const artifactPath = path.resolve(root, record.artifact);
      const relativePath = path.relative(root, artifactPath);
      if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
        try { await access(artifactPath); artifactExists = true; } catch { artifactExists = false; }
      }
    }
    const passed = Boolean(record?.status === 'passed' && typeof record?.reviewer === 'string' && record.reviewer.trim() && Number.isFinite(Date.parse(record?.reviewedAt)) && record?.testedFingerprint === initialFingerprint && artifactExists && record?.scope);
    requiredReviews.push({ review, phase: identifier, passed, reason: passed ? 'Recorded review references the current source fingerprint and an existing artifact' : 'Required authorized human/provider evidence is absent, incomplete or stale', evidence: passed ? path.relative(root, filename).replaceAll('\\', '/') : null });
  }
}
const finalFingerprint = await fingerprint();
checks.push({ label: 'stable-tested-source-state', passed: initialFingerprint === finalFingerprint, initialFingerprint, finalFingerprint });
const automatedPassed = checks.every(check => check.passed);
const complete = automatedPassed && requiredReviews.every(review => review.passed);
const report = { version: '1.1.1', phase, startedAt, completedAt: new Date().toISOString(), node: process.version, testedFingerprint: finalFingerprint, automatedPassed, complete, status: complete ? 'gate_passed' : automatedPassed ? 'blocked_required_review' : 'failed_automated_checks', checks, requiredReviews, deploymentAuthorized: false, liveMessagingAuthorized: false };
const reportPath = path.join(evidenceRoot, `phase-${phase}.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ phase, automatedPassed, complete, status: report.status, report: path.relative(root, reportPath) }, null, 2));
process.exitCode = complete ? 0 : automatedPassed ? 2 : 1;
