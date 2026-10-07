import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import { usePos } from '../../context/PosContext';
import { formatPaise } from '../../utils/formatters';
import { Sparkles } from 'lucide-react';

export function getCategoryTheme(categoryName: string = '', categoryId: string = '') {
  const lower = (categoryName + ' ' + categoryId).toLowerCase();
  if (lower.includes('snack') || lower.includes('wafer') || lower.includes('chips')) {
    return {
      border: 'border-amber-200 dark:border-amber-800/60 hover:border-amber-400',
      bg: 'bg-amber-50/40 hover:bg-amber-100/50 dark:bg-amber-950/20 dark:hover:bg-amber-900/30',
      badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300/60',
      price: 'text-amber-900 dark:text-amber-300',
      dot: 'bg-amber-500',
    };
  }
  if (lower.includes('pickle') || lower.includes('chutney') || lower.includes('tokku')) {
    return {
      border: 'border-rose-200 dark:border-rose-800/60 hover:border-rose-400',
      bg: 'bg-rose-50/40 hover:bg-rose-100/50 dark:bg-rose-950/20 dark:hover:bg-rose-900/30',
      badge: 'bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200 border-rose-300/60',
      price: 'text-rose-900 dark:text-rose-300',
      dot: 'bg-rose-500',
    };
  }
  if (lower.includes('masala') || lower.includes('spice') || lower.includes('chilli') || lower.includes('powder')) {
    return {
      border: 'border-orange-200 dark:border-orange-800/60 hover:border-orange-400',
      bg: 'bg-orange-50/40 hover:bg-orange-100/50 dark:bg-orange-950/20 dark:hover:bg-orange-900/30',
      badge: 'bg-orange-100 text-orange-900 dark:bg-orange-900/60 dark:text-orange-200 border-orange-300/60',
      price: 'text-orange-900 dark:text-orange-300',
      dot: 'bg-orange-500',
    };
  }
  if (lower.includes('oil') || lower.includes('ghee') || lower.includes('butter')) {
    return {
      border: 'border-yellow-300 dark:border-yellow-800/60 hover:border-yellow-400',
      bg: 'bg-yellow-50/40 hover:bg-yellow-100/50 dark:bg-yellow-950/20 dark:hover:bg-yellow-900/30',
      badge: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-200 border-yellow-300/60',
      price: 'text-yellow-900 dark:text-yellow-300',
      dot: 'bg-yellow-500',
    };
  }
  if (lower.includes('ready') || lower.includes('batter') || lower.includes('rotti') || lower.includes('dosa') || lower.includes('mix')) {
    return {
      border: 'border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400',
      bg: 'bg-emerald-50/40 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30',
      badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300/60',
      price: 'text-emerald-900 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    };
  }
  if (lower.includes('sweet') || lower.includes('halwa') || lower.includes('holige') || lower.includes('ladoo')) {
    return {
      border: 'border-purple-200 dark:border-purple-800/60 hover:border-purple-400',
      bg: 'bg-purple-50/40 hover:bg-purple-100/50 dark:bg-purple-950/20 dark:hover:bg-purple-900/30',
      badge: 'bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200 border-purple-300/60',
      price: 'text-purple-900 dark:text-purple-300',
      dot: 'bg-purple-500',
    };
  }
  if (lower.includes('beverage') || lower.includes('syrup') || lower.includes('kashaya') || lower.includes('tea') || lower.includes('coffee') || lower.includes('drink')) {
    return {
      border: 'border-cyan-200 dark:border-cyan-800/60 hover:border-cyan-400',
      bg: 'bg-cyan-50/40 hover:bg-cyan-100/50 dark:bg-cyan-950/20 dark:hover:bg-cyan-900/30',
      badge: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/60 dark:text-cyan-200 border-cyan-300/60',
      price: 'text-cyan-900 dark:text-cyan-300',
      dot: 'bg-cyan-500',
    };
  }
  // Default / Other
  return {
    border: 'border-slate-200 dark:border-slate-800 hover:border-coastal-500',
    bg: 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
    price: 'text-coastal-800 dark:text-coastal-300',
    dot: 'bg-coastal-600',
  };
}

export const QuickButtons: React.FC = () => {
  const { addItem } = usePos();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      apiRequest<{ products: any[] }>('/products?limit=200'),
      apiRequest<{ categories: any[] }>('/products/categories'),
    ])
      .then(([prodData, catData]) => {
        setAllProducts(prodData.products || []);
        setCategories(catData.categories || []);
      })
      .catch((err) => console.error('Failed to load catalog products:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const displayedProducts = allProducts.filter((p) => {
    if (selectedCatId === 'all') {
      // In "All Top Sellers", show quick button items or first 24 items
      return p.is_quick_button === 1 || p.quick_sort_order > 0;
    }
    return p.category_id === selectedCatId;
  });

  if (isLoading && allProducts.length === 0) {
    return (
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-[88px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Category Tab Strip */}
      <div className="flex items-center gap-1.5 p-1.5 sm:p-2 overflow-x-auto shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedCatId === 'all'
              ? 'bg-coastal-800 text-white shadow-sm ring-1 ring-coastal-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-saffron-400" />
          <span>All Top Sellers</span>
        </button>

        {categories.map((cat) => {
          const theme = getCategoryTheme(cat.name, cat.id);
          const isSelected = selectedCatId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                isSelected
                  ? 'bg-coastal-800 text-white border-coastal-800 shadow-sm ring-1 ring-coastal-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Uniform Touch Grid Tiles across all categories */}
      <div className="flex-1 p-2 sm:p-2.5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 overflow-y-auto min-h-0">
        {displayedProducts.map((prod) => {
          const theme = getCategoryTheme(prod.category_name, prod.category_id);
          const isOutOfStock = prod.current_stock <= 0;

          return (
            <button
              key={prod.id}
              onClick={() => addItem(prod)}
              className={`group relative flex flex-col justify-between p-2.5 rounded-xl border ${theme.border} ${theme.bg} hover:shadow-md transition-all text-left h-[88px] sm:h-[92px] w-full shrink-0 active:scale-[0.98] select-none`}
            >
              {/* Category chip & Out of stock indicator */}
              <div className="flex items-center justify-between gap-1 w-full shrink-0">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${theme.badge} truncate max-w-[85%]`}>
                  {prod.category_name || 'Item'}
                </span>
                {isOutOfStock && (
                  <span className="text-[8px] font-bold uppercase text-rose-600 bg-rose-50 px-1 rounded">
                    0 Stock
                  </span>
                )}
              </div>

              {/* Product Name (Strict 2-line clamp for exact height uniformity) */}
              <h4 className="font-bold text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight my-0.5 flex-1 flex items-center">
                {prod.name}
              </h4>

              {/* Price & Unit */}
              <div className="flex items-baseline justify-between w-full pt-1 border-t border-slate-200/50 dark:border-slate-800/60 shrink-0">
                <span className={`font-black text-sm sm:text-base ${theme.price}`}>
                  {formatPaise(prod.selling_price)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 capitalize">
                  {prod.unit}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
