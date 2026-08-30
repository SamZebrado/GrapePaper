import { describe, expect, it } from 'vitest';
import { calculateCitationPreviewPosition } from './DewdropCitation.position';

const rect = (left: number, top: number, width = 44, height = 44) => ({
  left,
  right: left + width,
  top,
  bottom: top + height,
  width,
  height,
});

describe('calculateCitationPreviewPosition', () => {
  it('prefers below and clamps the left edge to 12px', () => {
    const result = calculateCitationPreviewPosition({
      trigger: rect(0, 20),
      previewWidth: 340,
      previewHeight: 240,
      viewportWidth: 900,
      viewportHeight: 800,
    });
    expect(result.placement).toBe('below');
    expect(result.left).toBe(12);
    expect(result.top).toBe(76);
  });

  it('flips above near the bottom edge without covering the trigger', () => {
    const trigger = rect(500, 740);
    const result = calculateCitationPreviewPosition({
      trigger,
      previewWidth: 340,
      previewHeight: 240,
      viewportWidth: 900,
      viewportHeight: 800,
    });
    expect(result.placement).toBe('above');
    expect(result.top + result.maxHeight).toBeLessThanOrEqual(trigger.top - 12);
  });

  it('clamps the right edge to the viewport gutter', () => {
    const result = calculateCitationPreviewPosition({
      trigger: rect(870, 300),
      previewWidth: 340,
      previewHeight: 240,
      viewportWidth: 900,
      viewportHeight: 800,
    });
    expect(result.left + 340).toBeLessThanOrEqual(888);
    expect(result.arrowX).toBeLessThanOrEqual(322);
  });

  it('honors a canvas-side left boundary when a sidebar occupies the viewport edge', () => {
    const result = calculateCitationPreviewPosition({
      trigger: rect(345, 400),
      previewWidth: 340,
      previewHeight: 240,
      viewportWidth: 900,
      viewportHeight: 800,
      minLeft: 310,
    });
    expect(result.left).toBe(310);
    expect(result.left + 340).toBeLessThanOrEqual(888);
  });
});
