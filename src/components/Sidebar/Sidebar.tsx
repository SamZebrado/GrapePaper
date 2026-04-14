import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDocumentStore } from '../../stores/documentStore';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onScrollToParagraph: (paragraphId: string) => void;
}

export default function Sidebar({ onScrollToParagraph }: SidebarProps) {
  const document = useDocumentStore((s) => s.document);
  const setTitle = useDocumentStore((s) => s.setTitle);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
    },
    [setTitle]
  );

  // Strip HTML tags for preview
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, '').trim();
  };

  return (
    <motion.aside
      className={styles.sidebar}
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* Brand */}
      <div className={styles.brand}>
        <span className={styles.brandIcon}>&#127815;</span>
        <div className={styles.brandName}>
          Grape<span>Paper</span>
        </div>
      </div>

      {/* Document Title */}
      <div className={styles.docTitleSection}>
        <div className={styles.docTitleLabel}>Document Title</div>
        <input
          className={styles.docTitleInput}
          value={document.title}
          onChange={handleTitleChange}
          placeholder="Untitled Document"
        />
      </div>

      {/* Paragraph List */}
      <div className={styles.paragraphList}>
        <div className={styles.paragraphListLabel}>Paragraphs</div>
        {document.paragraphs.map((para) => (
          <motion.div
            key={para.id}
            className={styles.paragraphItem}
            whileHover={{ x: 2 }}
            onClick={() => onScrollToParagraph(para.id)}
          >
            <span className={styles.paragraphNumber}>{para.order}</span>
            <div className={styles.paragraphPreview}>
              <div className={styles.paragraphPreviewText}>
                {stripHtml(para.content) || 'Empty paragraph...'}
              </div>
              <div className={styles.paragraphMeta}>
                {para.annotations.length > 0 && (
                  <span className={styles.metaBadge}>
                    {para.annotations.length} leaf{para.annotations.length > 1 ? 's' : ''}
                  </span>
                )}
                {para.citations.length > 0 && (
                  <span className={styles.metaBadge}>
                    {para.citations.length} ref{para.citations.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button className={styles.actionBtn}>Import</button>
        <button className={styles.actionBtnPrimary}>Export</button>
      </div>
    </motion.aside>
  );
}
