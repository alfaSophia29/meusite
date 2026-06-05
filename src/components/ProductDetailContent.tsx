
import React, { useState, useEffect } from 'react';
import { Product, User, ProductType, Page } from '../types';
import { findStoreById, findUserById, saveAffiliateLink } from '../services/storageService';
import { 
  ShoppingBagIcon, 
  StarIcon, 
  CheckIcon, 
  ShoppingCartIcon, 
  BoltIcon, 
  ShareIcon,
  LinkIcon,
  TruckIcon,
  AcademicCapIcon,
  BookOpenIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { motion } from 'motion/react';
import { DEFAULT_PROFILE_PIC } from '../data/constants';

interface ProductDetailContentProps {
  currentUser: User;
  product: Product;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  onAddToCart: (productId: string, quantity: number, selectedColor?: string, affiliateId?: string, product?: Product, selectedVariationId?: string) => void;
  onOpenCart: () => void;
}

const ProductDetailContent: React.FC<ProductDetailContentProps> = ({ 
  currentUser, 
  product,
  onNavigate, 
  onAddToCart, 
  onOpenCart 
}) => {
  const [isAdded, setIsAdded] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors && product.colors.length > 0 ? product.colors[0] : undefined
  );
  const [selectedVariation, setSelectedVariation] = useState<{id: string; name: string; price?: number; stock: number; imageUrl?: string} | undefined>(
    product.variations && product.variations.length > 0 ? product.variations.find(v => v.imageUrl === product.imageUrls[0]) || product.variations[0] : undefined
  );
  const [storeOwner, setStoreOwner] = useState<User | null>(null);

  useEffect(() => {
    const fetchOwner = async () => {
      try {
        const store = await findStoreById(product.storeId);
        if (store) {
          const owner = await findUserById(store.professorId);
          if (owner) setStoreOwner(owner);
        }
      } catch (err) {
        console.error("Error fetching store owner:", err);
      }
    };
    fetchOwner();
  }, [product.storeId]);

  useEffect(() => {
    if (selectedVariation?.imageUrl) {
      const idx = product.imageUrls.indexOf(selectedVariation.imageUrl);
      if (idx !== -1) {
        setSelectedImage(idx);
      }
    }
  }, [selectedVariation, product.imageUrls]);

  const handleAddToCart = () => {
    onAddToCart(product.id, 1, selectedColor, undefined, product, selectedVariation?.id);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    onAddToCart(product.id, 1, selectedColor, undefined, product, selectedVariation?.id);
    onOpenCart();
  };

  const handleCopyAffiliateLink = () => {
    const affiliateLink = `${window.location.origin}?page=product-detail&productId=${product.id}&affiliateId=${currentUser.id}`;
    saveAffiliateLink(currentUser.id, product.id, affiliateLink, product.userId);
    navigator.clipboard.writeText(affiliateLink);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 animate-fade-in">
      {/* Product Images */}
      <div className="space-y-4">
        <div className="relative aspect-square rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/10 group">
          <motion.img 
            key={selectedImage}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            src={product.imageUrls[selectedImage]} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            alt={product.name} 
          />
          <div className="absolute top-4 left-4">
             <span className="bg-white/90 dark:bg-darkcard/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black text-gray-900 dark:text-white uppercase shadow-sm border border-black/5 dark:border-white/5">
               {product.type === ProductType.PHYSICAL ? 'Produto Físico' : 'Conteúdo Digital'}
             </span>
          </div>
          
          {product.discountPercentage && product.discountPercentage > 0 && (
            <div className="absolute top-4 right-4">
               <span className="bg-red-500 px-3 py-1 rounded-xl text-[10px] font-black text-white uppercase shadow-lg">
                 -{product.discountPercentage}% OFF
               </span>
            </div>
          )}
        </div>
        
        {product.imageUrls.length > 1 && (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide py-1">
            {product.imageUrls.map((url, index) => (
              <button 
                key={index}
                onClick={() => {
                  setSelectedImage(index);
                  if (product.variations) {
                    const matchedVar = product.variations.find(v => v.imageUrl === url);
                    if (matchedVar) {
                      setSelectedVariation(matchedVar);
                    }
                  }
                }}
                className={`relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <img src={url} className="w-full h-full object-cover" alt={`${product.name} ${index}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex flex-col">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIconSolid 
                  key={i} 
                  className={`h-3 w-3 md:h-4 md:w-4 ${i < Math.round(product.averageRating) ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'}`} 
                />
              ))}
            </div>
            <span className="text-[10px] md:text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
              {product.averageRating.toFixed(1)} ({product.ratingCount} Avaliações)
            </span>
            {product.soldCount && (
               <span className="text-[10px] md:text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5 ml-auto">
                 {product.soldCount}+ Vendidos
               </span>
            )}
          </div>
          
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none mb-4">
            {product.name}
          </h1>
          
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl md:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">
              {(selectedVariation && typeof selectedVariation.price === 'number' ? selectedVariation.price : product.price).toLocaleString('pt-BR')} KZ
            </span>
            {product.originalPrice && product.originalPrice > (selectedVariation && typeof selectedVariation.price === 'number' ? selectedVariation.price : product.price) && (
              <span className="text-lg md:text-xl font-bold text-gray-400 line-through">
                {product.originalPrice.toLocaleString('pt-BR')} KZ
              </span>
            )}
          </div>

          {/* Model / Variation Selector */}
          {product.variations && product.variations.length > 0 && (
            <div className="mb-6 bg-gray-50 dark:bg-white/[0.02] p-6 rounded-3xl border border-gray-100 dark:border-white/5">
              <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Opções / Variações do Produto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.variations.map((v) => {
                  const isSelected = selectedVariation?.id === v.id;
                  const vPrice = v.price ?? product.price;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariation(v);
                        if (v.imageUrl) {
                          const idx = product.imageUrls.indexOf(v.imageUrl);
                          if (idx !== -1) {
                            setSelectedImage(idx);
                          }
                        }
                      }}
                      className={`text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 relative overflow-hidden group ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/10 dark:bg-blue-900/10 ring-2 ring-blue-600/20' 
                          : 'border-transparent bg-white dark:bg-[#131724] hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {v.imageUrl && (
                        <img src={v.imageUrl} className="w-12 h-12 rounded-xl object-cover border dark:border-white/10" alt={v.name} />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-black text-gray-900 dark:text-white uppercase truncate">{v.name || 'Padrão'}</span>
                        <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-0.5">Estoque: {v.stock} un.</span>
                      </div>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {vPrice.toLocaleString('pt-BR')} KZ
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.affiliateCommissionRate > 0 && (
             <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-2xl p-4 flex items-center gap-3 mb-6 md:mb-8">
               <div className="bg-green-500 p-2 rounded-xl text-white">
                 <BoltIcon className="h-5 w-5" />
               </div>
               <div>
                 <p className="text-[9px] md:text-[10px] font-bold text-green-800 dark:text-green-300 uppercase tracking-widest leading-tight">Programa de Afiliados Ativo</p>
                 <p className="text-[10px] md:text-xs font-black text-green-600 dark:text-green-400">Ganhe {(product.affiliateCommissionRate * 100).toFixed(0)}% de comissão indicando este produto</p>
               </div>
             </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-8 md:mb-10">
            <button 
              onClick={handleBuyNow}
              className="flex-1 bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <BoltIcon className="h-5 w-5 fill-current" />
              Comprar Agora
            </button>
            <button 
              onClick={handleAddToCart}
              className={`flex-1 py-4 rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest shadow-lg border-2 transition-all flex items-center justify-center gap-3 ${isAdded ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-transparent border-gray-100 dark:border-white/10 text-gray-900 dark:text-white hover:border-blue-600'}`}
            >
              {isAdded ? (
                <><CheckIcon className="h-5 w-5" /> Adicionado</>
              ) : (
                <><ShoppingCartIcon className="h-5 w-5" /> No Carrinho</>
              )}
            </button>
          </div>

          {/* Tabs / Info */}
          <div className="space-y-6 md:space-y-8 border-t border-gray-100 dark:border-white/5 pt-6 md:pt-8">
            <div>
              <h3 className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Descrição</h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                {product.description}
              </p>
            </div>

            {product.type === ProductType.PHYSICAL && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                   <TruckIcon className="h-5 w-5 text-blue-600 mb-2" />
                   <h4 className="text-[9px] md:text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Entrega</h4>
                   <p className="text-[9px] text-gray-400 font-bold uppercase">{product.hasFreeShipping ? 'Grátis para todo país' : 'Frete no checkout'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                   <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600 mb-2" />
                   <h4 className="text-[9px] md:text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Suporte</h4>
                   <p className="text-[9px] text-gray-400 font-bold uppercase">Chat direto 24/7</p>
                </div>
              </div>
            )}

            {product.type === ProductType.DIGITAL_COURSE && product.courseDetails && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                   <AcademicCapIcon className="h-5 w-5 text-purple-600 mb-2" />
                   <h4 className="text-[9px] md:text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Conteúdo</h4>
                   <p className="text-[9px] text-gray-400 font-bold uppercase">{product.courseDetails.lessonsCount} aulas • {product.courseDetails.totalHours}h</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10">
                   <BookOpenIcon className="h-5 w-5 text-purple-600 mb-2" />
                   <h4 className="text-[9px] md:text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Acesso</h4>
                   <p className="text-[9px] text-gray-400 font-bold uppercase">Vitalício e Imediato</p>
                </div>
              </div>
            )}
          </div>

          {/* Seller Info */}
          {storeOwner && (
            <div className="mt-8 md:mt-12 bg-gray-50 dark:bg-white/5 rounded-3xl p-5 md:p-6 border border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={storeOwner.profilePicture || DEFAULT_PROFILE_PIC} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover border-2 border-white dark:border-white/10 shadow-sm" alt={storeOwner.firstName} />
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Loja de</p>
                  <h4 className="text-sm md:text-base font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">{storeOwner.firstName} {storeOwner.lastName}</h4>
                  <p className="text-[9px] text-green-500 font-bold mt-1 uppercase">Vendedor Platina</p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('chat', { targetUserId: storeOwner.id })}
                className="p-2.5 md:p-3 bg-white dark:bg-white/10 rounded-2xl text-gray-900 dark:text-white shadow-sm hover:scale-110 active:scale-95 transition-all"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>
          )}

          {/* More details */}
          {product.physicalDetails && product.type === ProductType.PHYSICAL && (
             <div className="mt-8 space-y-3">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Especificações Técnicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   <div className="flex justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Estoque</span>
                      <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{product.physicalDetails.stock} Unidades</span>
                   </div>
                   {product.physicalDetails.weight && (
                      <div className="flex justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Peso</span>
                        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{product.physicalDetails.weight} kg</span>
                      </div>
                   )}
                </div>
             </div>
          )}

          {/* Actions Bar Footer for Sharing */}
          <div className="mt-8 flex items-center gap-4 border-t border-gray-100 dark:border-white/5 pt-8">
             <button 
               onClick={handleCopyAffiliateLink}
               className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLinkCopied ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}
             >
               <LinkIcon className="h-4 w-4" />
               {isLinkCopied ? 'Link Copiado!' : 'Indicar Produto'}
             </button>
             <button className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
               <ShareIcon className="h-5 w-5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailContent;
