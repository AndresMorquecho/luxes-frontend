import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrdenById } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { RecepcionNav } from './RecepcionNav';
import { formatDateOnlyES } from '../../../../shared/utils/dateOnly.js';
import { ArrowLeft, User, FileText, Calendar, CheckCircle2, DollarSign } from 'lucide-react';
import './RecepcionInsumos.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => formatDateOnlyES(d, { year: 'numeric', month: 'long', day: 'numeric' });
const fmtDateShort = (d) => {
  if (!d) return '—';
  const parsed = new Date(d);
  return parsed.toLocaleDateString('es-EC', { day: 'numeric', month: 'long' });
};

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          <p className="text-slate-500 font-medium text-sm">Cargando detalle...</p>
        </div>
      </div>
    );
  }

  if (!orden) return null;

  const detalles = (orden.detalles || []).filter(d => (d.cantidadRecibida ?? 0) > 0);
  const totalRecibido = detalles.reduce((s, d) => s + (d.cantidadRecibida || 0), 0);
  const totalInventario = detalles.filter(d => d.descargableInventario).length;
  const totalUnidadesSolicitadas = (orden.detalles || []).reduce((s, d) => s + (d.cantidad || 0), 0);

  return (
    <div className="pb-10" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header Unificado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => navigate(`${basePath}/historial`)} 
            className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700 shadow-sm bg-white"
            title="Volver al historial"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Detalle de productos recibidos
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                Recibida
              </span>
              <span className="text-xs font-semibold text-slate-400">Order: {orden.numero}</span>
            </h2>
          </div>
        </div>
      </div>

      <RecepcionNav basePath={basePath} />

      {/* Tarjeta de Información Principal - Rediseño */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panel Izquierdo: Resumen de Recepción */}
          <div className="lg:col-span-5 flex flex-col justify-between pr-0 lg:pr-6 border-r-0 lg:border-r border-slate-100">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Resumen de recepción</span>
              <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 mb-4 max-w-[280px]">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Orden</span>
                <span className="block text-3xl font-extrabold text-slate-800 mt-1">{fmt(orden.total)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider shrink-0 w-20">Proveedor:</span>
                <span className="font-semibold text-slate-700">{orden.proveedor?.nombre || '—'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider shrink-0 w-20">Concepto:</span>
                <span className="text-slate-600 font-medium leading-relaxed">{orden.concepto || '—'}</span>
              </div>
            </div>
          </div>

          {/* Panel Derecho: Datos de Recepción */}
          <div className="lg:col-span-7">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Datos de recepción</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-150 rounded-xl overflow-hidden divide-x divide-y divide-slate-150 bg-white">
              
              {/* Fecha llegada */}
              <div className="p-4 flex flex-col justify-between min-h-[76px]">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fecha llegada</span>
                <span className="block text-sm font-bold text-slate-800 mt-1">{fmtDate(orden.fechaRecepcion)}</span>
              </div>

              {/* Estado */}
              <div className="p-4 flex flex-col justify-between min-h-[76px]">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estado</span>
                <div className="flex items-center gap-2 mt-1">
                  <User size={12} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-600">
                    Aprobada por {orden.aprobadoPor?.nombre || '—'} el {fmtDate(orden.fechaAprobacion)}
                  </span>
                </div>
              </div>

              {/* Solicitante */}
              <div className="p-4 flex flex-col justify-between min-h-[76px]">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Solicitante</span>
                <div className="flex items-center gap-2 mt-1">
                  <User size={12} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">{orden.usuario?.nombre || '—'}</span>
                </div>
              </div>

              {/* Recibido por */}
              <div className="p-4 flex flex-col justify-between min-h-[76px]">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Recibido por</span>
                <div className="flex items-center gap-2 mt-1">
                  <User size={12} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">{orden.recibidoPor?.nombre || '—'}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {orden.notasRecepcion && (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <strong className="text-slate-700 font-bold block mb-0.5">Observaciones de la recepción</strong>
              {orden.notasRecepcion}
            </div>
          </div>
        )}
      </div>

      {/* Contenedor de la Tabla */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-50 bg-slate-50/20">
          <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{detalles.length} item{detalles.length !== 1 ? 's' : ''} recibido{detalles.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-200">•</span>
            <span className="text-emerald-700">{totalInventario} ingresaron</span>
            <span className="text-slate-200">•</span>
            <span>{totalUnidadesSolicitadas} unidades</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 bg-slate-50/50 uppercase tracking-wider">
                <th className="px-6 py-3.5">Descripción</th>
                <th className="text-center px-6 py-3.5">Fecha de llegada</th>
                <th className="text-center px-6 py-3.5">Solicitada</th>
                <th className="text-center px-6 py-3.5">Recibida</th>
                <th className="text-center px-6 py-3.5">Inventario</th>
                {!isTaller && <th className="text-right px-6 py-3.5">Precio unit.</th>}
              </tr>
            </thead>
            <tbody>
              {detalles.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{d.descripcion}</td>
                  <td className="px-6 py-4 text-center text-xs font-semibold text-emerald-700">
                    {d.fechaRecepcion ? fmtDateShort(d.fechaRecepcion) : '—'}
                  </td>
                  <td className="px-6 py-4 text-center font-medium text-slate-500">{d.cantidad}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-800">{d.cantidadRecibida}</td>
                  <td className="px-6 py-4 text-center">
                    {d.descargableInventario ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Inventario Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100">
                        Inventario No
                      </span>
                    )}
                  </td>
                  {!isTaller && (
                    <td className="px-6 py-4 text-right font-semibold text-slate-700">
                      {fmt(d.precioUnitario)}
                    </td>
                  )}
                </tr>
              ))}
              {detalles.length === 0 && (
                <tr>
                  <td colSpan={isTaller ? 5 : 6} className="text-center py-10 text-slate-400 text-sm">
                    Sin ítems con cantidad recibida registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
