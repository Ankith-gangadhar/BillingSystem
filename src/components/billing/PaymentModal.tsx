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
    includeCarryBag,
    carryBagChargePaise,
  } = usePos();

  const { user } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi');
  const [tenderedRs, setTenderedRs] = useState<string>('');
  const [upiAmountRs, setUpiAmountRs] = useState<string>('');
  const [upiRef, setUpiRef] = useState<string>('');
  const [showBillItems, setShowBillItems] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Split Payment state
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod; amount: number; reference?: string }>>([]);

  const grandTotalRupees = grandTotal / 100;

  useEffect(() => {
    if (isPaymentModalOpen) {
      setSelectedMethod('upi');
      setTenderedRs(grandTotalRupees.toString());
      setUpiAmountRs(grandTotalRupees.toString());
      setUpiRef('');
      setShowBillItems(false);
      setIsSplitMode(false);
      setErrorMsg(null);
      setSplitPayments([
        { method: 'upi', amount: Math.floor(grandTotal / 2) },
        { method: 'cash', amount: grandTotal - Math.floor(grandTotal / 2) },
      ]);
    }
  }, [isPaymentModalOpen, grandTotal, grandTotalRupees]);

  if (!isPaymentModalOpen) return null;

  const tenderedPaise = parsePaise(tenderedRs || '0');
  const upiAmountPaise = parsePaise(upiAmountRs || '0');

  // If cashier types less than grand total in cash or UPI (e.g. 600 for a 625 bill),
  // the bill is dynamically discounted to 600 and difference is applied as discount!
  const isLesserCash = selectedMethod === 'cash' && !isSplitMode && tenderedPaise > 0 && tenderedPaise < grandTotal;
  const isLesserUpi = selectedMethod === 'upi' && !isSplitMode && upiAmountPaise > 0 && upiAmountPaise < grandTotal;
  const isLesserTender = isLesserCash || isLesserUpi;
  const effectivePayablePaise = isLesserCash ? tenderedPaise : isLesserUpi ? upiAmountPaise : grandTotal;
  const autoDiscountPaise = isLesserTender ? grandTotal - effectivePayablePaise : 0;
  const changeDuePaise = selectedMethod === 'cash' && !isSplitMode && tenderedPaise > grandTotal ? tenderedPaise - grandTotal : 0;

  const handleQuickCash = (amountRs: number) => {
    setTenderedRs(amountRs.toString());
    setSelectedMethod('cash');
    playPosSound('click');
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0 && !includeCarryBag) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let finalBillTotal = grandTotal;
      let totalBillDiscount = billDiscountPaise;

      // If tendered cash or UPI amount is less than grand total (e.g. 600 on a 625 bill),
      // automatically bill at 600 with the 25 difference as discount!
      if (isLesserTender) {
        totalBillDiscount += (grandTotal - effectivePayablePaise);
        finalBillTotal = effectivePayablePaise;
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
      } else if (selectedMethod === 'upi') {
        paymentsPayload = [
          {
            method: 'upi',
            amount: finalBillTotal,
            reference: upiRef || null,
          },
        ];
      } else {
        paymentsPayload = [
          {
            method: selectedMethod,
            amount: finalBillTotal,
            reference: null,
          },
        ];
      }

      const itemsPayload: any[] = cart.map((item) => ({
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
      }));

      if (includeCarryBag && carryBagChargePaise > 0) {
        itemsPayload.push({
          productId: null,
          isCustom: true,
          name: 'Carry Bag',
          sku: null,
          qty: 1,
          unit: 'piece',
          listPrice: carryBagChargePaise,
          soldPrice: carryBagChargePaise,
          lineDiscount: 0,
          gstRate: 0,
          priceOverrideReason: null,
          overrideApprovedBy: null,
        });
      }

      const payload = {
        shiftId: currentShift?.id,
        customerId: selectedCustomer?.id || null,
        items: itemsPayload,
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
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in-50 duration-200 select-none">
      <div className="neu-modal rounded-3xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-coastal-900 via-coastal-800 to-coastal-900 text-white flex items-center justify-between shrink-0 shadow-sm border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-inner">
              <Receipt className="w-4 h-4 text-saffron-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight leading-none">Checkout & Payment</h3>
              <p className="text-[11px] text-coastal-200 font-medium mt-0.5">Quick & Secure Settlement</p>
            </div>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(false)}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 flex items-center justify-center text-coastal-100 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {/* Amount Due Card with Bill Breakdown Toggle */}
          <div className="neu-pressed p-4 rounded-2xl space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">
                  {isLesserTender ? 'Adjusted Bill Amount' : 'Amount Payable'}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {cart.length + (includeCarryBag ? 1 : 0)} items in bill
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBillItems(!showBillItems)}
                    className="text-[11px] text-coastal-700 dark:text-coastal-300 font-bold underline hover:text-coastal-900 dark:hover:text-coastal-100 transition-colors"
                  >
                    {showBillItems ? 'Hide Bill' : 'Show Bill Items'}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-black text-coastal-800 dark:text-coastal-300 tracking-tight drop-shadow-xs">
                  {formatPaise(effectivePayablePaise)}
                </div>
                {isLesserTender && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    ₹{(autoDiscountPaise / 100).toFixed(2)} discount applied
                  </span>
                )}
              </div>
            </div>

            {/* Collapsible Bill Items Preview */}
            {showBillItems && (
              <div className="mt-2 pt-2 border-t border-slate-300/60 dark:border-slate-700/60 text-xs space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="truncate pr-2 font-medium">{item.name} × {item.qty}</span>
                    <span className="font-bold shrink-0">{formatPaise(item.sold_price * item.qty)}</span>
                  </div>
                ))}
                {includeCarryBag && (
                  <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                    <span className="truncate pr-2">Carry Bag × 1</span>
                    <span className="font-bold shrink-0">{formatPaise(carryBagChargePaise)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold pt-1.5 border-t border-dashed border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <span>Subtotal:</span>
                  <span>{formatPaise(subtotal)}</span>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300/40 dark:border-rose-800/40 text-xs font-bold shadow-inner">
              {errorMsg}
            </div>
          )}

          {/* Payment Method Selector (Neumorphic Segmented Tabs) */}
          <div className="neu-inset-sm p-1.5 rounded-2xl grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsSplitMode(false);
                setSelectedMethod('upi');
              }}
              className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                !isSplitMode && selectedMethod === 'upi'
                  ? 'neu-btn-primary shadow-md'
                  : 'neu-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <QrCode className={`w-4 h-4 ${!isSplitMode && selectedMethod === 'upi' ? 'text-white' : 'text-indigo-500'}`} />
              <span>UPI / QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSplitMode(false);
                setSelectedMethod('cash');
              }}
              className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                !isSplitMode && selectedMethod === 'cash'
                  ? 'neu-btn-primary shadow-md'
                  : 'neu-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Banknote className={`w-4 h-4 ${!isSplitMode && selectedMethod === 'cash' ? 'text-white' : 'text-emerald-500'}`} />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSplitMode(false);
                setSelectedMethod('card');
              }}
              className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                !isSplitMode && selectedMethod === 'card'
                  ? 'neu-btn-primary shadow-md'
                  : 'neu-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className={`w-4 h-4 ${!isSplitMode && selectedMethod === 'card' ? 'text-white' : 'text-amber-500'}`} />
              <span>Card</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSplitMode(true)}
              className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 font-bold text-xs transition-all ${
                isSplitMode
                  ? 'neu-btn-primary shadow-md'
                  : 'neu-btn text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className={`w-4 h-4 ${isSplitMode ? 'text-white' : 'text-purple-500'}`} />
              <span>Split</span>
            </button>
          </div>

          {/* Cash Details Panel */}
          {!isSplitMode && selectedMethod === 'cash' && (
            <div className="neu-flat p-4 rounded-2xl space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
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
                  className="neu-input w-full h-12 px-4 text-xl font-black rounded-xl outline-none text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Quick Denominations */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleQuickCash(grandTotalRupees)}
                  className="neu-btn px-2.5 py-1.5 rounded-xl font-bold text-xs text-coastal-800 dark:text-coastal-300 border border-coastal-600/30"
                >
                  Exact ({formatPaise(grandTotal)})
                </button>
                {[100, 200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickCash(amt)}
                    className="neu-btn px-2.5 py-1.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {/* Change Return Calculation */}
              <div className="neu-inset p-3.5 rounded-2xl flex justify-between items-center bg-emerald-500/10 border border-emerald-400/30">
                <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-300">
                  Change to Return:
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                  {formatPaise(changeDuePaise)}
                </span>
              </div>
            </div>
          )}

          {/* UPI QR & Ref Panel (Editable UPI Cost & Dynamic QR) */}
          {!isSplitMode && selectedMethod === 'upi' && (
            <div className="neu-flat p-4 rounded-2xl space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
                  UPI Bill Amount to Collect (₹):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={upiAmountRs}
                    onChange={(e) => setUpiAmountRs(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCompleteSale();
                      }
                    }}
                    className="neu-input flex-1 h-12 px-4 text-xl font-black rounded-xl outline-none text-slate-900 dark:text-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setUpiAmountRs(grandTotalRupees.toString())}
                    className="neu-btn px-4 h-12 rounded-xl font-extrabold text-xs text-slate-700 dark:text-slate-200 shrink-0"
                  >
                    Reset Exact
                  </button>
                </div>
              </div>

              {/* Dynamic QR Code Surface */}
              <div className="neu-inset p-4 rounded-2xl max-w-xs mx-auto flex flex-col items-center">
                <div className="w-36 h-36 bg-white p-2 rounded-2xl shadow-sm flex items-center justify-center border border-slate-200 overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=mangalorestore@upi&pn=Mangalore Store&am=${(parsePaise(upiAmountRs || '0') / 100).toFixed(2)}&cu=INR`
                    )}`}
                    alt="UPI QR Code"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-2.5">
                  Scan & Pay ₹{(parsePaise(upiAmountRs || '0') / 100).toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  GPay • PhonePe • Paytm • BHIM
                </p>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="UPI Ref / UTR / Transaction ID (Optional)"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="neu-input w-full h-10 px-3.5 text-xs rounded-xl outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Split Payment Configuration */}
          {isSplitMode && (
            <div className="neu-flat p-4 rounded-2xl space-y-2.5">
              <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Split Breakdown
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    UPI Amount (₹):
                  </label>
                  <input
                    type="number"
                    value={splitPayments[0]?.amount ? splitPayments[0].amount / 100 : ''}
                    onChange={(e) => {
                      const v = parsePaise(e.target.value || '0');
                      setSplitPayments([
                        { method: 'upi', amount: v },
                        { method: 'cash', amount: Math.max(0, grandTotal - v) },
                      ]);
                    }}
                    className="neu-input w-full h-10 px-3 font-extrabold text-sm rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Cash Amount (₹):
                  </label>
                  <input
                    type="number"
                    value={splitPayments[1]?.amount ? splitPayments[1].amount / 100 : ''}
                    onChange={(e) => {
                      const v = parsePaise(e.target.value || '0');
                      setSplitPayments([
                        { method: 'upi', amount: Math.max(0, grandTotal - v) },
                        { method: 'cash', amount: v },
                      ]);
                    }}
                    className="neu-input w-full h-10 px-3 font-extrabold text-sm rounded-xl outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100/70 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800/80 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(false)}
            className="neu-btn px-4 py-3 rounded-2xl text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCompleteSale}
            className="neu-btn-primary flex-1 py-3.5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Completing Sale...</span>
            ) : (
              <>
                <span>Finish & Print Receipt</span>
                <CheckCircle2 className="w-4 h-4 text-saffron-300" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
