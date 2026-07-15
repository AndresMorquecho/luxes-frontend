import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const RI_PRIMARY = '#2b41b8';

export function RecepcionNav({ basePath = '/compras/recepcion' }) {
  const { pathname } = useLocation();
  const isHistorial = pathname.startsWith(`${basePath}/historial`);

  const tabClass = (active) =>
    `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
      active
        ? 'border-[#2b41b8] text-[#2b41b8]'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-5 md:mb-6 overflow-x-auto">
      <Link to={basePath} className={tabClass(!isHistorial)} style={!isHistorial ? { color: RI_PRIMARY, borderColor: RI_PRIMARY } : undefined}>
        Pendientes por recibir
      </Link>
      <Link to={`${basePath}/historial`} className={tabClass(isHistorial)} style={isHistorial ? { color: RI_PRIMARY, borderColor: RI_PRIMARY } : undefined}>
        Historial
      </Link>
    </div>
  );
}
