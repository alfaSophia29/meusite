import React, { useState } from 'react';
import { User, TransactionType, Transaction } from '../types';
import { db } from '../services/firebaseClient';
import { generateUUID, createTransaction } from '../services/storageService';

interface UnitelMoneyFormProps {
  currentUser: User;
  onSuccess: () => void;
  mode: 'deposit' | 'withdraw' | 'purchase';
}

const UnitelMoneyForm: React.FC<UnitelMoneyFormProps> = ({ currentUser, onSuccess, mode }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(currentUser.phone || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (!phone) return;
    if (!db) return;

    setLoading(true);
    try {
      const val = parseFloat(amount);
      const txAmt = mode === 'deposit' ? val : (mode === 'withdraw' ? -val : 0);

      if (mode !== 'deposit' && (currentUser.balance || 0) < val) {
        alert('Saldo insuficiente');
        setLoading(false);
        return;
      }

      const tx: Transaction = {
        id: generateUUID(),
        userId: currentUser.id,
        amount: txAmt,
        type: mode === 'deposit' ? TransactionType.DEPOSIT : 
              (mode === 'withdraw' ? TransactionType.WITHDRAWAL : TransactionType.PURCHASE),
        description: `${mode === 'deposit' ? 'Depósito' : 'Saque'} via Unitel Money: ${phone}`,
        timestamp: Date.now(),
        status: mode === 'deposit' ? 'COMPLETED' : 'PENDING'
      };

      await createTransaction(tx);
      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl flex items-center justify-between border border-orange-100 dark:border-orange-900/20">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-orange-600 tracking-widest">Unitel Money</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Kwanza (KZ)</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block px-1">Valor (KZ)</label>
          <div className="relative">
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl py-4 px-6 font-black text-lg focus:ring-2 focus:ring-orange-500 transition-all dark:text-white"
              required
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-400">KZ</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block px-1">Número de Telefone</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9xx xxx xxx"
            className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl py-4 px-6 font-bold text-sm focus:ring-2 focus:ring-orange-500 transition-all dark:text-white"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
      >
        {loading ? 'Processando...' : mode === 'deposit' ? 'Solicitar Pagamento KZ' : 'Solicitar Saque KZ'}
      </button>

      <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest opacity-60">
        Confirme a transação no seu telemóvel após solicitar.
      </p>
    </form>
  );
};

export default UnitelMoneyForm;
