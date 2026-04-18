import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect } from 'react';
import type { Paragraph, Citation } from '../../types';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import DewdropCitation from '../DewdropCitation/DewdropCitation';
import styles from './StoneSlab.module.css';

interface StoneSlabProps {
  paragraph: Paragraph;
  onUpdate: (content: string) => void;
  onDelete: (id: string) => void;
  onAddAnnotation: (paragraphId: string) => void;
}

export default function StoneSlab({
  paragraph,
  onUpdate,
  onDelete,
  onAddAnnotation,
}: StoneSlabProps) {
  const { t } = useTranslation();

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
    editorProps: {
      attributes: {
        class: 'tiptap-content',
      },
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && paragraph.content !== editor.getHTML()) {
      editor.commands.setContent(paragraph.content);
    }
  }, [paragraph.content, editor]);

  const handleDelete = useCallback(() => {
    onDelete(paragraph.id);
  }, [onDelete, paragraph.id]);

  const handleAddAnnotation = useCallback(() => {
    onAddAnnotation(paragraph.id);
  }, [onAddAnnotation, paragraph.id]);

  return (
    <motion.div
      className={styles.slab}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      <div className={styles.orderNumber}>{paragraph.order}</div>
      <button className={styles.deleteBtn} onClick={handleDelete} title="Delete paragraph">
        x
      </button>

      {/* Mini toolbar */}
      <div className={styles.toolbar}>
        <button className={styles.toolbarBtn} onClick={handleAddAnnotation}>
          {t('editor.addAnnotation')}
        </button>
        {editor && (
          <>
            <button
              className={styles.toolbarBtn}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              B
            </button>
            <button
              className={styles.toolbarBtn}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              I
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
    </motion.div>
  );
}
