import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info, HelpCircle, X, Trash2 } from 'lucide-react';

const ModalContext = createContext(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning', // 'warning' | 'danger' | 'success' | 'info'
    isAlert: false,
  });

  const resolverRef = useRef(null);

  const confirm = useCallback(({ 
    title = 'Are you sure?', 
    message = '', 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    type = 'warning' 
  }) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        isAlert: false,
      });
    });
  }, []);

  const alert = useCallback(({ 
    title = 'Notification', 
    message = '', 
    confirmText = 'OK', 
    type = 'info' 
  }) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText: '',
        type,
        isAlert: true,
      });
    });
  }, []);

  const handleConfirm = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  // Keyboard shortcut listener (Esc to cancel, Enter to confirm)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modalState.isOpen) return;
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen]);

  const getIcon = () => {
    switch (modalState.type) {
      case 'danger':
        return <Trash2 className="w-6 h-6 text-red-600" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
      case 'warning':
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    }
  };

  const getIconBg = () => {
    switch (modalState.type) {
      case 'danger':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
      default:
        return 'bg-amber-50 border-amber-200';
    }
  };

  const getConfirmBtnColor = () => {
    switch (modalState.type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-red-600/30';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-emerald-600/30';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-blue-600/30';
      case 'warning':
      default:
        return 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 shadow-primary-600/30';
    }
  };

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Modern Modal Overlay */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl border flex-shrink-0 ${getIconBg()}`}>
                {getIcon()}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {modalState.title}
                </h3>
                {modalState.message && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {modalState.message}
                  </p>
                )}
              </div>
              <button
                onClick={handleCancel}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              {!modalState.isAlert && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                >
                  {modalState.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${getConfirmBtnColor()}`}
              >
                {modalState.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
