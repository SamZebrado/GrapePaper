export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type TextBox = { text: string; rect: Rect; index: number };

export function rectangleFromPoints(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

/** Boundary points count as enclosed, so a word on the drawn edge is selectable. */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j];
    const b = polygon[i];
    const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
    if (Math.abs(cross) < 1e-7 && point.x >= Math.min(a.x, b.x) && point.x <= Math.max(a.x, b.x)
      && point.y >= Math.min(a.y, b.y) && point.y <= Math.max(a.y, b.y)) return true;
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Use word centres, not line bounding boxes, to avoid pulling in adjacent columns. */
export function selectTextBoxes(boxes: TextBox[], region: Rect | Point[]): TextBox[] {
  return boxes.filter(({ rect }) => {
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    return Array.isArray(region) ? pointInPolygon(point, region)
      : point.x >= region.x && point.x <= region.x + region.width
        && point.y >= region.y && point.y <= region.y + region.height;
  }).sort((a, b) => a.index - b.index);
}

export function boundsOfRects(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map(rect => rect.x));
  const y = Math.min(...rects.map(rect => rect.y));
  return { x, y, width: Math.max(...rects.map(rect => rect.x + rect.width)) - x,
    height: Math.max(...rects.map(rect => rect.y + rect.height)) - y };
}

export function normalizeSelectionText(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/** Zoom-independent location; content hashing here is an identifier, not a security check. */
export function selectionAnchor(page: number, text: string, rect: Rect, size: { width: number; height: number }): string {
  let hash = 2166136261;
  for (const character of normalizeSelectionText(text)) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  const location = [rect.x / size.width, rect.y / size.height, rect.width / size.width, rect.height / size.height]
    .map(value => Math.round(value * 1000)).join(',');
  return `p${page}:${(hash >>> 0).toString(16)}:${location}`;
}
