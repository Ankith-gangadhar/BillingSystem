import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { Store, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    apiRequest<{ users: any[] }>('/auth/users')
      .then((data) => {
        setUsers(data.users || []);
        if (data.users && data.users.length > 0) {
          setSelectedUserId(data.users[0].id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  // Physical keyboard listener for hardware numpad / numbers
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 8) {
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        setPin('');
      } else if (e.key === 'Enter') {
        if (selectedUserId && pin.length > 0) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [pin, selectedUserId]);

  const handleKeypadPress = (val: string) => {
    if (val === 'clear') {
      setPin('');
    } else if (val === 'back') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (pin.length < 8) {
        setPin((prev) => prev + val);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUserId || !pin) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await login(selectedUserId, pin);
    } catch (err: any) {
      setErrorMsg(err.message);
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden text-slate-100 flex flex-col items-center justify-center p-3 sm:p-4 select-none relative">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-coastal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-saffron-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Centered Frosted Glass Login Box */}
      <div className="max-w-md w-full glass-modal rounded-3xl border border-white/15 shadow-2xl p-5 sm:p-6 space-y-4 my-auto relative z-10 text-slate-100">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-saffron-500 to-saffron-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-saffron-500/20 shrink-0">
              <Store className="w-5 h-5 text-coastal-950" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5 leading-tight">
                Mangalore Store
                <span className="text-[9px] uppercase font-black tracking-wider bg-coastal-800 text-coastal-200 px-1.5 py-0.5 rounded-full border border-coastal-600/40">
                  POS
                </span>
              </h1>
              <p className="text-[10px] text-coastal-200/80 font-medium">Mathikere, Bengaluru • Offline Desktop System</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-coastal-300 font-semibold bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-saffron-400" />
            <span>SQLite WAL</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold text-center shadow-inner">
            {errorMsg}
          </div>
        )}

        {/* User Selection Tiles (Admin & Staff) */}
        <div className="grid grid-cols-2 gap-3">
          {users.map((u) => {
            const isSelected = u.id === selectedUserId;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setSelectedUserId(u.id);
                  setPin('');
                  setErrorMsg(null);
                }}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  isSelected
                    ? 'glass-btn-primary shadow-lg ring-2 ring-coastal-400/40'
                    : 'glass-btn text-slate-300 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-extrabold text-sm">
                  {u.name.slice(0, 1)}
                </div>
                <div className="font-bold text-sm truncate max-w-full leading-tight">
                  {u.name}
                </div>
                <span className="text-[10px] uppercase font-semibold text-coastal-200/70">
                  {u.role === 'admin' ? 'Administrator' : 'Staff / Cashier'}
                </span>
              </button>
            );
          })}
        </div>

        {/* PIN Display & Keypad Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* PIN Input Display Card (Fixed placeholder and overlapping issue) */}
          <div className="glass-inset rounded-2xl p-3 flex items-center justify-between border border-white/10 h-14 relative">
            <div className="flex items-center gap-2 pl-1 text-slate-400">
              <Lock className="w-4 h-4 text-coastal-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">PIN:</span>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {pin.length === 0 ? (
                <span className="text-xs sm:text-sm font-medium text-slate-400/80">
                  Enter PIN to Unlock
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full transition-all ${
                        i < pin.length
                          ? 'bg-gradient-to-tr from-saffron-400 to-saffron-300 shadow-md shadow-saffron-500/50 scale-110'
                          : 'bg-white/15 border border-white/20'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {pin.length > 0 && (
              <button
                type="button"
                onClick={() => setPin('')}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20"
              >
                Clear
              </button>
            )}
          </div>

          {/* Numerical Touch Keypad */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') handleKeypadPress('clear');
                  else if (k === '⌫') handleKeypadPress('back');
                  else handleKeypadPress(k);
                }}
                className={`h-11 sm:h-12 rounded-2xl glass-btn font-extrabold text-base transition-all flex items-center justify-center ${
                  k === 'C'
                    ? 'text-rose-400 hover:bg-rose-500/20 border-rose-500/20'
                    : k === '⌫'
                    ? 'text-amber-400 hover:bg-amber-500/20 border-amber-500/20'
                    : 'text-slate-800 dark:text-white'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !pin}
            className="w-full h-12 rounded-2xl glass-btn-primary font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Open POS Terminal</span>
                <ArrowRight className="w-4 h-4 text-saffron-400" />
              </>
            )}
          </button>

          {/* Demo Credentials Helper Pill */}
          <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-center text-[10px] text-slate-400 flex items-center justify-center gap-3">
            <span>Demo PINs:</span>
            <span><strong className="text-coastal-300">Admin: 1234</strong></span>
            <span>•</span>
            <span><strong className="text-coastal-300">Staff: 0000</strong></span>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-400 py-1 relative z-10">
        © Mangalore Store POS • Fast Offline Point of Sale
      </div>
    </div>
  );
};
