import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OneDriveFileStore } from './store.mjs';
import { PROJECT, parseSnapshot, MAX_SNAPSHOT_BYTES } from './snapshot.mjs';
import { renderReport, renderBrief } from './report.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const loopback = new Set(['127.0.0.1', 'localhost', '::1']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.pdf': 'application/pdf', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

export function assertLocalHost(host) {
  if (!loopback.has(host)) throw new Error('V1 serves this computer only. Configure verified Entra authentication and a delegated storage adapter before moving to Azure. See docs/azure-v2.md.');
}

function send(response, status, body, contentType = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': contentType });
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function protect(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  let host;
  try { host = new URL(`http://${request.headers.host}`).hostname.replace(/^\[|\]$/g, ''); } catch { return false; }
  if (!loopback.has(host) || request.headers['sec-fetch-site'] === 'cross-site') return false;
  if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) return false;
  return true;
}

async function requestJson(request, maxBytes = 16000) {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new Error('Use application/json.');
  let length = 0;
  const parts = [];
  for await (const part of request) {
    length += part.length;
    if (length > maxBytes) throw new Error('Request is too large.');
    parts.push(part);
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

export async function createDashboardServer(options = {}) {
  const settingsPath = options.settingsPath || process.env.APP_SETTINGS_PATH || path.join(root, '.local', 'settings.json');
  let saved = {};
  try { saved = JSON.parse(await readFile(settingsPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw new Error('Local settings could not be read. Restore valid .local/settings.json.'); }
  let settings = {
    folder: options.folder ?? process.env.PROJECT_DATA_DIR ?? saved.folder ?? '',
    expectedAccount: options.expectedAccount ?? process.env.EXPECTED_WORK_ACCOUNT ?? saved.expectedAccount ?? ''
  };
  const demo = options.demo ?? process.argv.includes('--demo');
  let snapshot = demo ? parseSnapshot(await readFile(path.join(root, 'examples', 'cpsync.snapshot.json'), 'utf8')) : null;
  let store = new OneDriveFileStore(settings.folder, settings.expectedAccount);
  let hash = '';
  let collectionError = '';
  let checkedAt = null;
  let available = false;
  let files = [];
  let activeScan;
  let manualPreview = false;
  let importing = false;

  async function scanFiles() {
    if (demo) return;
    checkedAt = new Date().toISOString();
    available = await store.ready();
    if (!available) { collectionError = settings.folder ? 'The configured OneDrive folder is unavailable. Check sync and folder access.' : ''; files = []; return; }
    if (!settings.expectedAccount) { collectionError = 'Set the expected work account in Collection setup before reading project data.'; return; }
    try {
      if (!snapshot) {
        const recovered = await store.recoverSnapshot();
        if (recovered) { snapshot = recovered.snapshot; hash = recovered.hash; }
      }
      const incoming = await store.readSnapshot();
      if (snapshot && Date.parse(incoming.snapshot.collectedAt) < Date.parse(snapshot.collectedAt)) throw new Error('An older snapshot was detected. The newer valid collection is retained.');
      if (incoming.hash !== hash) {
        await store.archive(incoming.snapshot, incoming.hash);
        await store.writeGenerated('dashboard.html', renderReport(incoming.snapshot));
        await store.writeGenerated('presentation-brief.md', renderBrief(incoming.snapshot));
        snapshot = incoming.snapshot;
        hash = incoming.hash;
        manualPreview = false;
      }
      files = await store.supportingFiles();
      collectionError = '';
    } catch (error) {
      collectionError = error.code === 'ENOENT' ? (snapshot ? 'snapshot.json is unavailable. Showing the last valid collection.' : 'No snapshot.json yet. Run the CPSync collector in Microsoft Copilot.') : error.message;
    }
  }

  async function scan() {
    if (!activeScan) activeScan = scanFiles().finally(() => { activeScan = null; });
    await activeScan;
  }

  const state = () => ({
    project: PROJECT, snapshot, files, demo,
    storage: { configured: !!settings.folder, available, folder: settings.folder, expectedAccount: settings.expectedAccount },
    collection: { checkedAt, error: collectionError, stale: !!snapshot && Date.now() - Date.parse(snapshot.collectedAt) > 86400000, hasLastValid: !!snapshot, manualPreview },
    capabilities: { collection: 'Microsoft Copilot agents only', automaticCollection: false, agentConnected: false, applicationApiTokens: false, hosting: 'local-node', azureReady: false }
  });

  await scan();
  const server = http.createServer(async (request, response) => {
    if (!protect(request, response)) return send(response, 403, { error: 'This dashboard accepts local, same-origin requests only.' });
    let url;
    try { url = new URL(request.url, `http://${request.headers.host}`); } catch { return send(response, 400, { error: 'Invalid request.' }); }
    const route = url.pathname;
    try {
      if (request.method === 'GET' && route === '/health') return send(response, 200, { status: 'ok', project: PROJECT.id, version: '0.1.0' });
      if (request.method === 'GET' && route === '/api/state') { await scan(); return send(response, 200, state()); }
      if (request.method === 'POST' && route === '/api/scan') { await requestJson(request); await scan(); return send(response, 200, state()); }
      if (request.method === 'POST' && route === '/api/settings') {
        if (demo) return send(response, 400, { error: 'Settings are unavailable in the fictional sample preview.' });
        const input = await requestJson(request);
        if (typeof input.folder !== 'string' || !path.isAbsolute(input.folder) || !(await stat(input.folder)).isDirectory()) throw new Error('Choose an existing, absolute CPSync folder inside your synced work OneDrive.');
        if (typeof input.expectedAccount !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.expectedAccount)) throw new Error('Enter the work account used by Microsoft Copilot and OneDrive.');
        if (path.resolve(input.folder).startsWith(path.resolve(root) + path.sep) || path.resolve(input.folder) === path.resolve(root)) throw new Error('Keep project data in OneDrive, outside the source-code checkout.');
        await mkdir(path.dirname(settingsPath), { recursive: true });
        const next = { folder: path.resolve(input.folder), expectedAccount: input.expectedAccount.trim().toLowerCase() };
        await writeFile(settingsPath, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
        settings = next;
        store = new OneDriveFileStore(settings.folder, settings.expectedAccount);
        snapshot = null; hash = ''; files = []; manualPreview = false;
        await scan();
        return send(response, 200, state());
      }
      if (request.method === 'POST' && route === '/api/import-snapshot') {
        if (demo) throw new Error('Import is unavailable in the fictional sample preview.');
        if (importing) throw new Error('Another snapshot is loading. Try again shortly.');
        importing = true;
        try {
          const input = await requestJson(request, MAX_SNAPSHOT_BYTES + 1024);
          const expectedAccount = settings.expectedAccount || String(input.expectedAccount || '').trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expectedAccount)) throw new Error('Enter the work account used to collect this snapshot.');
          if (!input.snapshot || typeof input.snapshot !== 'object' || Array.isArray(input.snapshot)) throw new Error('Choose snapshot.json or paste its JSON contents.');
          const incoming = parseSnapshot(JSON.stringify(input.snapshot), { expectedAccount });
          await scan();
          if (snapshot && Date.parse(incoming.collectedAt) < Date.parse(snapshot.collectedAt)) throw new Error('An older snapshot was supplied. The newer valid collection is retained.');
          if (settings.folder) {
            if (!(await store.ready())) throw new Error('The output folder is unavailable. Restore folder access before saving.');
            await store.writeGenerated('snapshot.json', JSON.stringify(incoming, null, 2) + '\n');
            await scan();
            if (collectionError) throw new Error(collectionError);
          } else {
            snapshot = incoming; hash = ''; files = []; manualPreview = true; collectionError = '';
          }
          return send(response, 200, state());
        } finally { importing = false; }
      }
      if (request.method === 'GET' && (route === '/api/collector-prompt' || route === '/collector/request')) {
        const instructions = await readFile(path.join(root, 'collector', 'run-prompt.txt'), 'utf8');
        const skill = await readFile(path.join(root, 'collector', 'skills', 'cpsync-dashboard', 'SKILL.md'), 'utf8');
        const start = skill.indexOf('## Snapshot contract');
        const end = skill.indexOf('## Before saving');
        if (start < 0 || end <= start) throw new Error('The snapshot format could not be loaded.');
        const prompt = instructions.replaceAll('{{WORK_ACCOUNT}}', settings.expectedAccount || '[confirm your work-account email in this conversation]') + '\n\n' + skill.slice(start, end);
        if (route === '/collector/request') {
          response.setHeader('Content-Disposition', 'attachment; filename="CPSync-snapshot-request.txt"');
          return send(response, 200, prompt, types['.txt']);
        }
        return send(response, 200, { prompt });
      }
      if (request.method === 'GET' && route === '/collector/skill') {
        response.setHeader('Content-Disposition', 'attachment; filename="SKILL.md"');
        return send(response, 200, await readFile(path.join(root, 'collector', 'skills', 'cpsync-dashboard', 'SKILL.md'), 'utf8'), 'text/markdown; charset=utf-8');
      }
      if (request.method === 'GET' && (route === '/report' || route === '/brief' || route === '/snapshot')) {
        await scan();
        if (!snapshot) return send(response, 409, { error: 'Collect a validated CPSync snapshot before exporting.' });
        if (route === '/report') {
          response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
          if (url.searchParams.has('download')) response.setHeader('Content-Disposition', 'attachment; filename="CPSync-dashboard.html"');
          return send(response, 200, renderReport(snapshot), types['.html']);
        }
        response.setHeader('Content-Disposition', `attachment; filename="${route === '/brief' ? 'CPSync-presentation-brief.md' : 'CPSync-snapshot.json'}"`);
        return send(response, 200, route === '/brief' ? renderBrief(snapshot) : JSON.stringify(snapshot, null, 2), route === '/brief' ? types['.md'] : types['.json']);
      }
      if (request.method === 'GET' && route.startsWith('/supporting/')) {
        await scan();
        const name = decodeURIComponent(route.slice('/supporting/'.length));
        if (name !== path.basename(name) || name.includes('\\') || !files.some(file => file.name === name)) return send(response, 404, { error: 'File not found.' });
        const file = await store.resolveFile(path.join('supporting', name));
        response.setHeader('Content-Type', types[path.extname(name).toLowerCase()] || 'application/octet-stream');
        response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
        createReadStream(file).on('error', () => response.destroy()).pipe(response);
        return;
      }
      if (request.method !== 'GET') return send(response, 405, { error: 'Method not allowed.' });
      const publicFiles = { '/': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css', '/favicon.svg': 'favicon.svg' };
      const publicName = publicFiles[route];
      if (!publicName) return send(response, 404, { error: 'Not found.' });
      return send(response, 200, await readFile(path.join(root, 'public', publicName), 'utf8'), types[path.extname(publicName)]);
    } catch (error) {
      const missing = error.code === 'ENOENT';
      return send(response, missing ? 404 : 400, { error: missing ? 'File or folder not found.' : error.message });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return { server, scan, state };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const host = process.env.HOST || '127.0.0.1';
  assertLocalHost(host);
  if (process.env.WEBSITE_INSTANCE_ID) throw new Error('Azure deployment is a v2 step. See docs/azure-v2.md before enabling external hosting.');
  const port = Number(process.env.PORT || 4317);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  const { server } = await createDashboardServer();
  server.on('error', error => { console.error(`Dashboard could not start: ${error.code || error.message}`); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`CPSync dashboard: http://${host === '::1' ? '[::1]' : host}:${port}${process.argv.includes('--demo') ? ' (fictional sample preview)' : ''}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
