import React from 'react';
import { ProductSearch } from '../components/billing/ProductSearch';
import { QuickButtons } from '../components/billing/QuickButtons';
import { CartTable } from '../components/billing/CartTable';
import { TotalsPanel } from '../components/billing/TotalsPanel';
import { PaymentModal } from '../components/billing/PaymentModal';
import { CustomItemModal } from '../components/billing/CustomItemModal';
import { DiscountModal } from '../components/billing/DiscountModal';
import { HeldBillsModal } from '../components/billing/HeldBillsModal';
import { ReceiptModal } from '../components/billing/ReceiptModal';
import { usePos } from '../context/PosContext';
import { Clock } from 'lucide-react';

export const BillingPage: React.FC = () => {
  const { currentShift } = usePos();

  return (
    <div className="flex-1 flex flex-row h-full overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 sm:p-2.5 gap-2 sm:gap-2.5">
      {/* Left Column: Search & Quick Catalog */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 h-full overflow-hidden">
        {/* Search Bar */}
        <div className="shrink-0">
          <ProductSearch />
        </div>

        {/* Quick Buttons / Catalog */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
            <span>Quick Touch Catalog</span>
            {currentShift && (
              <span className="text-coastal-700 dark:text-coastal-400 flex items-center gap-1 font-semibold text-[11px]">
                <Clock className="w-3.5 h-3.5" /> Shift Active
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <QuickButtons />
          </div>
        </div>
      </div>

      {/* Right Column: Cart & Totals Checkout (Maintains persistent side-by-side on square & wide screens) */}
      <div className="w-[340px] sm:w-[370px] md:w-[390px] lg:w-[420px] xl:w-[450px] flex flex-col h-full shrink-0 gap-2 overflow-hidden">
        {/* Cart Container */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
            <span>Current Sale Cart</span>
            <span className="text-[10px] text-slate-400 font-normal">Auto-saves line items</span>
          </div>
          <CartTable />
        </div>

        {/* Totals & Checkout Panel */}
        <TotalsPanel />
      </div>

      {/* Billing Context Modals */}
      <PaymentModal />
      <CustomItemModal />
      <DiscountModal />
      <HeldBillsModal />
      <ReceiptModal />
    </div>
  );
};
