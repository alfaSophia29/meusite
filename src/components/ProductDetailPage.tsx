import React, { useState, useEffect } from 'react';
import { Product, User, Page } from '../types';
import { findProductById } from '../services/storageService';
import { 
  ShoppingBagIcon, 
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import ProductDetailContent from './ProductDetailContent';

interface ProductDetailPageProps {
  currentUser: User;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  productId: string;
  onAddToCart: (productId: string, quantity: number, selectedColor?: string, affiliateId?: string, product?: Product) => void;
  onOpenCart: () => void;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ 
  currentUser, 
  onNavigate, 
  productId, 
  onAddToCart, 
  onOpenCart 
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const p = await findProductById(productId);
        if (p) {
          setProduct(p);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-6 text-center">
        <ShoppingBagIcon className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Produto Não Encontrado</h2>
        <p className="text-gray-500 text-sm mt-2">O produto que você procura não existe ou foi removido.</p>
        <button 
          onClick={() => onNavigate('store')}
          className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
        >
          Voltar para Loja
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 animate-fade-in">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Navigation / Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
          </button>
        </div>

        <ProductDetailContent 
          currentUser={currentUser}
          product={product}
          onNavigate={onNavigate}
          onAddToCart={onAddToCart}
          onOpenCart={onOpenCart}
        />
      </div>
    </div>
  );
};

export default ProductDetailPage;
