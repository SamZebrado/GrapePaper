import { describe, expect, it } from 'vitest';
import { companionEndpoint } from './serviceConnection';

describe('companion service addresses', () => {
  it('supports an HTTPS gateway prefix and a loopback service', () => {
    expect(companionEndpoint('https://reader.example/bridge/')).toBe('https://reader.example/bridge/api/companion');
    expect(companionEndpoint('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787/api/companion');
    expect(companionEndpoint('https://reader.example/api/companion')).toBe('https://reader.example/api/companion');
  });
  it.each(['http://reader.example', 'javascript:alert(1)', 'https://user:secret@example.com', 'https://example.com/?key=secret', 'https://example.com/#secret'])('rejects unsafe or credential-bearing addresses: %s', address => {
    expect(() => companionEndpoint(address)).toThrow();
  });
});
