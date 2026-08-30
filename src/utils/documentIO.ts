import type { Document, Annotation, Citation, ChatThread, Message } from '../types';

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

export function serializeDocumentToMarkdown(document: Document): string {
  const paragraphs = document.paragraphs
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((p) => stripHtml(p.content))
    .join('\n\n');
  return `# ${document.title}\n\n${paragraphs}`;
}

export function serializeDocumentToJson(document: Document): string {
  return JSON.stringify(document, null, 2);
}

export function parseMarkdownToDocument(text: string, idPrefix?: string): Document {
  const lines = text.split('\n');
  let title = 'Untitled Document';
  const paragraphs: { content: string; order: number }[] = [];
  let currentContent = '';
  let order = 1;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.substring(2).trim();
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

  const docId = idPrefix ? `${idPrefix}-${Date.now()}` : `doc-imported-${Date.now()}`;
  
  return {
    id: docId,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paragraphs: paragraphs.map((p, index) => ({
      id: `para-import-${index}`,
      content: p.content,
      order: p.order,
      annotations: [],
      citations: [],
    })),
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  document?: Document;
}

function normalizeAnnotation(annotation: any, index: number): Annotation {
  const a = annotation || {};
  return {
    id: a.id || `anno-import-${index}`,
    paragraphId: typeof a.paragraphId === 'string' ? a.paragraphId : undefined,
    content: a.content || '',
    createdAt: typeof a.createdAt === 'number' ? a.createdAt : Date.now(),
    chatThreads: Array.isArray(a.chatThreads) ? a.chatThreads.map(normalizeChatThread) : [],
  };
}

function normalizeCitation(citation: any, index: number): Citation {
  const c = citation || {};
  return {
    id: c.id || `citation-import-${index}`,
    key: typeof c.key === 'string' ? c.key : undefined,
    sourceId: typeof c.sourceId === 'string' ? c.sourceId : undefined,
    quote: typeof c.quote === 'string' ? c.quote : undefined,
    authors: typeof c.authors === 'string' ? c.authors : undefined,
    title: typeof c.title === 'string' ? c.title : undefined,
    year: typeof c.year === 'string' ? c.year : undefined,
    abstract: typeof c.abstract === 'string' ? c.abstract : undefined,
    doi: typeof c.doi === 'string' ? c.doi : undefined,
    zoteroKey: typeof c.zoteroKey === 'string' ? c.zoteroKey : undefined,
    createdAt: typeof c.createdAt === 'number' ? c.createdAt : undefined,
  };
}

function normalizeChatThread(thread: any, index: number): ChatThread {
  const t = thread || {};
  return {
    id: t.id || `thread-import-${index}`,
    title: t.title || 'Untitled Thread',
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    messages: Array.isArray(t.messages) ? t.messages.map(normalizeMessage) : [],
  };
}

function normalizeMessage(message: any, index: number): Message {
  const m = message || {};
  return {
    id: m.id || `msg-import-${index}`,
    role: m.role || 'user',
    content: m.content || '',
    createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
  };
}

export function validateImportedDocument(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid document structure' };
  }

  if (typeof data.title !== 'string') {
    return { valid: false, error: 'Document title is required' };
  }

  if (!Array.isArray(data.paragraphs)) {
    return { valid: false, error: 'Document must have paragraphs' };
  }

  return { valid: true };
}

export function normalizeImportedDocument(data: any, idPrefix?: string): Document {
  const validatedParagraphs = (data.paragraphs || []).map((para: any, index: number) => {
    const p = para || {};
    return {
      id: p.id || `para-import-${index}`,
      content: p.content || '',
      order: typeof p.order === 'number' ? p.order : index + 1,
      annotations: Array.isArray(p.annotations) ? p.annotations.map(normalizeAnnotation) : [],
      citations: Array.isArray(p.citations) ? p.citations.map(normalizeCitation) : [],
    };
  });

  const docId = idPrefix ? `${idPrefix}-${Date.now()}` : data.id || `doc-imported-${Date.now()}`;

  return {
    id: docId,
    title: data.title || 'Untitled Document',
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
    paragraphs: validatedParagraphs,
  };
}

// 用于localStorage恢复时的统一校验
export function validateAndNormalizeDocument(data: any, idPrefix?: string): Document {
  const validation = validateImportedDocument(data);
  if (!validation.valid) {
    // 如果验证失败，返回一个空文档
    const docId = idPrefix ? `${idPrefix}-${Date.now()}` : `doc-recovered-${Date.now()}`;
    return {
      id: docId,
      title: 'Recovered Document',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      paragraphs: [],
    };
  }
  return normalizeImportedDocument(data, idPrefix);
}
