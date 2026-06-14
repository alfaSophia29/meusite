
import React, { useState, useMemo, useEffect } from 'react';
import { CartItem, Product, User, ShippingAddress, ProductType } from '../types';
import { getCart, updateCartItemQuantity, removeFromCart, processProductPurchase, findProductById } from '../services/storageService';
import { XMarkIcon, PlusIcon, MinusIcon, TrashIcon, BanknotesIcon, ShoppingBagIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { CheckIcon, BoltIcon } from '@heroicons/react/24/solid';
import CryptomusPaymentForm from './CryptomusPaymentForm';
import UnitelMoneyForm from './UnitelMoneyForm';
import { DEFAULT_PRODUCT_IMG } from '../data/constants';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCartUpdate: () => void;
  refreshUser: () => void;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, currentUser, onCartUpdate, refreshUser }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [view, setView] = useState<'cart' | 'shipping' | 'payment' | 'cryptomus' | 'unitel' | 'processing' | 'success'>('cart');
  const [shippingDetails, setShippingDetails] = useState<ShippingAddress>({ address: '', city: '', state: '', zipCode: '' });
  const [selectedPayment, setSelectedPayment] = useState<'balance' | 'pix' | 'card' | 'cryptomus' | 'unitel' | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const cart = getCart();
      setCartItems(cart);
      setView('cart');
      setFormError('');
      setSelectedPayment(null);
      
      // Carregar produtos do cache local como fallback inicial
      const localProducts = JSON.parse(localStorage.getItem('cyber_products') || '[]') as Product[];
      const initialProducts: Record<string, Product> = {};
      localProducts.forEach(p => {
        initialProducts[p.id] = p;
      });
      setProducts(initialProducts);
      
      // Fetch fresh product details for items in cart
      const fetchProductDetails = async () => {
        setLoadingProducts(true);
        const newProducts: Record<string, Product> = { ...initialProducts };
        
        try {
          // Buscamos todos para garantir que estão atualizados (preço, estoque, etc)
          await Promise.all(cart.map(async (item: CartItem) => {
            const p = await findProductById(item.productId);
            if (p) {
              newProducts[p.id] = p;
            }
          }));
          
          setProducts(newProducts);
        } catch (err) {
          console.error("Error fetching cart products:", err);
        } finally {
          setLoadingProducts(false);
        }
      };

      if (cart.length > 0) {
        fetchProductDetails();
      }
    }
  }, [isOpen]);

  const syncCart = () => {
    const cart = getCart();
    setCartItems(cart);
    onCartUpdate();
  };

  const detailedCartItems = useMemo(() => {
    return cartItems.map(item => {
      const product = products[item.productId];
      return { ...item, product } as CartItem & { product?: Product };
    });
  }, [cartItems, products]);

  const subtotal = useMemo(() => 
    detailedCartItems.reduce((sum, item) => {
      let itemPrice = item.product?.price || 0;
      if (item.selectedVariationId && item.product?.variations) {
        const variation = item.product.variations.find(v => v.id === item.selectedVariationId);
        if (variation && typeof variation.price === 'number') {
          itemPrice = variation.price;
        }
      }
      return sum + itemPrice * item.quantity;
    }, 0), 
  [detailedCartItems]);

  const hasInsufficientBalance = (currentUser.balance || 0) < subtotal;

  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmPurchase = () => {
    if (isProcessing) return;

    if (selectedPayment === 'balance' && hasInsufficientBalance) {
      setFormError('Saldo insuficiente na sua carteira CyBer.');
      return;
    }

    if (selectedPayment === 'cryptomus') {
        setView('cryptomus');
        return;
    }

    if (selectedPayment === 'unitel') {
        setView('unitel');
        return;
    }

    executeFinalPurchase();
  };

  const executeFinalPurchase = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setView('processing');
    
    // Tenta recuperar o ID do afiliado salvo no navegador
    const affiliateId = localStorage.getItem('cyber_referrer_id');

    setTimeout(async () => {
      try {
        const isBalance = selectedPayment === 'balance';
        
        const carrierArg = shippingDetails.carrier 
          ? { id: 'customer_selected', name: shippingDetails.carrier } 
          : undefined;
        
        const success = await processProductPurchase(cartItems, currentUser.id, affiliateId, shippingDetails, isBalance, carrierArg);
        if (success) {
          refreshUser();
          onCartUpdate();
          setView('success');
        } else {
          setFormError('Erro ao processar compra.');
          setView('payment');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("Purchase error:", err);
        setFormError('Erro inesperado ao processar compra.');
        setView('payment');
        setIsProcessing(false);
      }
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end overflow-hidden" onClick={onClose}>
      <div 
        className="bg-white dark:bg-darkcard w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-left relative" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 xs:p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-white dark:bg-darkcard sticky top-0 z-10">
          <div className="flex items-center gap-2 xs:gap-3">
             <div className="bg-blue-600 p-2 xs:p-2.5 rounded-xl xs:rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none">
                <ShoppingBagIcon className="h-5 w-5 xs:h-6 xs:w-6 text-white" />
             </div>
             <div>
                <h2 className="text-lg xs:text-xl font-black text-gray-900 dark:text-white tracking-tighter">Minha Sacola</h2>
                <p className="text-[8px] xs:text-[10px] text-gray-400 font-bold uppercase tracking-widest">{detailedCartItems.length} Itens</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors group">
            <XMarkIcon className="h-6 w-6 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 xs:p-6 space-y-4 custom-scrollbar">
          {view === 'cart' && (
            <div className="space-y-3 xs:space-y-4">
              {loadingProducts && cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600 mb-4"></div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Atualizando sacola...</p>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-20 xs:py-24">
                  <ShoppingBagIcon className="h-10 w-10 xs:h-12 xs:w-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-black uppercase text-[10px] xs:text-xs">Vazio</p>
                </div>
              ) : (
                detailedCartItems.map((item, idx) => {
                  const itemPrice = (() => {
                    if (item.selectedVariationId && item.product?.variations) {
                      const variation = item.product.variations.find(v => v.id === item.selectedVariationId);
                      if (variation && typeof variation.price === 'number') {
                        return variation.price;
                      }
                    }
                    return item.product?.price || 0;
                  })();

                  const matchedVariation = item.selectedVariationId && item.product?.variations
                    ? item.product.variations.find(v => v.id === item.selectedVariationId)
                    : null;

                  return (
                    <div key={item.product ? `${item.product.id}-${item.selectedVariationId || ''}` : `loading-${idx}`} className="flex gap-3 xs:gap-4 p-3 xs:p-4 bg-gray-50 dark:bg-white/5 rounded-[1.5rem] xs:rounded-[2rem] border border-transparent transition-all">
                      {item.product ? (
                        <>
                          <img src={matchedVariation?.imageUrl || (item.product.imageUrls && item.product.imageUrls[0]) || DEFAULT_PRODUCT_IMG} onError={(e) => { e.currentTarget.src = DEFAULT_PRODUCT_IMG; }} className="w-14 h-14 xs:w-16 xs:h-16 rounded-xl object-cover animate-fade-in" />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-xs xs:text-sm text-gray-900 dark:text-white truncate">{item.product.name}</p>
                            {matchedVariation && (
                              <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-0.5">Opção: {matchedVariation.name}</p>
                            )}
                            <p className="text-gray-450 dark:text-gray-400 font-bold text-[10px] xs:text-xs mt-0.5">{itemPrice.toLocaleString('pt-BR')} KZ</p>
                            <div className="flex items-center justify-between mt-1 xs:mt-2">
                               <div className="flex items-center bg-white dark:bg-white/10 rounded-lg p-0.5 xs:p-1">
                                  <button onClick={() => { updateCartItemQuantity(item.productId, item.quantity - 1); syncCart(); }} className="p-1"><MinusIcon className="h-2.5 w-2.5 xs:h-3 xs:w-3"/></button>
                                  <span className="w-5 xs:w-6 text-center font-bold text-[10px] xs:text-xs">{item.quantity}</span>
                                  <button onClick={() => { updateCartItemQuantity(item.productId, item.quantity + 1); syncCart(); }} className="p-1"><PlusIcon className="h-2.5 w-2.5 xs:h-3 xs:w-3"/></button>
                               </div>
                               <button onClick={() => { removeFromCart(item.productId); syncCart(); }}><TrashIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-gray-300 hover:text-red-500"/></button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 xs:w-16 xs:h-16 rounded-xl bg-gray-200 dark:bg-white/10 animate-pulse" />
                          <div className="flex-1 min-w-0 space-y-2">
                             <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse w-3/4" />
                             <div className="h-4 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse w-1/4" />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {view === 'shipping' && (
            <div className="space-y-4 xs:space-y-6 animate-fade-in">
              <h3 className="font-black text-lg xs:text-xl text-gray-900 dark:text-white">Entrega</h3>
              <input type="text" placeholder="Endereço Completo" value={shippingDetails.address} onChange={e => setShippingDetails({...shippingDetails, address: e.target.value})} className="w-full p-3.5 xs:p-4 bg-gray-50 dark:bg-white/5 rounded-xl xs:rounded-2xl outline-none font-bold text-xs xs:text-sm" />
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4">
                 <input type="text" placeholder="Cidade" value={shippingDetails.city} onChange={e => setShippingDetails({...shippingDetails, city: e.target.value})} className="p-3.5 xs:p-4 bg-gray-50 dark:bg-white/5 rounded-xl xs:rounded-2xl outline-none font-bold text-xs xs:text-sm" />
                 <input type="text" placeholder="CEP" value={shippingDetails.zipCode} onChange={e => setShippingDetails({...shippingDetails, zipCode: e.target.value})} className="p-3.5 xs:p-4 bg-gray-50 dark:bg-white/5 rounded-xl xs:rounded-2xl outline-none font-bold text-xs xs:text-sm" />
              </div>
              <input type="text" placeholder="Transportadora / Agência de Envio" value={shippingDetails.carrier || ''} onChange={e => setShippingDetails({...shippingDetails, carrier: e.target.value})} className="w-full p-3.5 xs:p-4 bg-gray-50 dark:bg-white/5 rounded-xl xs:rounded-2xl outline-none font-bold text-xs xs:text-sm" />
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest px-1">Especifique como deseja que o produto seja enviado.</p>
            </div>
          )}

          {view === 'payment' && (
            <div className="space-y-4 xs:space-y-6 animate-fade-in">
              <h3 className="font-black text-lg xs:text-xl text-gray-900 dark:text-white">Pagamento</h3>
              <div className="space-y-2 xs:space-y-3">
                <button 
                  onClick={() => setSelectedPayment('balance')} 
                  className={`w-full flex items-center justify-between p-4 xs:p-5 border-2 rounded-2xl xs:rounded-3xl transition-all relative overflow-hidden ${selectedPayment === 'balance' ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10' : 'border-gray-50 dark:border-white/5'}`}
                >
                  <div className="flex items-center gap-3 xs:gap-4">
                     <div className="p-2 xs:p-3 bg-blue-600 text-white rounded-lg xs:rounded-xl"><BanknotesIcon className="h-5 w-5 xs:h-6 xs:w-6" /></div>
                     <div className="text-left">
                        <p className="font-black text-gray-900 dark:text-white text-xs xs:text-sm">Saldo CyBer</p>
                        <p className={`text-[8px] xs:text-[10px] font-black ${hasInsufficientBalance ? 'text-red-500' : 'text-gray-400'}`}>
                          ${(currentUser.balance || 0).toFixed(2)}
                        </p>
                     </div>
                  </div>
                  {selectedPayment === 'balance' && <CheckIcon className="h-4 w-4 xs:h-5 xs:w-5 text-blue-600" />}
                </button>
                
                <button onClick={() => setSelectedPayment('cryptomus')} className={`w-full flex items-center justify-between p-4 xs:p-5 border-2 rounded-2xl xs:rounded-3xl transition-all ${selectedPayment === 'cryptomus' ? 'border-purple-600 bg-purple-50 dark:bg-purple-600/10' : 'border-gray-50 dark:border-white/5'}`}>
                  <div className="flex items-center gap-3 xs:gap-4">
                     <div className="p-2 xs:p-3 bg-purple-600 text-white rounded-lg xs:rounded-xl"><BoltIcon className="h-5 w-5 xs:h-6 xs:w-6" /></div>
                     <div className="text-left"><p className="font-black text-gray-900 dark:text-white text-xs xs:text-sm">Criptomoedas</p><p className="text-[8px] xs:text-[10px] text-gray-400 font-black">Cryptomus (USDT)</p></div>
                  </div>
                  {selectedPayment === 'cryptomus' && <CheckIcon className="h-4 w-4 xs:h-5 xs:w-5 text-purple-600" />}
                </button>

                <button onClick={() => setSelectedPayment('unitel')} className={`w-full flex items-center justify-between p-4 xs:p-5 border-2 rounded-2xl xs:rounded-3xl transition-all ${selectedPayment === 'unitel' ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-gray-50 dark:border-white/5'}`}>
                   <div className="flex items-center gap-3 xs:gap-4">
                      <div className="p-2 xs:p-3 bg-orange-500 text-white rounded-lg xs:rounded-xl"><BanknotesIcon className="h-5 w-5 xs:h-6 xs:w-6" /></div>
                      <div className="text-left"><p className="font-black text-gray-900 dark:text-white text-xs xs:text-sm">Unitel Money</p><p className="text-[8px] xs:text-[10px] text-gray-400 font-black">KZ (Kwanza)</p></div>
                   </div>
                   {selectedPayment === 'unitel' && <CheckIcon className="h-4 w-4 xs:h-5 xs:w-5 text-orange-600" />}
                </button>
              </div>

              {hasInsufficientBalance && selectedPayment === 'balance' && (
                <div className="p-3 xs:p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 rounded-xl xs:rounded-2xl flex flex-col items-center text-center gap-2 xs:gap-3">
                   <p className="text-[10px] xs:text-xs text-red-600 font-bold uppercase tracking-widest">Saldo insuficiente.</p>
                   <button onClick={() => setView('cryptomus')} className="text-[8px] xs:text-[10px] font-black text-white bg-blue-600 px-3 xs:px-4 py-1.5 xs:py-2 rounded-lg uppercase">Recarregar</button>
                </div>
              )}
              {formError && <p className="text-red-500 text-center text-[10px] xs:text-xs font-bold">{formError}</p>}
            </div>
          )}

          {view === 'cryptomus' && (
            <CryptomusPaymentForm 
              currentUser={currentUser} 
              onSuccess={executeFinalPurchase} 
              onCancel={() => setView('payment')} 
              mode="purchase"
              fixedAmount={subtotal}
            />
          )}

          {view === 'unitel' && (
            <UnitelMoneyForm 
              currentUser={currentUser} 
              onSuccess={executeFinalPurchase} 
              mode="purchase"
            />
          )}

          {view === 'processing' && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-10 h-10 xs:w-12 xs:h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-lg xs:text-xl font-black">Processando...</h3>
            </div>
          )}

          {view === 'success' && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 xs:gap-6">
              <CheckIcon className="h-12 w-12 xs:h-16 xs:w-16 text-green-500" />
              <h3 className="text-xl xs:text-2xl font-black">Compra Efetuada!</h3>
              <button onClick={onClose} className="w-full bg-blue-600 text-white py-3.5 xs:py-4 rounded-xl xs:rounded-2xl font-black">Concluir</button>
            </div>
          )}
        </div>

        {view !== 'success' && view !== 'processing' && view !== 'cryptomus' && detailedCartItems.length > 0 && (
          <div className="p-5 xs:p-8 border-t border-gray-100 dark:border-white/10">
            <div className="flex justify-between items-end mb-4 xs:mb-6">
               <span className="text-[8px] xs:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
               <span className="text-2xl xs:text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{subtotal.toLocaleString('pt-BR')} KZ</span>
            </div>
            {view === 'cart' && (
              <button 
                disabled={isProcessing}
                onClick={() => setView(detailedCartItems.some(i => i.product?.type === ProductType.PHYSICAL) ? 'shipping' : 'payment')} 
                className="w-full bg-blue-600 text-white py-4 xs:py-5 rounded-[1.5rem] xs:rounded-[2rem] font-black text-xs xs:text-sm flex items-center justify-center gap-2 xs:gap-3 disabled:opacity-50"
              >
                Prosseguir <ArrowRightIcon className="h-4 w-4 xs:h-5 xs:w-5"/>
              </button>
            )}
            
            {view === 'shipping' && (
              <button 
                disabled={isProcessing}
                onClick={() => setView('payment')} 
                className="w-full bg-blue-600 text-white py-4 xs:py-5 rounded-[1.5rem] xs:rounded-[2rem] font-black text-xs xs:text-sm flex items-center justify-center gap-2 xs:gap-3 disabled:opacity-50"
              >
                Confirmar Entrega
              </button>
            )}

            {view === 'payment' && (
              <button 
                onClick={handleConfirmPurchase} 
                disabled={isProcessing || !selectedPayment || (selectedPayment === 'balance' && hasInsufficientBalance)} 
                className={`w-full py-4 xs:py-5 rounded-[1.5rem] xs:rounded-[2rem] font-black text-xs xs:text-sm text-white shadow-xl transition-all disabled:opacity-50 ${selectedPayment === 'balance' && hasInsufficientBalance ? 'bg-gray-400' : 'bg-black dark:bg-white dark:text-black'}`}
              >
                {selectedPayment === 'balance' && hasInsufficientBalance ? 'Saldo Insuficiente' : (isProcessing ? 'Processando...' : 'Pagar Agora')}
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
