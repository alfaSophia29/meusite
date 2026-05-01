
import React, { useState, useEffect } from 'react';
import { Product, User, ProductType, Page } from '../types';
import { findUserById, findStoreById, saveAffiliateLink } from '../services/storageService';
import { DEFAULT_PROFILE_PIC } from '../data/constants';
import { COUNTRIES } from '../data/countries';
import { useDialog } from '../services/DialogContext';
import { getAoaExchangeRate } from '../services/currencyService';
import { 
  XMarkIcon, 
  ShoppingCartIcon, 
  StarIcon, 
  ShareIcon, 
  MinusIcon, 
  PlusIcon,
  CheckIcon,
  BoltIcon,
  TruckIcon,
  ChatBubbleLeftEllipsisIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface ProductDetailModalProps {
  product: Product;
  currentUser: User;
  onClose: () => void;
  onAddToCart: (productId: string, quantity: number, selectedColor?: string, affiliateId?: string) => void;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  onShare: (product: Product) => void;
  affiliateId?: string;
}

const ReviewItem: React.FC<{ rating: any }> = ({ rating }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    findUserById(rating.userId).then(u => setUser(u || null));
  }, [rating.userId]);

  const getFlag = (countryName?: string) => {
    if (!countryName) return '';
    const country = COUNTRIES.find(c => c.name === countryName);
    return country ? country.flag : '';
  };

  return (
    <div className="py-4 border-b border-gray-50 flex gap-3">
       <div className="relative">
          <img src={user?.profilePicture || DEFAULT_PROFILE_PIC} className="w-10 h-10 rounded-xl object-cover" />
          {user?.country && (
            <span className="absolute -bottom-1 -right-1 text-[12px] bg-white dark:bg-darkcard rounded-full w-5 h-5 flex items-center justify-center shadow-lg border border-gray-100 dark:border-white/10">
              {getFlag(user.country)}
            </span>
          )}
       </div>
       <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
             <p className="text-[10px] font-black dark:text-gray-900">{user?.firstName || 'Membro'} {user?.lastName || ''}</p>
             <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <StarIconSolid key={s} className={`h-2.5 w-2.5 ${s <= rating.rating ? 'text-yellow-400' : 'text-gray-200'}`} />
                ))}
             </div>
          </div>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">{rating.comment}</p>
          <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-2">{new Date(rating.timestamp).toLocaleDateString()}</p>
       </div>
    </div>
  );
};

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, currentUser, onClose, onAddToCart, onNavigate, onShare, affiliateId }) => {
  const { showAlert } = useDialog();
  const [exchangeRate, setExchangeRate] = useState(930);
  const [owner, setOwner] = useState<User | null>(null);
  
  useEffect(() => {
    const fetchRate = async () => {
      const rate = await getAoaExchangeRate();
      setExchangeRate(rate);
    };
    fetchRate();
  }, []);

  useEffect(() => {
    const loadOwner = async () => {
      const store = await findStoreById(product.storeId);
      if (store) {
        const u = await findUserById(store.professorId);
        setOwner(u || null);
      }
    };
    loadOwner();
  }, [product.storeId]);
  
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors && product.colors.length > 0 ? product.colors[0] : undefined
  );
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCartClick = () => {
    onAddToCart(product.id, quantity, selectedColor, affiliateId);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleStartChat = () => {
    if (!currentUser || !owner) return;
    if (currentUser.id === owner.id) {
      showAlert("Você não pode iniciar um chat consigo mesmo.", { type: 'alert' });
      return;
    }
    onClose();
    onNavigate('chat', { userId: owner.id });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-0 md:p-10 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl relative" onClick={e => e.stopPropagation()}>
        
        {/* Galeria de Imagens */}
        <div className="w-full md:w-1/2 bg-gray-50 relative h-64 md:h-auto group flex flex-col">
          <button onClick={onClose} className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg md:hidden">
            <XMarkIcon className="h-6 w-6 text-gray-900" />
          </button>
          <button 
            onClick={() => onShare(product)}
            className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg"
          >
            <ShareIcon className="h-6 w-6 text-gray-900" />
          </button>
          
          <div className="flex-1 relative overflow-hidden">
            <img 
              src={product.imageUrls[currentImageIndex]} 
              className="w-full h-full object-cover transition-all duration-500 transform scale-100 group-hover:scale-110" 
              alt={product.name} 
            />
            
            {/* Controles de Navegação (Apenas se houver mais de uma imagem) */}
            {product.imageUrls.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : product.imageUrls.length - 1)); }}
                  className="p-2 bg-white/80 backdrop-blur rounded-full shadow-lg hover:bg-white"
                >
                  <MinusIcon className="h-6 w-6 text-gray-900 rotate-90" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev < product.imageUrls.length - 1 ? prev + 1 : 0)); }}
                  className="p-2 bg-white/80 backdrop-blur rounded-full shadow-lg hover:bg-white"
                >
                  <PlusIcon className="h-6 w-6 text-gray-900 -rotate-90" />
                </button>
              </div>
            )}
          </div>

          {/* Miniaturas (Thumbnails) */}
          {product.imageUrls.length > 1 && (
            <div className="p-4 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto no-scrollbar justify-center">
               {product.imageUrls.map((url, i) => (
                 <button 
                    key={i} 
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${currentImageIndex === i ? 'border-blue-600 scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                 >
                    <img src={url} className="w-full h-full object-cover" alt={`Thumb ${i}`} />
                 </button>
               ))}
            </div>
          )}

          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
             {product.imageUrls.map((_, i) => (
               <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'w-6 bg-blue-600' : 'w-1.5 bg-white/50'}`}></div>
             ))}
          </div>
        </div>

        {/* Informações e Opções */}
        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col overflow-y-auto custom-scrollbar bg-white">
          <div className="hidden md:flex justify-end mb-4 gap-2">
            <button 
              onClick={() => {
                const url = `${window.location.origin}?page=store&productId=${product.id}`;
                navigator.clipboard.writeText(url);
                showAlert("Link do produto copiado!", { type: 'success' });
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Compartilhar"
            >
              <ShareIcon className="h-6 w-6 text-gray-400" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <XMarkIcon className="h-7 w-7 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg shadow-sm">
                {product.type === ProductType.PHYSICAL ? 'Físico' : 'Digital'}
              </span>
              {product.condition && (
                <span className={`text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg shadow-sm ${product.condition === 'NEW' ? 'bg-green-600' : 'bg-orange-600'}`}>
                  {product.condition === 'NEW' ? 'Novo' : 'Usado'}
                </span>
              )}

              <div className="flex items-center">
                {product.ratingCount > 0 ? (
                  <>
                    <StarIconSolid className="h-4 w-4 text-yellow-400" />
                    <span className="text-gray-900 font-black ml-1 text-xs">{product.averageRating.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="text-blue-600 font-black text-xs uppercase tracking-tighter">Novo</span>
                )}
                <span className="text-gray-400 mx-2">|</span>
                <span className="text-gray-500 font-bold text-xs">{product.soldCount || 0} vendidos</span>
              </div>
            </div>

            <h2 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight tracking-tighter">{product.name}</h2>
            
            <div className="py-4 border-y border-gray-100 flex items-center justify-between">
               <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Preço unitário</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter">${product.price.toFixed(2)}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                         <span className="text-sm md:text-lg text-gray-400 font-bold line-through italic">${product.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <p className="text-sm font-black text-green-600 uppercase">≈ {(product.price * exchangeRate).toLocaleString()} KZ</p>
                  </div>
               </div>
               {(product.discountPercentage || (product.originalPrice && product.originalPrice > product.price)) && (
                 <div className="bg-[#ff4747] text-white px-3 py-1.5 rounded-xl font-black text-sm animate-pulse shadow-lg">
                   -{product.discountPercentage || Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}%
                 </div>
               )}
            </div>

            {/* Shipping Info */}
            {product.type === ProductType.PHYSICAL && (
               <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <TruckIcon className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-gray-400">Entrega Estimada</p>
                    <p className="text-xs font-bold text-gray-700">7-15 dias úteis</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-gray-400">Frete</p>
                    <p className={`text-xs font-black uppercase ${product.hasFreeShipping ? 'text-green-600' : 'text-gray-900'}`}>
                      {product.hasFreeShipping ? 'Grátis para você' : `$${product.shippingFee?.toFixed(2)} (≈ ${(product.shippingFee! * exchangeRate).toLocaleString()} KZ)`}
                    </p>
                  </div>
               </div>
            )}

            {/* Course Details */}
            {product.type === ProductType.DIGITAL_COURSE && product.courseDetails && (
               <div className="p-5 bg-purple-50 rounded-3xl border border-purple-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <BoltIcon className="h-5 w-5 text-purple-600" />
                      <h4 className="text-xs font-black text-purple-900 uppercase">Ementa do Curso</h4>
                    </div>
                    {product.courseDetails.hasCertificate && (
                      <span className="text-[8px] font-black uppercase bg-purple-600 text-white px-2 py-0.5 rounded-full">Certificado</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/50 p-3 rounded-2xl">
                       <p className="text-[9px] font-black text-purple-400 uppercase">Aulas</p>
                       <p className="text-lg font-black text-purple-900">{product.courseDetails.lessonsCount}</p>
                    </div>
                    <div className="bg-white/50 p-3 rounded-2xl">
                       <p className="text-[9px] font-black text-purple-400 uppercase">Total Horas</p>
                       <p className="text-lg font-black text-purple-900">{product.courseDetails.totalHours}h</p>
                    </div>
                  </div>
                  {product.courseDetails.modules.length > 0 && (
                    <div className="space-y-1 mt-2">
                       {product.courseDetails.modules.map((m, i) => (
                         <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-purple-700 bg-white/30 p-2 rounded-lg">
                           <span className="w-5 h-5 flex items-center justify-center bg-purple-200 rounded-md text-[8px]">{i+1}</span> {m}
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            )}

            <p className="text-gray-500 font-medium text-sm leading-relaxed">{product.description}</p>

            {/* SELEÇÃO DE CORES (Apenas se houver cores) */}
            {product.type === ProductType.PHYSICAL && product.colors && product.colors.length > 0 && (
              <div className="space-y-3 pt-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escolha a Cor</label>
                <div className="flex flex-wrap gap-2">
                   {product.colors.map(color => (
                     <button
                       key={color}
                       onClick={() => setSelectedColor(color)}
                       className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                         selectedColor === color 
                          ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' 
                          : 'border-gray-100 text-gray-400 hover:border-gray-200'
                       }`}
                     >
                       {color}
                     </button>
                   ))}
                </div>
              </div>
            )}

            {/* SELEÇÃO DE QUANTIDADE */}
            <div className="space-y-3 pt-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade</label>
              <div className="flex items-center w-fit bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
                 <button 
                   onClick={() => setQuantity(Math.max(1, quantity - 1))}
                   className="p-3 bg-white rounded-xl shadow-sm hover:text-blue-600 active:scale-90 transition-all"
                 >
                   <MinusIcon className="h-5 w-5" />
                 </button>
                 <span className="w-14 text-center font-black text-lg text-gray-900">{quantity}</span>
                 <button 
                   onClick={() => setQuantity(quantity + 1)}
                   className="p-3 bg-white rounded-xl shadow-sm hover:text-blue-600 active:scale-90 transition-all"
                 >
                   <PlusIcon className="h-5 w-5" />
                 </button>
              </div>
            </div>

            {/* INFO DO VENDEDOR */}
            {owner && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <img src={owner.profilePicture || DEFAULT_PROFILE_PIC} className="w-12 h-12 rounded-2xl object-cover shadow-sm border" />
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase">Enviado por</p>
                      <p className="font-black text-sm text-gray-900">{owner.firstName} {owner.lastName}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={handleStartChat} className="bg-blue-50 p-2 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Conversar com vendedor">
                      <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
                   </button>
                   <button onClick={() => {onClose(); onNavigate('profile', { userId: owner.id });}} className="bg-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-gray-600 hover:bg-blue-600 hover:text-white transition-all">Perfil</button>
                </div>
              </div>
            )}



            {product.affiliateCommissionRate > 0 && currentUser.id !== owner?.id && (
              <div className="mt-4 p-6 bg-green-50 rounded-3xl border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                  <h4 className="text-xs font-black text-green-900 uppercase">Programa de Afiliados</h4>
                </div>
                <p className="text-[10px] text-green-700 font-medium mb-4">
                  Venda este produto e ganhe <span className="font-black text-sm">{product.affiliateCommissionRate}%</span> de comissão sobre o valor da venda!
                </p>
                <button 
                  onClick={async () => {
                    const affiliateLink = `${window.location.origin}?page=store&productId=${product.id}&affiliateId=${currentUser.id}`;
                    if (owner?.id) {
                      await saveAffiliateLink(currentUser.id, product.id, affiliateLink, owner.id);
                      navigator.clipboard.writeText(affiliateLink);
                      showAlert("Você agora é um afiliado! Link de rastreamento copiado para sua área de transferência.", { type: 'success' });
                    } else {
                      showAlert("Erro ao identificar o dono do produto.", { type: 'error' });
                    }
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700 transition-all"
                >
                  Gerar meu Link de Afiliado
                </button>
              </div>
            )}

            {/* AVALIAÇÕES */}
            <div className="mt-10 space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Avaliações ({product.ratingCount || 0})</h3>
                   {product.ratingCount > 0 ? (
                      <div className="flex items-center text-yellow-500 gap-1">
                         <StarIconSolid className="h-4 w-4" />
                         <span className="text-sm font-black">{product.averageRating.toFixed(1)}</span>
                      </div>
                   ) : (
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">Aguardando Avaliação</span>
                   )}
                </div>
                
                {product.ratings && product.ratings.length > 0 ? (
                  <div className="space-y-4">
                     {product.ratings.slice(0, 5).map(r => (
                       <ReviewItem key={r.id} rating={r} />
                     ))}
                     {product.ratings.length > 5 && (
                       <button className="w-full text-[10px] font-black uppercase text-blue-600 tracking-widest pt-4">Ver todas as {(product.ratings.length)} avaliações</button>
                     )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-3xl p-8 text-center border border-gray-100">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma avaliação ainda</p>
                  </div>
                )}
            </div>
          </div>

          <div className="mt-10 flex gap-3 sticky bottom-0 bg-white py-4 md:py-2">
             <button 
               onClick={handleAddToCartClick}
               className={`flex-[3] py-4 md:py-5 rounded-2xl font-black text-base md:text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                 isAdded ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-blue-600'
               }`}
             >
               {isAdded ? (
                 <>
                   <CheckIcon className="h-6 w-6 md:h-8 md:w-8" /> Adicionado
                 </>
               ) : (
                 <>
                   <ShoppingCartIcon className="h-6 w-6 md:h-8 md:w-8" /> {quantity > 1 ? `Comprar ${quantity} itens` : 'Adicionar ao Carrinho'}
                 </>
               )}
             </button>
             <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 md:py-5 rounded-2xl font-black flex items-center justify-center transition-all active:scale-95">
               <ShareIcon className="h-6 w-6" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
