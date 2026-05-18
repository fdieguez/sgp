import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import SettingsPage from './pages/SettingsPage';
import OrdersPage from './pages/OrdersPage';
import SubsidiesPage from './pages/SubsidiesPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import HelpPage from './pages/HelpPage';
import { Toaster } from 'react-hot-toast';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user?.role !== 'ADMINISTRADOR') {
    return <div className="p-4 text-red-600">Acceso denegado. Se requieren permisos de administrador.</div>;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function App() {
  return (
    <AuthProvider>
      <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />

            <Route path="/mis-solicitudes" element={
              <ProtectedRoute>
                <ProjectDetailsPage />
              </ProtectedRoute>
            } />

            <Route path="/projects/config/:configId" element={
              <ProtectedRoute>
                <ProjectDetailsPage />
              </ProtectedRoute>
            } />

            <Route path="/projects/config/:configId/settings" element={
              <ProtectedRoute>
                <ProjectSettingsPage />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute adminOnly={true}>
                <SettingsPage />
              </ProtectedRoute>
            } />

            <Route path="/orders" element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            } />

            <Route path="/subsidies" element={
              <ProtectedRoute>
                <SubsidiesPage />
              </ProtectedRoute>
            } />

            <Route path="/help" element={
              <ProtectedRoute>
                <HelpPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>

        <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none opacity-50 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full text-white text-[10px] font-mono tracking-widest flex items-center gap-2">
          <span>SGP</span>
          <span className="text-[10px] font-mono text-gray-500 bg-gray-900/50 px-2 py-1 rounded-full border border-gray-800">v0.8.5</span>
        </div>
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }} />
      </div>
    </AuthProvider>

  );
}

export default App;
