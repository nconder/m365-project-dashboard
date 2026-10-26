import { safeSourceUrl, citationWarnings } from './snapshot.mjs';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function renderReport(snapshot) {
  const sources = new Map(snapshot.sources.map(source => [source.id, source]));
  const warnings = citationWarnings(snapshot);
  const cites = ids => ids.map(id => { const source = sources.get(id); return safeSourceUrl(source.url) ? `<a href="${escapeHtml(source.url)}" rel="noopener noreferrer">${escapeHtml(source.title)}</a>` : `<span>${escapeHtml(source.title)} (link needs review)</span>`; }).join(' · ');
  const rows = (items, columns) => items.length ? `<table><thead><tr>${columns.map(([label]) => `<th>${label}</th>`).join('')}<th>Evidence</th></tr></thead><tbody>${items.map(item => `<tr>${columns.map(([, key]) => `<td>${escapeHtml(item[key] || 'Unknown')}</td>`).join('')}<td>${cites(item.sourceIds)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No supported items found in this collection.</p>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CPSync · Project briefing</title><style>
  *{box-sizing:border-box}body{font:16px/1.6 "Segoe UI",Arial,sans-serif;color:#142d37;margin:0;background:#f3f6f5}main{max-width:1120px;margin:0 auto;padding:48px}header{border-top:5px solid #087d70;padding-top:24px}h1{font-size:42px;letter-spacing:-1.5px;line-height:1.15;margin:12px 0}h2{margin-top:40px}a{color:#086d63}section{break-inside:avoid}table{border-collapse:collapse;width:100%;font-size:14px;background:white}th,td{text-align:left;padding:12px;border-bottom:1px solid #dce5e2;vertical-align:top}th{color:#536b72;font-size:12px;text-transform:uppercase}.muted{color:#597078}.label{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#087d70}.health{font-weight:600}.coverage{display:flex;gap:18px;flex-wrap:wrap}.coverage div{flex:1;min-width:200px;background:#e8eeeb;padding:16px;border-radius:10px}footer{margin-top:40px;border-top:1px solid #dce5e2;padding-top:20px;font-size:12px;color:#597078}@media(max-width:700px){main{padding:24px}h1{font-size:32px}table{display:block;overflow:auto}}@media print{body{background:white}main{padding:0;max-width:none}a{color:inherit}h1{font-size:32px}table{font-size:11px}.coverage div{background:#f5f5f5}}
  </style></head><body><main><header><div class="label">CPSync / Project intelligence</div><h1>${escapeHtml(snapshot.summary.headline)}</h1><p>${escapeHtml(snapshot.summary.overview)}</p><p class="health">Reported health: ${escapeHtml(snapshot.summary.health)} · Collected ${escapeHtml(snapshot.collectedAt)}</p></header>
  ${warnings.length ? `<p>${warnings.length} source link(s) need review. Their findings are retained, but those links are unavailable.</p>` : ''}
  <section><h2>Presentation talking points</h2>${snapshot.presentation.talkingPoints.length ? `<ol>${snapshot.presentation.talkingPoints.map(point => `<li>${escapeHtml(point.text)}<br><small>${cites(point.sourceIds)}</small></li>`).join('')}</ol>` : '<p>No evidence-backed talking points were returned.</p>'}</section>
  <section><h2>Decisions</h2>${rows(snapshot.decisions, [['Decision', 'title'], ['Detail', 'detail'], ['Owner', 'owner']])}</section>
  <section><h2>Actions</h2>${rows(snapshot.actions, [['Action', 'title'], ['Owner', 'owner'], ['Due', 'dueDate'], ['Status', 'status']])}</section>
  <section><h2>Risks</h2>${rows(snapshot.risks, [['Risk', 'title'], ['Detail', 'detail'], ['Severity', 'severity']])}</section>
  <section><h2>Meetings</h2>${rows(snapshot.meetings, [['Meeting', 'title'], ['Date', 'date'], ['Summary', 'summary']])}</section>
  <section><h2>Documents</h2>${rows(snapshot.documents, [['Document', 'title'], ['Updated', 'modifiedAt'], ['Summary', 'summary']])}</section>
  <section><h2>Collection coverage</h2><div class="coverage">${['meetings', 'documents', 'messages'].map(kind => `<div><strong>${kind}: ${escapeHtml(snapshot.coverage[kind].status)}</strong><p>${escapeHtml(snapshot.coverage[kind].note)}</p></div>`).join('')}</div></section>
  <footer>This is a generated snapshot, not a live permission check. Share only with people authorised to see its contents. Reported collector: ${escapeHtml(snapshot.collector.userPrincipalName)}. All findings require review before presentation.</footer></main></body></html>`;
}

export function renderBrief(snapshot) {
  const sources = new Map(snapshot.sources.map(source => [source.id, source]));
  const clean = value => String(value ?? '').replace(/[\r\n]+/g, ' ');
  const cite = ids => ids.map(id => { const source = sources.get(id); return `${clean(source.title)}: ${safeSourceUrl(source.url) ? clean(source.url) : '[link needs review]'}`; }).join(' | ');
  return `# CPSync — presentation brief\n\nGenerated from collection ${snapshot.collectedAt}.\n\n## Summary\n\n${snapshot.summary.headline}\n\n${snapshot.summary.overview}\n\nSources: ${cite(snapshot.summary.sourceIds)}\n\n## Talking points\n\n${snapshot.presentation.talkingPoints.map(point => `- ${clean(point.text)}\n  Sources: ${cite(point.sourceIds)}`).join('\n')}\n\n## Decisions\n\n${snapshot.decisions.map(item => `- ${clean(item.title)} — ${clean(item.detail)}\n  Sources: ${cite(item.sourceIds)}`).join('\n')}\n\n## Actions\n\n${snapshot.actions.map(item => `- ${clean(item.title)} | ${clean(item.owner || 'Unknown')} | ${clean(item.dueDate || 'Unknown')} | ${item.status}\n  Sources: ${cite(item.sourceIds)}`).join('\n')}\n\n## Coverage\n\n${['meetings', 'documents', 'messages'].map(kind => `- ${kind}: ${snapshot.coverage[kind].status} — ${clean(snapshot.coverage[kind].note)}`).join('\n')}\n`;
}
