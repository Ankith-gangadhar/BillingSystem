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
    <div className="h-screen w-screen overflow-hidden bg-slate-900 text-white flex flex-col items-center justify-center p-3 sm:p-4 select-none">
      {/* Main Centered Login Box */}
      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700 shadow-2xl p-5 sm:p-6 space-y-4 my-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-saffron-500 text-slate-950 font-bold flex items-center justify-center shadow-md shadow-saffron-500/20 shrink-0">
              <Store className="w-5 h-5 text-coastal-950" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5 leading-tight">
                Mangalore Store
                <span className="text-[9px] uppercase font-bold tracking-wider bg-coastal-800 text-coastal-200 px-1.5 py-0.2 rounded">
                  POS
                </span>
              </h1>
              <p className="text-[10px] text-coastal-300">Mathikere, Bengaluru • Offline Desktop System</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-coastal-400 font-semibold bg-coastal-950/60 px-2 py-1 rounded-lg border border-coastal-800">
            <ShieldCheck className="w-3.5 h-3.5 text-saffron-400" />
            <span>SQLite WAL</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold text-center">
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
                    ? 'bg-coastal-700 text-white border-coastal-400 shadow-sm ring-2 ring-coastal-400/30'
                    : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-600/80 flex items-center justify-center font-bold text-sm">
                  {u.name.slice(0, 1)}
                </div>
                <div className="font-bold text-sm truncate max-w-full leading-tight">
                  {u.name}
                </div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  {u.role === 'admin' ? 'Administrator' : 'Staff / Cashier'}
                </span>
              </button>
            );
          })}
        </div>

        {/* PIN Display & Keypad Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              ref={pinInputRef}
              type="password"
              readOnly
              value={pin}
              placeholder="Enter PIN (Keyboard or Numpad)"
              className="w-full h-12 text-center text-2xl tracking-widest font-black rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-coastal-500 text-white outline-none"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
          </div>

          {/* Numerical Touch Keypad */}
          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') handleKeypadPress('clear');
                  else if (k === '⌫') handleKeypadPress('back');
                  else handleKeypadPress(k);
                }}
                className="h-10 sm:h-11 rounded-xl bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-base font-bold text-white shadow-xs transition-all flex items-center justify-center"
              >
                {k}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !pin}
            className="w-full h-11 sm:h-12 rounded-xl bg-coastal-600 hover:bg-coastal-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-coastal-600/30 active:scale-[0.99] transition-all disabled:opacity-50"
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
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/70 text-center text-[10px] text-slate-400">
            <span>Demo PINs: </span>
            <strong className="text-coastal-300">Admin: 1234</strong> •{' '}
            <strong className="text-coastal-300">Staff: 0000</strong>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-500 py-1">
        © Mangalore Store POS • Fast Offline Point of Sale
      </div>
    </div>
  );
};
