import React from 'react';
import { SECUENCIA_MARCACIONES, MARCACION_SLOTS, resolveProximaMarcacion } from '../../helpers/asistenciaHelpers';

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--';

const SLOT_COLORS = {
  emerald: {
    done: 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300',
    next: 'border-emerald-400 bg-emerald-950/30 text-emerald-200 ring-2 ring-emerald-400/50',
    idle: 'border-slate-700/80 bg-slate-900/50 text-slate-500',
    dot: 'bg-emerald-500',
  },
  amber: {
    done: 'border-amber-500/60 bg-amber-950/50 text-amber-300',
    next: 'border-amber-400 bg-amber-950/30 text-amber-200 ring-2 ring-amber-400/50',
    idle: 'border-slate-700/80 bg-slate-900/50 text-slate-500',
    dot: 'bg-amber-500',
  },
  sky: {
    done: 'border-sky-500/60 bg-sky-950/50 text-sky-300',
    next: 'border-sky-400 bg-sky-950/30 text-sky-200 ring-2 ring-sky-400/50',
    idle: 'border-slate-700/80 bg-slate-900/50 text-slate-500',
    dot: 'bg-sky-500',
  },
  indigo: {
    done: 'border-indigo-500/60 bg-indigo-950/50 text-indigo-300',
    next: 'border-indigo-400 bg-indigo-950/30 text-indigo-200 ring-2 ring-indigo-400/50',
    idle: 'border-slate-700/80 bg-slate-900/50 text-slate-500',
    dot: 'bg-indigo-500',
  },
  violet: {
    done: 'border-violet-500/60 bg-violet-950/50 text-violet-300',
    next: 'border-violet-400 bg-violet-950/30 text-violet-200 ring-2 ring-violet-400/50',
    idle: 'border-slate-700/80 bg-slate-900/50 text-slate-500',
    dot: 'bg-violet-500',
  },
};

export function KioskMarcadoresPanel({ marcaciones = [], empleadoNombre, empleadoId, highlightTipo, compact = false, kiosk = false, kioskColumn = false, embedded = false }) {
  const byTipo = Object.fromEntries(marcaciones.map((m) => [m.tipo, m]));
  const info = resolveProximaMarcacion(marcaciones);
  const proximaTipo = highlightTipo || info.proxima?.tipo;
  const tiposRegistrados = new Set(marcaciones.map((m) => m.tipo));
  const tieneDatos = marcaciones.length > 0;
  const isKioskCompact = kiosk || kioskColumn;

  if (kioskColumn) {
    const panelShell = embedded
      ? 'h-full flex flex-col min-h-0'
      : 'h-full w-full flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/90 via-slate-900/95 to-slate-950 shadow-xl shadow-black/30 backdrop-blur-md p-5 overflow-hidden';

    return (
      <div className={panelShell}>
        <div className={`shrink-0 ${embedded ? '' : 'mb-4'}`}>
          <div className={`flex items-center gap-2 ${embedded ? 'justify-center' : ''}`}>
            <div className={`w-1 rounded-full bg-emerald-400 ${embedded ? 'h-3' : 'h-5'}`} />
            <p className={`font-bold uppercase text-emerald-200 tracking-widest ${embedded ? 'text-[10px]' : 'text-sm'}`}>
              Marcaciones
            </p>
          </div>
          {!embedded && tieneDatos && empleadoNombre && (
            <p className="hidden lg:block text-[11px] text-slate-400 mt-2 truncate px-1">{empleadoNombre}</p>
          )}
        </div>

        <div className={`grid grid-rows-5 gap-1 flex-1 min-h-0 ${embedded ? '' : 'lg:flex lg:flex-col lg:gap-2.5 lg:justify-center'}`}>
          {MARCACION_SLOTS.map((slot) => {
            const mark = byTipo[slot.tipo];
            const palette = SLOT_COLORS[slot.color];
            const esProximo = proximaTipo === slot.tipo && !mark;
            const clase = mark ? palette.done : esProximo ? palette.next : palette.idle;

            return (
              <div
                key={slot.tipo}
                className={`flex items-center justify-between gap-2 rounded-xl border transition-all min-h-0 ${
                  embedded ? 'px-2 py-1.5' : 'px-4 py-3'
                } ${clase}`}
              >
                <div className={`flex items-center min-w-0 ${embedded ? 'gap-1' : 'gap-2.5'}`}>
                  <span className={`rounded-full shrink-0 ${embedded ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${mark ? palette.dot : esProximo ? palette.dot + ' animate-pulse' : 'bg-slate-600'}`} />
                  <p className={`font-semibold uppercase tracking-wide truncate leading-tight ${embedded ? 'text-[9px]' : 'text-xs lg:text-sm'}`}>
                    {slot.short}
                  </p>
                </div>
                <p className={`font-mono font-bold shrink-0 tabular-nums ${embedded ? 'text-xs' : 'text-lg lg:text-xl'}`}>
                  {mark?.fechaHora
                    ? formatTime(mark.fechaHora).replace(/:\d{2}$/, '')
                    : '--:--'}
                </p>
              </div>
            );
          })}
        </div>

        {!embedded && (
          <div className="hidden lg:block mt-4 pt-3 border-t border-white/5 shrink-0">
            {info.completado && tieneDatos ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Día completo
              </span>
            ) : info.proxima ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Al escanear: {info.proxima.label}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Escanea tu QR para comenzar</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full ${isKioskCompact ? 'space-y-1.5' : compact ? 'space-y-2' : 'space-y-4'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`${kiosk ? 'text-[9px]' : 'text-[10px]'} font-bold text-slate-400 uppercase tracking-widest`}>
          Marcaciones del día
        </p>
        {tieneDatos && empleadoNombre && (
          <p className="text-[10px] font-semibold text-slate-500 truncate max-w-[140px]">
            {empleadoNombre}
          </p>
        )}
      </div>

      {/* Pasos visuales */}
      <div className="flex items-center justify-between gap-0.5 px-0.5">
        {SECUENCIA_MARCACIONES.map((step, i) => {
          const completado = tiposRegistrados.has(step.tipo);
          const esProximo = proximaTipo === step.tipo && !info.completado;
          const omitido =
            (step.tipo === 'INICIO_ALMUERZO' || step.tipo === 'FIN_ALMUERZO') &&
            tiposRegistrados.has('SALIDA') &&
            !completado;
          const stepSize = kiosk ? 'w-6 h-6 text-[8px]' : 'w-8 h-8 text-[10px]';

          return (
            <React.Fragment key={step.tipo}>
              <div className="flex flex-col items-center gap-0.5 min-w-0">
                <div
                  className={`${stepSize} rounded-full flex items-center justify-center font-black shrink-0 transition-all ${
                    completado
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                      : omitido
                        ? 'bg-slate-800 text-slate-600 border border-dashed border-slate-600'
                        : esProximo
                          ? 'bg-slate-800 text-blue-400 ring-2 ring-blue-400 animate-pulse'
                          : 'bg-slate-800/80 text-slate-600 border border-slate-700'
                  }`}
                >
                  {completado ? (
                    <svg className={kiosk ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : omitido ? (
                    '—'
                  ) : (
                    i + 1
                  )}
                </div>
                {!kiosk && (
                  <span className={`text-[8px] font-bold text-center leading-tight truncate w-full ${
                    completado ? 'text-blue-400' : esProximo ? 'text-blue-300' : 'text-slate-600'
                  }`}>
                    {step.tipo === 'INICIO_ALMUERZO' ? 'Alm.' : step.tipo === 'FIN_ALMUERZO' ? 'Vuelta' : step.tipo === 'ENTRADA' ? 'Ent.' : 'Sal.'}
                  </span>
                )}
              </div>
              {i < SECUENCIA_MARCACIONES.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[4px] ${kiosk ? 'mt-[-4px]' : 'mt-[-14px]'} ${completado ? 'bg-blue-500/60' : 'bg-slate-700'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Horas registradas */}
      <div className={`grid ${kiosk ? 'grid-cols-5 gap-1' : `grid-cols-2 ${compact ? 'gap-1.5' : 'gap-2'}`}`}>
        {MARCACION_SLOTS.map((slot) => {
          const mark = byTipo[slot.tipo];
          const palette = SLOT_COLORS[slot.color];
          const esProximo = proximaTipo === slot.tipo && !mark;
          const clase = mark ? palette.done : esProximo ? palette.next : palette.idle;

          return (
            <div
              key={slot.tipo}
              className={`rounded-lg border transition-all ${clase} ${
                kiosk ? 'px-1 py-1 text-center' : `rounded-xl px-3 ${compact ? 'py-1.5' : 'py-2'}`
              }`}
            >
              <div className={`flex items-center ${kiosk ? 'justify-center gap-0.5 mb-0' : 'gap-1.5 mb-0.5'}`}>
                <span className={`${kiosk ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full shrink-0 ${mark ? palette.dot : esProximo ? palette.dot + ' animate-pulse' : 'bg-slate-600'}`} />
                <p className={`${kiosk ? 'text-[7px]' : 'text-[9px]'} font-bold uppercase tracking-wide truncate`}>
                  {kiosk ? slot.short.split(' ')[0] : slot.short}
                </p>
              </div>
              <p className={`${kiosk ? 'text-[10px] mt-0.5' : compact ? 'text-xs' : 'text-sm'} font-mono font-black leading-none`}>
                {kiosk ? formatTime(mark?.fechaHora).replace(/:\d{2}$/, '') : formatTime(mark?.fechaHora)}
              </p>
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="text-center">
          {info.completado && tieneDatos ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Día completo{empleadoId ? ` · ${empleadoId}` : ''}
            </span>
          ) : info.proxima ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-300 bg-blue-950/40 border border-blue-500/30 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {tieneDatos ? 'Siguiente al escanear' : 'Al escanear registra'}: {info.proxima.label}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500">
              Escanea tu QR para registrar marcaciones
            </span>
          )}
          {info.permiteOmitirAlmuerzo && !info.completado && (
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Tras la salida podrás marcar fin de horas extras
            </p>
          )}
        </div>
      )}
    </div>
  );
}
