import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import ContactosFeature from '../features/contactos/ui';
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
import { RecepcionInsumosListPage } from '../features/inventario/ui/recepcion/RecepcionInsumosListPage';
import { RecepcionInsumosFormPage } from '../features/inventario/ui/recepcion/RecepcionInsumosFormPage';
import ConfiguracionFeature from '../features/configuracion/ui';
import { MovimientosPage } from '../features/gastos/ui/pages/MovimientosPage';
import { ToastContainer } from '../shared/ui/components/Toast';
import { ConfirmDialogContainer } from '../shared/ui/components/ConfirmModal';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const { subscribeUser, unsubscribeUser } = usePushNotifications();

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

  // Auto-subscribe authenticated users on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      subscribeUser(user);
    }
  }, [isAuthenticated, user, subscribeUser]);

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setIsAuthenticated(true);
    subscribeUser(user);
  };

  const handleLogout = () => {
    unsubscribeUser(user);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const location = useLocation();


  // Rutas públicas que no requieren autenticación
  if (location.pathname.startsWith('/encuesta/')) {
    return (
      <Routes>
        <Route path="/encuesta/:id" element={<EncuestaPage />} />
      </Routes>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer />
        <ConfirmDialogContainer />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  }

  const isAsistenciaMode = user?.rol === 'asistencia';
  const isTallerMode = user?.rol?.toLowerCase() === 'taller';
  const userRole = (user?.rol || '').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const isVentas = userRole === 'VENTAS' || userRole === 'VENTAS / DISEÑADOR' || userRole === 'VENTAS / DISENADOR';
  const isDisenador = userRole === 'DISEÑADOR' || userRole === 'DISENADOR' || userRole === 'VENTAS / DISEÑADOR' || userRole === 'VENTAS / DISENADOR';

  return (
    <>
      <ToastContainer />
      <ConfirmDialogContainer />
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
              <Route path="/inventario/recepcion" element={<RecepcionInsumosListPage />} />
              <Route path="/inventario/recepcion/:ordenId" element={<RecepcionInsumosFormPage />} />
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
              {!isImpresion && <Route path="/contactos/*" element={<ContactosFeature />} />}
              {!isImpresion && !isVentas && !isDisenador && <Route path="/usuarios/*" element={<UsuariosFeature />} />}
              {!isImpresion && !isVentas && !isDisenador && <Route path="/configuracion/*" element={<ConfiguracionFeature />} />}
              <Route path="/compras/*" element={<ComprasFeature />} />
              {!isImpresion && <Route path="/ventas/*" element={<VentasFeature />} />}
              {!isImpresion && <Route path="/gastos/*" element={<GastosFeature defaultTab="gastos" />} />}
              {!isImpresion && <Route path="/cierre-caja/*" element={<GastosFeature defaultTab="cierre" />} />}
              {!isImpresion && <Route path="/reportes-financieros/*" element={<GastosFeature defaultTab="reportes" />} />}
              {!isImpresion && <Route path="/movimientos/*" element={<MovimientosPage />} />}
              <Route path="/tareas/*" element={<TareasFeature />} />
              {/* Redirección por defecto */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </Layout>
      </ProyectosProvider>
      </PrintQueueProvider>
    </>
  );
}

export default App;

