import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatPaise, parsePaise, formatDateTime } from '../utils/formatters';
import { Truck, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';

export const PurchasesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Receive Stock Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Array<{ productId: string; qty: number; costPriceRs: string }>>([]);

  const fetchPurchases = () => {
    setIsLoading(true);
    Promise.all([
      apiRequest<{ purchases: any[] }>('/purchases'),
      apiRequest<{ suppliers: any[] }>('/products/suppliers'),
      apiRequest<{ products: any[] }>('/products?limit=150'),
    ])
      .then(([purData, supData, prodData]) => {
        setPurchases(purData.purchases || []);
        setSuppliers(supData.suppliers || []);
        setProducts(prodData.products || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        productId: products[0].id,
        qty: 10,
        costPriceRs: (products[0].purchase_price ? products[0].purchase_price / 100 : 50).toString(),
      },
    ]);
  };

  const handleOpenReceive = () => {
    setSupplierId(suppliers[0]?.id || '');
    setInvoiceNumber(`INV-${Date.now().toString().slice(-5)}`);
    setDate(new Date().toISOString().slice(0, 10));
    setItems([
      {
        productId: products[0]?.id || '',
        qty: 25,
        costPriceRs: (products[0]?.purchase_price ? products[0].purchase_price / 100 : 45).toString(),
      },
    ]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || items.length === 0) return;

    try {
      await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: supplierId || null,
          invoiceNumber,
          date,
          items: items.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            costPrice: parsePaise(it.costPriceRs),
            updateProductCost: true,
          })),
        }),
      });

      alert('Stock purchase successfully received and stock movements recorded.');
      setIsModalOpen(false);
      fetchPurchases();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 space-y-3">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Receive Stock & Supplier Invoices</h2>
          <p className="text-xs text-slate-500">Record incoming stock batches and update purchase prices automatically</p>
        </div>

        <button
          onClick={handleOpenReceive}
          className="px-4 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-4 h-4 text-saffron-400" />
          <span>Receive New Stock</span>
        </button>
      </div>

      {/* Purchases List */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading purchase invoices...</div>
          ) : purchases.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No stock purchases recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Received By</th>
                  <th className="py-3 px-4">Items Received</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {p.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{p.date}</td>
                    <td className="py-3 px-4 font-medium">{p.supplier_name || 'Direct Wholesale'}</td>
                    <td className="py-3 px-4 text-slate-500">{p.user_name}</td>
                    <td className="py-3 px-4">{p.items?.length || 0} product lines</td>
                    <td className="py-3 px-4 text-right font-black text-sm text-coastal-800 dark:text-coastal-300">
                      {formatPaise(p.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Receive Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Receive Stock Batch</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-coastal-800 flex items-center justify-center text-coastal-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice / Bill Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase">Received Lines</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-coastal-600 dark:text-coastal-400 hover:underline"
                  >
                    + Add Another Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                      <select
                        value={it.productId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = products.find((p) => p.id === val);
                          setItems((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    productId: val,
                                    costPriceRs: (found?.purchase_price ? found.purchase_price / 100 : 50).toString(),
                                  }
                                : item
                            )
                          );
                        }}
                        className="flex-1 h-9 px-2 text-xs font-bold rounded-lg border bg-white dark:bg-slate-900"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Qty"
                        value={it.qty}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, qty: v } : item)));
                        }}
                        className="w-20 h-9 px-2 text-xs font-bold rounded-lg border text-center"
                      />

                      <input
                        type="number"
                        step="any"
                        placeholder="Cost ₹"
                        value={it.costPriceRs}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, costPriceRs: v } : item)));
                        }}
                        className="w-24 h-9 px-2 text-xs font-bold rounded-lg border text-right"
                      />

                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm shadow-md"
                >
                  Save & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
