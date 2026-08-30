import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { ChatThread } from '../../types';
import { useTranslation } from 'react-i18next';
import ChatBubble from '../ChatBubble/ChatBubble';
import styles from './ChatPanel.module.css';

interface ChatPanelProps {
  thread: ChatThread | null;
  onClose: () => void;
  onSendMessage: (content: string) => void;
  returnFocusTo?: HTMLElement | null;
}

export default function ChatPanel({ thread, onClose, onSendMessage, returnFocusTo }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [isNarrow, setIsNarrow] = useState(
    () => globalThis.matchMedia?.('(max-width: 900px)').matches ?? false,
  );

  useEffect(() => {
    const media = globalThis.matchMedia?.('(max-width: 900px)');
    if (!media) return;
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
    }
  }, [thread?.messages.length, shouldReduceMotion]);

  useEffect(() => {
    if (!thread) return;
    returnFocusRef.current = returnFocusTo ?? globalThis.document.activeElement as HTMLElement | null;
    globalThis.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      const trigger = returnFocusRef.current;
      globalThis.requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
  }, [returnFocusTo, thread?.id]);

  useEffect(() => {
    const workspace = globalThis.document.getElementById('gp-workspace');
    if (!thread || !isNarrow || !workspace) return;
    workspace.setAttribute('inert', '');
    workspace.setAttribute('aria-hidden', 'true');
    return () => {
      workspace.removeAttribute('inert');
      workspace.removeAttribute('aria-hidden');
    };
  }, [isNarrow, thread]);

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

  const handlePanelKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (!isNarrow || event.key !== 'Tab') return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && globalThis.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && globalThis.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, [isNarrow, onClose]);

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
            role={isNarrow ? 'dialog' : 'complementary'}
            aria-modal={isNarrow ? 'true' : undefined}
            aria-labelledby="gp-chat-title"
            aria-describedby="gp-chat-boundary"
            onKeyDown={handlePanelKeyDown}
            initial={{ x: shouldReduceMotion ? 0 : '100%', opacity: shouldReduceMotion ? 1 : 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: shouldReduceMotion ? 0 : '100%', opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <div id="gp-chat-title" className={styles.headerTitle}>
                <span className={styles.headerIcon}>{t('chat.aiLabel')}</span>
                <span>{t('chat.title')}</span>
                <span className={styles.mockBadge} data-testid="chat-mock-badge">{t('common.mock')}</span>
              </div>
              <button
                data-testid="chat-close-btn"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label={t('chat.close')}
              >
                ×
              </button>
            </div>

            <div id="gp-chat-boundary" className={styles.boundaryNote}>
              {t('chat.boundary')}
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
                title={t('chat.send')}
                aria-label={t('chat.send')}
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
