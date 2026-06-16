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
          ) : (
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/notificaciones" element={<NotificacionesPage />} />
              <Route path="/nomina/*" element={<NominaFeature />} />
              <Route path="/impresiones" element={<ImpresionesPage />} />
              <Route path="/colas-impresion" element={<ColasImpresionPage />} />
              <Route path="/instalaciones" element={<InstalacionesPage />} />
              <Route path="/instalaciones/:id/materiales" element={<MaterialesRequestPage />} />
              <Route path="/inventario/*" element={<InventarioFeature />} />
              <Route path="/proyectos/*" element={<ProyectosFeature />} />
              <Route path="/proformas/*" element={<ProformasFeature />} />
              <Route path="/clientes/*" element={<ClientesFeature />} />
              <Route path="/proveedores/*" element={<ProveedoresFeature />} />
              <Route path="/contactos/*" element={<ContactosFeature />} />
              <Route path="/usuarios/*" element={<UsuariosFeature />} />
              <Route path="/compras/*" element={<ComprasFeature />} />
              <Route path="/ventas/*" element={<VentasFeature />} />
              <Route path="/gastos/*" element={<GastosFeature />} />
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

