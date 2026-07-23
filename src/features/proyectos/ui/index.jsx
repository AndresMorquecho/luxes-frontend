// src/features/proyectos/ui/index.jsx
// Puerta pública del feature Proyectos hacia el resto de la app.

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProyectosPage from './pages/ProyectosPage.jsx';
import ProyectoDetallePage from './pages/ProyectoDetallePage.jsx';
import NuevoProyectoPage from './pages/NuevoProyectoPage.jsx';
import { ReclamosPage } from './pages/ReclamosPage.jsx';

/**
 * Feature Proyectos — expone las rutas:
 *   /proyectos           → lista principal
 *   /proyectos/nuevo     → formulario de creación
 *   /proyectos/reclamos  → tabla de reclamos post-venta
 *   /proyectos/:id       → detalle del proyecto
 */
export default function ProyectosFeature() {
  return (
    <Routes>
      <Route index element={<ProyectosPage />} />
      <Route path="nuevo" element={<NuevoProyectoPage />} />
      <Route path="reclamos" element={<ReclamosPage />} />
      <Route path=":id" element={<ProyectoDetallePage />} />
    </Routes>
  );
}


