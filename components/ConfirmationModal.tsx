
import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon, CheckCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';

export type ConfirmationType = 'danger' | 'info' | 'success' | 'warning';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
  type = 'danger',
  loading = false
}) => {
  if (!isOpen) return null;

  const getTheme = () => {
    switch (type) {
      case 'danger':
        return {
          bgIcon: 'bg-red-50 dark:bg-red-900/20',
          textIcon: 'text-red-600',
          btnPrimary: 'bg-red-600 hover:bg-red-700 shadow-red-200',
          icon: TrashIcon
        };
      case 'success':
        return {
          bgIcon: 'bg-green-50 dark:bg-green-900/20',
          textIcon: 'text-green-600',
          btnPrimary: 'bg-green-600 hover:bg-green-700 shadow-green-200',
          icon: CheckCircleIcon
        };
      case 'warning':
        return {
          bgIcon: 'bg-orange-50 dark:bg-orange-900/20',
          textIcon: 'text-orange-500',
          btnPrimary: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200',
          icon: ExclamationTriangleIcon
        };
      default: // info
        return {
          bgIcon: 'bg-blue-50 dark:bg-blue-900/20',
          textIcon: 'text-blue-600',
          btnPrimary: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
          icon: QuestionMarkCircleIcon
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-4 animate-fade-in overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-[#1a1c23] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-gray-100 dark:border-white/5 overflow-hidden animate-scale-in transform transition-all my-auto">
        {/* Decorative Top Line */}
        <div className={`absolute top-0 left-0 w-full h-1.5 ${type === 'danger' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : type === 'warning' ? 'bg-orange-500' : 'bg-blue-600'}`}></div>
        
        <div className="flex flex-col items-center text-center">
          <div className={`w-20 h-20 ${theme.bgIcon} rounded-full flex items-center justify-center mb-6 animate-bounce-short shadow-inner`}>
            <Icon className={`h-10 w-10 ${theme.textIcon}`} />
          </div>
          
          <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-3 leading-tight">
            {title}
          </h3>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-8 px-2">
            {message}
          </p>
          
          <div className="flex flex-col w-full gap-3">
            <button 
              onClick={() => { onConfirm(); }}
              disabled={loading}
              className={`w-full py-4 ${theme.btnPrimary} text-white rounded-2xl font-black text-xs uppercase shadow-xl dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  Processando...
                </>
              ) : (
                confirmText
              )}
            </button>
            
            <button 
              onClick={onClose}
              disabled={loading}
              className="w-full py-4 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs uppercase hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scale-in {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scale-in { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-short { animation: bounce-short 2s infinite; }
      `}</style>
    </div>
  );
};

export default ConfirmationModal;
