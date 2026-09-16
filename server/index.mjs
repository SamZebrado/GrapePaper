import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { CompanionError, generateCompanion, readConfig } from './companion.mjs';

const MAX_BODY_BYTES = 128_000;
const DEFAULT_ORIGINS = [3000, 5173, 4173].flatMap(port => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]);

function sendJson(response, status, value) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}

function bodyJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    const contentLength = Number(request.headers['content-length'] || 0);
    if (contentLength > MAX_BODY_BYTES) {
      request.resume();
      reject(new CompanionError(413, 'REQUEST_TOO_LARGE', 'The selected text is too large.'));
      return;
    }
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        chunks.length = 0;
        reject(new CompanionError(413, 'REQUEST_TOO_LARGE', 'The selected text is too large.'));
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      if (size > MAX_BODY_BYTES) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch {
        reject(new CompanionError(400, 'INVALID_JSON', 'Send a valid JSON request.'));
      }
    });
    request.on('error', () => reject(new CompanionError(400, 'INVALID_REQUEST', 'The request could not be read.')));
    request.on('aborted', () => reject(new CompanionError(499, 'REQUEST_CANCELLED', 'The request was cancelled.')));
  });
}

export function createCompanionServer({ env = process.env, fetchImpl = fetch, maxConcurrent = 2 } = {}) {
  const allowedOrigins = new Set(env.GRAPEPAPER_ALLOWED_ORIGINS ? env.GRAPEPAPER_ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean) : DEFAULT_ORIGINS);
  let activeRequests = 0;
  const server = http.createServer(async (request, response) => {
    const host = request.headers.host || '';
    if (!/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(host)) {
      sendJson(response, 403, { error: { code: 'HOST_NOT_ALLOWED', message: 'Use localhost or 127.0.0.1 to access this local service.' } });
      return;
    }
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      sendJson(response, 403, { error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This webpage is not allowed to use the local companion.' } });
      return;
    }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.url === '/api/health' && request.method === 'GET') {
      try {
        sendJson(response, 200, { status: 'ok', configured: readConfig(env).configured });
      } catch {
        sendJson(response, 200, { status: 'ok', configured: false });
      }
      return;
    }
    if (request.url !== '/api/companion') {
      sendJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } });
      return;
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST, OPTIONS');
      sendJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for reading requests.' } });
      return;
    }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
      sendJson(response, 415, { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json.' } });
      return;
    }
    if (activeRequests >= maxConcurrent) {
      sendJson(response, 503, { error: { code: 'SERVER_BUSY', message: 'Two reading requests are already running. Please try again shortly.' } });
      return;
    }
    activeRequests += 1;
    const controller = new AbortController();
    request.on('aborted', () => controller.abort());
    response.on('close', () => { if (!response.writableEnded) controller.abort(); });
    try {
      const input = await bodyJson(request);
      const value = await generateCompanion(input, { config: readConfig(env), fetchImpl, signal: controller.signal });
      sendJson(response, 200, value);
    } catch (error) {
      const safe = error instanceof CompanionError ? error : new CompanionError(500, 'SERVER_ERROR', 'The reading request could not be completed.');
      sendJson(response, safe.status, { error: { code: safe.code, message: safe.message } });
    } finally { activeRequests -= 1; }
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.GRAPEPAPER_PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    process.stderr.write('GRAPEPAPER_PORT must be an integer from 1 to 65535.\n');
    process.exitCode = 1;
  } else {
    const server = createCompanionServer();
    server.on('error', () => { process.stderr.write('Could not start the local companion server. Check the port and local configuration.\n'); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => process.stdout.write(`GrapePaper companion is listening at http://127.0.0.1:${port}\n`));
  }
}
