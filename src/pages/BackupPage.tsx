import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';
import { Database, ShieldCheck, Download, RotateCcw, AlertTriangle, HardDrive } from 'lucide-react';

export const BackupPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const fetchBackups = () => {
    setIsLoading(true);
    apiRequest<{ backups: any[] }>('/backups')
      .then((data) => setBackups(data.backups || []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackupNow = async () => {
    setIsBackingUp(true);
    try {
      await apiRequest('/backups/create', { method: 'POST' });
      alert('Backup successfully created and checksum verified.');
      fetchBackups();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (backup: any) => {
    const pin = prompt(`To restore database from backup (${formatDateTime(backup.created_at)}), enter your Admin PIN:`);
    if (!pin) return;

    try {
      const data = await apiRequest<{ success: boolean; message: string }>('/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ backupId: backup.id, adminPin: pin }),
      });
      alert(data.message);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-100 dark:bg-slate-950">
      {/* Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-coastal-50 dark:bg-coastal-950 text-coastal-700 dark:text-coastal-400 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Database Backup & Recovery</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated rolling daily backups, online live snapshotting, and checksum integrity verification
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateBackupNow}
          disabled={isBackingUp}
          className="px-5 py-3 rounded-2xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-coastal-800/20 disabled:opacity-50"
        >
          <Database className="w-4 h-4 text-saffron-400" />
          <span>{isBackingUp ? 'Snapshotting Database...' : 'Backup Database Now'}</span>
        </button>
      </div>

      {/* Backups List */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Available Backup Snapshots ({backups.length})</h3>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No backups taken yet. Click "Backup Database Now" above.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl overflow-hidden">
            {backups.map((b) => (
              <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {formatDateTime(b.created_at)}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {b.type}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700">
                      {b.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    {(b.size / 1024).toFixed(1)} KB • Checksum: {b.checksum?.slice(0, 16)}...
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(b)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 border border-amber-200 text-xs font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Snapshot</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
