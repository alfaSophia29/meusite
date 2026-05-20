import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, UserType, Product, Store, ProductType, Page } from '../types';
import {
  getStores,
  findStoreById,
  findUserById,
  getProducts,
  saveAffiliateLink,
} from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { ShoppingCartIcon, CheckIcon, PlusIcon, StarIcon, ShoppingBagIcon, MagnifyingGlassIcon, FunnelIcon, Squares2X2Icon, BookOpenIcon, VideoCameraIcon, AcademicCapIcon, TruckIcon, LinkIcon, ChevronDownIcon, BoltIcon, BuildingStorefrontIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import ProductDetailModal from './ProductDetailModal';

interface StorePageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
  storeId?: string;
  productId?: string;
  affiliateId?: string;
  onAddToCart: (productId: string, quantity: number, selectedColor?: string, affiliateId?: string, product?: Product) => void;
  onOpenCart: () => void;
}

const ProductCard: React.FC<{ 
  product: Product; 
  currentUser: User;
  brandColor?: string;
  onSelect: (p: Product) => void; 
  onAddToCart: (productId: string, quantity: number, selectedColor?: string, affiliateId?: string, product?: Product) => void;
  onOpenCart: () => void;
  affiliateId?: string;
}> = ({ product, currentUser, brandColor = '#2563eb', onSelect, onAddToCart, onOpenCart, affiliateId }) => {
  const [isAdded, setIsAdded] = useState(false);
  const [isLinkGenerated, setIsLinkGenerated] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product.id, 1, undefined, affiliateId, product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product.id, 1, undefined, affiliateId, product);
    onOpenCart();
  };

  const handleGenerateAffiliateLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const affiliateLink = `${window.location.origin}?page=store&storeId=${product.storeId}&productId=${product.id}&affiliateId=${currentUser.id}`;
    saveAffiliateLink(currentUser.id, product.id, affiliateLink, product.userId);
    navigator.clipboard.writeText(affiliateLink);
    setIsLinkGenerated(true);
    setTimeout(() => setIsLinkGenerated(false), 3000);
  };

  return (
    <div onClick={() => onSelect(product)} className="bg-white dark:bg-darkcard rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col h-full w-full max-w-[450px] md:max-w-none mx-auto">
      <div className="relative h-56 md:h-60 overflow-hidden">
        <img src={product.imageUrls[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={product.name} />
        <div className="absolute top-4 left-4">
           <span className="bg-white/90 dark:bg-darkcard/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black text-gray-900 dark:text-white uppercase shadow-sm border border-black/5 dark:border-white/5">{product.type === ProductType.PHYSICAL ? 'Físico' : 'Digital'}</span>
        </div>
      </div>
      <div className="p-5 md:p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-1 mb-2">
          <StarIconSolid className="h-3 w-3 text-yellow-400" />
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500">{product.averageRating.toFixed(1)}</span>
        </div>
        <h4 className="text-base md:text-lg font-black text-gray-900 dark:text-white line-clamp-2 leading-tight transition-colors mb-1" style={{ color: brandColor }}>{product.name}</h4>
        {product.affiliateCommissionRate > 0 && (
           <div className="mb-3"><span className="text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">Ganhe {(product.affiliateCommissionRate * 100).toFixed(0)}% de comissão</span></div>
        )}
        <div className="mt-auto pt-4 space-y-3 border-t border-gray-50 dark:border-white/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col"><span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Preço</span><span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">${product.price.toFixed(2)}</span></div>
            <div className="flex items-center gap-2">
              <button onClick={handleAdd} className={`p-3 rounded-xl transition-all shadow-md active:scale-90 ${isAdded ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>{isAdded ? <CheckIcon className="h-5 w-5" /> : <ShoppingCartIcon className="h-5 w-5" />}</button>
              <button onClick={handleBuyNow} className="text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2" style={{ backgroundColor: brandColor }}><BoltIcon className="h-4 w-4 fill-current" /> Comprar</button>
            </div>
          </div>
          <button onClick={handleGenerateAffiliateLink} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${isLinkGenerated ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200' : 'bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-100 dark:border-white/10 hover:border-blue-200'}`}>{isLinkGenerated ? 'Copiado!' : 'Indicar Produto'}</button>
        </div>
      </div>
    </div>
  );
};

export const StorePage: React.FC<StorePageProps> = ({ currentUser, onNavigate, storeId: propStoreId, onAddToCart, onOpenCart, refreshUser, affiliateId }) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductType | 'ALL'>('ALL');
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [storeOwner, setStoreOwner] = useState<User | undefined>(undefined);

  const [lastProductDoc, setLastProductDoc] = useState<any>(null);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setLastProductDoc(null);
      setHasMoreProducts(true);
    }
    
    const result = await getProducts(24, isRefresh ? undefined : lastProductDoc, propStoreId);
    const products = result.items;
    setLastProductDoc(result.lastDoc);
    setHasMoreProducts(result.hasMore);

    if (propStoreId) {
      const store = await findStoreById(propStoreId);
      if (store) {
        setCurrentStore(store);
        const owner = await findUserById(store.professorId);
        setStoreOwner(owner);
      }
      setAllProducts(prev => isRefresh ? products : [...prev, ...products]);
    } else {
      setCurrentStore(null);
      setAllProducts(prev => isRefresh ? products : [...prev, ...products]);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [propStoreId, lastProductDoc]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMoreProducts) return;
    setLoadingMore(true);
    fetchProducts(false);
  }, [loadingMore, hasMoreProducts, fetchProducts]);

  useEffect(() => { fetchProducts(true); }, [propStoreId]); // Re-fetch on storeId change

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && !loadingMore && hasMoreProducts) {
        loadMore();
      }
    }, { threshold: 0.1, rootMargin: '100px' });

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMoreProducts, loadMore]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'ALL' || p.type === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allProducts, searchTerm, activeCategory]);

  return (
    <div className="container mx-auto px-4 pt-24 pb-32 max-w-[1400px] animate-fade-in">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           {currentStore ? (
             <div className="flex items-center gap-4 mb-2">
                {storeOwner && <img src={storeOwner.profilePicture || DEFAULT_PROFILE_PIC} className="w-12 h-12 rounded-2xl object-cover shadow-sm border-2 border-white dark:border-white/10" alt={storeOwner.firstName}/>}
                <div>
                   <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase" style={{ color: currentStore.brandColor }}>{currentStore.name}</h2>
                   <p className="text-gray-500 font-medium text-xs md:text-sm">{currentStore.description}</p>
                </div>
             </div>
           ) : (
             <>
               <div className="flex items-center gap-4 mb-1">
                 <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Marketplace</h2>
                 {/* BOTÃO DE CRIAÇÃO/GESTÃO DE LOJA DIRETO NA HOME DO MARKETPLACE */}
                 <button 
                   onClick={() => onNavigate('manage-store')}
                   className="hidden md:flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                 >
                   {currentUser.userType === UserType.CREATOR ? (
                     <><BuildingStorefrontIcon className="h-4 w-4" /> Painel do Vendedor</>
                   ) : (
                     <><RocketLaunchIcon className="h-4 w-4" /> Criar Minha Loja</>
                   )}
                 </button>
               </div>
               <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] md:text-xs">Produtos Físicos, Cursos e Ferramentas</p>
               
               {/* Versão Mobile do Botão de Gestão */}
               <button 
                 onClick={() => onNavigate('manage-store')}
                 className="md:hidden w-full mt-4 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
               >
                 {currentUser.userType === UserType.CREATOR ? (
                   <><BuildingStorefrontIcon className="h-4 w-4" /> Gerenciar Minha Loja</>
                 ) : (
                   <><RocketLaunchIcon className="h-4 w-4" /> Quero Vender no App</>
                 )}
               </button>
             </>
           )}
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar item..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-white/5 rounded-2xl outline-none font-bold text-xs dark:text-white focus:ring-2 focus:ring-blue-600 transition-all"
              />
           </div>
           
           <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="p-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
              >
                 <FunnelIcon className="h-6 w-6" />
              </button>
              
              {isCategoryDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-darkcard rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-20 animate-fade-in">
                   {[
                     { id: 'ALL', label: 'Todos', icon: Squares2X2Icon },
                     { id: ProductType.PHYSICAL, label: 'Físicos', icon: TruckIcon },
                     { id: ProductType.DIGITAL_COURSE, label: 'Cursos', icon: AcademicCapIcon },
                     { id: ProductType.DIGITAL_EBOOK, label: 'E-books', icon: BookOpenIcon },
                     { id: ProductType.DIGITAL_OTHER, label: 'Outros', icon: BoltIcon }
                   ].map(cat => (
                     <button
                       key={cat.id}
                       onClick={() => { setActiveCategory(cat.id as any); setIsCategoryDropdownOpen(false); }}
                       className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left ${activeCategory === cat.id ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 font-bold' : 'text-gray-600 dark:text-gray-300'}`}
                     >
                        <cat.icon className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                     </button>
                   ))}
                </div>
              )}
           </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/10">
           <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
           {filteredProducts.map(product => (
             <ProductCard 
               key={product.id} 
               product={product} 
               currentUser={currentUser} 
               brandColor={currentStore?.brandColor}
               onSelect={(p) => onNavigate('product-detail', { productId: p.id })}
               onAddToCart={onAddToCart}
               onOpenCart={onOpenCart}
               affiliateId={affiliateId}
             />
           ))}
        </div>
      )}

      <div ref={observerTarget} className="h-24 flex flex-col items-center justify-center mt-8">
        {loadingMore && (
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
        {!hasMoreProducts && allProducts.length > 0 && (
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fim dos produtos</p>
        )}
      </div>
    </div>
  );
};

export default StorePage;
