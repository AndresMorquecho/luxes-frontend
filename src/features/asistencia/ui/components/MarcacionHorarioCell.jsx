import React from 'react';
import { diffMinutosVsEsperado, formatDiffMinutos } from '../../helpers/horarioLaboral';

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : null;

/**
 * Celda de marcación: hora real + referencia del horario definido.
 */
export function MarcacionHorarioCell({ marcacion, esperado, omitidoEsperado = false, isAdmin = true, onClick }) {
  const horaReal = formatTime(marcacion?.fechaHora);
  const diff = marcacion && esperado ? diffMinutosVsEsperado(marcacion.fechaHora, esperado) : null;
  const tieneDesvio = diff !== null && Math.abs(diff) > 5;
  const registrada = Boolean(horaReal);

  const cardCls = registrada
    ? 'border-emerald-200 bg-emerald-50/90'
    : 'border-slate-200 bg-slate-50/80';

  const isInteractive = Boolean(onClick);

  const adminInteractiveCls = isInteractive
    ? 'cursor-pointer hover:border-blue-500 hover:bg-blue-50/90 hover:shadow-md hover:scale-105 active:scale-95 transition-all group relative'
    : '';

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  if (omitidoEsperado) {
    return (
      <div
        onClick={handleClick}
        title={isAdmin ? (registrada ? 'Clic para editar esta marcación' : 'Clic para agregar esta marcación') : undefined}
        className={`inline-flex flex-col items-center rounded-lg border px-2 py-1.5 min-w-[4.5rem] ${cardCls} ${adminInteractiveCls}`}
      >
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">opcional</span>
        {horaReal ? (
          <>
            <span className="font-mono text-xs font-bold text-slate-800 mt-0.5">{horaReal}</span>
            {marcacion?.ubicacionLat && marcacion?.ubicacionLng && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${marcacion.ubicacionLat},${marcacion.ubicacionLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 hover:text-blue-800 hover:underline mt-1 bg-blue-50 border border-blue-100 rounded px-1 py-0.5 leading-none transition-all"
                title="Ver ubicación en Google Maps"
                onClick={(e) => e.stopPropagation()}
              >
                Mapa
              </a>
            )}
          </>
        ) : (
          <span className="font-mono text-xs text-slate-300 mt-0.5">—</span>
        )}
      </div>
    );
  }

  if (!esperado) {
    return (
      <div
        onClick={handleClick}
        title={isAdmin ? 'Clic para agregar marcación' : undefined}
        className={`inline-flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 min-w-[4.5rem] ${adminInteractiveCls}`}
      >
        <span className="font-mono text-xs text-slate-300">—</span>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      title={isAdmin ? (registrada ? 'Clic para editar esta marcación' : 'Clic para agregar esta marcación') : undefined}
      className={`inline-flex flex-col items-center rounded-lg border px-2 py-1.5 min-w-[5.2rem] ${cardCls} ${adminInteractiveCls}`}
    >
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
          {marcacion?.ubicacionLat && marcacion?.ubicacionLng && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${marcacion.ubicacionLat},${marcacion.ubicacionLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 hover:text-blue-800 hover:underline mt-1 bg-blue-50 border border-blue-100 rounded px-1 py-0.5 leading-none transition-all"
              title="Ver ubicación en Google Maps"
              onClick={(e) => e.stopPropagation()}
            >
              Mapa
            </a>
          )}
        </>
      ) : (
        <span className="font-mono text-xs text-slate-300 mt-0.5 font-bold group-hover:text-blue-500 transition-colors">—</span>
      )}
    </div>
  );
}
