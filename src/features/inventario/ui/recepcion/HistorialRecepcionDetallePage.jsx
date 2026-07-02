import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrdenById } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { RecepcionNav } from './RecepcionNav';
import { formatDateOnlyES } from '../../../../shared/utils/dateOnly.js';
import './RecepcionInsumos.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => formatDateOnlyES(d, { year: 'numeric', month: 'long', day: 'numeric' });

export const HistorialRecepcionDetallePage = ({ basePath = '/compras/recepcion' }) => {
  const { ordenId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isTaller = (user?.rol || '').toLowerCase() === 'taller';

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getOrdenById(ordenId);
        if (cancelled) return;
        if (data.estado !== 'recibida') {
          toast.error('Esta orden aún no tiene todos los productos recibidos');
          navigate(`${basePath}/historial`);
          return;
        }
        setOrden(data);
      } catch (err) {
        if (!cancelled) {
          toast.error('Error al cargar el detalle: ' + err.message);
          navigate(`${basePath}/historial`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [ordenId, basePath, navigate]);

  if (loading) {
    return (
      <div className="ri-form-page">
        <div className="ri-card" style={{ padding: '4rem 2rem' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="ri-spinner" />
            <p className="text-slate-500 font-medium">Cargando detalle…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orden) return null;

  const detalles = (orden.detalles || []).filter(d => (d.cantidadRecibida ?? 0) > 0);
  const totalRecibido = detalles.reduce((s, d) => s + (d.cantidadRecibida || 0), 0);
  const totalInventario = detalles.filter(d => d.descargableInventario).length;

  return (
    <div className="ri-form-page animate-slide-up">
      <div className="ri-form-header">
        <button type="button" onClick={() => navigate(`${basePath}/historial`)} className="ri-back-btn">
          ← Volver al historial
        </button>
      </div>

      <RecepcionNav basePath={basePath} />

      <div className="ri-info-card">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Detalle de productos recibidos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Orden {orden.numero} — solo lectura</p>
          </div>
          <span className="ri-badge-recibida">Recibida</span>
        </div>

        <div className="ri-info-grid">
          <div className="ri-info-item">
            <label>Fecha de llegada (última)</label>
            <p className="font-semibold text-emerald-700">{fmtDate(orden.fechaRecepcion)}</p>
          </div>
          <div className="ri-info-item">
            <label>Recibido por</label>
            <p>{orden.recibidoPor?.nombre || '—'}</p>
          </div>
          <div className="ri-info-item">
            <label>Solicitante</label>
            <p>{orden.usuario?.nombre || '—'}</p>
          </div>
          <div className="ri-info-item">
            <label>Proveedor</label>
            <p>{orden.proveedor?.nombre || '—'}</p>
          </div>
          <div className="ri-info-item">
            <label>Aprobada el</label>
            <p>{fmtDate(orden.fechaAprobacion)}</p>
          </div>
          <div className="ri-info-item">
            <label>Aprobada por</label>
            <p>{orden.aprobadoPor?.nombre || '—'}</p>
          </div>
          {!isTaller && (
            <div className="ri-info-item">
              <label>Total orden</label>
              <p className="font-bold">{fmt(orden.total)}</p>
            </div>
          )}
          <div className="ri-info-item">
            <label>Concepto</label>
            <p>{orden.concepto || '—'}</p>
          </div>
        </div>

        {orden.notasRecepcion && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
            <strong className="text-slate-700">Observaciones:</strong> {orden.notasRecepcion}
          </div>
        )}
      </div>

      <div className="ri-card">
        <div className="ri-form-section">
          <h3 className="ri-section-title">Productos recibidos</h3>
          <div className="flex gap-4 mb-4 text-xs text-slate-500">
            <span><strong className="text-slate-700">{detalles.length}</strong> ítems recibidos</span>
            <span><strong className="text-emerald-700">{totalInventario}</strong> ingresaron a inventario</span>
            <span><strong className="text-slate-700">{totalRecibido}</strong> unidades totales</span>
          </div>

          <div className="overflow-x-auto">
            <table className="ri-items-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th className="text-center">Fecha de llegada</th>
                  <th className="text-center">Solicitada</th>
                  <th className="text-center">Recibida</th>
                  <th className="text-center">Inventario</th>
                  {!isTaller && <th className="text-right">Precio unit.</th>}
                </tr>
              </thead>
              <tbody>
                {detalles.map((d) => (
                  <tr key={d.id}>
                    <td className="font-semibold text-slate-700">{d.descripcion}</td>
                    <td className="text-center text-xs font-semibold text-emerald-700">{fmtDate(d.fechaRecepcion)}</td>
                    <td className="text-center font-medium text-slate-500">{d.cantidad}</td>
                    <td className="text-center font-bold text-blue-700">{d.cantidadRecibida}</td>
                    <td className="text-center">
                      {d.descargableInventario ? (
                        <span className="ri-badge-inv">Sí</span>
                      ) : (
                        <span className="ri-badge-no-inv">No</span>
                      )}
                    </td>
                    {!isTaller && <td className="text-right">{fmt(d.precioUnitario)}</td>}
                  </tr>
                ))}
                {detalles.length === 0 && (
                  <tr>
                    <td colSpan={isTaller ? 5 : 6} className="text-center py-8 text-slate-400 text-sm">
                      Sin ítems con cantidad recibida registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
