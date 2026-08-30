import { useCallback, useMemo, useRef } from 'react';
import { useDocumentStore } from './stores/documentStore';
import Sidebar from './components/Sidebar/Sidebar';
import EditorCanvas from './components/EditorCanvas/EditorCanvas';
import ChatPanel from './components/ChatPanel/ChatPanel';
import type { ChatThread } from './types';
import { openContextSurface } from './utils/contextSurface';
import './App.css';
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  const document = useDocumentStore((s) => s.document);
  const activeAnnotationId = useDocumentStore((s) => s.activeAnnotationId);
  const activeChatThreadId = useDocumentStore((s) => s.activeChatThreadId);
  const setActiveAnnotation = useDocumentStore((s) => s.setActiveAnnotation);
  const setActiveChatThread = useDocumentStore((s) => s.setActiveChatThread);
  const addChatMessage = useDocumentStore((s) => s.addChatMessage);
  const createChatThread = useDocumentStore((s) => s.createChatThread);
  const chatTriggerRef = useRef<HTMLElement | null>(null);

  // Find the active annotation and its thread
  const activeThread: ChatThread | null = useMemo(() => {
    if (!activeAnnotationId || !activeChatThreadId) return null;
    for (const para of document.paragraphs) {
      for (const annot of para.annotations) {
        if (annot.id === activeAnnotationId) {
          const thread = annot.chatThreads.find((t) => t.id === activeChatThreadId);
          if (thread) return thread;
        }
      }
    }
    return null;
  }, [document.paragraphs, activeAnnotationId, activeChatThreadId]);

  const handleOpenAnnotation = useCallback(
    (annotationId: string) => {
      // Find the annotation and get or create its first thread
      for (const para of document.paragraphs) {
        for (const annot of para.annotations) {
          if (annot.id === annotationId) {
            chatTriggerRef.current = globalThis.document.activeElement as HTMLElement | null;
            setActiveAnnotation(annotationId);
            openContextSurface({ type: 'chat', ownerId: annotationId });
            let threadId = activeChatThreadId;
            if (annot.chatThreads.length === 0) {
              threadId = createChatThread(annotationId);
            } else {
              threadId = annot.chatThreads[0].id;
            }
            setActiveChatThread(threadId);
            return;
          }
        }
      }
    },
    [document.paragraphs, activeChatThreadId, setActiveAnnotation, setActiveChatThread, createChatThread]
  );

  const handleCloseChat = useCallback(() => {
    setActiveAnnotation(null);
    setActiveChatThread(null);
  }, [setActiveAnnotation, setActiveChatThread]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeChatThreadId) return;
      // Add user message
      addChatMessage(activeChatThreadId, 'user', content);
      // Simulate AI response after a short delay
      setTimeout(() => {
        addChatMessage(
          activeChatThreadId,
          'assistant',
          t('chat.simulatedResponse')
        );
      }, 800);
    },
    [activeChatThreadId, addChatMessage, t]
  );

  const handleScrollToParagraph = useCallback((paragraphId: string) => {
    const el = globalThis.document.getElementById(`paragraph-${paragraphId}`);
    if (el) {
      const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div className="appShell" data-chat-open={activeThread ? 'true' : 'false'}>
      <div id="gp-workspace" className="workspace">
        <Sidebar onScrollToParagraph={handleScrollToParagraph} />
        <EditorCanvas onOpenAnnotation={handleOpenAnnotation} isChatOpen={Boolean(activeThread)} />
      </div>
      <ChatPanel
        thread={activeThread}
        onClose={handleCloseChat}
        onSendMessage={handleSendMessage}
        returnFocusTo={chatTriggerRef.current}
      />
    </div>
  );
}

export default App;
