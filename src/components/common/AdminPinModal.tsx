import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../utils/api';
import { playPosSound } from '../../utils/formatters';
import { ShieldAlert, X, Check, Lock } from 'lucide-react';

export const AdminPinModal: React.FC = () => {
  const { adminApprovalModal, closeAdminApprovalModal } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adminApprovalModal.isOpen) {
      setPin('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [adminApprovalModal.isOpen]);

  if (!adminApprovalModal.isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const data = await apiRequest<{ success: boolean; adminUser: any }>('/auth/verify-admin-pin', {
        method: 'POST',
        body: JSON.stringify({
          adminPin: pin,
          actionDescription: adminApprovalModal.actionDescription,
        }),
      });

      if (data.success && data.adminUser) {
        playPosSound('success');
        closeAdminApprovalModal(data.adminUser.id);
      } else {
        throw new Error('Invalid Admin PIN');
      }
    } catch (err: any) {
      playPosSound('error');
      setError(err.message || 'Incorrect Admin PIN. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in-50 duration-150 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-white" />
            <h3 className="font-bold text-base">Admin Approval Required</h3>
          </div>
          <button
            onClick={() => closeAdminApprovalModal(null)}
            className="w-8 h-8 rounded-full bg-amber-700 hover:bg-amber-800 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 font-medium">
            <strong>Restricted Action:</strong>
            <p className="mt-0.5">{adminApprovalModal.actionDescription}</p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Admin PIN:
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                required
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full h-12 text-center text-2xl tracking-widest font-black rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-amber-500 outline-none"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-4" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => closeAdminApprovalModal(null)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !pin}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm shadow-md shadow-amber-600/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Authorize Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
