import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GastosGeneralesPage } from './pages/GastosGeneralesPage';
import { GastosCarrosPage } from './pages/GastosCarrosPage';

export default function GastosFeature() {
  return (
    <Routes>
      <Route index element={<GastosGeneralesPage />} />
      <Route path="carros" element={<GastosCarrosPage />} />
      <Route path="*" element={<Navigate to="/gastos" replace />} />
    </Routes>
  );
}
