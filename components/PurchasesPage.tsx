
import React, { useState, useEffect, useMemo } from 'react';
import { User, AffiliateSale, Product, OrderStatus, ProductType, Page } from '../types';
import { getPurchasesByBuyerId, getProducts, addProductRating, confirmProductReceipt, openOrderDispute } from '../services/storageService';
import { getAoaExchangeRate } from '../services/currencyService';
import { ShoppingBagIcon, TruckIcon, CheckCircleIcon, ClockIcon, StarIcon, ArchiveBoxIcon, CheckIcon, MapPinIcon, SparklesIcon, ShieldExclamationIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';

interface PurchasesPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

const PurchasesPage: React.FC<PurchasesPageProps> = ({ currentUser, onNavigate }) => {
  const { showAlert, showConfirm, showSuccess } = useDialog();
  const [purchases, setPurchases] = useState<AffiliateSale[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [exchangeRate, setExchangeRate] = useState(930);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [ratingModal, setRatingModal] = useState<{saleId: string, productId: string} | null>(null);
  const [rigorousConfirmModal, setRigorousConfirmModal] = useState<{saleId: string, productName: string} | null>(null);
  const [confirmChecklist, setConfirmChecklist] = useState({
    received: false,
    intact: false,
    matches: false,
    noRegrets: false
  });
  const [tempRating, setTempRating] = useState(5);
  const [tempComment, setTempComment] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const purchasesData = await getPurchasesByBuyerId(currentUser.id);
      setPurchases(purchasesData);
      
      const [allProducts, rate] = await Promise.all([
        getProducts(),
        getAoaExchangeRate()
      ]);
      
      const map: Record<string, Product> = {};
      allProducts.forEach(p => map[p.id] = p);
      setProductsMap(map);
      setExchangeRate(rate);
    } catch (error) {
      console.error("Erro ao carregar dados de pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Polling opcional para checar novos status enquanto a página está aberta
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const filteredPurchases = useMemo(() => {
    const statusRank: Record<string, number> = {
      [OrderStatus.CANCELED]: -1,
      [OrderStatus.WAITLIST]: 0,
      [OrderStatus.PROCESSING]: 1,
      [OrderStatus.PROCESSING_SUPPLIER]: 2,
      [OrderStatus.SHIPPING]: 3,
      [OrderStatus.DELIVERED]: 4,
      [OrderStatus.COMPLETED]: 5,
      [OrderStatus.DISPUTED]: 6,
    };

    // 1. Primeiro removemos duplicatas absolutas por ID de venda (saleId)
    const saleIdMap = new Map<string, AffiliateSale>();
    purchases.forEach(p => {
      if (p.id) saleIdMap.set(p.id, p);
    });
    const uniqueSales = Array.from(saleIdMap.values());

    // 2. Agrupamento lógico por Produto e Dia para evitar poluição Visual
    // (Útil se o sistema gerou duplicatas por falha de rede/clique duplo)
    const dedupedMap = new Map<string, AffiliateSale>();
    uniqueSales
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(p => {
        // Agrupamos por Produto e Data (YYYY-MM-DD)
        const dateKey = new Date(p.timestamp).toISOString().split('T')[0];
        const key = `${p.productId}-${dateKey}`;
        
        const existing = dedupedMap.get(key);
        // Prioridade: Manter o status mais avançado ou o registro mais recente
        if (!existing || (statusRank[p.status || ''] || 0) > (statusRank[existing.status || ''] || 0)) {
          dedupedMap.set(key, p);
        }
      });
    
    const unique = Array.from(dedupedMap.values());
    const sorted = unique.sort((a, b) => b.timestamp - a.timestamp);
    
    if (activeTab === 'ALL') return sorted;
    
    return sorted.filter(p => {
      // Aba Pendentes (Waitlist) agora inclui também os estados de Processamento
      if (activeTab === OrderStatus.WAITLIST) {
        return p.status === OrderStatus.WAITLIST || 
               p.status === OrderStatus.PROCESSING || 
               p.status === OrderStatus.PROCESSING_SUPPLIER;
      }
      return p.status === activeTab;
    });
  }, [purchases, activeTab]);

  const handleRateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingModal) return;
    await addProductRating(ratingModal.saleId, tempRating, tempComment);
    setRatingModal(null);
    setTempComment('');
    loadData();
    showSuccess('Avaliação enviada com sucesso!');
  };

  const handleConfirmDelivery = async (saleId: string, productName: string) => {
    setConfirmChecklist({ received: false, intact: false, matches: false, noRegrets: false });
    setRigorousConfirmModal({ saleId, productName });
  };

  const executeRigorousConfirm = async () => {
    if (!rigorousConfirmModal) return;
    if (!Object.values(confirmChecklist).every(val => val)) {
      showAlert("Você deve confirmar todos os itens do checklist para prosseguir.", { type: 'alert' });
      return;
    }

    setLoading(true);
    const saleId = rigorousConfirmModal.saleId;
    setRigorousConfirmModal(null);

    try {
      await confirmProductReceipt(saleId);
      await loadData();
      showSuccess("Pedido finalizado com sucesso! O pagamento foi liberado ao vendedor.");
    } catch (error) {
      console.error("Erro ao confirmar:", error);
      showAlert("Erro ao confirmar recebimento.", { type: 'alert' });
    }
    setLoading(false);
  };

  const handleOpenDispute = async (saleId: string) => {
    const reason = await showConfirm("Deseja abrir uma disputa? Faça isso se o vendedor não entregou o produto ou te bloqueou. O suporte irá analisar. Continuar?");
    if (reason) {
       setLoading(true);
       await openOrderDispute(saleId, "Cliente solicitou via painel de compras.");
       await loadData();
       showAlert("Disputa aberta! Nossa equipe (Sentinela) vai analisar a conversa do chat e os registros para decidir o estorno.", { type: 'alert' });
    }
  };

  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.WAITLIST:
        return { 
          label: 'Aguardando', 
          color: 'text-orange-600', 
          bg: 'bg-orange-50', 
          icon: ClockIcon, 
          progress: 'w-1/6',
          description: 'Aguardando o início do processamento.' 
        };
      case OrderStatus.PROCESSING:
      case OrderStatus.PROCESSING_SUPPLIER:
        return { 
          label: 'Processando', 
          color: 'text-purple-600', 
          bg: 'bg-purple-50', 
          icon: ClockIcon, 
          progress: 'w-1/3',
          description: 'O vendedor está organizando seu pedido.' 
        };
      case OrderStatus.SHIPPING:
        return { 
          label: 'A Caminho', 
          color: 'text-blue-600', 
          bg: 'bg-blue-50', 
          icon: TruckIcon, 
          progress: 'w-2/3',
          description: 'Seu item foi despachado e está em trânsito.' 
        };
      case OrderStatus.DELIVERED:
        return { 
          label: 'No Destino', 
          color: 'text-emerald-600', 
          bg: 'bg-emerald-50', 
          icon: MapPinIcon, 
          progress: 'w-5/6',
          description: 'Seu produto já chegou ao destino / transportadora local.' 
        };
      case OrderStatus.COMPLETED:
        return { 
          label: 'Entregue', 
          color: 'text-green-600', 
          bg: 'bg-green-50', 
          icon: CheckCircleIcon, 
          progress: 'w-full',
          description: 'O ciclo deste pedido foi concluído com sucesso.' 
        };
      case OrderStatus.DISPUTED:
        return { 
          label: 'Em Disputa', 
          color: 'text-red-600', 
          bg: 'bg-red-50', 
          icon: ShieldExclamationIcon, 
          progress: 'w-full',
          description: 'Este pedido está sob análise de fraude.' 
        };
      case OrderStatus.CANCELED:
        return { 
          label: 'Cancelado', 
          color: 'text-gray-400', 
          bg: 'bg-gray-100', 
          icon: XCircleIcon, 
          progress: 'w-0',
          description: 'Este pedido foi cancelado e estornado.' 
        };
      default:
        return { 
          label: 'Pendente', 
          color: 'text-gray-600', 
          bg: 'bg-gray-50', 
          icon: ClockIcon, 
          progress: 'w-0',
          description: 'Aguardando processamento.' 
        };
    }
  };

  if (loading && purchases.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
       <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
       <p className="font-black text-[10px] uppercase text-gray-400 tracking-widest">Sincronizando rastreio...</p>
    </div>
  );

  return (
    <div className="container mx-auto px-1 py-4 md:p-8 animate-fade-in max-w-5xl">
      <header className="mb-8 px-4">
        <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter">Central de Pedidos</h2>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Rastreie suas compras e acesse seus conteúdos</p>
      </header>

      {/* Tabs Customizadas */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar px-4 pb-2">
         {[
           { id: 'ALL', label: 'Todos', icon: ArchiveBoxIcon },
           { id: OrderStatus.WAITLIST, label: 'Pendentes', icon: ClockIcon },
           { id: OrderStatus.SHIPPING, label: 'Em Trânsito', icon: TruckIcon },
           { id: OrderStatus.DELIVERED, label: 'No Destino', icon: MapPinIcon },
           { id: OrderStatus.COMPLETED, label: 'Concluídos', icon: CheckCircleIcon }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all whitespace-nowrap shadow-sm border ${
               activeTab === tab.id 
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200 dark:shadow-none' 
                : 'bg-white dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/10'
             }`}
           >
             <tab.icon className="h-4 w-4" />
             {tab.label}
           </button>
         ))}
      </div>

      {filteredPurchases.length === 0 ? (
        <div className="bg-white dark:bg-darkcard rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100 dark:border-white/10 mx-4">
           <ShoppingBagIcon className="h-16 w-16 text-gray-200 dark:text-gray-800 mx-auto mb-6" />
           <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Nenhum registro encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 px-4 pb-32">
          {filteredPurchases.map(sale => {
            const product = productsMap[sale.productId];
            if (!product) return null;
            const config = getStatusConfig(sale.status);
            const isPhysical = product.type === ProductType.PHYSICAL;

            return (
              <div key={sale.id} className="bg-white dark:bg-darkcard rounded-[2.5rem] shadow-xl border border-gray-50 dark:border-white/5 p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center group transition-all hover:border-blue-500/20">
                 
                 <div className="relative shrink-0">
                    <img src={product.imageUrls[0]} className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] object-cover shadow-2xl border-4 border-white dark:border-white/5" />
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-darkcard">
                       {isPhysical ? <TruckIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
                    </div>
                 </div>

                 <div className="flex-1 space-y-5 w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <div>
                          <h4 className="font-black text-xl text-gray-900 dark:text-white leading-tight">{product.name}</h4>
                          <p className="text-[10px] font-black text-blue-600 uppercase mt-1">Pedido #{(sale.id || '').split('-')[1] || '000'}</p>
                       </div>
                       <div className="text-center md:text-right">
                          <p className="text-2xl font-black text-gray-900 dark:text-white">${sale.saleAmount.toFixed(2)}</p>
                          <p className="text-[10px] font-black text-green-600 uppercase">≈ {(sale.saleAmount * exchangeRate).toLocaleString()} KZ</p>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{isPhysical ? 'Produto Físico' : 'Conteúdo Digital'}</span>
                       </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
                                <config.icon className="h-5 w-5" />
                             </div>
                             <div>
                                <span className={`text-xs font-black uppercase ${config.color}`}>{config.label}</span>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">{config.description}</p>
                             </div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">{new Date(sale.timestamp).toLocaleDateString()}</span>
                       </div>
                       
                       <div className="w-full h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden border border-white/5">
                          <div className={`h-full ${config.color.replace('text', 'bg')} ${config.progress} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)] relative`}>
                             <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          </div>
                       </div>
                    </div>

                    {isPhysical && sale.shippingAddress && (
                       <div className="flex items-start gap-3 px-2 bg-blue-50/30 dark:bg-blue-900/5 p-3 rounded-xl border border-blue-100/50">
                          <MapPinIcon className="h-5 w-5 text-red-500 shrink-0" />
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed uppercase tracking-tighter">
                             Endereço: {sale.shippingAddress.address}, {sale.shippingAddress.city} - {sale.shippingAddress.zipCode}
                          </p>
                       </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-2">
                       {isPhysical && (sale.status === OrderStatus.WAITLIST || sale.status === OrderStatus.PROCESSING || sale.status === OrderStatus.PROCESSING_SUPPLIER || sale.status === OrderStatus.SHIPPING) && (
                          <button 
                            onClick={() => handleOpenDispute(sale.id)}
                            className="flex-1 bg-white dark:bg-white/5 text-red-600 border border-red-100 dark:border-red-900/30 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center justify-center gap-2"
                          >
                             <ShieldExclamationIcon className="h-4 w-4" /> Abrir Disputa
                          </button>
                       )}

                       {isPhysical && (sale.status === OrderStatus.SHIPPING || sale.status === OrderStatus.DELIVERED) && (
                          <button 
                            onClick={() => handleConfirmDelivery(sale.id, product.name)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                          >
                             <CheckIcon className="h-5 w-5 stroke-[4]" /> Confirmar Recebimento
                          </button>
                       )}

                       {!isPhysical && (
                          <button 
                            onClick={() => window.open(product.digitalContentUrl, '_blank')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                          >
                             <SparklesIcon className="h-4 w-4" /> Acessar Conteúdo Digital
                          </button>
                       )}

                       {sale.status === OrderStatus.COMPLETED && !sale.isRated && (
                          <button 
                            onClick={() => setRatingModal({saleId: sale.id, productId: product.id})}
                            className="flex-1 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                          >
                             Avaliar Produto
                          </button>
                       )}
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Avaliação Moderno */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-start sm:items-center justify-center p-4 animate-fade-in overflow-y-auto" onClick={() => setRatingModal(null)}>
           <div className="bg-white dark:bg-darkcard w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-white/10 my-auto" onClick={e => e.stopPropagation()}>
              <button onClick={() => setRatingModal(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors">
                <XCircleIcon className="h-6 w-6" />
              </button>
              
              <div className="text-center mb-8">
                 <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <StarIconSolid className="h-8 w-8 text-blue-600" />
                 </div>
                 <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Avaliar Produto</h3>
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Sua opinião ajuda a comunidade</p>
              </div>

              <form onSubmit={handleRateProduct} className="space-y-8">
                 <div className="flex justify-center gap-2">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} type="button" onClick={() => setTempRating(star)} className="transition-all active:scale-90">
                         {star <= tempRating ? <StarIconSolid className="h-10 w-10 text-yellow-400 drop-shadow-md" /> : <StarIcon className="h-10 w-10 text-gray-200 dark:text-white/10" />}
                      </button>
                    ))}
                 </div>
                 <textarea 
                  value={tempComment} 
                  onChange={e => setTempComment(e.target.value)} 
                  placeholder="Escreva um breve comentário sobre o produto..." 
                  className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-3xl outline-none text-sm dark:text-white h-32 resize-none border-2 border-transparent focus:border-blue-500 transition-all font-medium" 
                  required 
                 />
                 <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Enviar Avaliação</button>
              </form>
           </div>
        </div>
      )}

       {/* Modal de Confirmação Rigorosa */}
       {rigorousConfirmModal && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[150] flex items-start sm:items-center justify-center p-4 animate-fade-in overflow-y-auto">
           <div className="bg-white dark:bg-darkcard w-full max-w-lg rounded-[2.5rem] p-6 xs:p-10 shadow-2xl relative border-2 border-green-500/30 my-4 sm:my-auto max-h-fit overflow-visible">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none hidden sm:block">
                 <ShieldCheckIcon className="h-32 w-32 text-green-500" />
              </div>

              <div className="relative z-10 space-y-6">
                 <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto text-green-600">
                       <ShieldCheckIcon className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Confirmação de Posse</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                       PRODUTO: <span className="text-blue-600">{rigorousConfirmModal.productName}</span>
                    </p>
                    <div className="text-[10px] text-red-500 font-bold uppercase p-4 border border-red-500/20 rounded-xl bg-red-50/50 dark:bg-red-900/10 text-center">
                       ⚠️ Atenção: Ao confirmar, o dinheiro será liberado imediatamente ao vendedor. Esta ação não pode ser desfeita.
                    </div>
                 </div>

                 <div className="space-y-3">
                    {[
                      { key: 'received', label: 'Confirmo que o produto físico está nas minhas mãos' },
                      { key: 'intact', label: 'A integridade da embalagem e do produto está impecável' },
                      { key: 'matches', label: 'O produto corresponde exatamente ao que foi anunciado' },
                      { key: 'noRegrets', label: 'Não tenho intenção de devolver ou abrir disputa' }
                    ].map((item) => (
                      <button 
                        key={item.key}
                        onClick={() => setConfirmChecklist(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof confirmChecklist] }))}
                        className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${confirmChecklist[item.key as keyof typeof confirmChecklist] ? 'border-green-600 bg-green-50 dark:bg-green-600/10' : 'border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/5'}`}
                      >
                         <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${confirmChecklist[item.key as keyof typeof confirmChecklist] ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 dark:border-white/20'}`}>
                            {confirmChecklist[item.key as keyof typeof confirmChecklist] && <CheckIcon className="h-4 w-4" />}
                         </div>
                         <span className={`text-[11px] font-black uppercase tracking-tight leading-tight ${confirmChecklist[item.key as keyof typeof confirmChecklist] ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}`}>
                            {item.label}
                         </span>
                      </button>
                    ))}
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setRigorousConfirmModal(null)}
                      className="flex-1 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-center"
                    >
                       Cancelar
                    </button>
                    <button 
                      onClick={executeRigorousConfirm}
                      disabled={!Object.values(confirmChecklist).every(val => val)}
                      className="flex-[2] bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
                    >
                       Confirmar e Liberar Pagamento
                    </button>
                 </div>
              </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default PurchasesPage;
