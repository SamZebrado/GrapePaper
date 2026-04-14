import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Citation } from '../../types';
import styles from './DewdropCitation.module.css';

interface DewdropCitationProps {
  citation: Citation;
}

export default function DewdropCitation({ citation }: DewdropCitationProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={styles.dewdrop}>
        <span className={styles.shimmer} />
        {citation.key}
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            className={styles.bubble}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.bubbleAuthors}>{citation.authors}</div>
            <div className={styles.bubbleTitle}>{citation.title}</div>
            <div className={styles.bubbleYear}>{citation.year}</div>
            <div className={styles.bubbleAbstract}>{citation.abstract}</div>

            {citation.doi && (
              <a
                className={`${styles.bubbleLink} ${styles.doiLink}`}
                href={`https://doi.org/${citation.doi}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View DOI
              </a>
            )}

            {citation.zoteroKey && (
              <a
                className={styles.bubbleLink}
                href={`zotero://select/items/${citation.zoteroKey}`}
              >
                Open in Zotero
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
