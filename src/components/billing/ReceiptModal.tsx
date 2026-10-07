import React, { useRef } from 'react';
import { usePos } from '../../context/PosContext';
import { useAuth } from '../../context/AuthContext';
import { formatPaise, formatDate, formatTime } from '../../utils/formatters';
import { Printer, Download, X, Share2, Check, Store } from 'lucide-react';

export const ReceiptModal: React.FC = () => {
  const { isReceiptModalOpen, setIsReceiptModalOpen, lastCompletedBill } = usePos();
  const { settings, user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isReceiptModalOpen || !lastCompletedBill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `*Receipt from ${settings?.store_name || 'Mangalore Store'}*\nBill No: ${lastCompletedBill.bill_number}\nDate: ${formatDate(lastCompletedBill.created_at)}\nTotal: ${formatPaise(lastCompletedBill.grand_total)}\nThank you for shopping with us!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in-50 duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-saffron-400" />
            <h3 className="font-bold text-base">Receipt Preview</h3>
          </div>
          <button
            onClick={() => setIsReceiptModalOpen(false)}
            className="w-8 h-8 rounded-full bg-coastal-800 hover:bg-coastal-700 flex items-center justify-center text-coastal-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Thermal Card (80mm Width Style) */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="w-full max-w-[340px] bg-white text-slate-900 p-4 shadow-md font-mono text-xs leading-tight rounded-xl border border-slate-200"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h2 className="font-black text-base uppercase tracking-tight">
                {settings?.store_name || 'Mangalore Store'}
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">{settings?.address}</p>
              <p className="text-[11px] text-slate-600">Ph: {settings?.phone}</p>
              {settings?.gstin && <p className="text-[10px] text-slate-500 font-bold">GSTIN: {settings.gstin}</p>}
            </div>

            {/* Bill Meta */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Bill No: <strong>{lastCompletedBill.bill_number}</strong></span>
                <span>{formatDate(lastCompletedBill.created_at)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Cashier: {lastCompletedBill.cashier_name || user?.name}</span>
                <span>{formatTime(lastCompletedBill.created_at)}</span>
              </div>
              {lastCompletedBill.customer_name && (
                <div className="text-slate-600">Customer: {lastCompletedBill.customer_name}</div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2 border-b border-dashed border-slate-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Rate</th>
                    <th className="pb-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(lastCompletedBill.items || []).map((it: any, idx: number) => {
                    const originalRate = it.list_price_snapshot ?? it.listPrice ?? it.sold_price ?? it.soldPrice ?? 0;
                    const lineAmt = Math.round(originalRate * it.qty);
                    return (
                      <tr key={idx} className="py-1">
                        <td className="py-1 pr-1 font-sans font-semibold text-xs leading-tight">
                          {it.name_snapshot || it.name}
                          {it.is_custom ? ' (Custom)' : ''}
                        </td>
                        <td className="py-1 text-center">{it.qty}</td>
                        <td className="py-1 text-right">{formatPaise(originalRate, false)}</td>
                        <td className="py-1 text-right font-bold">{formatPaise(lineAmt, false)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-right">
              <div className="flex justify-between text-[11px]">
                <span>Subtotal:</span>
                <span>{formatPaise(lastCompletedBill.subtotal)}</span>
              </div>
              {lastCompletedBill.discount_total > 0 && (
                <div className="flex justify-between text-[11px] text-rose-600 font-bold">
                  <span>Discount:</span>
                  <span>-{formatPaise(lastCompletedBill.discount_total)}</span>
                </div>
              )}
              {lastCompletedBill.tax_total > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span>GST:</span>
                  <span>{formatPaise(lastCompletedBill.tax_total)}</span>
                </div>
              )}
              {lastCompletedBill.round_off !== 0 && (
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Round Off:</span>
                  <span>{formatPaise(lastCompletedBill.round_off)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black border-t border-slate-300 pt-1 text-slate-900">
                <span>TOTAL:</span>
                <span>{formatPaise(lastCompletedBill.grand_total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
              {(lastCompletedBill.payments || []).map((p: any, idx: number) => (
                <div key={idx} className="flex justify-between capitalize">
                  <span>Paid via {p.method}:</span>
                  <span className="font-bold">{formatPaise(p.amount)}</span>
                </div>
              ))}
              {lastCompletedBill.payments?.[0]?.tendered_amount && (
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Cash Tendered:</span>
                  <span>{formatPaise(lastCompletedBill.payments[0].tendered_amount)}</span>
                </div>
              )}
              {lastCompletedBill.payments?.[0]?.change_amount > 0 && (
                <div className="flex justify-between text-slate-700 font-bold text-[10px]">
                  <span>Change Returned:</span>
                  <span>{formatPaise(lastCompletedBill.payments[0].change_amount)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-0.5">
              <p className="font-semibold text-slate-700">{settings?.receipt_footer || 'Thank You! Visit Again.'}</p>
              <p className="text-[9px]">Computer Generated Tax Invoice</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
            title="Share via WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 rounded-2xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-coastal-800/20"
          >
            <Printer className="w-4 h-4 text-saffron-400" />
            <span>Print Receipt</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(false)}
            className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
