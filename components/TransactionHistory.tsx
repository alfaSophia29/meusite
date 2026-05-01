
import React, { useEffect, useState } from 'react';
import { db } from '../services/firebaseClient';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Transaction, TransactionType } from '../types';
import { handleFirestoreError, OperationType } from '../services/storageService';
import { 
  ArrowDownCircleIcon, 
  ArrowUpCircleIcon, 
  ShoppingBagIcon, 
  CurrencyDollarIcon,
  TicketIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  userId: string;
  limitCount?: number;
}

const TransactionHistory: React.FC<Props> = ({ userId, limitCount = 20 }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!db || !userId) return;
      try {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
        const snap = await getDocs(q);
        setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'transactions');
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [userId, limitCount]);

  const getIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT: return <ArrowDownCircleIcon className="h-6 w-6 text-green-500" />;
      case TransactionType.WITHDRAWAL: return <ArrowUpCircleIcon className="h-6 w-6 text-red-500" />;
      case TransactionType.SALE: return <CurrencyDollarIcon className="h-6 w-6 text-brand" />;
      case TransactionType.PURCHASE: return <ShoppingBagIcon className="h-6 w-6 text-blue-500" />;
      case TransactionType.BOOST: return <BoltIcon className="h-6 w-6 text-orange-500" />;
      case TransactionType.TICKET: return <TicketIcon className="h-6 w-6 text-purple-500" />;
      default: return <CurrencyDollarIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getLabel = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT: return 'Depósito';
      case TransactionType.WITHDRAWAL: return 'Saque';
      case TransactionType.SALE: return 'Venda/Ganhos';
      case TransactionType.PURCHASE: return 'Compra';
      case TransactionType.BOOST: return 'Impulsionamento';
      case TransactionType.TICKET: return 'Ingresso';
      default: return type;
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-2xl" />)}
    </div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 font-medium">Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-[1.5rem] border dark:border-white/5 group hover:border-brand/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
              {getIcon(tx.type as any)}
            </div>
            <div>
              <p className="text-sm font-black dark:text-white uppercase tracking-tight">{tx.description || getLabel(tx.type as any)}</p>
              <p className="text-[10px] font-bold text-gray-400">
                {format(tx.timestamp, "dd 'de' MMMM, HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm font-black ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
            </p>
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${tx.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
              {tx.status === 'COMPLETED' ? 'Concluído' : 'Processando'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionHistory;
