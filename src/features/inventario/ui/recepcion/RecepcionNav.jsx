import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function RecepcionNav({ basePath = '/compras/recepcion' }) {
  const { pathname } = useLocation();
  const isHistorial = pathname.startsWith(`${basePath}/historial`);

  return (
    <div className="ri-tabs">
      <Link
        to={basePath}
        className={`ri-tab ${!isHistorial ? 'ri-tab-active' : ''}`}
      >
        Pendientes por recibir
      </Link>
      <Link
        to={`${basePath}/historial`}
        className={`ri-tab ${isHistorial ? 'ri-tab-active' : ''}`}
      >
        Historial
      </Link>
    </div>
  );
}
