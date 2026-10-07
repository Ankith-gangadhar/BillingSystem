import React, { useState, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const ImportExportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    window.location.href = '/api/import-export/template';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsValidating(true);
    setPreview(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const data = await apiRequest<{ preview: any }>('/import-export/preview', {
        method: 'POST',
        body: formData,
      });
      setPreview(data.preview);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!preview || !preview.rows) return;
    setIsImporting(true);

    try {
      const data = await apiRequest<{ importedCount: number; updatedCount: number }>('/import-export/execute', {
        method: 'POST',
        body: JSON.stringify({ validatedRows: preview.rows }),
      });
      alert(`Import Successful! Added ${data.importedCount} new products, updated ${data.updatedCount} existing items. Automatic safety backup created.`);
      setFile(null);
      setPreview(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = (type: string, format: string = 'xlsx') => {
    window.location.href = `/api/import-export/export/${type}?format=${format}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-100 dark:bg-slate-950">
      {/* 1. Import Wizard Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-coastal-700" />
              <span>Bulk Excel / CSV Product Import Wizard</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Easily onboard 1,500 – 5,000+ products in seconds with automatic duplicate detection and pre-import backup safety
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4 text-coastal-600" />
            <span>Download Sample Excel Template</span>
          </button>
        </div>

        {/* Upload Zone */}
        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-2xl border-2 border-dashed border-coastal-300 dark:border-coastal-800 bg-coastal-50/50 dark:bg-coastal-950/20 text-center cursor-pointer hover:bg-coastal-50 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-2xl bg-coastal-800 text-white flex items-center justify-center mb-3 shadow-md">
              <Upload className="w-6 h-6 text-saffron-400" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
              {isValidating ? 'Validating file rows...' : 'Click to Upload Excel (.xlsx) or CSV File'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">Supports standard columns: Product Name, SKU, Barcode, Category, Prices, Stock</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Rows</span>
                <div className="text-xl font-black text-slate-900 dark:text-white">{preview.totalRows}</div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold uppercase">New Products</span>
                <div className="text-xl font-black text-emerald-600">{preview.newProductsCount}</div>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200">
                <span className="text-[10px] text-indigo-700 font-bold uppercase">Updates</span>
                <div className="text-xl font-black text-indigo-600">{preview.updateProductsCount}</div>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200">
                <span className="text-[10px] text-rose-700 font-bold uppercase">Errors</span>
                <div className="text-xl font-black text-rose-600">{preview.errorRowsCount}</div>
              </div>
            </div>

            {/* Preview Sample Table */}
            <div className="max-h-56 overflow-y-auto border rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b font-bold text-slate-500">
                  <tr>
                    <th className="p-2.5">Row</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Product Name</th>
                    <th className="p-2.5">Selling Price</th>
                    <th className="p-2.5">Opening Stock</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {preview.rows.slice(0, 50).map((r: any) => (
                    <tr key={r.rowNumber} className={r.action === 'error' ? 'bg-rose-50/50' : ''}>
                      <td className="p-2.5 font-mono">{r.rowNumber}</td>
                      <td className="p-2.5 font-bold uppercase text-[10px]">{r.action}</td>
                      <td className="p-2.5 font-semibold">{r.data.name}</td>
                      <td className="p-2.5">₹{(r.data.selling_price / 100).toFixed(2)}</td>
                      <td className="p-2.5">{r.data.opening_stock} {r.data.unit}</td>
                      <td className="p-2.5">
                        {r.errors.length > 0 ? (
                          <span className="text-rose-600 font-bold">{r.errors.join(', ')}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs"
              >
                Cancel & Upload Another
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isImporting || preview.validRows === 0}
                className="flex-1 py-3 rounded-2xl bg-coastal-800 hover:bg-coastal-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5 text-saffron-400" />
                <span>{isImporting ? 'Importing In Progress...' : `Confirm & Import ${preview.validRows} Products`}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Data Exports Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Export Store Data (Excel / CSV)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'products', label: 'Export Products' },
            { id: 'bills', label: 'Export Sales Bills' },
            { id: 'stock_movements', label: 'Export Stock Ledger' },
            { id: 'audit_log', label: 'Export Audit Logs' },
          ].map((exp) => (
            <div key={exp.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border flex flex-col justify-between gap-2">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{exp.label}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleExport(exp.id, 'xlsx')}
                  className="flex-1 py-1.5 rounded-lg bg-coastal-800 text-white font-bold text-[11px] hover:bg-coastal-700"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport(exp.id, 'csv')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px]"
                >
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
