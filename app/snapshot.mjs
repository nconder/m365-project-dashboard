export const PROJECT = Object.freeze({ id: 'cpsync', name: 'CPSync' });
export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const statuses = new Set(['complete', 'partial', 'unavailable', 'not-requested']);
const recordTypes = ['meetings', 'decisions', 'actions', 'risks', 'documents'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function text(value, field, max = 12000) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `${field} must be non-empty text (maximum ${max} characters).`);
  return value;
}

export function safeSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 4000) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if ([...url.searchParams.keys()].some(key => /^(access_token|token|tempauth|authkey|client_secret|sig)$/i.test(key))) return false;
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      (host === 'teams.microsoft.com' || host === 'teams.cloud.microsoft' ||
       host === 'm365.cloud.microsoft' || host === 'copilot.cloud.microsoft' ||
       host === 'outlook.office.com' || host === 'outlook.office365.com' ||
       host === 'office.com' || host === 'www.office.com' ||
       host.endsWith('.sharepoint.com'));
  } catch { return false; }
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value) && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value.slice(0, 10);
}

export function validateSnapshot(input, { expectedAccount = '', now = Date.now() } = {}) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'A snapshot must be a JSON object.');
  assert(input.schemaVersion === 1, 'Unsupported schemaVersion. Expected 1.');
  assert(input.project?.id === PROJECT.id && input.project?.name === PROJECT.name, 'This workspace accepts CPSync snapshots only.');
  assert(validDate(input.collectedAt) && input.collectedAt.includes('T'), 'collectedAt must be a UTC timestamp.');
  assert(Date.parse(input.collectedAt) <= now + 300000, 'collectedAt is in the future. Check the collector clock.');
  assert(['microsoft-365-copilot', 'copilot-cowork', 'copilot-studio'].includes(input.collector?.kind), 'Collection must identify a Microsoft Copilot agent.');
  const upn = text(input.collector.userPrincipalName, 'collector.userPrincipalName', 254);
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(upn), 'The collector must report its work account email.');
  assert(!expectedAccount || upn.toLowerCase() === expectedAccount.toLowerCase(), 'The collector work account does not match the configured work account.');
  assert(input.coverage && typeof input.coverage === 'object', 'A coverage report is required.');
  assert(validDate(input.coverage.windowStart) && validDate(input.coverage.windowEnd), 'The coverage window must contain valid dates.');
  assert(Date.parse(input.coverage.windowStart) <= Date.parse(input.coverage.windowEnd), 'The coverage window is reversed.');
  for (const kind of ['meetings', 'documents', 'messages']) {
    assert(statuses.has(input.coverage[kind]?.status), `coverage.${kind}.status is invalid.`);
    text(input.coverage[kind].note, `coverage.${kind}.note`, 3000);
  }
  assert(Array.isArray(input.sources) && input.sources.length <= 1000, 'sources must be an array with at most 1000 entries.');
  const sourceIds = new Set();
  for (const source of input.sources) {
    text(source.id, 'source.id', 150);
    assert(!sourceIds.has(source.id), `Duplicate source: ${source.id}`);
    sourceIds.add(source.id);
    text(source.title, 'source.title', 1000);
    assert(['meeting', 'document', 'message', 'email'].includes(source.kind), 'Unsupported source kind.');
    assert(safeSourceUrl(source.url), `Source ${source.id} needs an approved HTTPS Microsoft 365 link.`);
    if (source.date) assert(validDate(source.date), `Source ${source.id} has an invalid date.`);
  }
  const citations = (item, field) => {
    assert(Array.isArray(item.sourceIds) && item.sourceIds.length > 0 && item.sourceIds.length <= 100, `${field} requires at least one source citation.`);
    assert(item.sourceIds.every(id => sourceIds.has(id)), `${field} refers to an unknown source.`);
  };
  text(input.summary?.headline, 'summary.headline', 1000);
  text(input.summary?.overview, 'summary.overview');
  assert(['on-track', 'at-risk', 'blocked', 'unknown'].includes(input.summary.health), 'summary.health is invalid.');
  assert(Array.isArray(input.summary.sourceIds), 'summary.sourceIds must be an array.');
  if (input.sources.length) citations(input.summary, 'summary');
  else {
    assert(input.summary.sourceIds.length === 0 && input.summary.health === 'unknown', 'An empty collection must have unknown health and no citations.');
    assert(!Object.values(input.coverage).some(value => value?.status === 'complete'), 'A collection without sources cannot claim complete coverage.');
  }
  for (const kind of recordTypes) {
    assert(Array.isArray(input[kind]) && input[kind].length <= 1000, `${kind} must be an array with at most 1000 entries.`);
    const ids = new Set();
    for (const item of input[kind]) {
      text(item.id, `${kind}.id`, 150);
      assert(!ids.has(item.id), `Duplicate ${kind} record: ${item.id}`);
      ids.add(item.id);
      text(item.title, `${kind}.title`, 1000);
      citations(item, `${kind}.${item.id}`);
      for (const key of ['detail', 'summary', 'owner', 'organizer']) if (item[key] !== undefined) text(item[key], `${kind}.${key}`);
      for (const key of ['date', 'dueDate', 'modifiedAt', 'decidedAt']) if (item[key]) assert(validDate(item[key]), `${kind}.${key} is invalid.`);
      if (kind === 'actions') assert(['open', 'in-progress', 'done', 'blocked'].includes(item.status), 'Action status is invalid.');
      if (kind === 'risks') assert(['low', 'medium', 'high'].includes(item.severity), 'Risk severity is invalid.');
    }
  }
  assert(Array.isArray(input.presentation?.talkingPoints) && input.presentation.talkingPoints.length <= 30, 'presentation.talkingPoints must be an array (maximum 30).');
  for (const point of input.presentation.talkingPoints) {
    text(point.text, 'presentation.talkingPoints.text', 3000);
    citations(point, 'presentation.talkingPoints');
  }
  // Keep the JSON document as the portable storage contract; never evaluate agent-generated code.
  return JSON.parse(JSON.stringify(input));
}

export function parseSnapshot(raw, options) {
  assert(Buffer.byteLength(raw) <= MAX_SNAPSHOT_BYTES, 'Snapshot exceeds the 2 MB limit.');
  let input;
  try { input = JSON.parse(raw); }
  catch { throw new Error('The snapshot is not valid JSON. It may still be syncing; the last valid report is retained.'); }
  return validateSnapshot(input, options);
}
