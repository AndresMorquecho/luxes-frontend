import React, { useCallback, useEffect, useState } from 'react';
import { NominaApiAdapter } from '../../../nomina/infrastructure/adapters/nominaApiAdapter';
import { toast } from '../../../../shared/ui/components/Toast';

const formatUSD = (val) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(val ?? 0);

const adapter = new NominaApiAdapter();

export function HorasExtrasPendientesPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adapter.getPendingOvertime();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setActing(id);
    try {
      await adapter.approveOvertime(id);
      toast.success('Horas extras aprobadas — ya cuentan en nómina');
      await load();
    } catch (err) {
      toast.error(err.message || 'Error al aprobar');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id) => {
    setActing(id);
    try {
      await adapter.rejectOvertime(id);
      toast.success('Solicitud rechazada');
      await load();
    } catch (err) {
      toast.error(err.message || 'Error al rechazar');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
        Cargando horas extras pendientes…
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-200/80 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-amber-900">Horas extras por validar</h2>
          <p className="text-xs text-amber-700 mt-0.5">Registradas desde el quiosco de asistencia</p>
        </div>
        <span className="text-xs font-black bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-amber-100">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between bg-white/60">
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm">{item.colaboradorNombre}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.fecha} · <span className="font-mono">{item.detalleHorario}</span>
              </p>
              <p className="text-xs font-semibold text-violet-700 mt-1">
                {item.horas} h × {formatUSD(item.valorPorHora)} = {formatUSD(item.total)}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={acting === item.id}
                onClick={() => handleReject(item.id)}
                className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                type="button"
                disabled={acting === item.id}
                onClick={() => handleApprove(item.id)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 cursor-pointer disabled:opacity-50 border-none"
              >
                Aprobar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
