import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '../components/ui/toaster';
import { AppLayout } from '../components/layout/AppLayout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { SellTicket } from '../components/lottery/SellTicket';
import { VerifyPrize } from '../components/lottery/VerifyPrize';
import { TicketPrint } from '../components/lottery/TicketPrint';
import { CancelTicket } from '../components/lottery/CancelTicket';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin, isSeller } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sell" element={<SellTicket />} />
                <Route path="/verify" element={<VerifyPrize />} />
                <Route path="/print" element={<TicketPrint />} />
                <Route path="/cancel" element={<CancelTicket />} />
                <Route path="/admin/*" element={
                  <ProtectedRoute adminOnly>
                    <div>Admin Panel - Coming Soon</div>
                  </ProtectedRoute>
                } />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}