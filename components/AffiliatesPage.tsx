
import React, { useState, useEffect, useMemo } from 'react';
import { User, AffiliateSale, Product, Store, Page } from '../types';
import { getSalesByAffiliateId, getProducts, getAffiliateLinks, saveAffiliateLink } from '../services/storageService';
import { getAoaExchangeRate } from '../services/currencyService';
import { ChartBarIcon, ClipboardDocumentCheckIcon, LinkIcon, PresentationChartLineIcon, ShoppingBagIcon, SparklesIcon, TrophyIcon, MagnifyingGlassIcon, ArrowTopRightOnSquareIcon, FireIcon } from '@heroicons/react/24/outline';
import { DEFAULT_PROFILE_PIC } from '../data/constants';

interface AffiliatesPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-darkcard p-5 rounded-2xl shadow-sm border border-gray-50 dark:border-white/5 flex items-center space-x-4">
    <div className="bg-blue-50 dark:bg-blue-600/10 text-blue-600 p-3 rounded-xl">
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
      <p className="text-xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

const AffiliatesPage: React.FC<AffiliatesPageProps> = ({ currentUser, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'market' | 'links'>('dashboard');
  const [myAffiliateSales, setMyAffiliateSales] = useState<AffiliateSale[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [myLinks, setMyLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exchangeRate, setExchangeRate] = useState(930);

  useEffect(() => {
    const fetchRate = async () => {
      const rate = await getAoaExchangeRate();
      setExchangeRate(rate);
    };
    fetchRate();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const mySales = await getSalesByAffiliateId(currentUser.id);
    setMyAffiliateSales(mySales);
    
    const products = await getProducts();
    setAllProducts(products);
    
    const links = await getAffiliateLinks(currentUser.id);
    setMyLinks(links);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const myStats = useMemo(() => {
    const totalSalesValue = myAffiliateSales.reduce((sum, sale) => sum + sale.saleAmount, 0);
    const totalCommission = myAffiliateSales.reduce((sum, sale) => sum + sale.commissionEarned, 0);
    return {
      salesCount: myAffiliateSales.length,
      totalSalesValue: `$${totalSalesValue.toFixed(2)} (≈ ${(totalSalesValue * exchangeRate).toLocaleString()} KZ)`,
      totalCommission: `$${totalCommission.toFixed(2)} (≈ ${(totalCommission * exchangeRate).toLocaleString()} KZ)`,
    };
  }, [myAffiliateSales, exchangeRate]);

  const handleGenerateLink = async (productId: string) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const link = `${window.location.origin}?page=store&storeId=${product.storeId}&productId=${productId}&affiliateId=${currentUser.id}`;
    
    await saveAffiliateLink(currentUser.id, productId, link);
    await loadData(); 
    
    navigator.clipboard.writeText(link);
    setCopiedLink(productId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        p.affiliateCommissionRate > 0
    ).sort((a, b) => b.affiliateCommissionRate - a.affiliateCommissionRate);
  }, [allProducts, searchTerm]);

  if (loading) return <div className="p-10 text-center font-black text-gray-400 uppercase tracking-widest text-[10px]">Carregando Painel...</div>;

  return (
    <div className="container mx-auto px-4 py-8 md:pt-24 animate-fade-in space-y-10 max-w-6xl">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
         <div>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Painel de Afiliados</h2>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Promova conhecimento e lucre com a comunidade</p>
         </div>
         <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-[1.5rem]">
            {[
              { id: 'dashboard', label: 'Visão Geral' },
              { id: 'market', label: 'Mercado' },
              { id: 'links', label: 'Meus Links' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab.id ? 'bg-white dark:bg-darkcard text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {tab.label}
              </button>
            ))}
         </div>
      </header>

      {activeTab === 'dashboard' && (
        <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Comissão Total" value={myStats.totalCommission} icon={<ChartBarIcon className="h-6 w-6" />} />
                <StatCard title="Vendas Realizadas" value={myStats.salesCount.toString()} icon={<ShoppingBagIcon className="h-6 w-6" />} />
                <StatCard title="Volume Transacionado" value={myStats.totalSalesValue} icon={<PresentationChartLineIcon className="h-6 w-6" />} />
            </div>

            <div className="bg-white dark:bg-darkcard rounded-[2.5rem] border border-gray-50 dark:border-white/5 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                    <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">Extrato de Comissões</h3>
                    <button onClick={() => setActiveTab('links')} className="text-blue-600 text-[10px] font-black uppercase hover:underline">Ver Links</button>
                </div>
                {myAffiliateSales.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-white/5">
                    {myAffiliateSales.map(sale => {
                        const product = allProducts.find(p => p.id === sale.productId);
                        return (
                        <div key={sale.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl text-green-600">
                                    <TrophyIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-gray-900 dark:text-white text-xs truncate max-w-[200px]">{product?.name || 'Produto Removido'}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(sale.timestamp).toLocaleDateString()} • {sale.status}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-green-600">+${sale.commissionEarned.toFixed(2)}</p>
                                <p className="text-[8px] font-black text-gray-400 uppercase">Comissão</p>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                ) : (
                    <div className="p-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Nenhuma venda registrada ainda</div>
                )}
            </div>
        </div>
      )}

      {activeTab === 'market' && (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-darkcard p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Buscar produtos para se afiliar..." 
                  className="flex-1 bg-transparent outline-none font-bold text-sm dark:text-white placeholder-gray-400"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => {
                    const isHighTicket = product.price > 100 || product.affiliateCommissionRate > 0.2;
                    return (
                        <div key={product.id} className="bg-white dark:bg-darkcard rounded-[2.5rem] shadow-lg border border-gray-100 dark:border-white/5 overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                            <div className="relative h-48 overflow-hidden">
                                <img src={product.imageUrls[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg">
                                    {(product.affiliateCommissionRate * 100).toFixed(0)}% Comissão
                                </div>
                                {isHighTicket && (
                                    <div className="absolute top-4 right-4 bg-orange-500 text-white p-1.5 rounded-full shadow-lg">
                                        <FireIcon className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <h4 className="font-black text-gray-900 dark:text-white text-sm truncate mb-1">{product.name}</h4>
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preço: ${product.price}</span>
                                    <span className="text-green-600 font-black text-sm">+${(product.price * product.affiliateCommissionRate).toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={() => handleGenerateLink(product.id)}
                                    className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                    copiedLink === product.id ? 'bg-green-600 text-white' : 'bg-gray-900 dark:bg-white dark:text-black text-white hover:bg-blue-600 dark:hover:bg-gray-200'
                                    }`}
                                >
                                    {copiedLink === product.id ? <ClipboardDocumentCheckIcon className="h-4 w-4"/> : <LinkIcon className="h-4 w-4"/>}
                                    {copiedLink === product.id ? 'Salvo em Meus Links' : 'Gerar Link'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="bg-white dark:bg-darkcard rounded-[3rem] border border-gray-50 dark:border-white/5 overflow-hidden shadow-xl animate-fade-in">
            <div className="p-8 border-b border-gray-50 dark:border-white/5">
                <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-tighter">Parcerias Ativas</h3>
            </div>
            {myLinks.length > 0 ? (
                <div className="divide-y divide-gray-50 dark:divide-white/5">
                    {myLinks.map(link => (
                        <div key={link.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-gray-50 dark:hover:bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 shrink-0 overflow-hidden border border-gray-200 dark:border-white/10">
                                    <img src={link.productImage} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-black text-sm text-gray-900 dark:text-white uppercase truncate max-w-[200px]">{link.productName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-0.5 rounded font-black uppercase">
                                            {(link.commissionRate * 100).toFixed(0)}% Com.
                                        </span>
                                        <span className="text-[9px] text-gray-400 font-bold uppercase">Gerado em: {new Date(link.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="flex-1 md:w-64 bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-[10px] font-mono text-gray-500 truncate">
                                    {link.link}
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(link.link, link.id)}
                                    className={`p-3 rounded-xl transition-all ${copiedLink === link.id ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-blue-600 hover:text-white'}`}
                                >
                                    {copiedLink === link.id ? <ClipboardDocumentCheckIcon className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
                                </button>
                                <button 
                                    onClick={() => window.open(link.link, '_blank')}
                                    className="p-3 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-300 transition-all"
                                >
                                    <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-20 text-center flex flex-col items-center">
                    <LinkIcon className="h-16 w-16 text-gray-200 dark:text-white/5 mb-4" />
                    <p className="text-gray-400 font-black uppercase text-xs tracking-widest mb-6">Você ainda não gerou links de afiliado</p>
                    <button onClick={() => setActiveTab('market')} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all">Explorar Mercado</button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default AffiliatesPage;
