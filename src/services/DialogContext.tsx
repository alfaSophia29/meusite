
import React, { createContext, useContext, useState, useCallback } from 'react';

interface DialogOptions {
  title?: string;
  type?: 'success' | 'error' | 'info' | 'warning' | 'alert';
}

interface DialogContextType {
  showAlert: (message: string, options?: DialogOptions | any) => void;
  showSuccess: (message: string, options?: DialogOptions | any) => void;
  showError: (message: string, options?: DialogOptions | any) => void;
  showConfirm: (message: string, onConfirm: () => void, options?: DialogOptions | any) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<{
    isOpen: boolean;
    message: string;
    type: 'alert' | 'success' | 'error' | 'confirm';
    onConfirm?: () => void;
    title?: string;
  }>({
    isOpen: false,
    message: '',
    type: 'alert'
  });

  const showAlert = useCallback((message: string, options?: any) => {
    setModal({ isOpen: true, message, type: 'alert', title: options?.title });
  }, []);

  const showSuccess = useCallback((message: string, options?: any) => {
    setModal({ isOpen: true, message, type: 'success', title: options?.title || 'Sucesso' });
  }, []);

  const showError = useCallback((message: string, options?: any) => {
    setModal({ isOpen: true, message, type: 'error', title: options?.title || 'Erro' });
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, options?: any) => {
    setModal({ isOpen: true, message, type: 'confirm', onConfirm, title: options?.title || 'Confirmação' });
  }, []);

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  return (
    <DialogContext.Provider value={{ showAlert, showSuccess, showError, showConfirm }}>
      {children}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-darkcard w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-white/10 scale-in-center">
            <div className="text-center">
              {modal.type === 'error' && <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl font-black">!</span></div>}
              {modal.type === 'success' && <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl font-black">✓</span></div>}
              {modal.type === 'confirm' && <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl font-black">?</span></div>}
              
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tight mb-2">{modal.title || 'Aviso'}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-8">{modal.message}</p>
              
              <div className="flex gap-4">
                {modal.type === 'confirm' ? (
                  <>
                    <button onClick={closeModal} className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Cancelar</button>
                    <button onClick={() => { modal.onConfirm?.(); closeModal(); }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Confirmar</button>
                  </>
                ) : (
                  <button onClick={closeModal} className="w-full py-4 bg-gray-900 dark:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Fechar</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within a DialogProvider');
  return context;
};
