
import React, { useState } from 'react';
import { User } from '../types';
import { XMarkIcon, WalletIcon, CreditCardIcon } from '@heroicons/react/24/solid';
import CryptomusPaymentForm from './CryptomusPaymentForm';
import UnitelMoneyForm from './UnitelMoneyForm';

interface WalletModalProps {
  isOpen: boolean;
  mode: 'withdraw' | 'deposit';
  onClose: () => void;
  currentUser: User;
  refreshUser: () => Promise<void>;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, mode, onClose, currentUser, refreshUser }) => {
  const [method, setMethod] = useState<'cryptomus' | 'unitel' | null>(null);

  if (!isOpen) return null;

  const handleSuccess = async () => {
    await refreshUser();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-darkcard w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-50 dark:border-white/5 flex items-center justify-between bg-white dark:bg-darkcard sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${mode === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              <WalletIcon className="h-5 w-5" />
            </div>
            <h3 className="font-black text-lg uppercase tracking-tighter text-gray-900 dark:text-white">
              {mode === 'deposit' ? 'Recarregar Saldo' : 'Retirar Saldo'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
          {!method ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Saldo Disponível</p>
                <div className="flex items-center justify-center gap-2">
                   <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                     ${currentUser.balance?.toFixed(2) || '0.00'}
                   </p>
                   {/* Mock KZ conversion */}
                   <span className="text-xs font-bold text-gray-400 mt-2">≈ {(currentUser.balance || 0) * 830} KZ</span>
                </div>
              </div>

              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Selecione o Método</p>
              
              <div className="grid gap-4">
                <button 
                  onClick={() => setMethod('cryptomus')}
                  className="group p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border-2 border-transparent hover:border-purple-500 hover:bg-white dark:hover:bg-white/10 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                      <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">USDT</span>
                  </div>
                  <h4 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-tighter">Cryptomus</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 opacity-60">Crypto Payments (TRC20/ERC20)</p>
                </button>

                <button 
                  onClick={() => setMethod('unitel')}
                  className="group p-6 bg-gray-50 dark:bg-white/5 rounded-[2rem] border-2 border-transparent hover:border-orange-500 hover:bg-white dark:hover:bg-white/10 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                      <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">Kwanza</span>
                  </div>
                  <h4 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-tighter">Unitel Money</h4>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 opacity-60">Pagamentos em KZ via Mobile</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => setMethod(null)}
                className="mb-8 flex items-center gap-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
              >
                <div className="p-1 rounded-lg bg-gray-100 dark:bg-white/5 group-hover:scale-110 transition-transform">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Alterar Método</span>
              </button>

              {method === 'cryptomus' && (
                <CryptomusPaymentForm 
                  currentUser={currentUser} 
                  onSuccess={handleSuccess}
                  mode={mode}
                />
              )}
              {method === 'unitel' && (
                <UnitelMoneyForm 
                  currentUser={currentUser} 
                  onSuccess={handleSuccess}
                  mode={mode}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
