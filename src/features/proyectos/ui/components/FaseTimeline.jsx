// src/features/proyectos/ui/components/FaseTimeline.jsx

import React from 'react';
import { CheckCircle, FileText, Pen, Printer, Wrench, Star } from 'lucide-react';
import { FASES } from '../../domain/value-objects/FaseConfig.js';

const ICON_MAP = { FileText, Pen, Printer, Wrench, CheckCircle, Star };

/**
 * Timeline horizontal con las 6 fases del proyecto.
 * - Completadas: check verde
 * - Actual: resaltada con el color de la fase
 * - Pendientes: gris
 *
 * @param {{ faseActual: string, fases: object, onFaseClick?: function, faseVista?: string }} props
 */
export function FaseTimeline({ faseActual, fases = {}, onFaseClick, faseVista, requiereInstalacion = true }) {
  const filteredFases = FASES.filter(f => 
    (f.id !== 'INSTALACION' || requiereInstalacion) && 
    (f.id !== 'ENTREGA' || !requiereInstalacion)
  );

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-max px-2 py-2">
        {filteredFases.map((fase, idx) => {
          const esActual = fase.id === faseActual;
          const esCompletada = fases[fase.id]?.completada === true;
          const esFutura = !esActual && !esCompletada;
          const Icon = ICON_MAP[fase.icon] || FileText;
          const esUltima = idx === filteredFases.length - 1;

          const esVista = fase.id === (faseVista || faseActual);
          const clickable = esCompletada || esActual;

          return (
            <div key={fase.id} className="flex items-start">
              {/* Paso */}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onFaseClick && onFaseClick(fase.id)}
                className={`flex flex-col items-center gap-1.5 transition-transform ${clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
              >
                {/* Círculo */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                    ${esCompletada
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : esActual
                      ? 'border-current text-current'
                      : 'bg-slate-100 border-slate-300 text-slate-400'
                    } ${esVista ? 'ring-4 ring-offset-2 scale-110 shadow-lg z-10' : 'hover:scale-105 z-0'}
                    ${esVista && esCompletada && !esActual ? 'ring-blue-400 border-blue-500 bg-blue-50 text-blue-600' : ''}
                    `}
                  style={(esActual || (esVista && !esCompletada)) ? { borderColor: fase.color, color: fase.color, backgroundColor: fase.bgColor } : (esVista && esCompletada && !esActual) ? {} : {}}
                >
                  {esCompletada
                    ? <CheckCircle size={16} strokeWidth={2.5} />
                    : <Icon size={15} strokeWidth={2} />
                  }
                </div>

                {/* Etiqueta */}
                <div className="flex flex-col items-center mt-1">
                  <span
                    className={`text-xs font-medium text-center leading-tight max-w-[68px]
                      ${esVista && esCompletada && !esActual ? 'text-blue-600 font-bold' : esCompletada ? 'text-emerald-600' : esActual ? 'font-bold' : 'text-slate-400'}`}
                    style={(esActual || (esVista && !esCompletada)) ? { color: fase.color } : {}}
                  >
                    {fase.label}
                  </span>
                  {esVista && !esActual && (
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5 animate-pulse bg-blue-50 px-1.5 py-0.5 rounded">Viendo</span>
                  )}
                </div>
              </button>

              {/* Conector */}
              {!esUltima && (
                <div className="flex items-start mt-4 mx-1">
                  <div
                    className={`w-10 h-0.5 ${esCompletada ? 'bg-emerald-400' : 'bg-slate-200'}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
