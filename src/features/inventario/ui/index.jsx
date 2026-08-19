import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { InventarioPage } from './InventarioPage';
import { PrestamosPage } from './PrestamosPage';
import { DevolucionesPage } from './DevolucionesPage.jsx';
import { MaterialHistorialPage } from './MaterialHistorialPage';

export default function InventarioFeature() {
  return (
    <Routes>
      <Route index element={<InventarioPage />} />
      <Route path="prestamos" element={<PrestamosPage />} />
      <Route path="devoluciones" element={<DevolucionesPage />} />
      <Route path="historial/:id" element={<MaterialHistorialPage />} />
      <Route path="*" element={<Navigate to="/inventario" replace />} />
    </Routes>
  );
}
