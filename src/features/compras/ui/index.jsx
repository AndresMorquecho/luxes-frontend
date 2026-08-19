import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ComprasPage } from './pages/ComprasPage';
import { FormOrdenCompraPage } from './pages/FormOrdenCompraPage';
import { CuentasPorPagarPage } from './pages/CuentasPorPagarPage';
import { MetodosPagoPage } from './pages/MetodosPagoPage';
import { DetalleAprobacionPage } from './pages/DetalleAprobacionPage';
import { HistorialOrdenesCompraPage } from './pages/HistorialOrdenesCompraPage';
import { HistorialOrdenCompraDetallePage } from './pages/HistorialOrdenCompraDetallePage';
import { isAdminUser } from '../../../shared/utils/userRoleHelpers';

export default function ComprasFeature() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = isAdminUser(user);
  const hasAprobacionPermission = user?.permissions?.includes('aprobacion_ordenes_compra') || isAdmin;

  return (
    <Routes>
      <Route index element={<ComprasPage />} />
      <Route path="nueva" element={<FormOrdenCompraPage />} />
      <Route path="editar/:id" element={<FormOrdenCompraPage />} />
      <Route path="historial/:id" element={<HistorialOrdenCompraDetallePage />} />
      <Route path="historial" element={<HistorialOrdenesCompraPage />} />
      <Route path="cuentas-por-pagar" element={<CuentasPorPagarPage />} />
      <Route path="metodos-pago" element={<MetodosPagoPage />} />
      <Route
        path="aprobaciones"
        element={<Navigate to="/compras?vista=aprobaciones" replace />}
      />
      <Route 
        path="aprobacion/:id" 
        element={hasAprobacionPermission ? <DetalleAprobacionPage /> : <Navigate to="/compras" replace />} 
      />
      <Route path="*" element={<Navigate to="/compras" replace />} />
    </Routes>
  );
}

