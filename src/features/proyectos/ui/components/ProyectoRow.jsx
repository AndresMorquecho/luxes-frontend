// src/features/proyectos/ui/components/ProyectoRow.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, PenLine, Trash2, Calendar } from 'lucide-react';
import { getFaseConfig } from '../../domain/value-objects/FaseConfig.js';
import { PRIORIDADES_CONFIG } from '../../domain/value-objects/EstadoProyecto.js';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';
import { FaseBadge, getProyectoFaseInfo } from './FaseBadge.jsx';

/**
 * Fila de proyecto para la vista de lista/tabla.
 *
 * @param {{ proyecto: object, onEditarFase?: function }} props
 */
export function ProyectoRow({ proyecto, onEditarFase, onEliminar, isAdmin = true }) {
  const navigate = useNavigate();
  const faseConfig = getFaseConfig(proyecto.faseActual);
  const prioridadConfig = PRIORIDADES_CONFIG[proyecto.prioridad] || PRIORIDADES_CONFIG.MEDIA;
  const faseInfo = getProyectoFaseInfo(proyecto);

  return (
    <tr
      className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
    >
      {/* Indicador de color de fase + Proyecto */}
      <td className="pl-3 pr-2 py-3 overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0 w-full overflow-hidden">
          <div
            className="w-1 h-10 rounded-full shrink-0"
            style={{ backgroundColor: faseConfig?.color || '#94a3b8' }}
          />
          <PersonInitialsAvatar name={proyecto.nombre} seed={proyecto.id} size="sm" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <button
              className="block w-full font-semibold text-slate-800 text-xs sm:text-sm hover:text-blue-700 text-left truncate overflow-hidden cursor-pointer"
              onClick={() => navigate(`/proyectos/${proyecto.id}`)}
              title={proyecto.nombre}
            >
              {proyecto.nombre}
            </button>
            <p className="text-[11px] text-slate-500 truncate block w-full overflow-hidden" title={proyecto.cliente?.empresa || proyecto.cliente?.nombre}>
              {proyecto.cliente?.empresa || proyecto.cliente?.nombre}
            </p>
            {proyecto.etiquetas?.length > 0 && (
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {proyecto.etiquetas.map((tag) => (
                  <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded truncate max-w-[120px]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Responsable */}
      <td className="px-2 py-3 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 w-full overflow-hidden">
          <PersonInitialsAvatar name={proyecto.responsable} seed={proyecto.responsable} size="xs" />
          <span className="text-xs text-slate-700 truncate max-w-[120px] min-w-0 inline-block overflow-hidden" title={proyecto.responsable}>
            {proyecto.responsable}
          </span>
        </div>
      </td>

      {/* Fase */}
      <td className="px-2 py-3">
        <FaseBadge faseId={proyecto.faseActual} proyecto={proyecto} />
      </td>

      {/* Fecha límite de fase */}
      <td className="px-2 py-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Calendar size={12} className="text-slate-400 shrink-0" />
          <span className="truncate">{faseInfo.fechaLimite}</span>
        </div>
      </td>

      {/* Prioridad */}
      <td className="px-2 py-3 text-center">
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block"
          style={{ backgroundColor: prioridadConfig.bgColor, color: prioridadConfig.textColor }}
        >
          {prioridadConfig.label}
        </span>
      </td>

      {/* Acciones */}
      <td className="pr-3 pl-2 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
            title="Ingresar al proyecto"
            onClick={() => navigate(`/proyectos/${proyecto.id}`)}
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Ingresar</span>
          </button>
          {isAdmin && onEditarFase && (
            <button
              className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-500 transition-colors cursor-pointer"
              title="Editar fase"
              onClick={() => onEditarFase(proyecto)}
            >
              <PenLine size={15} />
            </button>
          )}
          {isAdmin && onEliminar && (
            <button
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
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
