import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDocumentStore } from '../../stores/documentStore';
import { useUI } from '../../contexts/UIContext';
import { useTranslation } from 'react-i18next';
import { 
  serializeDocumentToMarkdown, 
  serializeDocumentToJson, 
  parseMarkdownToDocument,
  validateImportedDocument,
  normalizeImportedDocument 
} from '../../utils/documentIO';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onScrollToParagraph: (paragraphId: string) => void;
}

export default function Sidebar({ onScrollToParagraph }: SidebarProps) {
  const document = useDocumentStore((s) => s.document);
  const setTitle = useDocumentStore((s) => s.setTitle);
  const setDocument = useDocumentStore((s) => s.setDocument);
  const loadSampleDocument = useDocumentStore((s) => s.loadSampleDocument);
  const clearLocalDraft = useDocumentStore((s) => s.clearLocalDraft);
  const { toast, confirm } = useUI();
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback(async (lng: 'en' | 'zh-CN') => {
    await i18n.changeLanguage(lng);
    localStorage.setItem('gp-language', lng);
    globalThis.document.documentElement.lang = lng;
  }, [i18n]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
    },
    [setTitle]
  );

  // Strip HTML tags for preview
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, '').trim();
  };

  const handleExportMarkdown = useCallback(() => {
    const md = serializeDocumentToMarkdown(document);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [document]);

  const handleExportJson = useCallback(() => {
    const json = serializeDocumentToJson(document);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [document]);

  const handleImportJson = useCallback(() => {
    const input = globalThis.document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const importedData = JSON.parse(content);
            
            const validation = validateImportedDocument(importedData);
            if (!validation.valid) {
              throw new Error(validation.error || 'Invalid document structure');
            }
            
            const validatedDocument = normalizeImportedDocument(importedData);
            setDocument(validatedDocument);
          } catch (error) {
              console.error('Error importing JSON:', error);
              toast('Failed to import JSON file. Please ensure it is a valid GrapePaper document. Error: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
            }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setDocument, toast]);

  const handleImportMarkdown = useCallback(() => {
    const input = globalThis.document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const newDocument = parseMarkdownToDocument(content);
            setDocument(newDocument);
          } catch (error) {
            console.error('Error importing Markdown:', error);
            toast('Failed to import Markdown file.', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setDocument, toast]);

  const handleResetToSample = useCallback(async () => {
    const confirmed = await confirm({
      title: t('confirm.resetTitle'),
      message: t('confirm.resetMessage'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel')
    });
    if (confirmed) {
      loadSampleDocument();
      toast(t('toast.resetDone'), 'success');
    }
  }, [loadSampleDocument, confirm, toast, t]);

  const handleClearLocalDraft = useCallback(async () => {
    const confirmed = await confirm({
      title: t('confirm.clearTitle'),
      message: t('confirm.clearMessage'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel')
    });
    if (confirmed) {
      clearLocalDraft();
      toast(t('toast.clearDone'), 'success');
    }
  }, [clearLocalDraft, confirm, toast, t]);

  return (
    <motion.aside
      className={styles.sidebar}
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* Brand */}
      <div className={styles.brand}>
        <span className={styles.brandIcon}>&#127815;</span>
        <div className={styles.brandName}>
          Grape<span>Paper</span>
        </div>
      </div>

      {/* Document Title */}
      <div className={styles.docTitleSection}>
        <div className={styles.docTitleLabel}>{t('sidebar.documentTitle')}</div>
        <input
          data-testid="doc-title-input"
          className={styles.docTitleInput}
          value={document.title}
          onChange={handleTitleChange}
          placeholder={t('sidebar.untitledDocument')}
        />
      </div>

      {/* Paragraph List */}
      <div className={styles.paragraphList}>
        <div className={styles.paragraphListLabel}>{t('sidebar.paragraphs')}</div>
        {document.paragraphs.map((para) => (
          <motion.div
            key={para.id}
            className={styles.paragraphItem}
            whileHover={{ x: 2 }}
            onClick={() => onScrollToParagraph(para.id)}
          >
            <span className={styles.paragraphNumber}>{para.order}</span>
            <div className={styles.paragraphPreview}>
              <div className={styles.paragraphPreviewText}>
                {stripHtml(para.content) || 'Empty paragraph...'}
              </div>
              <div className={styles.paragraphMeta}>
                {para.annotations.length > 0 && (
                  <span className={styles.metaBadge}>
                    {para.annotations.length} leaf{para.annotations.length > 1 ? 's' : ''}
                  </span>
                )}
                {para.citations.length > 0 && (
                  <span className={styles.metaBadge}>
                    {para.citations.length} ref{para.citations.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status Indicator */}
      <div className={styles.statusIndicator}>
        <div className={styles.statusText}>
          <span className={styles.statusDot}></span>
          <span>{t('sidebar.autosaved')}</span>
        </div>
        <div className={styles.statusTimestamp}>
          {new Date(document.updatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <div className={styles.actionGroup}>
          <button
            data-testid="import-json-btn"
            className={styles.actionBtn}
            onClick={handleImportJson}
            title="Import JSON file"
          >
            {t('sidebar.importJson')}
          </button>
          <button
            data-testid="import-md-btn"
            className={styles.actionBtn}
            onClick={handleImportMarkdown}
            title="Import Markdown file"
          >
            {t('sidebar.importMd')}
          </button>
        </div>
        <div className={styles.actionGroup}>
          <button
            data-testid="export-json-btn"
            className={styles.actionBtn}
            onClick={handleExportJson}
            title="Export as JSON"
          >
            {t('sidebar.exportJson')}
          </button>
          <button
            data-testid="export-md-btn"
            className={styles.actionBtnPrimary}
            onClick={handleExportMarkdown}
            title="Export as Markdown"
          >
            {t('sidebar.exportMd')}
          </button>
        </div>
        <div className={styles.actionGroup}>
          <button
            data-testid="reset-sample-btn"
            className={styles.actionBtnSecondary}
            onClick={handleResetToSample}
            title="Reset to sample document"
          >
            {t('sidebar.resetSample')}
          </button>
          <button
            data-testid="clear-draft-btn"
            className={styles.actionBtnSecondary}
            onClick={handleClearLocalDraft}
            title="Clear local draft"
          >
            {t('sidebar.clearDraft')}
          </button>
        </div>
        <div className={styles.actionGroup}>
          <button
            className={styles.actionBtn}
            onClick={() => changeLanguage('en')}
            title="English"
          >
            EN
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => changeLanguage('zh-CN')}
            title="中文"
          >
            中文
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
