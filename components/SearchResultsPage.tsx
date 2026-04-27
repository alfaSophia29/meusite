
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Post, Product, ProductType, Page } from '../types';
import { getUsers, getPosts, getProducts, toggleFollowUser } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import PostCard from './PostCard';
import { 
  CheckBadgeIcon, 
  ShoppingBagIcon, 
  NewspaperIcon, 
  UsersIcon, 
  Squares2X2Icon, 
  StarIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CurrencyDollarIcon,
  ArrowDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid';

interface SearchResultsPageProps {
  currentUser: User;
  query: string;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  refreshUser: () => void;
}

type SearchTab = 'all' | 'users' | 'posts' | 'products';

const ITEMS_PER_PAGE = 12;

const UserResultCard: React.FC<{ user: User; currentUser: User; onNavigate: Function; onFollowToggle: Function }> = ({ user, currentUser, onNavigate, onFollowToggle }) => {
  // Fix: Add optional chaining to prevent crash if followedUsers is undefined
  const isFollowing = currentUser.followedUsers?.includes(user.id);
  const isSelf = currentUser.id === user.id;

  return (
    <div className="bg-white dark:bg-darkcard p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 flex flex-col items-center text-center transition-all hover:shadow-xl hover:-translate-y-1 w-full max-w-[320px]">
      <div className="relative mb-4">
        <img 
          src={user.profilePicture || DEFAULT_PROFILE_PIC} 
          alt={user.firstName} 
          className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white dark:border-darkcard shadow-lg cursor-pointer" 
          onClick={() => onNavigate('profile', { userId: user.id })}
        />
        {user.isVerified && (
          <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-lg p-1 border-2 border-white dark:border-darkcard">
            <CheckBadgeIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      
      <h4 className="font-black text-gray-900 dark:text-white text-lg truncate w-full mb-1">{user.firstName} {user.lastName}</h4>
      <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-4">
        Membro
      </p>

      {user.bio && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 italic leading-relaxed px-2">"{user.bio}"</p>}

      {!isSelf && (
        <button
          onClick={(e) => { e.stopPropagation(); onFollowToggle(user.id); }}
          className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${
            isFollowing ? 'bg-gray-100 dark:bg-white/5 text-gray-400' : 'bg-blue-600 text-white shadow-lg'
          }`}
        >
          {isFollowing ? 'Seguindo' : <><UsersIcon className="h-4 w-4" /> Seguir</>}
        </button>
      )}
    </div>
  );
};

const ProductResultCard: React.FC<{ product: Product; onNavigate: Function }> = ({ product, onNavigate }) => (
  <div 
    onClick={() => onNavigate('store', { storeId: product.storeId })}
    className="bg-white dark:bg-darkcard rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden cursor-pointer group transition-all hover:shadow-xl w-full max-w-[280px]"
  >
    <div className="relative h-44 overflow-hidden">
      <img src={product.imageUrls[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={product.name} />
      <div className="absolute top-3 left-3 bg-white/90 dark:bg-darkcard/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-sm border border-black/5">
        <span className="text-[8px] font-black uppercase text-blue-600">{product.type === ProductType.PHYSICAL ? 'Físico' : 'Digital'}</span>
      </div>
    </div>
    <div className="p-5">
      <h4 className="font-black text-gray-900 dark:text-white text-sm line-clamp-1 mb-1">{product.name}</h4>
      <div className="flex items-center gap-1 mb-3">
        <StarIcon className="h-3 w-3 text-yellow-400" />
        <span className="text-[10px] font-black text-gray-400">{product.averageRating.toFixed(1)}</span>
      </div>
      <p className="text-blue-600 dark:text-blue-400 font-black text-xl">${product.price.toFixed(2)}</p>
    </div>
  </div>
);

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ currentUser, query, onNavigate, refreshUser }) => {
  const [foundUsers, setFoundUsers] = useState<User[]>([]);
  const [foundPosts, setFoundPosts] = useState<Post[]>([]);
  const [foundProducts, setFoundProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [loading, setLoading] = useState(true);
  const [isFilterMobileOpen, setIsFilterMobileOpen] = useState(false);

  // Pagination states
  const [userLimit, setUserLimit] = useState(ITEMS_PER_PAGE);
  const [postLimit, setPostLimit] = useState(ITEMS_PER_PAGE);
  const [productLimit, setProductLimit] = useState(ITEMS_PER_PAGE);

  // Filtros de refinamento
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<'relevant' | 'newest'>('relevant');

  const performSearch = useCallback(async () => {
    if (!query) return;
    setLoading(true);
    const lowerQuery = query.toLowerCase();

    // Reset pagination on new search
    setUserLimit(ITEMS_PER_PAGE);
    setPostLimit(ITEMS_PER_PAGE);
    setProductLimit(ITEMS_PER_PAGE);

    const allUsers = await getUsers(currentUser);
    const myBlocked = currentUser.blockedUserIds || [];

    let usersList = allUsers.filter(u => 
      !myBlocked.includes(u.id) && 
      ( `${u.firstName} ${u.lastName}`.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery) )
    );

    const allPosts = await getPosts(currentUser.id);
    let postsList = allPosts.filter(p => !myBlocked.includes(p.userId) && p.content?.toLowerCase().includes(lowerQuery));
    if (sortBy === 'newest') postsList = postsList.sort((a, b) => b.timestamp - a.timestamp);

    const allProducts = await getProducts();
    let productsList = allProducts.filter(p => p.name.toLowerCase().includes(lowerQuery));
    productsList = productsList.filter(p => p.price <= maxPrice);

    setFoundUsers(usersList);
    setFoundPosts(postsList);
    setFoundProducts(productsList);

    setLoading(false);
  }, [query, onlyVerified, maxPrice, sortBy]);

  useEffect(() => { performSearch(); }, [performSearch]);

  const handleFollowToggle = (userId: string) => {
    toggleFollowUser(currentUser.id, userId);
    refreshUser();
    performSearch();
  };

  const tabs = [
    { id: 'all', label: 'Todos', icon: Squares2X2Icon, count: foundUsers.length + foundPosts.length + foundProducts.length },
    { id: 'users', label: 'Pessoas', icon: UsersIcon, count: foundUsers.length },
    { id: 'posts', label: 'Postagens', icon: NewspaperIcon, count: foundPosts.length },
    { id: 'products', label: 'Produtos', icon: ShoppingBagIcon, count: foundProducts.length },
  ];

  const LoadMoreButton = ({ onClick, hasMore, count, currentLimit }: { onClick: () => void, hasMore: boolean, count: number, currentLimit: number }) => {
    if (!hasMore) return null;
    return (
      <div className="flex flex-col items-center pt-10 pb-4">
        <button 
          onClick={onClick}
          className="group flex items-center gap-3 px-10 py-5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-blue-600 hover:border-blue-500/30 transition-all shadow-sm active:scale-95"
        >
          <ArrowDownIcon className="h-4 w-4 animate-bounce" />
          Carregar mais resultados
        </button>
        <p className="mt-4 text-[9px] font-black text-gray-400 uppercase tracking-widest opacity-60">
          Exibindo {Math.min(currentLimit, count)} de {count}
        </p>
      </div>
    );
  };

  const FilterSidebar = () => (
    <div className="space-y-10">
      <div>
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Categorias</h3>
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SearchTab)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon className="h-4 w-4" />
                <span className="font-black text-[10px] uppercase tracking-widest">{tab.label}</span>
              </div>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-white/5"></div>

      <div>
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Refinar Busca</h3>
        
        <div className="space-y-6">
          {(activeTab === 'all' || activeTab === 'products') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-2">
                  <CurrencyDollarIcon className="h-3 w-3" /> Preço Máx.
                </label>
                <span className="text-[10px] font-black text-blue-600">${maxPrice}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="5000" 
                step="50" 
                value={maxPrice} 
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'users') && (
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-[9px] font-black text-gray-400 uppercase group-hover:text-blue-600 transition-colors">Apenas Profissionais</span>
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  checked={onlyVerified} 
                  onChange={() => setOnlyVerified(!onlyVerified)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </label>
          )}

          <div className="space-y-4 pt-2">
            <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-3 w-3" /> Ordenar por
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setSortBy('relevant')}
                className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${sortBy === 'relevant' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10'}`}
              >
                Relevância
              </button>
              <button 
                onClick={() => setSortBy('newest')}
                className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border ${sortBy === 'newest' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10'}`}
              >
                Recentes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12 pt-24">
      
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 dark:border-white/5 pb-10">
        <div>
           <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Central de Busca CyBerPhone</p>
           <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter">Resultados para <span className="text-blue-600">"{query}"</span></h2>
        </div>
        <button 
          onClick={() => setIsFilterMobileOpen(true)}
          className="md:hidden flex items-center gap-3 px-6 py-4 bg-white dark:bg-darkcard rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 font-black text-[10px] uppercase tracking-widest"
        >
          <FunnelIcon className="h-5 w-5 text-blue-600" /> Refinar Resultados
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-28">
            <FilterSidebar />
          </div>
        </aside>

        <main className="lg:col-span-9 animate-fade-in">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
               <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
               <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Vasculhando a CyBerPhone...</p>
            </div>
          ) : foundUsers.length === 0 && foundPosts.length === 0 && foundProducts.length === 0 ? (
            <div className="text-center py-32 bg-white dark:bg-darkcard rounded-[4rem] shadow-sm border border-gray-100 dark:border-white/5 flex flex-col items-center">
               <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-full mb-8">
                  <XMarkIcon className="h-16 w-16 text-gray-200 dark:text-gray-800" />
               </div>
               <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter">Nada encontrado</h3>
               <p className="text-gray-500 text-sm font-medium">Tente ajustar seus filtros ou mudar os termos da busca.</p>
               <button 
                 onClick={() => { setMaxPrice(5000); setOnlyVerified(false); setSortBy('relevant'); setActiveTab('all'); }}
                 className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
               >
                 Limpar Filtros
               </button>
            </div>
          ) : (
            <div className="space-y-20">
              
              {/* Seção Usuários */}
              {(activeTab === 'all' || activeTab === 'users') && foundUsers.length > 0 && (
                <section className="animate-fade-in">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Membros Encontrados</h3>
                      <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-black text-gray-400">{foundUsers.length}</span>
                    </div>
                    {activeTab === 'all' && foundUsers.length > 6 && (
                      <button onClick={() => setActiveTab('users')} className="text-blue-600 font-black uppercase text-[9px] tracking-widest hover:underline flex items-center gap-2">
                        Ver Todos <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {foundUsers.slice(0, activeTab === 'all' ? 6 : userLimit).map(user => <UserResultCard key={user.id} user={user} currentUser={currentUser} onNavigate={onNavigate} onFollowToggle={handleFollowToggle} />)}
                  </div>
                  {activeTab === 'users' && <LoadMoreButton count={foundUsers.length} currentLimit={userLimit} hasMore={userLimit < foundUsers.length} onClick={() => setUserLimit(prev => prev + ITEMS_PER_PAGE)} />}
                </section>
              )}

              {/* Seção Produtos */}
              {(activeTab === 'all' || activeTab === 'products') && foundProducts.length > 0 && (
                <section className="animate-fade-in">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Marketplace</h3>
                      <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-black text-gray-400">{foundProducts.length}</span>
                    </div>
                    {activeTab === 'all' && foundProducts.length > 4 && (
                      <button onClick={() => setActiveTab('products')} className="text-blue-600 font-black uppercase text-[9px] tracking-widest hover:underline flex items-center gap-2">
                        Ver Loja Completa <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {foundProducts.slice(0, activeTab === 'all' ? 4 : productLimit).map(product => <ProductResultCard key={product.id} product={product} onNavigate={onNavigate} />)}
                  </div>
                  {activeTab === 'products' && <LoadMoreButton count={foundProducts.length} currentLimit={productLimit} hasMore={productLimit < foundProducts.length} onClick={() => setProductLimit(prev => prev + ITEMS_PER_PAGE)} />}
                </section>
              )}

              {/* Seção Posts */}
              {(activeTab === 'all' || activeTab === 'posts') && foundPosts.length > 0 && (
                <section className="animate-fade-in">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Conteúdos & Aulas</h3>
                      <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-black text-gray-400">{foundPosts.length}</span>
                    </div>
                    {activeTab === 'all' && foundPosts.length > 4 && (
                      <button onClick={() => setActiveTab('posts')} className="text-blue-600 font-black uppercase text-[9px] tracking-widest hover:underline flex items-center gap-2">
                        Explorar Postagens <ChevronRightIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {foundPosts.slice(0, activeTab === 'all' ? 4 : postLimit).map(post => (
                      <div key={post.id} className="w-full">
                        <PostCard
                          post={post} currentUser={currentUser} 
                          onNavigate={onNavigate} onFollowToggle={handleFollowToggle} 
                          refreshUser={refreshUser} onPostUpdatedOrDeleted={performSearch} onPinToggle={() => {}}
                        />
                      </div>
                    ))}
                  </div>
                  {activeTab === 'posts' && <LoadMoreButton count={foundPosts.length} currentLimit={postLimit} hasMore={postLimit < foundPosts.length} onClick={() => setPostLimit(prev => prev + ITEMS_PER_PAGE)} />}
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal de Filtros Mobile */}
      {isFilterMobileOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md md:hidden flex flex-col justify-end" onClick={() => setIsFilterMobileOpen(false)}>
           <div 
             className="bg-white dark:bg-darkcard rounded-t-[3rem] p-8 shadow-2xl animate-slide-up" 
             onClick={e => e.stopPropagation()}
           >
              <div className="w-12 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full mx-auto mb-8"></div>
              
              <div className="flex justify-between items-center mb-10">
                 <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Refinar Busca</h2>
                 <button onClick={() => setIsFilterMobileOpen(false)} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400"><XMarkIcon className="h-6 w-6"/></button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto no-scrollbar pb-10">
                <FilterSidebar />
              </div>

              <button 
                onClick={() => setIsFilterMobileOpen(false)}
                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                Aplicar Filtros
              </button>
           </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SearchResultsPage;
