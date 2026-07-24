import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function ComprasOperativoNav() {
  const { pathname } = useLocation();
  const isHistorial = pathname.startsWith('/compras/historial');

  const tabClass = (active) =>
    `inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
      active
        ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
    }`;

  return (
    <>
      <Link to="/compras" className={tabClass(!isHistorial)}>
        Órdenes activas
      </Link>
      <Link to="/compras/historial" className={tabClass(isHistorial)}>
        Historial
      </Link>
    </>
  );
}
