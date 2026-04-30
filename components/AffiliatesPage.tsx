import React, { useState, useEffect } from 'react';
import { User, EarningRecord, AffiliateSale, Product } from '../types';
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
  TagIcon
} from '@heroicons/react/24/outline';

interface AffiliatesPageProps {
  currentUser: User;
  onNavigate: (page: any, params?: Record<string, string>) => void;
}

const AffiliatesPage: React.FC<AffiliatesPageProps> = ({ currentUser, onNavigate }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [affStats, setAffStats] = useState({
    clicks: 0,
    conversions: 0,
    earnings: 0
  });
  const [affiliateLinks, setAffiliateLinks] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<AffiliateSale[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}?page=auth&mode=signup&ref=${currentUser.id}`;

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

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
            
            setAffStats({
                clicks: affiliateSales.length * 12, // Simulated clicks for now since we don't track clicks yet
                conversions: affiliateSales.length,
                earnings: totalEarnings
            });
        } catch (err) {
            console.error("Erro ao carregar dados de afiliado:", err);
        } finally {
            setLoading(false);
        }
    };
    loadAffiliateStats();
  }, [currentUser.id]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Programa de Afiliados</h1>
            <p className="text-indigo-100 font-bold max-w-md text-lg">Indique novos usuários e ganhe 10% sobre cada assinatura premium e 5% sobre vendas em lojas.</p>
         </div>
         <div className="absolute -right-20 -bottom-20 opacity-20 transform rotate-12">
            <LinkIcon className="w-80 h-80" />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
            <UsersIcon className="h-8 w-8 text-blue-500 mb-4" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest"> Cliques no Link</p>
            <p className="text-3xl font-black dark:text-white">{affStats.clicks}</p>
         </div>
         <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
            <ArrowUpRightIcon className="h-8 w-8 text-green-500 mb-4" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Conversões</p>
            <p className="text-3xl font-black dark:text-white">{affStats.conversions}</p>
         </div>
         <div className="bg-white dark:bg-darkcard p-8 rounded-[2.5rem] border dark:border-white/10 shadow-sm">
            <GiftIcon className="h-8 w-8 text-brand mb-4" />
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ganhos Totais</p>
            <p className="text-3xl font-black text-brand">${affStats.earnings.toFixed(2)}</p>
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

      {affiliateLinks.length > 0 && (
        <div className="space-y-6">
           <h3 className="text-2xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-3">
              <TagIcon className="h-7 w-7 text-green-500" />
              Produtos Afiliados ({affiliateLinks.length})
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {affiliateLinks.map((link) => {
                const product = products.find(p => p.id === link.productId);
                if (!product) return null;
                return (
                  <div key={link.id} className="bg-white dark:bg-darkcard p-6 rounded-[2rem] border dark:border-white/10 shadow-sm flex gap-4">
                     <img src={product.imageUrls[0]} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                     <div className="flex-1 min-w-0">
                        <p className="font-black text-sm dark:text-white truncate uppercase">{product.name}</p>
                        <p className="text-green-600 font-black text-xs mb-3">{product.affiliateCommissionRate}% de Comissão</p>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => copyLink(link.link)}
                             className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${copiedLink === link.link ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-brand hover:text-white'}`}
                           >
                              {copiedLink === link.link ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                              {copiedLink === link.link ? 'Link Copiado' : 'Copiar meu Link'}
                           </button>
                           <button 
                             onClick={() => onNavigate('store', { productId: product.id })}
                             className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-400 hover:text-brand"
                           >
                              <ArrowUpRightIcon className="h-4 w-4" />
                           </button>
                        </div>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {sales.length > 0 && (
        <div className="bg-white dark:bg-darkcard rounded-[3rem] border dark:border-white/10 overflow-hidden shadow-sm">
           <div className="p-8 border-b dark:border-white/10 bg-gray-50 dark:bg-white/5">
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-3">
                 <ChartBarIcon className="h-6 w-6 text-blue-500" />
                 Histórico de Vendas (Afiliado)
              </h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-gray-100 dark:bg-white/5">
                       <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase">Produto</th>
                       <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase">Valor Venda</th>
                       <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase">Sua Comissão</th>
                       <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase">Data</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y dark:divide-white/5">
                    {sales.map(sale => {
                       const p = products.find(prod => prod.id === sale.productId);
                       return (
                          <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                             <td className="px-8 py-4">
                                <p className="font-black text-xs dark:text-white uppercase truncate max-w-[200px]">{p?.name || 'Produto Removido'}</p>
                             </td>
                             <td className="px-8 py-4 text-xs font-bold dark:text-gray-300">
                                ${sale.saleAmount.toFixed(2)}
                             </td>
                             <td className="px-8 py-4">
                                <span className="text-brand font-black text-xs">+${(sale.affiliateEarnings || 0).toFixed(2)}</span>
                             </td>
                             <td className="px-8 py-4 text-[10px] text-gray-400 font-bold uppercase">
                                {new Date(sale.timestamp).toLocaleDateString()}
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-10 bg-brand/5 rounded-[3rem] border border-brand/20">
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
