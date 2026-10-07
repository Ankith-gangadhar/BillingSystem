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
  const { user, isAdmin, isOwnerAtCounter, toggleOwnerPresence, lockSession, logout, settings } = useAuth();
  const { heldBillsCount, setIsHeldBillsModalOpen } = usePos();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

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
    <header className="bg-coastal-900 text-white shadow-md select-none sticky top-0 z-40 w-full shrink-0">
      <div className="w-full px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
        {/* Brand & Store Name */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-saffron-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-saffron-500/20 shrink-0">
            <Store className="w-4 h-4 sm:w-5 sm:h-5 text-coastal-950" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base leading-none tracking-tight flex items-center gap-1 text-white">
              {settings?.store_name || 'Mangalore Store'}
              <span className="text-[9px] uppercase font-bold tracking-wider bg-coastal-800 text-coastal-200 px-1 py-0.2 rounded border border-coastal-700">
                POS
              </span>
            </h1>
            <p className="text-[10px] text-coastal-300 font-medium">Mathikere, Bengaluru</p>
          </div>
        </div>

        {/* Center Indicators: Owner at Counter & Held Bills */}
        <div className="flex items-center gap-2">
          {/* Owner Presence Mode Switch */}
          <button
            onClick={handleToggleOwnerPresence}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
              isOwnerAtCounter
                ? 'bg-saffron-500 text-coastal-950 border-saffron-400 shadow-sm animate-pulse-subtle'
                : 'bg-coastal-800/80 text-coastal-200 border-coastal-700 hover:bg-coastal-700'
            }`}
            title={isOwnerAtCounter ? 'Owner at Counter Active (No PIN required for overrides)' : 'Toggle Owner at Counter mode'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Owner at Counter</span>
            <span className={`w-2 h-2 rounded-full ${isOwnerAtCounter ? 'bg-coastal-950' : 'bg-slate-400'}`}></span>
          </button>

          {/* Held Bills Chip */}
          {heldBillsCount > 0 && (
            <button
              onClick={() => setIsHeldBillsModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
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
            className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
              isOnline ? 'text-coastal-300' : 'bg-amber-900/40 text-amber-200 border border-amber-700'
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3 text-coastal-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
            <span>{isOnline ? 'Local Offline-Ready' : 'Working Offline'}</span>
          </div>
        </div>

        {/* User Badge, Help & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Help Button for Mother / Worker */}
          <button
            onClick={onOpenHelp}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coastal-800 hover:bg-coastal-700 text-coastal-200 text-xs font-semibold border border-coastal-700 transition-colors"
            title="Help & Quick Guide"
          >
            <HelpCircle className="w-4 h-4 text-saffron-400" />
            <span className="hidden lg:inline">Help</span>
          </button>

          {/* Current User Badge */}
          <div className="flex items-center gap-1.5 bg-coastal-800/90 border border-coastal-700 px-2.5 py-1 rounded-lg">
            <UserIcon className="w-3.5 h-3.5 text-coastal-300" />
            <span className="text-xs font-semibold text-white max-w-[100px] sm:max-w-[140px] truncate">
              {user?.name}
            </span>
            <span className="text-[10px] uppercase font-bold bg-coastal-700 text-coastal-200 px-1 py-0.2 rounded">
              {user?.role}
            </span>
          </div>

          {/* Lock Session */}
          <button
            onClick={lockSession}
            className="p-1.5 rounded-lg bg-coastal-800 hover:bg-coastal-700 text-coastal-200 border border-coastal-700 transition-colors"
            title="Lock POS (Quick Lock)"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Switch User / Logout */}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg bg-coastal-800 hover:bg-rose-900/80 text-coastal-200 hover:text-rose-200 border border-coastal-700 transition-colors"
            title="Switch User / Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
