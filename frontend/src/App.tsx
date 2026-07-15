import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SupportPage from './pages/SupportPage';
import RecoveryPage from './pages/RecoveryPage';
import TicketsPage from './pages/TicketsPage';
import KnowledgePage from './pages/KnowledgePage';
import KnowledgeApprovalPage from './pages/KnowledgeApprovalPage';
import AgentsPage from './pages/AgentsPage';
import OfflinePage from './pages/OfflinePage';
import SecurityPage from './pages/SecurityPage';
import AdminPage from './pages/AdminPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <Layout>
              <SupportPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recovery"
        element={
          <ProtectedRoute>
            <Layout>
              <RecoveryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <Layout>
              <TicketsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge"
        element={
          <ProtectedRoute>
            <Layout>
              <KnowledgePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge-approval"
        element={
          <ProtectedRoute>
            <Layout>
              <KnowledgeApprovalPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <Layout>
              <AgentsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/offline"
        element={
          <ProtectedRoute>
            <Layout>
              <OfflinePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <Layout>
              <SecurityPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
