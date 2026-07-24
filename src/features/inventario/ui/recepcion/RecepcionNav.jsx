import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function RecepcionNav({ basePath = '/compras/recepcion' }) {
  const { pathname } = useLocation();
  const isHistorial = pathname.startsWith(`${basePath}/historial`);

  const tabClass = (active) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
      active
        ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
        : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
    }`;

  return (
    <>
      <Link to={basePath} className={tabClass(!isHistorial)}>
        Pendientes por recibir
      </Link>
      <Link to={`${basePath}/historial`} className={tabClass(isHistorial)}>
        Historial
      </Link>
    </>
  );
}
