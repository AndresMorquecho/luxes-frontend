// src/features/proyectos/ui/components/ProyectoRow.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, PenLine, Trash2 } from 'lucide-react';
import { getFaseConfig } from '../../domain/value-objects/FaseConfig.js';
import { PRIORIDADES_CONFIG } from '../../domain/value-objects/EstadoProyecto.js';
import { calcularDiasDesde } from '../../domain/utils/proyectoDates.js';
import { proyectoEstaVencido } from '../../domain/proyectoDisplayUtils.js';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';
import { FaseBadge } from './FaseBadge.jsx';
import { ProgressBar } from './ProgressBar.jsx';

/**
 * Fila de proyecto para la vista de lista/tabla.
 *
 * @param {{ proyecto: object, onEditarFase?: function }} props
 */
export function ProyectoRow({ proyecto, onEditarFase, onEliminar }) {
  const navigate = useNavigate();
  const faseConfig = getFaseConfig(proyecto.faseActual);
  const prioridadConfig = PRIORIDADES_CONFIG[proyecto.prioridad] || PRIORIDADES_CONFIG.MEDIA;

  const estaVencido = proyectoEstaVencido(proyecto);

  const diasTranscurridos = calcularDiasDesde(proyecto.fechaInicio || proyecto.fechaCreacion);

  return (
    <tr
      className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
    >
      {/* Indicador de color de fase + Proyecto */}
      <td className="pl-0 pr-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-1 h-12 rounded-full shrink-0"
            style={{ backgroundColor: faseConfig?.color || '#94a3b8' }}
          />
          <PersonInitialsAvatar name={proyecto.nombre} seed={proyecto.id} size="sm" />
          <div className="min-w-0 flex-1">
            <button
              className="font-semibold text-slate-800 text-sm hover:text-blue-700 text-left line-clamp-1"
              onClick={() => navigate(`/proyectos/${proyecto.id}`)}
            >
              {proyecto.nombre}
            </button>
            <p className="text-xs text-slate-500 truncate">{proyecto.cliente.empresa}</p>
            {proyecto.etiquetas?.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {proyecto.etiquetas.map((tag) => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Responsable */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <PersonInitialsAvatar name={proyecto.responsable} seed={proyecto.responsable} size="xs" />
          <span className="text-xs text-slate-700 truncate max-w-[100px] normal-case">{proyecto.responsable}</span>
        </div>
      </td>

      {/* Fase */}
      <td className="px-4 py-3">
        <FaseBadge faseId={proyecto.faseActual} />
      </td>

      {/* Progreso */}
      <td className="px-4 py-3 min-w-[120px]">
        <ProgressBar progreso={proyecto.progreso} faseActual={proyecto.faseActual} showLabel />
      </td>

      {/* Días */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm text-slate-600">{diasTranscurridos}d</span>
      </td>

      {/* Fecha entrega */}
      <td className="px-4 py-3">
        <div className={`flex items-center gap-1 text-xs font-medium ${estaVencido ? 'text-red-500' : 'text-slate-600'}`}>
          {estaVencido && <AlertTriangle size={12} />}
          {proyecto.fechaEntregaEstimada || '—'}
        </div>
      </td>

      {/* Prioridad */}
      <td className="px-4 py-3">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: prioridadConfig.bgColor, color: prioridadConfig.textColor }}
        >
          {prioridadConfig.label}
        </span>
      </td>

      {/* Acciones */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
            title="Ver detalle"
            onClick={() => navigate(`/proyectos/${proyecto.id}`)}
          >
            <Eye size={15} />
          </button>
          {onEditarFase && (
            <button
              className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-500 transition-colors"
              title="Editar fase"
              onClick={() => onEditarFase(proyecto)}
            >
              <PenLine size={15} />
            </button>
          )}
          {onEliminar && (
            <button
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
              title="Eliminar proyecto"
              onClick={() => onEliminar(proyecto)}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
