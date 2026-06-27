import React, { useEffect, useState } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { feriadosEnPeriodo } from '../../../../shared/utils/nominaPeriodoHelpers.js';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('es-EC', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export function FeriadosPeriodoModal({
  open,
  onClose,
  periodoLabel,
  fechaInicio,
  fechaFin,
  diasLaborables,
  feriados: feriadosIniciales,
  onSave,
  saving,
}) {
  const [feriados, setFeriados] = useState([]);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');

  useEffect(() => {
    if (open) {
      setFeriados(feriadosEnPeriodo(feriadosIniciales || [], fechaInicio, fechaFin));
      setNuevaFecha('');
      setNuevaDesc('');
    }
  }, [open, feriadosIniciales, fechaInicio, fechaFin]);

  const handleAdd = () => {
    const fecha = nuevaFecha.slice(0, 10);
    if (!fecha || fecha < fechaInicio || fecha > fechaFin) return;
    if (feriados.some((f) => f.fecha === fecha)) return;
    setFeriados((prev) =>
      [...prev, { fecha, descripcion: nuevaDesc.trim() }].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    );
    setNuevaFecha('');
    setNuevaDesc('');
  };

  const handleRemove = (fecha) => {
    setFeriados((prev) => prev.filter((f) => f.fecha !== fecha));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(feriados);
  };

  if (!open) return null;

  return (
    <ModalPortal open={open}>
      <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onMouseDown={() => deferClose(onClose)} />
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-amber-50/80">
            <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wide">Feriados del período</h3>
            <p className="text-xs text-amber-800/80 mt-1">{periodoLabel}</p>
            <p className="text-[11px] text-amber-700 mt-2 font-medium">
              {diasLaborables} días laborables (lun–sáb) · Sábado hasta las 14:00 · Los feriados se suman al pago de colaboradores con contrato.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  min={fechaInicio}
                  max={fechaFin}
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
              </div>
              <div className="flex-[2] min-w-[160px]">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Descripción</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Ej. Feriado nacional"
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!nuevaFecha}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
              >
                Agregar
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              {feriados.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">No hay feriados registrados en este período.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {feriados.map((f) => (
                    <li key={f.fecha} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">{fmtDate(f.fecha)}</p>
                        <p className="text-[11px] text-slate-500 truncate">{f.descripcion || 'Feriado'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(f.fecha)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold shrink-0"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => deferClose(onClose)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
              >
                {saving ? 'Guardando…' : 'Guardar feriados'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
