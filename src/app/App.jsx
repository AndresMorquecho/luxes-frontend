import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { usePushNotifications } from '../shared/hooks/usePushNotifications';
import { Login } from '../features/auth/infrastructure/ui/Login';
import { LandingPage } from '../features/auth/infrastructure/ui/LandingPage';
import { CategoryDetailPage } from '../features/auth/infrastructure/ui/CategoryDetailPage';
import { Layout } from '../shared/ui/components/Layout';
import { PrintQueueProvider } from '../features/colas-impresion/context/PrintQueueContext';
import { ProyectosProvider } from '../features/proyectos/application/context/ProyectosContext.jsx';
import { ToastContainer } from '../shared/ui/components/Toast';
import { isAdminUser, isTrabajadorUser, isAsistenciaUser, normalizeUserForSession } from '../shared/utils/userRoleHelpers';
import { ConfirmDialogContainer } from '../shared/ui/components/ConfirmModal';
import { ErrorBoundary } from '../shared/ui/components/ErrorBoundary';
import './index.css';

// Dynamic lazy-loaded route features
const NominaFeature = lazy(() => import('../features/nomina/ui'));
const RegistrosPage = lazy(() => import('../features/asistencia/ui/pages/RegistrosPage').then(m => ({ default: m.RegistrosPage })));
const ColasImpresionPage = lazy(() => import('../features/colas-impresion/ui/ColasImpresionPage').then(m => ({ default: m.ColasImpresionPage })));
const ImpresionesPage = lazy(() => import('../features/impresiones/ui/ImpresionesPage').then(m => ({ default: m.ImpresionesPage })));
const ProyectosFeature = lazy(() => import('../features/proyectos/ui/index.jsx'));
const ProformasFeature = lazy(() => import('../features/proformas/ui'));
const ClientesFeature = lazy(() => import('../features/clientes/ui'));
const ProveedoresFeature = lazy(() => import('../features/proveedores/ui'));
const UsuariosFeature = lazy(() => import('../features/usuarios/ui'));
const ComprasFeature = lazy(() => import('../features/compras/ui'));
const VentasFeature = lazy(() => import('../features/ventas/ui'));
const GastosFeature = lazy(() => import('../features/gastos/ui'));
const InventarioFeature = lazy(() => import('../features/inventario/ui'));
const TareasFeature = lazy(() => import('../features/tareas/ui'));
const EncuestaPage = lazy(() => import('../features/proyectos/ui/pages/EncuestaPage.jsx').then(m => ({ default: m.EncuestaPage })));
const InstalacionesPage = lazy(() => import('../features/instalaciones/ui/InstalacionesPage.jsx').then(m => ({ default: m.InstalacionesPage })));
const MaterialesRequestPage = lazy(() => import('../features/instalaciones/ui/MaterialesRequestPage.jsx').then(m => ({ default: m.MaterialesRequestPage })));
const DashboardPage = lazy(() => import('../features/dashboard/ui/pages/DashboardPage.jsx'));
const NotificacionesPage = lazy(() => import('../features/notificaciones/ui/pages/NotificacionesPage').then(m => ({ default: m.NotificacionesPage })));
const ConfiguracionFeature = lazy(() => import('../features/configuracion/ui'));
const MovimientosPage = lazy(() => import('../features/gastos/ui/pages/MovimientosPage').then(m => ({ default: m.MovimientosPage })));
const TallerControlPage = lazy(() => import('../features/gastos/ui/pages/TallerControlPage').then(m => ({ default: m.TallerControlPage })));

const RouteLoading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  </div>
);


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [sessionChecked, setSessionChecked] = useState(() => !localStorage.getItem('token'));

  const { subscribeUser, unsubscribeUser } = usePushNotifications();

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Validar token almacenado al iniciar la app
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSessionChecked(true);
      return;
    }

    const validateSession = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearSession();
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const normalized = normalizeUserForSession(data.data);
            localStorage.setItem('user', JSON.stringify(normalized));
            setUser(normalized);
            setIsAuthenticated(true);
          }
        }
      } catch {
        // Si el backend no responde, mantener la sesión local temporalmente
      } finally {
        setSessionChecked(true);
      }
    };

    validateSession();
  }, []);

  // Cerrar sesión cuando cualquier API reporta token inválido
  useEffect(() => {
    const onSessionExpired = () => clearSession();
    window.addEventListener('auth-session-expired', onSessionExpired);
    return () => window.removeEventListener('auth-session-expired', onSessionExpired);
  }, []);

  // Sync user state on custom updates (e.g. sidebar customized)
  useEffect(() => {
    const handleUserUpdate = () => {
      const storedUser = localStorage.getItem('user');
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };
    window.addEventListener('user-updated', handleUserUpdate);
    return () => {
      window.removeEventListener('user-updated', handleUserUpdate);
    };
  }, []);

  // Auto-subscribe authenticated users on mount (production only)
  useEffect(() => {
    if (!import.meta.env.DEV && isAuthenticated && user) {
      subscribeUser(user);
    }
  }, [isAuthenticated, user, subscribeUser]);

  // En desarrollo: quitar service workers viejos que rompen rutas de Vite
  useEffect(() => {
    if (!import.meta.env.DEV || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
  }, []);

  // Tras un deploy, bundles viejos pueden fallar; recargar una vez con caché limpia
  useEffect(() => {
    if (import.meta.env.DEV) return;

    sessionStorage.removeItem('luxes-asset-reload');
    sessionStorage.removeItem('luxes-chunk-reload');

    const reloadOnce = () => {
      if (sessionStorage.getItem('luxes-chunk-reload')) return;
      sessionStorage.setItem('luxes-chunk-reload', '1');
      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .finally(() => window.location.reload());
      } else {
        window.location.reload();
      }
    };

    window.addEventListener('vite:preloadError', reloadOnce);
    return () => window.removeEventListener('vite:preloadError', reloadOnce);
  }, []);

  const handleLogin = (token, user) => {
    const normalized = normalizeUserForSession(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    setIsAuthenticated(true);
    setSessionChecked(true);
    subscribeUser(normalized);
  };

  const handleLogout = () => {
    unsubscribeUser(user);
    clearSession();
  };

  const location = useLocation();


  // Rutas públicas que no requieren autenticación
  if (location.pathname.startsWith('/encuesta/')) {
    return (
      <>
        <ToastContainer />
        <ConfirmDialogContainer />
        <ErrorBoundary>
          <Routes>
            <Route path="/encuesta/:id" element={<EncuestaPage />} />
          </Routes>
        </ErrorBoundary>
      </>
    );
  }

  if (!sessionChecked) {
    return (
      <>
        <ToastContainer />
        <ConfirmDialogContainer />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer />
        <ConfirmDialogContainer />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/catalogo/:categorySlug" element={<CategoryDetailPage />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </>
    );
  }

  // Render Kiosk view outside Layout for full-screen layout on tablets/screens
  const queryParams = new URLSearchParams(location.search);
  const isKioskRoute = (location.pathname === '/nomina/registro-asistencia' && queryParams.get('kiosk') === 'true') || isAsistenciaUser(user);

  if (isKioskRoute) {
    return (
      <>
        <ToastContainer />
        <ConfirmDialogContainer />
        <ErrorBoundary>
          <Routes>
            <Route path="/nomina/registro-asistencia" element={<RegistrosPage />} />
            <Route path="*" element={<Navigate to="/nomina/registro-asistencia" replace />} />
          </Routes>
        </ErrorBoundary>
      </>
    );
  }

  const isAdmin = isAdminUser(user);
  const isTrabajador = !isAdmin;

  return (
    <>
      <ToastContainer />
      <ConfirmDialogContainer />
      <ErrorBoundary>
      <PrintQueueProvider>
      <ProyectosProvider>
        <Layout user={user} onLogout={handleLogout}>
          <Suspense fallback={<RouteLoading />}>
            {isTrabajador ? (
              <Routes>
                <Route path="/" element={<Navigate to="/proyectos" replace />} />
                <Route path="/proyectos/*" element={<ProyectosFeature />} />
                <Route path="/notificaciones" element={<NotificacionesPage />} />
                <Route path="/tareas/*" element={<TareasFeature />} />
                <Route path="/compras/*" element={<ComprasFeature />} />
                <Route path="/nomina/registro-asistencia" element={<RegistrosPage />} />
                <Route path="/asistencia" element={<Navigate to="/nomina/registro-asistencia" replace />} />
                <Route path="*" element={<Navigate to="/proyectos" replace />} />
              </Routes>
            ) : (
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/catalogo/:categorySlug" element={<CategoryDetailPage />} />
                <Route path="/notificaciones" element={<NotificacionesPage />} />
                <Route path="/nomina/*" element={<NominaFeature />} />
                <Route path="/impresiones" element={<ImpresionesPage />} />
                <Route path="/colas-impresion" element={<Navigate to="/" replace />} />
                <Route path="/instalaciones" element={<InstalacionesPage />} />
                <Route path="/instalaciones/:id/materiales" element={<MaterialesRequestPage />} />
                <Route path="/inventario/*" element={<InventarioFeature />} />
                <Route path="/proyectos/*" element={<ProyectosFeature />} />
                <Route path="/proformas/*" element={<ProformasFeature />} />
                <Route path="/clientes/*" element={<ClientesFeature />} />
                <Route path="/proveedores/*" element={<ProveedoresFeature />} />
                <Route path="/usuarios/*" element={<UsuariosFeature />} />
                <Route path="/configuracion/*" element={<ConfiguracionFeature />} />
                <Route path="/devoluciones" element={<Navigate to="/inventario/devoluciones" replace />} />
                <Route path="/compras/*" element={<ComprasFeature />} />
                <Route path="/ventas/*" element={<VentasFeature />} />
                <Route path="/gastos/*" element={<GastosFeature defaultTab="gastos" />} />
                <Route path="/flota/*" element={<Navigate to="/gastos" replace />} />
                <Route path="/cierre-caja/*" element={<GastosFeature defaultTab="cierre" />} />
                <Route path="/movimientos/*" element={<MovimientosPage />} />
                <Route path="/balances" element={<Navigate to="/movimientos" replace />} />
                <Route path="/reportes-financieros/*" element={<Navigate to="/" replace />} />
                <Route path="/tareas/*" element={<TareasFeature />} />
                <Route path="/taller/control" element={<Navigate to="/" replace />} />
                {/* Redirección por defecto */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </Suspense>
        </Layout>
      </ProyectosProvider>
      </PrintQueueProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;

