import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdenes } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { RecepcionNav } from './RecepcionNav';
import './RecepcionInsumos.css';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleDateString('es-EC', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  : '—';

export const HistorialRecepcionesPage = ({ basePath = '/compras/recepcion' }) => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (user?.rol || '').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const isTaller = userRole === 'TALLER';

  const [ordenes, setOrdenes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const perPage = 10;
  const searchTimer = useRef(null);

  const loadOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrdenes({
        page,
        limit: perPage,
        search: search || undefined,
        estado: 'recibida',
        creadorRol: (isImpresion || isTaller) ? user?.rol : undefined,
      });
      setOrdenes(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setOrdenes([]);
      setTotal(0);
      toast.error('Error al cargar el historial de productos recibidos');
    } finally {
      setLoading(false);
    }
  }, [page, search, isImpresion, isTaller, user]);

  useEffect(() => {
    loadOrdenes();
  }, [loadOrdenes]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 350);
  };

  const countRecibidos = (orden) =>
    (orden.detalles || []).filter(d => (d.cantidadRecibida ?? 0) > 0).length;

  const countInventario = (orden) =>
    (orden.detalles || []).filter(d => d.descargableInventario && (d.cantidadRecibida ?? 0) > 0).length;

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="ri-page animate-slide-up">
      <div className="ri-card ri-header">
        <div>
          <h1 className="ri-title">Historial de productos recibidos</h1>
          <p className="ri-subtitle">Órdenes completas con fecha de llegada, responsable e ítems ingresados</p>
        </div>
        <div className="ri-stat-badge">
          <span>{total} registro{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <RecepcionNav basePath={basePath} />

      <div className="ri-card ri-table-card">
        <div className="ri-table-header">
          <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            className="ri-search-inline"
            placeholder="Buscar por número, proveedor, concepto o solicitante…"
            onChange={handleSearchChange}
          />
        </div>

        {loading ? (
          <div className="ri-loader-box"><div className="ri-spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ri-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Fecha de llegada</th>
                  <th>Recibido por</th>
                  <th>Solicitante</th>
                  <th>Proveedor</th>
                  <th className="text-center">Ítems</th>
                  <th className="text-center">A inventario</th>
                  <th className="text-center w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map(o => (
                  <tr key={o.id} className="ri-tr">
                    <td className="font-mono text-xs font-semibold text-slate-700">{o.numero}</td>
                    <td className="text-slate-600 text-xs font-medium">{fmtDateTime(o.fechaRecepcion)}</td>
                    <td className="text-slate-700 text-xs">{o.recibidoPor?.nombre || '—'}</td>
                    <td className="text-slate-600 text-xs">{o.usuario?.nombre || '—'}</td>
                    <td className="text-slate-700 text-xs font-medium">{o.proveedor?.nombre || '—'}</td>
                    <td className="text-center text-sm font-semibold text-slate-600">{countRecibidos(o)}</td>
                    <td className="text-center">
                      <span className="ri-badge-inv">{countInventario(o)}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => navigate(`${basePath}/historial/${o.id}`)}
                        className="ri-btn-ver w-full justify-center"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">
                      No hay productos recibidos registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="ri-pagination">
            <span className="text-xs font-medium text-slate-400">{total} registro{total !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="ri-page-btn">‹</button>
              <span className="text-xs font-semibold text-slate-500 px-2">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="ri-page-btn">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
