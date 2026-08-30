export type RectLike = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>;

interface PositionInput {
  trigger: RectLike;
  previewWidth: number;
  previewHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  minLeft?: number;
  gutter?: number;
  gap?: number;
}

export interface CitationPreviewPosition {
  left: number;
  top: number;
  arrowX: number;
  maxHeight: number;
  placement: 'above' | 'below';
}

export function calculateCitationPreviewPosition({
  trigger,
  previewWidth,
  previewHeight,
  viewportWidth,
  viewportHeight,
  minLeft = 12,
  gutter = 12,
  gap = 12,
}: PositionInput): CitationPreviewPosition {
  const safeWidth = Math.min(previewWidth, Math.max(0, viewportWidth - gutter * 2));
  const roomBelow = Math.max(0, viewportHeight - trigger.bottom - gap - gutter);
  const roomAbove = Math.max(0, trigger.top - gap - gutter);
  const placement = roomBelow >= previewHeight || roomBelow >= roomAbove ? 'below' : 'above';
  const availableHeight = placement === 'below' ? roomBelow : roomAbove;
  const maxHeight = Math.max(96, Math.min(previewHeight, availableHeight));
  const triggerCenter = trigger.left + trigger.width / 2;
  const leftBoundary = Math.max(gutter, minLeft);
  const rightmostLeft = viewportWidth - safeWidth - gutter;
  const effectiveLeftBoundary = Math.min(leftBoundary, rightmostLeft);
  const left = Math.max(
    effectiveLeftBoundary,
    Math.min(triggerCenter - safeWidth / 2, rightmostLeft),
  );
  const top = placement === 'below'
    ? trigger.bottom + gap
    : trigger.top - gap - maxHeight;
  const arrowX = Math.max(18, Math.min(triggerCenter - left, safeWidth - 18));

  return { left, top, arrowX, maxHeight, placement };
}
