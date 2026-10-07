import React, { useRef, useEffect } from 'react';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Plus, Minus, Tag, ShoppingBag, AlertCircle } from 'lucide-react';
import { formatPaise } from '../../utils/formatters';

export const CartTable: React.FC = () => {
  const { cart, updateQty, updatePrice, removeItem, lastAddedClientId, setIsCustomItemModalOpen } = usePos();
  const { user, isOwnerAtCounter, requestAdminApproval } = useAuth();
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastAddedClientId) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lastAddedClientId]);

  const handlePriceOverride = async (item: any) => {
    const currentSoldRs = (item.sold_price / 100).toFixed(2);
    const input = prompt(`Enter new unit price for "${item.name}" (Current: ₹${currentSoldRs}):`, currentSoldRs);
    if (!input) return;

    const newPriceRs = parseFloat(input);
    if (isNaN(newPriceRs) || newPriceRs < 0) {
      alert('Invalid price');
      return;
    }

    const newPricePaise = Math.round(newPriceRs * 100);
    const reason = prompt('Reason for price override (e.g. Regular customer, Damaged box):', 'Known customer') || 'Price override';

    if (user?.role !== 'admin' && !isOwnerAtCounter && newPricePaise < item.list_price) {
      const discountPct = ((item.list_price - newPricePaise) / item.list_price) * 100;
      if (discountPct > 5) {
        const approver = await requestAdminApproval(
          `Line price override on "${item.name}" to ₹${newPriceRs} (${discountPct.toFixed(1)}% discount)`
        );
        if (!approver) return;
        updatePrice(item.clientId, newPricePaise, reason, approver);
        return;
      }
    }

    updatePrice(item.clientId, newPricePaise, reason, user?.id);
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 bg-white/40 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 m-2">
        <div className="w-16 h-16 rounded-full bg-coastal-50 dark:bg-coastal-950/40 flex items-center justify-center text-coastal-600 dark:text-coastal-400 mb-3">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-base text-slate-700 dark:text-slate-200">Cart is Empty</h3>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Scan a barcode, search above, or tap any quick product tile to start billing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5">
      {cart.map((item) => {
        const isRecent = item.clientId === lastAddedClientId;
        const hasDiscount = item.line_discount > 0;

        return (
          <div
            key={item.clientId}
            className={`flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
              isRecent
                ? 'border-coastal-500 shadow-md ring-2 ring-coastal-500/10'
                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {/* Left: Product Name, Badges & Unit Price */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                  {item.name}
                </span>
                {item.is_custom && (
                  <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-300">
                    Custom
                  </span>
                )}
                {hasDiscount && (
                  <span className="text-[10px] font-bold uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-200">
                    Disc -{formatPaise(item.line_discount)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatPaise(item.sold_price)} / {item.unit}</span>
                {item.sold_price !== item.list_price && (
                  <span className="line-through text-[11px] text-slate-400">
                    {formatPaise(item.list_price)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handlePriceOverride(item)}
                  className="text-coastal-600 hover:text-coastal-800 dark:text-coastal-400 text-[11px] font-semibold underline"
                  title="Override item price or discount"
                >
                  Edit Rate
                </button>
              </div>
            </div>

            {/* Middle: Quantity Stepper */}
            <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => updateQty(item.clientId, item.allows_decimal_qty ? Number((item.qty - 0.25).toFixed(2)) : item.qty - 1)}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center font-bold text-sm shadow-xs hover:bg-slate-50 active:scale-95 transition-transform"
                title="Decrease Qty"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="number"
                step={item.allows_decimal_qty ? '0.05' : '1'}
                value={item.qty}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0) updateQty(item.clientId, v);
                }}
                className="w-12 text-center bg-transparent font-extrabold text-sm text-slate-900 dark:text-white outline-none"
              />

              <button
                type="button"
                onClick={() => updateQty(item.clientId, item.allows_decimal_qty ? Number((item.qty + 0.25).toFixed(2)) : item.qty + 1)}
                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center font-bold text-sm shadow-xs hover:bg-slate-50 active:scale-95 transition-transform"
                title="Increase Qty"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Line Total & Delete */}
            <div className="flex items-center gap-2 pl-3 text-right shrink-0">
              <div className="flex flex-col items-end min-w-[70px]">
                <span className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                  {formatPaise(item.line_total)}
                </span>
                {item.allows_decimal_qty && (
                  <span className="text-[10px] text-slate-400">
                    {item.qty} {item.unit}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.clientId)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
      <div ref={listEndRef} />
    </div>
  );
};
