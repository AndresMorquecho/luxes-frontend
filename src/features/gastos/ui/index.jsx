import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GastosPage } from './pages/GastosPage';
import { CierresHistoryPage } from './pages/CierresHistoryPage';

export default function GastosFeature({ defaultTab }) {
  return (
    <Routes>
      <Route index element={<GastosPage defaultTab={defaultTab} />} />
      <Route path="historial" element={<CierresHistoryPage />} />
      <Route path="*" element={<Navigate to={defaultTab === 'cierre' ? '/cierre-caja' : '/gastos'} replace />} />
    </Routes>
  );
}
