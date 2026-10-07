import React, { useEffect } from 'react';
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
  const {
    cart,
    currentShift,
    holdBill,
    setIsCustomItemModalOpen,
    setIsDiscountModalOpen,
    setIsPaymentModalOpen,
    setIsHeldBillsModalOpen,
    setIsReceiptModalOpen,
  } = usePos();

  // Global Function Key Listener for Instant POS Shortcuts (F2, F4, F6, F7, F8, F9, Esc)
  useEffect(() => {
    const handlePosShortcuts = (e: KeyboardEvent) => {
      // F2: Search Bar Focus
      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search product"]');
        searchInput?.focus();
        searchInput?.select();
        return;
      }

      // F4: Custom Unlisted Item Modal
      if (e.key === 'F4') {
        e.preventDefault();
        setIsCustomItemModalOpen(true);
        return;
      }

      // F6: Hold Current Sale
      if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length > 0) {
          holdBill();
        }
        return;
      }

      // F7: View Held Bills
      if (e.key === 'F7') {
        e.preventDefault();
        setIsHeldBillsModalOpen(true);
        return;
      }

      // F8: Discount / Negotiate Price Modal
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsDiscountModalOpen(true);
        }
        return;
      }

      // F9: Pay & Complete Sale Modal
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setIsPaymentModalOpen(true);
        }
        return;
      }

      // Escape: Close all active modals
      if (e.key === 'Escape') {
        setIsCustomItemModalOpen(false);
        setIsDiscountModalOpen(false);
        setIsPaymentModalOpen(false);
        setIsHeldBillsModalOpen(false);
        setIsReceiptModalOpen(false);
      }
    };

    window.addEventListener('keydown', handlePosShortcuts);
    return () => window.removeEventListener('keydown', handlePosShortcuts);
  }, [
    cart.length,
    holdBill,
    setIsCustomItemModalOpen,
    setIsDiscountModalOpen,
    setIsPaymentModalOpen,
    setIsHeldBillsModalOpen,
    setIsReceiptModalOpen,
  ]);

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

      {/* Right Column: Cart & Totals Checkout */}
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
