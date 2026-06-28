// src/features/proyectos/ui/pages/ProyectosPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, LayoutList, LayoutGrid,
  Printer, Wrench, CheckCircle, Layers,
  AlertTriangle
} from 'lucide-react';
import { useProyectos } from '../../application/hooks/useProyectos.js';
import { FASES } from '../../domain/value-objects/FaseConfig.js';
import { ProyectoRow } from '../components/ProyectoRow.jsx';
import { ProyectoCard } from '../components/ProyectoCard.jsx';

const PRIORIDADES = ['TODAS', 'BAJA', 'MEDIA', 'ALTA', 'URGENTE'];
const ESTADOS = ['TODOS', 'ACTIVO', 'PAUSADO', 'COMPLETADO', 'CANCELADO'];

export default function ProyectosPage() {
  const navigate = useNavigate();
  const {
    proyectos,
    filtros, setFiltros,
    estadisticas,
    responsablesUnicos,
    deleteProyecto,
  } = useProyectos();

  const [vista, setVista] = useState('lista'); // 'lista' | 'kanban'
  const [proyectoAEliminar, setProyectoAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  async function handleConfirmEliminar() {
    if (!proyectoAEliminar) return;
    setEliminandoId(proyectoAEliminar.id);
    try {
      await deleteProyecto(proyectoAEliminar.id);
      setProyectoAEliminar(null);
    } catch (err) {
      alert('Error al eliminar el proyecto: ' + err.message);
    } finally {
      setEliminandoId(null);
    }
  }

  function updateFiltro(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const kpiCards = [
    { label: 'Total proyectos', value: estadisticas.total, Icon: Layers, color: '#1e40af', bg: '#eff6ff' },
    { label: 'En producción', value: estadisticas.enProduccion, Icon: Printer, color: '#3b82f6', bg: '#eff6ff' },
    { label: 'En instalación', value: estadisticas.enInstalacion, Icon: Wrench, color: '#f97316', bg: '#fff7ed' },
    { label: 'Completados este mes', value: estadisticas.completadosMes, Icon: CheckCircle, color: '#059669', bg: '#ecfdf5' },
  ];

  return (
    <div className="pb-10">
      {/* Header de página */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Gestión de Proyectos</h1>
          <p className="text-sm text-slate-500">Seguimiento del ciclo de vida de los proyectos de la agencia</p>
        </div>
        <button
          onClick={() => navigate('/proyectos/nuevo')}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 shadow-sm shrink-0"
          style={{ backgroundColor: '#1d4ed8' }}
        >
          <Plus size={15} />
          Nuevo Proyecto
        </button>
      </div>

      <div className="space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(({ label, value, Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 proj-kpi-card">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 proj-kpi-icon" style={{ backgroundColor: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Barra de filtros */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
          <div className="proj-filters-container">
            {/* Buscador */}
            <div className="relative proj-filter-search">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Buscar proyecto, cliente..."
                value={filtros.busqueda}
                onChange={(e) => updateFiltro('busqueda', e.target.value)}
              />
            </div>

            {/* Filtro fase */}
            <div className="flex flex-col gap-1 proj-filter-select proj-filter-fase">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fase</label>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full"
                value={filtros.fase}
                onChange={(e) => updateFiltro('fase', e.target.value)}
              >
                <option value="TODAS">Todas las fases</option>
                {FASES.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Filtro responsable */}
            <div className="flex flex-col gap-1 proj-filter-select proj-filter-responsable">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Responsable</label>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full"
                value={filtros.responsable}
                onChange={(e) => updateFiltro('responsable', e.target.value)}
              >
                <option value="TODOS">Todos</option>
                {responsablesUnicos.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Filtro prioridad */}
            <div className="flex flex-col gap-1 proj-filter-select proj-filter-prioridad">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Prioridad</label>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full"
                value={filtros.prioridad}
                onChange={(e) => updateFiltro('prioridad', e.target.value)}
              >
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p === 'TODAS' ? 'Todas' : p}</option>
                ))}
              </select>
            </div>

            {/* Filtro estado */}
            <div className="flex flex-col gap-1 proj-filter-select proj-filter-estado">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</label>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full"
                value={filtros.estado}
                onChange={(e) => updateFiltro('estado', e.target.value)}
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e === 'TODOS' ? 'Todos' : e}</option>
                ))}
              </select>
            </div>

            {/* Toggle vista */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-auto proj-filter-views">
              <button
                onClick={() => setVista('lista')}
                className={`p-2 rounded-md transition-colors ${vista === 'lista' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                title="Vista lista"
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setVista('kanban')}
                className={`p-2 rounded-md transition-colors ${vista === 'kanban' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                title="Vista kanban"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── VISTA LISTA ── */}
        {vista === 'lista' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-semibold text-slate-600">
                {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
              </p>
            </div>
            {proyectos.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-slate-400 font-medium">No se encontraron proyectos</p>
                <p className="text-sm text-slate-300 mt-1">Prueba ajustando los filtros</p>
              </div>
            ) : (
              <>
                <div className="proj-desktop-only">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">
                          <th className="text-left pl-2 pr-4 py-3 w-[28%]">Proyecto</th>
                          <th className="text-left px-4 py-3 w-[14%]">Responsable</th>
                          <th className="text-left px-4 py-3 w-[12%]">Fase</th>
                          <th className="text-left px-4 py-3 w-[14%]">Progreso</th>
                          <th className="text-center px-4 py-3 w-[8%]">Días</th>
                          <th className="text-left px-4 py-3 w-[12%]">Entrega</th>
                          <th className="text-left px-4 py-3 w-[8%]">Prioridad</th>
                          <th className="px-4 py-3 w-[8%]"></th>
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
                  <div className="grid grid-cols-1 gap-4">
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

        {/* ── VISTA KANBAN ── */}
        {vista === 'kanban' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {FASES.map((fase) => {
                const proyectosFase = proyectos.filter((p) => p.faseActual === fase.id);
                return (
                  <div key={fase.id} className="w-64 flex-shrink-0">
                    {/* Header columna */}
                    <div
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3"
                      style={{ backgroundColor: fase.bgColor }}
                    >
                      <span className="text-sm font-bold" style={{ color: fase.color }}>
                        {fase.label}
                      </span>
                      <span
                        className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: fase.color }}
                      >
                        {proyectosFase.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-3">
                      {proyectosFase.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
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
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {proyectoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-bold">¿Eliminar proyecto?</h3>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Esta acción no se puede deshacer. Se eliminará permanentemente el proyecto:
              </p>
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 mb-4">
                <p className="text-sm font-bold text-slate-800">{proyectoAEliminar.nombre}</p>
                <p className="text-xs text-slate-500 mt-0.5">Cliente: {proyectoAEliminar.cliente?.empresa || proyectoAEliminar.cliente?.nombre}</p>
              </div>
              <p className="text-xs text-slate-400">
                Se eliminará toda la información relacionada (fases, archivos, asignaciones e instalación).
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setProyectoAEliminar(null)}
                disabled={!!eliminandoId}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmEliminar}
                disabled={!!eliminandoId}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {eliminandoId ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .proj-desktop-only { display: block; }
        .proj-mobile-only { display: none; }
        
        .proj-filters-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: end;
          width: 100%;
        }
        .proj-filter-search {
          flex: 2;
          min-width: 240px;
        }
        .proj-filter-select {
          flex: 1;
          min-width: 140px;
        }
        .proj-filter-views {
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .proj-desktop-only { display: none !important; }
          .proj-mobile-only { display: block !important; }
          
          /* KPI Cards responsive style */
          .proj-kpi-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
            padding: 10px !important;
          }
          .proj-kpi-icon {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
          }
          .proj-kpi-icon svg {
            width: 16px !important;
            height: 16px !important;
          }
          .proj-kpi-card p.text-2xl {
            font-size: 1.15rem !important;
            line-height: 1.1 !important;
          }
          .proj-kpi-card p.text-xs {
            font-size: 10px !important;
            margin-top: 2px !important;
          }
          
          /* Filters responsive grid */
          .proj-filters-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .proj-filter-search {
            grid-column: 1 / -1 !important;
            width: 100% !important;
          }
          .proj-filter-select {
            width: 100% !important;
            min-width: 0 !important;
          }
          .proj-filter-fase {
            grid-column: 1 / -1 !important;
          }
          .proj-filter-responsable {
            grid-column: 1 / -1 !important;
          }
          .proj-filter-prioridad {
            grid-column: span 1 !important;
          }
          .proj-filter-estado {
            grid-column: span 1 !important;
          }
          .proj-filter-views {
            grid-column: 1 / -1 !important;
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
            margin-top: 4px !important;
          }
          .proj-filter-views button {
            flex: 1 !important;
            display: flex !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}
