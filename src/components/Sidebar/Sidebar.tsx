import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  const shouldReduceMotion = useReducedMotion();
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);

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
    toast(t('toast.markdownExported'), 'success');
  }, [document, t, toast]);

  const handleExportJson = useCallback(() => {
    const json = serializeDocumentToJson(document);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t('toast.jsonExported'), 'success');
  }, [document, t, toast]);

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
            toast(t('toast.jsonImported'), 'success');
          } catch (error) {
              console.error('Error importing JSON:', error);
              toast(t('toast.jsonImportFailed'), 'error');
            }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setDocument, toast, t]);

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
            toast(t('toast.markdownImported'), 'success');
          } catch (error) {
            console.error('Error importing Markdown:', error);
            toast(t('toast.markdownImportFailed'), 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setDocument, toast, t]);

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
      aria-label={t('sidebar.navigationLabel')}
      initial={{ x: shouldReduceMotion ? 0 : -32, opacity: shouldReduceMotion ? 1 : 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
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
        <div className={styles.docTitleLabel} data-testid="doc-title-label">{t('sidebar.documentTitle')}</div>
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
        <div className={styles.paragraphListLabel} data-testid="paragraph-list-label">{t('sidebar.paragraphs')}</div>
        {document.paragraphs.map((para) => (
          <motion.button
            type="button"
            key={para.id}
            className={`${styles.paragraphItem} ${selectedParagraphId === para.id ? styles.paragraphItemActive : ''}`}
            aria-current={selectedParagraphId === para.id ? 'location' : undefined}
            whileHover={{ x: shouldReduceMotion ? 0 : 2 }}
            onClick={() => {
              setSelectedParagraphId(para.id);
              onScrollToParagraph(para.id);
            }}
          >
            <span className={styles.paragraphNumber} data-testid="paragraph-number">{para.order}</span>
            <div className={styles.paragraphPreview}>
              <div className={styles.paragraphPreviewText}>
                {stripHtml(para.content) || 'Empty paragraph...'}
              </div>
              <div className={styles.paragraphMeta}>
                {para.annotations.length > 0 && (
                  <span className={styles.metaBadge} data-testid="paragraph-meta-badge">
                    {t('sidebar.leafCount', { count: para.annotations.length })}
                  </span>
                )}
                {para.citations.length > 0 && (
                  <span className={styles.metaBadge} data-testid="paragraph-meta-badge">
                    {t('sidebar.refCount', { count: para.citations.length })}
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Status Indicator */}
      <div className={styles.statusIndicator} role="status" aria-live="polite">
        <div className={styles.statusText}>
          <span className={styles.statusDot}></span>
          <span data-testid="status-text">{t('sidebar.autosaved')}</span>
        </div>
        <div className={styles.statusTimestamp} data-testid="status-timestamp">
          {new Date(document.updatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <div className={styles.groupLabel} data-testid="file-actions-label">{t('sidebar.fileActions')}</div>
        <div className={styles.actionGroup}>
          <button
            data-testid="import-json-btn"
            className={styles.actionBtn}
            onClick={handleImportJson}
            title={t('sidebar.importJson')}
          >
            {t('sidebar.importJson')}
          </button>
          <button
            data-testid="import-md-btn"
            className={styles.actionBtn}
            onClick={handleImportMarkdown}
            title={t('sidebar.importMd')}
          >
            {t('sidebar.importMd')}
          </button>
        </div>
        <div className={styles.actionGroup}>
          <button
            data-testid="export-json-btn"
            className={styles.actionBtn}
            onClick={handleExportJson}
            title={t('sidebar.exportJson')}
          >
            {t('sidebar.exportJson')}
          </button>
          <button
            data-testid="export-md-btn"
            className={styles.actionBtnPrimary}
            onClick={handleExportMarkdown}
            title={t('sidebar.exportMd')}
          >
            {t('sidebar.exportMd')}
          </button>
        </div>
        <div className={styles.maintenanceDivider} />
        <div className={styles.groupLabel} data-testid="maintenance-label">{t('sidebar.maintenance')}</div>
        <div className={`${styles.actionGroup} ${styles.maintenanceGroup}`}>
          <button
            data-testid="reset-sample-btn"
            className={styles.actionBtnSecondary}
            onClick={handleResetToSample}
            title={t('sidebar.resetSample')}
          >
            {t('sidebar.resetSample')}
          </button>
          <button
            data-testid="clear-draft-btn"
            className={styles.actionBtnSecondary}
            onClick={handleClearLocalDraft}
            title={t('sidebar.clearDraft')}
          >
            {t('sidebar.clearDraft')}
          </button>
        </div>
        <div className={styles.groupLabel} data-testid="language-label">{t('sidebar.language')}</div>
        <div className={styles.actionGroup}>
          <button
            data-testid="language-en-btn"
            className={styles.actionBtn}
            onClick={() => changeLanguage('en')}
            title="English"
            aria-pressed={i18n.language === 'en'}
          >
            EN
          </button>
          <button
            data-testid="language-zh-btn"
            className={styles.actionBtn}
            onClick={() => changeLanguage('zh-CN')}
            title="中文"
            aria-pressed={i18n.language === 'zh-CN'}
          >
            中文
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
