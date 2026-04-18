export interface Paragraph {
  id: string;
  content: string;
  order: number;
  annotations: Annotation[];
  citations: Citation[];
}

export interface Annotation {
  id: string;
  paragraphId?: string;
  content: string;
  createdAt: number;
  chatThreads: ChatThread[];
}

export interface ChatThread {
  id: string;
  title?: string;
  createdAt?: number;
  messages: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

// 保持向后兼容
export type ChatMessage = Message;

export interface Citation {
  id: string;
  key?: string;
  sourceId?: string;
  quote?: string;
  authors?: string;
  title?: string;
  year?: string;
  abstract?: string;
  doi?: string;
  zoteroKey?: string;
  createdAt?: number;
}

export interface Document {
  id: string;
  title: string;
  paragraphs: Paragraph[];
  createdAt: number;
  updatedAt: number;
}
