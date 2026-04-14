import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Annotation } from '../../types';
import styles from './GrapeLeaf.module.css';

interface GrapeLeafProps {
  annotation: Annotation;
  onOpenChat: () => void;
}

export default function GrapeLeaf({ annotation, onOpenChat }: GrapeLeafProps) {
  const [expanded, setExpanded] = useState(false);
  const totalMessages = annotation.chatThreads.reduce(
    (sum, t) => sum + t.messages.length,
    0
  );

  const handleClick = () => {
    if (expanded) {
      onOpenChat();
    } else {
      setExpanded(true);
    }
  };

  return (
    <motion.div
      className={styles.leafWrapper}
      initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: Math.random() * 0.3,
      }}
    >
      {/* Tendril connector */}
      <div className={styles.tendril} />

      {/* Chat badge */}
      {totalMessages > 0 && (
        <motion.div
          className={styles.chatBadge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.5 }}
        >
          {totalMessages}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            className={styles.leafExpanded}
            onClick={handleClick}
            initial={{ opacity: 0, y: -5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className={styles.leafContent}>{annotation.content}</div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            className={styles.leaf}
            onClick={handleClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={styles.leafContent}>{annotation.content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
