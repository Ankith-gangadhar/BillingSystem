import React from 'react';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { Tag, PauseCircle, Trash2, ArrowRight, Sparkles } from 'lucide-react';
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
    setIsDiscountModalOpen,
    setIsPaymentModalOpen,
  } = usePos();

  const { settings } = useAuth();
  const isEmpty = cart.length === 0;

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-3xl shadow-lg shrink-0 select-none">
      {/* Financial Breakdown Rows */}
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-3">
        <div className="flex justify-between items-center font-medium">
          <span>Items / Subtotal ({totalItemsCount} qty):</span>
          <span className="font-semibold text-slate-900 dark:text-slate-200">{formatPaise(subtotal)}</span>
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
          <div className="flex justify-between items-center">
            <span>GST Amount:</span>
            <span>{formatPaise(taxTotal)}</span>
          </div>
        )}

        {settings?.round_off_enabled && roundOff !== 0 && (
          <div className="flex justify-between items-center text-[11px] text-slate-400">
            <span>Round Off:</span>
            <span>{roundOff > 0 ? `+${formatPaise(roundOff)}` : formatPaise(roundOff)}</span>
          </div>
        )}
      </div>

      {/* Hero Grand Total */}
      <div className="flex items-baseline justify-between py-2 border-y border-slate-100 dark:border-slate-800 mb-3">
        <span className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Grand Total
        </span>
        <span className="text-2xl sm:text-3xl font-black text-coastal-800 dark:text-coastal-400 tracking-tight">
          {formatPaise(grandTotal)}
        </span>
      </div>

      {/* Quick Action Helpers & Complete Sale Button */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button
          type="button"
          disabled={isEmpty}
          onClick={() => setIsDiscountModalOpen(true)}
          className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all disabled:opacity-40"
          title="Discount / Set Final Price (F8)"
        >
          <Tag className="w-3.5 h-3.5 text-saffron-500" />
          <span>Discount (F8)</span>
        </button>

        <button
          type="button"
          disabled={isEmpty}
          onClick={holdBill}
          className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all disabled:opacity-40"
          title="Hold current sale (F6)"
        >
          <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Hold (F6)</span>
        </button>

        <button
          type="button"
          disabled={isEmpty}
          onClick={() => {
            if (confirm('Clear current cart?')) clearCart();
          }}
          className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold transition-all disabled:opacity-40"
          title="Clear Cart"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Big Hero Complete Sale / Pay Button */}
      <button
        type="button"
        disabled={isEmpty}
        onClick={() => setIsPaymentModalOpen(true)}
        className="w-full h-14 rounded-2xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-lg shadow-coastal-800/30 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      >
        <span>Complete Sale (F9)</span>
        <ArrowRight className="w-5 h-5 text-saffron-400" />
      </button>
    </div>
  );
};
