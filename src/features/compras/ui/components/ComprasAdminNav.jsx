import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Clock } from 'lucide-react';

export function ComprasAdminNav() {
  const [searchParams] = useSearchParams();
  const isAprobaciones = searchParams.get('vista') === 'aprobaciones';

  return (
    <>
      <Link
        to="/compras"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
          !isAprobaciones
            ? 'bg-white text-blue-700 shadow-xs border border-blue-100 font-bold'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
        }`}
      >
        <ShoppingBag className="w-4 h-4 shrink-0" />
        Todas las órdenes
      </Link>
      <Link
        to="/compras?vista=aprobaciones"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
          isAprobaciones
            ? 'bg-white text-blue-700 shadow-xs border border-blue-100 font-bold'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
        }`}
      >
        <Clock className="w-4 h-4 shrink-0" />
        Pendientes de aprobación
      </Link>
    </>
  );
}
