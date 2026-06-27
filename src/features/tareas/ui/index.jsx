import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TareasPage from './pages/TareasPage';

export default function TareasFeature() {
  return (
    <Routes>
      <Route index element={<TareasPage />} />
    </Routes>
  );
}
