// src/features/proyectos/ui/components/FaseTimeline.jsx

import React, { useEffect, useState } from 'react';
import { CheckCircle, FileText, Pen, Printer, Wrench, Star } from 'lucide-react';
import { FASES } from '../../domain/value-objects/FaseConfig.js';

const ICON_MAP = { FileText, Pen, Printer, Wrench, CheckCircle, Star };

function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (event) => setIsMobile(event.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}

function getFaseState(fase, idx, faseActual, fases, faseVista, filteredFases) {
  const idxActual = filteredFases.findIndex((f) => f.id === faseActual);
  const esActual = fase.id === faseActual;
  const esCompletada = fases[fase.id]?.completada === true || idx < idxActual;
  const esVista = fase.id === (faseVista || faseActual);
  return { esActual, esCompletada, esVista };
}

function DesktopTimeline({ filteredFases, faseActual, fases, faseVista, onFaseClick }) {
  return (
    <div className="w-full px-1 sm:px-2 pt-1 pb-2">
      <div className="flex items-start w-full">
        {filteredFases.map((fase, idx) => {
          const { esActual, esCompletada, esVista } = getFaseState(
            fase, idx, faseActual, fases, faseVista, filteredFases,
          );
          const Icon = ICON_MAP[fase.icon] || FileText;
          const esUltima = idx === filteredFases.length - 1;
          const accent = esVista || esActual;

          return (
            <React.Fragment key={fase.id}>
              <button
                type="button"
                onClick={() => onFaseClick?.(fase.id)}
                className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 w-[72px] sm:w-[88px] focus:outline-none group"
              >
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-[2.5px] bg-white transition-all
                    ${esCompletada && !esVista
                      ? 'border-emerald-400 text-emerald-500'
                      : accent
                        ? ''
                        : 'border-slate-200 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-500'
                    }`}
                  style={accent
                    ? {
                        borderColor: fase.color,
                        color: fase.color,
                        boxShadow: esVista ? `0 0 0 3px ${fase.bgColor}` : undefined,
                      }
                    : undefined}
                >
                  {esCompletada && !esVista
                    ? <CheckCircle size={18} strokeWidth={2.25} />
                    : <Icon size={17} strokeWidth={2} />}
                </div>

                <div className="flex flex-col items-center min-h-[36px]">
                  <span
                    className={`text-[11px] sm:text-xs font-semibold text-center leading-tight
                      ${esCompletada && !esVista ? 'text-emerald-600' : accent ? '' : 'text-slate-400'}`}
                    style={accent ? { color: fase.color } : undefined}
                  >
                    {fase.label}
                  </span>
                  {esVista && !esActual && (
                    <span className="mt-1 text-[9px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full">
                      Viendo
                    </span>
                  )}
                </div>
              </button>

              {!esUltima && (
                <div className="flex-1 self-start mt-[20px] sm:mt-[22px] mx-1 min-w-[12px]">
                  <div
                    className={`w-full border-t border-dashed ${
                      esCompletada ? 'border-emerald-300' : 'border-slate-300'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function MobileTimeline({ filteredFases, faseActual, fases, faseVista, onFaseClick }) {
  return (
    <div className="p-1 bg-slate-50 border border-slate-200/80 rounded-2xl">
      <div className="grid grid-cols-2 gap-2">
        {filteredFases.map((fase, idx) => {
          const { esActual, esCompletada, esVista } = getFaseState(
            fase, idx, faseActual, fases, faseVista, filteredFases,
          );

          return (
            <button
              key={fase.id}
              type="button"
              onClick={() => onFaseClick?.(fase.id)}
              className={`flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all focus:outline-none
                ${fase.id === 'COMPLETADO' ? 'col-span-2' : ''}
                ${esVista
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : esCompletada
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/50'
                    : esActual
                      ? 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50/30'
                      : 'bg-white border-slate-200 text-slate-400 opacity-60'
                }`}
            >
              {esCompletada ? (
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-current shrink-0" />
              )}
              <span className="truncate">{fase.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Timeline horizontal con las fases del proyecto.
 * Solo monta una variante (desktop o móvil) para evitar errores de reconciliación de React.
 */
export function FaseTimeline({
  faseActual,
  fases = {},
  onFaseClick,
  faseVista,
  requiereInstalacion = true,
}) {
  const isMobile = useIsMobile();
  const filteredFases = FASES.filter(
    (f) => (f.id !== 'INSTALACION' || requiereInstalacion)
      && (f.id !== 'ENTREGA' || !requiereInstalacion),
  );

  const props = { filteredFases, faseActual, fases, faseVista, onFaseClick };

  return isMobile ? <MobileTimeline {...props} /> : <DesktopTimeline {...props} />;
}
