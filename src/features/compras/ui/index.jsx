import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ComprasPage } from './pages/ComprasPage';
import { FormOrdenCompraPage } from './pages/FormOrdenCompraPage';
import { CuentasPorPagarPage } from './pages/CuentasPorPagarPage';
import { MetodosPagoPage } from './pages/MetodosPagoPage';
import { AprobacionOrdenesPage } from './pages/AprobacionOrdenesPage';
import { DetalleAprobacionPage } from './pages/DetalleAprobacionPage';

export default function ComprasFeature() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userRole = (user?.rol || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrador';
  const isImpresion = userRole === 'impresión' || userRole === 'impresion';
  const isTaller = userRole === 'taller';
  const hasAprobacionPermission = user?.permissions?.includes('aprobacion_ordenes_compra') || isAdmin;

  if (isImpresion || isTaller) {
    return (
      <Routes>
        <Route index element={<ComprasPage />} />
        <Route path="nueva" element={<FormOrdenCompraPage />} />
        <Route path="editar/:id" element={<FormOrdenCompraPage />} />
        <Route path="*" element={<Navigate to="/compras" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route index element={<ComprasPage />} />
      <Route path="nueva" element={<FormOrdenCompraPage />} />
      <Route path="editar/:id" element={<FormOrdenCompraPage />} />
      <Route path="cuentas-por-pagar" element={<CuentasPorPagarPage />} />
      <Route path="metodos-pago" element={<MetodosPagoPage />} />
      <Route 
        path="aprobaciones" 
        element={hasAprobacionPermission ? <AprobacionOrdenesPage /> : <Navigate to="/compras" replace />} 
      />
      <Route 
        path="aprobacion/:id" 
        element={hasAprobacionPermission ? <DetalleAprobacionPage /> : <Navigate to="/compras" replace />} 
      />
      <Route path="*" element={<Navigate to="/compras" replace />} />
    </Routes>
  );
}
