import { useCallback, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDocumentStore } from '../../stores/documentStore';
import { useTranslation } from 'react-i18next';
import StoneSlab from '../StoneSlab/StoneSlab';
import GrapeLeaf from '../GrapeLeaf/GrapeLeaf';
import VineConnector from '../VineConnector/VineConnector';
import styles from './EditorCanvas.module.css';
import { openContextSurface } from '../../utils/contextSurface';

interface EditorCanvasProps {
  onOpenAnnotation: (annotationId: string) => void;
  isChatOpen?: boolean;
}

export default function EditorCanvas({ onOpenAnnotation, isChatOpen = false }: EditorCanvasProps) {
  const document = useDocumentStore((s) => s.document);
  const updateParagraphContent = useDocumentStore((s) => s.updateParagraphContent);
  const deleteParagraph = useDocumentStore((s) => s.deleteParagraph);
  const addAnnotation = useDocumentStore((s) => s.addAnnotation);
  const addParagraph = useDocumentStore((s) => s.addParagraph);
  const canvasRef = useRef<HTMLDivElement>(null);
  const annotationTriggerRef = useRef<HTMLElement | null>(null);
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  
  // State for annotation input
  const [annotationInput, setAnnotationInput] = useState<string>('');
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);

  const handleAddAnnotation = useCallback(
    (paragraphId: string) => {
      annotationTriggerRef.current = globalThis.document.activeElement as HTMLElement | null;
      openContextSurface({ type: 'annotation-input', ownerId: paragraphId });
      setActiveParagraphId(paragraphId);
      setAnnotationInput('');
    },
    []
  );

  const handleAnnotationSubmit = useCallback(() => {
    if (activeParagraphId && annotationInput.trim()) {
      addAnnotation(activeParagraphId, annotationInput.trim());
      setActiveParagraphId(null);
      setAnnotationInput('');
      globalThis.requestAnimationFrame(() => annotationTriggerRef.current?.focus());
    }
  }, [activeParagraphId, annotationInput, addAnnotation]);

  const handleAnnotationCancel = useCallback(() => {
    setActiveParagraphId(null);
    setAnnotationInput('');
    globalThis.requestAnimationFrame(() => annotationTriggerRef.current?.focus());
  }, []);

  const handleAddParagraph = useCallback(() => {
    const maxOrder = document.paragraphs.reduce((m, p) => Math.max(m, p.order), 0);
    addParagraph(maxOrder);
  }, [addParagraph, document.paragraphs]);

  const sortedParagraphs = [...document.paragraphs].sort((a, b) => a.order - b.order);

  return (
    <main
      className={styles.canvas}
      ref={canvasRef}
      data-chat-open={isChatOpen ? 'true' : 'false'}
      aria-label={t('editor.canvasLabel')}
    >
      <div className={styles.inner}>
        {/* Document Title */}
        <motion.h1
          className={styles.docTitle}
          initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        >
          {document.title}
        </motion.h1>

        {/* Paragraphs */}
        {sortedParagraphs.map((paragraph, idx) => (
          <div key={paragraph.id} className={styles.paragraphSection} id={`paragraph-${paragraph.id}`}>
            {/* Vine connector between paragraphs */}
            {idx > 0 && (
              <VineConnector
                fromId={sortedParagraphs[idx - 1].id}
                toId={paragraph.id}
              />
            )}

            {/* Stone Slab */}
            <StoneSlab
              paragraph={paragraph}
              onUpdate={(content) => updateParagraphContent(paragraph.id, content)}
              onDelete={deleteParagraph}
              onAddAnnotation={handleAddAnnotation}
              isSelected={selectedParagraphId === paragraph.id}
              onSelect={setSelectedParagraphId}
            />

            {/* Annotation Input */}
            {activeParagraphId === paragraph.id && (
              <motion.div
                className={styles.annotationInputContainer}
                initial={{ opacity: shouldReduceMotion ? 1 : 0, height: shouldReduceMotion ? 'auto' : 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
              >
                <div className={styles.annotationInputWrapper}>
                  <textarea
                    data-testid="annotation-input"
                    className={styles.annotationInput}
                    placeholder={t('editor.enterAnnotation')}
                    value={annotationInput}
                    onChange={(e) => setAnnotationInput(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        handleAnnotationCancel();
                      }
                    }}
                    autoFocus
                  />
                  <div className={styles.annotationInputActions}>
                    <button 
                      data-testid="annotation-cancel-btn"
                      className={styles.annotationCancelBtn}
                      onClick={handleAnnotationCancel}
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      data-testid="annotation-submit-btn"
                      className={styles.annotationSubmitBtn}
                      onClick={handleAnnotationSubmit}
                      disabled={!annotationInput.trim()}
                    >
                      {t('editor.addAnnotationSubmit')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Grape Leaf Annotations */}
            {paragraph.annotations.length > 0 && (
              <div className={styles.annotationsRow}>
                {paragraph.annotations.map((annotation) => (
                  <GrapeLeaf
                    key={annotation.id}
                    annotation={annotation}
                    onOpenChat={() => onOpenAnnotation(annotation.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Add Paragraph Button */}
        <div className={styles.addArea}>
          <motion.button
            className={styles.addBtn}
            onClick={handleAddParagraph}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.12 }}
          >
            <span className={styles.addBtnIcon}>+</span>
            {t('editor.addNewStoneSlab')}
          </motion.button>
        </div>
      </div>
    </main>
  );
}
