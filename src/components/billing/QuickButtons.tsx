import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import { usePos } from '../../context/PosContext';
import { formatPaise } from '../../utils/formatters';
import { Sparkles } from 'lucide-react';

export function getCategoryTextColor(categoryName: string = '', categoryId: string = '') {
  const lower = (categoryName + ' ' + categoryId).toLowerCase();
  if (lower.includes('snack') || lower.includes('wafer') || lower.includes('chips')) {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      dot: 'bg-amber-500',
    };
  }
  if (lower.includes('pickle') || lower.includes('chutney') || lower.includes('tokku')) {
    return {
      text: 'text-rose-600 dark:text-rose-400',
      dot: 'bg-rose-500',
    };
  }
  if (lower.includes('masala') || lower.includes('spice') || lower.includes('chilli') || lower.includes('powder')) {
    return {
      text: 'text-orange-600 dark:text-orange-400',
      dot: 'bg-orange-500',
    };
  }
  if (lower.includes('oil') || lower.includes('ghee') || lower.includes('butter')) {
    return {
      text: 'text-yellow-600 dark:text-yellow-400',
      dot: 'bg-yellow-500',
    };
  }
  if (lower.includes('ready') || lower.includes('batter') || lower.includes('rotti') || lower.includes('dosa') || lower.includes('mix')) {
    return {
      text: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  }
  if (lower.includes('sweet') || lower.includes('halwa') || lower.includes('holige') || lower.includes('ladoo')) {
    return {
      text: 'text-purple-600 dark:text-purple-400',
      dot: 'bg-purple-500',
    };
  }
  if (lower.includes('beverage') || lower.includes('syrup') || lower.includes('kashaya') || lower.includes('tea') || lower.includes('coffee') || lower.includes('drink')) {
    return {
      text: 'text-cyan-600 dark:text-cyan-400',
      dot: 'bg-cyan-500',
    };
  }
  // Default
  return {
    text: 'text-coastal-600 dark:text-coastal-400',
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
      return p.is_quick_button === 1 || p.quick_sort_order > 0;
    }
    return p.category_id === selectedCatId;
  });

  if (isLoading && allProducts.length === 0) {
    return (
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-[105px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Category Tab Strip */}
      <div className="flex items-center gap-1.5 p-2 overflow-x-auto shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 scrollbar-none">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedCatId === 'all'
              ? 'bg-coastal-800 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-saffron-400" />
          <span>All Top Sellers</span>
        </button>

        {categories.map((cat) => {
          const style = getCategoryTextColor(cat.name, cat.id);
          const isSelected = selectedCatId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                isSelected
                  ? 'bg-coastal-800 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Spacious, Uniform Product Cards (Spacious width, fully readable headings) */}
      <div className="flex-1 p-2.5 sm:p-3 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 overflow-y-auto min-h-0">
        {displayedProducts.map((prod) => {
          const style = getCategoryTextColor(prod.category_name, prod.category_id);
          const isOutOfStock = prod.current_stock <= 0;

          return (
            <button
              key={prod.id}
              onClick={() => addItem(prod)}
              className="group relative flex flex-col justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-coastal-500 dark:hover:border-coastal-500 hover:shadow-md transition-all text-left h-[105px] sm:h-[110px] w-full shrink-0 active:scale-[0.98] select-none"
            >
              {/* Category label with colored indicator */}
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${style.text}`}>
                      {prod.category_name || 'Item'}
                    </span>
                  </div>
                  {isOutOfStock && (
                    <span className="text-[9px] font-bold uppercase text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.2 rounded shrink-0">
                      Out
                    </span>
                  )}
                </div>

                {/* Product Name (Full visibility, crisp 2-line clamp) */}
                <h4 className="font-bold text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug mt-1">
                  {prod.name}
                </h4>
              </div>

              {/* Price & Unit */}
              <div className="flex items-baseline justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
                <span className="font-black text-sm sm:text-base text-coastal-800 dark:text-coastal-300">
                  {formatPaise(prod.selling_price)}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 capitalize">
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
