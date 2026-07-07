import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GastosPage } from './pages/GastosPage';

export default function GastosFeature({ defaultTab = 'gastos' }) {
  return (
    <Routes>
      <Route index element={<GastosPage defaultTab={defaultTab} />} />
      <Route path="flota" element={<GastosPage defaultTab="vehiculos" />} />
      <Route path="*" element={<Navigate to={defaultTab === 'cierre' ? '/cierre-caja' : defaultTab === 'vehiculos' ? '/flota' : '/gastos'} replace />} />
    </Routes>
  );
}
