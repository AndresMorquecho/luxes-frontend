import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ComprasPage } from './pages/ComprasPage';
import { FormOrdenCompraPage } from './pages/FormOrdenCompraPage';
import { CuentasPorPagarPage } from './pages/CuentasPorPagarPage';
import { MetodosPagoPage } from './pages/MetodosPagoPage';
import { AprobacionOrdenesPage } from './pages/AprobacionOrdenesPage';
import { DetalleAprobacionPage } from './pages/DetalleAprobacionPage';
import { RecepcionInsumosListPage } from '../../inventario/ui/recepcion/RecepcionInsumosListPage';
import { RecepcionInsumosFormPage } from '../../inventario/ui/recepcion/RecepcionInsumosFormPage';
import { HistorialRecepcionesPage } from '../../inventario/ui/recepcion/HistorialRecepcionesPage';
import { HistorialRecepcionDetallePage } from '../../inventario/ui/recepcion/HistorialRecepcionDetallePage';

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
        <Route path="recepcion/historial/:ordenId" element={<HistorialRecepcionDetallePage basePath="/compras/recepcion" />} />
        <Route path="recepcion/historial" element={<HistorialRecepcionesPage basePath="/compras/recepcion" />} />
        <Route path="recepcion" element={<RecepcionInsumosListPage basePath="/compras/recepcion" />} />
        <Route path="recepcion/:ordenId" element={<RecepcionInsumosFormPage basePath="/compras/recepcion" />} />
        <Route path="*" element={<Navigate to="/compras" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route index element={<ComprasPage />} />
      <Route path="nueva" element={<FormOrdenCompraPage />} />
      <Route path="editar/:id" element={<FormOrdenCompraPage />} />
      <Route path="recepcion/historial/:ordenId" element={<HistorialRecepcionDetallePage basePath="/compras/recepcion" />} />
      <Route path="recepcion/historial" element={<HistorialRecepcionesPage basePath="/compras/recepcion" />} />
      <Route path="recepcion" element={<RecepcionInsumosListPage basePath="/compras/recepcion" />} />
      <Route path="recepcion/:ordenId" element={<RecepcionInsumosFormPage basePath="/compras/recepcion" />} />
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
