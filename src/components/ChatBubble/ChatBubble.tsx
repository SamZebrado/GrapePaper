import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types';
import styles from './ChatBubble.module.css';

interface ChatBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
}

const AGE_THRESHOLD_SHRINK = 30 * 60 * 1000; // 30 minutes: start shrinking
const AGE_THRESHOLD_DOT = 2 * 60 * 60 * 1000; // 2 hours: become a dot

export default function ChatBubble({ message, isLatest }: ChatBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const age = Date.now() - message.createdAt;

  const displayMode = useMemo(() => {
    if (expanded || isLatest) return 'full';
    if (age > AGE_THRESHOLD_DOT) return 'dot';
    if (age > AGE_THRESHOLD_SHRINK) return 'shrinking';
    return 'full';
  }, [age, expanded, isLatest]);

  const shrinkScale = useMemo(() => {
    if (displayMode === 'shrinking') {
      const progress = Math.min(
        1,
        (age - AGE_THRESHOLD_SHRINK) / (AGE_THRESHOLD_DOT - AGE_THRESHOLD_SHRINK)
      );
      return 1 - progress * 0.4; // shrink to 60%
    }
    return 1;
  }, [displayMode, age]);

  if (displayMode === 'dot') {
    return (
      <motion.div
        className={`${styles.dot} ${message.role === 'user' ? styles.dotUser : styles.dotAssistant}`}
        onClick={() => setExpanded(true)}
        whileHover={{ scale: 1.8 }}
        title={message.content.slice(0, 100)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      />
    );
  }

  return (
    <motion.div
      className={styles.messageRow}
      style={{
        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
        transform: `scale(${shrinkScale})`,
        transformOrigin:
          message.role === 'user' ? 'bottom right' : 'bottom left',
        opacity: shrinkScale < 0.8 ? 0.7 : 1,
        cursor: displayMode === 'shrinking' ? 'pointer' : 'default',
      }}
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: shrinkScale }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      onClick={() => {
        if (displayMode === 'shrinking') setExpanded(true);
      }}
    >
      <div
        className={`${styles.bubble} ${
          message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant
        }`}
      >
        <span
          className={`${styles.roleLabel} ${
            message.role === 'user' ? styles.roleLabelUser : styles.roleLabelAssistant
          }`}
        >
          {message.role === 'user' ? 'You' : 'AI'}
        </span>
        {message.content}
      </div>
      {displayMode === 'full' && (
        <span className={styles.timestamp}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}
    </motion.div>
  );
}
