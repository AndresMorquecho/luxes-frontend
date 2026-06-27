import React from 'react';
import { SECUENCIA_MARCACIONES } from '../../../helpers/asistenciaHelpers';

export const StepIndicator = ({ proximaTipo, marcaciones = [] }) => {
  const tiposRegistrados = new Set(marcaciones.map((m) => m.tipo));

  return (
    <div className="flex items-center justify-center gap-0 mb-5 sm:mb-7">
      {SECUENCIA_MARCACIONES.map((m, i) => {
        const completado = tiposRegistrados.has(m.tipo);
        const activo = !completado && proximaTipo === m.tipo;
        const omitido =
          m.tipo === 'INICIO_ALMUERZO' || m.tipo === 'FIN_ALMUERZO'
            ? tiposRegistrados.has('SALIDA') && !completado
            : false;

        return (
          <React.Fragment key={m.tipo}>
            <div className="flex flex-col items-center gap-1.5 sm:gap-2">
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all duration-300 ${
                  completado
                    ? 'bg-blue-500 text-white shadow-md'
                    : omitido
                      ? 'bg-gray-50 text-gray-300 border border-dashed border-gray-300'
                      : activo
                        ? 'bg-white text-blue-600 ring-2 ring-blue-400 shadow-md'
                        : 'bg-gray-100 text-gray-300'
                }`}
              >
                {completado ? (
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : omitido ? (
                  <span className="text-[8px]">—</span>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-[8px] sm:text-[10px] font-semibold text-center leading-tight hidden sm:block ${
                completado ? 'text-blue-600' : omitido ? 'text-gray-300 line-through' : activo ? 'text-blue-600' : 'text-gray-300'
              }`}>
                {m.label}
              </span>
              <span className={`text-[7px] font-semibold text-center leading-tight sm:hidden ${
                completado ? 'text-blue-600' : omitido ? 'text-gray-300' : activo ? 'text-blue-600' : 'text-gray-300'
              }`}>
                {m.tipo === 'INICIO_ALMUERZO' ? 'Alm.' : m.tipo === 'FIN_ALMUERZO' ? 'Vuelta' : m.tipo === 'ENTRADA' ? 'Ent.' : 'Sal.'}
              </span>
            </div>
            {i < SECUENCIA_MARCACIONES.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-1 sm:mx-1.5 mt-[-1.25rem] ${
                  completado ? 'bg-blue-400' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
