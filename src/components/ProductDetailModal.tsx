
import React from 'react';
import { Product, User, Page } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ProductDetailContent from './ProductDetailContent';

interface ProductDetailModalProps {
  product: Product;
  currentUser: User;
  onClose: () => void;
  onAddToCart: (productId: string, quantity: number, selectedColor?: string) => void;
  onNavigate: (page: Page, params?: Record<string, string>) => void;
  onOpenCart: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
  product, 
  currentUser,
  onClose, 
  onAddToCart, 
  onNavigate,
  onOpenCart
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-0 md:p-10 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-darkcard w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] rounded-none md:rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 md:top-8 md:right-8 z-20 p-3 bg-white/90 dark:bg-black/50 backdrop-blur-md rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all text-gray-900 dark:text-white"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
          <ProductDetailContent 
            currentUser={currentUser}
            product={product}
            onNavigate={(page, params) => {
              onClose();
              onNavigate(page, params);
            }}
            onAddToCart={onAddToCart}
            onOpenCart={() => {
              onClose();
              onOpenCart();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
