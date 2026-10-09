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
      className={`glass-panel border-r border-white/20 dark:border-white/5 flex flex-col justify-between shrink-0 select-none transition-all duration-200 ${
        isCollapsed ? 'w-14 sm:w-16' : 'w-14 sm:w-48 lg:w-52'
      }`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Toggle Collapse Bar */}
        <div className="p-2 border-b border-white/10 flex items-center justify-end shrink-0">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/10 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1.5 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
                  isActive
                    ? 'glass-btn-primary shadow-lg ring-1 ring-white/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isActive ? 'text-saffron-300' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="hidden sm:inline truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer shortcuts tip - visible only when expanded */}
        {!isCollapsed && (
          <div className="p-3 border-t border-white/10 hidden sm:block text-[10px] text-slate-500 shrink-0 bg-white/20 dark:bg-black/20">
            <div className="font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div>Search: <kbd className="bg-white/60 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono border border-white/20">F2</kbd></div>
              <div>Custom: <kbd className="bg-white/60 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono border border-white/20">F4</kbd></div>
              <div>Discount: <kbd className="bg-white/60 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono border border-white/20">F8</kbd></div>
              <div>Pay: <kbd className="bg-white/60 dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono border border-white/20">F9</kbd></div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
