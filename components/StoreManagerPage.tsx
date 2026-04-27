
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Store, Product, ProductType, OrderStatus, AffiliateSale, GlobalSettings } from '../types';
import { 
  getStores, 
  getProducts, 
  createProduct,
  updateStore,
  getAffiliateSales,
  updateSaleStatus,
  uploadFile,
  adminDeleteProduct,
  generateUUID,
  fulfillDropshippingOrder,
  updateSaleTracking,
  createStore,
  updateUser,
  getGlobalSettings
} from '../services/storageService';
import { sourceDropshippingProducts } from '../services/geminiService';
import { 
  PlusIcon, 
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  CheckBadgeIcon,
  BoltIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  TruckIcon,
  GlobeAmericasIcon,
  CalculatorIcon,
  ArrowPathIcon,
  TagIcon,
  PhotoIcon,
  DocumentArrowUpIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  BanknotesIcon,
  ShareIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  LinkIcon
} from '@heroicons/react/24/solid';
import { useDialog } from '../services/DialogContext';
import ConfirmationModal from './ConfirmationModal';

interface StoreManagerPageProps {
  currentUser: User;
  refreshUser: () => void;
  onNavigate: (page: any, params?: any) => void;
  params?: any;
}

type ManagerTab = 'inventory' | 'orders' | 'sourcing' | 'branding';

const BRAND_COLORS = [
  { name: 'Azul CyBer', hex: '#2563eb' },
  { name: 'Roxo Royal', hex: '#7c3aed' },
  { name: 'Verde Mint', hex: '#10b981' },
  { name: 'Preto Carbono', hex: '#0f172a' },
  { name: 'Laranja Solar', hex: '#f59e0b' },
  { name: 'Rosa Shock', hex: '#db2777' }
];

const CATEGORIES_SOURCING = [
    'Tech & Gadgets', 'Moda Masculina', 'Moda Feminina', 'Casa Inteligente', 'Fitness', 'Beleza'
];

const StoreManagerPage: React.FC<StoreManagerPageProps> = ({ currentUser, refreshUser, onNavigate, params }) => {
  const { showAlert, showConfirm } = useDialog();
  const [userStore, setUserStore] = useState<Store | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeSales, setStoreSales] = useState<AffiliateSale[]>([]);
  const [activeTab, setActiveTab] = useState<ManagerTab>(params?.tab || 'inventory');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [brandColor, setBrandColor] = useState(BRAND_COLORS[0].hex);

  // Product Form
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pType, setPType] = useState<ProductType>(ProductType.DIGITAL_COURSE);
  const [pImageUrls, setPImageUrls] = useState<string[]>([]);
  const [pOriginalPrice, setPOriginalPrice] = useState('');
  const [pDiscount, setPDiscount] = useState('');
  const [pHasFreeShipping, setPHasFreeShipping] = useState(true);
  const [pShippingFee, setPShippingFee] = useState('');
  
  // Bidding & Positioning
  const [pPositioning, setPPositioning] = useState<'STANDARD' | 'TOP_SEARCH' | 'MAIN_BANNER'>('STANDARD');
  const [pBidAmount, setPBidAmount] = useState('');
  
  // Details
  const [pStock, setPStock] = useState('100');
  const [pWeight, setPWeight] = useState('');
  const [pDimensions, setPDimensions] = useState('');
  
  const [pLessonsCount, setPLessonsCount] = useState('');
  const [pTotalHours, setPTotalHours] = useState('');
  const [pHasCertificate, setPHasCertificate] = useState(true);
  const [pModules, setPModules] = useState('');

  const [pDigitalUrl, setPDigitalUrl] = useState('');
  const [pIsAvailableForDropshipping, setPIsAvailableForDropshipping] = useState(false);
  const [pDropshippingPrice, setPDropshippingPrice] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sourcing & Import Logic
  const [searchQuery, setSearchQuery] = useState(params?.search || '');
  const [sourcingResults, setSourcingResults] = useState<any[]>([]);
  const [isSourcing, setIsSourcing] = useState(false);
  const [importModal, setImportModal] = useState<any | null>(null); // Produto sendo importado
  const [importPrice, setImportPrice] = useState<string>(''); // Preço final definido pelo usuário

  const [trackingModal, setTrackingModal] = useState<{saleId: string} | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [supplierOrderId, setSupplierOrderId] = useState('');

  // Confirmation Modal
  const [deleteProductTarget, setDeleteProductTarget] = useState<string | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [stores, currentSettings] = await Promise.all([
        getStores(),
        getGlobalSettings()
    ]);
    setSettings(currentSettings);
    const myStore = stores.find(s => s.professorId === currentUser.id);
    if (myStore) {
      setUserStore(myStore);
      setBrandName(myStore.name);
      setBrandDesc(myStore.description);
      setBrandColor(myStore.brandColor || BRAND_COLORS[0].hex);
      const allProds = await getProducts();
      setStoreProducts(allProds.filter(p => p.storeId === myStore.id));
      const allSales = await getAffiliateSales({ sellerId: currentUser.id });
      setStoreSales(allSales.sort((a, b) => b.timestamp - a.timestamp));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    if (params?.tab === 'sourcing' && params?.search) {
      handleSource(params.search);
    }
  }, [currentUser.id, params]);

  // Trigger sourcing on mount for generic categories
  useEffect(() => {
      if (activeTab === 'sourcing' && sourcingResults.length === 0) {
          handleSource("Tendências de Tecnologia");
      }
  }, [activeTab]);

  const handleSaveBranding = async () => {
    if (!userStore) return;
    const updated = { ...userStore, name: brandName, description: brandDesc, brandColor };
    await updateStore(updated);
    setUserStore(updated);
    showAlert('Identidade visual da loja atualizada!', { type: 'success' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
        const newUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const url = await uploadFile(files[i], 'products');
            newUrls.push(url);
        }
        setPImageUrls(prev => [...prev, ...newUrls]);
    } catch (err) {
        showAlert('Erro ao enviar imagens do produto.', { type: 'error' });
    } finally {
        setUploading(false);
    }
  };

  const removeProductImage = (index: number) => {
    setPImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userStore || uploading) return;

    // Positioning Bid Validation
    if (pPositioning !== 'STANDARD' && settings?.positioningMinBid) {
        const bid = pBidAmount ? parseFloat(pBidAmount) : 0;
        if (bid < settings.positioningMinBid) {
            showAlert(`O lance mínimo para posicionamento especial é de $${settings.positioningMinBid.toFixed(2)}.`, { type: 'error' });
            return;
        }
    }

    const productData: Product = {
      id: editingProduct ? editingProduct.id : generateUUID(),
      storeId: userStore.id,
      name: pName,
      description: pDesc,
      price: parseFloat(pPrice),
      originalPrice: pOriginalPrice ? parseFloat(pOriginalPrice) : undefined,
      discountPercentage: pDiscount ? parseFloat(pDiscount) : undefined,
      imageUrls: pImageUrls.length > 0 ? pImageUrls : ['https://picsum.photos/400/400?random=prod'],
      affiliateCommissionRate: 0.15,
      type: pType,
      ratings: editingProduct ? editingProduct.ratings : [],
      averageRating: editingProduct ? editingProduct.averageRating : 0,
      ratingCount: editingProduct ? editingProduct.ratingCount : 0,
      soldCount: editingProduct ? editingProduct.soldCount : 0,
      digitalContentUrl: pType !== ProductType.PHYSICAL ? pDigitalUrl : undefined,
      isAvailableForDropshipping: pIsAvailableForDropshipping,
      dropshippingPrice: pIsAvailableForDropshipping ? parseFloat(pDropshippingPrice) : undefined,
      isDropshipping: editingProduct ? editingProduct.isDropshipping : false,
      originalProductId: editingProduct ? editingProduct.originalProductId : undefined,

      // Novos campos
      hasFreeShipping: pHasFreeShipping,
      shippingFee: pHasFreeShipping ? 0 : parseFloat(pShippingFee || '0'),
      positioning: pPositioning,
      bidAmount: pBidAmount ? parseFloat(pBidAmount) : 0,

      physicalDetails: pType === ProductType.PHYSICAL ? {
        stock: parseInt(pStock),
        weight: pWeight ? parseFloat(pWeight) : undefined,
        dimensions: pDimensions || undefined
      } : undefined,

      courseDetails: pType === ProductType.DIGITAL_COURSE ? {
        lessonsCount: parseInt(pLessonsCount || '0'),
        totalHours: parseFloat(pTotalHours || '0'),
        hasCertificate: pHasCertificate,
        modules: pModules.split('\n').filter(m => m.trim())
      } : undefined
    };

    try {
      if (editingProduct) {
          // We need an updateProduct function in storageService, but createProduct uses setDoc which overwrites
          await createProduct(productData); 
      } else {
          await createProduct(productData);
      }
      
      setIsAddingProduct(false);
      setEditingProduct(null);
      setPImageUrls([]); setPName(''); setPDesc(''); setPPrice(''); setPDigitalUrl('');
      setPOriginalPrice(''); setPDiscount(''); setPHasFreeShipping(true); setPShippingFee('');
      setPPositioning('STANDARD'); setPBidAmount('');
      setPStock('100'); setPWeight(''); setPDimensions('');
      setPLessonsCount(''); setPTotalHours(''); setPHasCertificate(true); setPModules('');
      setPIsAvailableForDropshipping(false); setPDropshippingPrice('');
      loadData();
      showAlert(editingProduct ? 'Produto atualizado!' : 'Produto criado com sucesso!', { type: 'success' });
    } catch (err: any) {
      if (err.message?.includes('SENTINEL_BLOCK')) {
        showAlert(err.message.replace('SENTINEL_BLOCK: ', ''), { type: 'error', title: 'Sentinela de Segurança' });
      } else {
        showAlert("Erro ao salvar produto.", { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (p: Product) => {
      setEditingProduct(p);
      setPName(p.name);
      setPDesc(p.description);
      setPPrice(p.price.toString());
      setPType(p.type);
      setPImageUrls(p.imageUrls || []);
      setPDigitalUrl(p.digitalContentUrl || '');
      setPIsAvailableForDropshipping(p.isAvailableForDropshipping || false);
      setPDropshippingPrice(p.dropshippingPrice?.toString() || '');
      
      setPOriginalPrice(p.originalPrice?.toString() || '');
      setPDiscount(p.discountPercentage?.toString() || '');
      setPHasFreeShipping(p.hasFreeShipping ?? true);
      setPShippingFee(p.shippingFee?.toString() || '');
      setPPositioning(p.positioning || 'STANDARD');
      setPBidAmount(p.bidAmount?.toString() || '');

      if (p.physicalDetails) {
        setPStock(p.physicalDetails.stock.toString());
        setPWeight(p.physicalDetails.weight?.toString() || '');
        setPDimensions(p.physicalDetails.dimensions || '');
      }

      if (p.courseDetails) {
        setPLessonsCount(p.courseDetails.lessonsCount.toString());
        setPTotalHours(p.courseDetails.totalHours.toString());
        setPHasCertificate(p.courseDetails.hasCertificate);
        setPModules(p.courseDetails.modules.join('\n'));
      }

      setIsAddingProduct(true);
  };

  const confirmDeleteProduct = async () => {
    if (deleteProductTarget) {
      await adminDeleteProduct(deleteProductTarget);
      loadData();
      setDeleteProductTarget(null);
    }
  };

  const handleFulfillOrder = async (sale: AffiliateSale) => {
    if (!sale.supplierCost) {
      showAlert("Custo do fornecedor não definido.", { type: 'error' });
      return;
    }
    
    if ((currentUser.balance || 0) < sale.supplierCost) {
      showAlert(`Saldo insuficiente para pagar o fornecedor ($${sale.supplierCost}). Recarregue sua carteira.`, { type: 'error' });
      return;
    }

    if (await showConfirm(`Confirmar pagamento de $${sale.supplierCost} ao fornecedor para iniciar o despacho?`)) {
       const success = await fulfillDropshippingOrder(sale.id, currentUser.id, sale.supplierCost);
       if (success) {
         refreshUser(); 
         loadData();
         showAlert("Pedido enviado para processamento no fornecedor!", { type: 'success' });
       } else {
         showAlert("Erro ao processar pagamento.", { type: 'error' });
       }
    }
  };

  const handleAddTracking = async () => {
    if (!trackingModal || !trackingCode) return;
    await updateSaleStatus(trackingModal.saleId, OrderStatus.SHIPPING);
    await updateSaleTracking(trackingModal.saleId, trackingCode, supplierOrderId);
    setTrackingModal(null);
    setTrackingCode('');
    setSupplierOrderId('');
    loadData();
    showAlert("Código de rastreio atualizado!", { type: 'success' });
  }

  const handleSource = async (queryOverride?: string) => {
    const q = (queryOverride || searchQuery).toLowerCase();
    setIsSourcing(true);
    try {
        const allProducts = await getProducts();
        // Filtra produtos de OUTRAS lojas que estão disponíveis para dropshipping
        const results = allProducts.filter(p => 
            p.storeId !== userStore?.id && 
            p.isAvailableForDropshipping && 
            (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
        );
        setSourcingResults(results);
    } catch (err) {
        console.error("Erro ao buscar catálogo de dropshipping:", err);
    } finally {
        setIsSourcing(false);
    }
  };

  const openImportModal = (product: Product) => {
      setImportModal(product);
      // Sugestão: Preço de dropshipping + 30% de margem
      const basePrice = product.dropshippingPrice || product.price;
      setImportPrice((basePrice * 1.3).toFixed(2));
  };

  const confirmImport = async () => {
    if (!userStore || !importModal) return;
    
    const finalPrice = parseFloat(importPrice);
    const supplierCost = importModal.dropshippingPrice || importModal.price;

    if (isNaN(finalPrice) || finalPrice <= supplierCost) {
        showAlert("O preço de venda deve ser maior que o custo do fornecedor.", { type: 'error' });
        return;
    }

    const newProduct: Product = {
      id: generateUUID(),
      storeId: userStore.id,
      name: importModal.name,
      description: importModal.description,
      price: finalPrice,
      imageUrls: importModal.imageUrls,
      affiliateCommissionRate: 0.1,
      type: importModal.type,
      ratings: [],
      averageRating: 0,
      ratingCount: 0,
      soldCount: 0,
      isDropshipping: true,
      originalProductId: importModal.id,
      originalPrice: supplierCost
    };
    
    await createProduct(newProduct);
    setImportModal(null);
    loadData();
    showAlert('Item importado para sua vitrine com sucesso!', { type: 'success' });
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0a0c10]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div></div>;
  }

  if (!userStore) {
    return (
      <div className="container mx-auto px-4 pt-24 pb-32 max-w-4xl animate-fade-in">
         <div className="bg-white dark:bg-darkcard rounded-[3rem] p-10 md:p-16 shadow-2xl border dark:border-white/5 relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <div className="bg-blue-50 dark:bg-blue-900/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl">
                <PaintBrushIcon className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter dark:text-white uppercase">Crie sua Loja</h2>
            <p className="text-gray-500 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed mb-10">
                {settings?.storeCreationFee && settings.storeCreationFee > 0 
                  ? `Comece a vender seus produtos físicos ou digitais agora mesmo. Taxa única de ativação: $${settings.storeCreationFee.toFixed(2)}.`
                  : 'Comece a vender seus produtos físicos ou digitais agora mesmo. É gratuito para todos os membros da CyBerPhone.'
                }
            </p>
            <button 
                onClick={async () => {
                    const fee = settings?.storeCreationFee || 0;
                    if (fee > (currentUser.balance || 0)) {
                        showAlert(`Saldo insuficiente para ativar a loja ($${fee.toFixed(2)}). Recarregue sua carteira.`, { type: 'error' });
                        return;
                    }

                    const newStore: Store = {
                        id: generateUUID(),
                        professorId: currentUser.id,
                        name: `${currentUser.firstName}'s Store`,
                        description: 'Bem-vindo à minha loja oficial!',
                        brandColor: BRAND_COLORS[0].hex,
                        productIds: []
                    };
                    const success = await createStore(newStore);
                    if (success) {
                        loadData();
                        showAlert('Loja ativada com sucesso!', { type: 'success' });
                    } else {
                        showAlert('Erro ao ativar loja. Verifique seu saldo.', { type: 'error' });
                    }
                }}
                className="px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
            >
                Ativar Minha Loja
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-32 max-6xl animate-fade-in">
       
       <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] shadow-xl flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
              <CheckBadgeIcon className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black dark:text-white tracking-tighter uppercase">{brandName || 'Minha Vitrine'}</h2>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Painel Profissional <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span></p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-[1.8rem] shadow-inner overflow-x-auto no-scrollbar max-w-full">
             {[
               { id: 'inventory', label: 'Meus Produtos', icon: ArchiveBoxIcon },
               { id: 'orders', label: 'Pedidos', icon: ClipboardDocumentListIcon },
               { id: 'sourcing', label: 'Importar (Dropshipping)', icon: BoltIcon },
               { id: 'branding', label: 'Marca', icon: PaintBrushIcon }
             ].map(t => (
               <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id as any)} 
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'bg-white dark:bg-darkcard text-blue-600 shadow-lg' : 'text-gray-500'}`}
               >
                 <t.icon className="h-4 w-4" /> {t.label}
               </button>
             ))}
          </div>
       </div>

       {activeTab === 'inventory' && (
         <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center px-4">
               <h3 className="font-black text-xl dark:text-white uppercase tracking-tighter">Estoque Ativo</h3>
               <button onClick={() => setIsAddingProduct(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-2 active:scale-95 transition-all"><PlusIcon className="h-4 w-4 stroke-[4]" /> Adicionar Item</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {storeProducts.map(p => (
                 <div key={p.id} className="bg-white dark:bg-darkcard rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm group hover:shadow-2xl transition-all relative">
                    <img src={p.imageUrls[0]} className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    {p.isDropshipping && (
                        <div className="absolute top-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-lg border border-white/20">
                            Dropshipping
                        </div>
                    )}
                    <div className="p-6">
                       <div className="flex items-center gap-2 mb-2">
                          {p.ratingCount && p.ratingCount > 0 ? (
                             <div className="flex items-center gap-1">
                                <StarIcon className="h-3 w-3 text-yellow-400" />
                                <span className="text-[10px] font-black text-gray-400">{p.averageRating?.toFixed(1) || '0.0'}</span>
                             </div>
                          ) : (
                             <span className="text-[10px] font-black text-blue-500 uppercase">Sem Avaliações</span>
                          )}
                          <span className="text-[10px] text-gray-300">|</span>
                          <span className="text-[10px] font-black text-gray-400">{p.soldCount || 0} vendidos</span>
                       </div>
                       <h4 className="font-black text-sm dark:text-white uppercase truncate mb-1">{p.name}</h4>
                       <div className="mb-6 flex justify-between items-end">
                          <p className="text-2xl font-black text-blue-600">${p.price.toFixed(2)}</p>
                          {p.isDropshipping && <p className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">Custo: ${p.originalPrice?.toFixed(2)}</p>}
                       </div>
                       <div className="flex gap-2">
                           <button onClick={() => openEditModal(p)} className="flex-1 p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/10 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                               <PaintBrushIcon className="h-4 w-4"/> Editar
                           </button>
                           <button 
                             onClick={() => {
                               const url = `${window.location.origin}?page=store&productId=${p.id}`;
                               navigator.clipboard.writeText(url);
                               showAlert("Link do produto copiado para a área de transferência!", { type: 'success' });
                             }} 
                             className="p-3 bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center justify-center"
                             title="Copiar Link de Divulgação"
                           >
                               <ShareIcon className="h-4 w-4"/>
                           </button>
                           <button onClick={() => setDeleteProductTarget(p.id)} className="p-3 bg-red-50 text-red-500 dark:bg-red-900/10 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center">
                               <TrashIcon className="h-4 w-4"/>
                           </button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
       )}

       {/* Confirmation Modal for Delete Product */}
       <ConfirmationModal
         isOpen={!!deleteProductTarget}
         onClose={() => setDeleteProductTarget(null)}
         onConfirm={confirmDeleteProduct}
         title="Excluir Produto"
         message="Tem certeza que deseja remover este item da sua loja? Esta ação não pode ser desfeita."
         confirmText="Sim, Excluir"
         type="danger"
       />

       {/* ... (Restante do código igual para orders, sourcing, branding e modals de criação) ... */}
       {activeTab === 'orders' && (
         <div className="space-y-6 animate-fade-in">
            <div className="bg-white dark:bg-darkcard rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-xl">
               <div className="p-6 border-b dark:border-white/5 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                  <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 dark:text-white">Fulfillment & Rastreio</h3>
                  <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">{storeSales.length} Pedidos</span>
               </div>
               <div className="divide-y divide-gray-50 dark:divide-white/5">
                  {storeSales.length === 0 ? (
                    <div className="p-24 text-center text-gray-400 font-black uppercase text-xs tracking-widest">Aguardando sua primeira venda...</div>
                  ) : (
                    storeSales.map(sale => (
                         <div key={sale.id} className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                            <div className="flex-1 space-y-3 w-full">
                               <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-black text-xl text-gray-900 dark:text-white leading-tight">Venda #{sale.id.slice(-6)}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{new Date(sale.timestamp).toLocaleString()}</p>
                                  </div>
                                  <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                                      sale.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-700 border-green-200' : 
                                      sale.status === OrderStatus.PROCESSING_SUPPLIER ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                      sale.status === OrderStatus.SHIPPING ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                                      'bg-orange-100 text-orange-700 border-orange-200'
                                  }`}>
                                        {sale.status === OrderStatus.WAITLIST ? 'Pendente de Envio' : 
                                         sale.status === OrderStatus.PROCESSING_SUPPLIER ? 'Em Processamento (Fornecedor)' :
                                         sale.status === OrderStatus.SHIPPING ? 'Enviado' : 'Entregue'}
                                  </span>
                               </div>
                               
                               <div className="flex items-center gap-6 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                                  <div>
                                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recebido</p>
                                      <p className="text-xl font-black text-green-600">+${sale.saleAmount.toFixed(2)}</p>
                                  </div>
                                  {sale.isDropshipping && sale.supplierCost && (
                                     <>
                                        <div className="w-px h-8 bg-gray-300 dark:bg-white/10"></div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Custo Fornecedor</p>
                                            <p className="text-xl font-black text-red-400">-${sale.supplierCost.toFixed(2)}</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-300 dark:bg-white/10"></div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Lucro Líquido</p>
                                            <p className="text-xl font-black text-blue-600">${(sale.saleAmount - sale.supplierCost).toFixed(2)}</p>
                                        </div>
                                     </>
                                  )}
                               </div>

                               {sale.trackingCode && (
                                   <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 px-4 py-2 rounded-xl w-fit">
                                       <TruckIcon className="h-4 w-4 text-blue-600" />
                                       <p className="text-[10px] text-blue-700 dark:text-blue-300 font-mono font-bold tracking-widest">{sale.trackingCode}</p>
                                   </div>
                               )}
                            </div>
                            
                            <div className="flex flex-col gap-2 shrink-0 min-w-[200px]">
                                  {sale.isDropshipping && sale.status === OrderStatus.WAITLIST && (
                                     <button 
                                      onClick={() => handleFulfillOrder(sale)}
                                      className="bg-purple-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-95 transition-all w-full"
                                     >
                                        <CurrencyDollarIcon className="h-5 w-5" /> Pagar Fornecedor
                                     </button>
                                  )}

                                  {((sale.isDropshipping && sale.status === OrderStatus.PROCESSING_SUPPLIER) || (!sale.isDropshipping && sale.status === OrderStatus.WAITLIST)) && (
                                     <button 
                                      onClick={() => setTrackingModal({saleId: sale.id})}
                                      className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all w-full"
                                     >
                                        <TruckIcon className="h-5 w-5" /> {sale.trackingCode ? 'Atualizar Rastreio' : 'Inserir Rastreio'}
                                     </button>
                                  )}
                            </div>
                         </div>
                    ))
                  )}
               </div>
            </div>
         </div>
       )}

       {activeTab === 'sourcing' && (
         <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden text-white">
               <GlobeAmericasIcon className="absolute -right-6 -bottom-6 h-64 w-64 text-white opacity-5" />
               <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Fornecedores Internos</h3>
               <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-8">Importe produtos de outros criadores da CyBerPhone para sua loja</p>
               
               <div className="flex flex-col sm:flex-row gap-4 mb-6 relative z-10">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Buscar produtos disponíveis para dropshipping..." 
                        className="w-full pl-12 pr-6 py-5 bg-white text-gray-900 rounded-2xl outline-none font-black border-4 border-transparent focus:border-blue-500 transition-all text-sm shadow-xl" 
                    />
                  </div>
                  <button 
                    onClick={() => handleSource()} 
                    disabled={isSourcing} 
                    className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-xl disabled:opacity-50 transition-all active:scale-95 hover:bg-blue-500"
                  >
                    {isSourcing ? 'Buscando...' : 'Pesquisar Catálogo'}
                  </button>
               </div>
            </div>

            {sourcingResults.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {sourcingResults.map((res: Product, i) => (
                  <div key={i} className="bg-white dark:bg-darkcard rounded-[2.5rem] p-6 flex flex-col sm:flex-row gap-6 border border-gray-100 dark:border-white/5 shadow-lg group transition-all hover:shadow-2xl hover:-translate-y-1">
                     <div className="w-full sm:w-40 h-48 shrink-0 rounded-[2rem] overflow-hidden shadow-md relative">
                        <img src={res.imageUrls[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute bottom-0 left-0 w-full bg-black/60 backdrop-blur-sm p-2 text-center">
                            <p className="text-[9px] font-black text-white uppercase tracking-widest">Custo Dropshipping: ${(res.dropshippingPrice || res.price).toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="flex-1 flex flex-col">
                        <h4 className="font-black text-base dark:text-white mb-2 uppercase leading-tight line-clamp-2">{res.name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-auto leading-relaxed">{res.description}</p>
                        
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 flex gap-3">
                           <button onClick={() => openImportModal(res)} className="flex-1 bg-black dark:bg-white dark:text-black text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                               <BoltIcon className="h-4 w-4 text-yellow-400" /> Importar e Editar
                           </button>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            ) : searchQuery && !isSourcing && (
                <div className="text-center py-20">
                    <ArchiveBoxIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-black uppercase text-xs tracking-widest">Nenhum produto encontrado para dropshipping interno.</p>
                </div>
            )}
         </div>
       )}

       {/* MODAL DE IMPORTAÇÃO (CALCULADORA DE LUCRO) */}
       {importModal && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in" onClick={() => setImportModal(null)}>
               <div className="bg-white dark:bg-darkcard w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
                   <button onClick={() => setImportModal(null)} className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-white/5 rounded-full text-gray-400 hover:text-red-500 transition-all"><XMarkIcon className="h-6 w-6" /></button>
                   
                   <div className="flex items-center gap-4 mb-8">
                       <img src={importModal.imageUrl} className="w-16 h-16 rounded-xl object-cover shadow-md border-2 border-white dark:border-white/10" />
                       <div>
                           <h3 className="text-lg font-black dark:text-white uppercase tracking-tight line-clamp-1">{importModal.name}</h3>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Defina sua margem de lucro</p>
                       </div>
                   </div>

                   <div className="space-y-6 bg-gray-50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100 dark:border-white/5">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Custo do Fornecedor</span>
                            <span className="text-lg font-black text-red-400">-${importModal.originalPrice.toFixed(2)}</span>
                        </div>
                        
                        <div className="relative">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest absolute -top-2.5 left-4 bg-white dark:bg-[#1a1c23] px-2">Seu Preço de Venda</label>
                            <input 
                                type="number" 
                                value={importPrice} 
                                onChange={e => setImportPrice(e.target.value)} 
                                className="w-full p-4 bg-white dark:bg-black/20 border-2 border-blue-500 rounded-2xl text-2xl font-black text-center dark:text-white outline-none focus:shadow-lg transition-all" 
                            />
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-white/10">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Lucro Estimado / Venda</span>
                            <span className={`text-2xl font-black ${parseFloat(importPrice) - importModal.originalPrice > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                +${(parseFloat(importPrice || '0') - importModal.originalPrice).toFixed(2)}
                            </span>
                        </div>
                   </div>

                   <button 
                    onClick={confirmImport} 
                    className="w-full mt-8 py-5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                       <CheckBadgeIcon className="h-5 w-5" /> Confirmar Importação
                   </button>
               </div>
           </div>
       )}

       {activeTab === 'branding' && (
         <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
            <div className="bg-white dark:bg-darkcard p-10 rounded-[3.5rem] shadow-2xl border border-gray-100 dark:border-white/5">
               <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight mb-10">Personalização de Marca</h3>
               <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Comercial</label>
                        <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white font-black outline-none border-2 border-transparent focus:border-blue-600" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cor da Identidade</label>
                        <div className="flex gap-2">
                           {BRAND_COLORS.map(c => (
                             <button key={c.hex} onClick={() => setBrandColor(c.hex)} className={`w-11 h-11 rounded-full border-4 transition-all ${brandColor === c.hex ? 'border-white shadow-xl scale-110' : 'opacity-40 border-transparent'}`} style={{ backgroundColor: c.hex }}></button>
                           ))}
                        </div>
                     </div>
                  </div>
                  <textarea value={brandDesc} onChange={e => setBrandDesc(e.target.value)} className="w-full p-5 bg-gray-50 dark:bg-white/5 rounded-2xl dark:text-white h-32 resize-none outline-none border-2 border-transparent focus:border-blue-600 font-medium" placeholder="Descreva o propósito da sua vitrine profissional..." />
                  <button onClick={handleSaveBranding} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-700 transition-all tracking-[0.2em]">Salvar Identidade</button>
               </div>
            </div>
         </div>
       )}

       {/* Modal de Novo Produto Próprio (AliExpress Style) */}
       {isAddingProduct && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsAddingProduct(false)}>
            <div 
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-3xl rounded-[2rem] shadow-2xl relative border border-white/10 max-h-[90vh] overflow-hidden flex flex-col" 
              onClick={e => e.stopPropagation()}
            >
               {/* Header */}
               <div className="p-6 border-b dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                  <div>
                    <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">{editingProduct ? 'Editar Produto' : 'Anunciar Novo Produto'}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{editingProduct ? 'Altere os detalhes do seu item' : 'Preencha os detalhes para começar a vender'}</p>
                  </div>
                  <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                       <XMarkIcon className="h-6 w-6" />
                  </button>
               </div>

               {/* Form Content */}
               <form onSubmit={handleCreateProduct} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                  {/* Categoría y Tipo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoria Principal</label>
                       <select 
                        value={pType} 
                        onChange={e => setPType(e.target.value as ProductType)} 
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-bold text-sm cursor-pointer border-2 border-transparent focus:border-[#ff4747]"
                       >
                          <option value={ProductType.PHYSICAL}>📦 Produto Físico</option>
                          <option value={ProductType.DIGITAL_COURSE}>🎓 Curso Online</option>
                          <option value={ProductType.DIGITAL_EBOOK}>📚 E-book / PDF</option>
                          <option value={ProductType.DIGITAL_OTHER}>⚡ Outros Digitais</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                       <input 
                         type="text" 
                         required 
                         placeholder="Ex: Smartwatch Ultra Series 8"
                         value={pName} 
                         onChange={e => setPName(e.target.value)} 
                         className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-[#ff4747] transition-all" 
                       />
                    </div>
                  </div>

                  {/* Pricing Section - Advanced */}
                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-6">
                    <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-green-500" /> Precificação Profissional
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Atual (R$)</label>
                          <input 
                            type="number" 
                            required 
                            step="0.01"
                            value={pPrice} 
                            onChange={e => setPPrice(e.target.value)} 
                            placeholder="0.00"
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-black text-sm border-2 border-transparent focus:border-green-500" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Preço Original (R$)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={pOriginalPrice} 
                            onChange={e => setPOriginalPrice(e.target.value)} 
                            placeholder="Opcional (Riscado)"
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-gray-400" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Desconto (%)</label>
                          <input 
                            type="number" 
                            value={pDiscount} 
                            onChange={e => setPDiscount(e.target.value)} 
                            placeholder="Automático"
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent" 
                          />
                       </div>
                    </div>
                  </div>

                  {/* Shipping Section - Advanced */}
                  {pType === ProductType.PHYSICAL && (
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl space-y-6">
                      <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <TruckIcon className="h-4 w-4 text-blue-500" /> Configurações de Frete
                      </h4>
                      
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 flex items-center justify-between bg-white dark:bg-black/20 p-4 rounded-xl">
                          <div>
                            <p className="text-xs font-black dark:text-white uppercase">Oferecer Frete Grátis?</p>
                            <p className="text-[9px] text-gray-500 font-bold">Aumenta as conversões em até 40%</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setPHasFreeShipping(!pHasFreeShipping)}
                            className={`w-12 h-6 rounded-full transition-all relative ${pHasFreeShipping ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/10'}`}
                          >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${pHasFreeShipping ? 'right-0.5' : 'left-0.5'}`}></div>
                          </button>
                        </div>
                        
                        {!pHasFreeShipping && (
                          <div className="flex-1 space-y-2 animate-fade-in">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor do Frete (R$)</label>
                            <input 
                              type="number" 
                              value={pShippingFee} 
                              onChange={e => setPShippingFee(e.target.value)} 
                              className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-blue-200" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Promoting Section - Bidding */}
                  <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl space-y-6 border border-orange-100 dark:border-orange-800/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2 text-orange-600">
                        <RocketLaunchIcon className="h-4 w-4" /> Impulsionar Visibilidade
                      </h4>
                      <div className="bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Leilão Ativo</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Posicionamento Desejado</label>
                          <select 
                            value={pPositioning} 
                            onChange={e => setPPositioning(e.target.value as any)} 
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-orange-500"
                          >
                             <option value="STANDARD">Padrão (Busca comum)</option>
                             <option value="TOP_SEARCH">Topo das Buscas (+ Taxa)</option>
                             <option value="MAIN_BANNER">Banner Principal do Topo (+ Taxa Premium)</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seu Lance (Bid) - R$/Dia</label>
                          <div className="relative">
                             <input 
                               type="number" 
                               value={pBidAmount} 
                               onChange={e => setPBidAmount(e.target.value)} 
                               placeholder="Quanto você quer pagar?"
                               className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-black text-sm border-2 border-orange-500" 
                             />
                             <BoltIcon className="h-4 w-4 text-orange-500 absolute right-4 top-1/2 -translate-y-1/2" />
                          </div>
                          {settings?.positioningMinBid && settings.positioningMinBid > 0 && (
                            <p className="text-[8px] text-orange-600 font-black uppercase tracking-tighter">Lance mínimo: ${settings.positioningMinBid.toFixed(2)}</p>
                          )}
                          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter mt-1 italic">O produto com o maior lance aparece primeiro!</p>
                       </div>
                    </div>
                  </div>

                  {/* Course Specific Details */}
                  {pType === ProductType.DIGITAL_COURSE && (
                    <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-3xl space-y-6 border border-purple-100 dark:border-purple-800/30">
                      <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2 text-purple-600">
                        <AcademicCapIcon className="h-4 w-4" /> Detalhes do Curso
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total de Aulas</label>
                            <input type="number" value={pLessonsCount} onChange={e => setPLessonsCount(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Carga Horária</label>
                            <input type="number" value={pTotalHours} onChange={e => setPTotalHours(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" />
                         </div>
                         <div className="flex flex-col justify-end">
                            <button 
                              type="button"
                              onClick={() => setPHasCertificate(!pHasCertificate)}
                              className={`w-full p-4 rounded-xl font-black text-[10px] uppercase transition-all ${pHasCertificate ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'}`}
                            >
                              {pHasCertificate ? '✅ Com Certificado' : '❌ Sem Certificado'}
                            </button>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Conteúdo/Módulos (Um por linha)</label>
                         <textarea 
                            value={pModules} 
                            onChange={e => setPModules(e.target.value)} 
                            placeholder="Módulo 1: Introdução&#10;Módulo 2: Configurações Iniciais"
                            className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-medium text-xs h-24"
                         />
                      </div>
                    </div>
                  )}

                  {/* Physical Specific Details */}
                  {pType === ProductType.PHYSICAL && (
                    <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl space-y-6">
                      <h4 className="text-xs font-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <ArchiveBoxIcon className="h-4 w-4" /> Estoque e Dimensões
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Qtd em Estoque</label>
                            <input type="number" value={pStock} onChange={e => setPStock(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Peso (kg)</label>
                            <input type="number" step="0.01" value={pWeight} onChange={e => setPWeight(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dimensões (CxLxA)</label>
                            <input type="text" value={pDimensions} onChange={e => setPDimensions(e.target.value)} className="w-full p-4 bg-white dark:bg-black/20 dark:text-white rounded-xl font-bold" placeholder="20x15x10" />
                         </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição Comercial</label>
                     <textarea 
                        required
                        value={pDesc}
                        onChange={e => setPDesc(e.target.value)}
                        placeholder="Descreva as principais características, benefícios e especificações do seu produto..."
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-medium text-sm border-2 border-transparent focus:border-[#ff4747] transition-all h-32 resize-none"
                     />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">URL de Conteúdo (Downloads/Acesso)</label>
                       <div className="relative">
                          <LinkIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text" 
                            value={pDigitalUrl} 
                            onChange={e => setPDigitalUrl(e.target.value)} 
                            placeholder="Link do Google Drive / Hotmart / etc"
                            className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl font-bold text-xs" 
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comissão de Afiliados (%)</label>
                       <input 
                        type="number" 
                        placeholder="Ex: 15"
                        className="w-full p-4 bg-gray-50 dark:bg-white/5 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-[#ff4747]" 
                       />
                    </div>
                  </div>

                  {/* Internal Dropshipping Settings */}
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30 space-y-6">
                      <div className="flex items-center justify-between">
                          <div>
                              <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">Permitir Dropshipping Interno</h4>
                              <p className="text-[9px] text-gray-500 font-bold uppercase">Outros usuários poderão vender seu produto em suas próprias lojas</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setPIsAvailableForDropshipping(!pIsAvailableForDropshipping)}
                            className={`w-14 h-8 rounded-full transition-all relative ${pIsAvailableForDropshipping ? 'bg-blue-600' : 'bg-gray-300 dark:bg-white/10'}`}
                          >
                              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${pIsAvailableForDropshipping ? 'left-7' : 'left-1'}`}></div>
                          </button>
                      </div>

                      {pIsAvailableForDropshipping && (
                          <div className="space-y-2 animate-fade-in">
                              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Preço para Dropshippers (Custo)</label>
                              <div className="relative">
                                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm">$</span>
                                  <input 
                                    type="number" 
                                    required={pIsAvailableForDropshipping}
                                    value={pDropshippingPrice} 
                                    onChange={e => setPDropshippingPrice(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-4 bg-white dark:bg-black/20 dark:text-white rounded-xl outline-none font-bold text-sm border-2 border-blue-200 dark:border-blue-800/30 focus:border-blue-500 transition-all" 
                                    placeholder="Quanto você quer receber por venda?"
                                  />
                              </div>
                              <p className="text-[9px] text-blue-500 font-medium ml-1">Este é o valor que você receberá quando um dropshipper vender seu produto.</p>
                          </div>
                      )}
                  </div>

                  {/* Media Upload */}
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Galeria de Imagens (Variedades)</label>
                     
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {pImageUrls.map((url, idx) => (
                           <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border dark:border-white/10">
                              <img src={url} className="w-full h-full object-cover" alt={`Variedade ${idx + 1}`} />
                              <button 
                                type="button"
                                onClick={() => removeProductImage(idx)}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                 <TrashIcon className="h-4 w-4" />
                              </button>
                              {idx === 0 && (
                                <div className="absolute bottom-0 left-0 w-full bg-blue-600/90 text-white text-[8px] font-black uppercase py-1 text-center">
                                   Capa Principal
                                </div>
                              )}
                           </div>
                        ))}
                        
                        {pImageUrls.length < 8 && (
                           <button 
                              type="button"
                              onClick={() => fileInputRef.current?.click()} 
                              disabled={uploading}
                              className={`aspect-square border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-white/5 ${uploading ? 'opacity-50 cursor-not-allowed' : 'border-gray-200 dark:border-white/10 hover:border-blue-500'}`}
                           >
                              {uploading ? (
                                <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />
                              ) : (
                                <>
                                  <PlusIcon className="h-8 w-8 text-gray-300" />
                                  <span className="text-[10px] font-black text-gray-400 uppercase mt-2">Adicionar</span>
                                </>
                              )}
                           </button>
                        )}
                     </div>
                     <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                     <p className="text-[9px] text-gray-400 font-medium italic">A primeira imagem será usada como capa principal nos resultados de busca.</p>
                  </div>

                  {pType !== ProductType.PHYSICAL && (
                    <div className="space-y-2 animate-fade-in">
                       <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Link de Entrega Digital</label>
                       <div className="relative">
                          <LockClosedIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
                          <input 
                            type="url" 
                            required
                            value={pDigitalUrl} 
                            onChange={e => setPDigitalUrl(e.target.value)} 
                            className="w-full pl-12 pr-4 py-4 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 rounded-xl outline-none font-bold text-sm border-2 border-blue-200 dark:border-blue-800/30" 
                            placeholder="https://seu-link-de-entrega.com/download" 
                          />
                       </div>
                       <p className="text-[9px] text-blue-500 font-medium ml-1">Este link será enviado automaticamente ao cliente após a confirmação do pagamento.</p>
                    </div>
                  )}
               </form>

                {/* Footer Actions */}
                <div className="p-6 border-t dark:border-white/5 bg-gray-50 dark:bg-white/5 flex gap-4">
                   <button 
                     type="button"
                     onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                     className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleCreateProduct}
                     disabled={uploading || !pName || !pPrice}
                     className="flex-[2] py-4 bg-[#ff4747] hover:bg-[#e63e3e] disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#ff4747]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     {uploading ? 'Processando...' : <><CheckBadgeIcon className="h-5 w-5" /> {editingProduct ? 'Salvar Alterações' : 'Publicar Produto'}</>}
                   </button>
                </div>
            </div>
         </div>
       )}

       {trackingModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fade-in" onClick={() => setTrackingModal(null)}>
            <div className="bg-white dark:bg-darkcard w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
               <h3 className="text-xl font-black dark:text-white uppercase tracking-tight mb-6">Dados de Envio</h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Código de Rastreio</label>
                     <input type="text" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold dark:text-white outline-none" placeholder="Ex: LB123456789HK" />
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID do Pedido no Fornecedor</label>
                     <input type="text" value={supplierOrderId} onChange={e => setSupplierOrderId(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-bold dark:text-white outline-none" placeholder="Opcional" />
                  </div>
                  <button onClick={handleAddTracking} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Confirmar Envio</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default StoreManagerPage;
