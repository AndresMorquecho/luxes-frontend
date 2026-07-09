import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const CO_PRIMARY = '#2b41b8';

export function ComprasAdminNav() {
  const [searchParams] = useSearchParams();
  const isAprobaciones = searchParams.get('vista') === 'aprobaciones';

  const tabClass = (active) =>
    `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
      active
        ? 'border-[#2b41b8] text-[#2b41b8]'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`;

  return (
    <div className="flex gap-1 border-b border-slate-200 mb-4 md:mb-5 overflow-x-auto">
      <Link
        to="/compras"
        className={tabClass(!isAprobaciones)}
        style={!isAprobaciones ? { color: CO_PRIMARY, borderColor: CO_PRIMARY } : undefined}
      >
        Todas las órdenes
      </Link>
      <Link
        to="/compras?vista=aprobaciones"
        className={tabClass(isAprobaciones)}
        style={isAprobaciones ? { color: CO_PRIMARY, borderColor: CO_PRIMARY } : undefined}
      >
        Pendientes de aprobación
      </Link>
    </div>
  );
}
