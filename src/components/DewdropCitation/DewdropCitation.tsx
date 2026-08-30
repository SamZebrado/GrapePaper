import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Citation } from '../../types';
import { calculateCitationPreviewPosition } from './DewdropCitation.position';
import styles from './DewdropCitation.module.css';
import { listenForContextSurface, openContextSurface } from '../../utils/contextSurface';

interface DewdropCitationProps {
  citation: Citation;
}

type PreviewPosition = {
  left: number;
  top: number;
  arrowX: number;
  maxHeight: number;
  placement: 'above' | 'below';
  measured: boolean;
};

export default function DewdropCitation({ citation }: DewdropCitationProps) {
  const { t } = useTranslation();
  const reactId = useId();
  const previewId = `citation-preview-${reactId.replace(/:/g, '')}`;
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const suppressNextFocusOpenRef = useRef(false);
  const [pointerWithin, setPointerWithin] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [position, setPosition] = useState<PreviewPosition>({
    left: 0,
    top: 0,
    arrowX: 24,
    maxHeight: 320,
    placement: 'below',
    measured: false,
  });

  const isOpen = !dismissed && (pointerWithin || focusWithin || pinned);
  const hasLongAbstract = Boolean(citation.abstract && citation.abstract.length > 280);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const schedulePointerClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setPointerWithin(false);
      closeTimerRef.current = null;
    }, 80);
  }, [clearCloseTimer]);

  const updatePosition = useCallback(() => {
    const wrapper = wrapperRef.current;
    const trigger = triggerRef.current;
    const preview = previewRef.current;
    if (!wrapper || !trigger || !preview) return;

    const result = calculateCitationPreviewPosition({
      trigger: trigger.getBoundingClientRect(),
      previewWidth: preview.offsetWidth,
      previewHeight: preview.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      minLeft: Math.max(
        12,
        trigger.closest<HTMLElement>('[data-testid^="stone-slab-"]')?.getBoundingClientRect().left ?? 12,
      ),
    });
    const wrapperRect = wrapper.getBoundingClientRect();
    setPosition({
      ...result,
      left: Math.round(result.left - wrapperRect.left),
      top: Math.round(result.top - wrapperRect.top),
      measured: true,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setPosition((current) => ({ ...current, measured: false }));
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, showFullAbstract, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleViewportChange = () => updatePosition();
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleViewportChange);
    if (previewRef.current) observer?.observe(previewRef.current);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!pinned) return;
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      setPinned(false);
      setPointerWithin(false);
      setFocusWithin(false);
      setShowFullAbstract(false);
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [pinned]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => listenForContextSurface((detail) => {
    if (detail.type === 'citation' && detail.ownerId === citation.id) return;
    clearCloseTimer();
    setPinned(false);
    setPointerWithin(false);
    setFocusWithin(false);
    setDismissed(true);
    setShowFullAbstract(false);
  }), [citation.id, clearCloseTimer]);

  useEffect(() => {
    if (isOpen) openContextSurface({ type: 'citation', ownerId: citation.id });
  }, [citation.id, isOpen]);

  const closePreview = useCallback(() => {
    clearCloseTimer();
    setPinned(false);
    setPointerWithin(false);
    setFocusWithin(false);
    setDismissed(true);
    setShowFullAbstract(false);
    if (triggerRef.current && document.activeElement !== triggerRef.current) {
      suppressNextFocusOpenRef.current = true;
      triggerRef.current.focus();
    }
  }, [clearCloseTimer]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closePreview();
  }, [closePreview]);

  const togglePinned = useCallback(() => {
    setDismissed(false);
    setPinned((current) => !current);
  }, []);

  const triggerLabel = t('citation.triggerLabel', {
    key: citation.key || t('citation.untitledKey'),
    title: citation.title || t('citation.untitledTitle'),
  });

  return (
    <span
      ref={wrapperRef}
      className={styles.wrapper}
      onMouseEnter={() => {
        clearCloseTimer();
        setDismissed(false);
        setPointerWithin(true);
      }}
      onMouseLeave={schedulePointerClose}
      onFocusCapture={() => {
        if (suppressNextFocusOpenRef.current) {
          suppressNextFocusOpenRef.current = false;
          return;
        }
        setDismissed(false);
        setFocusWithin(true);
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget as Node | null;
        if (wrapperRef.current?.contains(next)) return;
        setFocusWithin(false);
      }}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={triggerLabel}
        aria-expanded={isOpen}
        aria-controls={previewId}
        aria-haspopup="dialog"
        aria-pressed={pinned}
        data-testid="citation-trigger"
        onClick={togglePinned}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          togglePinned();
        }}
      >
        <span className={styles.dropVisual} aria-hidden="true">
          <span className={styles.highlight} />
          <span className={styles.refraction} />
        </span>
        <span className={styles.key}>{citation.key || t('citation.untitledKey')}</span>
      </button>

      {isOpen && (
        <div
          ref={previewRef}
          id={previewId}
          className={styles.preview}
          role="dialog"
          aria-label={t('citation.previewLabel', { key: citation.key || t('citation.untitledKey') })}
          data-placement={position.placement}
          data-testid="citation-preview"
          style={{
            left: position.left,
            top: position.top,
            maxHeight: position.maxHeight,
            visibility: position.measured ? 'visible' : 'hidden',
            '--citation-arrow-x': `${position.arrowX}px`,
          } as React.CSSProperties}
        >
          <span className={styles.previewPointer} aria-hidden="true" />
          {citation.authors && <div className={styles.authors}>{citation.authors}</div>}
          <div className={styles.title}>{citation.title || t('citation.untitledTitle')}</div>
          {citation.year && <div className={styles.year}>{citation.year}</div>}
          {citation.abstract && (
            <>
              <div className={styles.abstract} data-expanded={showFullAbstract ? 'true' : 'false'}>
                {citation.abstract}
              </div>
              {hasLongAbstract && (
                <button
                  type="button"
                  className={styles.abstractToggle}
                  aria-expanded={showFullAbstract}
                  onClick={() => setShowFullAbstract((current) => !current)}
                >
                  {t(showFullAbstract ? 'citation.showLess' : 'citation.showMore')}
                </button>
              )}
            </>
          )}

          <div className={styles.boundaryNote} data-testid="citation-boundary-note">
            {t('citation.displayOnly')}
          </div>

          {citation.doi && (
            <a
              className={styles.doiLink}
              href={`https://doi.org/${citation.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('citation.viewDoiLabel')}
            >
              {t('citation.viewDoi')}
            </a>
          )}
        </div>
      )}
    </span>
  );
}
