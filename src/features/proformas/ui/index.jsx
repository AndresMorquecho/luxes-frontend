import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProformasPage } from './pages/ProformasPage';
import { NuevaProformaPage } from './pages/NuevaProformaPage';

const ProformasFeature = () => (
  <Routes>
    <Route index element={<ProformasPage />} />
    <Route path="nueva" element={<NuevaProformaPage />} />
    <Route path="editar/:id" element={<NuevaProformaPage />} />
    <Route path="*" element={<Navigate to="/proformas" replace />} />
  </Routes>
);

export default ProformasFeature;
