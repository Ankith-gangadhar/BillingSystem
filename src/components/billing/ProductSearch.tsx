import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Barcode, AlertCircle, Package } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import { usePos } from '../../context/PosContext';
import { formatPaise } from '../../utils/formatters';

export const ProductSearch: React.FC = () => {
  const { addItem, setIsCustomItemModalOpen } = usePos();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Barcode rapid scanner detection state
  const lastKeyTimeRef = useRef<number>(0);
  const barcodeBufferRef = useRef<string>('');

  // Auto-focus search on load and after actions
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Instant in-memory search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiRequest<{ products: any[] }>(`/products/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
      setResults(data.products || []);
      setSelectedIndex(0);
      setIsOpen(true);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Global Keyboard Shortcuts & Hardware Barcode Scanner Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // F2 or '/' to focus search
      if (e.key === 'F2' || (e.key === '/' && document.activeElement !== inputRef.current)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      // Hardware Barcode Scanner detection: fast keystrokes (< 50ms)
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key.length === 1) {
        if (timeDiff < 50) {
          barcodeBufferRef.current += e.key;
        } else {
          barcodeBufferRef.current = e.key;
        }
      } else if (e.key === 'Enter' && barcodeBufferRef.current.length >= 4 && timeDiff < 60) {
        // Barcode scan completed
        const scannedCode = barcodeBufferRef.current;
        barcodeBufferRef.current = '';
        e.preventDefault();

        // Search and add directly
        apiRequest<{ products: any[] }>(`/products/search?q=${encodeURIComponent(scannedCode)}&limit=1`)
          .then((data) => {
            if (data.products && data.products.length > 0) {
              addItem(data.products[0]);
              setQuery('');
              setIsOpen(false);
            } else {
              setQuery(scannedCode);
              setIsOpen(true);
            }
          });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [addItem]);

  // Input Key Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        addItem(results[selectedIndex]);
        setQuery('');
        setIsOpen(false);
        inputRef.current?.focus();
      } else if (query.trim()) {
        // If not found, open custom item modal pre-filled
        setIsCustomItemModalOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleSelectItem = (prod: any) => {
    addItem(prod);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full z-30">
      <div className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-coastal-700 dark:text-coastal-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          placeholder="Search product name, scan barcode, SKU (Press / or F2)…"
          className="glass-input w-full h-12.5 pl-12 pr-28 rounded-2xl text-slate-900 dark:text-white font-medium placeholder:text-slate-400 text-sm sm:text-base outline-none transition-all shadow-sm"
        />
        <div className="absolute right-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCustomItemModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-btn text-coastal-800 dark:text-coastal-300 border border-coastal-500/30 text-xs font-extrabold transition-all"
            title="Add Custom Unlisted Item (F4)"
          >
            <Plus className="w-3.5 h-3.5 text-saffron-500" />
            <span className="hidden sm:inline">Custom (F4)</span>
          </button>
        </div>
      </div>

      {/* Instant Dropdown Results */}
      {isOpen && query.trim().length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-14.5 glass-modal rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto z-50 animate-in fade-in-50 duration-100"
        >
          {results.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {results.map((prod, index) => {
                const isSelected = index === selectedIndex;
                const isOutOfStock = prod.current_stock <= 0;
                const isLowStock = prod.current_stock > 0 && prod.current_stock <= (prod.min_stock || 5);

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectItem(prod)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-3 sm:px-4 sm:py-3 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-coastal-50 dark:bg-coastal-950/70 text-coastal-950 dark:text-coastal-50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base leading-snug truncate">
                          {prod.name}
                        </span>
                        {prod.category_name && (
                          <span className="text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                            {prod.category_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {prod.local_name && <span className="italic truncate">{prod.local_name}</span>}
                        {prod.sku && <span className="font-mono">SKU: {prod.sku}</span>}
                        {prod.barcode && (
                          <span className="flex items-center gap-0.5 font-mono">
                            <Barcode className="w-3 h-3" /> {prod.barcode}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="font-extrabold text-base sm:text-lg text-coastal-700 dark:text-coastal-400 leading-tight">
                        {formatPaise(prod.selling_price)}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold uppercase text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-900">
                            Low: {prod.current_stock}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                            {prod.current_stock} in stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                No products found for "{query}"
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Not in the database yet? Sell it on the spot as an unlisted custom item.
              </p>
              <button
                type="button"
                onClick={() => setIsCustomItemModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-bold text-xs shadow-md shadow-coastal-800/20 transition-all"
              >
                <Plus className="w-4 h-4 text-saffron-400" />
                <span>Add "{query}" as Custom Item (F4)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
