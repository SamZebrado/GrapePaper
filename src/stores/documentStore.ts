import { create } from 'zustand';
import type { Document, Paragraph, Annotation, ChatMessage, Citation } from '../types';
import { validateAndNormalizeDocument } from '../utils/documentIO';

let _idCounter = 100;
function uid(): string {
  return `id_${Date.now()}_${++_idCounter}`;
}

const STORAGE_KEY = 'grapepaper_document';
const STORAGE_VERSION = 1;

interface StoredData {
  version: number;
  document: Document;
}

interface DocumentStore {
  document: Document;
  activeAnnotationId: string | null;
  activeChatThreadId: string | null;

  setDocument: (doc: Document) => void;
  setTitle: (title: string) => void;

  addParagraph: (afterOrder?: number) => void;
  updateParagraphContent: (paragraphId: string, content: string) => void;
  deleteParagraph: (paragraphId: string) => void;

  addAnnotation: (paragraphId: string, content: string) => void;
  editAnnotation: (annotationId: string, content: string) => void;
  deleteAnnotation: (annotationId: string) => void;
  setActiveAnnotation: (annotationId: string | null) => void;
  setActiveChatThread: (threadId: string | null) => void;

  addChatMessage: (threadId: string, role: 'user' | 'assistant', content: string) => void;
  createChatThread: (annotationId: string) => string;

  addCitation: (paragraphId: string, citation: Omit<Citation, 'id'>) => void;

  loadSampleDocument: () => void;
  clearLocalDraft: () => void;
  loadFromStorage: () => void;
}

const sampleCitations: Citation[] = [
  {
    id: 'cite-1',
    key: '[1]',
    authors: 'Zhao, W. X., Zhou, K., Li, J., Tang, T., Wang, X., Hou, Y., ... & Wen, J. R.',
    title: 'A Survey of Large Language Models',
    year: '2023',
    abstract: 'Large language models (LLMs) have emerged as a transformative force in the field of natural language processing. This survey provides a comprehensive overview of the evolution, capabilities, and applications of LLMs, covering their architecture, training methodologies, and evaluation frameworks. We discuss the technical foundations including transformer architectures, scaling laws, and alignment techniques such as RLHF.',
    doi: '10.48550/arXiv.2303.18223',
  },
  {
    id: 'cite-2',
    key: '[2]',
    authors: 'Chang, Y., Wang, X., Wang, J., & Wang, Y.',
    title: 'A Survey on Evaluation of Large Language Models',
    year: '2024',
    abstract: 'The rapid development of large language models has created an urgent need for comprehensive evaluation methodologies. This survey systematically reviews existing evaluation approaches for LLMs, covering both automatic metrics and human evaluation paradigms. We analyze the strengths and limitations of current benchmarks and propose directions for more robust and multi-dimensional assessment frameworks.',
    doi: '10.1145/3649462',
  },
  {
    id: 'cite-3',
    key: '[3]',
    authors: 'OpenAI',
    title: 'GPT-4 Technical Report',
    year: '2023',
    abstract: 'We report on the development of GPT-4, a large-scale multimodal model capable of processing both text and image inputs. GPT-4 demonstrates human-level performance on numerous professional and academic benchmarks. We discuss the model capabilities, limitations, safety considerations, and the results of extensive evaluation across diverse domains.',
    doi: '10.48550/arXiv.2303.08774',
  },
  {
    id: 'cite-4',
    key: '[4]',
    authors: 'Eloundou, T., Manning, S., Mishkin, P., Rock, D., Amodei, D., ... & Steinhardt, J.',
    title: 'GPTs are GPTs: An Early Look at the Labor Market Impact Potential of Large Language Models',
    year: '2023',
    abstract: 'This paper investigates the potential labor market impact of large language models and generative AI technologies. Using a novel methodology combining human expertise ratings with AI capabilities assessment, we find that approximately 80% of the U.S. workforce could have at least 10% of their work tasks affected by the introduction of LLMs, while about 19% of workers may see at least 50% of their tasks impacted.',
    doi: '10.48550/arXiv.2303.10130',
  },
];

const DEMO_TIMESTAMP = Date.UTC(2026, 7, 30, 8, 0, 0);

export const sampleDocument: Document = {
  id: 'grapepaper-demo-v2',
  title: 'Cultivating Trustworthy AI-Assisted Scholarship',
  createdAt: DEMO_TIMESTAMP - 86400000,
  updatedAt: DEMO_TIMESTAMP,
  paragraphs: [
    {
      id: 'demo-para-1',
      content:
        'Academic writing is beginning to treat large language models as instruments rather than authors. Used carefully, these systems can help researchers compare structures, test explanations, and notice gaps in an argument. Yet fluent prose is not evidence: Zhao et al. [1] show that capability grows alongside new verification demands, while the GPT-4 report [3] makes model limitations part of the scholarly record. A trustworthy workflow therefore keeps source judgment and final claims with the researcher.',
      order: 1,
      annotations: [
        {
          id: 'demo-annot-1',
          paragraphId: 'demo-para-1',
          content: 'Clarify the distinction between writing assistance and scholarly authorship; the opening should remain precise rather than promotional.',
          createdAt: DEMO_TIMESTAMP - 3600000,
          chatThreads: [
            {
              id: 'demo-thread-1',
              title: 'Authorship boundary',
              createdAt: DEMO_TIMESTAMP - 3500000,
              messages: [
                {
                  id: 'demo-msg-1',
                  role: 'user',
                  content: 'What claim should the opening make about authorship?',
                  createdAt: DEMO_TIMESTAMP - 3400000,
                },
                {
                  id: 'demo-msg-2',
                  role: 'assistant',
                  content: 'Mock suggestion: frame the model as an instrument whose output still requires human source checking, interpretation, and accountability.',
                  createdAt: DEMO_TIMESTAMP - 3300000,
                },
              ],
            },
          ],
        },
      ],
      citations: [sampleCitations[0], sampleCitations[2]],
    },
    {
      id: 'demo-para-2',
      content:
        'Evaluation must follow the same principle. A useful review combines factual checks, source tracing, bias inspection, and human assessment instead of relying on one score. Chang et al. [2] describe why multi-dimensional evaluation is necessary when a system can be persuasive and still be wrong. In practice, this means recording what the tool contributed, checking every citation against its source, and preserving an auditable path from evidence to conclusion.',
      order: 2,
      annotations: [
        {
          id: 'demo-annot-2',
          paragraphId: 'demo-para-2',
          content: 'Tighten this sentence so the four checks read as one reproducible method.',
          createdAt: DEMO_TIMESTAMP - 2400000,
          chatThreads: [],
        },
      ],
      citations: [sampleCitations[1]],
    },
    {
      id: 'demo-para-3',
      content:
        'The goal is not frictionless automation, but a calmer and more legible research process. Transparent boundaries let writers benefit from assistance without obscuring responsibility. When provenance, uncertainty, and revision remain visible, AI-supported writing can strengthen scholarly care rather than replace it.',
      order: 3,
      annotations: [],
      citations: [],
    },
  ],
};

function saveToStorage(document: Document) {
  try {
    const storedData: StoredData = {
      version: STORAGE_VERSION,
      document,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedData));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function loadFromStorage(): Document | null {
  try {
    const storedDataStr = localStorage.getItem(STORAGE_KEY);
    if (!storedDataStr) return null;
    
    const storedData: StoredData = JSON.parse(storedDataStr);
    
    // Handle version mismatch
    if (storedData.version !== STORAGE_VERSION) {
      console.warn(`Storage version mismatch: expected ${STORAGE_VERSION}, got ${storedData.version}. Using sample document.`);
      // Optionally add migration logic here in the future
      return null;
    }
    
    // Use validateAndNormalizeDocument for robust validation
    const normalizedDocument = validateAndNormalizeDocument(storedData.document);
    return normalizedDocument;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
}

// Initialize with data from storage or sample
const initialDocument = loadFromStorage() || sampleDocument;

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: initialDocument,
  activeAnnotationId: null,
  activeChatThreadId: null,

  setDocument: (doc) => {
    set({ document: doc });
    saveToStorage(doc);
  },

  setTitle: (title) =>
    set((state) => {
      const updatedDocument = { ...state.document, title, updatedAt: Date.now() };
      saveToStorage(updatedDocument);
      return { document: updatedDocument };
    }),

  addParagraph: (afterOrder) => {
    const { document } = get();
    const maxOrder = document.paragraphs.reduce((m, p) => Math.max(m, p.order), 0);
    const newOrder = afterOrder !== undefined ? afterOrder + 1 : maxOrder + 1;
    const newParagraph: Paragraph = {
      id: uid(),
      content: '',
      order: newOrder,
      annotations: [],
      citations: [],
    };
    const updatedDocument = {
      ...document,
      paragraphs: [...document.paragraphs, newParagraph],
      updatedAt: Date.now(),
    };
    set({ document: updatedDocument });
    saveToStorage(updatedDocument);
  },

  updateParagraphContent: (paragraphId, content) =>
    set((state) => {
      const updatedDocument = {
        ...state.document,
        paragraphs: state.document.paragraphs.map((p) =>
          p.id === paragraphId ? { ...p, content } : p
        ),
        updatedAt: Date.now(),
      };
      saveToStorage(updatedDocument);
      return { document: updatedDocument };
    }),

  deleteParagraph: (paragraphId) =>
    set((state) => {
      const updatedDocument = {
        ...state.document,
        paragraphs: state.document.paragraphs.filter((p) => p.id !== paragraphId),
        updatedAt: Date.now(),
      };
      saveToStorage(updatedDocument);
      return { document: updatedDocument };
    }),

  addAnnotation: (paragraphId, content) => {
    const annotation: Annotation = {
      id: uid(),
      paragraphId,
      content,
      createdAt: Date.now(),
      chatThreads: [],
    };
    const { document } = get();
    const updatedDocument = {
      ...document,
      paragraphs: document.paragraphs.map((p) =>
        p.id === paragraphId ? { ...p, annotations: [...p.annotations, annotation] } : p
      ),
      updatedAt: Date.now(),
    };
    set({ document: updatedDocument });
    saveToStorage(updatedDocument);
  },

  editAnnotation: (annotationId, content) => {
    const { document } = get();
    const updatedDocument = {
      ...document,
      paragraphs: document.paragraphs.map((p) => ({
        ...p,
        annotations: p.annotations.map((a) =>
          a.id === annotationId ? { ...a, content } : a
        ),
      })),
      updatedAt: Date.now(),
    };
    set({ document: updatedDocument });
    saveToStorage(updatedDocument);
  },

  deleteAnnotation: (annotationId) => {
    set((state) => {
      const updatedDocument = {
        ...state.document,
        paragraphs: state.document.paragraphs.map((p) => ({
          ...p,
          annotations: p.annotations.filter((a) => a.id !== annotationId),
        })),
        updatedAt: Date.now(),
      };
      saveToStorage(updatedDocument);
      const deletingActiveAnnotation = state.activeAnnotationId === annotationId;
      return {
        document: updatedDocument,
        ...(deletingActiveAnnotation
          ? { activeAnnotationId: null, activeChatThreadId: null }
          : {}),
      };
    });
  },

  setActiveAnnotation: (annotationId) => set({ activeAnnotationId: annotationId }),
  setActiveChatThread: (threadId) => set({ activeChatThreadId: threadId }),

  createChatThread: (annotationId) => {
    const threadId = uid();
    const { document } = get();
    const updatedDocument = {
      ...document,
      paragraphs: document.paragraphs.map((p) => ({
        ...p,
        annotations: p.annotations.map((a) =>
          a.id === annotationId
            ? { ...a, chatThreads: [...a.chatThreads, { id: threadId, messages: [] }] }
            : a
        ),
      })),
      updatedAt: Date.now(),
    };
    set({ document: updatedDocument });
    saveToStorage(updatedDocument);
    return threadId;
  },

  addChatMessage: (threadId, role, content) => {
    const message: ChatMessage = {
      id: uid(),
      role,
      content,
      createdAt: Date.now(),
    };
    const { document } = get();
    const updatedDocument = {
      ...document,
      paragraphs: document.paragraphs.map((p) => ({
        ...p,
        annotations: p.annotations.map((a) => ({
          ...a,
          chatThreads: a.chatThreads.map((t) =>
            t.id === threadId ? { ...t, messages: [...t.messages, message] } : t
          ),
        })),
      })),
      updatedAt: Date.now(),
    };
    set({ document: updatedDocument });
    saveToStorage(updatedDocument);
  },

  addCitation: (paragraphId, citation) => {
    const newCitation: Citation = { ...citation, id: uid() };
    const { document } = get();
    const updatedDocument = {
      ...document,
      paragraphs: document.paragraphs.map((p) =>
        p.id === paragraphId ? { ...p, citations: [...p.citations, newCitation] } : p
      ),
      updatedAt: Date.now(),
    };
    set({ document: updatedDocument });
    saveToStorage(updatedDocument);
  },

  loadSampleDocument: () => {
    set({ document: sampleDocument });
    saveToStorage(sampleDocument);
  },

  clearLocalDraft: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      set({ document: sampleDocument });
    } catch (error) {
      console.error('Error clearing local draft:', error);
    }
  },

  loadFromStorage: () => {
    const storedDocument = loadFromStorage();
    if (storedDocument) {
      set({ document: storedDocument });
    }
  },
}));

// Load from storage on initialization
useDocumentStore.getState().loadFromStorage();
