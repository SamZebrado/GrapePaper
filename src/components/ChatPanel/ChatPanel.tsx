import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatThread } from '../../types';
import { useTranslation } from 'react-i18next';
import ChatBubble from '../ChatBubble/ChatBubble';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  thread: ChatThread | null;
  onClose: () => void;
  onSendMessage: (content: string) => void;
}

export default function ChatPanel({ thread, onClose, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread?.messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {thread && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            data-testid="chat-panel"
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerTitle}>
                <span className={styles.headerIcon}>AI Chat</span>
                <span>{t('chat.title')}</span>
                <span className={styles.mockBadge} title="AI responses are simulated placeholders">{t('common.mock')}</span>
              </div>
              <button data-testid="chat-close-btn" className={styles.closeBtn} onClick={onClose}>
                x
              </button>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
              {thread.messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>Q</span>
                  <span>{t('chat.empty')}</span>
                </div>
              ) : (
                thread.messages.map((msg, idx) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isLatest={idx === thread.messages.length - 1}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={styles.inputArea}>
              <textarea
                data-testid="chat-input"
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.inputPlaceholder')}
                rows={1}
              />
              <button
                data-testid="chat-send-btn"
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim()}
                title="Send message"
              >
                &#8593;
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
