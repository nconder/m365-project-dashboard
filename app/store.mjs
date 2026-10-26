import { readFile, writeFile, mkdir, readdir, realpath, stat, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseSnapshot, MAX_SNAPSHOT_BYTES } from './snapshot.mjs';

export class OneDriveFileStore {
  constructor(folder, expectedAccount = '') {
    this.folder = folder ? path.resolve(folder) : '';
    this.expectedAccount = expectedAccount;
  }

  async ready() {
    if (!this.folder) return false;
    try { return (await stat(this.folder)).isDirectory(); } catch { return false; }
  }

  async readSnapshot() {
    const file = await this.resolveFile('snapshot.json');
    if ((await stat(file)).size > MAX_SNAPSHOT_BYTES) throw new Error('Snapshot exceeds the 2 MB limit.');
    const raw = await readFile(file, 'utf8');
    return { snapshot: parseSnapshot(raw, { expectedAccount: this.expectedAccount }), hash: createHash('sha256').update(raw).digest('hex') };
  }

  async resolveFile(relative) {
    if (!this.folder || !relative || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => part === '..' || part.startsWith('.'))) throw new Error('File path is not allowed.');
    const base = await realpath(this.folder);
    const file = await realpath(path.resolve(base, relative));
    const relation = path.relative(base, file);
    if (!relation || relation.startsWith('..') || path.isAbsolute(relation)) throw new Error('File is outside the project folder.');
    return file;
  }

  async writeGenerated(relative, content) {
    // Atomic replacement prevents half-written reports when OneDrive or the browser reads a file.
    const base = await realpath(this.folder);
    const destination = path.join(base, relative);
    const temporary = path.join(base, `.${path.basename(relative)}.${randomUUID()}.tmp`);
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, destination);
  }

  async archive(snapshot, hash) {
    const directory = path.join(this.folder, 'history');
    await mkdir(directory, { recursive: true });
    const file = path.join(directory, `${snapshot.collectedAt.replace(/[:.]/g, '-')}-${hash.slice(0, 12)}.json`);
    try { await writeFile(file, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }

  async supportingFiles() {
    let files;
    try { files = await readdir(path.join(this.folder, 'supporting'), { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const allowed = /\.(pptx|pdf|docx|xlsx|md|txt|csv|png|jpg|jpeg)$/i;
    const output = [];
    for (const entry of files.slice(0, 250)) {
      if (!entry.isFile() || !allowed.test(entry.name) || entry.name.startsWith('.')) continue;
      const file = await this.resolveFile(path.join('supporting', entry.name));
      const info = await stat(file);
      output.push({ name: entry.name, bytes: info.size, modifiedAt: info.mtime.toISOString(), href: `/supporting/${encodeURIComponent(entry.name)}` });
    }
    return output.sort((a, b) => a.name.localeCompare(b.name));
  }
}
