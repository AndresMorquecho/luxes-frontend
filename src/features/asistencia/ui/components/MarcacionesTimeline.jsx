import React from 'react';
import { MARCACION_SLOTS } from '../../helpers/asistenciaHelpers';
import { getHorarioEsperado } from '../../helpers/horarioLaboral';

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--';

const COLOR = {
  emerald: {
    active: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300',
    idle: 'border-slate-700 bg-slate-900/40 text-slate-500',
    dot: 'bg-emerald-500',
  },
  amber: {
    active: 'border-amber-500/60 bg-amber-950/40 text-amber-300',
    idle: 'border-slate-700 bg-slate-900/40 text-slate-500',
    dot: 'bg-amber-500',
  },
  sky: {
    active: 'border-sky-500/60 bg-sky-950/40 text-sky-300',
    idle: 'border-slate-700 bg-slate-900/40 text-slate-500',
    dot: 'bg-sky-500',
  },
  indigo: {
    active: 'border-indigo-500/60 bg-indigo-950/40 text-indigo-300',
    idle: 'border-slate-700 bg-slate-900/40 text-slate-500',
    dot: 'bg-indigo-500',
  },
  violet: {
    active: 'border-violet-500/60 bg-violet-950/40 text-violet-300',
    idle: 'border-slate-700 bg-slate-900/40 text-slate-500',
    dot: 'bg-violet-500',
  },
};

export function MarcacionesTimeline({ marcaciones = [], highlightTipo, compact = false, theme = 'dark', fechaRef, esperado: esperadoProp }) {
  const byTipo = Object.fromEntries(marcaciones.map((m) => [m.tipo, m]));
  const horario = esperadoProp ?? (fechaRef ? getHorarioEsperado(fechaRef) : null);

  if (theme === 'light') {
    return (
      <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
        {MARCACION_SLOTS.map((slot) => {
          const mark = byTipo[slot.tipo];
          const esperado = horario?.[slot.tipo];
          const isHighlight = highlightTipo === slot.tipo;
          return (
            <div
              key={slot.tipo}
              className={`rounded-xl border px-3 py-2 ${mark ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'} ${isHighlight ? 'ring-2 ring-blue-400' : ''}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{slot.short}</p>
              {esperado && (
                <p className="text-[9px] text-blue-500 font-mono">ref. {esperado.label}</p>
              )}
              <p className={`text-sm font-mono font-bold mt-0.5 ${mark ? 'text-slate-800' : 'text-slate-300'}`}>
                {formatTime(mark?.fechaHora)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'} w-full`}>
      {MARCACION_SLOTS.map((slot) => {
        const mark = byTipo[slot.tipo];
        const esperado = horario?.[slot.tipo];
        const palette = COLOR[slot.color];
        const isHighlight = highlightTipo === slot.tipo;
        return (
          <div
            key={slot.tipo}
            className={`rounded-xl border px-3 py-2.5 transition-all ${mark ? palette.active : palette.idle} ${isHighlight ? 'ring-2 ring-white/30 scale-[1.02]' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${mark ? palette.dot : 'bg-slate-600'}`} />
              <p className="text-[9px] font-bold uppercase tracking-wider">{slot.short}</p>
            </div>
            {esperado && (
              <p className="text-[8px] font-mono text-slate-400 mb-0.5">ref. {esperado.label}</p>
            )}
            <p className="text-sm font-mono font-black">{formatTime(mark?.fechaHora)}</p>
          </div>
        );
      })}
    </div>
  );
}
