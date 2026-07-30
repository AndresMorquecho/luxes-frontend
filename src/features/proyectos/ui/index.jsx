// src/features/proyectos/ui/index.jsx
// Puerta pública del feature Proyectos hacia el resto de la app.

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Code splitting: cada página se parsea solo cuando el usuario navega a ella.
// ProyectoDetallePage pesa 102KB — sin lazy se parsea en el bundle inicial.
const ProyectosPage     = React.lazy(() => import('./pages/ProyectosPage.jsx'));
const ProyectoDetallePage = React.lazy(() => import('./pages/ProyectoDetallePage.jsx'));
const NuevoProyectoPage = React.lazy(() => import('./pages/NuevoProyectoPage.jsx'));
const ReclamosPage      = React.lazy(() => import('./pages/ReclamosPage.jsx'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      <span className="text-sm text-slate-400 font-medium">Cargando...</span>
    </div>
  </div>
);

/**
 * Feature Proyectos — expone las rutas:
 *   /proyectos           → lista principal
 *   /proyectos/nuevo     → formulario de creación
 *   /proyectos/reclamos  → tabla de reclamos post-venta
 *   /proyectos/:id       → detalle del proyecto
 */
export default function ProyectosFeature() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<ProyectosPage />} />
        <Route path="nuevo" element={<NuevoProyectoPage />} />
        <Route path="reclamos" element={<ReclamosPage />} />
        <Route path=":id" element={<ProyectoDetallePage />} />
      </Routes>
    </Suspense>
  );
}

