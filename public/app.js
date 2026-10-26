const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let state;
let view = 'overview';
let search = '';
let presentationMode = false;
let refreshing = false;
const views = {
  overview: ['Project overview', 'The context you need. The evidence behind it.'],
  meetings: ['Meeting intelligence', 'The discussions that moved CPSync forward.'],
  decisions: ['Decisions & actions', 'What was agreed. What happens next.'],
  documents: ['Project documents', 'The working files behind the bigger picture.'],
  presentation: ['Presentation pack', 'Your project story, ready to take into the room.'],
  setup: ['Collection setup', 'Choose where to keep exported snapshots and reports.']
};

function formattedDate(value, time = false) {
  if (!value) return 'Unknown';
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(date) : 'Unknown';
}

function badge(value) {
  const colors = { 'on-track': 'green', complete: 'green', done: 'green', low: 'green', 'in-progress': 'green', 'at-risk': 'amber', partial: 'amber', open: 'amber', medium: 'amber', high: 'red', blocked: 'red', unavailable: 'gray', unknown: 'gray', 'not-requested': 'gray' };
  const labels = { 'on-track': 'On track', 'at-risk': 'At risk', 'in-progress': 'In progress', 'not-requested': 'Not requested' };
  return `<span class="badge ${colors[value] || 'gray'}">${escape(labels[value] || value || 'Unknown')}</span>`;
}

function evidence(sourceIds = []) {
  return sourceIds.length ? `<button class="evidence-button" data-sources="${escape(JSON.stringify(sourceIds))}">${sourceIds.length} source${sourceIds.length === 1 ? '' : 's'} ↗</button>` : '';
}

function empty(title, description, action = '') {
  return `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">◇</span><h3>${escape(title)}</h3><p>${escape(description)}</p>${action}</div>`;
}

function coveragePanel() {
  return `<section class="panel"><div class="panel-header"><div><h2>Collection coverage</h2><p>Know what is behind the briefing.</p></div><span class="item-icon">◉</span></div><div class="coverage-list">${['meetings', 'documents', 'messages'].map(kind => {
    const coverage = state.snapshot?.coverage[kind];
    return `<div class="coverage-row"><div><div class="coverage-title">${kind === 'meetings' ? 'Teams meetings' : kind === 'documents' ? 'OneDrive documents' : 'Teams & email'} </div><p class="coverage-note">${escape(coverage?.note || 'Waiting for your first Copilot collection.')}</p></div>${badge(coverage?.status || 'not-requested')}</div>`;
  }).join('')}</div><button class="panel-bottom-link" data-view="setup">Review collection setup →</button></section>`;
}

function actionRows(actions) {
  return actions.map(item => `<div class="action-row"><span class="action-checkbox" aria-hidden="true">${item.status === 'done' ? '✓' : ''}</span><div><p class="action-row-title">${escape(item.title)}</p><div class="action-meta"><span>${escape(item.owner || 'Owner unknown')}</span><span>·</span><span>${item.dueDate ? formattedDate(item.dueDate) : 'Date unknown'}</span>${badge(item.status)}${evidence(item.sourceIds)}</div></div></div>`).join('');
}

function documentCards(documents) {
  return documents.map(item => `<article class="document-card"><div class="document-type"><span class="item-icon document">▤</span>PROJECT DOCUMENT</div><h3>${escape(item.title)}</h3><p>${escape(item.summary || 'See the original file for details.')}</p><div class="item-bottom"><span>${formattedDate(item.modifiedAt)}</span>${evidence(item.sourceIds)}</div></article>`).join('');
}

function renderOverview() {
  const snapshot = state.snapshot;
  const actions = snapshot?.actions.filter(item => item.status !== 'done') || [];
  const metrics = [
    ['◷', 'meetings', 'Meetings in context', snapshot?.meetings.length, 'With source references'],
    ['◇', 'decisions', 'Decisions captured', snapshot?.decisions.length, 'Traceable to the discussion'],
    ['☑', 'decisions', 'Open actions', snapshot ? actions.length : undefined, 'Reported by your collector'],
    ['▤', 'documents', 'Project documents', snapshot?.documents.length, 'Linked to the original files']
  ];
  const stats = `<div class="stats-grid">${metrics.map(([icon, target, title, count, detail]) => `<button class="stat-card" data-view="${target}"><span class="stat-icon">${icon}</span><div class="stat-label">${title}</div><div class="stat-value">${count ?? '—'}</div><div class="stat-meta">${count === undefined ? 'Awaiting collection' : detail}</div></button>`).join('')}</div>`;
  let brief;
  let activity;
  let documents;
  if (snapshot) {
    brief = `<section class="panel brief-panel"><div class="panel-header"><h2><span aria-hidden="true">✧</span> The project brief</h2>${badge(snapshot.summary.health)}</div><div class="panel-body"><p class="eyebrow">CPSYNC / AT A GLANCE</p><h2 class="brief-title">${escape(snapshot.summary.headline)}</h2><p class="brief-text">${escape(snapshot.summary.overview)}</p><div class="brief-footer"><span>Reported by collector: ${snapshot.sources.length} source${snapshot.sources.length === 1 ? '' : 's'}</span>${evidence(snapshot.summary.sourceIds)}</div></div></section>`;
    const recent = [...snapshot.sources].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    activity = `<div class="timeline">${recent.map(item => `<article class="timeline-item"><span class="item-icon ${escape(item.kind)}">${item.kind === 'meeting' ? '◷' : item.kind === 'document' ? '▤' : '◌'}</span><div><h3 class="item-title">${escape(item.title)}</h3><p class="item-text">${escape(item.kind === 'meeting' ? snapshot.meetings.find(meeting => meeting.sourceIds.includes(item.id))?.summary || 'Meeting source' : item.kind === 'document' ? snapshot.documents.find(document => document.sourceIds.includes(item.id))?.summary || 'Document source' : 'Supporting project conversation')}</p><div class="item-bottom"><span>${formattedDate(item.date)}</span>${evidence([item.id])}</div></div></article>`).join('')}</div>`;
    documents = snapshot.documents.length ? `<div class="panel-body document-grid">${documentCards(snapshot.documents.slice(0, 2))}</div>` : empty('No document findings', 'This collection did not return any supported document updates.');
  } else {
    brief = `<section class="panel brief-panel"><div class="panel-header"><h2><span aria-hidden="true">✧</span> The project brief</h2><span class="badge">Waiting for snapshot</span></div><div class="panel-body"><p class="eyebrow">CPSYNC / YOUR NEXT CLEAR PICTURE</p><h2 class="brief-title">Your project,<br>in focus.</h2><p class="brief-text">Bring your meetings, decisions, and working documents together. Microsoft Copilot collects the context; this workspace makes it easy to use.</p><div class="brief-footer"><span>Your work account. Your existing access.</span><button class="evidence-button" data-collect>Get snapshot request ↗</button></div></div></section>`;
    activity = empty('Your project story starts here', 'Run a CPSync collection in Microsoft Copilot to see recent meetings, documents, and decisions.', '<button class="button secondary small" data-collect>View collection instructions →</button>');
    documents = empty('The evidence, within reach', 'Your collector will link relevant OneDrive documents here. Originals stay in Microsoft 365.');
  }
  return `${stats}<div class="overview-grid"><div class="overview-main">${brief}<section class="panel"><div class="panel-header"><div><h2>Recent project activity</h2><p>A connected view of the latest evidence.</p></div><button class="button ghost small" data-view="meetings">View meetings ↗</button></div>${activity}</section><section class="panel"><div class="panel-header"><h2>Evidence library</h2><button class="button ghost small" data-view="documents">All documents ↗</button></div>${documents}</section></div><div class="overview-aside"><section class="panel"><div class="panel-header"><div><h2>Keep things moving</h2><p>Actions that still need attention.</p></div><span class="badge gray">${snapshot ? actions.length : '—'} open</span></div>${actions.length ? `<div class="actions-list">${actionRows(actions.slice(0, 4))}</div>` : empty(snapshot ? 'No open actions reported' : 'A clearer next step', snapshot ? 'This collection has no open actions. Check coverage before treating it as complete.' : 'Owners, due dates, and follow-ups will appear after collection.')}<button class="panel-bottom-link" data-view="decisions">View decisions & actions →</button></section>${coveragePanel()}${!snapshot ? `<section class="panel"><div class="panel-header"><h2>Three steps to your first brief</h2></div><div class="onboarding-steps"><div class="step"><span class="step-number">01</span><strong>Choose an output folder</strong>Optional: keep exported results in work OneDrive.</div><div class="step"><span class="step-number">02</span><strong>Request a snapshot</strong>Use the full request in your existing work agent.</div><div class="step"><span class="step-number">03</span><strong>Load and present</strong>Load the returned JSON and open the report.</div></div></section>` : ''}</div></div>`;
}

function searchTools(caption) {
  return `<div class="section-tools"><span class="section-caption">${escape(caption)}</span><input id="search" class="search-input" type="search" aria-label="Search this view" placeholder="Search titles, owners, or findings…" value="${escape(search)}"></div>`;
}

function matches(item) { return JSON.stringify(item).toLowerCase().includes(search.toLowerCase()); }

function renderMeetings() {
  const meetings = state.snapshot?.meetings.filter(matches) || [];
  return `${searchTools(`${state.snapshot?.meetings.length || 0} meetings in the current collection`)}<section class="panel">${meetings.length ? `<div class="full-list">${meetings.map(item => `<article class="timeline-item"><span class="item-icon">◷</span><div><h2 class="item-title">${escape(item.title)}</h2><p class="item-text">${escape(item.summary || 'See source references for the meeting details.')}</p><div class="item-bottom"><span>${formattedDate(item.date, true)}</span><span>${escape(item.organizer || 'Organiser unknown')}</span>${evidence(item.sourceIds)}</div></div></article>`).join('')}</div>` : empty(search ? 'No matching meetings' : 'Meetings, with the context attached', search ? 'Try another title or keyword.' : 'Your Copilot collector will add supported CPSync meeting summaries here.', '<button class="button secondary small" data-collect>Get snapshot request →</button>')}</section>`;
}

function dataTable(items, columns) {
  if (!items.length) return empty('No supported items found', search ? 'Try another search.' : 'Your collector will add evidence-backed findings after a run.');
  return `<div class="table-wrap"><table><thead><tr>${columns.map(([label]) => `<th scope="col">${label}</th>`).join('')}<th scope="col">Evidence</th></tr></thead><tbody>${items.map(item => `<tr>${columns.map(([, key]) => `<td>${key === 'status' || key === 'severity' ? badge(item[key]) : key.endsWith('Date') || key === 'decidedAt' ? formattedDate(item[key]) : escape(item[key] || 'Unknown')}${key === 'title' && item.detail ? `<span class="subtext">${escape(item.detail)}</span>` : ''}</td>`).join('')}<td>${evidence(item.sourceIds)}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderDecisions() {
  const snapshot = state.snapshot;
  return `${searchTools('Decisions, actions, and risks reported by your Microsoft Copilot collector.')}<div class="view-stack"><section class="panel"><div class="panel-header"><h2>Decisions</h2><span class="badge gray">${snapshot?.decisions.length || 0} captured</span></div>${dataTable(snapshot?.decisions.filter(matches) || [], [['Decision', 'title'], ['Owner', 'owner'], ['Decided', 'decidedAt']])}</section><section class="panel"><div class="panel-header"><h2>Actions & follow-ups</h2><span class="badge gray">Evidence-backed</span></div>${dataTable(snapshot?.actions.filter(matches) || [], [['Action', 'title'], ['Owner', 'owner'], ['Due', 'dueDate'], ['Status', 'status']])}</section><section class="panel"><div class="panel-header"><h2>Risks & blockers</h2></div>${dataTable(snapshot?.risks.filter(matches) || [], [['Risk', 'title'], ['Owner', 'owner'], ['Severity', 'severity']])}</section></div>`;
}

function renderDocuments() {
  const documents = state.snapshot?.documents.filter(matches) || [];
  return `${searchTools('Original files remain in Microsoft 365. This view provides context and source links.')}<div class="document-grid">${documents.length ? documentCards(documents) : `<section class="panel">${empty(search ? 'No matching documents' : 'Your working knowledge, connected', search ? 'Try another file name or keyword.' : 'Your collector will find project documents using your existing work-account permissions.')}</section>`}</div>`;
}

function renderPresentation() {
  const snapshot = state.snapshot;
  return `<div class="view-stack"><div class="export-grid">${[
    ['▣', 'Presentation view', 'A clean, full-screen project overview for sharing your screen.', '<button class="button secondary small" data-presentation>Enter presentation mode ↗</button>'],
    ['▤', 'Standalone HTML brief', 'An exportable report with decisions, actions, and original source links.', `<a class="button secondary small ${!snapshot ? 'disabled' : ''}" href="/report?download" ${!snapshot ? 'aria-disabled="true" tabindex="-1"' : ''}>Download HTML ↓</a>`],
    ['≡', 'Presentation notes', 'Evidence-backed talking points and an editable Markdown brief.', `<a class="button secondary small ${!snapshot ? 'disabled' : ''}" href="/brief" ${!snapshot ? 'aria-disabled="true" tabindex="-1"' : ''}>Download notes ↓</a>`]
  ].map(([icon, title, description, action]) => `<section class="export-card"><span class="item-icon document">${icon}</span><h3>${title}</h3><p>${description}</p>${snapshot ? action : '<span class="badge gray">Available after first collection</span>'}</section>`).join('')}</div><section class="panel"><div class="panel-header"><h2>The talking points</h2><span class="badge gray">Review before presenting</span></div>${snapshot?.presentation.talkingPoints.length ? `<div class="panel-body">${snapshot.presentation.talkingPoints.map((point, index) => `<div class="talking-point"><span class="point-number">${String(index + 1).padStart(2, '0')}</span><div>${escape(point.text)}<br>${evidence(point.sourceIds)}</div></div>`).join('')}</div>` : empty('A project story you can stand behind', 'The collector will prepare concise talking points, each linked to supporting evidence.')}</section><section class="panel"><div class="panel-header"><div><h2>Supporting presentation files</h2><p>Office files created by Copilot and saved in your supporting folder.</p></div><span class="badge gray">${state.files.length} files</span></div>${state.files.length ? `<div class="file-list">${state.files.map(file => `<div class="file-row"><span class="item-icon document">▤</span><div><strong>${escape(file.name)}</strong><p>${formattedDate(file.modifiedAt)} · ${Math.max(1, Math.round(file.bytes / 1024))} KB</p></div><a href="${escape(file.href)}">Download ↓</a></div>`).join('')}</div>` : empty('Keep the supporting story here', 'Ask Microsoft Copilot to create your PowerPoint, Word, Excel, or PDF materials and save them in the project’s supporting folder.')}</section></div>`;
}

function renderSetup() {
  return `<div class="setup-grid"><div><section class="panel"><div class="panel-header"><div><h2>Dashboard output folder (optional)</h2><p>Keep snapshots and reports in your synced work OneDrive, or load a session preview without a folder.</p></div>${badge(state.storage.available ? 'complete' : 'not-requested')}</div><form id="settings-form" class="settings-form"><div><label for="folder">Local dashboard output folder</label><input id="folder" name="folder" required value="${escape(state.storage.folder)}" placeholder="C:\\Users\\you\\OneDrive - Company\\ProjectDashboard\\CPSync" autocomplete="off"><p class="helper">Choose any existing synced work OneDrive folder and select “Always keep on this device.” This holds exported results; original project documents stay wherever they are.</p></div><div><label for="work-account">Work account used for reports</label><input id="work-account" name="expectedAccount" type="email" required value="${escape(state.storage.expectedAccount)}" placeholder="you@company.com" autocomplete="email"><p class="helper">Checks the report’s account label. Microsoft sign-in happens inside your work agent.</p></div><div><button class="button primary" type="submit" ${state.demo ? 'disabled' : ''}>Save output folder</button></div><p id="form-status" class="form-status" role="status"></p></form></section><div class="privacy-card"><h3>Company access stays in Microsoft.</h3><p>Your work agent searches under your Microsoft sign-in. This app does not connect to your organization or hold Microsoft API tokens. Load only results you are authorised to use on this device.</p></div></div><div><section class="panel"><div class="panel-header"><h2>Get your first snapshot</h2></div><div class="setup-instructions"><ol><li>Copy or download the full snapshot request. It includes the JSON format; installing a skill is optional.</li><li>Send it to your existing CPSync work agent. OneDrive writing and an identity API are not required for read-only collection.</li><li>Download its <code>snapshot.json</code>, or copy the complete JSON response.</li><li>Select <strong>Load snapshot</strong> here. Choose the file or paste its JSON, and confirm the report account.</li><li>With an output folder set, validated results and reports are saved there. Otherwise the preview lasts until this server restarts.</li></ol><div class="dialog-actions"><button class="button secondary small" data-collect>Get snapshot request</button><button class="button primary small" data-import>Load snapshot</button></div></div></section><section class="panel"><div class="panel-header"><h2>Actual connection status</h2></div><div class="panel-body"><p class="helper">Agent connection: none · manual export/import<br>Automatic collection: unavailable<br>Output folder: ${state.storage.available ? 'Available on this desktop' : 'Not configured or unavailable'}<br>Reported account: ${escape(state.snapshot?.collector.userPrincipalName || 'No snapshot loaded')}<br>Microsoft API tokens held by this app: none</p></div></section></div></div>`;
}
function render() {
  if (!state) return;
  $('#page-title').textContent = views[view][0];
  $('#page-subtitle').textContent = views[view][1];
  document.querySelectorAll('.nav-link[data-view]').forEach(button => { button.classList.toggle('active', button.dataset.view === view); button.setAttribute('aria-current', button.dataset.view === view ? 'page' : 'false'); });
  $('#sample-banner').hidden = !state.demo;
  const connection = $('#connection-label');
  connection.replaceChildren();
  const dot = document.createElement('i'); dot.className = `status-dot ${state.storage.available || state.demo ? '' : 'amber'}`; connection.append(dot);
  connection.append(document.createTextNode(state.demo ? 'Fictional sample data' : state.collection.manualPreview ? 'Session preview · not saved to OneDrive' : state.storage.available ? 'Output folder available · manual collection' : 'Output folder not set · preview available'));
  $('#updated-label').textContent = state.snapshot ? `Collected ${formattedDate(state.snapshot.collectedAt, true)}` : 'No project data collected yet';
  $('#nav-meetings').textContent = state.snapshot?.meetings.length || 0;
  $('#nav-documents').textContent = state.snapshot?.documents.length || 0;
  $('#setup-dot').classList.toggle('amber', !state.storage.available);
  const error = $('#error-banner');
  const warningCount = state.citationWarnings?.length || 0;
  const message = [state.collection.error, warningCount ? `${warningCount} source link(s) need review. The briefing is loaded; those links are disabled. Open its source references for details.` : '', state.collection.stale && !state.demo ? 'This collection is over 24 hours old. Run Microsoft Copilot again for a fresh briefing.' : ''].filter(Boolean).join(' ');
  error.hidden = !message; error.textContent = message;
  const renderers = { overview: renderOverview, meetings: renderMeetings, decisions: renderDecisions, documents: renderDocuments, presentation: renderPresentation, setup: renderSetup };
  $('#content').innerHTML = renderers[view]();
}

async function api(route, payload) {
  const response = await fetch(route, payload === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function toast(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  setTimeout(() => { $('#toast').hidden = true; }, 4000);
}

async function refresh(announce = false) {
  if (refreshing) return;
  refreshing = true;
  $('#refresh-button').disabled = true;
  try {
    const next = await api(announce ? '/api/scan' : '/api/state', announce ? {} : undefined);
    const changed = JSON.stringify(state) !== JSON.stringify(next);
    state = next;
    // Avoid losing a partially entered folder or search when the polling response arrives.
    const editing = $('#settings-form')?.contains(document.activeElement) || document.activeElement?.id === 'search';
    if (changed && (!editing || announce)) render();
    if (announce) toast(next.collection.error ? 'Files checked. Review the collection status.' : 'Project files refreshed.');
  } catch (error) {
    $('#error-banner').hidden = false; $('#error-banner').textContent = error.message;
  } finally { refreshing = false; $('#refresh-button').disabled = false; }
}

async function openCollector() {
  try {
    const { prompt } = await api('/api/collector-prompt');
    $('#collector-prompt').value = prompt;
    $('#collector-dialog').showModal();
  } catch (error) { toast(error.message); }
}

function openImport() {
  if (state.demo) return toast('Open the real dashboard to load a snapshot.');
  if ($('#collector-dialog').open) $('#collector-dialog').close();
  $('#import-account').value = state.storage.expectedAccount || state.snapshot?.collector.userPrincipalName || '';
  $('#snapshot-file').value = ''; $('#snapshot-text').value = ''; $('#import-status').textContent = '';
  $('#import-dialog').showModal();
}

function openSources(ids) {
  const sources = state.snapshot?.sources.filter(source => ids.includes(source.id)) || [];
  $('#sources-content').innerHTML = sources.map(source => {
    const warning = state.citationWarnings?.find(item => item.id === source.id);
    return `<article class="source-item"><span class="badge gray">${escape(source.kind)}</span>${warning ? `<strong>${escape(source.title)}</strong><span class="badge amber">Link needs review</span><p>${escape(warning.message)}</p>` : `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)} ↗</a>`}<small>${formattedDate(source.date)}</small></article>`;
  }).join('');
  $('#sources-dialog').showModal();
}

document.addEventListener('click', event => {
  const button = event.target.closest('button,a');
  if (!button) return;
  if (button.dataset.view) { view = button.dataset.view; search = ''; render(); }
  if (button.hasAttribute('data-collect')) openCollector();
  if (button.hasAttribute('data-import')) openImport();
  if (button.dataset.sources) openSources(JSON.parse(button.dataset.sources));
  if (button.hasAttribute('data-presentation')) {
    presentationMode = true; view = 'overview';
    document.body.classList.add('presentation-mode'); render();
    const exit = document.createElement('button'); exit.id = 'exit-presentation'; exit.className = 'button secondary'; exit.textContent = 'Exit presentation';
    exit.addEventListener('click', () => { presentationMode = false; document.body.classList.remove('presentation-mode'); exit.remove(); render(); });
    $('.page-tools').append(exit);
  }
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && presentationMode) $('#exit-presentation')?.click(); });
document.addEventListener('input', event => {
  if (event.target.id !== 'search') return;
  search = event.target.value;
  const position = event.target.selectionStart;
  render();
  $('#search').focus();
  if (Number.isInteger(position)) $('#search').setSelectionRange(position, position);
});
document.addEventListener('submit', async event => {
  if (event.target.id === 'snapshot-import-form') {
    event.preventDefault();
    const status = $('#import-status'); const button = $('#load-snapshot');
    button.disabled = true; status.textContent = 'Checking the snapshot…';
    try {
      const text = $('#snapshot-text').value.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
      if (new Blob([text]).size > 2 * 1024 * 1024) throw new Error('Snapshot exceeds the 2 MB limit.');
      let snapshot;
      try { snapshot = JSON.parse(text); } catch { throw new Error('Paste the complete JSON returned by Copilot, or choose its snapshot.json file.'); }
      state = await api('/api/import-snapshot', { snapshot, expectedAccount: $('#import-account').value });
      $('#import-dialog').close(); view = 'overview'; search = ''; render();
      toast(state.collection.manualPreview ? 'Snapshot loaded for this session. Configure an output folder to keep it.' : 'Snapshot saved and dashboard updated.');
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
    return;
  }
  if (event.target.id !== 'settings-form') return;
  event.preventDefault();
  const input = Object.fromEntries(new FormData(event.target));
  const status = $('#form-status'); status.textContent = 'Checking project folder…';
  try { state = await api('/api/settings', input); render(); $('#form-status').textContent = 'Output folder saved. Load the snapshot returned by your work agent.'; }
  catch (error) { status.textContent = error.message; }
});
$('#refresh-button').addEventListener('click', () => refresh(true));
$('#collect-button').addEventListener('click', openCollector);
$('#import-button').addEventListener('click', openImport);
$('#snapshot-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  $('#snapshot-text').value = ''; $('#import-status').textContent = '';
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('Snapshot exceeds the 2 MB limit.');
    $('#snapshot-text').value = await file.text();
  } catch (error) { $('#import-status').textContent = error.message; }
});
$('#copy-prompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#collector-prompt').value); $('#copy-status').textContent = 'Copied. Paste this request into your existing work agent, then load the JSON it returns.'; }
  catch { $('#collector-prompt').focus(); $('#collector-prompt').select(); $('#copy-status').textContent = 'Select and copy the instructions above.'; }
});
refresh();
setInterval(() => refresh(), 15000);
