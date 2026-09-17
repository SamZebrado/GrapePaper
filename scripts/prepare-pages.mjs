import { cp, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';

// Keep documentation intact. Only this generated asset directory is replaced.
const root = new URL('../', import.meta.url);
await mkdir(new URL('docs/', root), { recursive: true });
await rm(new URL('docs/assets/', root), { recursive: true, force: true });
await cp(new URL('dist-pages/assets/', root), new URL('docs/assets/', root), { recursive: true });
await copyFile(new URL('dist-pages/index.html', root), new URL('docs/index.html', root));
for (const name of ['favicon.svg', 'icons.svg']) await copyFile(new URL(`dist-pages/${name}`, root), new URL(`docs/${name}`, root));
await copyFile(new URL('node_modules/pdfjs-dist/LICENSE', root), new URL('docs/PDFJS-LICENSE.txt', root));
await copyFile(new URL('THIRD_PARTY_NOTICES.md', root), new URL('docs/THIRD_PARTY_NOTICES.md', root));
await writeFile(new URL('docs/.nojekyll', root), '');
console.log('GitHub Pages preview built in docs/; source documentation preserved.');
