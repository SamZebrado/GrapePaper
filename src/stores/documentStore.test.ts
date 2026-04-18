import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore } from './documentStore';

describe('documentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDocumentStore.getState().loadSampleDocument();
  });

  describe('基本操作', () => {
    it('应该能够设置文档标题', () => {
      const store = useDocumentStore.getState();
      store.setTitle('新的标题');
      expect(useDocumentStore.getState().document.title).toBe('新的标题');
    });

    it('应该能够添加段落', () => {
      const store = useDocumentStore.getState();
      const initialLength = useDocumentStore.getState().document.paragraphs.length;
      store.addParagraph();
      expect(useDocumentStore.getState().document.paragraphs.length).toBe(initialLength + 1);
    });

    it('应该能够更新段落内容', () => {
      const store = useDocumentStore.getState();
      const firstPara = useDocumentStore.getState().document.paragraphs[0];
      store.updateParagraphContent(firstPara.id, '新的内容');
      const updatedPara = useDocumentStore.getState().document.paragraphs.find(p => p.id === firstPara.id);
      expect(updatedPara?.content).toBe('新的内容');
    });

    it('应该能够删除段落', () => {
      const store = useDocumentStore.getState();
      const firstPara = useDocumentStore.getState().document.paragraphs[0];
      const initialLength = useDocumentStore.getState().document.paragraphs.length;
      store.deleteParagraph(firstPara.id);
      expect(useDocumentStore.getState().document.paragraphs.length).toBe(initialLength - 1);
    });

    it('应该能够添加批注', () => {
      const store = useDocumentStore.getState();
      const firstPara = useDocumentStore.getState().document.paragraphs[0];
      const initialAnnotations = firstPara.annotations.length;
      store.addAnnotation(firstPara.id, '这是一个新批注');
      const updatedPara = useDocumentStore.getState().document.paragraphs.find(p => p.id === firstPara.id);
      expect(updatedPara?.annotations.length).toBe(initialAnnotations + 1);
    });
  });

  describe('聊天线程', () => {
    it('应该能够创建聊天线程', () => {
      const store = useDocumentStore.getState();
      const firstPara = useDocumentStore.getState().document.paragraphs[0];
      const firstAnnotation = firstPara.annotations[0];
      const threadId = store.createChatThread(firstAnnotation.id);
      const updatedPara = useDocumentStore.getState().document.paragraphs.find(p => p.id === firstPara.id);
      const updatedAnnotation = updatedPara?.annotations.find(a => a.id === firstAnnotation.id);
      expect(updatedAnnotation?.chatThreads.some(t => t.id === threadId)).toBe(true);
    });

    it('应该能够添加聊天消息', () => {
      const store = useDocumentStore.getState();
      const firstPara = useDocumentStore.getState().document.paragraphs[0];
      const firstAnnotation = firstPara.annotations[0];
      const firstThread = firstAnnotation.chatThreads[0];
      const initialMessages = firstThread.messages.length;
      store.addChatMessage(firstThread.id, 'user', '测试消息');
      const updatedPara = useDocumentStore.getState().document.paragraphs.find(p => p.id === firstPara.id);
      const updatedAnnotation = updatedPara?.annotations.find(a => a.id === firstAnnotation.id);
      const updatedThread = updatedAnnotation?.chatThreads.find(t => t.id === firstThread.id);
      expect(updatedThread?.messages.length).toBe(initialMessages + 1);
    });
  });

  describe('持久化测试', () => {
    it('应该能够加载示例文档', () => {
      const store = useDocumentStore.getState();
      store.loadSampleDocument();
      expect(useDocumentStore.getState().document.title).toContain('Large Language Models');
    });
  });

  describe('导入导出测试', () => {
    it('JSON export 应该能正确输出文档数据', () => {
      const store = useDocumentStore.getState();
      
      store.setTitle('测试标题');
      const updatedDocument = useDocumentStore.getState().document;
      expect(updatedDocument.title).toBe('测试标题');
      
      const jsonString = JSON.stringify(updatedDocument);
      expect(jsonString).toContain('测试标题');
    });

    it('应该能够解析 Markdown 标题', () => {
      const testMarkdown = '# 测试标题\n\n这是第一个段落。\n\n这是第二个段落。';
      const lines = testMarkdown.split('\n');
      
      let title = 'Untitled Document';
      for (const line of lines) {
        if (line.startsWith('# ')) {
          title = line.substring(2).trim();
        }
      }
      
      expect(title).toBe('测试标题');
    });

    it('应该能够解析 Markdown 段落', () => {
      const testMarkdown = '# 测试标题\n\n这是第一个段落。\n\n这是第二个段落。';
      const lines = testMarkdown.split('\n');
      
      const paragraphs: { content: string; order: number }[] = [];
      let currentContent = '';
      let order = 1;
      
      for (const line of lines) {
        if (line.startsWith('# ')) {
          continue;
        } else if (line.trim() === '') {
          if (currentContent.trim()) {
            paragraphs.push({ content: currentContent.trim(), order });
            order++;
            currentContent = '';
          }
        } else {
          currentContent += line + '\n';
        }
      }
      
      if (currentContent.trim()) {
        paragraphs.push({ content: currentContent.trim(), order });
      }
      
      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0].content).toBe('这是第一个段落。');
      expect(paragraphs[1].content).toBe('这是第二个段落。');
    });
  });
});
