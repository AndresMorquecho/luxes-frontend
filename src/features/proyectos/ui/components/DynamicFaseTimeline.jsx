// src/features/proyectos/ui/components/DynamicFaseTimeline.jsx

import React, { useRef, useEffect, useState } from 'react';
import { CheckCircle2, FileText, Plus, Award, Clock, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

export function DynamicFaseTimeline({
  fases = [],
  activeFaseId,
  onSelectFase,
  onAddFaseClick,
  cotizacionCompletada = false,
  proyectoCompletado = false,
  canViewCotizacion = true,
  canAddFase = true,
}) {
  const containerRef = useRef(null);
  const activeItemRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Calcular progreso
  const totalPasos = canViewCotizacion ? (1 + fases.length) : Math.max(1, fases.length);
  let pasosCompletados = (canViewCotizacion && cotizacionCompletada) ? 1 : 0;
  fases.forEach((f) => {
    if (f.estado === 'COMPLETADA') pasosCompletados += 1;
  });

  const porcentaje = proyectoCompletado
    ? 100
    : totalPasos > 0
    ? Math.round((pasosCompletados / totalPasos) * 100)
    : 0;

  // Determinar el label de la fase activa y su número de orden
  let activeFaseLabel = canViewCotizacion ? 'Cotización' : (fases[0]?.nombre || 'Fase 1');
  let activeFaseNum = 1;
  if (activeFaseId === 'fase-cotizacion' || activeFaseId === 'COTIZACION') {
    activeFaseLabel = 'Cotización';
    activeFaseNum = 1;
  } else if (activeFaseId === 'fase-completado' || activeFaseId === 'COMPLETADO') {
    activeFaseLabel = 'Completado';
    activeFaseNum = fases.length;
  } else {
    const foundIdx = fases.findIndex((f) => f.id === activeFaseId);
    if (foundIdx >= 0) {
      activeFaseLabel = fases[foundIdx].nombre;
      activeFaseNum = foundIdx + 1;
    }
  }

  const isCotizacionActive = activeFaseId === 'fase-cotizacion' || activeFaseId === 'COTIZACION';
  const isCompletadoActive = activeFaseId === 'fase-completado' || activeFaseId === 'COMPLETADO';

  // Verificar estado de scroll
  const checkScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [fases]);

  // Auto-scroll al paso activo
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeFaseId]);

  const handleScroll = (direction) => {
    if (!containerRef.current) return;
    const amount = direction === 'left' ? -160 : 160;
    containerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="w-full space-y-2 sm:space-y-2.5">
      {/* Header superior: Contador visible de fases e indicadores de scroll */}
      <div className="flex items-center justify-between text-xs gap-2 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers size={13} className="text-blue-600 shrink-0" />
          <span className="font-bold text-slate-700 text-[11px] sm:text-xs truncate">
            {isCotizacionActive
              ? 'Paso: Cotización'
              : isCompletadoActive
              ? 'Paso Final: Completado'
              : `Fase ${activeFaseNum} de ${fases.length}`}
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
            {fases.length} {fases.length === 1 ? 'fase' : 'fases'}
          </span>
        </div>

        {/* Botones de navegación táctil / scroll si hay más fases */}
        <div className="flex items-center gap-1 shrink-0">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Ver fases anteriores"
            >
              <ChevronLeft size={13} />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors cursor-pointer animate-pulse"
              title="Desliza para ver más fases"
            >
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Contenedor del Stepper Horizontal con auto-scroll y swipe fluido */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scroll-smooth touch-pan-x"
      >
        <div className="flex items-center min-w-max px-1 sm:px-2">
          
          {/* PASO 1: COTIZACIÓN (Sólo para Admin / canViewCotizacion) */}
          {canViewCotizacion && (
            <div
              ref={isCotizacionActive ? activeItemRef : null}
              className="flex items-center"
            >
              <button
                type="button"
                onClick={() => onSelectFase('fase-cotizacion')}
                className="flex flex-col items-center gap-1 cursor-pointer group transition-transform hover:scale-105"
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-xs ${
                    cotizacionCompletada
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isCotizacionActive
                      ? 'bg-blue-50 border-blue-600 text-blue-600 ring-3 sm:ring-4 ring-blue-100 scale-105'
                      : 'bg-slate-50 border-slate-300 text-slate-400 group-hover:border-slate-400'
                  } ${isCotizacionActive && cotizacionCompletada ? 'ring-3 sm:ring-4 ring-emerald-100 scale-105' : ''}`}
                >
                  {cotizacionCompletada ? (
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                  ) : (
                    <FileText size={15} strokeWidth={2} />
                  )}
                </div>
                <span
                  className={`text-[11px] sm:text-xs font-bold text-center leading-tight max-w-[80px] sm:max-w-[85px] truncate ${
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
                className={`w-6 sm:w-10 h-0.5 mx-1 transition-colors ${
                  cotizacionCompletada ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            </div>
          )}

          {/* PASOS DINÁMICOS */}
          {fases.map((fase, idx) => {
            const isFaseActive = activeFaseId === fase.id;
            const isDone = fase.estado === 'COMPLETADA';
            const inProgress = fase.estado === 'EN_PROGRESO';
            const isLast = idx === fases.length - 1;

            return (
              <div
                key={fase.id}
                ref={isFaseActive ? activeItemRef : null}
                className="flex items-center"
              >
                <button
                  type="button"
                  onClick={() => onSelectFase(fase.id)}
                  className="flex flex-col items-center gap-1 cursor-pointer group transition-transform hover:scale-105"
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-xs ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isFaseActive
                        ? 'bg-blue-50 border-blue-600 text-blue-600 ring-3 sm:ring-4 ring-blue-100 scale-105'
                        : inProgress
                        ? 'bg-blue-50/60 border-blue-400 text-blue-600'
                        : 'bg-slate-50 border-slate-300 text-slate-400 group-hover:border-slate-400'
                    } ${isFaseActive && isDone ? 'ring-3 sm:ring-4 ring-emerald-100 scale-105' : ''}`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                    ) : inProgress ? (
                      <Clock size={15} strokeWidth={2.2} className="animate-pulse" />
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] sm:text-xs font-bold text-center leading-tight max-w-[80px] sm:max-w-[90px] truncate ${
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
                {(canAddFase || !isLast) && (
                  <div
                    className={`w-6 sm:w-10 h-0.5 mx-1 transition-colors ${
                      isDone ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
                {!canAddFase && isLast && (
                  <div
                    className={`w-6 sm:w-10 h-0.5 mx-1 transition-colors ${
                      proyectoCompletado || isDone ? 'bg-emerald-400' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}

          {/* BOLITA CON UN (+) PARA AGREGAR NUEVA FASE (Solo Admin / canAddFase) */}
          {canAddFase && onAddFaseClick && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={onAddFaseClick}
                className="flex flex-col items-center gap-1 cursor-pointer group transition-transform hover:scale-110"
                title="Crear nueva fase"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-dashed border-blue-400 bg-blue-50/50 text-blue-600 group-hover:bg-blue-100 group-hover:border-blue-600 flex items-center justify-center transition-all shadow-xs">
                  <Plus size={16} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-blue-600 group-hover:text-blue-700 text-center leading-tight">
                  + Fase
                </span>
              </button>

              {/* Línea conectora hacia Completado */}
              <div
                className={`w-6 sm:w-10 h-0.5 mx-1 transition-colors ${
                  proyectoCompletado ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            </div>
          )}

          {/* PASO FINAL: COMPLETADO */}
          <div
            ref={isCompletadoActive ? activeItemRef : null}
            className="flex items-center"
          >
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
      <div className="pt-0.5">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="font-semibold text-slate-700">Progreso del proyecto</span>
          <span className="font-extrabold text-blue-600 font-mono text-xs sm:text-sm">
            {porcentaje}% — {activeFaseLabel}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/60">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300 shadow-xs"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    </div>
  );
}
