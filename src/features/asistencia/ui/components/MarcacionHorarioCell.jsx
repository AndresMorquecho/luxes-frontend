import React from 'react';
import { diffMinutosVsEsperado, formatDiffMinutos } from '../../helpers/horarioLaboral';

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : null;

/**
 * Celda de marcación: hora real + referencia del horario definido.
 */
export function MarcacionHorarioCell({ marcacion, esperado, omitidoEsperado = false }) {
  const horaReal = formatTime(marcacion?.fechaHora);
  const diff = marcacion && esperado ? diffMinutosVsEsperado(marcacion.fechaHora, esperado) : null;
  const tieneDesvio = diff !== null && Math.abs(diff) > 5;
  const registrada = Boolean(horaReal);

  const cardCls = registrada
    ? 'border-emerald-200 bg-emerald-50/90'
    : 'border-slate-200 bg-slate-50/80';

  if (omitidoEsperado) {
    return (
      <div className={`inline-flex flex-col items-center rounded-lg border px-2 py-1.5 min-w-[4.5rem] ${cardCls}`}>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">opcional</span>
        {horaReal ? (
          <span className="font-mono text-xs font-bold text-slate-800 mt-0.5">{horaReal}</span>
        ) : (
          <span className="font-mono text-xs text-slate-300 mt-0.5">—</span>
        )}
      </div>
    );
  }

  if (!esperado) {
    return (
      <div className="inline-flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 min-w-[4.5rem]">
        <span className="font-mono text-xs text-slate-300">—</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center rounded-lg border px-2 py-1.5 min-w-[4.5rem] ${cardCls}`}>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
        ref. {esperado.label}
      </span>
      {horaReal ? (
        <>
          <span className={`font-mono text-xs font-bold mt-0.5 ${tieneDesvio ? 'text-amber-700' : 'text-slate-800'}`}>
            {horaReal}
          </span>
          {tieneDesvio && (
            <span className="text-[9px] font-semibold text-amber-600 leading-tight">
              {formatDiffMinutos(diff)}
            </span>
          )}
        </>
      ) : (
        <span className="font-mono text-xs text-slate-300 mt-0.5">—</span>
      )}
    </div>
  );
}
