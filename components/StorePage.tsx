
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Product, Store, ProductType, Page } from '../types';
import {
  getStores,
  findStoreById,
  findUserById,
  getProducts,
  saveAffiliateLink,
} from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { ShoppingCartIcon, CheckIcon, PlusIcon, StarIcon, ShoppingBagIcon, MagnifyingGlassIcon, FunnelIcon, Squares2X2Icon, BookOpenIcon, VideoCameraIcon, AcademicCapIcon, TruckIcon, LinkIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, BoltIcon, BuildingStorefrontIcon, RocketLaunchIcon, ShareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';
import { getAoaExchangeRate } from '../services/currencyService';
import ProductDetailModal from './ProductDetailModal';
import ShareModal from './ShareModal';

interface StorePageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
  storeId?: string;
  productId?: string;
  affiliateId?: string;
  onAddToCart: (productId: string, quantity: number, selectedColor?: string, affiliateId?: string) => void;
  onOpenCart: () => void;
}

const ProductCard: React.FC<{ 
  product: Product; 
  currentUser: User;
  brandColor?: string;
  exchangeRate: number;
  onSelect: (p: Product) => void; 
  onShare: (p: Product) => void;
  onAddToCart: (productId: string, quantity: number, selectedColor?: string) => void;
  onOpenCart: () => void;
}> = ({ product, currentUser, exchangeRate, onSelect, onShare }) => {
  const { showAlert } = useDialog();
  const displayDiscount = product.discountPercentage || (product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);
  const displayOriginalPrice = product.originalPrice || (displayDiscount > 0 ? product.price / (1 - displayDiscount / 100) : product.price);

  return (
    <div 
      onClick={() => onSelect(product)} 
      className="bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col h-full border border-transparent hover:border-[#ff4747]/30"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img 
          src={product.imageUrls[0]} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          alt={product.name} 
        />
        <div className="absolute top-2 right-2 flex flex-col gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onShare(product);
              }}
              className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-all transform translate-x-10 group-hover:translate-x-0 duration-300"
            >
              <ShareIcon className="h-3.5 w-3.5 text-gray-600" />
            </button>
        </div>
        {displayDiscount > 0 && (
          <div className="absolute top-2 left-2 bg-[#ff4747] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-sm">
            -{displayDiscount}%
          </div>
        )}
        {product.positioning === 'TOP_SEARCH' && (
           <div className="absolute bottom-2 left-2 bg-amber-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-xl">
             🔝 Top Seller
           </div>
        )}
      </div>
      
      <div className="p-2 flex flex-col flex-grow">
        <h4 className="text-xs md:text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug mb-2 group-hover:text-[#ff4747] transition-colors">
          {product.name}
        </h4>
        
        <div className="mt-auto">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[#ff4747]">${product.price.toFixed(2)}</span>
              {displayOriginalPrice > product.price && (
                 <span className="text-[10px] text-gray-400 line-through">${displayOriginalPrice.toFixed(2)}</span>
              )}
            </div>
            <span className="text-[9px] font-black text-green-600 uppercase">≈ {(product.price * exchangeRate).toLocaleString()} KZ</span>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {product.ratingCount > 0 ? (
              <div className="flex items-center">
                <StarIconSolid className="h-2.5 w-2.5 text-[#ffb800]" />
                <span className="text-[10px] font-medium text-gray-500 ml-0.5">{product.averageRating.toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-blue-500">Novo</span>
            )}
            {product.condition && (
               <>
                 <span className="text-[10px] text-gray-400">|</span>
                 <span className={`text-[10px] font-bold ${product.condition === 'NEW' ? 'text-green-500' : 'text-orange-500'}`}>
                   {product.condition === 'NEW' ? 'Novo' : 'Usado'}
                 </span>
               </>
            )}
            <span className="text-[10px] text-gray-400">|</span>
            <span className="text-[10px] text-gray-500">{product.soldCount || 0} vendidos</span>
          </div>
          
          <div className="mt-2 flex items-center gap-1">
            {product.hasFreeShipping ? (
               <span className="bg-[#fff0f0] text-[#ff4747] text-[9px] font-bold px-1.5 py-0.5 rounded-sm">Frete Grátis</span>
            ) : product.shippingFee && (
               <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                 Frete: ${product.shippingFee.toFixed(2)} (≈ {(product.shippingFee * exchangeRate).toLocaleString()} KZ)
               </span>
            )}
            {product.type !== ProductType.PHYSICAL && (
              <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">Digital</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StorePage: React.FC<StorePageProps> = ({ currentUser, onNavigate, storeId: propStoreId, productId: propProductId, affiliateId, onAddToCart, onOpenCart }) => {
  const [exchangeRate, setExchangeRate] = useState(930);

  useEffect(() => {
    const fetchRate = async () => {
      const rate = await getAoaExchangeRate();
      setExchangeRate(rate);
    };
    fetchRate();
  }, []);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProductType | 'ALL'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // New Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating'>('newest');
  const [condition, setCondition] = useState<'ALL' | 'NEW' | 'USED'>('ALL');
  const [onlyFreeShipping, setOnlyFreeShipping] = useState(false);
  const [onlyPromotion, setOnlyPromotion] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');

  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [shareContent, setShareContent] = useState<any>(null);
  const featuredScrollRef = useRef<HTMLDivElement>(null);

  const scrollFeatured = (direction: 'left' | 'right') => {
    if (featuredScrollRef.current) {
      const { scrollLeft, clientWidth } = featuredScrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - (clientWidth * 0.8) : scrollLeft + (clientWidth * 0.8);
      featuredScrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const banners = useMemo(() => {
    const baseBanners = [
      {
        title: "Cyber Week",
        subtitle: "Descontos explosivos em todo o marketplace!",
        badge: "Super Oferta",
        gradient: "from-[#ff4747] via-[#ff2e2e] to-[#d41414]",
        icon: RocketLaunchIcon,
        buttonText: "Explorar Agora",
        isAd: false
      },
      {
        title: "Cursos VIP",
        subtitle: "Aprenda com os melhores profissionais da rede",
        badge: "Educação",
        gradient: "from-[#6366f1] via-[#4f46e5] to-[#3730a3]",
        icon: AcademicCapIcon,
        buttonText: "Ver Cursos",
        isAd: false
      }
    ];

    // Inject promoted products as banners
    const promoted = allProducts
      .filter(p => p.positioning === 'MAIN_BANNER')
      .sort((a, b) => (b.bidAmount || 0) - (a.bidAmount || 0))
      .slice(0, 3)
      .map(p => ({
        title: p.name,
        subtitle: p.description,
        badge: "Patrocinado",
        gradient: "from-amber-500 via-orange-600 to-red-700",
        icon: ShoppingBagIcon,
        buttonText: "Comprar Agora",
        isAd: true,
        productId: p.id
      }));

    return [...promoted, ...baseBanners];
  }, [allProducts]);

  useEffect(() => {
    if (!propStoreId) {
      const timer = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [propStoreId, banners.length]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const products = await getProducts();
    if (propStoreId) {
      const store = await findStoreById(propStoreId);
      if (store) setCurrentStore(store);
      setAllProducts(products.filter(p => p.storeId === propStoreId));
    } else {
      setCurrentStore(null);
      setAllProducts(products);
    }
    setLoading(false);
  }, [propStoreId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    if (propProductId && allProducts.length > 0) {
      const p = allProducts.find(x => x.id === propProductId);
      if (p) setSelectedProduct(p);
    }
  }, [propProductId, allProducts]);

  const featuredProducts = useMemo(() => {
    // Products with highest bids for TOP_SEARCH or those with high rating
    return allProducts
      .sort((a, b) => {
        const bidA = a.positioning === 'TOP_SEARCH' ? (a.bidAmount || 0) * 10 : 0;
        const bidB = b.positioning === 'TOP_SEARCH' ? (b.bidAmount || 0) * 10 : 0;
        return (bidB + b.averageRating) - (bidA + a.averageRating);
      });
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let result = featuredProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'ALL' || p.type === activeCategory;
      
      const price = p.price;
      const matchesMin = minPrice === '' || price >= parseFloat(minPrice);
      const matchesMax = maxPrice === '' || price <= parseFloat(maxPrice);
      const matchesCondition = condition === 'ALL' || p.condition === condition;
      const matchesFreeShipping = !onlyFreeShipping || p.hasFreeShipping;
      const matchesPromotion = !onlyPromotion || (p.discountPercentage && p.discountPercentage > 0) || (p.originalPrice && p.originalPrice > p.price);
      const matchesType = productTypeFilter === 'ALL' || 
                         (productTypeFilter === 'PHYSICAL' && p.type === ProductType.PHYSICAL) ||
                         (productTypeFilter === 'DIGITAL' && p.type !== ProductType.PHYSICAL);

      return matchesSearch && matchesCategory && matchesMin && matchesMax && matchesCondition && matchesFreeShipping && matchesPromotion && matchesType;
    });

    // Sorting
    return [...result].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
      // Default newest - assuming ID or some logic, for now use current order
      return 0; 
    });
  }, [featuredProducts, searchTerm, activeCategory, minPrice, maxPrice, sortBy, condition, onlyFreeShipping, onlyPromotion, productTypeFilter]);

  const categories = [
    { id: 'ALL', label: 'Tudo', icon: Squares2X2Icon },
    { id: ProductType.PHYSICAL, label: 'Eletrônicos', icon: BoltIcon },
    { id: ProductType.DIGITAL_COURSE, label: 'Cursos', icon: AcademicCapIcon },
    { id: ProductType.DIGITAL_EBOOK, label: 'E-books', icon: BookOpenIcon },
    { id: ProductType.DIGITAL_OTHER, label: 'Serviços', icon: RocketLaunchIcon }
  ];

  return (
    <div className="bg-[#f8f8f8] dark:bg-[#0a0a0a] min-h-screen pt-20 pb-20">
      {/* AliExpress Style Header */}
      <div className="bg-white dark:bg-[#1a1a1a] sticky top-16 z-40 shadow-sm border-b dark:border-white/5">
        <div className="container mx-auto px-4 py-4 max-w-[1200px]">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-[#ff4747] p-1.5 rounded-lg">
                <BuildingStorefrontIcon className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl md:text-3xl font-bebas tracking-wider uppercase dark:text-white">
                {currentStore ? currentStore.name : 'CyBer Marketplace'}
              </h2>
            </div>
            
            <div className="flex-1 w-full relative">
              <input 
                type="text" 
                placeholder="Buscar no CyberExpress..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-12 py-2.5 bg-[#f2f2f2] dark:bg-white/5 rounded-full outline-none text-sm dark:text-white border-2 border-transparent focus:border-[#ff4747] transition-all"
              />
              <button className="absolute right-1 top-1 bottom-1 px-5 bg-[#ff4747] text-white rounded-full hover:bg-[#e63e3e] transition-colors">
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-6 shrink-0">
              <button onClick={() => setShowFilters(true)} className="flex flex-col items-center group relative">
                <div className="p-2 rounded-full group-hover:bg-[#ff4747]/10 transition-colors">
                  <FunnelIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-[#ff4747]" />
                  {(minPrice || maxPrice || condition !== 'ALL' || onlyFreeShipping || onlyPromotion || productTypeFilter !== 'ALL') && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ff4747] rounded-full border border-white"></div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-500 mt-0.5 uppercase tracking-tighter">Filtros</span>
              </button>

              <button onClick={() => onNavigate('manage-store')} className="flex flex-col items-center group">
                <div className="p-2 rounded-full group-hover:bg-[#ff4747]/10 transition-colors">
                  <BuildingStorefrontIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-[#ff4747]" />
                </div>
                <span className="text-[10px] font-bold text-gray-500 mt-0.5 uppercase tracking-tighter">Minha Loja</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Bar - "Dando vida às abas" */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b dark:border-white/5 overflow-x-auto no-scrollbar sticky top-[137px] md:top-[128px] z-30">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center gap-2 py-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-tight transition-all duration-300 whitespace-nowrap ${
                  activeCategory === cat.id 
                    ? 'bg-[#ff4747] text-white shadow-lg shadow-[#ff4747]/30 scale-105' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <cat.icon className={`h-4 w-4 ${activeCategory === cat.id ? 'animate-bounce' : ''}`} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-[1200px]">
      {/* Banner Carousel */}
      {!propStoreId && (
        <div className="w-full mb-6 mt-2">
          <div className="container mx-auto px-0 max-w-[1200px]">
            <div className="relative group overflow-hidden md:rounded-3xl shadow-2xl h-80 md:h-[420px]">
              {banners.map((banner, index) => (
                <div 
                  key={index}
                  className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center bg-gradient-to-br ${banner.gradient} ${
                    index === currentBanner ? 'opacity-100 translate-x-0 scale-100' : index < currentBanner ? 'opacity-0 -translate-x-full scale-110' : 'opacity-0 translate-x-full scale-110'
                  }`}
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  
                  <div className="relative z-10 px-6 md:px-20 py-10 w-full flex flex-col items-center md:items-start text-center md:text-left">
                    <div className={`transition-all duration-700 delay-300 transform ${index === currentBanner ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                      <span className="bg-white/20 backdrop-blur-md text-white text-[9px] md:text-xs font-black px-3 md:px-4 py-1.5 rounded-full uppercase tracking-[0.2em] mb-4 md:mb-6 inline-block border border-white/20 shadow-xl">
                        {banner.badge}
                      </span>
                    </div>
                    
                    <h3 className={`text-4xl md:text-8xl font-black text-white uppercase tracking-tighter mb-3 md:mb-4 drop-shadow-2xl leading-[0.9] transition-all duration-700 delay-400 transform ${index === currentBanner ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                      {banner.title.split(' ').map((word, i) => (
                        <span key={i} className="block">{word}</span>
                      ))}
                    </h3>
                    
                    <p className={`text-white/80 font-medium text-xs md:text-xl max-w-xs md:max-w-lg mb-6 md:mb-10 transition-all duration-700 delay-500 transform ${index === currentBanner ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                      {banner.subtitle}
                    </p>
                    
                    <div className={`transition-all duration-700 delay-600 transform ${index === currentBanner ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                      <button className="group/btn relative bg-white text-gray-900 px-8 md:px-12 py-3.5 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm uppercase shadow-2xl overflow-hidden active:scale-95 transition-all">
                        <span className="relative z-10 flex items-center gap-2">
                          {banner.buttonText} 
                          <BoltIcon className="h-4 w-4 fill-current group-hover/btn:animate-pulse" />
                        </span>
                        <div className="absolute inset-0 bg-gray-100 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                      </button>
                    </div>
                  </div>
  
                  <div className={`absolute -right-10 md:-right-20 -bottom-10 md:-bottom-20 transition-all duration-1000 delay-300 transform ${index === currentBanner ? 'translate-x-0 rotate-0 opacity-20' : 'translate-x-40 -rotate-12 opacity-0'}`}>
                    <banner.icon className="h-[300px] md:h-[600px] w-[300px] md:w-[600px] text-white pointer-events-none" />
                  </div>
                </div>
              ))}
  
              {/* Carousel Controls - Professional Styling */}
              <div className="absolute inset-x-0 md:inset-x-8 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-30">
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length); }}
                  className="p-3 md:p-5 bg-white/10 hover:bg-white/30 backdrop-blur-2xl rounded-full border border-white/20 text-white pointer-events-auto transition-all transform hover:-translate-x-1 active:scale-90 opacity-100 md:opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-2xl"
                >
                  <ChevronLeftIcon className="h-5 w-5 md:h-7 md:w-7" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentBanner(prev => (prev + 1) % banners.length); }}
                  className="p-3 md:p-5 bg-white/10 hover:bg-white/30 backdrop-blur-2xl rounded-full border border-white/20 text-white pointer-events-auto transition-all transform hover:translate-x-1 active:scale-90 opacity-100 md:opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-2xl"
                >
                  <ChevronRightIcon className="h-5 w-5 md:h-7 md:w-7" />
                </button>
              </div>
              
              {/* Carousel Indicator Track */}
              <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-30">
                {banners.map((_, index) => (
                  <button 
                    key={index}
                    onClick={() => setCurrentBanner(index)}
                    className="group py-2 px-1 focus:outline-none"
                  >
                    <div className={`h-1 md:h-1.5 rounded-full transition-all duration-500 overflow-hidden relative ${
                      index === currentBanner ? 'w-8 md:w-12 bg-white' : 'w-2 md:w-3 bg-white/30 hover:bg-white/50'
                    }`}>
                      {index === currentBanner && (
                        <div className="absolute inset-0 bg-white/40 animate-loading-bar origin-left"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>

      {/* Featured Products Horizontal Carousel */}
      {!propStoreId && filteredProducts.length > 0 && (
        <div className="container mx-auto px-0 max-w-[1200px] mb-8 relative">
          <div className="space-y-1 mb-4 px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-[#ff4747] rounded-full"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff4747]">Em Destaque</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Ofertas de Hoje</h3>
          </div>

          <div className="relative group/carousel">
            {/* Carousel Navigation Buttons - Professional Side Positioning */}
            <div className="hidden md:block">
              <button 
                onClick={() => scrollFeatured('left')}
                className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 p-3 bg-white dark:bg-zinc-900 border dark:border-white/10 rounded-full shadow-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 active:scale-90 group-hover/carousel:scale-110"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              <button 
                onClick={() => scrollFeatured('right')}
                className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 p-3 bg-white dark:bg-zinc-900 border dark:border-white/10 rounded-full shadow-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-30 active:scale-90 group-hover/carousel:scale-110"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </div>

            <div 
              ref={featuredScrollRef}
              className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-4 px-1 snap-x snap-mandatory"
            >
              {filteredProducts.slice(0, 10).map(product => (
                <div key={`featured-${product.id}`} className="min-w-[calc(60%-12px)] md:min-w-[200px] snap-start">
                  <ProductCard 
                    product={product} 
                    currentUser={currentUser} 
                    exchangeRate={exchangeRate}
                    onSelect={setSelectedProduct}
                    onShare={(p) => setShareContent({
                      title: `Confira este produto: ${p.name}`,
                      text: p.description,
                      url: `${window.location.origin}/?page=store&productId=${p.id}`,
                      mediaUrl: p.imageUrls[0],
                      mediaType: 'image'
                    })}
                    onAddToCart={onAddToCart}
                    onOpenCart={onOpenCart}
                  />
                </div>
              ))}
            </div>

            {/* Mobile Navigation Indicators/Buttons */}
            <div className="flex md:hidden justify-center gap-4 mt-4">
               <button 
                  onClick={() => scrollFeatured('left')}
                  className="p-3 bg-white dark:bg-zinc-900 border dark:border-white/10 rounded-full shadow-md active:scale-90"
               >
                  <ChevronLeftIcon className="h-5 w-5" />
               </button>
               <button 
                  onClick={() => scrollFeatured('right')}
                  className="p-3 bg-white dark:bg-zinc-900 border dark:border-white/10 rounded-full shadow-md active:scale-90"
               >
                  <ChevronRightIcon className="h-5 w-5" />
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-2 max-w-[1200px]">
        {/* Section Title for Main Grid */}
        {!propStoreId && (
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-xl font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Navegue por Tudo</h3>
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#ff4747] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-sm">
             <ShoppingBagIcon className="h-16 w-16 text-gray-200 mx-auto mb-4" />
             <p className="text-gray-400 font-bold">Nenhum produto encontrado nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 md:gap-2">
             {filteredProducts.map(product => (
               <ProductCard 
                 key={product.id} 
                 product={product} 
                 currentUser={currentUser} 
                 exchangeRate={exchangeRate}
                 onSelect={setSelectedProduct}
                 onShare={(p) => setShareContent({
                   title: `Confira este produto: ${p.name}`,
                   text: p.description,
                   url: `${window.location.origin}/?page=store&productId=${p.id}`,
                   mediaUrl: p.imageUrls[0],
                   mediaType: 'image'
                 })}
                 onAddToCart={onAddToCart}
                 onOpenCart={onOpenCart}
               />
             ))}
          </div>
        )}
      </div>

      {/* Filter Sidebar overlay or drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowFilters(false)}></div>
          <div className="relative w-full max-w-xs bg-white dark:bg-[#1a1a1a] h-full shadow-2xl flex flex-col animate-slide-in-right">
             <div className="p-6 border-b dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tighter dark:text-white">Filtros Avançados</h3>
                <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl">
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                {/* Sort Section */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ordenar por</h4>
                   <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'newest', label: 'Mais Recentes' },
                        { id: 'price-asc', label: 'Menor Preço' },
                        { id: 'price-desc', label: 'Maior Preço' },
                        { id: 'rating', label: 'Melhor Avaliados' }
                      ].map(option => (
                        <button
                          key={option.id}
                          onClick={() => setSortBy(option.id as any)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${sortBy === option.id ? 'bg-[#ff4747] text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Price Section */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Faixa de Preço ($)</h4>
                   <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        placeholder="Mín" 
                        value={minPrice}
                        onChange={e => setMinPrice(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-white/5 px-4 py-3 rounded-xl text-xs outline-none border-2 border-transparent focus:border-[#ff4747] dark:text-white" 
                      />
                      <div className="w-4 h-0.5 bg-gray-300"></div>
                      <input 
                        type="number" 
                        placeholder="Máx" 
                        value={maxPrice}
                        onChange={e => setMaxPrice(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-white/5 px-4 py-3 rounded-xl text-xs outline-none border-2 border-transparent focus:border-[#ff4747] dark:text-white" 
                      />
                   </div>
                </div>

                {/* Condition Section */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Condição</h4>
                   <div className="flex gap-2">
                      {['ALL', 'NEW', 'USED'].map(c => (
                        <button
                          key={c}
                          onClick={() => setCondition(c as any)}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${condition === c ? 'bg-[#ff4747] text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'}`}
                        >
                          {c === 'ALL' ? 'Todos' : c === 'NEW' ? 'Novo' : 'Usado'}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Type Section */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Tipo de Entrega</h4>
                   <div className="flex gap-2">
                      {[
                        { id: 'ALL', label: 'Todos' },
                        { id: 'PHYSICAL', label: 'Físico' },
                        { id: 'DIGITAL', label: 'Digital' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setProductTypeFilter(t.id as any)}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${productTypeFilter === t.id ? 'bg-[#ff4747] text-white shadow-lg' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Quick Filters */}
                <div className="space-y-3">
                   <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Vantagens & Ofertas</h4>
                   <button 
                    onClick={() => setOnlyFreeShipping(!onlyFreeShipping)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${onlyFreeShipping ? 'border-[#ff4747] bg-[#ff4747]/5' : 'border-gray-100 dark:border-white/5 opacity-60'}`}
                   >
                     <div className="flex items-center gap-3">
                        <TruckIcon className={`h-5 w-5 ${onlyFreeShipping ? 'text-[#ff4747]' : 'text-gray-400'}`} />
                        <span className={`text-[11px] font-black uppercase ${onlyFreeShipping ? 'text-[#ff4747]' : 'text-gray-400'}`}>Frete Grátis</span>
                     </div>
                     <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${onlyFreeShipping ? 'bg-[#ff4747] text-white' : 'bg-gray-200 dark:bg-white/10'}`}>
                        {onlyFreeShipping && <CheckIcon className="h-3 w-3 stroke-[3]" />}
                     </div>
                   </button>

                   <button 
                    onClick={() => setOnlyPromotion(!onlyPromotion)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${onlyPromotion ? 'border-[#ff4747] bg-[#ff4747]/5' : 'border-gray-100 dark:border-white/5 opacity-60'}`}
                   >
                     <div className="flex items-center gap-3">
                        <BoltIcon className={`h-5 w-5 ${onlyPromotion ? 'text-[#ff4747]' : 'text-gray-400'}`} />
                        <span className={`text-[11px] font-black uppercase ${onlyPromotion ? 'text-[#ff4747]' : 'text-gray-400'}`}>Em Promoção</span>
                     </div>
                     <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${onlyPromotion ? 'bg-[#ff4747] text-white' : 'bg-gray-200 dark:bg-white/10'}`}>
                        {onlyPromotion && <CheckIcon className="h-3 w-3 stroke-[3]" />}
                     </div>
                   </button>
                </div>
             </div>

             <div className="p-6 border-t dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex gap-3">
                <button 
                  onClick={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    setCondition('ALL');
                    setOnlyFreeShipping(false);
                    setOnlyPromotion(false);
                    setProductTypeFilter('ALL');
                    setSortBy('newest');
                  }}
                  className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Limpar
                </button>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="flex-[2] bg-[#ff4747] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#ff4747]/20 active:scale-95 transition-all"
                >
                  Ver Resultados
                </button>
             </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          currentUser={currentUser}
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={onAddToCart}
          onNavigate={onNavigate}
          affiliateId={affiliateId}
          onShare={(p) => setShareContent({
            title: `Confira este produto: ${p.name}`,
            text: p.description,
            url: `${window.location.origin}/?page=store&productId=${p.id}`,
            mediaUrl: p.imageUrls[0],
            mediaType: 'image'
          })}
        />
      )}

      {shareContent && (
        <ShareModal 
          isOpen={!!shareContent}
          onClose={() => setShareContent(null)}
          currentUser={currentUser}
          onNavigate={onNavigate}
          content={shareContent}
        />
      )}
    </div>
  );
};
