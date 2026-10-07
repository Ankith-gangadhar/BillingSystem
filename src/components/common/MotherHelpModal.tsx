import React from 'react';
import { HelpCircle, X, Search, Barcode, Plus, Tag, CheckCircle2 } from 'lucide-react';

export const MotherHelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const tips = [
    {
      icon: Search,
      title: '1. How to find & add an item',
      desc: 'Type 1 or 2 letters of the item name in the top search bar (e.g. "ko" for Kori Rotti) and press Enter or tap it in the list. You can also tap any quick square tile.',
      color: 'bg-teal-500 text-white',
    },
    {
      icon: Barcode,
      title: '2. Using the barcode scanner',
      desc: 'Simply point your scanner gun at the product packet barcode. The computer will beep and add the item to the cart instantly.',
      color: 'bg-indigo-500 text-white',
    },
    {
      icon: Plus,
      title: '3. Item not in computer list?',
      desc: 'Click the "+ Custom (F4)" button at the top right, type the item name (e.g. "Loose Jaggery") and price, then click Add.',
      color: 'bg-amber-500 text-white',
    },
    {
      icon: Tag,
      title: '4. Quantity and Discounts',
      desc: 'Use the "+" and "-" buttons on any row to change quantity. Click "Discount (F8)" if you want to set a negotiated final price (e.g. ₹85 down to ₹80).',
      color: 'bg-rose-500 text-white',
    },
    {
      icon: CheckCircle2,
      title: '5. Completing the sale',
      desc: 'Click the big "Complete Sale (F9)" button at the bottom. Choose Cash or UPI, enter money received, and tap "Finish & Print".',
      color: 'bg-emerald-500 text-white',
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in-50 duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-saffron-400" />
            <h3 className="font-bold text-lg">Easy Quick Guide (5 Simple Steps)</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-coastal-800 hover:bg-coastal-700 flex items-center justify-center text-coastal-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {tips.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div
                key={idx}
                className="flex gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
              >
                <div className={`w-10 h-10 rounded-xl ${t.color} flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{t.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm shadow-md"
          >
            Got it, Let's Bill!
          </button>
        </div>
      </div>
    </div>
  );
};
