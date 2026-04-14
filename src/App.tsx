import { useCallback, useMemo } from 'react';
import { useDocumentStore } from './stores/documentStore';
import Sidebar from './components/Sidebar/Sidebar';
import EditorCanvas from './components/EditorCanvas/EditorCanvas';
import ChatPanel from './components/ChatPanel/ChatPanel';
import type { ChatThread } from './types';

function App() {
  const document = useDocumentStore((s) => s.document);
  const activeAnnotationId = useDocumentStore((s) => s.activeAnnotationId);
  const activeChatThreadId = useDocumentStore((s) => s.activeChatThreadId);
  const setActiveAnnotation = useDocumentStore((s) => s.setActiveAnnotation);
  const setActiveChatThread = useDocumentStore((s) => s.setActiveChatThread);
  const addChatMessage = useDocumentStore((s) => s.addChatMessage);
  const createChatThread = useDocumentStore((s) => s.createChatThread);

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
            setActiveAnnotation(annotationId);
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
          'This is a simulated AI response. In a production environment, this would connect to an LLM API to provide intelligent feedback on your annotation.'
        );
      }, 800);
    },
    [activeChatThreadId, addChatMessage]
  );

  const handleScrollToParagraph = useCallback((paragraphId: string) => {
    const el = globalThis.document.getElementById(`paragraph-${paragraphId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <>
      <Sidebar onScrollToParagraph={handleScrollToParagraph} />
      <EditorCanvas onOpenAnnotation={handleOpenAnnotation} />
      <ChatPanel
        thread={activeThread}
        onClose={handleCloseChat}
        onSendMessage={handleSendMessage}
      />
    </>
  );
}

export default App;
