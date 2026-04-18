import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModalManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  });
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((res) => {
      setOptions(options);
      setResolve(res);
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    resolve?.(true);
    setIsOpen(false);
    setResolve(null);
  };

  const handleCancel = () => {
    resolve?.(false);
    setIsOpen(false);
    setResolve(null);
  };

  // Expose confirm to global scope for easy access
  React.useEffect(() => {
    (window as any).confirmModal = confirm;
  }, []);

  if (!isOpen) return null;

  return (
    <ConfirmModal
      title={options.title}
      message={options.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
    />
  );
}

// Export confirm function for easy importing
export const confirmModal = (options: ConfirmOptions): Promise<boolean> => {
  return (window as any).confirmModal?.(options) || Promise.resolve(false);
};
