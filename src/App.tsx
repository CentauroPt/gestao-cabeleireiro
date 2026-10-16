import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CalendarView } from './components/calendar/CalendarView';
import { ClientList } from './components/clients/ClientList';
import { StaffList } from './components/staff/StaffList';
import { ServiceList } from './components/services/ServiceList';
import { AdminReportsView } from './components/reports/AdminReportsView';
import { LandingPage } from './components/auth/LandingPage';
import { DeveloperPortalView } from './components/developer/DeveloperPortalView';
import { MyPaymentsView } from './components/subscription/MyPaymentsView';
import { SubscriptionLockModal } from './components/subscription/SubscriptionLockModal';
import { WhatsAppFloatingButton } from './components/subscription/WhatsAppFloatingButton';
import type { Client } from './types';

const MainContent: React.FC = () => {
  const { appMode, activeTab, setActiveTab, currentUser, currentSalon } = useApp();
  const [clientToBook, setClientToBook] = useState<Client | null>(null);

  const salonPrimary = currentSalon?.primaryColor || '#8B5CF6';

  React.useEffect(() => {
    if (appMode === 'salon' && currentSalon?.primaryColor) {
      const color = currentSalon.primaryColor;
      document.documentElement.style.setProperty('--salon-primary', color);
      document.documentElement.style.setProperty('--salon-primary-shadow', `${color}40`);
      document.documentElement.style.setProperty('--salon-primary-light', `${color}18`);
      document.documentElement.style.setProperty('--salon-primary-border', `${color}45`);
    } else {
      document.documentElement.style.setProperty('--salon-primary', '#8B5CF6');
      document.documentElement.style.setProperty('--salon-primary-shadow', 'rgba(139, 92, 246, 0.25)');
      document.documentElement.style.setProperty('--salon-primary-light', 'rgba(139, 92, 246, 0.12)');
      document.documentElement.style.setProperty('--salon-primary-border', 'rgba(139, 92, 246, 0.25)');
    }
  }, [appMode, currentSalon?.primaryColor]);

  const handleDirectBookFromClient = (client: Client) => {
    setClientToBook(client);
    setActiveTab('calendar');
  };

  if (appMode === 'landing') {
    return <LandingPage />;
  }

  if (appMode === 'developer') {
    return <DeveloperPortalView />;
  }

  return (
    <div
      className="salon-theme min-h-screen flex flex-col bg-slate-50 relative"
      style={{
        '--salon-primary': salonPrimary,
        '--salon-primary-shadow': `${salonPrimary}40`,
        '--salon-primary-light': `${salonPrimary}18`,
        '--salon-primary-border': `${salonPrimary}45`,
      } as React.CSSProperties}
    >
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'calendar' && (
            <CalendarView
              initialClientToBook={clientToBook}
              onClearInitialClient={() => setClientToBook(null)}
            />
          )}

          {activeTab === 'clients' && (
            <ClientList onDirectBook={handleDirectBookFromClient} />
          )}

          {activeTab === 'services' && <ServiceList />}

          {activeTab === 'reports' && currentUser?.role === 'ADMIN' && <AdminReportsView />}

          {activeTab === 'payments' && currentUser?.role === 'ADMIN' && <MyPaymentsView />}

          {activeTab === 'staff' && <StaffList />}
        </main>
      </div>

      {/* Modal de bloqueio de subscrição caso o teste tenha terminado ou mensalidade pendente */}
      <SubscriptionLockModal />

      {/* Botão flutuante de contacto por WhatsApp */}
      <WhatsAppFloatingButton />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
