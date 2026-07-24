import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import LandingConfigFeature from '../../landing-config/ui';

const ConfiguracionFeature = () => (
  <Routes>
    <Route index element={<ConfiguracionPage />} />
    <Route path="landing/*" element={<LandingConfigFeature />} />
    <Route path="*" element={<Navigate to="/configuracion" replace />} />
  </Routes>
);

export default ConfiguracionFeature;
