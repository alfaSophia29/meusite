
import React, { useState, useEffect, useMemo } from 'react';
import { User, AffiliateSale, Product, OrderStatus, ProductType } from '../types';
import { getPurchasesByBuyerId, findProductById, deletePurchase, adminPurgeSales, deleteSaleRecord } from '../services/storageService';
import { 
  ShoppingBagIcon, 
  MapPinIcon, 
  TruckIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'motion/react';
import { useDialog } from '../services/DialogContext';
import { DEFAULT_PRODUCT_IMG } from '../data/constants';

interface PurchasesPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: any) => void;
}

interface SaleWithProduct extends AffiliateSale {
  product?: Product;
}

const PurchasesPage: React.FC<PurchasesPageProps> = ({ currentUser, onNavigate }) => {
  const { showConfirm, showAlert, showSuccess, showError } = useDialog();
  const [purchases, setPurchases] = useState<SaleWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPurchases = async () => {
      setLoading(true);
      try {
        const sales = await getPurchasesByBuyerId(currentUser.id);
        
        // Fetch product details for each sale
        const salesWithProducts = await Promise.all(sales.map(async (sale) => {
          try {
            const product = await findProductById(sale.productId);
            if (product) {
              return { ...sale, product };
            }
          } catch (e) {
            console.error('Error fetching product for sale:', sale.id, e);
          }
          return sale;
        }));

        // Sort by most recent
        salesWithProducts.sort((a, b) => b.timestamp - a.timestamp);
        setPurchases(salesWithProducts);
      } catch (error) {
        console.error('Error fetching purchases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [currentUser.id]);

  const handleDelete = (e: React.MouseEvent, saleId: string, status: OrderStatus) => {
    e.stopPropagation();
    const isCompleted = status === OrderStatus.COMPLETED;
    const message = isCompleted
      ? 'Deseja remover este registro de compra concluída do seu histórico permanentemente? ID: ' + saleId.slice(-6).toUpperCase()
      : 'Deseja remover este item do seu histórico? ID: ' + saleId.slice(-6).toUpperCase() + '\nVocê será reembolsado em 95% do valor.';

    showConfirm(
      message,
      async () => {
        try {
          setLoading(true);
          const success = isCompleted
            ? await deleteSaleRecord(saleId)
            : await deletePurchase(saleId);
          if (success) {
            setPurchases(prev => prev.filter(p => p.id !== saleId));
            showSuccess(isCompleted ? 'Registro removido do histórico!' : 'Item removido e reembolso de 95% creditado.');
          } else {
            showAlert('Não foi possível remover o item.');
          }
        } catch (error) {
          console.error('Error deleting purchase:', error);
          showError('Erro ao processar a remoção: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleDeleteBatch = (e: React.MouseEvent, items: SaleWithProduct[]) => {
    e.stopPropagation();
    const hasCompleted = items.some(i => i.status === OrderStatus.COMPLETED);
    const hasPending = items.some(i => i.status !== OrderStatus.COMPLETED);
    
    let msg = `Deseja remover estes ${items.length} itens do seu histórico?`;
    if (hasPending && !hasCompleted) {
      msg = `Deseja remover todos os ${items.length} itens deste pedido? Você receberá um reembolso de 95% do valor total.`;
    } else if (hasCompleted && hasPending) {
      msg = `Deseja remover estes ${items.length} itens? Os pendentes serão reembolsados em 95% e os concluídos serão removidos do histórico.`;
    } else {
      msg = `Deseja remover permanentemente todos os ${items.length} registros de compra concluída deste lote?`;
    }

    showConfirm(
      msg,
      async () => {
        try {
          setLoading(true);
          const results = await Promise.all(items.map(item => {
            if (item.status === OrderStatus.COMPLETED) {
              return deleteSaleRecord(item.id);
            }
            return deletePurchase(item.id);
          }));
          const allSuccess = results.every(r => r === true);
          
          const deletedIds = items.map(i => i.id);
          setPurchases(prev => prev.filter(p => !deletedIds.includes(p.id)));
          
          if (allSuccess) {
            showSuccess(hasPending ? 'Itens removidos e reembolsos efetuados.' : 'Registros removidos com sucesso.');
          } else {
            showAlert('Alguns itens não puderam ser removidos, mas a visualização foi atualizada.');
          }
        } catch (error) {
          console.error('Error deleting batch:', error);
          showError('Erro ao processar a remoção em massa.');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Status visual mapping
  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PROCESSING:
        return { icon: <ClockIcon className="h-3.5 w-3.5" />, label: 'Processando', color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case OrderStatus.SHIPPING:
        return { icon: <TruckIcon className="h-3.5 w-3.5" />, label: 'Em Trânsito', color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case OrderStatus.DELIVERED:
        return { icon: <CheckCircleIcon className="h-3.5 w-3.5" />, label: 'Entregue', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case OrderStatus.COMPLETED:
        return { icon: <CheckCircleIcon className="h-3.5 w-3.5" />, label: 'Concluído', color: 'text-teal-600', bg: 'bg-teal-600/10' };
      case OrderStatus.DISPUTED:
        return { icon: <ExclamationCircleIcon className="h-3.5 w-3.5" />, label: 'Em Disputa', color: 'text-red-500', bg: 'bg-red-500/10' };
      case OrderStatus.CANCELED:
        return { icon: <XCircleIcon className="h-3.5 w-3.5" />, label: 'Cancelado', color: 'text-gray-500', bg: 'bg-gray-500/10' };
      case OrderStatus.WAITLIST:
        return { icon: <ClockIcon className="h-3.5 w-3.5" />, label: 'Em Lista de Espera', color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
      default:
        return { icon: <ClockIcon className="h-3.5 w-3.5" />, label: status || 'Pendente', color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  // Filter & Search computation
  const filteredPurchases = useMemo(() => {
    let list = filter === 'ALL' 
      ? purchases 
      : purchases.filter(p => p.status === filter);
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.product?.name && p.product.name.toLowerCase().includes(query)) ||
        (p.id && p.id.toLowerCase().includes(query)) ||
        (p.carrierName && p.carrierName.toLowerCase().includes(query))
      );
    }
    return list;
  }, [purchases, filter, searchQuery]);

  // Group purchases by Batch ID or approximate timestamp bucket (10-min block)
  const groupedPurchases = useMemo(() => {
    const groups: Record<string, SaleWithProduct[]> = {};
    filteredPurchases.forEach(purchase => {
      const groupKey = purchase.batchId || `legacy-${Math.floor(purchase.timestamp / 600000) * 600000}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(purchase);
    });
    
    return Object.entries(groups).sort((a, b) => {
      const timeA = Math.max(...a[1].map(p => p.timestamp));
      const timeB = Math.max(...b[1].map(p => p.timestamp));
      return timeB - timeA;
    });
  }, [filteredPurchases]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen pb-24 text-gray-900 dark:text-gray-100">
      {/* Container Principal com Padding Responsivo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        
        {/* Header - Totalmente Responsivo & Reestruturado para Telas Menores */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-gray-150 dark:border-white/5">
          <div className="space-y-1">
            <span className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-[0.25em] text-[10px]">
              Seu Histórico Comercial
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-950 to-gray-700 dark:from-white dark:to-zinc-400">
              Minhas Compras
            </h2>
          </div>
          
          {/* Ações de Limpeza de Lixo / Histórico e Botão Recarregar */}
          <div className="flex flex-wrap items-center gap-2">
            {purchases.some(p => p.status === OrderStatus.COMPLETED) && (
              <button 
                onClick={() => {
                  showConfirm(
                    "Deseja EXCLUIR permanentemente todos os registros de compras concluídas do seu histórico visual?",
                    async () => {
                      try {
                        setLoading(true);
                        await adminPurgeSales(currentUser.id, true, false, true);
                        showSuccess("Histórico de compras concluídas limpo!");
                        window.location.reload(); 
                      } catch (err) {
                        showError("Erro ao limpar histórico.");
                      } finally {
                        setLoading(false);
                      }
                    }
                  );
                }}
                className="flex items-center gap-2 px-5 py-3 sm:py-2.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm border border-emerald-500/25 active:scale-95"
              >
                Limpar Concluídos
              </button>
            )}
            {purchases.some(p => p.status !== OrderStatus.COMPLETED) && (
              <button 
                onClick={() => {
                  showConfirm(
                    "Deseja EXCLUIR permanentemente todos os pedidos pendentes? Esta ação limpará seu histórico de duplicatas e pedidos não finalizados.",
                    async () => {
                      try {
                        setLoading(true);
                        await adminPurgeSales(currentUser.id, true);
                        showSuccess("Histórico de pedidos pendentes limpo!");
                        window.location.reload(); 
                      } catch (err) {
                        showError("Erro ao limpar pedidos.");
                      } finally {
                        setLoading(false);
                      }
                    }
                  );
                }}
                className="flex items-center gap-2 px-5 py-3 sm:py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm border border-red-500/25 active:scale-95"
              >
                Limpar Pendentes
              </button>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-150 dark:hover:bg-white/10 transition-all border border-gray-100 dark:border-white/5 active:rotate-180 duration-700 flex items-center justify-center shadow-sm"
              title="Atualizar dados"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros Inteligentes & Busca - Perfeita Adaptabilidade para Telas Menores */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          
          {/* Pesquisa Integrada */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <MagnifyingGlassIcon className="h-4.5 w-4.5 text-gray-400 dark:text-zinc-500" />
            </span>
            <input
              type="text"
              placeholder="Pesquisar por nome do produto, ID ou transportadora..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-xs sm:text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-[#131724] focus:ring-4 focus:ring-blue-500/10 transition-all dark:border-white/5 shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-black uppercase text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filtros de Status em Sliding Track */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none scroll-smooth">
            {['ALL', OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.COMPLETED].map((s) => {
              const isSelected = filter === s;
              const label = s === 'ALL' ? 'Todos' : getStatusInfo(s as OrderStatus).label;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s as any)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 border ${
                    isSelected 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 font-black scale-102' 
                      : 'bg-white dark:bg-darkcard text-gray-500 dark:text-zinc-400 border-gray-150 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.02] shadow-sm'
                  }`}
                >
                  {s !== 'ALL' && (
                    <span className={isSelected ? 'text-white' : getStatusInfo(s as OrderStatus).color}>
                      {getStatusInfo(s as OrderStatus).icon}
                    </span>
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Estatístico Real-Time - Bento Grid Premium */}
        {!loading && purchases.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-darkcard dark:to-[#161a28] rounded-[2.25rem] p-5 border border-gray-150 dark:border-white/5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex-shrink-0">
                <ShoppingBagIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Total de Pedidos</p>
                <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {groupedPurchases.length} <span className="text-xs text-gray-400 font-bold lowercase">lotes</span>
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-darkcard dark:to-[#161a28] rounded-[2.25rem] p-5 border border-gray-150 dark:border-white/5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex-shrink-0">
                <ShoppingBagIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Total Investido</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                  {purchases.reduce((acc, p) => acc + p.saleAmount, 0).toLocaleString('pt')} <span className="text-xs font-black font-mono">KZ</span>
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-darkcard dark:to-[#161a28] rounded-[2.25rem] p-5 border border-gray-150 dark:border-white/5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-2xl flex-shrink-0">
                <TruckIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Itens Comprados</p>
                <p className="text-xl sm:text-2xl font-black text-amber-500 leading-tight">
                  {purchases.length} <span className="text-xs text-gray-400 font-bold lowercase">unidades</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista Principal de Pedidos */}
        <div className="space-y-8">
          {loading ? (
            /* Skeleton Loader Shimmer */
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-darkcard rounded-[2.5rem] p-6 animate-pulse border border-gray-150 dark:border-white/5 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/5">
                  <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/6" />
                </div>
                <div className="flex gap-6">
                  <div className="w-20 h-20 bg-gray-200 dark:bg-white/10 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))
          ) : groupedPurchases.length > 0 ? (
            <div className="grid grid-cols-1 gap-10">
              {groupedPurchases.map(([groupKey, items]) => {
                const groupTimestamp = Math.max(...items.map(p => p.timestamp));
                const totalOrderAmount = items.reduce((sum, item) => sum + item.saleAmount, 0);
                
                return (
                  <div 
                    key={groupKey} 
                    className="bg-white dark:bg-darkcard rounded-[2.5rem] border border-gray-150 dark:border-white/5 shadow-md p-5 sm:p-7 space-y-6 hover:shadow-lg transition-all"
                  >
                    {/* Header do Grupo de Pedidos - Altamente adaptável para Mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-150 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap text-gray-400 dark:text-zinc-500">
                            <span className="text-[10px] font-black uppercase tracking-wider">
                              LOTE: #{groupKey.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-gray-300 dark:text-zinc-750 hidden sm:inline">•</span>
                            <span className="text-[10px] font-bold">
                              {formatDate(groupTimestamp)}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mt-0.5">
                            {items.length} {items.length === 1 ? 'Produto Adquirido' : 'Produtos no Lote'}
                          </h4>
                        </div>
                      </div>
                      
                      {/* Lado Direito do Header: Totais e Controles Coletivos */}
                      <div className="flex flex-wrap sm:flex-col justify-between sm:text-right gap-3 items-center sm:items-end">
                        <div>
                          <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Total Investido</p>
                          <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                            {totalOrderAmount.toLocaleString('pt')} KZ
                          </p>
                        </div>
                        
                        {/* Ações Coletivas por Pedido */}
                        {items.length > 1 && (
                          <div className="flex gap-2 flex-wrap">
                            {items.some(i => i.status !== OrderStatus.COMPLETED) && (
                              <button 
                                onClick={(e) => handleDeleteBatch(e, items.filter(i => i.status !== OrderStatus.COMPLETED))}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest rounded-xl shadow-inner border border-red-500/10"
                              >
                                <TrashIcon className="h-3 w-3" />
                                Limpar Pendentes
                              </button>
                            )}
                            {items.some(i => i.status === OrderStatus.COMPLETED) && (
                              <button 
                                onClick={(e) => handleDeleteBatch(e, items.filter(i => i.status === OrderStatus.COMPLETED))}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest rounded-xl shadow-inner border border-emerald-500/10"
                              >
                                <TrashIcon className="h-3 w-3" />
                                Limpar Concluídos
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lista dos Itens Integrantes do Pedido */}
                    <div className="divide-y divide-gray-150 dark:divide-white/5 space-y-6">
                      {items.map((sale, saleIdx) => {
                        const statusInfo = getStatusInfo(sale.status);
                        return (
                          <motion.div
                            key={sale.id}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col md:flex-row gap-5 ${saleIdx > 0 ? 'pt-6' : ''}`}
                          >
                            {/* thumbnail fixo para evitar esticar em telas menores */}
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-gray-50 dark:bg-black/20 rounded-2.5xl overflow-hidden border border-gray-100 dark:border-white/5 shadow-inner">
                              <img 
                                src={sale.product?.imageUrls[0] || DEFAULT_PRODUCT_IMG} 
                                alt={sale.product?.name || 'Vazio'} 
                                onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMG; }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className={`absolute top-2 left-2 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg ${statusInfo.bg} ${statusInfo.color} backdrop-blur-md border border-white/5`}>
                                {statusInfo.icon}
                                {statusInfo.label}
                              </div>
                            </div>

                            {/* Informações detalhadas do Item */}
                            <div className="flex-1 flex flex-col justify-between space-y-4 md:space-y-0">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                      REGISTRO #{sale.id.slice(-6).toUpperCase()}
                                    </p>
                                    <h3 
                                      onClick={() => onNavigate('product-detail', { productId: sale.productId })}
                                      className="text-lg font-black text-gray-900 dark:text-white tracking-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase leading-tight mt-0.5"
                                    >
                                      {sale.product?.name || 'Item Carregando...'}
                                    </h3>
                                  </div>
                                  <span className="text-sm font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                                    {(sale.saleAmount).toLocaleString('pt')} KZ
                                  </span>
                                </div>

                                {/* Informações de Envio ou Formato do Produto */}
                                <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-gray-500 dark:text-zinc-450 font-bold">
                                  {sale.product?.type === ProductType.PHYSICAL ? (
                                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-150/45 dark:border-white/5">
                                      <MapPinIcon className="h-4 w-4 text-blue-500" />
                                      <span>Envio por: <strong className="text-gray-800 dark:text-zinc-250 font-black">{sale.carrierName || 'Expresso Local'}</strong></span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-xl border border-purple-500/10">
                                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                      <span>Formato Digital (Instantâneo)</span>
                                    </div>
                                  )}
                                </div>

                                {/* Barra de Progresso do Envio (Progress Stepper) - Ultra Premium */}
                                <div className="mt-4 p-4 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-150/40 dark:border-white/5 rounded-2xl">
                                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-gray-400 dark:text-zinc-500 mb-2 tracking-wider">
                                    <span>Status de Entrega</span>
                                    <span className={`${statusInfo.color} font-black`}>{statusInfo.label}</span>
                                  </div>
                                  
                                  {/* Linha Fina com Preenchimento */}
                                  <div className="relative w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                                    <div 
                                      className={`h-full transition-all duration-700 ${
                                        sale.status === OrderStatus.PROCESSING ? 'w-[33%] bg-blue-500' :
                                        sale.status === OrderStatus.SHIPPING ? 'w-[66%] bg-orange-500' :
                                        (sale.status === OrderStatus.DELIVERED || sale.status === OrderStatus.COMPLETED) ? 'w-full bg-emerald-500' :
                                        sale.status === OrderStatus.DISPUTED ? 'w-full bg-red-500' :
                                        sale.status === OrderStatus.CANCELED ? 'w-[20%] bg-zinc-500' :
                                        'w-[10%] bg-blue-500'
                                      }`} 
                                    />
                                  </div>

                                  {/* Legendas Embaixo */}
                                  <div className="flex justify-between mt-2 text-[8px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                                    <span className={sale.status === OrderStatus.PROCESSING ? 'text-blue-500 dark:text-blue-400 font-extrabold shadow-sm' : ''}>Processando</span>
                                    <span className={sale.status === OrderStatus.SHIPPING ? 'text-orange-500 dark:text-orange-400 font-extrabold shadow-sm' : ''}>Em Trânsito</span>
                                    <span className={(sale.status === OrderStatus.DELIVERED || sale.status === OrderStatus.COMPLETED) ? 'text-emerald-500 dark:text-emerald-400 font-extrabold shadow-sm' : ''}>Entregue</span>
                                  </div>
                                </div>
                              </div>

                              {/* Ações Inteligentes - Totalmente Adaptadas a Telas Menores (< 786px) como Botões Grandes */}
                              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                <button 
                                  onClick={() => onNavigate('product-detail', { productId: sale.productId })}
                                  className="flex-1 px-4 py-3 sm:py-2.5 bg-blue-500/10 hover:bg-blue-600 text-blue-600 hover:text-white dark:text-blue-400 dark:hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm border border-blue-500/10 text-center min-h-[44px] flex items-center justify-center font-sans"
                                >
                                  Ver Produto
                                </button>
                                <button 
                                  onClick={() => onNavigate('chat', { targetUserId: sale.sellerId })} 
                                  className="flex-1 px-4 py-3 sm:py-2.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-gray-150/70 dark:border-white/5 text-center min-h-[44px] flex items-center justify-center font-sans"
                                >
                                  Falar Vendedor
                                </button>
                                <button 
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(e, sale.id, sale.status); }} 
                                  className={`px-6 py-3 sm:py-2.5 ${
                                    sale.status === OrderStatus.COMPLETED 
                                      ? 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border-emerald-500/10' 
                                      : 'bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white border-red-500/10'
                                  } rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 min-h-[44px] flex items-center justify-center gap-1.5 border shadow-sm`}
                                  title={sale.status === OrderStatus.COMPLETED ? "Limpar do histórico" : "Excluir e reaver reembolso"}
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  <span>{sale.status === OrderStatus.COMPLETED ? 'Limpar Histórico' : 'Remover'}</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Estado Vazio Refinado */
            <div className="py-20 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-6 border border-gray-150 dark:border-white/5 shadow-inner">
                <ShoppingBagIcon className="h-10 w-10 text-gray-300 dark:text-zinc-650 animate-bounce" />
              </div>
              <h3 className="text-xl font-black text-gray-950 dark:text-white uppercase tracking-tight">
                Nenhuma compra encontrada
              </h3>
              <p className="text-gray-500 dark:text-zinc-450 font-medium text-xs mt-2 leading-relaxed">
                Você ainda não realizou compras com esses filtros. Explore nossa vitrine de produtos e garanta o seu!
              </p>
              <button 
                onClick={() => onNavigate('store')}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-[1.75rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all duration-300"
              >
                Ir para a Loja
              </button>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default PurchasesPage;
