import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { SellTicket } from '@/components/lottery/SellTicket';
import { VerifyPrize } from '@/components/lottery/VerifyPrize';
import { TicketPrint } from '@/components/lottery/TicketPrint';
import { CancelTicket } from '@/components/lottery/CancelTicket';
import { AdminLotteries } from '@/pages/admin/Lotteries';
import { AdminResults } from '@/pages/admin/Results';
import { AdminPrizes } from '@/pages/admin/Prizes';
import { AdminReports } from '@/pages/admin/Reports';
import { AdminUsers } from '@/pages/admin/Users';
import { useAuth } from '@/hooks/useAuth';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();

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

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
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
        <Route path="/" element={
          <ProtectedPage>
            <Dashboard />
          </ProtectedPage>
        } />
        <Route path="/sell" element={
          <ProtectedPage>
            <SellTicket />
          </ProtectedPage>
        } />
        <Route path="/verify" element={
          <ProtectedPage>
            <VerifyPrize />
          </ProtectedPage>
        } />
        <Route path="/print" element={
          <ProtectedPage>
            <TicketPrint />
          </ProtectedPage>
        } />
        <Route path="/cancel" element={
          <ProtectedPage>
            <CancelTicket />
          </ProtectedPage>
        } />
        <Route path="/admin/lotteries" element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <AdminLotteries />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/results" element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <AdminResults />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/prizes" element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <AdminPrizes />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <AdminReports />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute adminOnly>
            <AppLayout>
              <AdminUsers />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
