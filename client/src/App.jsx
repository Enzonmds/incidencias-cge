import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import TicketDetail from './pages/TicketDetail';
import TicketsPage from './pages/TicketsPage';
import Login from './pages/Login';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
