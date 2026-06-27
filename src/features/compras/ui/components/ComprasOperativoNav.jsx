import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function ComprasOperativoNav() {
  const { pathname } = useLocation();
  const isHistorial = pathname.startsWith('/compras/historial');

  return (
    <div className="co-tabs">
      <Link to="/compras" className={`co-tab ${!isHistorial ? 'co-tab-active' : ''}`}>
        Órdenes activas
      </Link>
      <Link to="/compras/historial" className={`co-tab ${isHistorial ? 'co-tab-active' : ''}`}>
        Historial
      </Link>
    </div>
  );
}
