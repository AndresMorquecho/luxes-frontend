import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { usePushNotifications } from '../shared/hooks/usePushNotifications';
import { Login } from '../features/auth/infrastructure/ui/Login';
import { LandingPage } from '../features/auth/infrastructure/ui/LandingPage';
import { Layout } from '../shared/ui/components/Layout';
import NominaFeature from '../features/nomina/ui';
import { RegistrosPage } from '../features/asistencia/ui/pages/RegistrosPage';
import { ColasImpresionPage } from '../features/colas-impresion/ui/ColasImpresionPage';
import { ImpresionesPage } from '../features/impresiones/ui/ImpresionesPage';
import { PrintQueueProvider } from '../features/colas-impresion/context/PrintQueueContext';
import ProyectosFeature from '../features/proyectos/ui/index.jsx';
import { ProyectosProvider } from '../features/proyectos/application/context/ProyectosContext.jsx';
import ProformasFeature from '../features/proformas/ui';
import ClientesFeature from '../features/clientes/ui';
import ProveedoresFeature from '../features/proveedores/ui';
import UsuariosFeature from '../features/usuarios/ui';
import ComprasFeature from '../features/compras/ui';
import VentasFeature from '../features/ventas/ui';
import GastosFeature from '../features/gastos/ui';
import InventarioFeature from '../features/inventario/ui';
import TareasFeature from '../features/tareas/ui';
import { EncuestaPage } from '../features/proyectos/ui/pages/EncuestaPage.jsx';
import { InstalacionesPage } from '../features/instalaciones/ui/InstalacionesPage.jsx';
import { MaterialesRequestPage } from '../features/instalaciones/ui/MaterialesRequestPage.jsx';
import DashboardPage from '../features/dashboard/ui/pages/DashboardPage.jsx';
import { NotificacionesPage } from '../features/notificaciones/ui/pages/NotificacionesPage';
import { FormOrdenCompraPage } from '../features/compras/ui/pages/FormOrdenCompraPage';
import ConfiguracionFeature from '../features/configuracion/ui';
import { MovimientosPage } from '../features/gastos/ui/pages/MovimientosPage';
import { ToastContainer } from '../shared/ui/components/Toast';
import { isAsistenciaUser, isTallerUser, normalizeUserForSession } from '../shared/utils/userRoleHelpers';
import { ConfirmDialogContainer } from '../shared/ui/components/ConfirmModal';
import { ErrorBoundary } from '../shared/ui/components/ErrorBoundary';

function LegacyRecepcionRedirect() {
  const { ordenId } = useParams();
  return <Navigate to={ordenId ? `/compras/recepcion/${ordenId}` : '/compras/recepcion'} replace />;
}
import './index.css';

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
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </>
    );
  }

  const isAsistenciaMode = isAsistenciaUser(user);
  const isTallerMode = isTallerUser(user);
  const userRole = (user?.rol || '').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const isVentas = userRole === 'VENTAS' || userRole === 'VENTAS / DISEÑADOR' || userRole === 'VENTAS / DISENADOR';
  const isDisenador = userRole === 'DISEÑADOR' || userRole === 'DISENADOR' || userRole === 'VENTAS / DISEÑADOR' || userRole === 'VENTAS / DISENADOR';

  return (
    <>
      <ToastContainer />
      <ConfirmDialogContainer />
      <ErrorBoundary>
      <PrintQueueProvider>
      <ProyectosProvider>
        <Layout user={user} onLogout={handleLogout}>
          {isAsistenciaMode ? (
            <Routes>
              <Route path="/nomina/registro-asistencia" element={<RegistrosPage />} />
              <Route path="*" element={<Navigate to="/nomina/registro-asistencia" replace />} />
            </Routes>
          ) : isTallerMode ? (
            <Routes>
              <Route path="/notificaciones" element={<NotificacionesPage />} />
              <Route path="/instalaciones" element={<InstalacionesPage />} />
              <Route path="/instalaciones/:id/materiales" element={<MaterialesRequestPage />} />
              <Route path="/tareas/*" element={<TareasFeature />} />
              <Route path="/compras/*" element={<ComprasFeature />} />
              <Route path="/devoluciones" element={<Navigate to="/inventario/devoluciones" replace />} />
              <Route path="/inventario/*" element={<InventarioFeature />} />
              <Route path="/inventario/recepcion" element={<Navigate to="/compras/recepcion" replace />} />
              <Route path="/inventario/recepcion/:ordenId" element={<LegacyRecepcionRedirect />} />
              <Route path="*" element={<Navigate to="/notificaciones" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/" element={isImpresion ? <Navigate to="/colas-impresion" replace /> : <DashboardPage />} />
              <Route path="/notificaciones" element={<NotificacionesPage />} />
              {!isImpresion && <Route path="/nomina/*" element={<NominaFeature />} />}
              {!isImpresion && <Route path="/impresiones" element={<ImpresionesPage />} />}
              {!isVentas && !isDisenador && <Route path="/colas-impresion" element={<ColasImpresionPage />} />}
              <Route path="/instalaciones" element={<InstalacionesPage />} />
              <Route path="/instalaciones/:id/materiales" element={<MaterialesRequestPage />} />
              <Route path="/inventario/*" element={<InventarioFeature />} />
              {!isImpresion && <Route path="/proyectos/*" element={<ProyectosFeature />} />}
              {!isImpresion && <Route path="/proformas/*" element={<ProformasFeature />} />}
              {!isImpresion && <Route path="/clientes/*" element={<ClientesFeature />} />}
              {!isImpresion && <Route path="/proveedores/*" element={<ProveedoresFeature />} />}
              {!isImpresion && !isVentas && !isDisenador && <Route path="/usuarios/*" element={<UsuariosFeature />} />}
              {!isImpresion && !isVentas && !isDisenador && <Route path="/configuracion/*" element={<ConfiguracionFeature />} />}
              <Route path="/devoluciones" element={<Navigate to="/inventario/devoluciones" replace />} />
              <Route path="/compras/*" element={<ComprasFeature />} />
              {!isImpresion && <Route path="/ventas/*" element={<VentasFeature />} />}
              {!isImpresion && <Route path="/gastos/*" element={<GastosFeature defaultTab="gastos" />} />}
              {!isImpresion && <Route path="/flota/*" element={<GastosFeature defaultTab="vehiculos" />} />}
              {!isImpresion && <Route path="/cierre-caja/*" element={<GastosFeature defaultTab="cierre" />} />}
              {!isImpresion && <Route path="/movimientos/*" element={<MovimientosPage />} />}
              <Route path="/reportes-financieros/*" element={<Navigate to="/" replace />} />
              <Route path="/tareas/*" element={<TareasFeature />} />
              {/* Redirección por defecto */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </Layout>
      </ProyectosProvider>
      </PrintQueueProvider>
      </ErrorBoundary>
    </>
  );
}

export default App;

