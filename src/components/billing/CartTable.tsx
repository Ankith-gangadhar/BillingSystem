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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500 glass-inset rounded-3xl m-3 border border-dashed border-white/40 dark:border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-coastal-500/15 flex items-center justify-center text-coastal-700 dark:text-coastal-300 mb-2.5 shadow-inner">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">Cart is Empty</h3>
        <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5">
          Scan a barcode or tap any catalog product to start.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
      {cart.map((item) => {
        const isRecent = item.clientId === lastAddedClientId;
        const hasDiscount = item.line_discount > 0;

        return (
          <div
            key={item.clientId}
            className={`flex items-center justify-between p-3 rounded-2xl glass-card transition-all ${
              isRecent
                ? 'border-coastal-500 shadow-md ring-2 ring-coastal-500/20 bg-white/90 dark:bg-slate-900/80'
                : 'hover:border-white/90 dark:hover:border-white/20'
            }`}
          >
            {/* Left: Product Name, Badges & Unit Price */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-snug">
                  {item.name}
                </span>
                {item.is_custom && (
                  <span className="text-[10px] font-bold uppercase bg-amber-500/15 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded-md border border-amber-400/30">
                    Custom
                  </span>
                )}
                {hasDiscount && (
                  <span className="text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-300 px-1.5 py-0.2 rounded-md border border-rose-400/30">
                    Disc -{formatPaise(item.line_discount)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">{formatPaise(item.sold_price)} / {item.unit}</span>
                {item.sold_price !== item.list_price && (
                  <span className="line-through text-[11px] text-slate-400">
                    {formatPaise(item.list_price)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handlePriceOverride(item)}
                  className="text-coastal-700 hover:text-coastal-900 dark:text-coastal-300 text-[11px] font-bold underline"
                  title="Override item price or discount"
                >
                  Edit Rate
                </button>
              </div>
            </div>

            {/* Middle: Quantity Stepper */}
            <div className="flex items-center gap-1 shrink-0 glass-inset p-1 rounded-xl">
              <button
                type="button"
                onClick={() => updateQty(item.clientId, item.allows_decimal_qty ? Number((item.qty - 0.25).toFixed(2)) : item.qty - 1)}
                className="w-7 h-7 rounded-lg glass-btn text-slate-700 dark:text-white flex items-center justify-center font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
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
                className="w-10 text-center bg-transparent font-black text-sm text-slate-900 dark:text-white outline-none"
              />

              <button
                type="button"
                onClick={() => updateQty(item.clientId, item.allows_decimal_qty ? Number((item.qty + 0.25).toFixed(2)) : item.qty + 1)}
                className="w-7 h-7 rounded-lg glass-btn text-slate-700 dark:text-white flex items-center justify-center font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
                title="Increase Qty"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right: Line Total & Delete */}
            <div className="flex items-center gap-2 pl-3 text-right shrink-0">
              <div className="flex flex-col items-end min-w-[70px]">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
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
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
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
