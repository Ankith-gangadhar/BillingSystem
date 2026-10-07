import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const cashierNav = [
    { id: 'billing', label: 'Billing / POS', icon: ShoppingCart },
    { id: 'bills', label: 'My Bills', icon: Receipt },
    { id: 'shift', label: 'My Shift', icon: Clock },
  ];

  const adminNav = [
    { id: 'billing', label: 'Billing / POS', icon: ShoppingCart },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
    <aside
      className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none transition-all duration-200 ${
        isCollapsed ? 'w-14 sm:w-16' : 'w-14 sm:w-48 lg:w-52'
      }`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Toggle Collapse Bar */}
        <div className="p-1.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-end shrink-0">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-1.5 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                  isActive
                    ? 'bg-coastal-800 text-white shadow-sm shadow-coastal-800/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isActive ? 'text-saffron-400' : 'text-slate-500'}`} />
                {!isCollapsed && <span className="hidden sm:inline truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer shortcuts tip - visible only when expanded */}
        {!isCollapsed && (
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 hidden sm:block text-[10px] text-slate-500 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              <div>Search: <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">F2</kbd></div>
              <div>Custom: <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">F4</kbd></div>
              <div>Discount: <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">F8</kbd></div>
              <div>Pay: <kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">F9</kbd></div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
