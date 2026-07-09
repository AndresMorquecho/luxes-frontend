import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileText, 
  Folder, 
  ChevronRight,
  TrendingUp,
  Percent,
  Layers,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users
} from 'lucide-react';

const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

const FASE_LABELS = {
  COTIZACION: 'Cotización',
  DISENO: 'Diseño',
  DISEÑO: 'Diseño',
  DISENIO: 'Diseño',
  APROBACION: 'Aprobación',
  PRODUCCION: 'Producción',
  INSTALACION: 'Instalación',
  ENTREGA: 'Entrega',
  COMPLETADO: 'Completado',
};

const FASE_COLORS = {
  COTIZACION: '#64748b',
  DISENO: '#8b5cf6',
  DISEÑO: '#8b5cf6',
  DISENIO: '#8b5cf6',
  APROBACION: '#f59e0b',
  PRODUCCION: '#3b82f6',
  INSTALACION: '#f97316',
  ENTREGA: '#06b6d4',
  COMPLETADO: '#10b981',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [rango, setRango] = useState('mes'); // 'hoy', 'semana', 'mes'
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const getDatesForRange = (range) => {
    const hasta = new Date();
    const desde = new Date();

    if (range === 'hoy') {
      desde.setHours(0, 0, 0, 0);
    } else if (range === 'semana') {
      desde.setDate(desde.getDate() - 7);
      desde.setHours(0, 0, 0, 0);
    } else {
      // mes
      desde.setDate(desde.getDate() - 30);
      desde.setHours(0, 0, 0, 0);
    }

    return {
      desde: desde.toISOString().split('T')[0],
      hasta: hasta.toISOString().split('T')[0]
    };
  };

  const loadData = async (rangeType) => {
    setLoading(true);
    try {
      const { desde, hasta } = getDatesForRange(rangeType);
      const data = await getDashboardSummary(desde, hasta);
      setSummary(data);
    } catch (err) {
      toast.error('Error al cargar el resumen del dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(rango);
  }, [rango]);

  if (loading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">Cargando métricas...</p>
      </div>
    );
  }

  const { kpi, usersActivity, proyectosActivos, proyectosFaseCount, recentMovements } = summary;

  // Calculo de proyectos con y sin instalación (completados y no completados)
  const instCompletados = proyectosActivos.filter(p => p.requiereInstalacion && p.faseActual === 'COMPLETADO').length;
  const instPendientes = proyectosActivos.filter(p => p.requiereInstalacion && p.faseActual !== 'COMPLETADO').length;
  const noInstCompletados = proyectosActivos.filter(p => !p.requiereInstalacion && p.faseActual === 'COMPLETADO').length;
  const noInstPendientes = proyectosActivos.filter(p => !p.requiereInstalacion && p.faseActual !== 'COMPLETADO').length;

  // Dimensiones para gráfico de Ingresos vs Gastos
  const maxVal = Math.max(kpi.ingresos, kpi.egresos, 1);
  const ingHeight = (kpi.ingresos / maxVal) * 120;
  const egrHeight = (kpi.egresos / maxVal) * 120;

  return (
    <div className="pb-16 dashboard-container max-w-[1400px] mx-auto animate-fade-in px-4 sm:px-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        .dashboard-container {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          letter-spacing: -0.01em;
        }
        .currency-val {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: -0.03em;
        }
        .custom-card {
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01), 0 10px 20px -12px rgba(0, 0, 0, 0.02);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .custom-card:hover {
          border-color: rgba(203, 213, 225, 0.9);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02), 0 12px 24px -10px rgba(0, 0, 0, 0.04);
        }
        .segment-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 8px;
          transition: all 0.15s ease;
          color: #64748b;
        }
        .segment-btn.active {
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .thin-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 99px;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Resumen de Operaciones</h1>
          <p className="text-xs font-semibold text-slate-400 mt-2">
            Perspectiva consolidada de flujos de caja, proyectos y cuentas del negocio.
          </p>
        </div>

        {/* Minimal Range Toggles */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/40 shrink-0">
          <button onClick={() => setRango('hoy')} className={`segment-btn cursor-pointer ${rango === 'hoy' ? 'active' : ''}`}>
            Hoy
          </button>
          <button onClick={() => setRango('semana')} className={`segment-btn cursor-pointer ${rango === 'semana' ? 'active' : ''}`}>
            7 días
          </button>
          <button onClick={() => setRango('mes')} className={`segment-btn cursor-pointer ${rango === 'mes' ? 'active' : ''}`}>
            Último mes
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - 5 Columns */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Card 1: Balance Neto */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Balance Neto</span>
            <div className={`p-2 rounded-xl ${kpi.balance >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'} group-hover:scale-110 transition-transform`}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-base sm:text-lg md:text-xl font-extrabold tracking-tight currency-val leading-none ${kpi.balance >= 0 ? 'text-slate-900' : 'text-rose-650'}`}>
              {kpi.balance >= 0 ? '+' : ''}{formatUSD(kpi.balance)}
            </h3>
            <p className="text-[10px] text-slate-450 mt-1 font-semibold">Saldo neto en caja</p>
          </div>
        </div>

        {/* Card 2: Ingresos */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ingresos</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-emerald-600 currency-val leading-none">
              {formatUSD(kpi.ingresos)}
            </h3>
            <p className="text-[10px] text-slate-450 mt-1 font-semibold">Cobros reales liquidados</p>
          </div>
        </div>

        {/* Card 3: Egresos */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Egresos</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-rose-600 currency-val leading-none">
              {formatUSD(kpi.egresos)}
            </h3>
            <p className="text-[10px] text-slate-450 mt-1 font-semibold">Gastos y compras pagados</p>
          </div>
        </div>

        {/* Card 4: Pendiente de Cobro */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Por Cobrar (Proformas)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-amber-650 currency-val leading-none">
              {formatUSD(kpi.totalProformasPendienteCobro || 0)}
            </h3>
            <p className="text-[10px] text-slate-455 mt-1 font-semibold">Saldo de proformas aprobadas</p>
          </div>
        </div>

        {/* Card 5: Cuentas por Pagar */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Cuentas por Pagar</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-110 transition-transform">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-violet-650 currency-val leading-none">
              {formatUSD(kpi.totalCxPPendientes || 0)}
            </h3>
            <p className="text-[10px] text-slate-455 mt-1 font-semibold">Saldos de OCs pendientes</p>
          </div>
        </div>
      </div>

      {/* Row 2: Comparativa de Caja (6/12) y Carga de Instalación (6/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
        
        {/* Comparativa de Caja (Income vs Expense Chart) */}
        <div className="lg:col-span-6 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Comparativa de Caja</h3>
            <p className="text-sm font-bold text-slate-800">Relación de Ingresos vs Egresos del periodo</p>
          </div>

          <div className="flex items-end justify-center gap-16 h-[170px] border-b border-slate-100 pb-4 mt-6">
            {/* Barra Ingresos */}
            <div className="flex flex-col items-center gap-2 w-24">
              <span className="text-xs font-bold text-emerald-600 currency-val">{formatUSD(kpi.ingresos)}</span>
              <div 
                className="bg-emerald-500 rounded-t-lg w-14 transition-all duration-500 shadow-sm" 
                style={{ height: `${Math.max(ingHeight, 6)}px` }} 
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Ingresos</span>
            </div>
            
            {/* Barra Egresos */}
            <div className="flex flex-col items-center gap-2 w-24">
              <span className="text-xs font-bold text-rose-600 currency-val">{formatUSD(kpi.egresos)}</span>
              <div 
                className="bg-rose-500 rounded-t-lg w-14 transition-all duration-500 shadow-sm" 
                style={{ height: `${Math.max(egrHeight, 6)}px` }} 
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Egresos</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mt-4 text-center">
            {kpi.ingresos >= kpi.egresos ? (
              <span className="text-emerald-600 font-bold">▲ Superávit operativo: +{formatUSD(kpi.ingresos - kpi.egresos)}</span>
            ) : (
              <span className="text-rose-600 font-bold">▼ Déficit operativo: -{formatUSD(kpi.egresos - kpi.ingresos)}</span>
            )}
          </div>
        </div>

        {/* Carga de Instalación (Proyectos con/sin instalación completed/not) */}
        <div className="lg:col-span-6 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Carga de Trabajo</h3>
            <p className="text-sm font-bold text-slate-800">Proyectos según Requerimiento de Instalación</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            {/* Con Instalacion */}
            <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Con Instalación</span>
                <h4 className="text-2xl font-black text-slate-850 mt-1">
                  {instCompletados + instPendientes} <span className="text-xs text-slate-400 font-bold">Proy.</span>
                </h4>
              </div>
              
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500">Completados</span>
                  <span className="text-emerald-600 font-bold">{instCompletados}</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500">En Curso</span>
                  <span className="text-amber-500 font-bold">{instPendientes}</span>
                </div>
              </div>
            </div>

            {/* Sin Instalacion */}
            <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sin Instalación</span>
                <h4 className="text-2xl font-black text-slate-850 mt-1">
                  {noInstCompletados + noInstPendientes} <span className="text-xs text-slate-400 font-bold">Proy.</span>
                </h4>
              </div>
              
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500">Completados</span>
                  <span className="text-emerald-600 font-bold">{noInstCompletados}</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500">En Curso</span>
                  <span className="text-amber-500 font-bold">{noInstPendientes}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 mt-4 leading-relaxed text-center">
            Métricas calculadas sobre la base de todos los proyectos activos.
          </div>
        </div>
      </div>

      {/* Row 3: Proyectos Vigentes (8/12) y Estado del Equipo (4/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
        
        {/* Proyectos Vigentes */}
        <div className="lg:col-span-8 custom-card p-6 flex flex-col justify-between h-full">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Proyectos Vigentes</h3>
                  <p className="text-[11px] text-slate-450 mt-0.5">Control de avance de los proyectos y compromisos en ejecución</p>
                </div>
                <button 
                  onClick={() => navigate('/proyectos')} 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  Ver todos
                  <ChevronRight size={14} />
                </button>
              </div>

              {proyectosActivos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-xs font-medium text-slate-400">No hay proyectos activos en este periodo</p>
                  <button 
                    onClick={() => navigate('/proyectos')} 
                    className="text-xs text-blue-600 font-semibold mt-2 hover:underline cursor-pointer"
                  >
                    Ir al listado
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-455 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Proyecto</th>
                        <th className="pb-3 font-semibold">Fase</th>
                        <th className="pb-3 font-semibold">Progreso</th>
                        <th className="pb-3 font-semibold">Responsable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {proyectosActivos.slice(0, 5).map(p => (
                        <tr 
                          key={p.id} 
                          className="hover:bg-slate-55/50 cursor-pointer transition-colors group" 
                          onClick={() => navigate(`/proyectos/${p.id}`)}
                        >
                          <td className="py-3 pr-4">
                            <span className="font-bold text-slate-800 group-hover:text-blue-600 block transition-colors text-[12.5px]">
                              {p.nombre}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{p.clienteNombre}</span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-1.5 h-1.5 rounded-full shrink-0" 
                                style={{ backgroundColor: FASE_COLORS[p.faseActual] || '#94a3b8' }}
                              />
                              <span className="font-semibold text-slate-650">
                                {FASE_LABELS[p.faseActual] || p.faseActual}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-slate-100 rounded-full h-1.5 shrink-0 overflow-hidden">
                                <div 
                                  className="bg-slate-800 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${p.progreso}%` }} 
                                />
                              </div>
                              <span className="font-bold text-slate-600 text-[10.5px] currency-val">{p.progreso}%</span>
                            </div>
                          </td>
                          <td className="py-3 font-semibold text-slate-500">
                            {p.responsable || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team Status (4/12) */}
        <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Colaboradores</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Estado actual y asignaciones activas</p>
              </div>
              <button 
                onClick={() => navigate('/nomina/empleados')} 
                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Nómina
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[300px] lg:max-h-[320px] thin-scrollbar pr-1 flex-1">
              {usersActivity.map(user => {
                return (
                  <div key={user.id} className="group transition-all">
                    <div className="flex items-start gap-3">
                      <PersonInitialsAvatar 
                        name={user.nombre}
                        image={user.foto}
                        size="w-9 h-9"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11.5px] font-bold text-slate-800 truncate">{user.nombre}</p>
                          <span className="text-[8px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0">
                            {user.rol}
                          </span>
                        </div>

                        <div className="mt-1 space-y-1 pl-0.5 border-l border-slate-100 ml-0.5">
                          {/* Active Task */}
                          {user.activeTask ? (
                            <div className="text-[10px]">
                              <span className="text-slate-655 font-semibold hover:text-blue-600 cursor-pointer" onClick={() => navigate('/tareas')}>
                                📋 {user.activeTask.titulo}
                              </span>
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ml-1.5 ${
                                user.activeTask.prioridad === 'alta' ? 'bg-rose-500 animate-pulse' :
                                user.activeTask.prioridad === 'media' ? 'bg-amber-400' : 'bg-blue-400'
                              }`} />
                            </div>
                          ) : (
                            <p className="text-[9.5px] text-slate-400 italic">Sin tareas pendientes</p>
                          )}

                          {/* Last Action */}
                          {user.lastAction ? (
                            <p className="text-[9.5px] text-slate-400 leading-normal truncate" title={`${user.lastAction.accion} (${user.lastAction.modulo})`}>
                              ⚡ <span className="text-slate-550 font-semibold">{user.lastAction.accion}</span> ({user.lastAction.modulo})
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Row 4: Movimientos de Caja (12/12) */}
      <div className="w-full">
        <div className="custom-card p-6 flex flex-col justify-between h-full">
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Movimientos de Caja</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Bitácora consolidada de ingresos y egresos recientes</p>
              </div>
              <button 
                onClick={() => navigate('/movimientos')} 
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                Ver historial
                <ChevronRight size={14} />
              </button>
            </div>

            {recentMovements.length === 0 ? (
              <div className="py-12 text-center text-xs font-medium text-slate-400">
                No se registraron movimientos en este periodo
              </div>
            ) : (
              <div className="overflow-x-auto thin-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-455 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Fecha</th>
                      <th className="pb-3 font-semibold">Concepto</th>
                      <th className="pb-3 font-semibold">Entidad / Cliente</th>
                      <th className="pb-3 font-semibold">Responsable</th>
                      <th className="pb-3 font-semibold">Método</th>
                      <th className="pb-3 text-right font-semibold">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentMovements.map(m => (
                      <tr key={m.id + m.origen} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 font-semibold text-slate-400">
                          {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-slate-800 max-w-[200px] truncate">
                          {m.descripcion}
                        </td>
                        <td className="py-3 pr-2 text-slate-500 font-semibold truncate max-w-[150px]">
                          {m.entidad || '—'}
                        </td>
                        <td className="py-3 text-slate-500 font-medium truncate max-w-[100px]">
                          {m.usuario || '—'}
                        </td>
                        <td className="py-3">
                          <span className="inline-block text-[9.5px] font-bold px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200/30">
                            {m.metodoPago}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-bold text-[12px] currency-val ${
                          m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-500'
                        }`}>
                          {m.tipo === 'ingreso' ? '+' : '-'}{formatUSD(m.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
