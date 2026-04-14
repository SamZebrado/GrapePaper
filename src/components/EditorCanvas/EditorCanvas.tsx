import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDocumentStore } from '../../stores/documentStore';
import StoneSlab from '../StoneSlab/StoneSlab';
import GrapeLeaf from '../GrapeLeaf/GrapeLeaf';
import VineConnector from '../VineConnector/VineConnector';
import styles from './EditorCanvas.module.css';

interface EditorCanvasProps {
  onOpenAnnotation: (annotationId: string) => void;
}

export default function EditorCanvas({ onOpenAnnotation }: EditorCanvasProps) {
  const document = useDocumentStore((s) => s.document);
  const updateParagraphContent = useDocumentStore((s) => s.updateParagraphContent);
  const deleteParagraph = useDocumentStore((s) => s.deleteParagraph);
  const addAnnotation = useDocumentStore((s) => s.addAnnotation);
  const addParagraph = useDocumentStore((s) => s.addParagraph);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleAddAnnotation = useCallback(
    (paragraphId: string) => {
      const content = prompt('Enter annotation:');
      if (content?.trim()) {
        addAnnotation(paragraphId, content.trim());
      }
    },
    [addAnnotation]
  );

  const handleAddParagraph = useCallback(() => {
    const maxOrder = document.paragraphs.reduce((m, p) => Math.max(m, p.order), 0);
    addParagraph(maxOrder);
  }, [addParagraph, document.paragraphs]);

  const sortedParagraphs = [...document.paragraphs].sort((a, b) => a.order - b.order);

  return (
    <div className={styles.canvas} ref={canvasRef}>
      <div className={styles.inner}>
        {/* Document Title */}
        <motion.h1
          className={styles.docTitle}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
            />

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
          >
            <span className={styles.addBtnIcon}>+</span>
            Add New Stone Slab
          </motion.button>
        </div>
      </div>
    </div>
  );
}
