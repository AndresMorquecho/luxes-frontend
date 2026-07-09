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
  ChevronRight 
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
  const [hoveredCat, setHoveredCat] = useState(null);

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
        <p className="text-xs font-medium text-slate-400 tracking-wider uppercase animate-pulse">Cargando métricas...</p>
      </div>
    );
  }

  const { kpi, usersActivity, proyectosActivos, proyectosFaseCount, recentMovements } = summary;

  const totalProformas = kpi.porAprobar + kpi.aprobadas + kpi.pagadas + kpi.rechazadas;
  const r = 38;
  const circ = 2 * Math.PI * r; // ~238.76
  const categories = [
    { key: 'porAprobar', label: 'Pendientes', value: kpi.porAprobar, color: '#f59e0b', textClass: 'text-amber-550', hoverColor: '#d97706' },
    { key: 'aprobadas', label: 'Aprobadas', value: kpi.aprobadas, color: '#10b981', textClass: 'text-emerald-500', hoverColor: '#059669' },
    { key: 'pagadas', label: 'Pagadas', value: kpi.pagadas, color: '#3b82f6', textClass: 'text-blue-500', hoverColor: '#2563eb' },
    { key: 'rechazadas', label: 'Rechazadas', value: kpi.rechazadas, color: '#ef4444', textClass: 'text-rose-500', hoverColor: '#dc2626' },
  ];

  let accumulatedOffset = 0;
  const slices = categories.map(cat => {
    if (cat.value === 0) return null;
    const percentage = cat.value / (totalProformas || 1);
    const strokeLength = percentage * circ;
    const strokeOffset = accumulatedOffset;
    accumulatedOffset -= strokeLength;
    return {
      ...cat,
      percentage: Math.round(percentage * 100),
      strokeLength,
      strokeOffset
    };
  }).filter(Boolean);

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
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01), 0 10px 20px -12px rgba(0, 0, 0, 0.025);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .custom-card:hover {
          border-color: rgba(203, 213, 225, 0.9);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02), 0 12px 24px -10px rgba(0, 0, 0, 0.045);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Control de Operaciones</h1>
          <p className="text-xs font-semibold text-slate-450 mt-2">
            Perspectiva general del flujo, proyectos activos y la actividad del equipo.
          </p>
        </div>

        {/* Minimal Range Toggles */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/40">
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
            <p className="text-[10px] text-slate-455 mt-1 font-semibold">Balance neto en caja</p>
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
            <p className="text-[10px] text-slate-455 mt-1 font-semibold">Total cobrado al cliente</p>
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
            <p className="text-[10px] text-slate-455 mt-1 font-semibold">Pagos y compras realizados</p>
          </div>
        </div>

        {/* Card 4: Proformas */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Proformas</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-slate-900 currency-val leading-none">
              {kpi.proformasTotal} <span className="text-[11px] text-slate-455 font-bold uppercase">U.</span>
            </h3>
            <p className="text-[10px] text-slate-455 mt-1 font-bold text-amber-600 currency-val">
              {formatUSD(kpi.proformasMonto)}
            </p>
          </div>
        </div>

        {/* Card 5: Proyectos */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Proyectos Activos</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-110 transition-transform">
              <Folder size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-slate-900 currency-val leading-none">
              {proyectosActivos.length} <span className="text-[11px] text-slate-455 font-bold uppercase">P.</span>
            </h3>
            <p className="text-[10px] text-slate-455 mt-1 font-semibold">En ejecución</p>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-8">
        
        {/* ROW 1: Proyectos en Curso (8/12) y Métricas de Proformas (4/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Active Projects Block (8/12) */}
          <div className="lg:col-span-8 custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Proyectos en Curso</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Control de fases y avance de los proyectos vigentes</p>
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
                      Ir al módulo de proyectos
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Móvil: cards horizontales deslizables */}
                    <div className="md:hidden -mx-1">
                      <div className="flex gap-2.5 overflow-x-auto thin-scrollbar pb-1 snap-x snap-mandatory">
                        {proyectosActivos.slice(0, 5).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => navigate(`/proyectos/${p.id}`)}
                            className="snap-start shrink-0 w-[min(72vw,260px)] bg-white border border-slate-200/80 rounded-xl p-3.5 text-left shadow-sm hover:border-slate-300 active:scale-[0.98] transition-all"
                          >
                            <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2">
                              {p.nombre}
                            </p>
                            <p className="text-[10px] text-slate-450 mt-1 truncate">{p.clienteNombre}</p>

                            <div className="flex items-center gap-1.5 mt-2.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: FASE_COLORS[p.faseActual] || '#94a3b8' }}
                              />
                              <span className="text-[10px] font-bold text-slate-500 truncate">
                                {FASE_LABELS[p.faseActual] || p.faseActual}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-2.5">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden min-w-0">
                                <div
                                  className="bg-slate-800 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${p.progreso}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600 currency-val shrink-0">
                                {p.progreso}%
                              </span>
                            </div>

                            {p.responsable && (
                              <p className="text-[9px] text-slate-400 mt-2 truncate">
                                Resp.: {p.responsable}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Escritorio: tabla */}
                    <div className="hidden md:block overflow-x-auto thin-scrollbar">
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
                              className="hover:bg-slate-50/50 cursor-pointer transition-colors group" 
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
                                  <span className="font-semibold text-slate-600">
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
                  </>
                )}
              </div>

              {proyectosActivos.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100 pt-3 sm:pt-4 mt-3">
                  <span className="text-[9px] font-extrabold text-slate-455 uppercase tracking-wider shrink-0">Resumen por Fases:</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-x-4">
                    {Object.entries(proyectosFaseCount).map(([fase, val]) => {
                      if (val === 0) return null;
                      return (
                        <div key={fase} className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-500">
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: FASE_COLORS[fase] || '#94a3b8' }}
                          />
                          <span>{FASE_LABELS[fase] || fase}: <strong className="text-slate-800 font-extrabold">{val}</strong></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Proformas Overview (4/12) */}
          <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Métricas de Proformas</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Estado de cotizaciones del periodo</p>
              </div>
              <button 
                onClick={() => navigate('/proformas')} 
                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                Proformas
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-between space-y-4">
              {/* Financial values */}
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xs font-semibold text-slate-500">Generado Total</span>
                <span className="text-sm font-bold text-slate-800 currency-val">
                  {formatUSD(kpi.proformasMonto)}
                </span>
              </div>

              {/* Large Donut Chart Centered */}
              <div className="flex flex-col items-center justify-center py-2 border-t border-slate-50 pt-4">
                <div className="relative w-[150px] h-[150px] flex items-center justify-center">
                  <svg width="150" height="150" viewBox="0 0 100 100" className="transform -rotate-90">
                    {totalProformas === 0 ? (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                      />
                    ) : (
                      slices.map(slice => {
                        const isHovered = hoveredCat?.key === slice.key;
                        return (
                          <circle
                            key={slice.key}
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke={isHovered ? slice.hoverColor : slice.color}
                            strokeWidth={isHovered ? "10" : "8"}
                            strokeDasharray={`${slice.strokeLength} ${circ - slice.strokeLength}`}
                            strokeDashoffset={slice.strokeOffset}
                            className="transition-all duration-200 cursor-pointer"
                            onMouseEnter={() => setHoveredCat(slice)}
                            onMouseLeave={() => setHoveredCat(null)}
                          />
                        );
                      })
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 select-none pointer-events-none">
                    {hoveredCat ? (
                      <>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">
                          {hoveredCat.label}
                        </span>
                        <span className="text-xl font-extrabold text-slate-900 currency-val leading-none">
                          {hoveredCat.value}
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-500 mt-1 block">
                          {hoveredCat.percentage}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl font-extrabold text-slate-900 currency-val leading-none">
                          {kpi.proformasTotal}
                        </span>
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1 block">
                          Total
                        </span>
                        <span className="text-[9.5px] font-bold text-emerald-600 mt-1 block currency-val">
                          {formatUSD(kpi.proformasMonto)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-3 border-t border-slate-100 text-[11px]">
                {categories.map(cat => {
                  const isHovered = hoveredCat?.key === cat.key;
                  return (
                    <div 
                      key={cat.key} 
                      className={`flex items-center justify-between p-1 rounded transition-all duration-150 ${isHovered ? 'bg-slate-50 scale-[1.02]' : ''}`}
                      onMouseEnter={() => {
                        const pct = totalProformas > 0 ? (cat.value / totalProformas) : 0;
                        setHoveredCat({
                          ...cat,
                          percentage: Math.round(pct * 100),
                          ...cat
                        });
                      }}
                      onMouseLeave={() => setHoveredCat(null)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className={`text-slate-550 font-semibold truncate ${isHovered ? 'text-slate-900 font-extrabold' : ''}`}>{cat.label}</span>
                      </div>
                      <span className={`font-bold currency-val ${cat.textClass} ${isHovered ? 'scale-105' : ''}`}>
                        {cat.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Movimientos de Caja (8/12) y Estado del Equipo (4/12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Movimientos de Caja (8/12) */}
          <div className="lg:col-span-8 custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex flex-col h-full justify-between">
              <div>
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
                        {recentMovements.slice(0, 6).map(m => (
                          <tr key={m.id + m.origen} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3 font-semibold text-slate-400">
                              {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="py-3 pr-4 font-semibold text-slate-800 max-w-[180px] truncate">
                              {m.descripcion}
                            </td>
                            <td className="py-3 pr-2 text-slate-500 font-semibold truncate max-w-[130px]">
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

          {/* Team Status (4/12) */}
          <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Estado del Equipo</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Colaboradores activos y últimas acciones</p>
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
                                ⚡ <span className="text-slate-500 font-semibold">{user.lastAction.accion}</span> ({user.lastAction.modulo})
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

      </div>
    </div>
  );
}
