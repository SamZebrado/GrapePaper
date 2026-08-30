import { describe, expect, it } from 'vitest';
import {
  assertValidVineGeometry,
  buildVineGeometry,
  validateVineGeometry,
  type VineGeometry,
} from './VineConnector.geometry';

const idPairs = [
  ['', ''],
  ['a', 'b'],
  ['same', 'same'],
  ['paragraph-1', 'paragraph-2'],
  ['short', 'paragraph-with-a-very-long-stable-identifier'],
  ['段落一', '段落二'],
  ['🍇', '🪨'],
  ['with spaces', 'with/slash'],
  ['punctuation:[]{}', 'query?x=1&y=2'],
  ['alpha.beta', 'alpha-beta'],
  ['00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
  ['mixed_中文_123', 'NEXT::Δ'],
] as const;

describe('buildVineGeometry', () => {
  it('snapshots deterministic variants across at least ten stable ID pairs', () => {
    const variants = idPairs.map(([fromId, toId]) => ({
      ids: [fromId, toId],
      geometry: buildVineGeometry(fromId, toId),
    }));

    for (const [index, [fromId, toId]] of idPairs.entries()) {
      expect(variants[index].geometry).toEqual(buildVineGeometry(fromId, toId));
    }
    expect(variants).toMatchSnapshot();
  });

  it('keeps every sampled variant finite and inside the frozen bounds', () => {
    for (const [fromId, toId] of idPairs) {
      const geometry = buildVineGeometry(fromId, toId);
      expect(validateVineGeometry(geometry)).toEqual([]);
      expect(geometry.leaves).toHaveLength(2);
      expect(geometry.filledAreaRatio).toBeLessThan(0.08);
      expect([geometry.mainPath, ...geometry.branches].join(' ')).not.toMatch(/NaN|Infinity/);
      for (const leaf of geometry.leaves) {
        expect(Object.values(leaf).every(Number.isFinite)).toBe(true);
        expect(leaf.width).toBeLessThanOrEqual(5);
        expect(leaf.height).toBeLessThanOrEqual(8);
        expect(leaf.cx - leaf.width / 2).toBeGreaterThanOrEqual(0);
        expect(leaf.cx + leaf.width / 2).toBeLessThanOrEqual(160);
        expect(leaf.cy - leaf.height / 2).toBeGreaterThanOrEqual(0);
        expect(leaf.cy + leaf.height / 2).toBeLessThanOrEqual(40);
      }
    }
  });

  it('keeps filled decorative area below eight percent', () => {
    const geometry = buildVineGeometry('one', 'two');
    expect(geometry.filledAreaRatio).toBeLessThan(0.08);
    expect(geometry.filledAreaRatio).toBeCloseTo(0.0215, 3);
  });

  it.each([
    ['NaN leaf coordinate', { leaves: [{ cx: Number.NaN, cy: 10, flip: 1, width: 5, height: 8 }] }],
    ['out-of-range leaf', { leaves: [{ cx: 200, cy: 10, flip: 1, width: 5, height: 8 }] }],
    ['oversized dense leaf', { leaves: [{ cx: 80, cy: 20, flip: 1, width: 25, height: 17 }] }],
    ['dense filled area', { filledAreaRatio: 0.2 }],
    ['non-finite path', { mainPath: 'M 80 1 C NaN 11, 80 29, 80 39' }],
    ['out-of-range path', { mainPath: 'M 80 1 C 999 11, 80 29, 80 39' }],
  ])('rejects malformed geometry: %s', (_label, override) => {
    const valid = buildVineGeometry('guard', 'probe');
    const malformed = {
      ...valid,
      ...override,
    } as VineGeometry;

    expect(validateVineGeometry(malformed)).not.toEqual([]);
    expect(() => assertValidVineGeometry(malformed)).toThrow(/Invalid VineConnector geometry/);
  });
});
