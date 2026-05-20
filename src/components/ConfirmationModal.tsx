
import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, TrashIcon } from '@heroicons/react/24/solid';

export enum ConfirmationType {
  DANGER = 'DANGER',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = ConfirmationType.INFO,
  loading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case ConfirmationType.DANGER:
        return <TrashIcon className="h-10 w-10 text-red-600 animate-bounce" />;
      case ConfirmationType.WARNING:
        return <ExclamationTriangleIcon className="h-10 w-10 text-orange-500" />;
      default:
        return <InformationCircleIcon className="h-10 w-10 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case ConfirmationType.DANGER:
        return {
          bg: 'bg-red-50 dark:bg-red-900/10',
          button: 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
        };
      case ConfirmationType.WARNING:
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/10',
          button: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/10',
          button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-[3100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={loading ? undefined : onClose}
      />
      
      <div className="relative bg-white dark:bg-darkcard w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 border border-gray-100 dark:border-white/5">
        {!loading && (
          <div className="absolute top-6 right-6">
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}

        <div className="p-10 flex flex-col items-center text-center">
          <div className={`p-8 ${colors.bg} rounded-[2.5rem] mb-8`}>
            {loading ? (
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            ) : getIcon()}
          </div>

          <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4 px-2">
            {title}
          </h3>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-10 px-4">
            {message}
          </p>

          <div className="flex flex-col w-full gap-3">
            <button
              disabled={loading}
              onClick={async () => {
                await onConfirm();
                if (!loading) onClose();
              }}
              className={`w-full py-5 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100 ${colors.button}`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Processando...' : confirmText}
            </button>
            {!loading && (
              <button
                disabled={loading}
                onClick={onClose}
                className="w-full py-5 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
