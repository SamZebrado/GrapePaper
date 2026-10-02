// Prepares files only: never launches Zotero or touches an existing profile.
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = await mkdtemp(path.join(tmpdir(), 'grapepaper-zotero-smoke-'));
const profile = path.join(root, 'profile');
const data = path.join(root, 'data');
await mkdir(profile);
await mkdir(data);
const prefs = [
  ['extensions.zotero.useDataDir', true],
  ['extensions.zotero.dataDir', data],
  ['extensions.zotero.debug.store', true],
  ['extensions.zotero.debug.log', true],
];
await writeFile(path.join(profile, 'user.js'), prefs.map(([key, value]) =>
  `user_pref(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join('\n') + '\n');
console.log(JSON.stringify({ root, profile, data, launched: false }, null, 2));
console.log(`Launch manually on macOS: /Applications/Zotero.app/Contents/MacOS/zotero -no-remote -profile ${JSON.stringify(profile)} -ZoteroDebugText`);
