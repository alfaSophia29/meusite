
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
  ChatBubbleBottomCenterTextIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';
import { motion } from 'motion/react';
import { useDialog } from '../services/DialogContext';

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
            showSuccess(isCompleted ? 'Registro removido do histórico com sucesso!' : 'Item removido e reembolso de 95% processado para sua carteira.');
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
      msg = `Deseja remover permanentemente todos os ${items.length} registros de compra concluída deste lote do seu histórico?`;
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
            showSuccess(hasPending ? 'Itens removidos e reembolsos processados.' : 'Registros removidos do histórico com sucesso.');
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

  const filteredPurchases = filter === 'ALL' 
    ? purchases 
    : purchases.filter(p => p.status === filter);

  const getStatusInfo = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PROCESSING:
        return { icon: <ClockIcon className="h-4 w-4" />, label: 'Processando', color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case OrderStatus.SHIPPING:
        return { icon: <TruckIcon className="h-4 w-4" />, label: 'Em Trânsito', color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case OrderStatus.DELIVERED:
        return { icon: <CheckCircleIcon className="h-4 w-4" />, label: 'Entregue', color: 'text-green-500', bg: 'bg-green-500/10' };
      case OrderStatus.COMPLETED:
        return { icon: <CheckCircleIcon className="h-4 w-4" />, label: 'Concluído', color: 'text-green-600', bg: 'bg-green-600/10' };
      case OrderStatus.DISPUTED:
        return { icon: <ExclamationCircleIcon className="h-4 w-4" />, label: 'Em Disputa', color: 'text-red-500', bg: 'bg-red-500/10' };
      case OrderStatus.CANCELED:
        return { icon: <XCircleIcon className="h-4 w-4" />, label: 'Cancelado', color: 'text-gray-500', bg: 'bg-gray-500/10' };
      case OrderStatus.WAITLIST:
        return { icon: <ClockIcon className="h-4 w-4" />, label: 'Aguardando', color: 'text-orange-500', bg: 'bg-orange-500/10' };
      default:
        return { icon: <ClockIcon className="h-4 w-4" />, label: status || 'Pendente', color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const groupedPurchases = useMemo(() => {
    const groups: Record<string, SaleWithProduct[]> = {};
    filteredPurchases.forEach(purchase => {
      // Use batchId if available, fallback to a 10-minute bucket for legacy orders to ensure better grouping
      const groupKey = purchase.batchId || `legacy-${Math.floor(purchase.timestamp / 600000) * 600000}`;
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(purchase);
    });
    
    // Sort by the latest timestamp in each group
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
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-1">Seu Histórico</p>
            <h2 className="text-3xl font-black uppercase text-gray-900 dark:text-white tracking-tighter">Minhas Compras</h2>
          </div>
          
          <div className="flex items-center gap-3">
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
                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all"
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
                className="px-6 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 transition-all"
              >
                Limpar Pendentes
              </button>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="p-3 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-all border border-white/5 active:rotate-180 duration-500"
              title="Atualizar dados"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {['ALL', OrderStatus.PROCESSING, OrderStatus.SHIPPING, OrderStatus.DELIVERED, OrderStatus.COMPLETED].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s as any)}
                  className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    filter === s 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                      : 'bg-white dark:bg-darkcard text-gray-500 border border-gray-100 dark:border-white/5'
                  }`}
                >
                  {s === 'ALL' ? 'Todos' : getStatusInfo(s as OrderStatus).label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && purchases.length > 0 && (
        <div className="px-6 md:px-10 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 dark:border-white/5">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Pedidos</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{groupedPurchases.length}</p>
          </div>
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 dark:border-white/5">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Investido</p>
            <p className="text-2xl font-black text-blue-600">
               {purchases.reduce((acc, p) => acc + p.saleAmount, 0).toLocaleString('pt')} KZ
            </p>
          </div>
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 dark:border-white/5">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Itens Adquiridos</p>
            <p className="text-2xl font-black text-orange-500">{purchases.length}</p>
          </div>
        </div>
      )}

      <div className="px-6 md:px-10 space-y-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-darkcard rounded-[2.5rem] p-6 animate-pulse border border-gray-100 dark:border-white/5">
              <div className="flex gap-6">
                <div className="w-24 h-24 bg-gray-200 dark:bg-white/5 rounded-3xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-1/4" />
                  <div className="h-6 bg-gray-200 dark:bg-white/5 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : groupedPurchases.length > 0 ? (
          <div className="grid grid-cols-1 gap-12">
            {groupedPurchases.map(([groupKey, items]) => {
              const groupTimestamp = Math.max(...items.map(p => p.timestamp));
              const totalOrderAmount = items.reduce((sum, item) => sum + item.saleAmount, 0);
              
              return (
                <div key={groupKey} className="space-y-6">
                  {/* Order Header */}
                  <div className="flex items-center justify-between px-4">
                           <div className="flex items-center gap-3">
                              <div className="w-1.5 h-10 bg-blue-600 rounded-full" />
                              <div>
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Pedido em {formatDate(groupTimestamp)}</p>
                                <div className="flex items-center gap-3">
                                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{items.length} {items.length === 1 ? 'Item' : 'Itens'}</h4>
                                  {items.length > 1 && (
                                    <div className="flex gap-2">
                                      {items.some(i => i.status !== OrderStatus.COMPLETED) && (
                                        <button 
                                          onClick={(e) => handleDeleteBatch(e, items.filter(i => i.status !== OrderStatus.COMPLETED))}
                                          className="flex items-center gap-1 px-2 py-0.5 bg-red-100 hover:bg-red-500 text-red-500 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest rounded-md shadow-sm cursor-pointer relative z-20"
                                        >
                                          <TrashIcon className="h-2.5 w-2.5" />
                                          Remover Pendentes
                                        </button>
                                      )}
                                      {items.some(i => i.status === OrderStatus.COMPLETED) && (
                                        <button 
                                          onClick={(e) => handleDeleteBatch(e, items.filter(i => i.status === OrderStatus.COMPLETED))}
                                          className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest rounded-md shadow-sm cursor-pointer relative z-20"
                                        >
                                          <TrashIcon className="h-2.5 w-2.5" />
                                          Remover Concluídos
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Total do Pedido</p>
                       <p className="text-sm font-black text-blue-600">{totalOrderAmount.toLocaleString('pt')} KZ</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="grid grid-cols-1 gap-4">
                    {items.map((sale) => {
                      const statusInfo = getStatusInfo(sale.status);
                      return (
                        <motion.div
                          key={sale.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="group bg-white dark:bg-darkcard rounded-[2rem] p-5 shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-white/5 flex flex-col md:flex-row gap-5"
                        >
                          {/* Product Image */}
                          <div className="relative w-full md:w-28 h-28 flex-shrink-0">
                            {sale.product?.imageUrls[0] ? (
                              <img 
                                src={sale.product.imageUrls[0]} 
                                alt={sale.product.name} 
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 dark:bg-black/20 rounded-2xl flex items-center justify-center">
                                <ShoppingBagIcon className="h-10 w-10 text-gray-300" />
                              </div>
                            )}
                            <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg ${statusInfo.bg} ${statusInfo.color} backdrop-blur-md`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">ID #{sale.id.slice(-6).toUpperCase()}</p>
                              </div>
                              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2 group-hover:text-blue-600 transition-colors">
                                {sale.product?.name || 'Produto Carregando...'}
                              </h3>
                              
                              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-gray-500 mb-4">
                                <div className="p-1 px-2 bg-blue-500/10 text-blue-600 rounded-lg">
                                  {sale.saleAmount.toLocaleString('pt')} KZ
                                </div>
                                {sale.product?.type === ProductType.PHYSICAL ? (
                                  <div className="flex items-center gap-1.5">
                                    <MapPinIcon className="h-3.5 w-3.5 text-gray-400" />
                                    {sale.carrierName || 'Padrão'}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-purple-500">
                                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                                    Digital
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                  onClick={() => onNavigate('product-detail', { productId: sale.productId })}
                                  className="px-4 py-2 bg-brand/10 text-brand rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all"
                                >
                                  Ver Produto
                                </button>
                                <button 
                                  onClick={() => onNavigate('chat', { targetUserId: sale.sellerId })} 
                                  className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                                >
                                  Falar com Vendedor
                                </button>
                                <button 
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(e, sale.id, sale.status); }} 
                                  className={`px-6 py-3 ${sale.status === OrderStatus.COMPLETED ? 'bg-emerald-100 hover:bg-emerald-600 text-emerald-600 hover:text-white border-emerald-200' : 'bg-red-100 hover:bg-red-600 text-red-600 hover:text-white border-red-200'} rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer relative z-40 shadow-md border`}
                                  title={sale.status === OrderStatus.COMPLETED ? "Excluir do histórico" : "Remover pedido permanentemente"}
                                >
                                  <TrashIcon className="h-3 w-3" />
                                  {sale.status === OrderStatus.COMPLETED ? 'Limpar Histórico' : 'Remover'}
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
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-6">
              <ShoppingBagIcon className="h-12 w-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Nenhum pedido encontrado</h3>
            <p className="text-gray-500 font-bold text-xs mt-2 max-w-xs">Você ainda não realizou nenhuma compra. Explore nossa loja e descubra produtos incríveis!</p>
            <button 
              onClick={() => onNavigate('store')}
              className="mt-8 bg-blue-600 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Ir para a Loja
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchasesPage;
