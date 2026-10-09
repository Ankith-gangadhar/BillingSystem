import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { Settings as SettingsIcon, Save, Store, Receipt, Percent, ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, refreshSettings, isAdmin } = useAuth();

  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [billPrefix, setBillPrefix] = useState('MS');
  const [maxCashierDiscountPct, setMaxCashierDiscountPct] = useState('5');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);
  const [receiptWidth, setReceiptWidth] = useState<'58' | '80' | 'A4'>('80');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name);
      setAddress(settings.address);
      setPhone(settings.phone);
      setGstin(settings.gstin);
      setReceiptFooter(settings.receipt_footer);
      setBillPrefix(settings.bill_prefix);
      setMaxCashierDiscountPct(settings.max_cashier_discount_percent.toString());
      setAllowNegativeStock(!!settings.allow_negative_stock);
      setGstEnabled(!!settings.gst_enabled);
      setRoundOffEnabled(!!settings.round_off_enabled);
      setReceiptWidth(settings.receipt_width || '80');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          store_name: storeName,
          address,
          phone,
          gstin,
          receipt_footer: receiptFooter,
          bill_prefix: billPrefix,
          max_cashier_discount_percent: parseFloat(maxCashierDiscountPct) || 5,
          allow_negative_stock: allowNegativeStock,
          gst_enabled: gstEnabled,
          round_off_enabled: roundOffEnabled,
          receipt_width: receiptWidth,
        }),
      });
      await refreshSettings();
      alert('Settings saved successfully.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Store & System Configuration</h2>
            <p className="text-xs text-slate-500">Configure receipt headers, discount limits, and billing rules</p>
          </div>
          {isAdmin && (
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-coastal-800/20"
            >
              <Save className="w-4 h-4 text-saffron-400" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          )}
        </div>

        {/* Store Profile */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Store className="w-4 h-4 text-coastal-600" />
            <span>Store Profile & Receipt Header</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Store Name</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Store Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full h-10 px-3 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Receipt Footer Message</label>
            <input
              type="text"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Financial & Cashier Policy */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Percent className="w-4 h-4 text-coastal-600" />
            <span>Cashier Discount Policy & Rules</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Max Cashier Discount (%)
              </label>
              <input
                type="number"
                step="any"
                value={maxCashierDiscountPct}
                onChange={(e) => setMaxCashierDiscountPct(e.target.value)}
                className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700"
              />
              <span className="text-[10px] text-slate-400">Above this requires inline Admin PIN</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bill Prefix
              </label>
              <input
                type="text"
                value={billPrefix}
                onChange={(e) => setBillPrefix(e.target.value)}
                className="w-full h-10 px-3 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={roundOffEnabled}
                onChange={(e) => setRoundOffEnabled(e.target.checked)}
                className="rounded text-coastal-800"
              />
              <span>Round off total bill to nearest ₹1.00</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.checked)}
                className="rounded text-coastal-800"
              />
              <span>Allow selling when product is out of stock (Negative Stock)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="rounded text-coastal-800"
              />
              <span>Enable GST Tax Breakdown on Receipts</span>
            </label>
          </div>
        </div>

        {/* App Version & GitHub Updates Card */}
        <div className="glass-panel p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-coastal-500/15 flex items-center justify-center text-coastal-700 dark:text-coastal-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  App Version & Updates
                </h3>
                <p className="text-xs text-slate-500">
                  Current Version: <strong>v{currentVersion}</strong> • GitHub Release Channel
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isChecking}
              onClick={() => checkForUpdates(true)}
              className="px-4 py-2 rounded-xl glass-btn text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-coastal-600' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check for Updates'}</span>
            </button>
          </div>

          {releaseInfo && (
            <div className={`p-4 rounded-2xl border transition-all ${
              releaseInfo.hasUpdate
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">
                      {releaseInfo.hasUpdate
                        ? `🚀 Update Available: ${releaseInfo.tagName}`
                        : `✅ You are on the latest version (${releaseInfo.tagName})`}
                    </span>
                  </div>
                  <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
                    {releaseInfo.hasUpdate
                      ? 'A newer version has been published to GitHub Releases. Download the installer to update.'
                      : 'Your desktop terminal is up to date with the latest release on GitHub.'}
                  </p>
                </div>

                <a
                  href={releaseInfo.downloadUrl || releaseInfo.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl glass-btn-primary text-xs font-black flex items-center gap-1.5 shadow-md shrink-0 ml-3"
                >
                  <Download className="w-3.5 h-3.5 text-saffron-300" />
                  <span>{releaseInfo.hasUpdate ? 'Download Setup.exe' : 'View on GitHub'}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
