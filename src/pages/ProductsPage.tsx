import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatPaise, parsePaise } from '../utils/formatters';
import { Search, Plus, Edit, Trash2, Package, X, Check } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [localName, setLocalName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('piece');
  const [purchasePriceRs, setPurchasePriceRs] = useState('');
  const [sellingPriceRs, setSellingPriceRs] = useState('');
  const [mrpRs, setMrpRs] = useState('');
  const [openingStock, setOpeningStock] = useState('10');
  const [isQuickButton, setIsQuickButton] = useState(false);

  const fetchProducts = () => {
    setIsLoading(true);
    let url = '/products?limit=100';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (selectedCat !== 'all') url += `&categoryId=${encodeURIComponent(selectedCat)}`;

    Promise.all([
      apiRequest<{ products: any[] }>(url),
      apiRequest<{ categories: any[] }>('/products/categories'),
    ])
      .then(([prodData, catData]) => {
        setProducts(prodData.products || []);
        setCategories(catData.categories || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCat]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setLocalName('');
    setSku('');
    setBarcode('');
    setCategoryId(categories[0]?.id || '');
    setUnit('piece');
    setPurchasePriceRs('');
    setSellingPriceRs('');
    setMrpRs('');
    setOpeningStock('20');
    setIsQuickButton(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setName(prod.name);
    setLocalName(prod.local_name || '');
    setSku(prod.sku || '');
    setBarcode(prod.barcode || '');
    setCategoryId(prod.category_id || '');
    setUnit(prod.unit);
    setPurchasePriceRs((prod.purchase_price ? prod.purchase_price / 100 : 0).toString());
    setSellingPriceRs((prod.selling_price / 100).toString());
    setMrpRs(prod.mrp ? (prod.mrp / 100).toString() : '');
    setOpeningStock(prod.current_stock.toString());
    setIsQuickButton(!!prod.is_quick_button);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sellingPriceRs) return;

    const payload = {
      name,
      local_name: localName || null,
      sku: sku || null,
      barcode: barcode || null,
      category_id: categoryId || null,
      unit,
      allows_decimal_qty: unit === 'kg' || unit === 'g' || unit === 'litre' || unit === 'ml' ? 1 : 0,
      purchase_price: parsePaise(purchasePriceRs || '0'),
      selling_price: parsePaise(sellingPriceRs),
      mrp: mrpRs ? parsePaise(mrpRs) : null,
      opening_stock: parseFloat(openingStock) || 0,
      is_quick_button: isQuickButton ? 1 : 0,
    };

    try {
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${prodName}"? Historical sales will remain intact.`)) return;
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 space-y-3">
      {/* Search & Actions Header */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Search product name, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
              className="w-full h-10 pl-9 pr-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-coastal-600"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-coastal-800/20"
          >
            <Plus className="w-4 h-4 text-saffron-400" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading product catalog...</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 font-mono">Barcode / SKU</th>
                  <th className="py-3 px-4 text-center">Unit</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Cost (₹)</th>}
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      {p.local_name && <div className="text-[11px] text-slate-400 italic">{p.local_name}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {p.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {p.barcode || p.sku || '—'}
                    </td>
                    <td className="py-3 px-4 text-center capitalize">{p.unit}</td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-medium text-slate-500">
                        {formatPaise(p.purchase_price)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-black text-sm text-coastal-800 dark:text-coastal-300">
                      {formatPaise(p.selling_price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          p.current_stock <= 0
                            ? 'bg-rose-50 text-rose-600'
                            : p.current_stock <= (p.min_stock || 5)
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {p.current_stock}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-coastal-800 hover:text-white transition-all text-slate-600"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white transition-all text-rose-500"
                            title="Deactivate Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-coastal-800 flex items-center justify-center text-coastal-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Local Name / Aliases (Kannada / Tulunadu keywords for search)
                </label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="e.g. Kori Rotti, Bale Hannina Chips"
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="piece">Piece</option>
                    <option value="packet">Packet</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="bottle">Bottle</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={purchasePriceRs}
                    onChange={(e) => setPurchasePriceRs(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={sellingPriceRs}
                    onChange={(e) => setSellingPriceRs(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-black rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-coastal-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkQuick"
                  checked={isQuickButton}
                  onChange={(e) => setIsQuickButton(e.target.checked)}
                  className="rounded text-coastal-800"
                />
                <label htmlFor="chkQuick" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pin to Quick Touch Catalog (POS Hero Tiles)
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
