import { describe, it, expect } from 'vitest';
import { 
  serializeDocumentToMarkdown,
  serializeDocumentToJson,
  parseMarkdownToDocument,
  validateImportedDocument,
  normalizeImportedDocument
} from './documentIO';
import { useDocumentStore } from '../stores/documentStore';

describe('documentIO', () => {
  describe('Markdown 序列化', () => {
    it('应该能够正确序列化文档为 Markdown', () => {
      const store = useDocumentStore.getState();
      store.loadSampleDocument();
      const document = store.document;
      
      const markdown = serializeDocumentToMarkdown(document);
      
      expect(markdown).toContain('# Large Language Models');
      expect(markdown).toContain('Academic Writing');
      expect(markdown).toContain('Opportunities and Challenges');
    });

    it('Markdown 应该包含标题和段落', () => {
      const store = useDocumentStore.getState();
      store.loadSampleDocument();
      const document = store.document;
      
      const markdown = serializeDocumentToMarkdown(document);
      
      expect(markdown.startsWith('# ')).toBe(true);
      expect(markdown).toContain('\n\n');
    });
  });

  describe('JSON 序列化', () => {
    it('应该能够正确序列化文档为 JSON', () => {
      const store = useDocumentStore.getState();
      store.loadSampleDocument();
      const document = store.document;
      
      const json = serializeDocumentToJson(document);
      
      expect(json).toContain('"title":');
      expect(json).toContain('"paragraphs":');
      expect(json).toContain('Large Language Models');
    });

    it('JSON 应该能被正确解析', () => {
      const store = useDocumentStore.getState();
      store.loadSampleDocument();
      const document = store.document;
      
      const json = serializeDocumentToJson(document);
      const parsed = JSON.parse(json);
      
      expect(parsed.title).toBe(document.title);
      expect(parsed.paragraphs.length).toBe(document.paragraphs.length);
    });
  });

  describe('Markdown 解析', () => {
    it('应该能够正确解析 Markdown 标题', () => {
      const testMarkdown = '# 测试标题\n\n这是第一个段落。\n\n这是第二个段落。';
      const document = parseMarkdownToDocument(testMarkdown);
      
      expect(document.title).toBe('测试标题');
    });

    it('应该能够正确解析 Markdown 段落', () => {
      const testMarkdown = '# 测试标题\n\n这是第一个段落。\n\n这是第二个段落。';
      const document = parseMarkdownToDocument(testMarkdown);
      
      expect(document.paragraphs.length).toBe(2);
      expect(document.paragraphs[0].content).toBe('这是第一个段落。');
      expect(document.paragraphs[1].content).toBe('这是第二个段落。');
    });

    it('没有标题的 Markdown 应该使用默认标题', () => {
      const testMarkdown = '这是第一个段落。\n\n这是第二个段落。';
      const document = parseMarkdownToDocument(testMarkdown);
      
      expect(document.title).toBe('Untitled Document');
    });
  });

  describe('导入验证', () => {
    it('应该验证有效的文档结构', () => {
      const validData = {
        title: 'Test Document',
        paragraphs: [
          { id: 'p1', content: 'Test content', order: 1, annotations: [], citations: [] }
        ]
      };
      
      const result = validateImportedDocument(validData);
      
      expect(result.valid).toBe(true);
    });

    it('应该拒绝无效的文档结构', () => {
      const invalidData = null;
      
      const result = validateImportedDocument(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid document structure');
    });

    it('应该拒绝没有标题的文档', () => {
      const dataWithoutTitle = {
        paragraphs: []
      };
      
      const result = validateImportedDocument(dataWithoutTitle);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Document title is required');
    });

    it('应该拒绝没有段落的文档', () => {
      const dataWithoutParagraphs = {
        title: 'Test Document'
      };
      
      const result = validateImportedDocument(dataWithoutParagraphs);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Document must have paragraphs');
    });
  });

  describe('导入规范化', () => {
    it('应该规范化文档结构', () => {
      const rawData = {
        title: 'Test Document',
        paragraphs: [
          { id: 'p1', content: 'Test content', order: 1, annotations: [], citations: [] }
        ]
      };
      
      const normalized = normalizeImportedDocument(rawData);
      
      expect(normalized.title).toBe('Test Document');
      expect(normalized.paragraphs.length).toBe(1);
      expect(normalized.createdAt).toBeDefined();
      expect(normalized.updatedAt).toBeDefined();
    });

    it('应该为缺失字段提供默认值', () => {
      const incompleteData = {
        title: 'Test Document',
        paragraphs: [
          { }
        ]
      };
      
      const normalized = normalizeImportedDocument(incompleteData);
      
      expect(normalized.paragraphs[0].content).toBe('');
      expect(normalized.paragraphs[0].order).toBe(1);
      expect(normalized.paragraphs[0].annotations).toEqual([]);
      expect(normalized.paragraphs[0].citations).toEqual([]);
    });

    it('应该生成文档 ID', () => {
      const dataWithoutId = {
        title: 'Test Document',
        paragraphs: []
      };
      
      const normalized = normalizeImportedDocument(dataWithoutId);
      
      expect(normalized.id).toBeDefined();
      expect(normalized.id).toContain('doc-imported');
    });
  });

  describe('Roundtrip 测试', () => {
    it('JSON 序列化后应该保持数据完整性', () => {
      const store = useDocumentStore.getState();
      store.loadSampleDocument();
      const originalDocument = store.document;
      
      const json = serializeDocumentToJson(originalDocument);
      const parsed = JSON.parse(json);
      const normalized = normalizeImportedDocument(parsed);
      
      expect(normalized.title).toBe(originalDocument.title);
      expect(normalized.paragraphs.length).toBe(originalDocument.paragraphs.length);
    });

    it('Markdown 解析基本 Roundtrip', () => {
      const testMarkdown = '# Roundtrip Test\n\nParagraph 1.\n\nParagraph 2.';
      
      const document = parseMarkdownToDocument(testMarkdown);
      const markdownAgain = serializeDocumentToMarkdown(document);
      
      expect(markdownAgain).toContain('# Roundtrip Test');
      expect(markdownAgain).toContain('Paragraph 1');
      expect(markdownAgain).toContain('Paragraph 2');
    });
  });
});
