import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatPaise, formatDate, formatTime } from '../utils/formatters';
import { DashboardSummary } from '@shared/types';
import {
  TrendingUp,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  Tag,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Database,
  ShieldCheck,
  Package,
  Layers,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    apiRequest<{ summary: DashboardSummary }>('/reports/dashboard')
      .then((data) => setSummary(data.summary))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !summary) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-slate-400">
        Loading analytics dashboard...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-100 dark:bg-slate-950">
      {/* "While You Were Away" Hero Alert Banner */}
      {summary.away_summary && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-coastal-900 to-coastal-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-coastal-700">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-saffron-500/20 text-saffron-400 flex items-center justify-center shrink-0 border border-saffron-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base">While You Were Away Activity</h3>
                <span className="text-[11px] bg-coastal-700 text-coastal-200 px-2 py-0.5 rounded-full">
                  {formatTime(summary.away_summary.from_time)} – {formatTime(summary.away_summary.to_time)}
                </span>
              </div>
              <p className="text-xs text-coastal-200 mt-1">
                <strong>{summary.away_summary.bills_count} bills</strong> completed for a total of{' '}
                <strong>{formatPaise(summary.away_summary.total_sales)}</strong> • Cash: {formatPaise(summary.away_summary.cash_sales)} • UPI: {formatPaise(summary.away_summary.upi_sales)} • Discounts:{' '}
                {summary.away_summary.discounts_count} ({formatPaise(summary.away_summary.discounts_total)})
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('shift')}
            className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-400 text-coastal-950 font-extrabold text-xs shrink-0 shadow-md transition-all flex items-center gap-1.5"
          >
            <span>Review Shift & Drawer Cash</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Today Sales */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {formatPaise(summary.today_sales)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{summary.today_bills_count} bills completed</div>
          </div>
        </div>

        {/* Avg Bill Amount */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Bill Size</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {formatPaise(summary.avg_bill_amount)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Per customer checkout</div>
          </div>
        </div>

        {/* Discounts Given */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discounts Today</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-rose-600">
              {formatPaise(summary.cashier_discounts + summary.admin_discounts)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Worker: {formatPaise(summary.cashier_discounts)} • Admin: {formatPaise(summary.admin_discounts)}
            </div>
          </div>
        </div>

        {/* Gross Profit (Admin only) */}
        {isAdmin && (
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Profit</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black text-coastal-800 dark:text-coastal-400">
                {formatPaise(summary.estimated_gross_profit || 0)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Estimated gross retail margin</div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Tender Split & Inventory Attention Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Methods Split */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Today's Payment Collections</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Banknote className="w-4 h-4" /> Cash
              </div>
              <div className="text-lg font-black text-emerald-900 dark:text-emerald-100 mt-1">
                {formatPaise(summary.cash_sales)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                <QrCode className="w-4 h-4" /> UPI / QR
              </div>
              <div className="text-lg font-black text-indigo-900 dark:text-indigo-100 mt-1">
                {formatPaise(summary.upi_sales)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900">
              <div className="flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                <CreditCard className="w-4 h-4" /> Card
              </div>
              <div className="text-lg font-black text-amber-900 dark:text-amber-100 mt-1">
                {formatPaise(summary.card_sales)}
              </div>
            </div>
          </div>
        </div>

        {/* Stock & Operational Status */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Store Health & System Status</h3>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => onNavigate('inventory')}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-coastal-500 transition-all"
            >
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {summary.low_stock_count} <span className="text-xs font-normal text-slate-400">items</span>
              </div>
            </div>

            <div
              onClick={() => onNavigate('backup')}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-coastal-500 transition-all"
            >
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Database className="w-4 h-4 text-coastal-600" /> Backup Status
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 capitalize">
                {summary.last_backup.status === 'good' ? 'Healthy (Today)' : `${summary.last_backup.days_ago} days ago`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
