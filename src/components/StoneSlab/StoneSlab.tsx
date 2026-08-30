import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paragraph, Citation } from '../../types';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../contexts/UIContext';
import DewdropCitation from '../DewdropCitation/DewdropCitation';
import styles from './StoneSlab.module.css';

interface StoneSlabProps {
  paragraph: Paragraph;
  onUpdate: (content: string) => void;
  onDelete: (id: string) => void;
  onAddAnnotation: (paragraphId: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export default function StoneSlab({
  paragraph,
  onUpdate,
  onDelete,
  onAddAnnotation,
  isSelected,
  onSelect,
}: StoneSlabProps) {
  const { t } = useTranslation();
  const { confirm } = useUI();
  const shouldReduceMotion = useReducedMotion();
  const slabRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeMarks, setActiveMarks] = useState({ bold: false, italic: false });

  const syncActiveMarks = useCallback((currentEditor: { isActive: (name: string) => boolean }) => {
    setActiveMarks({
      bold: currentEditor.isActive('bold'),
      italic: currentEditor.isActive('italic'),
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: t('editor.beginWriting'),
      }),
    ],
    content: paragraph.content,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => syncActiveMarks(editor),
    onTransaction: ({ editor }) => syncActiveMarks(editor),
    onFocus: ({ editor }) => {
      setIsEditing(true);
      syncActiveMarks(editor);
    },
    onBlur: () => setIsEditing(false),
    editorProps: {
      attributes: {
        class: 'tiptap-content',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': t('editor.slabEditorLabel', { order: paragraph.order }),
      },
    },
  }, [paragraph.id, paragraph.order, syncActiveMarks, t]);

  // Sync external content changes
  useEffect(() => {
    if (editor && paragraph.content !== editor.getHTML()) {
      editor.commands.setContent(paragraph.content);
    }
  }, [paragraph.content, editor]);

  const handleDelete = useCallback(async () => {
    const excerpt = paragraph.content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 96);
    const accepted = await confirm({
      title: t('confirm.deleteSlabTitle', { order: paragraph.order }),
      message: t('confirm.deleteSlabMessage', {
        order: paragraph.order,
        excerpt: excerpt || t('editor.emptySlab'),
      }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    if (accepted) onDelete(paragraph.id);
  }, [confirm, onDelete, paragraph.content, paragraph.id, paragraph.order, t]);

  const handleAddAnnotation = useCallback(() => {
    onAddAnnotation(paragraph.id);
  }, [onAddAnnotation, paragraph.id]);

  const handleSlabPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    onSelect(paragraph.id);
    if (event.target === event.currentTarget) slabRef.current?.focus();
  }, [onSelect, paragraph.id]);

  const handleFocusCapture = useCallback(() => onSelect(paragraph.id), [onSelect, paragraph.id]);

  const toggleMark = useCallback((mark: 'bold' | 'italic') => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (mark === 'bold') chain.toggleBold().run();
    else chain.toggleItalic().run();
    syncActiveMarks(editor);
  }, [editor, syncActiveMarks]);

  return (
    <motion.article
      ref={slabRef}
      className={styles.slab}
      data-testid={`stone-slab-${paragraph.id}`}
      data-selected={isSelected ? 'true' : 'false'}
      data-editing={isEditing ? 'true' : 'false'}
      tabIndex={0}
      role="group"
      aria-current={isSelected ? 'true' : undefined}
      aria-label={t(isSelected ? 'editor.slabSelectedLabel' : 'editor.slabLabel', {
        order: paragraph.order,
      })}
      onPointerDown={handleSlabPointerDown}
      onFocusCapture={handleFocusCapture}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: [0.2, 0.7, 0.2, 1] }}
      layout={shouldReduceMotion ? false : 'position'}
    >
      <div className={styles.orderNumber} aria-hidden="true">{paragraph.order}</div>
      {isSelected && (
        <span className={styles.selectedBadge} aria-hidden="true">
          <span className={styles.selectedMark}>✓</span>
          {t('editor.selected')}
        </span>
      )}
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={handleDelete}
        title={t('editor.deleteSlab', { order: paragraph.order })}
        aria-label={t('editor.deleteSlab', { order: paragraph.order })}
      >
        ×
      </button>

      {/* Mini toolbar */}
      <div className={styles.toolbar}>
        <button type="button" className={styles.annotationBtn} onClick={handleAddAnnotation}>
          {t('editor.addAnnotation')}
        </button>
        {editor && (
          <>
            <button
              type="button"
              className={styles.formatBtn}
              onClick={() => toggleMark('bold')}
              aria-label={t('editor.bold')}
              aria-pressed={activeMarks.bold}
            >
              <strong aria-hidden="true">B</strong>
            </button>
            <button
              type="button"
              className={styles.formatBtn}
              onClick={() => toggleMark('italic')}
              aria-label={t('editor.italic')}
              aria-pressed={activeMarks.italic}
            >
              <em aria-hidden="true">I</em>
            </button>
          </>
        )}
      </div>

      {/* TipTap Editor */}
      <div className={styles.editor}>
        <EditorContent editor={editor} />
      </div>

      {/* Citations */}
      {paragraph.citations.length > 0 && (
        <div className={styles.citationsRow}>
          {paragraph.citations.map((citation: Citation) => (
            <DewdropCitation key={citation.id} citation={citation} />
          ))}
        </div>
      )}
    </motion.article>
  );
}
