import React, { useState, useEffect } from 'react';
import { User, EarningRecord, AffiliateSale, Product, OrderStatus, AffiliateLink } from '../types';
import { monetizationService } from '../services/monetizationService';
import { getAffiliateLinks, getSalesByAffiliateId, getProducts } from '../services/storageService';
import { 
  UsersIcon, 
  ArrowUpRightIcon, 
  GiftIcon, 
  ShoppingBagIcon,
  LinkIcon,
  ClipboardIcon,
  CheckIcon,
  ChartBarIcon,
  TagIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  CurrencyDollarIcon,
  PencilIcon,
  ShareIcon,
  UserCircleIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { saveAffiliateLink, removeAffiliateLink, updateUserProfile } from '../services/storageService';

interface AffiliatesPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: Record<string, string>) => void;
}

const AffiliatesPage: React.FC<AffiliatesPageProps> = ({ currentUser, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'marketplace' | 'showcase' | 'sales' | 'settings'>('dashboard');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [resellerName, setResellerName] = useState(currentUser.resellerName || '');
  const [resellerBio, setResellerBio] = useState(currentUser.resellerBio || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const [affStats, setAffStats] = useState({
    clicks: 0,
    conversions: 0,
    earnings: 0,
    pendingEarnings: 0
  });
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<AffiliateSale[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/?page=auth&mode=signup&ref=${currentUser.id}`;

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCreateAffiliateLink = async (productId: string, sellerId: string) => {
    const link = `${window.location.origin}/?page=store&productId=${productId}&affiliateId=${currentUser.id}`;
    await saveAffiliateLink(currentUser.id, productId, link, sellerId);
    // Refresh links
    const updatedLinks = await getAffiliateLinks(currentUser.id);
    setAffiliateLinks(updatedLinks);
  };

  const handleRemoveLink = async (linkId: string) => {
    if (confirm('Tem certeza que deseja remover este produto da sua vitrine?')) {
      await removeAffiliateLink(linkId);
      const updatedLinks = await getAffiliateLinks(currentUser.id);
      setAffiliateLinks(updatedLinks);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile(currentUser.id, {
        resellerName,
        resellerBio
      });
      alert('Configurações da vitrine salvas com sucesso!');
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const vitrineLink = `${window.location.origin}/?page=dropshipping-store&resellerId=${currentUser.id}`;

  useEffect(() => {
    const loadAffiliateStats = async () => {
        setLoading(true);
        try {
            const [links, allProducts, affiliateSales] = await Promise.all([
                getAffiliateLinks(currentUser.id),
                getProducts(),
                getSalesByAffiliateId(currentUser.id)
            ]);
            
            setAffiliateLinks(links);
            setProducts(allProducts);
            setSales(affiliateSales);

            const totalEarnings = affiliateSales.reduce((acc, s) => acc + (s.affiliateEarnings || 0), 0);
            const pendingEarnings = affiliateSales
                .filter(s => !s.fundsReleased)
                .reduce((acc, s) => acc + (s.affiliateEarnings || 0), 0);
            
            const totalClicks = links.reduce((acc, l) => acc + (l.clicks || 0), 0);
            
            setAffStats({
                clicks: totalClicks,
                conversions: affiliateSales.length,
                earnings: totalEarnings,
                pendingEarnings: pendingEarnings
            });
        } catch (err) {
            console.error("Erro ao carregar dados de afiliado:", err);
        } finally {
            setLoading(false);
        }
    };
    loadAffiliateStats();
  }, [currentUser.id]);

  const marketplaceProducts = products.filter(p => 
    p.affiliateCommissionRate > 0 && 
    p.status === 'active' &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (categoryFilter === 'Todas' || p.category === categoryFilter)
  );

  const myShowcaseIds = new Set(affiliateLinks.map(l => l.productId));
  const categoriesList = Array.from(new Set(['Todas', ...products.map(p => p.category).filter(Boolean)]));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Central do Parceiro</h1>
           <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Transforme sua influência em lucro real</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border dark:border-white/10">
           {[
             { id: 'dashboard', label: 'Início', icon: ChartBarIcon },
             { id: 'marketplace', label: 'Mercado', icon: BuildingStorefrontIcon },
             { id: 'showcase', label: 'Minha Vitrine', icon: TagIcon },
             { id: 'sales', label: 'Vendas', icon: CurrencyDollarIcon },
             { id: 'settings', label: 'Configurar', icon: PencilIcon }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-brand text-brand dark:text-white shadow-xl scale-105' : 'text-gray-500 hover:text-brand'}`}
             >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="bg-gradient-to-br from-indigo-900 to-brand p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
             <div className="relative z-10">
                <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Seu Império Começa Aqui</h1>
                <p className="text-indigo-100 font-bold max-w-md text-lg">Selecione produtos no mercado, adicione à sua vitrine e ganhe comissão sobre cada venda efetuada através dos seus links.</p>
                <button 
                  onClick={() => setActiveTab('marketplace')}
                  className="mt-8 px-10 py-4 bg-white text-brand rounded-2xl font-black uppercase text-xs shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Explorar Mercado
                </button>
             </div>
             <div className="absolute -right-20 -bottom-20 opacity-20 transform rotate-12">
                <ShoppingBagIcon className="w-80 h-80" />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
                <ArrowUpRightIcon className="h-8 w-8 text-blue-500 mb-4" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest"> Cliques Reais</p>
                <p className="text-3xl font-black dark:text-white">{affStats.clicks}</p>
             </div>
             <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
                <UsersIcon className="h-8 w-8 text-green-500 mb-4" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Vendas</p>
                <p className="text-3xl font-black dark:text-white">{affStats.conversions}</p>
             </div>
             <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
                <CurrencyDollarIcon className="h-8 w-8 text-orange-500 mb-4" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Em Custódia</p>
                <p className="text-3xl font-black text-orange-500 tracking-tighter">${affStats.pendingEarnings.toFixed(2)}</p>
             </div>
             <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
                <GiftIcon className="h-8 w-8 text-brand mb-4" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Liberado</p>
                <p className="text-3xl font-black text-brand tracking-tighter">${(affStats.earnings - affStats.pendingEarnings).toFixed(2)}</p>
             </div>
          </div>

          <div className="bg-white dark:bg-darkcard p-10 rounded-[3rem] border dark:border-white/10">
             <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                <ClipboardIcon className="h-6 w-6 text-brand" />
                Seu Link de Convite (Plataforma)
             </h3>
             <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-100 dark:bg-white/5 rounded-3xl border dark:border-white/10">
                <code className="flex-1 font-mono text-sm dark:text-gray-300 break-all p-2">{referralLink}</code>
                <button 
                  onClick={() => copyLink(referralLink)}
                  className={`p-4 px-8 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${copiedLink === referralLink ? 'bg-green-600 text-white' : 'bg-brand text-white'}`}
                >
                   {copiedLink === referralLink ? <><CheckIcon className="h-4 w-4" /> Copiado</> : 'Copiar Link'}
                </button>
             </div>
             <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
               Ganhe comissão sobre cada assinatura premium e taxas de transação dos usuários que você indicar.
             </p>
          </div>
        </>
      )}

      {activeTab === 'marketplace' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
           <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 group">
                 <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand transition-colors" />
                 <input 
                   type="text" 
                   placeholder="BUSCAR PRODUTOS PARA REVENDA..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-12 pr-4 py-4 bg-white dark:bg-darkcard border dark:border-white/10 rounded-2xl font-black text-xs uppercase focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                 />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                 {categoriesList.slice(0, 10).map(cat => (
                   <button
                     key={cat}
                     onClick={() => setCategoryFilter(cat)}
                     className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${categoryFilter === cat ? 'bg-brand text-white shadow-lg' : 'bg-white dark:bg-darkcard text-gray-500 border dark:border-white/10 hover:border-brand/50'}`}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {marketplaceProducts.map(product => {
                const isAffiliated = myShowcaseIds.has(product.id);
                return (
                  <div key={product.id} className="bg-white dark:bg-darkcard rounded-[2.5rem] border dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                     <div className="aspect-square relative overflow-hidden">
                        <img src={product.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-110 transition-duration-700" />
                        <div className="absolute top-4 left-4">
                           <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              <p className="text-[10px] font-black text-white uppercase">{product.affiliateCommissionRate}% Comissão</p>
                           </div>
                        </div>
                     </div>
                     <div className="p-6">
                        <p className="text-[8px] font-black text-brand uppercase tracking-widest mb-1">{product.category}</p>
                        <h4 className="font-black text-sm dark:text-white uppercase truncate mb-1">{product.name}</h4>
                        <p className="text-gray-500 font-bold text-xs truncate mb-4">{product.description}</p>
                        
                        <div className="flex items-center justify-between mb-6">
                           <div>
                              <p className="text-[8px] font-black text-gray-400 uppercase">Preço de Venda</p>
                              <p className="text-lg font-black dark:text-white">${product.price.toFixed(2)}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[8px] font-black text-green-500 uppercase">Seu Ganho</p>
                              <p className="text-lg font-black text-green-500 uppercase">${(product.price * product.affiliateCommissionRate / 100).toFixed(2)}</p>
                           </div>
                        </div>

                        {isAffiliated ? (
                          <div className="flex gap-2">
                             <button className="flex-1 py-4 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 cursor-default">
                                <CheckIcon className="h-4 w-4" /> Já na Vitrine
                             </button>
                             <button 
                               onClick={() => setActiveTab('showcase')}
                               className="p-4 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl hover:text-brand transition-colors"
                             >
                                <EyeIcon className="h-4 w-4" />
                             </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleCreateAffiliateLink(product.id, product.userId)} // sellerId is product.userId
                            className="w-full py-4 bg-brand text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-brand/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                             <PlusIcon className="h-4 w-4" /> Adicionar à Minha Vitrine
                          </button>
                        )}
                     </div>
                  </div>
                );
              })}
              {marketplaceProducts.length === 0 && (
                <div className="col-span-full py-20 text-center">
                   <ShoppingBagIcon className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                   <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Nenhum produto encontrado no mercado.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'showcase' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Minha Vitrine de Consultor ({affiliateLinks.length})</h3>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest hidden sm:block">Monitore o desempenho de cada link</p>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              {affiliateLinks.map((link) => {
                const product = products.find(p => p.id === link.productId);
                if (!product) return null;
                return (
                  <div key={link.id} className="bg-white dark:bg-darkcard p-6 rounded-[2.5rem] border dark:border-white/10 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                     <img src={product.imageUrls[0]} className="w-24 h-24 rounded-2xl object-cover shrink-0" />
                     <div className="flex-1 text-center md:text-left min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                           <h4 className="font-black text-sm dark:text-white uppercase truncate">{product.name}</h4>
                           <span className="bg-brand/10 text-brand px-3 py-1 rounded-full text-[8px] font-black uppercase inline-block mx-auto md:mx-0">
                             {product.affiliateCommissionRate}% Comissão
                           </span>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border dark:border-white/5 mb-4">
                           <p className="text-[10px] font-mono text-gray-500 break-all">{link.link}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                           <button 
                             onClick={() => copyLink(link.link)}
                             className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${copiedLink === link.link ? 'bg-green-600 text-white' : 'bg-brand text-white hover:scale-105 shadow-brand/20 shadow-lg'}`}
                           >
                              {copiedLink === link.link ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                              {copiedLink === link.link ? 'Link Copiado' : 'Copiar Link de Venda'}
                           </button>
                           <button 
                             onClick={() => onNavigate('dropshipping-store', { resellerId: currentUser.id })}
                             className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 transition-all flex items-center gap-2"
                           >
                              <EyeIcon className="h-4 w-4" /> Visualizar Página
                           </button>
                           <button 
                             className="p-3 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                             onClick={() => handleRemoveLink(link.id)}
                             title="Remover da Vitrine"
                           >
                              <TrashIcon className="h-5 w-5" />
                           </button>
                        </div>
                     </div>
                     <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-[2.5rem] min-w-[200px] text-center border dark:border-white/5">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rendimento</p>
                        <p className="text-2xl font-black dark:text-white">${sales.filter(s => s.productId === product.id).reduce((acc, s) => acc + (s.affiliateEarnings || 0), 0).toFixed(2)}</p>
                        <div className="flex items-center justify-center gap-4 mt-2 border-t dark:border-white/5 pt-2">
                           <div>
                              <p className="text-[8px] font-black text-gray-400 uppercase">Cliques</p>
                              <p className="text-xs font-black dark:text-white">{link.clicks || 0}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-gray-400 uppercase">Vendas</p>
                              <p className="text-xs font-black dark:text-white">{sales.filter(s => s.productId === product.id).length}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                );
              })}
              {affiliateLinks.length === 0 && (
                <div className="py-40 text-center">
                   <TagIcon className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                   <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-2">Sua Vitrine está vazia</h3>
                   <p className="text-gray-500 font-bold text-xs uppercase mb-8">Vá ao mercado e adicione produtos para começar a lucrar.</p>
                   <button 
                     onClick={() => setActiveTab('marketplace')}
                     className="px-10 py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
                   >
                     Ir para o Mercado
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-darkcard rounded-[3rem] border dark:border-white/10 overflow-hidden shadow-sm">
             <div className="p-8 border-b dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-3">
                   <ChartBarIcon className="h-6 w-6 text-blue-500" />
                   Histórico de Comissões
                </h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-gray-100 dark:bg-white/5">
                         <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                         <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Venda</th>
                         <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sua Comissão</th>
                         <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                         <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y dark:divide-white/5">
                      {sales.map(sale => {
                         const p = products.find(prod => prod.id === sale.productId);
                         return (
                            <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                               <td className="px-8 py-4">
                                  <div className="flex items-center gap-3">
                                     <img src={p?.imageUrls[0]} className="w-8 h-8 rounded-lg object-cover" />
                                     <p className="font-black text-xs dark:text-white uppercase truncate max-w-[200px]">{p?.name || 'Produto Removido'}</p>
                                  </div>
                               </td>
                               <td className="px-8 py-4 text-xs font-bold dark:text-gray-300">
                                  ${sale.saleAmount.toFixed(2)}
                               </td>
                               <td className="px-8 py-4">
                                  <span className="text-brand font-black text-sm tracking-tighter">+${(sale.affiliateEarnings || 0).toFixed(2)}</span>
                               </td>
                               <td className="px-8 py-4">
                                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    sale.status === OrderStatus.DELIVERED || sale.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-600' : 
                                    sale.status === OrderStatus.SHIPPING ? 'bg-blue-100 text-blue-600' : 
                                    'bg-orange-100 text-orange-600'
                                  }`}>
                                    {sale.status === OrderStatus.DELIVERED || sale.status === OrderStatus.COMPLETED ? 'Concluída' : sale.status === OrderStatus.SHIPPING ? 'Enviada' : 'Em Processamento'}
                                  </span>
                               </td>
                               <td className="px-8 py-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                  {new Date(sale.timestamp).toLocaleDateString()}
                               </td>
                            </tr>
                         );
                      })}
                      {sales.length === 0 && (
                        <tr>
                           <td colSpan={5} className="py-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">Você ainda não realizou nenhuma venda como afiliado.</td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="bg-white dark:bg-darkcard p-10 rounded-[3rem] border dark:border-white/10 shadow-sm max-w-2xl mx-auto">
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <UserCircleIcon className="h-6 w-6 text-brand" />
                 Personalizar Minha Vitrine
              </h3>
              
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nome da Sua Loja</label>
                    <input 
                      type="text" 
                      value={resellerName}
                      onChange={(e) => setResellerName(e.target.value)}
                      placeholder="Ex: CyberPhone Elite - Suporte"
                      className="w-full p-4 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Bio / Slogan da Loja</label>
                    <textarea 
                      value={resellerBio}
                      onChange={(e) => setResellerBio(e.target.value)}
                      rows={4}
                      placeholder="Conte um pouco sobre sua curadoria de produtos..."
                      className="w-full p-4 bg-gray-50 dark:bg-white/5 border dark:border-white/5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-brand/50 transition-all"
                    />
                 </div>

                 <div className="p-6 bg-brand/5 rounded-[2rem] border border-brand/10">
                    <div className="flex items-center justify-between mb-4">
                       <h4 className="text-xs font-black text-brand uppercase tracking-widest">Seu Link Público de Consultor</h4>
                       <button 
                         onClick={() => copyLink(vitrineLink)}
                         className="p-2 bg-brand text-white rounded-lg"
                       >
                          <ShareIcon className="h-4 w-4" />
                       </button>
                    </div>
                    <code className="text-[10px] font-mono text-gray-500 break-all">{vitrineLink}</code>
                 </div>

                 <button 
                   onClick={handleSaveSettings}
                   disabled={isSaving}
                   className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                 >
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-10 bg-brand/5 rounded-[3rem] border border-brand/20 mt-12">
         <div>
            <h3 className="text-2xl font-black dark:text-white uppercase mb-4">Como funciona?</h3>
            <ul className="space-y-4">
               {[
                 { icon: UsersIcon, text: "Compartilhe seu link único com sua rede." },
                 { icon: ShoppingBagIcon, text: "Eles se cadastram e começam a usar a CyberPhone." },
                 { icon: GiftIcon, text: "Você recebe comissões vitalícias em dinheiro direto na sua conta." }
               ].map((item, i) => (
                 <li key={i} className="flex items-start gap-4">
                    <div className="p-2 bg-brand/10 rounded-xl">
                       <item.icon className="h-5 w-5 text-brand" />
                    </div>
                    <p className="text-gray-500 font-bold text-sm leading-relaxed">{item.text}</p>
                 </li>
               ))}
            </ul>
         </div>
         <div className="relative group">
            <div className="absolute inset-0 bg-brand blur-3xl opacity-10 group-hover:opacity-20 transition-all"></div>
            <img 
               src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800" 
               className="rounded-[2rem] shadow-2xl relative border border-white/10"
            />
         </div>
      </div>
    </div>
  );
};

export default AffiliatesPage;
