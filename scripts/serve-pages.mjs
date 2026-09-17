// Local verification of the exact /docs publication, with no SPA or API fallback.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../docs/', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.md': 'text/plain' };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/GrapePaper/')) throw new Error('Not found');
    const relative = pathname.slice('/GrapePaper/'.length) || 'index.html';
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root)) throw new Error('Not found');
    const bytes = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' });
    response.end(bytes);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173/GrapePaper/'));
