import React, { useState, useEffect, useRef } from 'react';
import { usePos } from '../../context/PosContext';
import { Plus, X, Tag } from 'lucide-react';
import { parsePaise } from '../../utils/formatters';

export const CustomItemModal: React.FC = () => {
  const { isCustomItemModalOpen, setIsCustomItemModalOpen, addCustomItem } = usePos();
  const [name, setName] = useState('');
  const [priceRs, setPriceRs] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('piece');

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCustomItemModalOpen) {
      setName('');
      setPriceRs('');
      setQty('1');
      setUnit('piece');
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isCustomItemModalOpen]);

  if (!isCustomItemModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !priceRs) return;

    const pricePaise = parsePaise(priceRs);
    const qtyVal = parseFloat(qty) || 1;

    addCustomItem(name, pricePaise, qtyVal, unit);
    setIsCustomItemModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in-50 duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-saffron-400" />
            <h3 className="font-bold text-base">Add Custom / Unlisted Item</h3>
          </div>
          <button
            onClick={() => setIsCustomItemModalOpen(false)}
            className="w-8 h-8 rounded-full bg-coastal-800 hover:bg-coastal-700 flex items-center justify-center text-coastal-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Item Name:
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              placeholder="e.g. Loose Coconut Jaggery Block"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unit Price (₹):
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="₹ 50.00"
                value={priceRs}
                onChange={(e) => setPriceRs(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantity:
              </label>
              <input
                type="number"
                step="any"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Unit:
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white font-medium bg-white dark:bg-slate-900"
            >
              <option value="piece">Piece (pc)</option>
              <option value="packet">Packet (pkt)</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="bottle">Bottle</option>
              <option value="box">Box</option>
            </select>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsCustomItemModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm shadow-md shadow-coastal-800/20"
            >
              Add to Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
