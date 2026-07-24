// src/features/proyectos/ui/pages/ProyectosPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, LayoutList, LayoutGrid,
  Layers, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { useProyectos } from '../../application/hooks/useProyectos.js';
import { alertDialog } from '../../../../shared/ui/components/ConfirmModal';
import { FASES } from '../../domain/value-objects/FaseConfig.js';
import { ProyectoRow } from '../components/ProyectoRow.jsx';
import { ProyectoCard } from '../components/ProyectoCard.jsx';

const PRIORIDADES = ['TODAS', 'BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

export default function ProyectosPage() {
  const navigate = useNavigate();
  const {
    proyectos,
    filtros, setFiltros,
    estadisticas,
    responsablesUnicos,
    deleteProyecto,
  } = useProyectos();

  const [vista, setVista] = useState('lista');
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  async function handleConfirmEliminar() {
    if (!proyectoAEliminar) return;
    setEliminandoId(proyectoAEliminar.id);
    try {
      await deleteProyecto(proyectoAEliminar.id);
      setProyectoAEliminar(null);
    } catch (err) {
      await alertDialog('Error', 'Error al eliminar el proyecto: ' + err.message, { type: 'warning' });
    } finally {
      setEliminandoId(null);
    }
  }

  function updateFiltro(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const kpiCards = [
    { label: 'Total proyectos', value: estadisticas.total, border: 'border-t-blue-600', color: 'text-blue-600' },
    { label: 'En producción', value: estadisticas.enProduccion, border: 'border-t-indigo-500', color: 'text-indigo-600' },
    { label: 'En instalación', value: estadisticas.enInstalacion, border: 'border-t-amber-500', color: 'text-amber-600' },
    { label: 'Completados', value: estadisticas.completadosMes, border: 'border-t-emerald-500', color: 'text-emerald-600' },
  ];

  const inputClass =
    'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

  return (
    <div className="space-y-3 sm:space-y-5 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .proj-desktop-only { display: block; }
        .proj-mobile-only { display: none; }
        .proj-filters-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: end;
          width: 100%;
        }
        .proj-filter-search { flex: 2; min-width: 240px; }
        .proj-filter-select { flex: 1; min-width: 140px; }
        @media (max-width: 768px) {
          .proj-desktop-only { display: none !important; }
          .proj-mobile-only { display: block !important; }
          .proj-filters-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .proj-filter-search { grid-column: 1 / -1 !important; width: 100% !important; }
          .proj-filter-select { width: 100% !important; min-width: 0 !important; }
          .proj-filter-fase,
          .proj-filter-responsable,
          .proj-filter-instalacion { grid-column: 1 / -1 !important; }
        }
      `}</style>

      {/* Header + tabs de vista */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <Layers className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Proyectos</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Producción
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Seguimiento del ciclo de vida de los proyectos
              </p>
            </div>
          </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => navigate('/proyectos/reclamos')}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-3.5 sm:px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
              >
                <ShieldAlert size={16} className="shrink-0" />
                <span className="sm:hidden">Reclamos</span>
                <span className="hidden sm:inline">Reclamos Post-Venta</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/proyectos/nuevo')}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-3.5 sm:px-4 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm"
              >
                <Plus size={15} className="shrink-0" />
                Nuevo proyecto
              </button>
            </div>
        </div>

        <div className="px-4 sm:px-5 pb-4 flex gap-1 border-t border-slate-100 pt-3 bg-slate-50/50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setVista('lista')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              vista === 'lista'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            <LayoutList size={15} />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setVista('kanban')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              vista === 'kanban'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            <LayoutGrid size={15} />
            Kanban
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-2 sm:gap-3">
        {kpiCards.map(({ label, value, border, color }) => (
          <div key={label} className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${border} px-4 py-4`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-bold mt-1 tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
        <div className="proj-filters-container">
          <div className="relative proj-filter-search">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Búsqueda</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Buscar proyecto, cliente..."
                value={filtros.busqueda}
                onChange={(e) => updateFiltro('busqueda', e.target.value)}
              />
            </div>
          </div>

          <div className="proj-filter-select proj-filter-fase">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fase</label>
            <select
              className={inputClass}
              value={filtros.fase}
              onChange={(e) => updateFiltro('fase', e.target.value)}
            >
              <option value="TODAS">Todas las fases</option>
              {FASES.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="proj-filter-select proj-filter-responsable">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Responsable</label>
            <select
              className={inputClass}
              value={filtros.responsable}
              onChange={(e) => updateFiltro('responsable', e.target.value)}
            >
              <option value="TODOS">Todos</option>
              {responsablesUnicos.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="proj-filter-select proj-filter-prioridad">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Prioridad</label>
            <select
              className={inputClass}
              value={filtros.prioridad}
              onChange={(e) => updateFiltro('prioridad', e.target.value)}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>{p === 'TODAS' ? 'Todas' : p}</option>
              ))}
            </select>
          </div>

          <div className="proj-filter-select proj-filter-instalacion">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Instalación</label>
            <select
              className={inputClass}
              value={filtros.instalacion}
              onChange={(e) => updateFiltro('instalacion', e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="SI">Con instalación</option>
              <option value="NO">Sin instalación</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vista lista */}
      {vista === 'lista' && (
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">
              {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
            </p>
          </div>
          {proyectos.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 font-medium text-sm">No se encontraron proyectos</p>
              <p className="text-xs text-slate-400 mt-1">Prueba ajustando los filtros</p>
            </div>
          ) : (
            <>
              <div className="proj-desktop-only">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                        <th className="text-left pl-2 pr-4 py-3 w-[24%]">Proyecto</th>
                        <th className="text-left px-4 py-3 w-[14%]">Responsable</th>
                        <th className="text-left px-4 py-3 w-[12%]">Fase</th>
                        <th className="text-left px-4 py-3 w-[11%]">Instalación</th>
                        <th className="text-left px-4 py-3 w-[13%]">Progreso</th>
                        <th className="text-center px-4 py-3 w-[6%]">Días</th>
                        <th className="text-left px-4 py-3 w-[11%]">Entrega</th>
                        <th className="text-left px-4 py-3 w-[8%]">Prioridad</th>
                        <th className="px-4 py-3 w-[7%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyectos.map((p) => (
                        <ProyectoRow
                          key={p.id}
                          proyecto={p}
                          onEditarFase={(p) => navigate(`/proyectos/${p.id}`)}
                          onEliminar={(p) => setProyectoAEliminar(p)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="proj-mobile-only p-4">
                <div className="grid grid-cols-1 gap-3">
                  {proyectos.map((p) => (
                    <ProyectoCard
                      key={p.id}
                      proyecto={p}
                      onEditarFase={(p) => navigate(`/proyectos/${p.id}`)}
                      onEliminar={(p) => setProyectoAEliminar(p)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Vista kanban */}
      {vista === 'kanban' && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {FASES.map((fase) => {
              const proyectosFase = proyectos.filter((p) => p.faseActual === fase.id);
              return (
                <div key={fase.id} className="w-64 flex-shrink-0">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 border border-slate-200 bg-white">
                    <span className="text-sm font-semibold text-slate-700">{fase.label}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {proyectosFase.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {proyectosFase.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white">
                        Sin proyectos
                      </div>
                    ) : (
                      proyectosFase.map((p) => (
                        <ProyectoCard
                          key={p.id}
                          proyecto={p}
                          onEditarFase={(p) => navigate(`/proyectos/${p.id}`)}
                          onEliminar={(p) => setProyectoAEliminar(p)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {proyectoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl border border-rose-100 bg-rose-50 flex items-center justify-center shrink-0 text-rose-600">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-800">¿Eliminar proyecto?</h3>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Esta acción no se puede deshacer. Se eliminará permanentemente:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
                <p className="text-sm font-semibold text-slate-800">{proyectoAEliminar.nombre}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cliente: {proyectoAEliminar.cliente?.empresa || proyectoAEliminar.cliente?.nombre}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Se eliminará toda la información relacionada (fases, archivos, asignaciones e instalación).
              </p>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProyectoAEliminar(null)}
                disabled={!!eliminandoId}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmEliminar}
                disabled={!!eliminandoId}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {eliminandoId ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
