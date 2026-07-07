import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GastosPage } from './pages/GastosPage';

export default function GastosFeature({ defaultTab }) {
  return (
    <Routes>
      <Route index element={<GastosPage defaultTab={defaultTab} />} />
      <Route path="*" element={<Navigate to={defaultTab === 'cierre' ? '/cierre-caja' : '/gastos'} replace />} />
    </Routes>
  );
}
