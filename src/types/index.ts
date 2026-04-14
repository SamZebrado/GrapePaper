export interface Paragraph {
  id: string;
  content: string;
  order: number;
  annotations: Annotation[];
  citations: Citation[];
}

export interface Annotation {
  id: string;
  paragraphId: string;
  content: string;
  createdAt: number;
  chatThreads: ChatThread[];
}

export interface ChatThread {
  id: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface Citation {
  id: string;
  key: string;
  authors: string;
  title: string;
  year: string;
  abstract: string;
  doi?: string;
  zoteroKey?: string;
}

export interface Document {
  id: string;
  title: string;
  paragraphs: Paragraph[];
  createdAt: number;
  updatedAt: number;
}
