import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  Receipt,
  Clock,
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  RotateCcw,
  ShieldAlert,
  FileSpreadsheet,
  Database,
  Settings as SettingsIcon,
} from 'lucide-react';

export type ActiveTab =
  | 'billing'
  | 'bills'
  | 'shift'
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'returns'
  | 'audit'
  | 'import-export'
  | 'backup'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { isAdmin } = useAuth();

  const cashierNav = [
    { id: 'billing', label: 'Billing / POS', icon: ShoppingCart },
    { id: 'bills', label: 'My Bills', icon: Receipt },
    { id: 'shift', label: 'My Shift', icon: Clock },
  ];

  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Billing / POS', icon: ShoppingCart },
    { id: 'bills', label: 'Bills & Sales', icon: Receipt },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
    { id: 'purchases', label: 'Receive Stock', icon: Truck },
    { id: 'returns', label: 'Returns & Voids', icon: RotateCcw },
    { id: 'shift', label: 'Shifts & Cash', icon: Clock },
    { id: 'audit', label: 'Audit Trail', icon: ShieldAlert },
    { id: 'import-export', label: 'Import / Export', icon: FileSpreadsheet },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const navItems = isAdmin ? adminNav : cashierNav;

  return (
    <aside className="w-16 md:w-52 lg:w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <nav className="p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-coastal-800 text-white shadow-sm shadow-coastal-800/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={item.label}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-saffron-400' : 'text-slate-500'}`} />
              <span className="hidden md:inline truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer shortcut tip */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 hidden md:block text-[11px] text-slate-500">
        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Keyboard Shortcuts</div>
        <div className="flex justify-between"><span>Search:</span> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">F2</kbd></div>
        <div className="flex justify-between"><span>Custom:</span> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">F4</kbd></div>
        <div className="flex justify-between"><span>Discount:</span> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">F8</kbd></div>
        <div className="flex justify-between"><span>Pay:</span> <kbd className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-mono">F9</kbd></div>
      </div>
    </aside>
  );
};
