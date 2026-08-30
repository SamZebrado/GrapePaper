export type ContextSurfaceType = 'annotation' | 'citation' | 'annotation-input' | 'chat';

export interface ContextSurfaceDetail {
  type: ContextSurfaceType;
  ownerId: string;
}

export const CONTEXT_SURFACE_EVENT = 'grapepaper:context-surface-open';

export function openContextSurface(detail: ContextSurfaceDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ContextSurfaceDetail>(CONTEXT_SURFACE_EVENT, { detail }));
}

export function listenForContextSurface(
  listener: (detail: ContextSurfaceDetail) => void,
) {
  if (typeof window === 'undefined') return () => undefined;
  const handleEvent = (event: Event) => {
    listener((event as CustomEvent<ContextSurfaceDetail>).detail);
  };
  window.addEventListener(CONTEXT_SURFACE_EVENT, handleEvent);
  return () => window.removeEventListener(CONTEXT_SURFACE_EVENT, handleEvent);
}
