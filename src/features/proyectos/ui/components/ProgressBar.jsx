// src/features/proyectos/ui/components/ProgressBar.jsx

import React, { useEffect, useState } from 'react';

/**
 * Barra de progreso animada (relleno azul del sistema).
 *
 * @param {{ progreso: number, faseActual?: string, showLabel?: boolean, height?: string }} props
 */
export function ProgressBar({ progreso = 0, showLabel = false, height = 'h-2.5' }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(progreso));
    return () => cancelAnimationFrame(t);
  }, [progreso]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 bg-slate-100 rounded-full overflow-hidden ${height}`}>
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-slate-600 min-w-[36px] text-right">
          {progreso}%
        </span>
      )}
    </div>
  );
}
