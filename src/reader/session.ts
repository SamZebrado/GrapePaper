export const PROGRESS_KEY = 'grapepaper.reading.v1';
export interface ReadingSession { confirmed: string[]; sinceCard: number }
export interface ProgressData { version: 1; documents: Record<string, ReadingSession> }
export const emptySession = (): ReadingSession => ({ confirmed: [], sinceCard: 0 });

// Only an explicit check reaches this function. Selection/render/scroll never does.
export function confirmPassage(session: ReadingSession, key: string, cadence: number) {
  if (!key || session.confirmed.includes(key)) return { session, unlock: false };
  const sinceCard = session.sinceCard + 1;
  const unlock = cadence > 0 && sinceCard >= cadence;
  return { session: { confirmed: [...session.confirmed, key], sinceCard: unlock ? 0 : sinceCard }, unlock };
}

export function parseProgress(raw: string | null): ProgressData {
  const empty: ProgressData = { version: 1, documents: {} };
  if (!raw || raw.length > 2_000_000) return empty;
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1 || !data.documents || typeof data.documents !== 'object') return empty;
    for (const [key, value] of Object.entries(data.documents).slice(0, 100)) {
      const v = value as ReadingSession;
      if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(key) || !Array.isArray(v.confirmed)) continue;
      empty.documents[key] = {
        confirmed: [...new Set(v.confirmed.filter((x): x is string => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)))].slice(-10000),
        sinceCard: Number.isInteger(v.sinceCard) && v.sinceCard >= 0 && v.sinceCard < 10000 ? v.sinceCard : 0,
      };
    }
  } catch { /* Corrupted/old data starts a fresh session. */ }
  return empty;
}

export async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export function passageIdentity(page: number, text: string) {
  return digest(`${page}:${text.normalize('NFKC').replace(/\s+/g, ' ').trim()}`);
}
