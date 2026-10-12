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
import type { Client } from './types';

const MainContent: React.FC = () => {
  const { appMode, activeTab, setActiveTab, currentUser } = useApp();
  const [clientToBook, setClientToBook] = useState<Client | null>(null);

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
    <div className="min-h-screen flex flex-col bg-slate-50">
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

          {activeTab === 'staff' && <StaffList />}
        </main>
      </div>
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
