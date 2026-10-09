import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePos } from '../../context/PosContext';
import {
  Store,
  User as UserIcon,
  ShieldCheck,
  Lock,
  LogOut,
  Wifi,
  WifiOff,
  Sparkles,
  HelpCircle,
  Database,
} from 'lucide-react';
import { formatPaise } from '../../utils/formatters';

export const Header: React.FC<{ onOpenHelp: () => void }> = ({ onOpenHelp }) => {
  const { user, isAdmin, isOwnerAtCounter, toggleOwnerPresence, updateProfileName, lockSession, logout, settings } = useAuth();
  const { heldBillsCount, setIsHeldBillsModalOpen } = usePos();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('');

  // Auto prompt if Staff user name is default "Staff"
  React.useEffect(() => {
    if (user && user.role === 'cashier' && (user.name === 'Staff' || user.name === 'Raju (Store Cashier)' || user.name === 'Mother (Cashier Mode)')) {
      setTempName('');
      setIsEditNameModalOpen(true);
    }
  }, [user]);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempName.trim()) return;
    try {
      await updateProfileName(tempName.trim());
      setIsEditNameModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleOwnerPresence = async () => {
    if (isOwnerAtCounter) {
      await toggleOwnerPresence(false);
    } else {
      if (isAdmin) {
        await toggleOwnerPresence(true);
      } else {
        const pin = prompt('Enter Admin PIN to enable Owner-at-Counter mode:');
        if (pin) {
          try {
            await toggleOwnerPresence(true, pin);
          } catch (err: any) {
            alert(err.message);
          }
        }
      }
    }
  };

  return (
    <>
      <header className="backdrop-blur-xl bg-coastal-950/85 text-white border-b border-white/10 shadow-lg select-none sticky top-0 z-40 w-full shrink-0">
        <div className="w-full px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          {/* Brand & Store Name */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-saffron-500 to-saffron-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-saffron-500/25 shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-coastal-950" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base leading-none tracking-tight flex items-center gap-1.5 text-white">
                {settings?.store_name || 'Mangalore Store'}
                <span className="text-[9px] uppercase font-black tracking-wider bg-coastal-800/80 text-coastal-200 px-1.5 py-0.5 rounded-md border border-white/10">
                  POS
                </span>
              </h1>
              <p className="text-[10px] text-coastal-300/80 font-medium">Mathikere, Bengaluru</p>
            </div>
          </div>

          {/* Center Indicators: Owner at Counter & Held Bills */}
          <div className="flex items-center gap-2">
            {/* Owner Presence Mode Switch */}
            <button
              onClick={handleToggleOwnerPresence}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                isOwnerAtCounter
                  ? 'bg-saffron-500 text-coastal-950 border-saffron-300 shadow-md shadow-saffron-500/30 animate-pulse-subtle'
                  : 'bg-white/5 text-coastal-200 border-white/10 hover:bg-white/10'
              }`}
              title={isOwnerAtCounter ? 'Owner at Counter Active (No PIN required for overrides)' : 'Toggle Owner at Counter mode'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">Owner at Counter</span>
              <span className={`w-2 h-2 rounded-full ${isOwnerAtCounter ? 'bg-coastal-950' : 'bg-slate-400'}`}></span>
            </button>

            {/* Held Bills Chip */}
            {heldBillsCount > 0 && (
              <button
                onClick={() => setIsHeldBillsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/25"
                title="View held bills"
              >
                <span>Held Bills:</span>
                <span className="bg-slate-950 text-white rounded-full px-1.5 py-0.2 text-[11px]">
                  {heldBillsCount}
                </span>
              </button>
            )}

            {/* Offline / Online Status */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isOnline ? 'text-coastal-300 bg-white/5 border-white/5' : 'bg-amber-900/40 text-amber-200 border-amber-700'
              }`}
            >
              {isOnline ? <Wifi className="w-3 h-3 text-coastal-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
              <span>{isOnline ? 'Local Offline-Ready' : 'Working Offline'}</span>
            </div>
          </div>

          {/* User Badge, Help & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Help Button */}
            <button
              onClick={onOpenHelp}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-coastal-200 text-xs font-bold border border-white/10 transition-colors"
              title="Help & Quick Guide"
            >
              <HelpCircle className="w-4 h-4 text-saffron-400" />
              <span className="hidden lg:inline">Help</span>
            </button>

            {/* Current User Badge (Click to rename for Staff) */}
            <button
              type="button"
              onClick={() => {
                setTempName(user?.name || '');
                setIsEditNameModalOpen(true);
              }}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl text-left transition-all"
              title="Click to edit cashier / staff name"
            >
              <UserIcon className="w-3.5 h-3.5 text-coastal-300" />
              <span className="text-xs font-bold text-white max-w-[100px] sm:max-w-[140px] truncate">
                {user?.name}
              </span>
              <span className="text-[10px] uppercase font-extrabold bg-coastal-700/80 text-coastal-100 px-1.5 py-0.5 rounded-md border border-white/10">
                {user?.role}
              </span>
            </button>

            {/* Lock Session */}
            <button
              onClick={lockSession}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-coastal-200 border border-white/10 transition-colors"
              title="Lock POS (Quick Lock)"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Switch User / Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-coastal-200 hover:text-rose-200 border border-white/10 transition-colors"
              title="Switch User / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Staff Name Setup / Edit Modal */}
      {isEditNameModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in-50 duration-150 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 bg-coastal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-saffron-400" />
                <h3 className="font-bold text-base">Enter Cashier Name</h3>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="p-4 space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please enter your name to appear on printed bills and daily shift logs:
              </p>

              <div>
                <input
                  type="text"
                  placeholder="e.g. Raju, Suresh, Pooja"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full h-11 px-3 text-sm font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-coastal-600 outline-none text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-1">
                {user?.name !== 'Staff' && (
                  <button
                    type="button"
                    onClick={() => setIsEditNameModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!tempName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
