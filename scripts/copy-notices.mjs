import { copyFile } from 'node:fs/promises';
await copyFile(new URL('../node_modules/pdfjs-dist/LICENSE', import.meta.url), new URL('../dist/PDFJS-LICENSE.txt', import.meta.url));
