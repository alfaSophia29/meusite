
import React, { useState } from 'react';
import { useDialog } from '../services/DialogContext';
import { 
  BoltIcon, 
  CreditCardIcon, 
  QrCodeIcon, 
  ClipboardIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';

interface CryptomusPaymentFormProps {
  amount?: number;
  currency?: string;
  exchangeRate?: number;
  mode?: 'deposit' | 'withdraw';
  onConfirm: (data: any) => void;
  onCancel: () => void;
}

const CRYPTO_OPTIONS = [
  { id: 'USDT', name: 'Tether', networks: ['TRC20', 'ERC20', 'BEP20'], color: 'text-green-500' },
  { id: 'BTC', name: 'Bitcoin', networks: ['Bitcoin'], color: 'text-yellow-600' },
  { id: 'ETH', name: 'Ethereum', networks: ['ERC20'], color: 'text-blue-500' },
  { id: 'LTC', name: 'Litecoin', networks: ['Litecoin'], color: 'text-slate-500' },
];

const CryptomusPaymentForm: React.FC<CryptomusPaymentFormProps> = ({ 
  amount: initialAmount = 50, 
  currency = 'USD',
  exchangeRate = 1,
  mode: initialMode = 'deposit', 
  onConfirm, 
  onCancel 
}) => {
  const { showSuccess } = useDialog();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>(initialMode);
  const [method, setMethod] = useState<'crypto' | 'card'>('crypto');
  const [amount, setAmount] = useState(initialAmount);
  const [selectedCoin, setSelectedCoin] = useState(CRYPTO_OPTIONS[0]);
  const [selectedNetwork, setSelectedNetwork] = useState(CRYPTO_OPTIONS[0].networks[0]);
  const [walletAddress, setWalletAddress] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'invoice'>('form');

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      if (mode === 'deposit' && method === 'crypto') {
        setStep('invoice');
      } else {
        onConfirm({ amount, mode, method, coin: selectedCoin.id, network: selectedNetwork });
      }
      setLoading(false);
    }, 1500);
  };

  if (step === 'invoice') {
    return (
      <div className="animate-fade-in space-y-4 xs:space-y-6 text-center py-2 relative">
        <div className="bg-blue-600 text-white p-3 xs:p-4 rounded-xl xs:rounded-2xl inline-block mb-1 xs:mb-2 shadow-lg xs:shadow-xl shadow-blue-200">
           <QrCodeIcon className="h-6 w-6 xs:h-8 xs:w-8" />
        </div>
        <h3 className="text-lg xs:text-xl font-black dark:text-white uppercase tracking-tighter">Fatura Gerada</h3>
        
        <div className="bg-white p-4 xs:p-6 rounded-[2rem] xs:rounded-[2.5rem] shadow-inner border-2 border-dashed border-gray-100 inline-block relative group">
           <QrCodeIcon className="h-36 w-36 xs:h-44 xs:w-44 text-gray-900" />
           <div className="absolute inset-0 bg-white/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] xs:rounded-[2.5rem]">
              <span className="bg-black text-white text-[8px] xs:text-[9px] font-black px-2 xs:px-3 py-1 rounded-full">QR CODE DINÂMICO</span>
           </div>
        </div>

        <div className="space-y-3 xs:space-y-4">
           <div className="bg-gray-50 dark:bg-white/5 p-4 xs:p-5 rounded-2xl text-left border border-gray-100 dark:border-white/10">
              <p className="text-[8px] xs:text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Carteira {selectedCoin.id}</p>
              <div className="flex items-center justify-between gap-2 xs:gap-3 overflow-hidden">
                 <code className="text-[9px] xs:text-[11px] font-bold text-blue-600 truncate flex-1 leading-tight">TNV7vXhY1vXhY1vXhY1vXhY1vXhY1vXhY...</code>
                 <button onClick={() => showSuccess('Endereço copiado!')} className="p-2 xs:p-2.5 bg-blue-100 text-blue-600 rounded-lg xs:rounded-xl hover:bg-blue-600 hover:text-white transition-all shrink-0">
                    <ClipboardIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4"/>
                 </button>
              </div>
           </div>
           
           <div className="flex justify-between items-center px-4 bg-blue-50 dark:bg-blue-900/10 py-2.5 xs:py-3 rounded-xl border border-blue-100 dark:border-blue-900/20">
              <span className="text-[8px] xs:text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase">Rede: {selectedNetwork}</span>
              <span className="text-[8px] xs:text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase">
                Total: {currency === 'USD' ? `$${amount.toFixed(2)}` : `${currency === 'AOA' ? 'KZ' : currency} ${(amount * exchangeRate).toFixed(2)}`}
              </span>
           </div>
        </div>

        <div className="flex flex-col gap-2 xs:gap-3">
          <button 
            onClick={() => onConfirm({ amount, mode: 'deposit' })} 
            className="w-full bg-green-600 text-white py-4 xs:py-5 rounded-2xl font-black text-[10px] xs:text-xs uppercase shadow-xl hover:bg-green-700 transition-all active:scale-95"
          >
            Confirmar Pagamento
          </button>
          <button onClick={() => setStep('form')} className="text-[8px] xs:text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500">Voltar para Edição</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 xs:space-y-6 relative">
      {/* Seletor de Modo (Entrada/Saída) */}
      <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl xs:rounded-2xl">
        <button 
          onClick={() => setMode('deposit')}
          className={`flex-1 flex items-center justify-center gap-1.5 xs:gap-2 py-2 xs:py-3 rounded-lg xs:rounded-xl text-[8px] xs:text-[10px] font-black uppercase transition-all ${mode === 'deposit' ? 'bg-white dark:bg-darkcard text-blue-600 shadow-md' : 'text-gray-500'}`}
        >
          <ArrowDownCircleIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> Recarregar
        </button>
        <button 
          onClick={() => setMode('withdraw')}
          className={`flex-1 flex items-center justify-center gap-1.5 xs:gap-2 py-2 xs:py-3 rounded-lg xs:rounded-xl text-[8px] xs:text-[10px] font-black uppercase transition-all ${mode === 'withdraw' ? 'bg-white dark:bg-darkcard text-red-600 shadow-md' : 'text-gray-500'}`}
        >
          <ArrowUpCircleIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> Sacar
        </button>
      </div>

      <form onSubmit={handleAction} className="space-y-4 xs:space-y-6">
        <div>
          <label className="text-[8px] xs:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 xs:mb-2 block">
            Valor da Operação ({currency})
          </label>
          <div className="relative">
             <span className="absolute left-4 xs:left-5 top-1/2 -translate-y-1/2 text-xl xs:text-2xl font-black text-gray-300">
               {currency === 'USD' ? '$' : (currency === 'AOA' ? 'KZ' : currency)}
             </span>
             <input 
               type="number" 
               required 
               value={mode === 'deposit' && initialAmount !== 50 ? (initialAmount * exchangeRate).toFixed(2) : amount} 
               disabled={mode === 'deposit' && initialAmount !== 50}
               onChange={e => setAmount(Number(e.target.value))}
               className="w-full pl-12 xs:pl-14 pr-5 xs:pr-6 py-4 xs:py-5 bg-gray-50 dark:bg-white/5 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-[1.4rem] xs:rounded-[1.8rem] outline-none font-black text-xl xs:text-2xl transition-all shadow-inner disabled:opacity-75" 
               placeholder="0.00"
             />
          </div>
        </div>

        {mode === 'deposit' ? (
          <>
            <div className="space-y-2.5 xs:space-y-3">
              <label className="text-[8px] xs:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Método</label>
              <div className="grid grid-cols-2 gap-2 xs:gap-3">
                <button 
                  type="button" 
                  onClick={() => setMethod('crypto')}
                  className={`p-3 xs:p-4 rounded-xl xs:rounded-2xl border-2 flex flex-col items-center gap-1.5 xs:gap-2 transition-all ${method === 'crypto' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 text-blue-600' : 'border-gray-50 dark:border-white/5 text-gray-400 hover:border-gray-200'}`}
                >
                  <BoltIcon className="h-5 w-5 xs:h-6 xs:w-6" />
                  <span className="text-[7px] xs:text-[9px] font-black uppercase">Cripto</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setMethod('card')}
                  className={`p-3 xs:p-4 rounded-xl xs:rounded-2xl border-2 flex flex-col items-center gap-1.5 xs:gap-2 transition-all ${method === 'card' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 text-blue-600' : 'border-gray-50 dark:border-white/5 text-gray-400 hover:border-gray-200'}`}
                >
                  <CreditCardIcon className="h-5 w-5 xs:h-6 xs:w-6" />
                  <span className="text-[7px] xs:text-[9px] font-black uppercase">Cartão</span>
                </button>
              </div>
            </div>

            {method === 'crypto' ? (
              <div className="space-y-3 xs:space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-1.5 xs:gap-2">
                  {CRYPTO_OPTIONS.map(coin => (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => { setSelectedCoin(coin); setSelectedNetwork(coin.networks[0]); }}
                      className={`flex items-center gap-2 xs:gap-3 p-2 xs:p-3 rounded-lg xs:rounded-xl border-2 transition-all ${selectedCoin.id === coin.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-50 dark:border-white/5'}`}
                    >
                      <div className={`w-6 h-6 xs:w-8 xs:h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-[8px] xs:text-[10px] ${coin.color}`}>{coin.id[0]}</div>
                      <div className="text-left overflow-hidden">
                        <p className="font-black text-[10px] xs:text-xs text-gray-900 dark:text-white">{coin.id}</p>
                        <p className="text-[7px] xs:text-[8px] text-gray-400 font-bold uppercase truncate">{coin.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div>
                   <label className="text-[8px] xs:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Rede</label>
                   <div className="flex flex-wrap gap-1.5 xs:gap-2">
                      {selectedCoin.networks.map(net => (
                        <button key={net} type="button" onClick={() => setSelectedNetwork(net)} className={`px-3 xs:px-4 py-1.5 xs:py-2 rounded-lg text-[8px] xs:text-[9px] font-black uppercase transition-all ${selectedNetwork === net ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>{net}</button>
                      ))}
                   </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 xs:space-y-4 animate-fade-in bg-gray-50 dark:bg-white/5 p-4 xs:p-6 rounded-[1.5rem] xs:rounded-[2rem] border border-gray-100 dark:border-white/10">
                 <div className="space-y-3">
                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-3 xs:p-4 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-darkcard text-xs xs:text-sm font-bold outline-none focus:border-blue-500 transition-all" />
                    <div className="grid grid-cols-2 gap-3">
                       <input type="text" placeholder="MM/AA" className="p-3 xs:p-4 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-darkcard text-xs xs:text-sm font-bold outline-none focus:border-blue-500 transition-all" />
                       <input type="password" placeholder="CVV" className="p-3 xs:p-4 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-darkcard text-xs xs:text-sm font-bold outline-none focus:border-blue-500 transition-all" />
                    </div>
                    <input type="text" placeholder="NOME NO CARTÃO" className="w-full p-3 xs:p-4 rounded-xl border border-gray-200 dark:border-white/10 dark:bg-darkcard text-xs xs:text-sm font-bold outline-none focus:border-blue-500 transition-all uppercase" />
                 </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 xs:space-y-5 animate-fade-in">
             <div className="p-3 xs:p-4 bg-red-50 dark:bg-red-900/10 rounded-xl xs:rounded-2xl border border-red-100 dark:border-red-900/20 flex gap-2 xs:gap-3">
                <ExclamationTriangleIcon className="h-4 w-4 xs:h-5 xs:w-5 text-red-600 shrink-0" />
                <p className="text-[8px] xs:text-[9px] text-red-800 dark:text-red-300 font-bold leading-tight">
                  Verifique o endereço. Transações enviadas para endereços errados são irreversíveis.
                </p>
             </div>
             <div>
                <label className="text-[8px] xs:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Moeda</label>
                <div className="grid grid-cols-4 gap-1.5 xs:gap-2">
                   {CRYPTO_OPTIONS.map(coin => (
                     <button 
                       key={coin.id} 
                       type="button" 
                       onClick={() => { setSelectedCoin(coin); setSelectedNetwork(coin.networks[0]); }}
                       className={`p-2 xs:p-3 rounded-lg xs:rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${selectedCoin.id === coin.id ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-50 dark:border-white/5'}`}
                     >
                        <span className={`font-black text-[9px] xs:text-xs ${coin.color}`}>{coin.id}</span>
                     </button>
                   ))}
                </div>
             </div>
             <div>
                <label className="text-[8px] xs:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Endereço de Destino ({selectedCoin.id})</label>
                <input 
                  type="text" 
                  required 
                  value={walletAddress} 
                  onChange={e => setWalletAddress(e.target.value)}
                  placeholder="Seu endereço cripto..." 
                  className="w-full p-3.5 xs:p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl xs:rounded-2xl border-2 border-transparent focus:border-red-500 outline-none font-bold text-[10px] xs:text-xs transition-all shadow-inner"
                />
             </div>
          </div>
        )}

        <div className="flex flex-col gap-2 xs:gap-3 pt-2 xs:pt-4">
           <button 
             type="submit"
             disabled={loading}
             className={`w-full py-4 xs:py-5 rounded-[1.4rem] xs:rounded-[2rem] font-black text-[10px] xs:text-sm uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${mode === 'deposit' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'}`}
           >
             {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <><GlobeAltIcon className="h-4 w-4 xs:h-5 xs:w-5" /> {mode === 'deposit' ? 'Prosseguir' : 'Solicitar Resgate'}</>}
           </button>
        </div>
      </form>
    </div>
  );
};

export default CryptomusPaymentForm;
