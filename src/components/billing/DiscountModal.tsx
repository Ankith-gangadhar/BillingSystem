import React, { useState, useEffect } from 'react';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { Tag, X, Percent, IndianRupee, Sparkles } from 'lucide-react';
import { formatPaise, parsePaise, playPosSound } from '../../utils/formatters';

export const DiscountModal: React.FC = () => {
  const {
    subtotal,
    billDiscountPaise,
    setBillDiscount,
    setFinalPrice,
    isDiscountModalOpen,
    setIsDiscountModalOpen,
  } = usePos();

  const { settings, user, isOwnerAtCounter, requestAdminApproval } = useAuth();

  const [mode, setMode] = useState<'percent' | 'amount' | 'final_price'>('final_price');
  const [percentVal, setPercentVal] = useState<string>('');
  const [amountValRs, setAmountValRs] = useState<string>('');
  const [finalPriceRs, setFinalPriceRs] = useState<string>('');
  const [reason, setReason] = useState<string>('Known customer');

  const subtotalRs = subtotal / 100;

  useEffect(() => {
    if (isDiscountModalOpen) {
      setMode('final_price');
      setPercentVal('');
      setAmountValRs('');
      setFinalPriceRs(((subtotal - billDiscountPaise) / 100).toFixed(2));
      setReason('Known customer');
    }
  }, [isDiscountModalOpen, subtotal, billDiscountPaise]);

  if (!isDiscountModalOpen) return null;

  const quickReasons = [
    'Known customer',
    'Regular customer',
    'Owner decision',
    'Bulk purchase',
    'Damaged packaging',
    'Round off negotiation',
  ];

  const handleApply = async () => {
    let discountPaiseToApply = 0;

    if (mode === 'percent') {
      const pct = parseFloat(percentVal) || 0;
      discountPaiseToApply = Math.round(subtotal * (pct / 100));
    } else if (mode === 'amount') {
      discountPaiseToApply = parsePaise(amountValRs || '0');
    } else if (mode === 'final_price') {
      const targetPaise = parsePaise(finalPriceRs || '0');
      discountPaiseToApply = Math.max(0, subtotal - targetPaise);
    }

    if (discountPaiseToApply < 0) discountPaiseToApply = 0;
    if (discountPaiseToApply > subtotal) discountPaiseToApply = subtotal;

    const discountPct = subtotal > 0 ? (discountPaiseToApply / subtotal) * 100 : 0;
    const maxLimitPct = settings?.max_cashier_discount_percent || 5;

    // Check cashier permission limit
    if (user?.role !== 'admin' && !isOwnerAtCounter && discountPct > maxLimitPct) {
      const approved = await requestAdminApproval(
        `Discount of ₹${(discountPaiseToApply / 100).toFixed(2)} (${discountPct.toFixed(1)}% on bill total ₹${subtotalRs.toFixed(2)}) - Reason: ${reason}`
      );
      if (!approved) return;
    }

    setBillDiscount(discountPaiseToApply);
    setIsDiscountModalOpen(false);
    playPosSound('click');
  };

  const handleQuickRoundDown = (step: number) => {
    // Round down to nearest ₹5 or ₹10 below
    const currentTotalRs = subtotalRs;
    const roundedRs = Math.floor(currentTotalRs / step) * step;
    setFinalPriceRs(roundedRs.toString());
    setMode('final_price');
    playPosSound('click');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in-50 duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-saffron-400" />
            <h3 className="font-bold text-base">Discount / Negotiate Price</h3>
          </div>
          <button
            onClick={() => setIsDiscountModalOpen(false)}
            className="w-8 h-8 rounded-full bg-coastal-800 hover:bg-coastal-700 flex items-center justify-center text-coastal-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500">Bill Subtotal:</span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">
              {formatPaise(subtotal)}
            </span>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setMode('final_price')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'final_price'
                  ? 'bg-white dark:bg-slate-700 text-coastal-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Set Final ₹
            </button>
            <button
              type="button"
              onClick={() => setMode('amount')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'amount'
                  ? 'bg-white dark:bg-slate-700 text-coastal-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Flat ₹ Off
            </button>
            <button
              type="button"
              onClick={() => setMode('percent')}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'percent'
                  ? 'bg-white dark:bg-slate-700 text-coastal-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Percent %
            </button>
          </div>

          {/* Mode Input Field */}
          {mode === 'final_price' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Final Negotiated Total Price (₹):
              </label>
              <input
                type="number"
                step="any"
                value={finalPriceRs}
                onChange={(e) => setFinalPriceRs(e.target.value)}
                placeholder={`e.g. ${Math.floor(subtotalRs)}`}
                className="w-full h-12 px-3 text-xl font-black rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white"
                autoFocus
              />
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] font-semibold text-slate-400">Quick helpers:</span>
                <button
                  type="button"
                  onClick={() => handleQuickRoundDown(5)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Round down ₹5
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRoundDown(10)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Round down ₹10
                </button>
              </div>
            </div>
          )}

          {mode === 'amount' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Flat Discount Amount (₹):
              </label>
              <input
                type="number"
                step="any"
                value={amountValRs}
                onChange={(e) => setAmountValRs(e.target.value)}
                placeholder="e.g. 15.00"
                className="w-full h-12 px-3 text-xl font-black rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white"
                autoFocus
              />
            </div>
          )}

          {mode === 'percent' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discount Percentage (%):
              </label>
              <input
                type="number"
                step="any"
                value={percentVal}
                onChange={(e) => setPercentVal(e.target.value)}
                placeholder="e.g. 5"
                className="w-full h-12 px-3 text-xl font-black rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white"
                autoFocus
              />
            </div>
          )}

          {/* Quick Reasons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for Discount:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                    reason === r
                      ? 'bg-coastal-100 dark:bg-coastal-950 text-coastal-900 dark:text-coastal-200 border-coastal-500'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setBillDiscount(0);
                setIsDiscountModalOpen(false);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Clear Discount
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm shadow-md shadow-coastal-800/20"
            >
              Apply Discount
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
