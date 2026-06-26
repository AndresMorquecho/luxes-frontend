// src/features/proyectos/ui/components/ProyectoCard.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Trash2 } from 'lucide-react';
import { getFaseConfig } from '../../domain/value-objects/FaseConfig.js';
import { PRIORIDADES_CONFIG } from '../../domain/value-objects/EstadoProyecto.js';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';
import { FaseBadge } from './FaseBadge.jsx';
import { ProgressBar } from './ProgressBar.jsx';

/**
 * Card de proyecto para la vista Kanban.
 *
 * @param {{ proyecto: object, onEditarFase?: function }} props
 */
export function ProyectoCard({ proyecto, onEditarFase, onEliminar }) {
  const navigate = useNavigate();
  const faseConfig = getFaseConfig(proyecto.faseActual);
  const prioridadConfig = PRIORIDADES_CONFIG[proyecto.prioridad] || PRIORIDADES_CONFIG.MEDIA;

  const estaVencido =
    proyecto.fechaEntregaEstimada &&
    proyecto.estado !== 'COMPLETADO' &&
    new Date(proyecto.fechaEntregaEstimada) < new Date();

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      style={{ borderLeftColor: faseConfig?.color, borderLeftWidth: 4 }}
      onClick={() => navigate(`/proyectos/${proyecto.id}`)}
    >
      <div className="p-4">
        {/* Nombre + prioridad */}
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">
            {proyecto.nombre}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: prioridadConfig.bgColor, color: prioridadConfig.textColor }}
            >
              {prioridadConfig.label}
            </span>
            {onEliminar && (
              <button
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Eliminar proyecto"
                onClick={(e) => {
                  e.stopPropagation();
                  onEliminar(proyecto);
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Cliente */}
        <p className="text-xs text-slate-500 mb-3 truncate">{proyecto.cliente.empresa}</p>

        {/* Progreso */}
        <ProgressBar progreso={proyecto.progreso} faseActual={proyecto.faseActual} showLabel />

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          {/* Responsable */}
          <PersonInitialsAvatar name={proyecto.responsable} seed={proyecto.responsable} size="xs" />

          {/* Fecha */}
          <div className={`flex items-center gap-1 text-xs ${estaVencido ? 'text-red-500' : 'text-slate-400'}`}>
            {estaVencido && <AlertTriangle size={11} />}
            <Calendar size={11} />
            <span>{proyecto.fechaEntregaEstimada || '—'}</span>
          </div>
        </div>
      </div>

      {/* Acción editar fase */}
      {onEditarFase && (
        <button
          className="w-full py-2 text-xs font-semibold text-center border-t border-slate-100 text-slate-500 hover:bg-slate-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); onEditarFase(proyecto); }}
        >
          Editar fase
        </button>
      )}
    </div>
  );
}
