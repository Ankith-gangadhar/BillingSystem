import React, { useState, useEffect } from 'react';
import { usePos } from '../../context/PosContext';
import { apiRequest } from '../../utils/api';
import { formatPaise, formatDateTime } from '../../utils/formatters';
import { PauseCircle, PlayCircle, X, ShoppingBag } from 'lucide-react';

export const HeldBillsModal: React.FC = () => {
  const { isHeldBillsModalOpen, setIsHeldBillsModalOpen, resumeBill, refreshHeldBills } = usePos();
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isHeldBillsModalOpen) {
      setIsLoading(true);
      apiRequest<{ bills: any[] }>('/bills/held')
        .then((data) => setHeldBills(data.bills || []))
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isHeldBillsModalOpen]);

  if (!isHeldBillsModalOpen) return null;

  const handleResume = (bill: any) => {
    resumeBill(bill);
    refreshHeldBills();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in-50 duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-saffron-400" />
            <h3 className="font-bold text-base">Parked / Held Bills ({heldBills.length})</h3>
          </div>
          <button
            onClick={() => setIsHeldBillsModalOpen(false)}
            className="w-8 h-8 rounded-full bg-coastal-800 hover:bg-coastal-700 flex items-center justify-center text-coastal-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {isLoading ? (
            <div className="p-6 text-center text-slate-400">Loading held bills...</div>
          ) : heldBills.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-sm">No bills are currently on hold.</p>
            </div>
          ) : (
            heldBills.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-coastal-500 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {b.bill_number}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDateTime(b.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {b.items?.length || 0} items • Parked by {b.cashier_name}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-base text-coastal-800 dark:text-coastal-300">
                    {formatPaise(b.grand_total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleResume(b)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <PlayCircle className="w-4 h-4 text-saffron-400" />
                    <span>Resume</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
