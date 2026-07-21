import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';

const iconStyles = {
  confirm: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
};

export default function AutomationActionModal({
  isOpen,
  type = 'error',
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isWorking = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isWorking) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isWorking, onClose]);

  if (!isOpen) return null;

  const Icon = type === 'confirm'
    ? AlertTriangle
    : type === 'success'
      ? CheckCircle2
      : AlertCircle;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isWorking) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-action-title"
        aria-describedby="automation-action-message"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2.5 ${iconStyles[type] || iconStyles.error}`}>
              <Icon size={23} />
            </div>
            <h2 id="automation-action-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p id="automation-action-message" className="text-sm leading-6 text-gray-600">
            {message}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          {type === 'confirm' && (
            <button
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={type === 'confirm' ? onConfirm : onClose}
            disabled={isWorking}
            className={`flex min-w-24 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              type === 'confirm'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isWorking && <Loader2 size={16} className="animate-spin" />}
            {isWorking ? 'Please wait...' : type === 'confirm' ? confirmText : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
