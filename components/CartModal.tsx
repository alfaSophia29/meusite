
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CartItem, Product, User, ShippingAddress, ProductType, CARRIERS, Carrier } from '../types';
import { updateUserBalance, saveUserAddress, getCart, getProducts, updateCartItemQuantity, removeFromCart, processProductPurchase } from '../services/storageService';
import { getExchangeRates, ExchangeRates } from '../services/currencyService';
import { XMarkIcon, PlusIcon, MinusIcon, TrashIcon, QrCodeIcon, BanknotesIcon, ShoppingBagIcon, ArrowRightIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import { CheckIcon, ShieldCheckIcon, BoltIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import CryptomusPaymentForm from './CryptomusPaymentForm';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onCartUpdate: () => void;
  refreshUser: () => void;
}

const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, currentUser, onCartUpdate, refreshUser }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    USD: 1,
    BRL: 5.25,
    EUR: 0.93,
    AOA: 900
  });
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'BRL' | 'EUR' | 'AOA'>('USD');
  const [view, setView] = useState<'cart' | 'shipping' | 'carrier' | 'payment' | 'cryptomus' | 'processing' | 'success'>('cart');
  const [shippingDetails, setShippingDetails] = useState<ShippingAddress>(() => 
    currentUser.address || { address: '', city: '', state: '', zipCode: '' }
  );
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<'balance' | 'pix' | 'card' | 'cryptomus' | null>(null);
  const [formError, setFormError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen) {
        const cart = getCart();
        const allProducts = await getProducts();
        const rates = await getExchangeRates();
        
        setCartItems(cart);
        setProducts(allProducts);
        setExchangeRates(rates);
        setView('cart');
        setFormError('');
        setIsProcessing(false);
        setFormError('');
        setSelectedPayment(null);
        processingRef.current = false;
        if (currentUser.address) {
          setShippingDetails(currentUser.address);
        }
      }
    };
    
    fetchData();
  }, [isOpen, currentUser.address]);

  const syncCart = () => {
    setCartItems(getCart());
    onCartUpdate();
  };

  const detailedCartItems = useMemo(() => {
    return cartItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      return product ? { ...item, product } : null;
    }).filter((item): item is (CartItem & { product: Product }) => item !== null);
  }, [cartItems, products]);

  const subtotal = useMemo(() => detailedCartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [detailedCartItems]);

  const shippingTotal = useMemo(() => {
    return detailedCartItems.reduce((sum, item) => {
      if (item.product.type === ProductType.PHYSICAL && !item.product.hasFreeShipping) {
        // Here we assume shipping is per product, not per quantity, but this can be adjusted
        return sum + (item.product.shippingFee || 0);
      }
      return sum;
    }, 0);
  }, [detailedCartItems]);

  const grandTotal = subtotal + shippingTotal;

  const currencySymbols = {
    USD: '$',
    BRL: 'R$',
    EUR: '€',
    AOA: 'Kz'
  };

  const formatPrice = (price: number) => {
    const rate = exchangeRates[selectedCurrency];
    const converted = price * rate;
    return `${currencySymbols[selectedCurrency]}${converted.toFixed(2)}`;
  };

  const filteredCarriers = useMemo(() => {
    if (!shippingDetails.state) return CARRIERS;
    // Lógica de filtro por país/estado se disponível, por enquanto geral
    return CARRIERS.filter(c => {
      if (selectedCurrency === 'AOA') return c.countries.includes('Angola');
      return !c.countries.includes('Angola') || c.id === 'dhl' || c.id === 'ups';
    });
  }, [selectedCurrency, shippingDetails.state]);

  const hasInsufficientBalance = (currentUser.balance || 0) < subtotal;

  const handleConfirmPurchase = () => {
    if (isProcessing || processingRef.current) return;
    if (selectedPayment === 'balance' && hasInsufficientBalance) {
      setFormError('Saldo insuficiente na sua carteira CyBer.');
      return;
    }

    if (selectedPayment === 'cryptomus') {
        setView('cryptomus');
        return;
    }

    executeFinalPurchase();
  };

  const executeFinalPurchase = () => {
    if (isProcessing || processingRef.current) return;
    setIsProcessing(true);
    processingRef.current = true;
    setView('processing');
    
    // Tenta recuperar o ID do afiliado salvo no navegador
    const affiliateId = localStorage.getItem('cyber_referrer_id');

    setTimeout(async () => {
      try {
        // Se o usuário optou por salvar o endereço
        if (saveAddress) {
          await saveUserAddress(currentUser.id, shippingDetails);
        }

        // REMOVIDO: updateUserBalance redundante (já feito no processProductPurchase)
        
        const carrierInfo = selectedCarrier ? { id: selectedCarrier.id, name: selectedCarrier.name } : undefined;
        const success = await processProductPurchase(cartItems, currentUser.id, affiliateId, shippingDetails, carrierInfo);
        
        if (success) {
          refreshUser();
          onCartUpdate();
          setView('success');
          // processingRef remains true until modal is closed/reopened or reset in success view if needed
          // but usually on success we just close the modal.
        } else {
          setFormError('Erro ao processar compra. Verifique sua conexão ou saldo.');
          setView('payment');
          setIsProcessing(false);
          processingRef.current = false;
        }
      } catch (err) {
        console.error("Purchase error:", err);
        setFormError('Erro crítico ao processar compra.');
        setView('payment');
        setIsProcessing(false);
        processingRef.current = false;
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
        <div className="p-4 xs:p-6 border-b border-gray-100 dark:border-white/10 space-y-4 bg-white dark:bg-darkcard sticky top-0 z-10">
          <div className="flex justify-between items-center">
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

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-black text-gray-400 uppercase mr-2 shrink-0">Câmbio:</span>
            {(['USD', 'BRL', 'EUR', 'AOA'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border ${
                  selectedCurrency === curr 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                    : 'bg-gray-50 text-gray-500 border-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-gray-400 hover:bg-gray-100'
                }`}
              >
                {curr === 'AOA' ? 'KZ' : curr}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 xs:p-6 space-y-4 custom-scrollbar">
          {view === 'cart' && (
            <div className="space-y-3 xs:space-y-4">
              {detailedCartItems.length === 0 ? (
                <div className="text-center py-20 xs:py-24">
                  <ShoppingBagIcon className="h-10 w-10 xs:h-12 xs:w-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-400 font-black uppercase text-[10px] xs:text-xs">Vazio</p>
                </div>
              ) : (
                detailedCartItems.map(item => (
                  <div key={item.productId} className="flex gap-3 xs:gap-4 p-3 xs:p-4 bg-gray-50 dark:bg-white/5 rounded-[1.5rem] xs:rounded-[2rem] border border-transparent">
                    <img src={item.product.imageUrls[0]} className="w-14 h-14 xs:w-16 xs:h-16 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                       <p className="font-black text-xs xs:text-sm text-gray-900 dark:text-white truncate">{item.product.name}</p>
                       <p className="text-blue-600 font-black text-sm xs:text-base">{formatPrice(item.product.price)}</p>
                       <div className="flex items-center justify-between mt-1 xs:mt-2">
                          <div className="flex items-center bg-white dark:bg-white/10 rounded-lg p-0.5 xs:p-1">
                             <button onClick={() => { updateCartItemQuantity(item.productId, item.quantity - 1); syncCart(); }} className="p-1"><MinusIcon className="h-2.5 w-2.5 xs:h-3 xs:w-3"/></button>
                             <span className="w-5 xs:w-6 text-center font-bold text-[10px] xs:text-xs">{item.quantity}</span>
                             <button onClick={() => { updateCartItemQuantity(item.productId, item.quantity + 1); syncCart(); }} className="p-1"><PlusIcon className="h-2.5 w-2.5 xs:h-3 xs:w-3"/></button>
                          </div>
                          <button 
                            onClick={() => { removeFromCart(item.productId); syncCart(); }}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors group"
                            title="Remover item"
                          >
                            <TrashIcon className="h-4 w-4 xs:h-5 xs:w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                          </button>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === 'shipping' && (
            <div className="space-y-4 xs:space-y-6 animate-fade-in px-1">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-2xl text-red-600">
                    <MapPinIcon className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="font-black text-lg xs:text-xl text-gray-900 dark:text-white uppercase tracking-tighter">Dados de Entrega</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Onde seu produto CyBer deve chegar?</p>
                 </div>
              </div>
              
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">País / Destino</label>
                    <select 
                      value={selectedCurrency === 'AOA' ? 'Angola' : 'Outro'} 
                      onChange={(e) => setSelectedCurrency(e.target.value === 'Angola' ? 'AOA' : 'USD')}
                      className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-blue-500 transition-all appearance-none"
                    >
                      <option value="Angola">Angola</option>
                      <option value="Brasil">Brasil</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Cabo Verde">Cabo Verde</option>
                      <option value="Moçambique">Moçambique</option>
                      <option value="Outro">Outro País (Global)</option>
                    </select>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                    <input type="text" placeholder="Ex: Rua das Flores, 123" value={shippingDetails.address} onChange={e => setShippingDetails({...shippingDetails, address: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-blue-500 transition-all" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cidade</label>
                      <input type="text" placeholder="Sua Cidade" value={shippingDetails.city} onChange={e => setShippingDetails({...shippingDetails, city: e.target.value})} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-blue-500 transition-all" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado / Província</label>
                      <input type="text" placeholder="Ex: Luanda" value={shippingDetails.state} onChange={e => setShippingDetails({...shippingDetails, state: e.target.value})} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-blue-500 transition-all" />
                   </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Código Postal / Referência</label>
                    <input type="text" placeholder="Referência de entrega" value={shippingDetails.zipCode} onChange={e => setShippingDetails({...shippingDetails, zipCode: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-blue-500 transition-all" />
                 </div>
              </div>

              <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl cursor-pointer group hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
                 <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${saveAddress ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-white/20'}`}>
                    {saveAddress && <CheckIcon className="h-4 w-4 text-white" />}
                 </div>
                 <input type="checkbox" className="hidden" checked={saveAddress} onChange={() => setSaveAddress(!saveAddress)} />
                 <span className="text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight">Salvar endereço no meu perfil</span>
              </label>
            </div>
          )}

          {view === 'carrier' && (
            <div className="space-y-4 xs:space-y-6 animate-fade-in px-1">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl text-blue-600">
                    <TruckIcon className="h-6 w-6" />
                 </div>
                 <div>
                    <h3 className="font-black text-lg xs:text-xl text-gray-900 dark:text-white uppercase tracking-tighter">Transportadora</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Escolha o serviço de frete ideal</p>
                 </div>
              </div>

              <div className="space-y-3">
                 {filteredCarriers.map(carrier => (
                   <button 
                     key={carrier.id} 
                     onClick={() => setSelectedCarrier(carrier)}
                     className={`w-full flex items-center justify-between p-5 border-2 rounded-[2rem] transition-all ${selectedCarrier?.id === carrier.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10 shadow-lg' : 'border-gray-50 dark:border-white/5 hover:border-gray-200'}`}
                   >
                     <div className="flex items-center gap-4 text-left">
                        <div className={`p-3 rounded-2xl ${selectedCarrier?.id === carrier.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                           <TruckIcon className="h-6 w-6" />
                        </div>
                        <div>
                           <p className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight">{carrier.name}</p>
                           <p className="text-[9px] font-black text-gray-400 uppercase">{carrier.estimatedDays}</p>
                        </div>
                     </div>
                     {selectedCarrier?.id === carrier.id && (
                       <div className="bg-blue-600 rounded-full p-1">
                         <CheckIcon className="h-4 w-4 text-white" />
                       </div>
                     )}
                   </button>
                 ))}
              </div>
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
                          {formatPrice(currentUser.balance || 0)}
                        </p>
                     </div>
                  </div>
                  {selectedPayment === 'balance' && <CheckIcon className="h-4 w-4 xs:h-5 xs:w-5 text-blue-600" />}
                </button>
                
                <button onClick={() => setSelectedPayment('cryptomus')} className={`w-full flex items-center justify-between p-4 xs:p-5 border-2 rounded-2xl xs:rounded-3xl transition-all ${selectedPayment === 'cryptomus' ? 'border-purple-600 bg-purple-50 dark:bg-purple-600/10' : 'border-gray-50 dark:border-white/5'}`}>
                  <div className="flex items-center gap-3 xs:gap-4">
                     <div className="p-2 xs:p-3 bg-purple-600 text-white rounded-lg xs:rounded-xl"><BoltIcon className="h-5 w-5 xs:h-6 xs:w-6" /></div>
                     <div className="text-left"><p className="font-black text-gray-900 dark:text-white text-xs xs:text-sm">Criptomoedas</p><p className="text-[8px] xs:text-[10px] text-gray-400 font-black">Cryptomus Gate</p></div>
                  </div>
                  {selectedPayment === 'cryptomus' && <CheckIcon className="h-4 w-4 xs:h-5 xs:w-5 text-purple-600" />}
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
              amount={subtotal} 
              currency={selectedCurrency}
              exchangeRate={exchangeRates[selectedCurrency]}
              onConfirm={executeFinalPurchase} 
              onCancel={() => setView('payment')} 
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
          <div className="p-5 xs:p-8 border-t border-gray-100 dark:border-white/10 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                <span className="text-base font-black text-gray-900 dark:text-white tracking-tighter">{formatPrice(subtotal)}</span>
              </div>
              
              {detailedCartItems.some(i => i.product.type === ProductType.PHYSICAL) && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frete</span>
                  <span className="text-xs font-black text-gray-600 dark:text-gray-300 tracking-tighter">
                    {shippingTotal === 0 ? (
                      <span className="text-green-600">Grátis</span>
                    ) : (
                      <>
                        ${shippingTotal.toFixed(2)} 
                        <span className="text-[10px] ml-1 text-blue-600 opacity-80">
                          (≈ {(shippingTotal * (exchangeRates.AOA || 930)).toLocaleString()} KZ)
                        </span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-end mb-4 xs:mb-6 pt-2 border-t border-gray-50 dark:border-white/5">
               <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Total</span>
               <span className="text-2xl xs:text-3xl font-black text-blue-600 tracking-tighter">
                 {formatPrice(grandTotal)}
                 {selectedCurrency === 'USD' && (
                   <span className="block text-[10px] font-black text-green-600 uppercase tracking-tighter">
                     ≈ {(grandTotal * (exchangeRates.AOA || 930)).toLocaleString()} KZ
                   </span>
                 )}
               </span>
            </div>

            {view === 'cart' && (
              <button onClick={() => setView(detailedCartItems.some(i => i.product.type === ProductType.PHYSICAL) ? 'shipping' : 'payment')} className="w-full bg-blue-600 text-white py-4 xs:py-5 rounded-[1.5rem] xs:rounded-[2rem] font-black text-xs xs:text-sm flex items-center justify-center gap-2 xs:gap-3">Prosseguir <ArrowRightIcon className="h-4 w-4 xs:h-5 xs:w-5"/></button>
            )}
            
            {view === 'shipping' && (
              <button 
                onClick={() => setView('carrier')} 
                disabled={!shippingDetails.address || !shippingDetails.city}
                className="w-full bg-blue-600 text-white py-4 xs:py-5 rounded-[1.5rem] xs:rounded-[2rem] font-black text-xs xs:text-sm flex items-center justify-center gap-2 xs:gap-3 disabled:bg-gray-300 transition-all"
              >
                Escolher Transportadora
              </button>
            )}

            {view === 'carrier' && (
              <button 
                onClick={() => setView('payment')} 
                disabled={!selectedCarrier}
                className="w-full bg-blue-600 text-white py-4 xs:py-5 rounded-[1.5rem] xs:rounded-[2rem] font-black text-xs xs:text-sm flex items-center justify-center gap-2 xs:gap-3 disabled:bg-gray-300 transition-all"
              >
                Prosseguir para Pagamento
              </button>
            )}

            {view === 'payment' && (
              <button 
                onClick={handleConfirmPurchase} 
                disabled={isProcessing || !selectedPayment || (selectedPayment === 'balance' && hasInsufficientBalance)} 
                className={`w-full py-4 xs:py-5 rounded-[1.5rem] xs:rounded-[2rem] font-black text-xs xs:text-sm text-white shadow-xl transition-all ${isProcessing || (selectedPayment === 'balance' && hasInsufficientBalance) ? 'bg-gray-400' : 'bg-black dark:bg-white dark:text-black'}`}
              >
                {isProcessing ? 'Processando...' : (selectedPayment === 'balance' && hasInsufficientBalance ? 'Saldo Insuficiente' : 'Pagar Agora')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
