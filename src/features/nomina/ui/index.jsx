import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NominaProvider } from '../application/context/NominaContext';
import { NominaApiAdapter } from '../infrastructure/adapters/nominaApiAdapter';
import { CredencialesPage } from '../../asistencia/ui/pages/CredencialesPage';
import { RegistrosPage } from '../../asistencia/ui/pages/RegistrosPage';
import { VacacionesPage } from './pages/VacacionesPage';
import { HorasExtrasPage } from './pages/HorasExtrasPage';
import { RolDePagoPage } from './pages/RolDePagoPage';
import { NominaMesPage } from './pages/NominaMesPage';
import EmpleadosFeature from '../../empleados/ui';
import './styles/Nomina.css';

const defaultAdapter = new NominaApiAdapter();

export default function NominaFeature() {
  return (
    <NominaProvider adapter={defaultAdapter}>
      <Routes>
        <Route index element={<Navigate to="registro-asistencia" replace />} />
        <Route path="registro-asistencia" element={<RegistrosPage />} />
        <Route path="credenciales" element={<CredencialesPage />} />
        <Route path="vacaciones" element={<VacacionesPage />} />
        <Route path="horas-extras" element={<HorasExtrasPage />} />
        <Route path="empleados/*" element={<EmpleadosFeature />} />
        <Route path="rol/:empleadoId" element={<RolDePagoPage />} />
        <Route path="nomina-del-mes" element={<NominaMesPage />} />
        <Route path="*" element={<Navigate to="registro-asistencia" replace />} />
      </Routes>
    </NominaProvider>
  );
}
