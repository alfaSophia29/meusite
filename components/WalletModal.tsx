
import React, { useState } from 'react';
import { User } from '../types';
import { handleWalletTransaction, getGlobalSettings } from '../services/storageService';
import { useDialog } from '../services/DialogContext';
import { getAoaExchangeRate } from '../services/currencyService';
import CryptomusPaymentForm from './CryptomusPaymentForm';
import AngolaPaymentForm from './AngolaPaymentForm';
import { XMarkIcon, ShieldCheckIcon, BanknotesIcon, GlobeAltIcon, CalculatorIcon, MapPinIcon } from '@heroicons/react/24/solid';

interface WalletModalProps {
  isOpen: boolean;
  mode: 'deposit' | 'withdraw';
  onClose: () => void;
  currentUser: User;
  refreshUser: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, mode, onClose, currentUser, refreshUser }) => {
  const { showAlert, showConfirm } = useDialog();
  const [taxPercentage, setTaxPercentage] = useState(0.1); // Default 10%
  const [walletRegion, setWalletRegion] = useState<'global' | 'angola'>('global');
  const [exchangeRate, setExchangeRate] = useState(930);

  React.useEffect(() => {
    const fetchSettings = async () => {
      const settings = await getGlobalSettings();
      if (settings && settings.platformTax !== undefined) {
        setTaxPercentage(settings.platformTax / 100);
      }
    };
    const fetchRate = async () => {
      const rate = await getAoaExchangeRate();
      setExchangeRate(rate);
    };
    fetchSettings();
    fetchRate();
  }, []);
  
  if (!isOpen) return null;

  const handleTransaction = async (data: any) => {
    const requestedAmount = data.amount;
    
    if (data.mode === 'withdraw') {
      if ((currentUser.balance || 0) < requestedAmount) {
          showAlert("Saldo insuficiente para realizar este saque.", { type: 'error' });
          return;
      }
      
      const taxAmount = requestedAmount * taxPercentage;
      const netAmount = requestedAmount - taxAmount;
      
      const confirmationMsg = data.currency === 'KZ' 
        ? `Confirmação de Saque em KZ:\n\nValor: ${data.amountKz.toLocaleString()} KZ ($${requestedAmount.toFixed(2)})\nTaxa CyBer (${(taxPercentage * 100).toFixed(0)}%): -$${taxAmount.toFixed(2)}\nLíquido: $${netAmount.toFixed(2)}`
        : `Confirmação de Saque:\n\nValor Solicitado: $${requestedAmount.toFixed(2)}\nTaxa CyBer (${(taxPercentage * 100).toFixed(0)}%): -$${taxAmount.toFixed(2)}\nValor Líquido a Receber: $${netAmount.toFixed(2)}`;

      if (await showConfirm(confirmationMsg)) {
        const success = await handleWalletTransaction(currentUser.id, requestedAmount, 'withdraw');
        
        if (success) {
            refreshUser();
            showAlert("Pedido de saque enviado! Os fundos líquidos serão processados para sua conta externa.", { type: 'success' });
            onClose();
        } else {
            showAlert("Erro ao processar saque.", { type: 'error' });
        }
      }
    } else {
      const success = await handleWalletTransaction(currentUser.id, requestedAmount, 'deposit');
      
      if (success) {
          refreshUser();
          showAlert("Transação processada! Seu saldo foi atualizado.", { type: 'success' });
          onClose();
      } else {
          showAlert("Erro ao processar depósito.", { type: 'error' });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-2 xs:p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#111318] w-full max-w-xl rounded-[2.5rem] xs:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-5 xs:p-8 md:p-12 relative border border-white/10 overflow-y-auto max-h-[95vh] no-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-5 right-5 xs:top-8 xs:right-8 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-all">
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="mb-6 xs:mb-8 flex items-center justify-between">
           <div className="flex items-center gap-3 xs:gap-5">
              <div className={`p-3 xs:p-5 rounded-[1.2rem] xs:rounded-[1.8rem] ${mode === 'deposit' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'} text-white shadow-xl xs:shadow-2xl flex-shrink-0`}>
                <BanknotesIcon className="h-6 w-6 xs:h-8 xs:w-8" />
              </div>
              <div>
                 <h2 className="text-xl xs:text-3xl font-black dark:text-white uppercase tracking-tighter leading-none">{mode === 'deposit' ? 'Recarregar' : 'Resgatar'} Fundos</h2>
                 <p className="text-[8px] xs:text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] xs:tracking-[0.2em] mt-1 xs:mt-2 flex items-center gap-1.5">
                   <ShieldCheckIcon className="h-3 w-3 xs:h-4 xs:w-4 text-blue-500" /> Sistema Seguro CyBer
                 </p>
              </div>
           </div>
           
           <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
              <button 
                onClick={() => setWalletRegion('global')}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${walletRegion === 'global' ? 'bg-white dark:bg-darkcard text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                🌐 Global / Cripto
              </button>
              <button 
                onClick={() => setWalletRegion('angola')}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${walletRegion === 'angola' ? 'bg-white dark:bg-darkcard text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                🇦🇴 Angola (KZ)
              </button>
           </div>
        </div>

        <div className="mb-6 p-4 xs:p-6 bg-gray-50 dark:bg-white/5 rounded-[1.5rem] xs:rounded-[2rem] flex flex-row justify-between items-center border border-gray-100 dark:border-white/5 shadow-inner gap-4">
           <div className="min-w-0 flex-1">
              <p className="text-[8px] xs:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Saldo Disponível</p>
              <div className="flex flex-col">
                 <p className="text-xl xs:text-3xl font-black text-blue-600 break-all leading-tight">
                   ${(currentUser.balance || 0).toFixed(2)}
                 </p>
                 <p className="text-[10px] xs:text-xs font-bold text-green-600">
                    ≈ {((currentUser.balance || 0) * exchangeRate).toLocaleString()} KZ
                 </p>
                 {(currentUser.balance || 0) < 5 && (
                   <button 
                     onClick={async () => {
                       const success = await handleWalletTransaction(currentUser.id, 50, 'deposit');
                       if (success) {
                         refreshUser();
                         showAlert("Bônus de teste de $50 adicionado!", { type: 'success' });
                       }
                     }}
                     className="mt-2 text-[10px] font-black uppercase text-blue-500 hover:underline text-left"
                   >
                     Solicitar Bônus de Teste ($50)
                   </button>
                 )}
              </div>
           </div>
           <div className="text-right flex-shrink-0">
              <p className="text-[8px] xs:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Região</p>
              <span className="text-lg xs:text-xl font-black dark:text-white uppercase flex items-center gap-1.5">
                 {walletRegion === 'angola' ? 'AO' : 'GL'} <MapPinIcon className="h-4 w-4 text-blue-500" />
              </span>
           </div>
        </div>

        {mode === 'withdraw' && (
          <div className="mb-6 p-4 xs:p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[1.5rem] xs:rounded-[2rem] border border-blue-100 dark:border-blue-900/20">
             <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                 <CalculatorIcon className="h-4 w-4" />
                 <span className="text-[8px] xs:text-[10px] font-black uppercase tracking-widest">Política de Saque</span>
             </div>
             <p className="text-[10px] xs:text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
               Taxa de <strong>{(taxPercentage * 100).toFixed(0)}%</strong> inclusa no processamento.
             </p>
          </div>
        )}

        {walletRegion === 'angola' ? (
          <AngolaPaymentForm 
            mode={mode}
            onConfirm={handleTransaction}
            onCancel={onClose}
          />
        ) : (
          <CryptomusPaymentForm 
             mode={mode} 
             onConfirm={handleTransaction} 
             onCancel={onClose} 
          />
        )}

        <div className="mt-8 xs:mt-10 pt-6 xs:pt-8 border-t border-gray-100 dark:border-white/5">
           <div className="flex items-center justify-center gap-4 xs:gap-6 opacity-30 grayscale scale-90 xs:scale-100">
              <GlobeAltIcon className="h-6 w-6 xs:h-8 xs:w-8" />
              <div className="flex gap-2 xs:gap-4 font-black text-[10px]">
                 <span>CRIPTO</span>
                 <span>MCX</span>
                 <span>IBAN</span>
                 <span>UNITEL</span>
              </div>
           </div>
           <p className="text-[7px] xs:text-[8px] text-gray-400 font-bold uppercase text-center mt-4 xs:mt-6 tracking-[0.1em] leading-relaxed max-w-[280px] mx-auto">
             Transações protegidas por criptografia militar. <br/>
             Suporte Global e Angolano.
           </p>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
