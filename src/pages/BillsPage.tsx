import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { usePos } from '../context/PosContext';
import { formatPaise, formatDateTime } from '../utils/formatters';
import { Search, Receipt, Printer, Ban, Eye, Calendar, User as UserIcon } from 'lucide-react';

export const BillsPage: React.FC = () => {
  const { isAdmin, requestAdminApproval } = useAuth();
  const { setLastCompletedBill, setIsReceiptModalOpen } = usePos();

  const [bills, setBills] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchBills = () => {
    setIsLoading(true);
    let url = '/bills?limit=100';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (selectedStatus !== 'all') url += `&status=${encodeURIComponent(selectedStatus)}`;

    apiRequest<{ bills: any[] }>(url)
      .then((data) => setBills(data.bills || []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchBills();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBills();
  };

  const handleViewReceipt = async (billId: string) => {
    try {
      const data = await apiRequest<{ bill: any }>(`/bills/${billId}`);
      setLastCompletedBill(data.bill);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVoidBill = async (bill: any) => {
    if (bill.status === 'voided') return;

    const reason = prompt(`Enter mandatory reason to VOID bill #${bill.bill_number}:`);
    if (!reason || !reason.trim()) return;

    let approverId: string | null = null;
    if (!isAdmin) {
      approverId = await requestAdminApproval(`Void completed bill #${bill.bill_number} (Amount: ${formatPaise(bill.grand_total)})`);
      if (!approverId) return;
    }

    try {
      await apiRequest(`/bills/${bill.id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      alert(`Bill #${bill.bill_number} successfully voided and inventory restored.`);
      fetchBills();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 space-y-3">
      {/* Search & Filter Header */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search bill number, customer phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-coastal-600"
          />
        </form>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['all', 'completed', 'voided', 'returned', 'held'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                selectedStatus === st
                  ? 'bg-coastal-800 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading sales history...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No bills found matching the criteria.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Bill Number</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {b.bill_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(b.created_at)}</td>
                    <td className="py-3 px-4 font-medium">{b.cashier_name}</td>
                    <td className="py-3 px-4">{b.items_count} items</td>
                    <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                      {b.discount_total > 0 ? `-${formatPaise(b.discount_total)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-sm text-slate-900 dark:text-white">
                      {formatPaise(b.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          b.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : b.status === 'voided'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(b.id)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-coastal-800 hover:text-white transition-all"
                          title="View / Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {b.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleVoidBill(b)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                            title="Void Bill (Restores Stock)"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
