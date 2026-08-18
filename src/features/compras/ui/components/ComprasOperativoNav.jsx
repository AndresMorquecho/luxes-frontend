import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, History } from 'lucide-react';

export function ComprasOperativoNav() {
  const { pathname } = useLocation();
  const isHistorial = pathname.startsWith('/compras/historial');

  return (
    <>
      <Link
        to="/compras"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
          !isHistorial
            ? 'bg-white text-blue-700 shadow-xs border border-blue-100 font-bold'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
        }`}
      >
        <ShoppingBag className="w-4 h-4 shrink-0" />
        Órdenes activas
      </Link>
      <Link
        to="/compras/historial"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
          isHistorial
            ? 'bg-white text-blue-700 shadow-xs border border-blue-100 font-bold'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
        }`}
      >
        <History className="w-4 h-4 shrink-0" />
        Historial
      </Link>
    </>
  );
}
