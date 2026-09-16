import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listenForHandoffs, routeHandoff } from './handoffChannel';
import type { ZoteroHandoff } from './protocol';

type Message = { kind: string; requestId: string; receiverId?: string; payload?: unknown };
class MemoryChannel {
  static channels = new Set<MemoryChannel>();
  static messages: Message[] = [];
  onmessage: ((event: { data: Message }) => void) | null = null;
  constructor(public name: string) { MemoryChannel.channels.add(this); }
  postMessage(message: Message) {
    MemoryChannel.messages.push(message);
    const others = [...MemoryChannel.channels].filter(channel => channel !== this && channel.name === this.name);
    queueMicrotask(() => {
      for (const channel of others) {
        if (MemoryChannel.channels.has(channel)) channel.onmessage?.({ data: message });
      }
    });
  }
  close() { MemoryChannel.channels.delete(this); }
}

const payload: ZoteroHandoff = {
  version: 1, source: 'zotero', selection: { text: 'Selected passage', page: 2 }, document: { title: 'Example paper' },
};

beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', MemoryChannel);
  MemoryChannel.channels.clear();
  MemoryChannel.messages = [];
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Zotero session handoff between tabs', () => {
  it('delivers to the first available tab only and offers no passage content', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = listenForHandoffs(first);
    const stopSecond = listenForHandoffs(second);
    expect(await routeHandoff(payload)).toBe(true);
    expect(first).toHaveBeenCalledOnce();
    expect(first.mock.calls[0][0].selection).toEqual(payload.selection);
    expect(second).not.toHaveBeenCalled();
    const offer = MemoryChannel.messages.find(message => message.kind === 'offer');
    expect(Object.keys(offer!).sort()).toEqual(['kind', 'requestId']);
    expect(MemoryChannel.messages.filter(message => message.kind === 'deliver')).toHaveLength(1);
    expect(MemoryChannel.channels.size).toBe(2);
    stopFirst(); stopSecond();
    expect(MemoryChannel.channels.size).toBe(0);
  });

  it('falls back to the incoming tab when no receiver exists without broadcasting content', async () => {
    vi.useFakeTimers();
    const result = routeHandoff(payload);
    await vi.advanceTimersByTimeAsync(350);
    expect(await result).toBe(false);
    expect(MemoryChannel.messages.map(message => message.kind)).toEqual(['offer']);
    expect(MemoryChannel.channels.size).toBe(0);
  });

  it('retains a fallback copy when a receiver fails to accept the passage', async () => {
    vi.useFakeTimers();
    const stop = listenForHandoffs(() => { throw new Error('Closed reader'); });
    const result = routeHandoff(payload);
    await vi.advanceTimersByTimeAsync(400);
    expect(await result).toBe(false);
    stop();
    expect(MemoryChannel.channels.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('handles unavailable channels and aborted StrictMode attempts without leaked listeners', async () => {
    const controller = new AbortController();
    const result = routeHandoff(payload, { signal: controller.signal });
    controller.abort();
    expect(await result).toBe(false);
    expect(MemoryChannel.channels.size).toBe(0);
    vi.stubGlobal('BroadcastChannel', undefined);
    expect(await routeHandoff(payload)).toBe(false);
    expect(() => listenForHandoffs(() => {})()).not.toThrow();
  });

  it('rejects unsolicited and duplicate delivery, strips unrelated incoming fields', async () => {
    const received = vi.fn();
    const stop = listenForHandoffs(received);
    const result = routeHandoff({ ...payload, document: { ...payload.document, path: '/private/file' } } as ZoteroHandoff);
    expect(await result).toBe(true);
    expect(received.mock.calls[0][0].document).not.toHaveProperty('path');
    const delivery = MemoryChannel.messages.find(message => message.kind === 'deliver')!;
    const rogue = new MemoryChannel('grapepaper:handoff:v1');
    rogue.postMessage(delivery);
    rogue.postMessage({ ...delivery, requestId: 'unsolicited' });
    await Promise.resolve();
    expect(received).toHaveBeenCalledOnce();
    rogue.close(); stop();
  });

  it('cleans up losing receiver offer timers on unmount', async () => {
    vi.useFakeTimers();
    const stop1 = listenForHandoffs(() => {});
    const stop2 = listenForHandoffs(() => {});
    const result = routeHandoff(payload);
    await vi.advanceTimersByTimeAsync(0);
    expect(await result).toBe(true);
    stop1(); stop2();
    expect(vi.getTimerCount()).toBe(0);
    expect(MemoryChannel.channels.size).toBe(0);
  });
});
