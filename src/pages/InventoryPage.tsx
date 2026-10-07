import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatPaise, formatDateTime } from '../utils/formatters';
import {
  Boxes,
  ShieldCheck,
  AlertTriangle,
  History,
  Sliders,
  CheckCircle,
  X,
  Search,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stock Card Modal state
  const [selectedStockCard, setSelectedStockCard] = useState<any | null>(null);

  // Adjustment Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustType, setAdjustType] = useState('adjustment_damage');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Integrity Check result
  const [integrityStatus, setIntegrityStatus] = useState<any | null>(null);

  const fetchInventory = () => {
    setIsLoading(true);
    let url = '/products?limit=150';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (filterLowStock) url += '&lowStock=true';

    apiRequest<{ products: any[] }>(url)
      .then((data) => setProducts(data.products || []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchInventory();
  }, [filterLowStock]);

  const handleOpenStockCard = async (productId: string) => {
    try {
      const data = await apiRequest<{ product: any; movements: any[] }>(`/stock/card/${productId}`);
      setSelectedStockCard(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId || !adjustQty || !adjustReason) return;

    try {
      await apiRequest('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: adjustProductId,
          adjustmentType: adjustType,
          qtyChange: parseFloat(adjustQty),
          reason: adjustReason,
        }),
      });
      alert('Stock adjustment successfully recorded in ledger.');
      setIsAdjustModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRunIntegrityCheck = async () => {
    try {
      const data = await apiRequest<{ healthy: boolean; mismatches: any[] }>('/stock/integrity');
      setIntegrityStatus(data);
      if (data.healthy) {
        alert('Stock Integrity Verified: products.current_stock matches SUM(stock_movements) exactly across all items.');
      } else {
        alert(`Warning: ${data.mismatches.length} products have ledger mismatches!`);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 space-y-3">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Search product stock..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchInventory()}
              className="w-full h-10 pl-9 pr-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
            />
          </div>

          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              filterLowStock
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Low Stock Only
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRunIntegrityCheck}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verify Integrity</span>
            </button>

            <button
              onClick={() => {
                setAdjustProductId(products[0]?.id || '');
                setAdjustQty('-1');
                setAdjustReason('Damaged package on shelf');
                setIsAdjustModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Sliders className="w-4 h-4 text-saffron-400" />
              <span>Adjust Stock</span>
            </button>
          </div>
        )}
      </div>

      {/* Inventory Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading stock ledgers...</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-center">Min Level</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Cost Price</th>}
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Stock Valuation</th>}
                  <th className="py-3 px-4 text-right">Ledger Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => {
                  const isLow = p.current_stock <= p.min_stock;
                  const isOut = p.current_stock <= 0;
                  const valuation = (p.current_stock || 0) * (p.purchase_price || 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{p.category_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            isOut
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">{p.min_stock}</td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatPaise(p.purchase_price)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatPaise(p.selling_price)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-black text-coastal-800 dark:text-coastal-300">
                          {formatPaise(valuation)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenStockCard(p.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-coastal-800 hover:text-white text-slate-600 dark:text-slate-300 transition-all font-semibold inline-flex items-center gap-1"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>History</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stock Movement Card / Ledger Modal */}
      {selectedStockCard && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{selectedStockCard.product.name}</h3>
                <p className="text-xs text-coastal-300">
                  Current Stock: <strong>{selectedStockCard.product.current_stock} {selectedStockCard.product.unit}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedStockCard(null)}
                className="w-8 h-8 rounded-full bg-coastal-800 flex items-center justify-center text-coastal-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">
                Immutable Stock Movement Ledger
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b text-slate-400 uppercase font-bold">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-center">Change</th>
                    <th className="p-2 text-center">Before → After</th>
                    <th className="p-2">User / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedStockCard.movements.map((m: any) => (
                    <tr key={m.id}>
                      <td className="p-2 text-slate-500">{formatDateTime(m.created_at)}</td>
                      <td className="p-2">
                        <span className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {m.movement_type}
                        </span>
                      </td>
                      <td className={`p-2 text-center font-black ${m.qty_change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.qty_change > 0 ? `+${m.qty_change}` : m.qty_change}
                      </td>
                      <td className="p-2 text-center font-mono text-slate-500">
                        {m.stock_before} → {m.stock_after}
                      </td>
                      <td className="p-2">
                        <div className="font-semibold">{m.user_name}</div>
                        {m.reason && <div className="text-[11px] text-slate-400">{m.reason}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Adjust Stock (Admin Only)</h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="w-8 h-8 rounded-full bg-coastal-800 flex items-center justify-center text-coastal-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product
                </label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.current_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="adjustment_damage">Damaged Pack (Deduct)</option>
                  <option value="adjustment_expired">Expired Stock (Deduct)</option>
                  <option value="adjustment_lost">Lost / Theft Suspected (Deduct)</option>
                  <option value="adjustment_found">Found Inventory (Add)</option>
                  <option value="adjustment_correction">Physical Counting Correction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity Change (+ or -)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. -2 or +5"
                  className="w-full h-10 px-3 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Broken bottle during shelf stocking"
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm shadow-md"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
