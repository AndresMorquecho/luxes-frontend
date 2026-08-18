// src/features/proyectos/ui/components/DynamicFaseTimeline.jsx

import React from 'react';
import { CheckCircle2, FileText, Plus, Award, Clock, Circle } from 'lucide-react';

export function DynamicFaseTimeline({
  fases = [],
  activeFaseId,
  onSelectFase,
  onAddFaseClick,
  cotizacionCompletada = false,
  proyectoCompletado = false,
}) {
  // Calcular progreso
  // Cotización cuenta como 1 paso, cada fase dinámica cuenta como 1 paso
  const totalPasos = 1 + fases.length;
  let pasosCompletados = cotizacionCompletada ? 1 : 0;
  fases.forEach((f) => {
    if (f.estado === 'COMPLETADA') pasosCompletados += 1;
  });

  const porcentaje = proyectoCompletado
    ? 100
    : totalPasos > 0
    ? Math.round((pasosCompletados / totalPasos) * 100)
    : 0;

  // Determinar el label de la fase activa
  let activeFaseLabel = 'Cotización';
  if (activeFaseId === 'fase-cotizacion' || activeFaseId === 'COTIZACION') {
    activeFaseLabel = 'Cotización';
  } else if (activeFaseId === 'fase-completado' || activeFaseId === 'COMPLETADO') {
    activeFaseLabel = 'Completado';
  } else {
    const found = fases.find((f) => f.id === activeFaseId);
    if (found) activeFaseLabel = found.nombre;
  }

  const isCotizacionActive = activeFaseId === 'fase-cotizacion' || activeFaseId === 'COTIZACION';
  const isCompletadoActive = activeFaseId === 'fase-completado' || activeFaseId === 'COMPLETADO';

  return (
    <div className="w-full space-y-5">
      {/* Contenedor del Stepper Horizontal */}
      <div className="w-full overflow-x-auto pb-2 pt-1 scrollbar-thin">
        <div className="flex items-center min-w-max px-2 sm:px-4">
          
          {/* PASO 1: COTIZACIÓN */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => onSelectFase('fase-cotizacion')}
              className="flex flex-col items-center gap-1.5 cursor-pointer group transition-transform hover:scale-105"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-xs ${
                  cotizacionCompletada
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCotizacionActive
                    ? 'bg-blue-50 border-blue-600 text-blue-600 ring-4 ring-blue-100 scale-105'
                    : 'bg-slate-50 border-slate-300 text-slate-400 group-hover:border-slate-400'
                } ${isCotizacionActive && cotizacionCompletada ? 'ring-4 ring-emerald-100 scale-105' : ''}`}
              >
                {cotizacionCompletada ? (
                  <CheckCircle2 size={18} strokeWidth={2.5} />
                ) : (
                  <FileText size={16} strokeWidth={2} />
                )}
              </div>
              <span
                className={`text-xs font-bold text-center leading-tight max-w-[85px] truncate ${
                  isCotizacionActive
                    ? 'text-blue-600 font-extrabold'
                    : cotizacionCompletada
                    ? 'text-emerald-600'
                    : 'text-slate-500'
                }`}
              >
                Cotización
              </span>
            </button>

            {/* Línea conectora */}
            <div
              className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors ${
                cotizacionCompletada ? 'bg-emerald-400' : 'bg-slate-200'
              }`}
            />
          </div>

          {/* PASOS DINÁMICOS */}
          {fases.map((fase, idx) => {
            const isFaseActive = activeFaseId === fase.id;
            const isDone = fase.estado === 'COMPLETADA';
            const inProgress = fase.estado === 'EN_PROGRESO';

            return (
              <div key={fase.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onSelectFase(fase.id)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group transition-transform hover:scale-105"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-xs ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isFaseActive
                        ? 'bg-blue-50 border-blue-600 text-blue-600 ring-4 ring-blue-100 scale-105'
                        : inProgress
                        ? 'bg-blue-50/60 border-blue-400 text-blue-600'
                        : 'bg-slate-50 border-slate-300 text-slate-400 group-hover:border-slate-400'
                    } ${isFaseActive && isDone ? 'ring-4 ring-emerald-100 scale-105' : ''}`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                    ) : inProgress ? (
                      <Clock size={16} strokeWidth={2.2} className="animate-pulse" />
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold text-center leading-tight max-w-[90px] truncate ${
                      isFaseActive
                        ? 'text-blue-600 font-extrabold'
                        : isDone
                        ? 'text-emerald-600'
                        : inProgress
                        ? 'text-blue-600'
                        : 'text-slate-500'
                    }`}
                    title={fase.nombre}
                  >
                    {fase.nombre}
                  </span>
                </button>

                {/* Línea conectora */}
                <div
                  className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors ${
                    isDone ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />
              </div>
            );
          })}

          {/* BOLITA CON UN (+) PARA AGREGAR NUEVA FASE */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={onAddFaseClick}
              className="flex flex-col items-center gap-1.5 cursor-pointer group transition-transform hover:scale-110"
              title="Crear nueva fase"
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-blue-400 bg-blue-50/50 text-blue-600 group-hover:bg-blue-100 group-hover:border-blue-600 flex items-center justify-center transition-all shadow-xs">
                <Plus size={18} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 text-center leading-tight">
                + Fase
              </span>
            </button>

            {/* Línea conectora hacia Completado */}
            <div
              className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors ${
                proyectoCompletado ? 'bg-emerald-400' : 'bg-slate-200'
              }`}
            />
          </div>

          {/* PASO FINAL: COMPLETADO */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => onSelectFase('fase-completado')}
              className="flex flex-col items-center gap-1.5 cursor-pointer group transition-transform hover:scale-105"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-xs ${
                  proyectoCompletado
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                    : isCompletadoActive
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-700 ring-4 ring-emerald-100 scale-105'
                    : 'bg-slate-50 border-slate-300 text-slate-400 group-hover:border-slate-400'
                }`}
              >
                <Award size={18} strokeWidth={2} />
              </div>
              <span
                className={`text-xs font-bold text-center leading-tight max-w-[85px] truncate ${
                  proyectoCompletado
                    ? 'text-emerald-700 font-extrabold'
                    : isCompletadoActive
                    ? 'text-emerald-700 font-bold'
                    : 'text-slate-500'
                }`}
              >
                Completado
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* BARRA DE PROGRESO DEL PROYECTO (Estilo Imagen 2) */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-semibold text-slate-700">Progreso del proyecto</span>
          <span className="font-extrabold text-blue-600 font-mono text-sm">
            {porcentaje}% — {activeFaseLabel}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden p-0.5">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300 shadow-xs"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    </div>
  );
}
