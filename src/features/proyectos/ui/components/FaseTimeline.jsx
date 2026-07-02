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
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-max px-2 py-2">
        {filteredFases.map((fase, idx) => {
          const { esActual, esCompletada, esVista } = getFaseState(
            fase, idx, faseActual, fases, faseVista, filteredFases,
          );
          const Icon = ICON_MAP[fase.icon] || FileText;
          const esUltima = idx === filteredFases.length - 1;

          return (
            <div key={fase.id} className="flex items-start">
              <button
                type="button"
                onClick={() => onFaseClick?.(fase.id)}
                className="flex flex-col items-center gap-1.5 transition-transform cursor-pointer hover:scale-105"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                    ${esCompletada
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : esActual
                        ? 'border-current text-current'
                        : 'bg-slate-100 border-slate-300 text-slate-400'
                    } ${esVista ? 'ring-4 ring-offset-2 scale-110 shadow-lg z-10' : 'hover:scale-105 z-0'}
                    ${esVista && esCompletada && !esActual ? 'ring-blue-400 border-blue-500 bg-blue-50 text-blue-600' : ''}`}
                  style={(esActual || (esVista && !esCompletada))
                    ? { borderColor: fase.color, color: fase.color, backgroundColor: fase.bgColor }
                    : undefined}
                >
                  {esCompletada
                    ? <CheckCircle size={16} strokeWidth={2.5} />
                    : <Icon size={15} strokeWidth={2} />}
                </div>

                <div className="flex flex-col items-center mt-1">
                  <span
                    className={`text-xs font-semibold text-center leading-tight max-w-[68px]
                      ${esVista && esCompletada && !esActual ? 'text-blue-600 font-bold' : esCompletada ? 'text-emerald-600' : esActual ? 'font-bold' : 'text-slate-400'}`}
                    style={(esActual || (esVista && !esCompletada)) ? { color: fase.color } : undefined}
                  >
                    {fase.label}
                  </span>
                  {esVista && !esActual && (
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5 animate-pulse bg-blue-50 px-1.5 py-0.5 rounded">
                      Viendo
                    </span>
                  )}
                </div>
              </button>

              {!esUltima && (
                <div className="flex items-start mt-4 mx-1">
                  <div className={`w-10 h-0.5 ${esCompletada ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                </div>
              )}
            </div>
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
