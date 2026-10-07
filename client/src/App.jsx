import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { EmergencyBanner } from './components/EmergencyBanner.jsx';
import { BroadcastModal } from './components/BroadcastModal.jsx';
import { NewResourceModal } from './components/NewResourceModal.jsx';

import { Dashboard } from './pages/Dashboard.jsx';
import { EmergencyRadar } from './pages/EmergencyRadar.jsx';
import { ResourceDirectory } from './pages/ResourceDirectory.jsx';
import { RequestsCenter } from './pages/RequestsCenter.jsx';
import { TransferTracker } from './pages/TransferTracker.jsx';
import { NetworkAdmin } from './pages/NetworkAdmin.jsx';
import { AuditAnalytics } from './pages/AuditAnalytics.jsx';
import { IntegrationDocs } from './pages/IntegrationDocs.jsx';

const MainApp = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Top Sticky Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenBroadcast={() => setIsBroadcastOpen(true)}
      />

      {/* Real-time Code Red Alert Ticker */}
      <EmergencyBanner
        onViewRequest={() => setCurrentTab('requests')}
      />

      {/* Main View Port */}
      <main className="main-content">
        {currentTab === 'dashboard' && (
          <Dashboard
            setCurrentTab={setCurrentTab}
            onOpenBroadcast={() => setIsBroadcastOpen(true)}
            onOpenNewResource={() => setIsNewResourceOpen(true)}
          />
        )}

        {currentTab === 'radar' && (
          <EmergencyRadar
            onRequestSuccess={() => setCurrentTab('requests')}
          />
        )}

        {currentTab === 'resources' && (
          <ResourceDirectory
            onOpenNewResource={() => setIsNewResourceOpen(true)}
          />
        )}

        {currentTab === 'requests' && (
          <RequestsCenter
            setCurrentTab={setCurrentTab}
          />
        )}

        {currentTab === 'transfers' && (
          <TransferTracker />
        )}

        {currentTab === 'network' && (
          <NetworkAdmin />
        )}

        {currentTab === 'audit' && (
          <AuditAnalytics />
        )}

        {currentTab === 'api' && (
          <IntegrationDocs />
        )}
      </main>

      {/* Global Modals */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        onBroadcastSuccess={() => setCurrentTab('requests')}
      />

      <NewResourceModal
        isOpen={isNewResourceOpen}
        onClose={() => setIsNewResourceOpen(false)}
        onSuccess={() => setCurrentTab('resources')}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
