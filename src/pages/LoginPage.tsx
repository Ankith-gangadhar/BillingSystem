import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { Store, User as UserIcon, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Brand Bar */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-saffron-500 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-saffron-500/20">
            <Store className="w-6 h-6 text-coastal-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
              Mangalore Store
              <span className="text-[10px] uppercase font-bold tracking-wider bg-coastal-800 text-coastal-200 px-2 py-0.5 rounded-full">
                POS
              </span>
            </h1>
            <p className="text-xs text-coastal-300">Mathikere, Bengaluru • Offline Desktop System</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-coastal-400 font-semibold bg-coastal-950/60 px-3 py-1.5 rounded-xl border border-coastal-800">
          <ShieldCheck className="w-4 h-4 text-saffron-400" />
          <span>Local SQLite WAL • Offline-First</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-white">Select User & Enter PIN</h2>
          <p className="text-xs text-slate-400 mt-1">
            Fast counter access for Owner, Worker, and Cashier
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* User Selection Tiles */}
        <div className="grid grid-cols-3 gap-2">
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
                    ? 'bg-coastal-700 text-white border-coastal-400 shadow-md ring-2 ring-coastal-400/30'
                    : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-600/80 flex items-center justify-center font-bold text-xs">
                  {u.name.slice(0, 1)}
                </div>
                <div className="font-bold text-xs truncate max-w-full leading-tight">
                  {u.name.split(' ')[0]}
                </div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  {u.role}
                </span>
              </button>
            );
          })}
        </div>

        {/* PIN Display & Keypad Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              readOnly
              value={pin}
              placeholder="Enter PIN (e.g. 1234 or 0000)"
              className="w-full h-14 text-center text-2xl tracking-widest font-black rounded-2xl bg-slate-900 border-2 border-slate-700 focus:border-coastal-500 text-white outline-none"
            />
            <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-4.5" />
          </div>

          {/* Numerical Touch Keypad (Great for touchscreens and mother) */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === 'C') handleKeypadPress('clear');
                  else if (k === '⌫') handleKeypadPress('back');
                  else handleKeypadPress(k);
                }}
                className="h-12 rounded-2xl bg-slate-700/80 hover:bg-slate-600 active:scale-95 text-lg font-bold text-white shadow-xs transition-all flex items-center justify-center"
              >
                {k}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !pin}
            className="w-full h-14 rounded-2xl bg-coastal-600 hover:bg-coastal-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-coastal-600/30 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Open POS Terminal</span>
                <ArrowRight className="w-5 h-5 text-saffron-400" />
              </>
            )}
          </button>

          {/* Demo Credentials Helper Pill */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700 text-center text-[11px] text-slate-400">
            <span>Demo PINs: </span>
            <strong className="text-coastal-300">Admin: 1234</strong> •{' '}
            <strong className="text-coastal-300">Worker: 0000</strong> •{' '}
            <strong className="text-coastal-300">Mom: 1111</strong>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500">
        © Mangalore Store POS • Fast Offline Point of Sale
      </div>
    </div>
  );
};
