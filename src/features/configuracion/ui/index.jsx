import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfiguracionPage } from './pages/ConfiguracionPage';

const ConfiguracionFeature = () => (
  <Routes>
    <Route index element={<ConfiguracionPage />} />
    <Route path="*" element={<Navigate to="/configuracion" replace />} />
  </Routes>
);

export default ConfiguracionFeature;
