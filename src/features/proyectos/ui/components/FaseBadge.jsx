// src/features/proyectos/ui/components/FaseBadge.jsx

import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Obtiene la información de conteo de fases dinámicas omitiendo cotización y completado.
 */
export function getProyectoFaseInfo(proyecto) {
  let fases = [];
  if (Array.isArray(proyecto?.fasesAlux) && proyecto.fasesAlux.length > 0) {
    fases = proyecto.fasesAlux;
  } else if (typeof proyecto?.fasesAlux === 'string') {
    try {
      fases = JSON.parse(proyecto.fasesAlux);
    } catch {
      fases = [];
    }
  }

  // Filtrar Cotización y Completado/Finalizado
  const operationalFases = (fases || []).filter((f) => {
    const name = (f.nombre || '').toLowerCase();
    const id = (f.id || '').toLowerCase();
    if (id === 'fase-cotizacion' || name.includes('cotizac')) return false;
    if (id === 'fase-completado' || name.includes('completad') || name.includes('finaliz')) return false;
    return true;
  });

  if (operationalFases.length === 0) {
    const enCotizacion = proyecto?.faseActual === 'COTIZACION' || proyecto?.estado === 'ACTIVO';
    return {
      faseIndex: 0,
      totalFases: 0,
      faseLabel: enCotizacion ? 'Cotización' : 'Sin fases',
      faseTitulo: enCotizacion ? 'Cotización' : 'Sin fases operativas',
      fechaLimite: proyecto?.fechaEntregaEstimada || '—',
      isFinalizado: false,
      estadoFase: enCotizacion ? 'EN_PROGRESO' : 'PENDIENTE',
    };
  }

  const totalFases = operationalFases.length;

  const isFinalizado = Boolean(
    proyecto?.estado === 'COMPLETADO' ||
    proyecto?.estado === 'Finalizado' ||
    proyecto?.faseActual === 'COMPLETADO' ||
    (operationalFases.length > 0 && operationalFases.every((f) => f.estado === 'COMPLETADA'))
  );

  if (isFinalizado) {
    return {
      faseIndex: totalFases,
      totalFases,
      faseLabel: `${totalFases} / ${totalFases}`,
      faseTitulo: operationalFases[operationalFases.length - 1]?.nombre || 'Completado',
      fechaLimite: operationalFases[operationalFases.length - 1]?.fechaFinPlan || operationalFases[operationalFases.length - 1]?.fechaFin || proyecto?.fechaEntregaEstimada || '—',
      isFinalizado: true,
    };
  }

  // Encontrar fase activa
  let activeIndex = operationalFases.findIndex((f) => f.estado === 'EN_PROGRESO');
  if (activeIndex === -1) {
    activeIndex = operationalFases.findIndex((f) => f.estado !== 'COMPLETADA');
  }
  if (activeIndex === -1) {
    activeIndex = 0;
  }

  const currentFase = operationalFases[activeIndex] || operationalFases[0];
  const faseNum = activeIndex + 1;

  return {
    faseIndex: faseNum,
    totalFases,
    faseLabel: `${faseNum} / ${totalFases}`,
    faseTitulo: currentFase?.nombre || `Fase ${faseNum}`,
    fechaLimite: currentFase?.fechaFinPlan || currentFase?.fechaFin || proyecto?.fechaEntregaEstimada || '—',
    isFinalizado: false,
    estadoFase: currentFase?.estado || 'PENDIENTE',
  };
}

/**
 * Badge visual que muestra el conteo de fase y título de la fase actual.
 *
 * @param {{ faseId?: string, proyecto?: object, size?: 'sm' | 'md' }} props
 */
export function FaseBadge({ faseId, proyecto, size = 'sm' }) {
  const isSm = size === 'sm';
  const info = getProyectoFaseInfo(proyecto);

  if (info.isFinalizado) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={`inline-flex items-center gap-1 rounded-md font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0
            ${isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
        >
          <CheckCircle size={isSm ? 11 : 13} strokeWidth={2.5} />
          {info.faseLabel}
        </span>
        <span className="text-xs font-semibold text-slate-700 truncate" title={info.faseTitulo}>
          {info.faseTitulo}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className={`inline-flex items-center gap-1 rounded-md font-extrabold border bg-blue-50 text-blue-700 border-blue-200 shrink-0
          ${isSm ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
        {info.faseLabel}
      </span>
      <span className="text-xs font-semibold text-slate-700 truncate" title={info.faseTitulo}>
        {info.faseTitulo}
      </span>
    </div>
  );
}

