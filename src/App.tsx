import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PosProvider } from './context/PosContext';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { BillingPage } from './pages/BillingPage';
import { DashboardPage } from './pages/DashboardPage';
import { BillsPage } from './pages/BillsPage';
import { ShiftPage } from './pages/ShiftPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { AuditPage } from './pages/AuditPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { BackupPage } from './pages/BackupPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPinModal } from './components/common/AdminPinModal';
import { MotherHelpModal } from './components/common/MotherHelpModal';

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('billing');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900/10 dark:bg-slate-950/40 font-sans backdrop-blur-xs">
      <Header onOpenHelp={() => setIsHelpOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {activeTab === 'billing' && <BillingPage />}
          {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
          {activeTab === 'bills' && <BillsPage />}
          {activeTab === 'shift' && <ShiftPage />}
          {activeTab === 'products' && <ProductsPage />}
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'purchases' && <PurchasesPage />}
          {activeTab === 'returns' && <ReturnsPage />}
          {activeTab === 'audit' && <AuditPage />}
          {activeTab === 'import-export' && <ImportExportPage />}
          {activeTab === 'backup' && <BackupPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Common Modals */}
      <AdminPinModal />
      <MotherHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PosProvider>
        <AppContent />
      </PosProvider>
    </AuthProvider>
  );
};
