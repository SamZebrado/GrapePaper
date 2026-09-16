import { parseHandoff, type ZoteroHandoff } from './protocol';

const CHANNEL_NAME = 'grapepaper:handoff:v1';
const OFFER_LIFETIME_MS = 2000;
const MAX_PENDING_OFFERS = 32;
type ChannelMessage = { kind: string; requestId: string; receiverId?: string; payload?: unknown };

function uniqueId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function messageFrom(value: unknown): ChannelMessage | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (typeof message.kind !== 'string' || typeof message.requestId !== 'string' || message.requestId.length > 100) return null;
  if (message.receiverId !== undefined && (typeof message.receiverId !== 'string' || message.receiverId.length > 100)) return null;
  return message as ChannelMessage;
}

function cleanPayload(value: unknown): ZoteroHandoff | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const selection = data.selection as Record<string, unknown> | null;
  const document = data.document as Record<string, unknown> | null;
  if (data.version !== 1 || data.source !== 'zotero' || !selection || typeof selection.text !== 'string' || selection.text.length > 4000) return null;
  try {
    // Reuse the URL-import validator without serializing unrelated incoming fields.
    return parseHandoff('#grapepaper=' + encodeURIComponent(JSON.stringify({
      version: 1,
      source: 'zotero',
      selection: { text: selection.text, page: selection.page },
      document: {
        title: typeof document?.title === 'string' ? document.title.slice(0, 1000) : undefined,
        doi: typeof document?.doi === 'string' ? document.doi.slice(0, 300) : undefined,
      },
    })));
  } catch { return null; }
}

/**
 * Offer an incoming selection to an existing tab. No passage content is sent until
 * a receiver answers; only the first receiver is targeted. True means its callback
 * accepted the payload. False means the caller should use the current tab.
 * Do not register this tab as a receiver until this routing attempt has settled.
 */
export function routeHandoff(
  payload: ZoteroHandoff,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<boolean> {
  const safePayload = cleanPayload(payload);
  if (!safePayload || options.signal?.aborted || typeof BroadcastChannel !== 'function') return Promise.resolve(false);
  let channel: BroadcastChannel;
  try { channel = new BroadcastChannel(CHANNEL_NAME); } catch { return Promise.resolve(false); }
  const requestId = uniqueId();
  const timeoutMs = Math.min(1000, Math.max(50, options.timeoutMs ?? 350));

  return new Promise(resolve => {
    let finished = false;
    let receiverId: string | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (forwarded: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
      channel.onmessage = null;
      channel.close();
      resolve(forwarded);
    };
    const onAbort = () => finish(false);
    options.signal?.addEventListener('abort', onAbort, { once: true });
    channel.onmessage = event => {
      const message = messageFrom(event.data);
      if (finished || !message || message.requestId !== requestId) return;
      if (message.kind === 'ready' && !receiverId && message.receiverId) {
        receiverId = message.receiverId;
        clearTimeout(timer);
        timer = setTimeout(() => finish(false), timeoutMs);
        try { channel.postMessage({ kind: 'deliver', requestId, receiverId, payload: safePayload }); }
        catch { finish(false); }
      } else if (message.kind === 'received' && receiverId && message.receiverId === receiverId) {
        finish(true);
      }
    };
    timer = setTimeout(() => finish(false), timeoutMs);
    try { channel.postMessage({ kind: 'offer', requestId }); }
    catch { finish(false); }
  });
}

/** Keep this tab's reading session available for later Zotero selections. */
export function listenForHandoffs(onPayload: (payload: ZoteroHandoff) => void): () => void {
  if (typeof BroadcastChannel !== 'function') return () => {};
  let channel: BroadcastChannel;
  try { channel = new BroadcastChannel(CHANNEL_NAME); } catch { return () => {}; }
  const receiverId = uniqueId();
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  let closed = false;
  channel.onmessage = event => {
    const message = messageFrom(event.data);
    if (closed || !message) return;
    if (message.kind === 'offer') {
      if (!pending.has(message.requestId)) {
        if (pending.size >= MAX_PENDING_OFFERS) return;
        pending.set(message.requestId, setTimeout(() => pending.delete(message.requestId), OFFER_LIFETIME_MS));
      }
      try { channel.postMessage({ kind: 'ready', requestId: message.requestId, receiverId }); } catch { /* Caller will use its new tab. */ }
    } else if (message.kind === 'deliver' && message.receiverId === receiverId && pending.has(message.requestId)) {
      clearTimeout(pending.get(message.requestId));
      pending.delete(message.requestId);
      const payload = cleanPayload(message.payload);
      if (!payload) return;
      try {
        onPayload(payload);
        channel.postMessage({ kind: 'received', requestId: message.requestId, receiverId });
      } catch { /* Delivery was not accepted; caller will retain its own copy. */ }
    }
  };
  return () => {
    if (closed) return;
    closed = true;
    channel.onmessage = null;
    channel.close();
    for (const timer of pending.values()) clearTimeout(timer);
    pending.clear();
  };
}
