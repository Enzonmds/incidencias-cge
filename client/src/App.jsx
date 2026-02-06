import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleImpersonator from './components/RoleImpersonator';

// Pages
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import TicketsPage from './pages/TicketsPage';
import TicketDetail from './pages/TicketDetail';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import TriagePage from './pages/TriagePage';
import TechSupportPage from './pages/TechSupportPage';
import SystemFlowPage from './pages/SystemFlowPage';
import VerifyWhatsAppPage from './pages/VerifyWhatsAppPage';
import SetupPasswordPage from './pages/SetupPasswordPage';
import LegalPage from './pages/LegalPage';

function App() {
  return (
    <AuthProvider>
      <RoleImpersonator />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-whatsapp" element={<VerifyWhatsAppPage />} />
          <Route path="/setup-password" element={<SetupPasswordPage />} />
          <Route path="/legal" element={<LegalPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="triage" element={<TriagePage />} />
              <Route path="support" element={<TechSupportPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="system-flow" element={<SystemFlowPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
