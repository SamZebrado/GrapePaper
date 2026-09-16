import { describe, expect, it } from 'vitest';
import { boundsOfRects, pointInPolygon, rectangleFromPoints, selectTextBoxes, selectionAnchor, type TextBox } from './selectionGeometry';

const boxes: TextBox[] = [
  { text: 'first', rect: { x: 10, y: 10, width: 30, height: 10 }, index: 0 },
  { text: 'second', rect: { x: 45, y: 10, width: 30, height: 10 }, index: 1 },
  { text: 'other column', rect: { x: 210, y: 10, width: 70, height: 10 }, index: 2 },
  { text: 'next line', rect: { x: 10, y: 40, width: 70, height: 10 }, index: 3 },
];

describe('PDF selection geometry', () => {
  it('accepts a reverse drag and selects only the intended column in PDF order', () => {
    const region = rectangleFromPoints({ x: 90, y: 60 }, { x: 0, y: 0 });
    expect(selectTextBoxes([...boxes].reverse(), region).map(box => box.text)).toEqual(['first', 'second', 'next line']);
  });

  it('handles a concave freehand lasso without selecting the cut-out or adjacent column', () => {
    const polygon = [{ x: 0, y: 0 }, { x: 90, y: 0 }, { x: 90, y: 30 }, { x: 35, y: 30 }, { x: 35, y: 60 }, { x: 0, y: 60 }];
    expect(selectTextBoxes(boxes, polygon).map(box => box.text)).toEqual(['first', 'second']);
    expect(pointInPolygon({ x: 35, y: 40 }, polygon)).toBe(true);
    expect(pointInPolygon({ x: 50, y: 40 }, polygon)).toBe(false);
  });

  it('rejects an incomplete lasso and an empty selection', () => {
    expect(selectTextBoxes(boxes, [{ x: 0, y: 0 }, { x: 90, y: 60 }])).toEqual([]);
    expect(boundsOfRects([])).toBeNull();
  });

  it('keeps anchors identical across zoom and whitespace but distinguishes page and location', () => {
    const rect = { x: 10, y: 20, width: 80, height: 20 };
    const anchor = selectionAnchor(2, 'hello world', rect, { width: 200, height: 300 });
    expect(selectionAnchor(2, 'hello\n world', { x: 20, y: 40, width: 160, height: 40 }, { width: 400, height: 600 })).toBe(anchor);
    expect(selectionAnchor(3, 'hello world', rect, { width: 200, height: 300 })).not.toBe(anchor);
    expect(selectionAnchor(2, 'hello world', { ...rect, y: 70 }, { width: 200, height: 300 })).not.toBe(anchor);
  });
});
