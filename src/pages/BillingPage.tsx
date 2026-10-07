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
import { Clock, Plus, X } from 'lucide-react';

export const BillingPage: React.FC = () => {
  const {
    cart,
    cartSessions,
    activeSessionId,
    createCartSession,
    switchCartSession,
    closeCartSession,
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

      // F6: Hold Current Sale & Open/Switch to New Cart Tab
      if (e.key === 'F6') {
        e.preventDefault();
        holdBill();
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

      {/* Right Column: Multi-Cart Tabs & Totals Checkout */}
      <div className="w-[340px] sm:w-[370px] md:w-[390px] lg:w-[420px] xl:w-[450px] flex flex-col h-full shrink-0 gap-2 overflow-hidden">
        {/* Cart Container with Multi-Cart Tabs */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col min-h-0">
          {/* Multi-Cart Tab Strip */}
          <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-0">
              {cartSessions.map((session, index) => {
                const isActive = session.id === activeSessionId;
                const itemsCount = session.cart.reduce((acc, it) => acc + it.qty, 0) + (session.includeCarryBag ? 1 : 0);
                const cartDisplayName = `Cart ${index + 1}`;

                return (
                  <div
                    key={session.id}
                    onClick={() => switchCartSession(session.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      isActive
                        ? 'bg-coastal-800 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{cartDisplayName}</span>
                    {itemsCount > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          isActive ? 'bg-saffron-400 text-slate-950' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {itemsCount}
                      </span>
                    )}
                    {cartSessions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (session.cart.length === 0 || confirm(`Close ${cartDisplayName}?`)) {
                            closeCartSession(session.id);
                          }
                        }}
                        className={`ml-0.5 p-0.5 rounded hover:text-rose-400 text-[10px] ${
                          isActive ? 'text-coastal-200' : 'text-slate-400'
                        }`}
                        title="Close cart tab"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* + Add New Cart Tab (Up to 4 concurrent active carts) */}
              {cartSessions.length < 4 && (
                <button
                  type="button"
                  onClick={createCartSession}
                  className="flex items-center gap-1 px-2 py-1 rounded-xl bg-coastal-50 dark:bg-coastal-950/60 hover:bg-coastal-100 text-coastal-800 dark:text-coastal-300 border border-coastal-200 dark:border-coastal-800 text-xs font-bold transition-all"
                  title="Add new cart tab / Hold current (F6)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-extrabold">+ Cart (F6)</span>
                </button>
              )}
            </div>

            <span className="text-[10px] text-slate-400 font-normal shrink-0 hidden sm:inline">
              Auto-saved
            </span>
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
