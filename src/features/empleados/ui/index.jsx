import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { EmpleadosPage } from './pages/EmpleadosPage';
import { EmpleadoFormPage } from './pages/EmpleadoFormPage';

const EmpleadosFeature = () => (
  <Routes>
    <Route index element={<EmpleadosPage />} />
    <Route path="nuevo" element={<EmpleadoFormPage />} />
    <Route path="editar/:id" element={<EmpleadoFormPage />} />
    <Route path="*" element={<Navigate to="/nomina/empleados" replace />} />
  </Routes>
);

export default EmpleadosFeature;
