import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatPaise, formatDateTime } from '../utils/formatters';
import { RotateCcw, Search, CheckCircle, X, AlertCircle } from 'lucide-react';

export const ReturnsPage: React.FC = () => {
  const { isAdmin, requestAdminApproval } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Return Processing state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchBillNo, setSearchBillNo] = useState('');
  const [targetBill, setTargetBill] = useState<any | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ [itemId: string]: { returnQty: number; restock: boolean } }>({});
  const [reason, setReason] = useState('Damaged pack');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'upi' | 'card'>('cash');

  const fetchReturns = () => {
    setIsLoading(true);
    apiRequest<{ returns: any[] }>('/returns')
      .then((data) => setReturns(data.returns || []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleSearchBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchBillNo.trim()) return;

    try {
      const data = await apiRequest<{ bills: any[] }>(`/bills?search=${encodeURIComponent(searchBillNo)}`);
      if (data.bills && data.bills.length > 0) {
        const fullBill = await apiRequest<{ bill: any }>(`/bills/${data.bills[0].id}`);
        setTargetBill(fullBill.bill);

        const initialSelected: any = {};
        for (const it of fullBill.bill.items || []) {
          initialSelected[it.id] = { returnQty: 0, restock: true };
        }
        setSelectedItems(initialSelected);
      } else {
        alert('Bill not found');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBill) return;

    const returnItemsPayload = [];
    let totalRefundPaise = 0;

    for (const it of targetBill.items || []) {
      const sel = selectedItems[it.id];
      if (sel && sel.returnQty > 0) {
        returnItemsPayload.push({
          productId: it.product_id,
          itemName: it.name_snapshot,
          qty: sel.returnQty,
          unitPrice: it.sold_price,
          restock: sel.restock,
        });
        totalRefundPaise += Math.round(it.sold_price * sel.returnQty);
      }
    }

    if (returnItemsPayload.length === 0) {
      alert('Please select at least 1 item and quantity to return.');
      return;
    }

    let adminPin: string | undefined = undefined;
    if (!isAdmin) {
      const pin = prompt('Enter Admin PIN to authorize refund:');
      if (!pin) return;
      adminPin = pin;
    }

    try {
      await apiRequest('/returns', {
        method: 'POST',
        body: JSON.stringify({
          originalBillId: targetBill.id,
          reason,
          refundMethod,
          items: returnItemsPayload,
          adminPin,
        }),
      });

      alert('Return processed successfully. Stock movements and refund recorded.');
      setIsModalOpen(false);
      setTargetBill(null);
      fetchReturns();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 space-y-3">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Customer Returns & Refunds</h2>
          <p className="text-xs text-slate-500">Traceable returns tied to original sale bills with restock or damage ledger movements</p>
        </div>

        <button
          onClick={() => {
            setTargetBill(null);
            setSearchBillNo('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
        >
          <RotateCcw className="w-4 h-4 text-saffron-400" />
          <span>Process Return</span>
        </button>
      </div>

      {/* Returns List */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading returns history...</div>
          ) : returns.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No returns processed yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Original Bill</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Refund Method</th>
                  <th className="py-3 px-4 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {returns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {r.return_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(r.created_at)}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-coastal-700 dark:text-coastal-400">
                      {r.original_bill_number}
                    </td>
                    <td className="py-3 px-4">{r.reason}</td>
                    <td className="py-3 px-4 capitalize font-semibold">{r.refund_method}</td>
                    <td className="py-3 px-4 text-right font-black text-sm text-rose-600">
                      {formatPaise(r.refund_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Process Return Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Process Sale Return</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-coastal-800 flex items-center justify-center text-coastal-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Step 1: Find Bill */}
              {!targetBill ? (
                <form onSubmit={handleSearchBill} className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Enter Original Bill Number to Refund:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. MS-20261007-0001"
                      value={searchBillNo}
                      onChange={(e) => setSearchBillNo(e.target.value)}
                      className="flex-1 h-11 px-3 text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-bold text-xs shadow-sm"
                    >
                      Find Bill
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleProcessReturn} className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">Bill #{targetBill.bill_number}</span>
                      <div className="text-slate-500">{formatDateTime(targetBill.created_at)}</div>
                    </div>
                    <span className="text-sm font-black text-coastal-800 dark:text-coastal-300">
                      Total: {formatPaise(targetBill.grand_total)}
                    </span>
                  </div>

                  {/* Select Items */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase">
                      Select Items to Return
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(targetBill.items || []).map((it: any) => {
                        const sel = selectedItems[it.id] || { returnQty: 0, restock: true };
                        return (
                          <div key={it.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs block truncate">{it.name_snapshot}</span>
                              <span className="text-[11px] text-slate-500">
                                Sold: {it.qty} {it.unit} @ {formatPaise(it.sold_price)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={it.qty}
                                value={sel.returnQty}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value) || 0;
                                  setSelectedItems((prev) => ({
                                    ...prev,
                                    [it.id]: { ...sel, returnQty: v },
                                  }));
                                }}
                                className="w-16 h-8 px-2 text-xs font-bold rounded-lg border text-center"
                              />

                              <label className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                <input
                                  type="checkbox"
                                  checked={sel.restock}
                                  onChange={(e) => {
                                    setSelectedItems((prev) => ({
                                      ...prev,
                                      [it.id]: { ...sel, restock: e.target.checked },
                                    }));
                                  }}
                                  className="rounded text-coastal-800"
                                />
                                Restock
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Reason:
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full h-10 px-2 text-xs font-bold rounded-xl border bg-white dark:bg-slate-800"
                      >
                        <option value="Damaged pack">Damaged pack</option>
                        <option value="Expired item">Expired item</option>
                        <option value="Customer changed mind">Customer changed mind</option>
                        <option value="Wrong item purchased">Wrong item purchased</option>
                        <option value="Quality issue">Quality issue</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Refund Via:
                      </label>
                      <select
                        value={refundMethod}
                        onChange={(e) => setRefundMethod(e.target.value as any)}
                        className="w-full h-10 px-2 text-xs font-bold rounded-xl border bg-white dark:bg-slate-800"
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetBill(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm shadow-md"
                    >
                      Confirm Return & Refund
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
