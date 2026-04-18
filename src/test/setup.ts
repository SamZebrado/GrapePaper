import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage before importing i18n
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock as any;

// Initialize i18n for tests
import i18n from '../i18n';

i18n.init({
  resources: {
    en: {
      translation: {
        common: {
          cancel: 'Cancel',
          save: 'Save',
          edit: 'Edit',
          delete: 'Delete',
          confirm: 'Confirm',
          mock: 'mock',
        },
        sidebar: {
          brand: 'GrapePaper',
          documentTitle: 'Document Title',
          untitledDocument: 'Untitled Document',
          paragraphs: 'Paragraphs',
          autosaved: 'Autosaved',
          importJson: 'Import .json',
          importMd: 'Import .md',
          exportJson: 'Export .json',
          exportMd: 'Export .md',
          resetSample: 'Reset to Sample',
          clearDraft: 'Clear Draft',
        },
        editor: {
          beginWriting: 'Begin writing on this stone slab...',
          addAnnotation: '+ Annotation',
          addNewStoneSlab: 'Add New Stone Slab',
          enterAnnotation: 'Enter your annotation...',
          addAnnotationSubmit: 'Add Annotation',
        },
        chat: {
          title: 'Discussion Thread',
          empty: 'Ask a question about this annotation',
          inputPlaceholder: 'Ask about this annotation...',
          send: 'Send message',
        },
        confirm: {
          resetTitle: 'Reset to Sample Document',
          resetMessage: 'Are you sure you want to reset to the sample document? All current changes will be lost.',
          clearTitle: 'Clear Local Draft',
          clearMessage: 'Are you sure you want to clear your local draft? All current changes will be lost.',
        },
        toast: {
          jsonImportFailed: 'Failed to import JSON file.',
          markdownImportFailed: 'Failed to import Markdown file.',
          annotationSaved: 'Annotation saved successfully',
          annotationDeleted: 'Annotation deleted successfully',
          resetDone: 'Document reset to sample successfully',
          clearDone: 'Local draft cleared successfully',
        },
      },
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Mock scrollTo to avoid JSDOM warnings
global.window.scrollTo = vi.fn();

