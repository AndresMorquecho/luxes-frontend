import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { InventarioPage } from './InventarioPage';
import { PrestamosPage } from './PrestamosPage';
import { DevolucionesPage } from './DevolucionesPage.jsx';

function RecepcionOrdenRedirect() {
  const { ordenId } = useParams();
  return <Navigate to={`/compras/recepcion/${ordenId}`} replace />;
}

function HistorialOrdenRedirect() {
  const { ordenId } = useParams();
  return <Navigate to={`/compras/recepcion/historial/${ordenId}`} replace />;
}

export default function InventarioFeature() {
  return (
    <Routes>
      <Route index element={<InventarioPage />} />
      <Route path="prestamos" element={<PrestamosPage />} />
      <Route path="devoluciones" element={<DevolucionesPage />} />
      <Route path="recepcion" element={<Navigate to="/compras/recepcion" replace />} />
      <Route path="recepcion/historial/:ordenId" element={<HistorialOrdenRedirect />} />
      <Route path="recepcion/historial" element={<Navigate to="/compras/recepcion/historial" replace />} />
      <Route path="recepcion/:ordenId" element={<RecepcionOrdenRedirect />} />
      <Route path="*" element={<Navigate to="/inventario" replace />} />
    </Routes>
  );
}
