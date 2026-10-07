import React from 'react';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { Tag, PauseCircle, Trash2, ArrowRight, ShoppingBag, Plus } from 'lucide-react';
import { formatPaise } from '../../utils/formatters';

export const TotalsPanel: React.FC = () => {
  const {
    cart,
    subtotal,
    totalDiscount,
    taxTotal,
    roundOff,
    grandTotal,
    totalItemsCount,
    holdBill,
    clearCart,
    includeCarryBag,
    carryBagChargePaise,
    toggleCarryBag,
    setCarryBagChargePaise,
    setIsDiscountModalOpen,
    setIsPaymentModalOpen,
  } = usePos();

  const { settings } = useAuth();
  const isEmpty = cart.length === 0 && !includeCarryBag;

  const handleEditBagCharge = () => {
    const curRs = (carryBagChargePaise / 100).toString();
    const input = prompt('Enter Carry Bag charge (₹):', curRs);
    if (input !== null) {
      const val = parseFloat(input);
      if (!isNaN(val) && val >= 0) {
        setCarryBagChargePaise(Math.round(val * 100));
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 rounded-2xl shadow-xs shrink-0 select-none">
      {/* Financial Breakdown Rows */}
      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 mb-2">
        <div className="flex justify-between items-center font-medium">
          <span>Subtotal ({totalItemsCount} items):</span>
          <span className="font-semibold text-slate-900 dark:text-slate-200">{formatPaise(subtotal)}</span>
        </div>

        {/* Optional Carry Bag Row (Editable) */}
        <div className="flex items-center justify-between py-1 px-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeCarryBag}
              onChange={(e) => toggleCarryBag(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-coastal-600 focus:ring-coastal-500 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
              <span>Carry Bag (+{formatPaise(carryBagChargePaise)})</span>
            </span>
          </label>
          <button
            type="button"
            onClick={handleEditBagCharge}
            className="text-[10px] text-coastal-600 dark:text-coastal-400 font-bold underline hover:text-coastal-800"
            title="Edit carry bag price"
          >
            Edit (₹{(carryBagChargePaise / 100).toFixed(0)})
          </button>
        </div>

        {totalDiscount > 0 && (
          <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Total Discount:
            </span>
            <span>-{formatPaise(totalDiscount)}</span>
          </div>
        )}

        {settings?.gst_enabled && taxTotal > 0 && (
          <div className="flex justify-between items-center text-[11px]">
            <span>GST Amount:</span>
            <span>{formatPaise(taxTotal)}</span>
          </div>
        )}

        {settings?.round_off_enabled && roundOff !== 0 && (
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>Round Off:</span>
            <span>{roundOff > 0 ? `+${formatPaise(roundOff)}` : formatPaise(roundOff)}</span>
          </div>
        )}
      </div>

      {/* Hero Grand Total */}
      <div className="flex items-baseline justify-between py-1.5 border-y border-slate-100 dark:border-slate-800 mb-2">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Grand Total
        </span>
        <span className="text-xl sm:text-2xl font-black text-coastal-800 dark:text-coastal-400 tracking-tight">
          {formatPaise(grandTotal)}
        </span>
      </div>

      {/* Quick Action Helpers & Complete Sale Button */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <button
          type="button"
          disabled={isEmpty}
          onClick={() => setIsDiscountModalOpen(true)}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all disabled:opacity-40"
          title="Discount / Set Final Price (F8)"
        >
          <Tag className="w-3 h-3 text-saffron-500" />
          <span>Discount (F8)</span>
        </button>

        <button
          type="button"
          disabled={isEmpty}
          onClick={holdBill}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all disabled:opacity-40"
          title="Hold current sale / Open new cart (F6)"
        >
          <PauseCircle className="w-3 h-3 text-amber-500" />
          <span>Hold / New (F6)</span>
        </button>

        <button
          type="button"
          disabled={isEmpty}
          onClick={() => {
            if (confirm('Clear current cart?')) clearCart();
          }}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[11px] font-bold transition-all disabled:opacity-40"
          title="Clear Cart"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Big Hero Complete Sale / Pay Button */}
      <button
        type="button"
        disabled={isEmpty}
        onClick={() => setIsPaymentModalOpen(true)}
        className="w-full h-11 sm:h-12 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-md shadow-coastal-800/25 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      >
        <span>Complete Sale (F9)</span>
        <ArrowRight className="w-4 h-4 text-saffron-400" />
      </button>
    </div>
  );
};
