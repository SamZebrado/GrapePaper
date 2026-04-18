import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentStore } from '../../stores/documentStore';
import { useUI } from '../../contexts/UIContext';
import type { Annotation } from '../../types';
import styles from './GrapeLeaf.module.css';

interface GrapeLeafProps {
  annotation: Annotation;
  onOpenChat: () => void;
}

export default function GrapeLeaf({ annotation, onOpenChat }: GrapeLeafProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content);
  const { editAnnotation, deleteAnnotation } = useDocumentStore();
  const { toast } = useUI();
  
  const totalMessages = annotation.chatThreads.reduce(
    (sum, t) => sum + t.messages.length,
    0
  );

  const handleClick = () => {
    if (expanded) {
      onOpenChat();
    } else {
      setExpanded(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    editAnnotation(annotation.id, editContent);
    setIsEditing(false);
    toast('Annotation saved successfully', 'success');
  };

  const handleCancel = () => {
    setEditContent(annotation.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteAnnotation(annotation.id);
    toast('Annotation deleted successfully', 'success');
  };

  return (
    <motion.div
      className={styles.leafWrapper}
      initial={{ opacity: 0, scale: 0.3, rotate: -15 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: Math.random() * 0.3,
      }}
    >
      {/* Tendril connector */}
      <div className={styles.tendril} />

      {/* Chat badge */}
      {totalMessages > 0 && (
        <motion.div
          className={styles.chatBadge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.5 }}
        >
          {totalMessages}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            className={styles.leafExpanded}
            initial={{ opacity: 0, y: -5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {isEditing ? (
              <div className={styles.leafContent}>
                <textarea
                  className={styles.editTextarea}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                  placeholder="Edit your annotation..."
                />
                <div className={styles.editActions}>
                  <motion.button 
                    className={styles.saveButton} 
                    onClick={handleSave}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Save
                  </motion.button>
                  <motion.button 
                    className={styles.cancelButton} 
                    onClick={handleCancel}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.leafContent} onClick={onOpenChat}>{annotation.content}</div>
                <div className={styles.leafActions}>
                  <motion.button 
                    className={styles.editButton} 
                    onClick={handleEdit}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Edit
                  </motion.button>
                  <motion.button 
                    className={styles.deleteButton} 
                    onClick={handleDelete}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Delete
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            className={styles.leaf}
            onClick={handleClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={styles.leafContent}>{annotation.content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
