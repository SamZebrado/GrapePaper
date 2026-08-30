import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '../../types';
import styles from './ChatBubble.module.css';

interface ChatBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
}

export default function ChatBubble({ message, isLatest }: ChatBubbleProps) {
  const shouldReduceMotion = useReducedMotion();
  const { t } = useTranslation();

  return (
    <motion.div
      className={styles.messageRow}
      style={{
        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
        transformOrigin: message.role === 'user' ? 'bottom right' : 'bottom left',
      }}
      initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
      data-latest={isLatest ? 'true' : 'false'}
    >
      <div
        className={`${styles.bubble} ${
          message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant
        }`}
      >
        <span
          data-testid="chat-role-label"
          className={`${styles.roleLabel} ${
            message.role === 'user' ? styles.roleLabelUser : styles.roleLabelAssistant
          }`}
        >
          {message.role === 'user' ? t('chat.you') : t('chat.assistant')}
        </span>
        {message.content}
      </div>
      <span className={styles.timestamp} data-testid="chat-timestamp">
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </motion.div>
  );
}
