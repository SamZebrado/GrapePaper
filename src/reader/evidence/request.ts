/** Bound an explicitly configured companion response before JSON parsing. No credentials. */
export async function evidenceJson(endpoint: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(endpoint, { method: 'POST', credentials: 'omit', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!response.body) throw new Error('证据服务没有返回内容。');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 64000) { await reader.cancel(); throw new Error('证据服务返回超过 64 KB。'); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let result: unknown;
  try { result = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('证据服务返回的 JSON 无效。'); }
  if (!response.ok) throw new Error('证据服务暂不可用；本地检索仍可使用。');
  return result;
}
