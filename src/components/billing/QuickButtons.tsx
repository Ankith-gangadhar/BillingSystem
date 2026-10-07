import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import { usePos } from '../../context/PosContext';
import { formatPaise } from '../../utils/formatters';
import { Sparkles, Layers } from 'lucide-react';

export const QuickButtons: React.FC = () => {
  const { addItem } = usePos();
  const [quickProducts, setQuickProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      apiRequest<{ products: any[] }>('/products/quick-buttons'),
      apiRequest<{ categories: any[] }>('/products/categories'),
    ])
      .then(([prodData, catData]) => {
        setQuickProducts(prodData.products || []);
        setCategories(catData.categories || []);
      })
      .catch((err) => console.error('Failed to load quick buttons:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredProducts = quickProducts.filter((p) => {
    if (selectedCatId === 'all') return true;
    return p.category_id === selectedCatId;
  });

  if (isLoading && quickProducts.length === 0) {
    return (
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Category Tab Strip */}
      <div className="flex items-center gap-1.5 p-2 overflow-x-auto shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedCatId === 'all'
              ? 'bg-coastal-800 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-saffron-400" />
          <span>All Top Sellers</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
              selectedCatId === cat.id
                ? 'bg-coastal-800 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Touch-Friendly Grid Tiles (Min 44px height, high contrast) */}
      <div className="flex-1 p-2 sm:p-2.5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 overflow-y-auto min-h-0">
        {filteredProducts.map((prod) => {
          const isOutOfStock = prod.current_stock <= 0;

          return (
            <button
              key={prod.id}
              onClick={() => addItem(prod)}
              className="group relative flex flex-col justify-between p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-coastal-500 dark:hover:border-coastal-500 hover:shadow-md transition-all text-left min-h-[76px] active:scale-[0.98]"
            >
              <div>
                <span className="text-[9px] font-semibold text-coastal-600 dark:text-coastal-400 uppercase tracking-wider block truncate">
                  {prod.category_name || 'Item'}
                </span>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mt-0.5">
                  {prod.name}
                </h4>
              </div>

              <div className="flex items-baseline justify-between mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span className="font-extrabold text-sm sm:text-base text-coastal-800 dark:text-coastal-300">
                  {formatPaise(prod.selling_price)}
                </span>
                <span className="text-[10px] font-medium text-slate-400 capitalize">
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
