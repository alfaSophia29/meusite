
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/firebaseClient';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { generateUUID } from '../services/storageService';

interface CryptomusPaymentFormProps {
  currentUser: User;
  onSuccess: () => void;
  mode: 'deposit' | 'withdraw' | 'purchase';
  fixedAmount?: number;
  onCancel?: () => void;
}

const CryptomusPaymentForm: React.FC<CryptomusPaymentFormProps> = ({ currentUser, onSuccess, mode, fixedAmount, onCancel }) => {
  const [amount, setAmount] = useState(fixedAmount?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = fixedAmount || parseFloat(amount);
    if (!finalAmount || finalAmount <= 0) return;
    if (mode === 'withdraw' && !address) return;
    if (!db) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      
      const transaction = {
        id: generateUUID(),
        userId: currentUser.id,
        amount: finalAmount,
        currency: 'USDT',
        type: mode === 'purchase' ? 'payment' : mode,
        method: 'cryptomus',
        status: mode === 'withdraw' ? 'pending' : 'completed',
        timestamp: Date.now(),
        details: mode === 'withdraw' ? `Withdraw to: ${address}` : mode === 'purchase' ? 'Direct Purchase' : 'Deposit via Cryptomus'
      };

      if (mode === 'deposit') {
        await updateDoc(userRef, {
          balance: (currentUser.balance || 0) + finalAmount,
        });
      } else if (mode === 'withdraw') {
        if ((currentUser.balance || 0) < finalAmount) {
          alert('Saldo insuficiente');
          return;
        }
        await updateDoc(userRef, {
          balance: (currentUser.balance || 0) - finalAmount,
        });
      }
      // For 'purchase', the balance doesn't change directly in the transaction record here usually,
      // the caller handles the order logic.

      await updateDoc(userRef, {
        transactions: arrayUnion(transaction.id)
      });

      onSuccess();
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {onCancel && (
         <button type="button" onClick={onCancel} className="text-[10px] font-black uppercase text-gray-400 group flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            Voltar
         </button>
      )}
      <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl flex items-center justify-between border border-purple-100 dark:border-purple-900/20">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-xl">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-purple-600 tracking-widest">Cryptomus</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase">USDT (TRC20/ERC20)</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block px-1">Valor (USDT)</label>
          <div className="relative">
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl py-4 px-6 font-black text-lg focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
              required
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-gray-400">USDT</span>
          </div>
        </div>

        {mode === 'withdraw' && (
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block px-1">Endereço da Carteira</label>
            <input 
              type="text" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: T..."
              className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl py-4 px-6 font-bold text-sm focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
              required
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
      >
        {loading ? 'Processando...' : mode === 'deposit' ? 'Gerar Fatura USDT' : 'Solicitar Saque USDT'}
      </button>

      <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-widest opacity-60">
        Taxas de rede podem ser aplicadas. Processamento seguro via Cryptomus.
      </p>
    </form>
  );
};

export default CryptomusPaymentForm;
