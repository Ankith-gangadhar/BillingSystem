import React, { useState, useEffect } from 'react';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { formatPaise, parsePaise, playPosSound } from '../../utils/formatters';
import { PaymentMethod } from '@shared/types';
import confetti from 'canvas-confetti';
import {
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  X,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const PaymentModal: React.FC = () => {
  const {
    cart,
    subtotal,
    billDiscountPaise,
    grandTotal,
    currentShift,
    clearCart,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    setIsReceiptModalOpen,
    setLastCompletedBill,
    selectedCustomer,
    setFinalPrice,
  } = usePos();

  const { user } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [tenderedRs, setTenderedRs] = useState<string>('');
  const [upiRef, setUpiRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Split Payment state
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod; amount: number; reference?: string }>>([]);

  const grandTotalRupees = grandTotal / 100;

  useEffect(() => {
    if (isPaymentModalOpen) {
      setSelectedMethod('cash');
      setTenderedRs(grandTotalRupees.toString());
      setUpiRef('');
      setIsSplitMode(false);
      setErrorMsg(null);
      setSplitPayments([
        { method: 'cash', amount: Math.floor(grandTotal / 2) },
        { method: 'upi', amount: grandTotal - Math.floor(grandTotal / 2) },
      ]);
    }
  }, [isPaymentModalOpen, grandTotal, grandTotalRupees]);

  if (!isPaymentModalOpen) return null;

  const tenderedPaise = parsePaise(tenderedRs || '0');

  // If cashier types less than grand total in cash (e.g. 600 for a 625 bill),
  // the bill is dynamically discounted to 600 and difference is applied as discount!
  const isLesserTender = selectedMethod === 'cash' && !isSplitMode && tenderedPaise > 0 && tenderedPaise < grandTotal;
  const effectivePayablePaise = isLesserTender ? tenderedPaise : grandTotal;
  const autoDiscountPaise = isLesserTender ? grandTotal - tenderedPaise : 0;
  const changeDuePaise = selectedMethod === 'cash' && !isSplitMode && tenderedPaise > grandTotal ? tenderedPaise - grandTotal : 0;

  const handleQuickCash = (amountRs: number) => {
    setTenderedRs(amountRs.toString());
    setSelectedMethod('cash');
    playPosSound('click');
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let finalBillTotal = grandTotal;
      let totalBillDiscount = billDiscountPaise;

      // If tendered cash is less than grand total (e.g. 600 tendered on a 625 bill),
      // automatically bill at 600 with the 25 difference as discount!
      if (selectedMethod === 'cash' && !isSplitMode && tenderedPaise > 0 && tenderedPaise < grandTotal) {
        totalBillDiscount += (grandTotal - tenderedPaise);
        finalBillTotal = tenderedPaise;
      }

      let paymentsPayload = [];

      if (isSplitMode) {
        const totalSplit = splitPayments.reduce((acc, p) => acc + p.amount, 0);
        if (totalSplit !== finalBillTotal) {
          throw new Error(`Split payments sum (₹${(totalSplit / 100).toFixed(2)}) must equal Final Total (₹${(finalBillTotal / 100).toFixed(2)})`);
        }
        paymentsPayload = splitPayments;
      } else if (selectedMethod === 'cash') {
        paymentsPayload = [
          {
            method: 'cash',
            amount: finalBillTotal,
            tenderedAmount: tenderedPaise > 0 ? tenderedPaise : finalBillTotal,
            changeAmount: changeDuePaise,
          },
        ];
      } else {
        paymentsPayload = [
          {
            method: selectedMethod,
            amount: finalBillTotal,
            reference: upiRef || null,
          },
        ];
      }

      const payload = {
        shiftId: currentShift?.id,
        customerId: selectedCustomer?.id || null,
        items: cart.map((item) => ({
          productId: item.product_id,
          isCustom: item.is_custom,
          name: item.name,
          sku: item.sku,
          qty: item.qty,
          unit: item.unit,
          listPrice: item.list_price,
          soldPrice: item.sold_price,
          lineDiscount: item.line_discount,
          gstRate: item.gst_rate,
          priceOverrideReason: item.price_override_reason || null,
          overrideApprovedBy: item.override_approved_by || null,
        })),
        payments: paymentsPayload,
        billDiscountTotal: totalBillDiscount,
        notes: notes || null,
      };

      const response = await apiRequest<{ bill: any }>('/bills', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Celebration effect
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });

      playPosSound('success');
      setLastCompletedBill(response.bill);
      clearCart();
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      playPosSound('error');
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-3 z-50 animate-in fade-in-50 duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-2.5 bg-coastal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-saffron-400" />
            <h3 className="font-bold text-base">Complete Payment & Checkout</h3>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(false)}
            className="w-7 h-7 rounded-full bg-coastal-800 hover:bg-coastal-700 flex items-center justify-center text-coastal-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {/* Amount Due Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {isLesserTender ? 'Adjusted Bill Amount' : 'Amount Payable'}
                </span>
                <div className="text-xs text-slate-400">{cart.length} items in cart</div>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black text-coastal-800 dark:text-coastal-400">
                  {formatPaise(effectivePayablePaise)}
                </div>
                {isLesserTender && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{(autoDiscountPaise / 100).toFixed(2)} discount applied
                  </span>
                )}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsSplitMode(false);
                setSelectedMethod('cash');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                !isSplitMode && selectedMethod === 'cash'
                  ? 'bg-coastal-800 text-white border-coastal-800 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-500" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSplitMode(false);
                setSelectedMethod('upi');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                !isSplitMode && selectedMethod === 'upi'
                  ? 'bg-coastal-800 text-white border-coastal-800 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSplitMode(false);
                setSelectedMethod('card');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                !isSplitMode && selectedMethod === 'card'
                  ? 'bg-coastal-800 text-white border-coastal-800 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span>Card</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSplitMode(true)}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                isSplitMode
                  ? 'bg-coastal-800 text-white border-coastal-800 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-purple-500" />
              <span>Split</span>
            </button>
          </div>

          {/* Cash Details Panel */}
          {!isSplitMode && selectedMethod === 'cash' && (
            <div className="space-y-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cash Received / Billed Amount (₹):
                </label>
                <input
                  type="number"
                  value={tenderedRs}
                  onChange={(e) => setTenderedRs(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCompleteSale();
                    }
                  }}
                  className="w-full h-11 px-3 text-lg font-black rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Quick Denominations */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-400">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleQuickCash(grandTotalRupees)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:bg-slate-200 text-slate-700 dark:text-slate-200"
                >
                  Exact ({formatPaise(grandTotal)})
                </button>
                {[100, 200, 500, 1000, 2000].map((amt) => {
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleQuickCash(amt)}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:bg-slate-200 text-slate-700 dark:text-slate-200"
                    >
                      ₹{amt}
                    </button>
                  );
                })}
              </div>

              {/* Change Return Calculation */}
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex justify-between items-center">
                <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                  Change to Return to Customer:
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {formatPaise(changeDuePaise)}
                </span>
              </div>
            </div>
          )}

          {/* UPI QR & Ref Panel */}
          {!isSplitMode && selectedMethod === 'upi' && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900 text-center">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl max-w-xs mx-auto flex flex-col items-center">
                <QrCode className="w-28 h-28 text-slate-800 dark:text-white" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1.5">
                  Scan & Pay ₹{grandTotalRupees.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400">UPI: mangalorestore@upi</p>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="UPI Ref / UTR / Transaction ID (Optional)"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
            </div>
          )}

          {/* Split Payment Configuration */}
          {isSplitMode && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">Split Breakdown</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-500">Cash Amount (₹):</label>
                  <input
                    type="number"
                    value={splitPayments[0]?.amount ? splitPayments[0].amount / 100 : ''}
                    onChange={(e) => {
                      const v = parsePaise(e.target.value || '0');
                      setSplitPayments([
                        { method: 'cash', amount: v },
                        { method: 'upi', amount: Math.max(0, grandTotal - v) },
                      ]);
                    }}
                    className="w-full h-9 px-2 font-bold text-sm rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500">UPI Amount (₹):</label>
                  <input
                    type="number"
                    value={splitPayments[1]?.amount ? splitPayments[1].amount / 100 : ''}
                    onChange={(e) => {
                      const v = parsePaise(e.target.value || '0');
                      setSplitPayments([
                        { method: 'cash', amount: Math.max(0, grandTotal - v) },
                        { method: 'upi', amount: v },
                      ]);
                    }}
                    className="w-full h-9 px-2 font-bold text-sm rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(false)}
            className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCompleteSale}
            className="flex-1 py-3 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-coastal-800/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Completing Sale...</span>
            ) : (
              <>
                <span>Finish & Print Receipt</span>
                <CheckCircle2 className="w-4 h-4 text-saffron-400" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
