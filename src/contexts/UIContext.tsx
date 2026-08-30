import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import styles from './UIContext.module.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface UIContextType {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

interface UIProviderProps {
  children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const confirmTriggerRef = useRef<HTMLElement | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: {
      title: '',
      message: '',
    },
    resolve: null,
  });

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    confirmTriggerRef.current = globalThis.document?.activeElement as HTMLElement | null;
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
      setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
      globalThis.requestAnimationFrame(() => {
        if (confirmTriggerRef.current?.isConnected) confirmTriggerRef.current.focus();
      });
    }
  }, [confirmState.resolve]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
      setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }));
      globalThis.requestAnimationFrame(() => {
        if (confirmTriggerRef.current?.isConnected) confirmTriggerRef.current.focus();
      });
    }
  }, [confirmState.resolve]);

  const handleDialogKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])')
    );
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && globalThis.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && globalThis.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, [handleCancel]);

  const value = {
    toast,
    confirm,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      {/* Toast components will be rendered here */}
      {toasts.map((toastItem) => (
        <div
          key={toastItem.id}
          className={`${styles.toast} ${styles[`toast${toastItem.type.charAt(0).toUpperCase() + toastItem.type.slice(1)}`]}`}
        >
          {toastItem.message}
        </div>
      ))}
      {/* ConfirmModal component will be rendered here */}
      {confirmState.isOpen && (
        <div className={styles.modalOverlay} onClick={handleCancel} onKeyDown={handleDialogKeyDown}>
          <div
            className={styles.modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="gp-confirm-title"
            aria-describedby="gp-confirm-message"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="gp-confirm-title" className={styles.modalTitle}>{confirmState.options.title}</h3>
            <p id="gp-confirm-message" className={styles.modalMessage}>{confirmState.options.message}</p>
            <div className={styles.modalActions}>
              <button
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                onClick={handleCancel}
                autoFocus
              >
                {confirmState.options.cancelText || 'Cancel'}
              </button>
              <button
                className={`${styles.modalButton} ${styles.modalButtonConfirm}`}
                onClick={handleConfirm}
              >
                {confirmState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
}
