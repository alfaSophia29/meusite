
import React, { useState, useMemo, useEffect } from 'react';
import { Post, User, GlobalSettings } from '../types';
import { boostPost, getGlobalSettings } from '../services/storageService';
import { useDialog } from '../services/DialogContext';
import { 
  RocketLaunchIcon, 
  XMarkIcon, 
  UserGroupIcon, 
  EyeIcon, 
  BoltIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';

interface BoostPostModalProps {
  post: Post;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

const BOOST_PACKS = [
  { id: 'starter', days: 3, label: 'Básico', reach: '2.5k - 5k' },
  { id: 'pro', days: 7, label: 'Profissional', reach: '15k - 20k', recommended: true },
  { id: 'master', days: 30, label: 'Mestre', reach: '80k - 100k' }
];

const BoostPostModal: React.FC<BoostPostModalProps> = ({ post, currentUser, onClose, onSuccess }) => {
  const { showError, showConfirm } = useDialog();
  const [selectedPackId, setSelectedPackId] = useState(BOOST_PACKS[1].id);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    getGlobalSettings().then(s => {
      setSettings(s);
      if (s?.boostMinBid) {
        setBidAmount(s.boostMinBid);
      } else {
        setBidAmount(10); // Valor padrão se não houver nas configs
      }
    });
  }, []);

  const selectedPack = useMemo(() => BOOST_PACKS.find(p => p.id === selectedPackId)!, [selectedPackId]);

  const handleBoost = async () => {
    if (!settings) return;
    const minBid = settings.boostMinBid || 5;
    
    if (bidAmount < minBid) {
      showError(`O lance mínimo para impulsionar é $${minBid.toFixed(2)}`);
      return;
    }

    if ((currentUser.balance || 0) < bidAmount) {
      showError(`Saldo insuficiente. Você tem $${(currentUser.balance || 0).toFixed(2)}`);
      return;
    }

    if (await showConfirm(`Confirmar impulsionamento por $${bidAmount.toFixed(2)}? Quanto maior o lance, mais seu post aparece no topo.`)) {
      setLoading(true);
      const success = await boostPost(post.id, currentUser.id, selectedPack.days, bidAmount);
      if (success) {
        onSuccess();
        onClose();
      } else {
        showError('Erro ao processar impulsionamento. Verifique seu saldo.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-darkcard w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-8 shadow-2xl relative border border-white/10 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -translate-y-12 translate-x-12 blur-3xl"></div>
        
        <button onClick={onClose} className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 text-gray-400 hover:text-red-500 transition-colors z-10">
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
          <div className="mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
                <RocketLaunchIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
                <h3 className="text-lg sm:text-xl font-black dark:text-white uppercase tracking-tighter">Leilão de Boost</h3>
                <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Quem dá mais, aparece mais no topo</p>
            </div>
          </div>

          <div className="mb-6 p-3 sm:p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center gap-3 sm:gap-4 border border-gray-100 dark:border-white/5">
            {post.imageUrl ? (
              <img src={post.imageUrl} className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm" />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                  <BoltIcon className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            )}
            <p className="text-xs sm:text-sm font-medium dark:text-gray-200 line-clamp-2 italic text-gray-600">"{post.content || 'Publicação de Mídia'}"</p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-600/5 dark:bg-blue-600/10 p-5 rounded-3xl border border-blue-600/20">
              <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 block">Seu Lance de Visibilidade ($)</label>
              <div className="flex flex-col gap-4">
                <input 
                  type="number" 
                  min={settings?.boostMinBid || 5}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-900 border-2 border-blue-600/30 rounded-2xl p-4 text-2xl font-black text-blue-600 outline-none focus:ring-4 focus:ring-blue-600/20 transition-all text-center"
                  placeholder="0.00"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tight px-1">
                  <span>Mínimo: ${ (settings?.boostMinBid || 5).toFixed(2) }</span>
                  <span>Seu Saldo: ${ (currentUser.balance || 0).toFixed(2) }</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Duração do Destaque</label>
              <div className="flex flex-col gap-2 shadow-sm rounded-3xl overflow-hidden">
                {BOOST_PACKS.map(pack => (
                  <button 
                    key={pack.id}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`p-4 transition-all flex items-center justify-between border-b last:border-b-0 dark:border-white/5 ${selectedPackId === pack.id ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-zinc-900 text-gray-500 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <BoltIcon className={`h-4 w-4 ${selectedPackId === pack.id ? 'text-white' : 'text-blue-600'}`} />
                      <p className="font-black text-xs uppercase">{pack.label} - {pack.days} Dias</p>
                    </div>
                    {selectedPackId === pack.id && <SparklesIcon className="h-4 w-4 text-blue-200" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 pt-4 border-t dark:border-white/5">
           <button 
             onClick={handleBoost}
             disabled={loading}
             className={`w-full py-4 sm:py-5 rounded-2xl sm:rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${loading ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
           >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <><BoltIcon className="h-5 w-5" /> Ativar Lance Agora</>}
           </button>
           <p className="text-[8px] text-center text-gray-400 font-bold uppercase mt-3 tracking-tighter">Quanto maior o lance, maior a prioridade no Feed global</p>
        </div>
      </div>
    </div>
  );
};

export default BoostPostModal;
