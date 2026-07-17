import React from 'react';
import { MarcacionesTimeline } from './MarcacionesTimeline';
import { previewHorasExtras } from '../../helpers/asistenciaHelpers';

const BTN_STYLES = {
  ENTRADA: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30 text-white',
  INICIO_ALMUERZO: 'bg-amber-600 hover:bg-amber-500 border-amber-400/30 text-white',
  FIN_ALMUERZO: 'bg-sky-600 hover:bg-sky-500 border-sky-400/30 text-white',
  SALIDA: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/30 text-white',
  FIN_HORAS_EXTRA: 'bg-violet-600 hover:bg-violet-500 border-violet-400/30 text-white',
  SALIDA_PERMISO: 'bg-rose-600 hover:bg-rose-500 border-rose-400/30 text-white',
};

export function MarcacionPickerModal({
  empleadoId,
  nombreEmpleado,
  marcaciones = [],
  opciones = [],
  onSelect,
  onCancel,
  loading = false,
  horaSalidaConfig = null,
}) {
  const hePreview = opciones.some((o) => o.tipo === 'FIN_HORAS_EXTRA')
    ? previewHorasExtras(marcaciones, horaSalidaConfig)
    : null;

  return (
    <div className="space-y-5 w-full max-w-sm text-center mx-auto">
      <div>
        <h3 className="text-xl font-black text-slate-800">¿Qué deseas registrar?</h3>
        <p className="text-sm text-slate-600 mt-1 font-semibold">{nombreEmpleado || empleadoId}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">ID: {empleadoId}</p>
      </div>

      <MarcacionesTimeline marcaciones={marcaciones} compact theme="light" />

      <div className="space-y-2.5">
        {opciones.map((op) => (
          <button
            key={op.tipo}
            type="button"
            disabled={loading}
            onClick={() => onSelect(op.tipo)}
            className={`w-full py-3.5 rounded-2xl border font-extrabold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm hover:shadow ${
              BTN_STYLES[op.tipo] || 'bg-slate-700 text-white'
            }`}
          >
            {op.label}
            {op.tipo === 'FIN_HORAS_EXTRA' && hePreview && (
              <span className="block text-[10px] font-semibold opacity-90 mt-1">
                {hePreview.horas} h · {hePreview.detalle}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="w-full py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
      >
        Cancelar
      </button>
    </div>
  );
}
