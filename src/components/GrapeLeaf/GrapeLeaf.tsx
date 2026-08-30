import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useDocumentStore } from '../../stores/documentStore';
import { useUI } from '../../contexts/UIContext';
import { useTranslation } from 'react-i18next';
import type { Annotation } from '../../types';
import styles from './GrapeLeaf.module.css';
import { listenForContextSurface, openContextSurface } from '../../utils/contextSurface';

interface GrapeLeafProps {
  annotation: Annotation;
  onOpenChat: () => void;
}

const LEAF_PATH = 'M110 8 C101 17 93 20 83 13 C82 27 74 34 60 31 C65 43 58 51 43 54 C56 61 61 69 59 78 C75 72 90 73 102 80 L110 91 L118 80 C130 73 145 72 161 78 C159 69 164 61 177 54 C162 51 155 43 160 31 C146 34 138 27 137 13 C127 20 119 17 110 8 Z';

function LeafArtwork({ compact = false }: { compact?: boolean }) {
  const gradientId = useId().replace(/:/g, '');
  return (
    <svg
      className={compact ? styles.leafIcon : styles.leafArtwork}
      viewBox="0 0 220 104"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#486344" />
          <stop offset="1" stopColor="#3f5a3c" />
        </linearGradient>
      </defs>
      <path className={styles.leafSurface} d={LEAF_PATH} fill={`url(#${gradientId})`} />
      <path className={styles.primaryVein} d="M110 87 C110 69 110 47 110 18" />
      <path className={styles.secondaryVein} d="M110 52 C91 45 72 39 53 32 M110 58 C86 58 65 60 46 70 M110 52 C129 45 148 39 167 32 M110 58 C134 58 155 60 174 70" />
      {!compact && <path className={styles.petiole} d="M110 86 C111 94 116 98 123 101" />}
    </svg>
  );
}

export default function GrapeLeaf({ annotation, onOpenChat }: GrapeLeafProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content);
  const panelId = useId();
  const compactTriggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreCompactFocusRef = useRef(false);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const editAnnotation = useDocumentStore((state) => state.editAnnotation);
  const deleteAnnotation = useDocumentStore((state) => state.deleteAnnotation);
  const activeAnnotationId = useDocumentStore((state) => state.activeAnnotationId);
  const { toast, confirm } = useUI();
  const { t } = useTranslation();

  const totalMessages = annotation.chatThreads.reduce(
    (sum, thread) => sum + thread.messages.length,
    0
  );
  const chatOpen = activeAnnotationId === annotation.id;
  const preview = annotation.content.replace(/\s+/g, ' ').trim();

  useEffect(() => {
    if (!isEditing) setEditContent(annotation.content);
  }, [annotation.content, isEditing]);

  useEffect(() => listenForContextSurface((detail) => {
    const competingAnnotation = detail.type === 'annotation' && detail.ownerId !== annotation.id;
    const pageSurface = detail.type === 'citation' || detail.type === 'annotation-input';
    if (!competingAnnotation && !pageSurface) return;
    setExpanded(false);
    setIsEditing(false);
  }), [annotation.id]);

  const restoreEditFocus = () => {
    globalThis.requestAnimationFrame(() => editTriggerRef.current?.focus());
  };

  const handleSave = () => {
    const nextContent = editContent.trim();
    if (!nextContent) return;
    editAnnotation(annotation.id, nextContent);
    setIsEditing(false);
    toast(t('toast.annotationSaved'), 'success');
    restoreEditFocus();
  };

  const handleCancel = () => {
    setEditContent(annotation.content);
    setIsEditing(false);
    restoreEditFocus();
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  const handleCollapse = () => {
    setIsEditing(false);
    restoreCompactFocusRef.current = true;
    setExpanded(false);
  };

  const handleDelete = async () => {
    const accepted = await confirm({
      title: t('confirm.deleteAnnotationTitle'),
      message: t('confirm.deleteAnnotationMessage', { excerpt: preview.slice(0, 96) }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    if (!accepted) return;
    deleteAnnotation(annotation.id);
    toast(t('toast.annotationDeleted'), 'success');
  };

  const stateMotion = shouldReduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: -6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.18, ease: [0.2, 0.7, 0.2, 1] as const },
      };

  return (
    <motion.div
      className={styles.leafWrapper}
      data-testid={`grape-leaf-${annotation.id}`}
      data-state={isEditing ? 'editing' : expanded ? 'expanded' : 'collapsed'}
      data-chat-open={chatOpen ? 'true' : 'false'}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <span className={styles.tendril} aria-hidden="true" />
      <AnimatePresence mode="wait" initial={false}>
        {!expanded ? (
          <motion.button
            key="collapsed"
            ref={(node) => {
              compactTriggerRef.current = node;
              if (node && restoreCompactFocusRef.current) {
                restoreCompactFocusRef.current = false;
                node.focus();
              }
            }}
            type="button"
            className={styles.leafTrigger}
            aria-expanded="false"
            aria-controls={panelId}
            aria-label={t('annotation.expandLabel', { preview, count: totalMessages })}
            onClick={() => {
              openContextSurface({ type: 'annotation', ownerId: annotation.id });
              setExpanded(true);
            }}
            {...stateMotion}
          >
            <LeafArtwork />
            <span className={styles.collapsedSafeArea}>
              <span className={styles.collapsedText}>{annotation.content}</span>
              <span className={styles.messageCount}>
                {t('annotation.messageCount', { count: totalMessages })}
              </span>
            </span>
            {totalMessages > 0 && <span className={styles.chatBadge}>{totalMessages}</span>}
          </motion.button>
        ) : (
          <motion.section
            key="expanded"
            id={panelId}
            className={styles.expandedPanel}
            aria-label={t('annotation.expandedLabel')}
            aria-current={chatOpen ? 'true' : undefined}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isEditing) handleCollapse();
            }}
            {...stateMotion}
          >
            <header className={styles.expandedHeader}>
              <LeafArtwork compact />
              <span className={styles.expandedTitle}>{t('annotation.title')}</span>
              {chatOpen && (
                <span className={styles.chatOpenLabel}>
                  <span aria-hidden="true">●</span> {t('annotation.discussionOpen')}
                </span>
              )}
              <button
                type="button"
                className={styles.collapseButton}
                onClick={handleCollapse}
                aria-label={t('annotation.collapse')}
              >
                −
              </button>
            </header>

            {isEditing ? (
              <div className={styles.editorRegion}>
                <label className={styles.editorLabel} htmlFor={`${panelId}-editor`}>
                  {t('annotation.editLabel')}
                </label>
                <textarea
                  id={`${panelId}-editor`}
                  data-testid="annotation-edit-textarea"
                  className={styles.editTextarea}
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  autoFocus
                  rows={4}
                  placeholder={t('annotation.editPlaceholder')}
                />
                <div className={styles.editActions}>
                  <button
                    type="button"
                    data-testid="annotation-save-btn"
                    className={styles.primaryButton}
                    onClick={handleSave}
                    disabled={!editContent.trim()}
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    data-testid="annotation-cancel-edit-btn"
                    className={styles.secondaryButton}
                    onClick={handleCancel}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div data-testid="annotation-leaf-content" className={styles.expandedContent}>
                  {annotation.content}
                </div>
                <div className={styles.leafActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={onOpenChat}
                    aria-expanded={chatOpen}
                  >
                    {chatOpen ? t('annotation.discussionOpen') : t('annotation.openDiscussion')}
                  </button>
                  <button
                    ref={editTriggerRef}
                    type="button"
                    data-testid="annotation-edit-btn"
                    className={styles.secondaryButton}
                    onClick={() => setIsEditing(true)}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    data-testid="annotation-delete-btn"
                    className={styles.deleteButton}
                    onClick={handleDelete}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
