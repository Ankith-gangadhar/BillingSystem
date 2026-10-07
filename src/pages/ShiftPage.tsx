import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePos } from '../context/PosContext';
import { apiRequest } from '../utils/api';
import { formatPaise, parsePaise, formatDateTime } from '../utils/formatters';
import { Shift } from '@shared/types';
import {
  Clock,
  Banknote,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

export const ShiftPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { currentShift, refreshShift } = usePos();

  const [openingCashRs, setOpeningCashRs] = useState('');
  const [cashEventType, setCashEventType] = useState<'pay_out' | 'pay_in' | 'expense'>('expense');
  const [cashEventAmtRs, setCashEventAmtRs] = useState('');
  const [cashEventReason, setCashEventReason] = useState('');

  const [countedCashRs, setCountedCashRs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time-range activity query
  const [timeRangeStart, setTimeRangeStart] = useState<string>(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [timeRangeEnd, setTimeRangeEnd] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [activityReport, setActivityReport] = useState<any | null>(null);

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parsePaise(openingCashRs || '0');
    setIsSubmitting(true);
    try {
      await apiRequest('/shifts/start', {
        method: 'POST',
        body: JSON.stringify({ openingCash: paise }),
      });
      refreshShift();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCashEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift || !cashEventAmtRs || !cashEventReason) return;
    const paise = parsePaise(cashEventAmtRs);
    setIsSubmitting(true);
    try {
      await apiRequest('/shifts/cash-events', {
        method: 'POST',
        body: JSON.stringify({
          shiftId: currentShift.id,
          type: cashEventType,
          amount: paise,
          reason: cashEventReason,
        }),
      });
      setCashEventAmtRs('');
      setCashEventReason('');
      refreshShift();
      alert('Cash event logged successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift || !countedCashRs) return;
    const paise = parsePaise(countedCashRs);
    if (!confirm('Are you sure you want to finalize and close your shift?')) return;

    setIsSubmitting(true);
    try {
      const data = await apiRequest<{ shift: Shift }>(`/shifts/${currentShift.id}/close`, {
        method: 'POST',
        body: JSON.stringify({ countedCash: paise }),
      });
      alert(`Shift closed! Expected: ${formatPaise(data.shift.expected_cash)}, Counted: ${formatPaise(data.shift.counted_cash)}, Difference: ${formatPaise(data.shift.cash_difference)}`);
      refreshShift();
      setCountedCashRs('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunTimeRangeReport = async () => {
    try {
      const data = await apiRequest<{ report: any }>(`/shifts/activity-report?startTime=${timeRangeStart}&endTime=${timeRangeEnd}`);
      setActivityReport(data.report);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-100 dark:bg-slate-950">
      {/* 1. Active Shift Card or Start Shift Form */}
      {!currentShift ? (
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-coastal-50 dark:bg-coastal-950/50 text-coastal-700 dark:text-coastal-400 flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Start Your Counter Shift</h2>
            <p className="text-xs text-slate-500 mt-1">
              Count the physical cash in the drawer before starting billing.
            </p>
          </div>

          <form onSubmit={handleStartShift} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 text-left">
                Opening Cash in Drawer (₹):
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="₹ 1,000.00"
                value={openingCashRs}
                onChange={(e) => setOpeningCashRs(e.target.value)}
                className="w-full h-12 text-center text-xl font-black rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !openingCashRs}
              className="w-full py-3.5 rounded-2xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-base shadow-lg shadow-coastal-800/30 transition-all disabled:opacity-50"
            >
              Open Shift & Start Billing
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Active Shift Metrics */}
          <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Active Shift Overview</h3>
              </div>
              <span className="text-xs text-slate-500">
                Started: {formatDateTime(currentShift.started_at)} by <strong>{currentShift.user_name || user?.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Opening Drawer</span>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {formatPaise(currentShift.opening_cash)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Cash Sales</span>
                <div className="text-lg font-black text-emerald-900 dark:text-emerald-100 mt-1">
                  {formatPaise(currentShift.cash_sales || 0)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">UPI / Card Sales</span>
                <div className="text-lg font-black text-indigo-900 dark:text-indigo-100 mt-1">
                  {formatPaise((currentShift.upi_sales || 0) + (currentShift.card_sales || 0))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Bills / Disc</span>
                <div className="text-lg font-black text-amber-900 dark:text-amber-100 mt-1">
                  {currentShift.bills_count || 0} bills ({formatPaise(currentShift.discounts_total || 0)})
                </div>
              </div>
            </div>

            {/* Expected Cash Summary for Admin */}
            {isAdmin && (
              <div className="p-4 rounded-2xl bg-coastal-50 dark:bg-coastal-950/40 border border-coastal-200 dark:border-coastal-800 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-coastal-900 dark:text-coastal-200">
                    Current Expected Cash in Drawer:
                  </span>
                  <div className="text-[11px] text-coastal-600 dark:text-coastal-400">
                    Formula: Opening ({formatPaise(currentShift.opening_cash)}) + Cash Sales ({formatPaise(currentShift.cash_sales || 0)}) − Payouts / Refunds
                  </div>
                </div>
                <div className="text-2xl font-black text-coastal-800 dark:text-coastal-300">
                  {formatPaise(currentShift.expected_cash)}
                </div>
              </div>
            )}

            {/* Log Cash Expense / Payout Form */}
            <form onSubmit={handleAddCashEvent} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">
                Record Drawer Cash Out / Expense (e.g. Milk, Auto, Tea)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select
                  value={cashEventType}
                  onChange={(e) => setCashEventType(e.target.value as any)}
                  className="h-10 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="expense">Expense (Shop)</option>
                  <option value="pay_out">Cash Payout</option>
                  <option value="pay_in">Cash Pay In</option>
                </select>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Amount ₹"
                  value={cashEventAmtRs}
                  onChange={(e) => setCashEventAmtRs(e.target.value)}
                  className="h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700"
                />
                <input
                  type="text"
                  required
                  placeholder="Reason (e.g. Bought milk ₹60)"
                  value={cashEventReason}
                  onChange={(e) => setCashEventReason(e.target.value)}
                  className="h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-700"
                >
                  Log Cash Event
                </button>
              </div>
            </form>
          </div>

          {/* Close Shift (Blind Count) */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Close Shift Handover</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter total cash counted in drawer to end your shift. Shortage/excess will be logged.
              </p>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Counted Cash (₹):
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="Counted ₹"
                  value={countedCashRs}
                  onChange={(e) => setCountedCashRs(e.target.value)}
                  className="w-full h-12 text-center text-xl font-black rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-rose-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !countedCashRs}
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-md transition-all disabled:opacity-50"
              >
                End Shift & Log Count
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Admin Time-Range Activity Report ("Since I was away" tool) */}
      {isAdmin && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Time-Range Shift Activity Inspector
              </h3>
              <p className="text-xs text-slate-500">Inspect any exact time window (e.g. 7:00 AM – 10:00 AM) and verify cashier cash</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="datetime-local"
                value={timeRangeStart}
                onChange={(e) => setTimeRangeStart(e.target.value)}
                className="h-9 px-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="datetime-local"
                value={timeRangeEnd}
                onChange={(e) => setTimeRangeEnd(e.target.value)}
                className="h-9 px-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
              />
              <button
                onClick={handleRunTimeRangeReport}
                className="px-4 py-2 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white text-xs font-bold shadow-xs"
              >
                Inspect Window
              </button>
            </div>
          </div>

          {activityReport && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Sales</span>
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {formatPaise(activityReport.total_sales)}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Cash Sales</span>
                  <div className="text-base font-black text-emerald-600">
                    {formatPaise(activityReport.cash_sales)}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">UPI Sales</span>
                  <div className="text-base font-black text-indigo-600">
                    {formatPaise(activityReport.upi_sales)}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Discounts Given</span>
                  <div className="text-base font-black text-rose-600">
                    {formatPaise(activityReport.discounts_total)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
