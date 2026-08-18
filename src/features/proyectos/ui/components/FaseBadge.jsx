// src/features/proyectos/ui/components/FaseBadge.jsx

import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Badge visual para mostrar si el proyecto está En proceso o Finalizado.
 *
 * @param {{ faseId?: string, proyecto?: object, size?: 'sm' | 'md' }} props
 */
export function FaseBadge({ faseId, proyecto, size = 'sm' }) {
  const isSm = size === 'sm';

  const isFinalizado = Boolean(
    proyecto?.estado === 'COMPLETADO' ||
    proyecto?.estado === 'Finalizado' ||
    proyecto?.faseActual === 'COMPLETADO' ||
    (proyecto?.fasesAlux && Array.isArray(proyecto.fasesAlux) && proyecto.fasesAlux.some(
      (f) =>
        (f.nombre?.toLowerCase().includes('finaliz') ||
          f.nombre?.toLowerCase().includes('complet') ||
          f.nombre?.toLowerCase().includes('entrega')) &&
        f.estado === 'COMPLETADA'
    ))
  );

  if (isFinalizado) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full font-bold border bg-emerald-50 text-emerald-700 border-emerald-200
          ${isSm ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'}`}
      >
        <CheckCircle size={isSm ? 12 : 14} strokeWidth={2.5} />
        Finalizado
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border bg-blue-50 text-blue-700 border-blue-200
        ${isSm ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1'}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
      En proceso
    </span>
  );
}

