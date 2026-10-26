import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { validateSnapshot, parseSnapshot, safeSourceUrl } from '../app/snapshot.mjs';
import { OneDriveFileStore } from '../app/store.mjs';
import { renderReport } from '../app/report.mjs';
import { createDashboardServer, assertLocalHost } from '../app/server.mjs';

const fixture = JSON.parse(await readFile(new URL('../examples/cpsync.snapshot.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(fixture);
async function cleanup(directory) {
  assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('cpsync-'));
  await rm(directory, { recursive: true, force: true });
}

test('collector snapshots must match CPSync, the work account, and known evidence', () => {
  assert.equal(validateSnapshot(clone()).project.id, 'cpsync');
  const wrongProject = clone(); wrongProject.project.id = 'another-project';
  assert.throws(() => validateSnapshot(wrongProject), /CPSync/);
  assert.throws(() => validateSnapshot(clone(), { expectedAccount: 'someone.else@contoso.com' }), /work account/);
  const missingSource = clone(); missingSource.actions[0].sourceIds = ['missing'];
  assert.throws(() => validateSnapshot(missingSource), /unknown source/);
  const noCitation = clone(); noCitation.summary.sourceIds = [];
  assert.throws(() => validateSnapshot(noCitation), /source citation/);
  const duplicate = clone(); duplicate.sources.push(duplicate.sources[0]);
  assert.throws(() => validateSnapshot(duplicate), /Duplicate source/);
});

test('unsupported URLs, invalid dates, oversized and half-synced files are rejected', () => {
  for (const url of ['javascript:alert(1)', 'https://teams.microsoft.com.evil.test/a', 'http://teams.microsoft.com/a', 'https://user:password@teams.microsoft.com/a', 'file:///C:/secrets', 'https://teams.microsoft.com:9999/a']) assert.equal(safeSourceUrl(url), false);
  assert.equal(safeSourceUrl('https://contoso-my.sharepoint.com/personal/user/Documents/plan.docx'), true);
  const invalidDate = clone(); invalidDate.actions[0].dueDate = '2026-02-30';
  assert.throws(() => validateSnapshot(invalidDate), /invalid/);
  assert.throws(() => parseSnapshot('{"schemaVersion":'), /still be syncing/);
  assert.throws(() => parseSnapshot(' '.repeat(2 * 1024 * 1024 + 1)), /2 MB/);
});

test('generated HTML escapes source content and keeps valid source links', () => {
  const input = clone(); input.summary.headline = '<script>alert("not executable")</script>';
  input.actions[0].title = '<img src=x onerror=alert(1)>';
  const output = renderReport(validateSnapshot(input));
  assert.ok(output.includes('&lt;script&gt;'));
  assert.ok(!output.includes('<script>'));
  assert.ok(!output.includes('<img src=x'));
  assert.ok(output.includes('https://teams.microsoft.com/l/meeting/details'));
});

test('file adapter prevents traversal and excludes executable supporting files', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cpsync-files-'));
  t.after(() => cleanup(directory));
  await mkdir(path.join(directory, 'supporting'));
  await writeFile(path.join(directory, 'supporting', 'brief.md'), 'Brief');
  await writeFile(path.join(directory, 'supporting', 'run.html'), '<script>test</script>');
  const store = new OneDriveFileStore(directory);
  await assert.rejects(store.resolveFile('../outside'), /not allowed/);
  assert.deepEqual((await store.supportingFiles()).map(file => file.name), ['brief.md']);
});

test('server ingests a valid collection, exports it, and retains it through sync errors', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cpsync-integration-'));
  const folder = path.join(directory, 'OneDrive', 'ProjectDashboard', 'CPSync');
  await mkdir(path.join(folder, 'supporting'), { recursive: true });
  await writeFile(path.join(folder, 'snapshot.json'), JSON.stringify(fixture));
  await writeFile(path.join(folder, 'supporting', 'notes.md'), '# Evidence');
  const { server } = await createDashboardServer({ folder, expectedAccount: 'sample.user@contoso.com', settingsPath: path.join(directory, 'settings.json') });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await cleanup(directory); });
  const base = `http://127.0.0.1:${server.address().port}`;
  let state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.snapshot.project.name, 'CPSync');
  assert.equal(state.files[0].name, 'notes.md');
  assert.equal(state.capabilities.applicationApiTokens, false);
  assert.match(await readFile(path.join(folder, 'dashboard.html'), 'utf8'), /CPSync/);
  assert.match(await readFile(path.join(folder, 'presentation-brief.md'), 'utf8'), /Talking points/);
  assert.equal((await fetch(`${base}/report`)).status, 200);
  assert.equal((await fetch(`${base}/supporting/notes.md`)).status, 200);
  assert.equal((await fetch(`${base}/api/state`, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  const invalidHostStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(new URL('/api/state', base), { headers: { Host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject); request.end();
  });
  assert.equal(invalidHostStatus, 403);
  await writeFile(path.join(folder, 'snapshot.json'), '{"partial":');
  state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.snapshot.actions.length, fixture.actions.length);
  assert.match(state.collection.error, /syncing/);
  const wrongIdentity = clone(); wrongIdentity.collector.userPrincipalName = 'different@contoso.com';
  await writeFile(path.join(folder, 'snapshot.json'), JSON.stringify(wrongIdentity));
  state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.snapshot.collector.userPrincipalName, fixture.collector.userPrincipalName);
  assert.match(state.collection.error, /work account/);
  const older = clone(); older.collectedAt = '2026-09-01T12:00:00Z';
  await writeFile(path.join(folder, 'snapshot.json'), JSON.stringify(older));
  state = await (await fetch(`${base}/api/state`)).json();
  assert.match(state.collection.error, /older snapshot/);
  assert.equal(state.snapshot.collectedAt, fixture.collectedAt);
});

test('empty startup is honest and prevents export or unprotected remote hosting', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cpsync-empty-'));
  const { server } = await createDashboardServer({ folder: '', settingsPath: path.join(directory, 'settings.json') });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await cleanup(directory); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const state = await (await fetch(`${base}/api/state`)).json();
  assert.equal(state.snapshot, null);
  assert.equal(state.storage.configured, false);
  assert.equal((await fetch(`${base}/report`)).status, 409);
  assert.throws(() => assertLocalHost('0.0.0.0'), /verified Entra authentication/);
  assert.throws(() => assertLocalHost('192.168.1.2'), /verified Entra authentication/);
  assert.doesNotThrow(() => assertLocalHost('127.0.0.1'));
  const prompt = await (await fetch(`${base}/api/collector-prompt`)).json();
  assert.match(prompt.prompt, /CPSync/);
  assert.match(prompt.prompt, /work account/);
});
