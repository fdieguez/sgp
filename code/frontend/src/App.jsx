import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import SolicitudModal from './components/SolicitudModal';
import api from './config/axios';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import SettingsPage from './pages/SettingsPage';
import OrdersPage from './pages/OrdersPage';
import SubsidiesPage from './pages/SubsidiesPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import HelpPage from './pages/HelpPage';
import DescargarAdjunto from './pages/DescargarAdjunto';
import ResolutorSettingsPage from './pages/ResolutorSettingsPage';
import UserPreferencesPage from './pages/UserPreferencesPage';
import SelectRolPage from './pages/SelectRolPage';
import { Toaster } from 'react-hot-toast';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, user, activeRole, activeTipoResolucion, allRoles } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir a selección de rol si tiene múltiples roles sin elegir,
  // o si actúa como RESOLUTOR con más de un tipo de resolución y aún no eligió especialidad
  if (allRoles && allRoles.length > 1 && !activeRole) {
    return <Navigate to="/select-rol" replace />;
  }
  if (activeRole?.toUpperCase() === 'RESOLUTOR' && (user?.tiposResolucion?.length || 0) > 1 && !activeTipoResolucion) {
    return <Navigate to="/select-rol" replace />;
  }

  if (adminOnly && user?.role !== 'ADMINISTRADOR') {
    return <div className="p-4 text-red-600 bg-gray-950 min-h-screen">Acceso denegado. Se requieren permisos de administrador.</div>;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

/**
 * Host global que permite abrir el modal de una solicitud directamente en Notas de Seguimiento
 * al hacer clic en una notificación desde cualquier pantalla de la aplicación.
 */
function GlobalNotificationModalHost() {
  const { isAuthenticated } = useAuth();
  const [solicitud, setSolicitud] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenFromNotification = async (event) => {
      const solicitudId = event.detail?.solicitudId;
      if (!solicitudId || !isAuthenticated) return;
      try {
        const res = await api.get(`/api/solicitudes/${solicitudId}`);
        if (res.data) {
          setSolicitud(res.data);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Error abriendo solicitud desde notificación', err);
      }
    };

    window.addEventListener('sgp:open-solicitud-notificacion', handleOpenFromNotification);
    return () => window.removeEventListener('sgp:open-solicitud-notificacion', handleOpenFromNotification);
  }, [isAuthenticated]);

  if (!isAuthenticated || !isOpen || !solicitud) return null;

  return (
    <SolicitudModal
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        setSolicitud(null);
      }}
      onSuccess={() => {
        window.dispatchEvent(new CustomEvent('sgp:solicitud-updated'));
      }}
      initialData={solicitud}
      configId={solicitud.config?.id}
      initialTab="comentarios"
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/select-rol" element={<SelectRolPage />} />
            <Route path="/descargar-adjunto/:adjuntoId" element={<DescargarAdjunto />} />

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

            <Route path="/resolutor-settings" element={
              <ProtectedRoute>
                <ResolutorSettingsPage />
              </ProtectedRoute>
            } />

            <Route path="/preferencias" element={
              <ProtectedRoute>
                <UserPreferencesPage />
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
          <GlobalNotificationModalHost />
        </Router>


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
