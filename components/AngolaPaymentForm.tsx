
import React, { useState } from 'react';
import { 
  BanknotesIcon, 
  CreditCardIcon, 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  ClipboardIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';
import { getAoaExchangeRate } from '../services/currencyService';

interface AngolaPaymentFormProps {
  amount?: number;
  mode?: 'deposit' | 'withdraw';
  onConfirm: (data: any) => void;
  onCancel: () => void;
}

const AngolaPaymentForm: React.FC<AngolaPaymentFormProps> = ({ amount: initialAmount = 10, mode: initialMode = 'deposit', onConfirm, onCancel }) => {
  const { showSuccess, showAlert } = useDialog();
  const [exchangeRate, setExchangeRate] = useState(930);
  const [mode, setMode] = useState<'deposit' | 'withdraw'>(initialMode);

  React.useEffect(() => {
    const fetchRate = async () => {
      const rate = await getAoaExchangeRate();
      setExchangeRate(rate);
    };
    fetchRate();
  }, []);

  const [method, setMethod] = useState<'mcx' | 'iban' | 'unitel'>('mcx');
  const [amountUsd, setAmountUsd] = useState(initialAmount);
  const [phone, setPhone] = useState('');
  const [iban, setIban] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'confirmation'>('form');

  const amountKz = amountUsd * exchangeRate;

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amountUsd < 1) {
        showAlert("O valor mínimo é de $1.00", { type: 'alert' });
        return;
    }

    if (mode === 'withdraw' && method === 'iban' && !iban.startsWith('AO06')) {
        showAlert("IBAN Inválido. Deve começar com AO06", { type: 'alert' });
        return;
    }

    setStep('confirmation');
  };

  const confirmTransaction = () => {
    setLoading(true);
    setTimeout(() => {
      onConfirm({ 
        amount: amountUsd, 
        mode, 
        method, 
        phone, 
        iban, 
        fullName,
        currency: 'KZ',
        exchangeRate,
        amountKz
      });
      setLoading(false);
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess("Copiado para a área de transferência!");
  };

  if (step === 'confirmation') {
    return (
      <div className="animate-fade-in space-y-6 text-center py-4">
        <div className="bg-blue-600 text-white p-4 rounded-3xl inline-block shadow-xl shadow-blue-200">
           <BanknotesIcon className="h-8 w-8" />
        </div>
        
        <div>
           <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Confirmar Operação</h3>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
             {mode === 'deposit' ? 'Depósito via' : 'Saque via'} {method.toUpperCase()}
           </p>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 space-y-4">
           <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-3">
              <span className="text-[10px] font-black text-gray-400 uppercase">Valor em USD</span>
              <span className="text-lg font-black text-blue-600">${amountUsd.toFixed(2)}</span>
           </div>
           <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-3">
              <span className="text-[10px] font-black text-gray-400 uppercase">Valor em KZ</span>
              <span className="text-lg font-black text-green-600">{amountKz.toLocaleString()} KZ</span>
           </div>
           <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase">Taxa de Câmbio</span>
              <span className="text-[10px] font-black dark:text-white">1 USD = {exchangeRate} KZ</span>
           </div>
        </div>

        {mode === 'deposit' && method === 'iban' && (
           <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-left space-y-3">
              <p className="text-[9px] font-black text-blue-800 dark:text-blue-300 uppercase">Dados para Transferência:</p>
              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">IBAN:</span>
                    <button onClick={() => copyToClipboard('AO0600000000000000000000')} className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
                       AO06...0000 <ClipboardIcon className="h-3 w-3" />
                    </button>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Titular:</span>
                    <span className="text-[10px] font-bold dark:text-white">CYBERPHONE LTDA</span>
                 </div>
              </div>
              <p className="text-[8px] text-blue-800/60 dark:text-blue-300/60 font-medium italic">
                * O saldo será creditado após a verificação do comprovativo.
              </p>
           </div>
        )}

        <div className="flex flex-col gap-3">
           <button 
             onClick={confirmTransaction}
             disabled={loading}
             className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${mode === 'deposit' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}
           >
             {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : 'Confirmar e Finalizar'}
           </button>
           <button onClick={() => setStep('form')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 relative">
      {/* Seletor de Modo */}
      <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl">
        <button 
          onClick={() => setMode('deposit')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'deposit' ? 'bg-white dark:bg-[#1c1f26] text-blue-600 shadow-md' : 'text-gray-500'}`}
        >
          <ArrowDownCircleIcon className="h-4 w-4" /> Recarregar
        </button>
        <button 
          onClick={() => setMode('withdraw')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${mode === 'withdraw' ? 'bg-white dark:bg-[#1c1f26] text-red-600 shadow-md' : 'text-gray-500'}`}
        >
          <ArrowUpCircleIcon className="h-4 w-4" /> Sacar
        </button>
      </div>

      <form onSubmit={handleAction} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Valor (USD)</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">$</span>
              <input 
                type="number" 
                required 
                value={amountUsd} 
                onChange={e => setAmountUsd(Number(e.target.value))}
                className="w-full pl-11 pr-6 py-5 bg-gray-50 dark:bg-white/5 dark:text-white border-2 border-transparent focus:border-blue-500 rounded-[1.8rem] outline-none font-black text-2xl transition-all shadow-inner" 
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Total em KZ</label>
            <div className="w-full px-6 py-5 bg-green-50 dark:bg-green-900/10 border-2 border-green-100 dark:border-green-900/20 rounded-[1.8rem] flex items-center justify-between">
               <span className="text-2xl font-black text-green-600">{amountKz.toLocaleString()}</span>
               <span className="text-xs font-black text-green-600/50">KZ</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Método de Pagamento Angolano</label>
          <div className="grid grid-cols-3 gap-3">
            <button 
              type="button" 
              onClick={() => setMethod('mcx')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${method === 'mcx' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 text-blue-600' : 'border-gray-50 dark:border-white/5 text-gray-400 hover:border-gray-200'}`}
            >
              <CreditCardIcon className="h-6 w-6" />
              <span className="text-[9px] font-black uppercase text-center">MCX Express</span>
            </button>
            <button 
              type="button" 
              onClick={() => setMethod('iban')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${method === 'iban' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 text-blue-600' : 'border-gray-50 dark:border-white/5 text-gray-400 hover:border-gray-200'}`}
            >
              <BuildingLibraryIcon className="h-6 w-6" />
              <span className="text-[9px] font-black uppercase">IBAN / Transf.</span>
            </button>
            <button 
              type="button" 
              onClick={() => setMethod('unitel')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${method === 'unitel' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 text-blue-600' : 'border-gray-50 dark:border-white/5 text-gray-400 hover:border-gray-200'}`}
            >
              <DevicePhoneMobileIcon className="h-6 w-6" />
              <span className="text-[9px] font-black uppercase">Unitel Money</span>
            </button>
          </div>
        </div>

        <div className="space-y-4 bg-gray-50 dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/10">
           {method === 'mcx' || method === 'unitel' ? (
              <div className="space-y-4 animate-fade-in">
                 <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Número de Telefone</label>
                    <input 
                      type="tel" 
                      required 
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+244 9..."
                      className="w-full p-4 bg-white dark:bg-darkcard dark:text-white rounded-xl border border-gray-200 dark:border-white/10 outline-none focus:border-blue-500 font-bold"
                    />
                 </div>
              </div>
           ) : (
              <div className="space-y-4 animate-fade-in">
                 <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">IBAN Bancário (AO06...)</label>
                    <input 
                      type="text" 
                      required 
                      value={iban}
                      onChange={e => setIban(e.target.value)}
                      placeholder="AO06 0000 0000 0000 0000 0000 0"
                      className="w-full p-4 bg-white dark:bg-darkcard dark:text-white rounded-xl border border-gray-200 dark:border-white/10 outline-none focus:border-blue-500 font-bold"
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Nome do Titular</label>
                    <input 
                      type="text" 
                      required 
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Nome completo na conta"
                      className="w-full p-4 bg-white dark:bg-darkcard dark:text-white rounded-xl border border-gray-200 dark:border-white/10 outline-none focus:border-blue-500 font-bold uppercase"
                    />
                 </div>
              </div>
           )}
        </div>

        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl">
           <GlobeAltIcon className="h-5 w-5 text-blue-600 shrink-0" />
           <p className="text-[9px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
             Operamos sob demanda para o mercado Angolano. As taxas podem variar de acordo com o processador local.
           </p>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${mode === 'deposit' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}
        >
          {mode === 'deposit' ? 'Continuar para Depósito' : 'Solicitar Resgate em KZ'}
        </button>
      </form>
    </div>
  );
};

export default AngolaPaymentForm;
