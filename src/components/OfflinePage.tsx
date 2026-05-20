
import React from 'react';
import { WifiIcon } from '@heroicons/react/24/outline';

interface OfflinePageProps {
  onRetry: () => void;
  onContinueOffline: () => void;
}

const OfflinePage: React.FC<OfflinePageProps> = ({ onRetry, onContinueOffline }) => (
  <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-[#0a0c10] text-center">
    <div className="bg-orange-100 dark:bg-orange-600/10 text-orange-600 p-8 rounded-[3rem] mb-8 animate-pulse">
      <WifiIcon className="h-20 w-20" />
    </div>
    <h2 className="text-3xl font-black uppercase text-gray-900 dark:text-white tracking-tighter mb-2">Conexão Perdida</h2>
    <p className="text-gray-500 text-sm max-w-xs font-bold uppercase tracking-widest leading-loose mb-10 opacity-60 text-[10px]">Parece que você está offline. Verifique sua conexão para continuar.</p>
    
    <div className="flex flex-col w-full max-w-xs gap-3">
        <button 
          onClick={onRetry}
          className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
        >
          Tentar Novamente
        </button>
        <button 
          onClick={onContinueOffline}
          className="w-full py-5 text-gray-500 dark:text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Continuar Offline (Usar Cache)
        </button>
    </div>
  </div>
);

export default OfflinePage;
