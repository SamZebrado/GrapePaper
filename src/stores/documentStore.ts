import { create } from 'zustand';
import type { Document, Paragraph, Annotation, ChatMessage, Citation } from '../types';

let _idCounter = 100;
function uid(): string {
  return `id_${Date.now()}_${++_idCounter}`;
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
  setActiveAnnotation: (annotationId: string | null) => void;
  setActiveChatThread: (threadId: string | null) => void;

  addChatMessage: (threadId: string, role: 'user' | 'assistant', content: string) => void;
  createChatThread: (annotationId: string) => string;

  addCitation: (paragraphId: string, citation: Omit<Citation, 'id'>) => void;

  loadSampleDocument: () => void;
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

const sampleDocument: Document = {
  id: 'doc-sample-1',
  title: 'Large Language Models in Academic Writing: Opportunities and Challenges',
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  paragraphs: [
    {
      id: 'para-1',
      content:
        'The emergence of large language models (LLMs) has fundamentally transformed the landscape of academic writing and scholarly communication. These sophisticated AI systems, trained on vast corpora of scientific literature, now demonstrate remarkable capabilities in text generation, summarization, and argumentation. As noted by Zhao et al. [1], the rapid evolution from early neural language models to contemporary systems like GPT-4 [3] represents a paradigm shift in how researchers approach the writing process. The implications extend beyond mere text production to encompass literature synthesis, hypothesis generation, and even peer review assistance.',
      order: 1,
      annotations: [
        {
          id: 'annot-1',
          paragraphId: 'para-1',
          content: 'This paragraph sets up the broad context. Consider adding specific statistics about LLM adoption rates in academia to strengthen the opening.',
          createdAt: Date.now() - 3600000,
          chatThreads: [
            {
              id: 'thread-1',
              messages: [
                {
                  id: 'msg-1',
                  role: 'user',
                  content: 'What are the main concerns about using LLMs in academic writing?',
                  createdAt: Date.now() - 3500000,
                },
                {
                  id: 'msg-2',
                  role: 'assistant',
                  content:
                    'The primary concerns include: (1) Academic integrity — blurring the line between original thought and AI-generated content; (2) Accuracy — LLMs can produce plausible-sounding but factually incorrect statements ("hallucinations"); (3) Bias — models may perpetuate biases present in training data; (4) Over-reliance — researchers may become dependent on AI tools, potentially diminishing critical thinking skills.',
                  createdAt: Date.now() - 3400000,
                },
                {
                  id: 'msg-3',
                  role: 'user',
                  content: 'How do current evaluation frameworks address these concerns?',
                  createdAt: Date.now() - 3300000,
                },
                {
                  id: 'msg-4',
                  role: 'assistant',
                  content:
                    'Current evaluation frameworks, as surveyed by Chang et al. [2], attempt to address these through multi-dimensional assessment including factual accuracy benchmarks, bias detection metrics, and human evaluation protocols. However, no single framework comprehensively captures all dimensions of concern in academic writing contexts.',
                  createdAt: Date.now() - 3200000,
                },
              ],
            },
          ],
        },
      ],
      citations: [sampleCitations[0], sampleCitations[2]],
    },
    {
      id: 'para-2',
      content:
        'From a methodological perspective, the integration of LLMs into academic workflows raises profound questions about authorship, originality, and epistemic authority. While these tools can significantly enhance productivity — assisting with drafting, language polishing, and structural organization — they simultaneously challenge traditional notions of intellectual contribution. Research by Eloundou et al. [4] suggests that the labor market implications of LLM adoption are substantial, with knowledge work being particularly susceptible to automation. In the academic sphere, this translates to a need for clear guidelines on appropriate AI use, transparent disclosure practices, and robust plagiarism detection systems capable of distinguishing between AI-assisted and AI-generated content.',
      order: 2,
      annotations: [
        {
          id: 'annot-2',
          paragraphId: 'para-2',
          content:
            'The transition from methodological concerns to practical implications is smooth. The citation of labor market research effectively broadens the argument beyond academia.',
          createdAt: Date.now() - 7200000,
          chatThreads: [],
        },
      ],
      citations: [sampleCitations[3]],
    },
    {
      id: 'para-3',
      content:
        'Despite these challenges, the potential benefits of thoughtfully integrating LLMs into academic writing are considerable. For non-native English speakers, these tools can democratize access to international scholarly discourse by reducing language barriers. For early-career researchers, AI-assisted writing support can accelerate the development of academic communication skills. Furthermore, advanced applications such as automated literature review, intelligent citation suggestion, and real-time argument coherence checking represent transformative opportunities for the research enterprise. The key lies in developing frameworks that leverage AI capabilities while preserving the essential human elements of scholarly inquiry: critical thinking, creativity, and intellectual rigor.',
      order: 3,
      annotations: [],
      citations: [],
    },
    {
      id: 'para-4',
      content:
        'Looking forward, the academic community must engage in a nuanced dialogue about the role of AI in knowledge production. This requires collaboration between computer scientists, ethicists, domain experts, and policymakers to establish norms that balance innovation with integrity. Evaluation methodologies [2] will play a crucial role in this process, providing the empirical foundation for evidence-based policy decisions. Ultimately, the goal should not be to resist technological change but to channel it in ways that enhance rather than diminish the quality and credibility of academic scholarship.',
      order: 4,
      annotations: [
        {
          id: 'annot-3',
          paragraphId: 'para-4',
          content:
            'Strong concluding paragraph. The call for interdisciplinary collaboration is well-placed. Consider adding a brief mention of specific institutional policies that have been proposed or implemented.',
          createdAt: Date.now() - 1800000,
          chatThreads: [
            {
              id: 'thread-2',
              messages: [
                {
                  id: 'msg-5',
                  role: 'user',
                  content: 'Can you suggest some specific institutional policies?',
                  createdAt: Date.now() - 1700000,
                },
                {
                  id: 'msg-6',
                  role: 'assistant',
                  content:
                    'Several institutions have introduced notable policies: Nature and Science journals now require AI disclosure statements; UNESCO released guidelines on AI ethics in education; many universities have updated their academic integrity policies to specifically address generative AI. The CRediT taxonomy has also been extended to include AI-related contributor roles.',
                  createdAt: Date.now() - 1600000,
                },
              ],
            },
          ],
        },
      ],
      citations: [sampleCitations[1]],
    },
  ],
};

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: sampleDocument,
  activeAnnotationId: null,
  activeChatThreadId: null,

  setDocument: (doc) => set({ document: doc }),

  setTitle: (title) =>
    set((state) => ({
      document: { ...state.document, title, updatedAt: Date.now() },
    })),

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
    set((state) => ({
      document: {
        ...state.document,
        paragraphs: [...state.document.paragraphs, newParagraph],
        updatedAt: Date.now(),
      },
    }));
  },

  updateParagraphContent: (paragraphId, content) =>
    set((state) => ({
      document: {
        ...state.document,
        paragraphs: state.document.paragraphs.map((p) =>
          p.id === paragraphId ? { ...p, content } : p
        ),
        updatedAt: Date.now(),
      },
    })),

  deleteParagraph: (paragraphId) =>
    set((state) => ({
      document: {
        ...state.document,
        paragraphs: state.document.paragraphs.filter((p) => p.id !== paragraphId),
        updatedAt: Date.now(),
      },
    })),

  addAnnotation: (paragraphId, content) => {
    const annotation: Annotation = {
      id: uid(),
      paragraphId,
      content,
      createdAt: Date.now(),
      chatThreads: [],
    };
    set((state) => ({
      document: {
        ...state.document,
        paragraphs: state.document.paragraphs.map((p) =>
          p.id === paragraphId ? { ...p, annotations: [...p.annotations, annotation] } : p
        ),
        updatedAt: Date.now(),
      },
    }));
  },

  setActiveAnnotation: (annotationId) => set({ activeAnnotationId: annotationId }),
  setActiveChatThread: (threadId) => set({ activeChatThreadId: threadId }),

  createChatThread: (annotationId) => {
    const threadId = uid();
    set((state) => ({
      document: {
        ...state.document,
        paragraphs: state.document.paragraphs.map((p) => ({
          ...p,
          annotations: p.annotations.map((a) =>
            a.id === annotationId
              ? { ...a, chatThreads: [...a.chatThreads, { id: threadId, messages: [] }] }
              : a
          ),
        })),
        updatedAt: Date.now(),
      },
    }));
    return threadId;
  },

  addChatMessage: (threadId, role, content) => {
    const message: ChatMessage = {
      id: uid(),
      role,
      content,
      createdAt: Date.now(),
    };
    set((state) => ({
      document: {
        ...state.document,
        paragraphs: state.document.paragraphs.map((p) => ({
          ...p,
          annotations: p.annotations.map((a) => ({
            ...a,
            chatThreads: a.chatThreads.map((t) =>
              t.id === threadId ? { ...t, messages: [...t.messages, message] } : t
            ),
          })),
        })),
        updatedAt: Date.now(),
      },
    }));
  },

  addCitation: (paragraphId, citation) => {
    const newCitation: Citation = { ...citation, id: uid() };
    set((state) => ({
      document: {
        ...state.document,
        paragraphs: state.document.paragraphs.map((p) =>
          p.id === paragraphId ? { ...p, citations: [...p.citations, newCitation] } : p
        ),
        updatedAt: Date.now(),
      },
    }));
  },

  loadSampleDocument: () => set({ document: sampleDocument }),
}));
