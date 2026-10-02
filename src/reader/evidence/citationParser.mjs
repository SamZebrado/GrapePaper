// One deterministic grammar for the browser and the independently validating service.
const YEAR = '(?:18|19|20)\\d{2}[a-z]?';
const SURNAME = "[\\p{Lu}\\p{Script=Han}][\\p{L}’'\\-]*";
const AUTHOR = `${SURNAME}(?:\\s+(?:et\\s+al\\.?|(?:&|and)\\s+${SURNAME}))?`;
const authorKey = value => value.normalize('NFKC').toLocaleLowerCase('en').replace(/[’']/g, "'");
const key = (author, year) => `${authorKey(author)}|${year.toLowerCase()}`;
const id = (prefix, value) => {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${prefix}-${(hash >>> 0).toString(16)}`;
};

/** DOI identity only: bibliography presence never verifies support. */
export function normalizeDoi(value) {
  const match = value.match(/10\.\d{4,9}\/[^\s<>"?#]+/i);
  if (!match) return undefined;
  let doi = match[0].replace(/[.,;:]+$/, '');
  while (doi.endsWith(')') && (doi.match(/\)/g)?.length ?? 0) > (doi.match(/\(/g)?.length ?? 0)) doi = doi.slice(0, -1);
  return doi.length <= 256 ? doi.toLowerCase() : undefined;
}
function numericKeys(raw) {
  const result = [];
  for (const part of raw.split(/[,;]/)) {
    const match = part.trim().match(/^(\d{1,4})(?:\s*[-–]\s*(\d{1,4}))?$/);
    if (!match) return null;
    const start = Number(match[1]), end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end - start > 29 || end > 9999) return null;
    for (let number = start; number <= end; number++) result.push(String(number));
    if (result.length > 30) return null;
  }
  return [...new Set(result)];
}
/** Conservative recognizable citation forms; unknown syntax is not guessed. */
export function detectCitations(text) {
  const input = text.slice(0, 100_000);
  const found = [];
  const add = (raw, start, kind, keys) => {
    if (keys.length && found.length < 200) found.push({ id: id(`citation-${start}`, raw), raw, kind, keys: [...new Set(keys)], start, end: start + raw.length });
  };
  for (const match of input.matchAll(/\[([^\]\n]{1,100})\]/g)) {
    const keys = numericKeys(match[1]);
    if (keys) add(match[0], match.index, 'numeric', keys);
  }
  const parenthetical = new RegExp(`^(${AUTHOR})\\s*,?\\s*(${YEAR})(?:\\s*,\\s*(${YEAR}))*$`, 'u');
  for (const match of input.matchAll(/\(([^()\n]{1,300})\)/g)) {
    const keys = [];
    let valid = true;
    for (const part of match[1].split(';')) {
      const parsed = part.trim().match(parenthetical);
      if (!parsed) { valid = false; break; }
      const surname = parsed[1].match(new RegExp(`^${SURNAME}`, 'u'))[0];
      const years = part.match(new RegExp(YEAR, 'g')) ?? [];
      keys.push(...years.map(year => key(surname, year)));
    }
    if (valid) add(match[0], match.index, 'author-year', keys);
  }
  const narrative = new RegExp(`(${AUTHOR})\\s*\\((${YEAR}(?:\\s*,\\s*${YEAR})*)\\)`, 'gu');
  for (const match of input.matchAll(narrative)) {
    const surname = match[1].match(new RegExp(`^${SURNAME}`, 'u'))[0];
    add(match[0], match.index, 'author-year', match[2].match(new RegExp(YEAR, 'g')).map(year => key(surname, year)));
  }
  return found.sort((a, b) => a.start - b.start);
}
function entryStart(line) {
  return /^\s*(?:\[\d{1,4}\]|\d{1,4}[.)])\s*\S/.test(line) || new RegExp(`^\\s*${SURNAME}(?:,|\\s+(?:[A-Z]\\.|et\\s+al\\.?))[^\\n]{0,180}${YEAR}`, 'u').test(line);
}
/** Line-based bibliography; merged entries preserve raw text. */
export function parseBibliography(text) {
  const blocks = [];
  let pending = '';
  for (const line of text.slice(0, 24_000).split(/\r?\n/)) {
    if (/^\s*(?:references|bibliography|参考文献|\[PDF page \d+\])\s*$/i.test(line)) continue;
    if (!line.trim()) { if (pending) blocks.push(pending); pending = ''; continue; }
    if (entryStart(line) && pending) { blocks.push(pending); pending = ''; }
    pending += (pending ? '\n' : '') + line;
  }
  // Exact-limit input may already be clipped by PDF extraction: don't infer completeness.
  if (pending && text.length < 24_000) blocks.push(pending);
  return blocks.filter(raw => raw.length <= 4000).slice(0, 100).map((raw, index) => {
    const labelMatch = raw.match(/^\s*(?:\[(\d{1,4})\]|(\d{1,4})[.)])\s*/);
    const body = raw.slice(labelMatch?.[0].length ?? 0).trim();
    const yearMatch = body.match(new RegExp(`\\b(${YEAR})\\b`));
    const surname = body.match(new RegExp(`^(${SURNAME})(?:,|\\s+(?:[A-Z]\\.|et\\s+al\\.?))`, 'u'))?.[1];
    const afterYear = yearMatch ? body.slice(yearMatch.index + yearMatch[0].length).replace(/^[)\].,:;\s]+/, '') : '';
    const title = (afterYear || body).replace(/(?:https?:\/\/)?(?:dx\.)?doi\.org\/\S+|\bdoi:\s*\S+/gi, '').trim().slice(0, 1000) || body.slice(0, 1000);
    return { id: id(`bibliography-${index}`, raw), raw, label: labelMatch ? String(Number(labelMatch[1] ?? labelMatch[2])) : undefined,
      authorKey: surname ? authorKey(surname) : undefined, year: yearMatch?.[1].toLowerCase(), title, doi: normalizeDoi(body) };
  });
}

/** Opaque IDs are binding handles, not semantic proof. Re-derive ALL semantic fields. */
export function assertCanonicalBibliographyEntry(entry) {
  const fail = () => { throw new Error('Bibliography provenance is inconsistent with raw entry.'); };
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.raw !== 'string' || !entry.raw.trim() || entry.raw.length > 4000) return fail();
  const derived = parseBibliography(entry.raw);
  if (derived.length !== 1) return fail();
  for (const field of ['label', 'authorKey', 'year', 'doi', 'title']) if (entry[field] !== derived[0][field]) return fail();
}
