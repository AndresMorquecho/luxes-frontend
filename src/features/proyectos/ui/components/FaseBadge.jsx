// src/features/proyectos/ui/components/FaseBadge.jsx

import React from 'react';
import {
  FileText, Pen, Printer, Wrench, CheckCircle, Star
} from 'lucide-react';
import { getFaseConfig } from '../../domain/value-objects/FaseConfig.js';

const ICON_MAP = {
  FileText, Pen, Printer, Wrench, CheckCircle, Star,
};

/**
 * Badge visual para mostrar la fase actual de un proyecto.
 * Colores y etiquetas se toman de FaseConfig.
 *
 * @param {{ faseId: string, size?: 'sm' | 'md' }} props
 */
export function FaseBadge({ faseId, proyecto, size = 'sm' }) {
  const isSm = size === 'sm';

  if (proyecto?.medio === 'ALUX' || proyecto?.fasesAlux) {
    const fases = proyecto.fasesAlux || [];
    const totalFases = fases.length || 5;
    const allDone = fases.length > 0 && fases.every(f => f.estado === 'COMPLETADA');
    
    let activeIndex = fases.findIndex(f => f.estado === 'EN_PROGRESO');
    if (activeIndex < 0) {
      activeIndex = fases.findIndex(f => f.estado === 'PENDIENTE');
    }
    const currentNum = activeIndex >= 0 ? activeIndex + 1 : (allDone ? totalFases : 1);

    if (allDone || proyecto.estado === 'COMPLETADO') {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-extrabold border bg-emerald-50 text-emerald-700 border-emerald-200
            ${isSm ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'}`}
        >
          <CheckCircle size={isSm ? 11 : 13} strokeWidth={2.5} />
          Completado
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-extrabold border bg-blue-50 text-blue-700 border-blue-200
          ${isSm ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'}`}
      >
        <Star size={isSm ? 11 : 13} strokeWidth={2.5} />
        Fase {currentNum} / {totalFases}
      </span>
    );
  }

  const config = getFaseConfig(faseId);
  if (!config) return null;

  const Icon = ICON_MAP[config.icon] || FileText;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border
        ${isSm ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        borderColor: config.color + '40',
      }}
    >
      <Icon size={isSm ? 11 : 13} strokeWidth={2.5} />
      {config.label}
    </span>
  );
}
