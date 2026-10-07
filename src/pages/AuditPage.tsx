import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { formatDateTime } from '../utils/formatters';
import { ShieldAlert, ShieldCheck, Search, Filter, Hash } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = () => {
    setIsLoading(true);
    let url = '/audit?limit=150';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (severity !== 'all') url += `&severity=${encodeURIComponent(severity)}`;

    apiRequest<{ logs: any[] }>(url)
      .then((data) => setLogs(data.logs || []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [severity]);

  const handleVerifyIntegrity = async () => {
    try {
      const data = await apiRequest<{ isValid: boolean; checkedCount: number }>('/audit/verify-integrity');
      if (data.isValid) {
        alert(`Cryptographic Audit Chain Intact: Verified all ${data.checkedCount} records across SHA-256 hash chains. No tampering detected.`);
      } else {
        alert('ALERT: Hash chain integrity check failed! Audit logs have been tampered with.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 bg-slate-100 dark:bg-slate-950 space-y-3">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <span>Immutable Audit Trail & Activity Ledger</span>
          </h2>
          <p className="text-xs text-slate-500">Every price change, discount, void, stock adjustment and login attempt is logged with SHA-256 hash chaining</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleVerifyIntegrity}
            className="px-4 py-2.5 rounded-xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
          >
            <ShieldCheck className="w-4 h-4 text-saffron-400" />
            <span>Verify SHA-256 Chain</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Verifying and loading audit logs...</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details / Reason</th>
                  <th className="py-3 px-4 text-center">Severity</th>
                  <th className="py-3 px-4 font-mono text-right">Hash Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-slate-500 font-mono">{formatDateTime(l.timestamp)}</td>
                    <td className="py-3 px-4 font-bold">{l.user_name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{l.action}</td>
                    <td className="py-3 px-4 text-slate-500">{l.entity_type}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {l.reason || l.new_value || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          l.severity === 'warning'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : l.severity === 'notice'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {l.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400 text-right">
                      {l.hash?.slice(0, 10)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
