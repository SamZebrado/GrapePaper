import { mergeAttributes } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

describe('TipTap attribute boundary', () => {
  it('copies an own JSON prototype key as data without inheriting attributes', () => {
    const imported = JSON.parse('{"__proto__":{"title":"inherited canary"},"class":"note"}');
    const merged = mergeAttributes({ role: 'textbox' }, imported);

    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(merged, '__proto__')).toEqual({
      value: { title: 'inherited canary' },
      configurable: true,
      enumerable: true,
      writable: true,
    });
    expect(merged).not.toHaveProperty('title');
    expect(merged).toEqual({ role: 'textbox', ...imported });
    const renderedKeys: string[] = [];
    for (const key in merged) renderedKeys.push(key);
    expect(renderedKeys.sort()).toEqual(['__proto__', 'class', 'role']);
    expect(Object.prototype).not.toHaveProperty('title');
  });
});
