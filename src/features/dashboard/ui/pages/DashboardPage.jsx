import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';

const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

const FASE_LABELS = {
  DISENIO: 'Diseño',
  APROBACION: 'Aprobación',
  PRODUCCION: 'Producción',
  INSTALACION: 'Instalación',
  COMPLETADO: 'Completado',
};

const FASE_COLORS = {
  DISENIO: '#8b5cf6', // purple
  APROBACION: '#f59e0b', // amber
  PRODUCCION: '#3b82f6', // blue
  INSTALACION: '#f97316', // orange
  COMPLETADO: '#10b981', // emerald
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [rango, setRango] = useState('mes'); // 'hoy', 'semana', 'mes'
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeJobState, setActiveJobState] = useState(null);
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
      setActiveJobState(data.currentPrintingJob || null);
    } catch (err) {
      toast.error('Error al cargar el resumen del dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(rango);
  }, [rango]);

  // Timer simulation to increment elapsedSeconds of the printing job in real-time
  useEffect(() => {
    if (!activeJobState || activeJobState.status !== 'Imprimiendo') return;
    const timer = setInterval(() => {
      setActiveJobState(prev => prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeJobState?.id, activeJobState?.status]);

  if (loading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
        <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">Cargando métricas...</p>
      </div>
    );
  }

  const { kpi, usersActivity, printQueue, proyectosActivos, proyectosFaseCount, recentMovements } = summary;

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const renderUrgencyBadge = (urgency) => {
    if (urgency === 'Alta') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wider">
          ⚠️ Alta
        </span>
      );
    }
    if (urgency === 'Media') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider">
          Media
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wider">
        Baja
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    if (status === 'Imprimiendo') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Imprimiendo
        </span>
      );
    }
    if (status === 'Pausado') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-250">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pausado
        </span>
      );
    }
    if (status === 'Listo') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-250">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Listo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

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
    <div className="pb-16 dashboard-container max-w-[1400px] mx-auto animate-fade-in">
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
          border: 1px solid rgba(226, 232, 240, 0.7);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01), 0 10px 20px -12px rgba(0, 0, 0, 0.03);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .custom-card:hover {
          border-color: rgba(203, 213, 225, 0.9);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02), 0 12px 24px -10px rgba(0, 0, 0, 0.04);
        }
        .segment-btn {
          font-size: 12px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 6px;
          transition: all 0.15s ease;
          color: #64748b;
        }
        .segment-btn.active {
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .avatar-box {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
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
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        .progress-shimmer {
          background: linear-gradient(90deg, #10b981 25%, #34d399 50%, #10b981 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>

      {/* Header section (Minimal & Borderless) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Resumen de Operaciones</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Perspectiva general del flujo, proyectos activos y la actividad del equipo.
          </p>
        </div>

        {/* Minimal Rango Toggles */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/40">
          <button onClick={() => setRango('hoy')} className={`segment-btn ${rango === 'hoy' ? 'active' : ''}`}>
            Hoy
          </button>
          <button onClick={() => setRango('semana')} className={`segment-btn ${rango === 'semana' ? 'active' : ''}`}>
            7 días
          </button>
          <button onClick={() => setRango('mes')} className={`segment-btn ${rango === 'mes' ? 'active' : ''}`}>
            Último mes
          </button>
        </div>
      </div>

      {/* Financial Status Summary Band */}
      <div className="bg-white border border-slate-200/70 rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 shadow-sm">
        {/* KPI Net Balance */}
        <div className="pb-4 md:pb-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Balance Neto</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-extrabold tracking-tight currency-val ${kpi.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {kpi.balance >= 0 ? '+' : ''}{formatUSD(kpi.balance)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Diferencia neta en caja y abonos</span>
        </div>

        {/* KPI Income */}
        <div className="py-4 md:py-0 md:pl-6">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Ingresos</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 currency-val">
              {formatUSD(kpi.ingresos)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Total cobrado al cliente</span>
        </div>

        {/* KPI Expenses */}
        <div className="pt-4 md:pt-0 md:pl-6">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Egresos</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold tracking-tight text-rose-600 currency-val">
              {formatUSD(kpi.egresos)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Pagos realizados y compras</span>
        </div>
      </div>

      {/* Main Grid divided in balanced horizontal rows with matching heights */}
      <div className="space-y-8">
        
        {/* ROW 1: Projects & Sales Metrics (2 Columns: 2/3 and 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Active Projects Block (8/12 width) */}
          <div className="lg:col-span-8 custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Proyectos en Curso</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Control de fases y avance de los proyectos vigentes</p>
                </div>
                <button 
                  onClick={() => navigate('/proyectos')} 
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Ver todos →
                </button>
              </div>

              {proyectosActivos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-xs font-medium text-slate-400">No hay proyectos activos en este periodo</p>
                  <button 
                    onClick={() => navigate('/proyectos')} 
                    className="text-xs text-blue-600 font-semibold mt-2 hover:underline"
                  >
                    Ir al módulo de proyectos
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                            <span className="font-semibold text-slate-800 group-hover:text-blue-600 block transition-colors text-[13px]">
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
                              <span className="font-medium text-slate-650">
                                {FASE_LABELS[p.faseActual] || p.faseActual}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-slate-100 rounded-full h-1 shrink-0 overflow-hidden">
                                <div 
                                  className="bg-slate-850 h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${p.progreso}%` }} 
                                />
                              </div>
                              <span className="font-bold text-slate-600 text-[11px] currency-val">{p.progreso}%</span>
                            </div>
                          </td>
                          <td className="py-3 font-medium text-slate-500">
                            {p.responsable || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {proyectosActivos.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fases Activas:</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(proyectosFaseCount).map(([fase, val]) => {
                    if (val === 0) return null;
                    return (
                      <div key={fase} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: FASE_COLORS[fase] || '#94a3b8' }}
                        />
                        <span>{FASE_LABELS[fase] || fase}: <strong className="text-slate-800 font-bold">{val}</strong></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Proformas Overview (4/12 width) */}
          <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Métricas de Proformas</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Estado de cotizaciones del periodo</p>
              </div>
              <button 
                onClick={() => navigate('/proformas')} 
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Proformas
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-between space-y-4">
              {/* Financial values */}
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xs font-semibold text-slate-500">Generado Total</span>
                <span className="text-base font-bold text-slate-800 currency-val">
                  {formatUSD(kpi.proformasMonto)}
                </span>
              </div>

              {/* Large Donut Chart Centered */}
              <div className="flex flex-col items-center justify-center py-2 border-t border-slate-50 pt-4">
                <div className="relative w-[160px] h-[160px] flex items-center justify-center">
                  <svg width="160" height="160" viewBox="0 0 100 100" className="transform -rotate-90">
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
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {hoveredCat.label}
                        </span>
                        <span className="text-2xl font-extrabold text-slate-900 currency-val leading-none">
                          {hoveredCat.value}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 mt-1 block">
                          {hoveredCat.percentage}% del total
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-extrabold text-slate-900 currency-val leading-none">
                          {kpi.proformasTotal}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                          Proformas
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 mt-1 block currency-val">
                          {formatUSD(kpi.proformasMonto)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-100 text-[11px]">
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
                        <span className={`text-slate-550 font-medium truncate ${isHovered ? 'text-slate-900 font-semibold' : ''}`}>{cat.label}</span>
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

        {/* ROW 2: Plotter & Team Pulse (2 Columns: 2/3 and 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Cola de Producción (8/12 width) */}
          <div className="lg:col-span-8 custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Cola de Producción</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Plotter: Impresión activa y cola de espera</p>
              </div>
              <button 
                onClick={() => navigate('/colas-impresion')} 
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cola →
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">
              
              {/* Left Side: Active Printing Job (5/12 or 6/12 for prominence) */}
              <div className="md:col-span-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Estado del Plotter</h4>
                  {activeJobState ? (
                    <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/5 flex flex-col justify-between min-h-[300px] hover:border-slate-200 transition-all duration-200">
                      <div>
                        {/* Badges Row */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100/50 pb-2 mb-3">
                          {renderStatusBadge(activeJobState.status)}
                          {renderUrgencyBadge(activeJobState.urgency)}
                        </div>

                        {/* Title & Client */}
                        <div className="flex items-start gap-2.5 mb-3">
                          <div className="p-2 bg-slate-50 rounded-lg shrink-0 border border-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="#64748b" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-[13.5px] font-bold text-slate-800 truncate leading-tight" title={activeJobState.name}>
                              {activeJobState.name}
                            </h5>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Cliente: <strong className="text-slate-600 font-semibold">{activeJobState.client}</strong>
                            </span>
                            {activeJobState.proyectoNombre && (
                              <span className="inline-block text-[9.5px] font-semibold text-violet-600 bg-violet-50/50 border border-violet-100 rounded px-1.5 py-0.5 mt-1">
                                📁 {activeJobState.proyectoNombre}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Technical Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2.5 border-y border-slate-100/50 text-[10.5px]">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Formato / Material</span>
                            <strong className="text-slate-700 font-semibold">{activeJobState.format}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Dimensiones</span>
                            <strong className="text-slate-750 font-semibold currency-val">{activeJobState.width.toFixed(2)} x {activeJobState.height.toFixed(2)} m <span className="text-[9px] text-slate-400">({(activeJobState.width * activeJobState.height).toFixed(2)}m²)</span></strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Responsable</span>
                            <strong className="text-slate-750 font-semibold truncate block">{activeJobState.responsible || '—'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Copias</span>
                            <strong className="text-slate-750 font-semibold currency-val">{activeJobState.copies} {activeJobState.copies === 1 ? 'copia' : 'copias'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar Area */}
                      <div className="pt-3">
                        {(() => {
                          const estimatedTotalSeconds = activeJobState.copies * 180; // 3 minutes per copy
                          const progressPercent = activeJobState.status === 'Listo'
                            ? 0
                            : Math.min(100, Math.floor((activeJobState.elapsedSeconds / estimatedTotalSeconds) * 100));

                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                <span>{activeJobState.status === 'Listo' ? 'Preparado' : 'Progreso de Impresión'}</span>
                                <span className="currency-val">{progressPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    activeJobState.status === 'Imprimiendo' ? 'progress-shimmer' : 'bg-amber-400'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                                <span className="currency-val">{formatTime(activeJobState.elapsedSeconds)} transcurridos</span>
                                <span>
                                  {activeJobState.status === 'Listo'
                                    ? 'Espera inicio manual'
                                    : `Est. ${formatTime(Math.max(0, estimatedTotalSeconds - activeJobState.elapsedSeconds))} restantes`}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Notes Callout if exists */}
                      {activeJobState.notes && (
                        <div className="mt-2.5 bg-amber-50/30 border border-amber-100/50 rounded-lg p-2 text-[9.5px] text-slate-600 flex items-start gap-1.5">
                          <span className="text-[11px] shrink-0">💡</span>
                          <p className="line-clamp-2 leading-snug"><strong className="text-slate-700">Indicaciones:</strong> {activeJobState.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-slate-100 border-dashed rounded-xl p-6 bg-slate-50/10 flex flex-col items-center justify-center text-center min-h-[300px]">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 border border-slate-200/40">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.82l-.24 2.24H4.5a2.25 2.25 0 00-2.25 2.25v2.25c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-2.25a2.25 2.25 0 00-2.25-2.25h-1.98l-.24-2.24m-11.28 0H18.72m-12 0h12m-12 0l1.24-11.13A2.25 2.25 0 018.21 2.25h7.58a2.25 2.25 0 012.23 1.99L19.28 13.82m-12 0h12" />
                        </svg>
                      </div>
                      <h5 className="text-xs font-bold text-slate-700">Plotter Inactivo</h5>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">No hay impresiones activas en curso. Inicie un trabajo de impresión en el taller.</p>
                      <button 
                        onClick={() => navigate('/colas-impresion')}
                        className="text-[10.5px] font-bold text-blue-600 border border-blue-100 hover:bg-blue-50/50 transition-colors px-3 py-1.5 rounded-lg mt-4"
                      >
                        Ir a Cola de Impresión
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Waiting Queue (6/12 for symmetry) */}
              <div className="md:col-span-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próximos en Cola</h4>
                    <span className="text-[9.5px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 currency-val">
                      {printQueue.length} en espera
                    </span>
                  </div>
                  
                  {(!printQueue || printQueue.length === 0) ? (
                    <div className="py-10 text-center text-[11px] text-slate-400 italic min-h-[250px] flex flex-col items-center justify-center border border-slate-50 rounded-xl bg-slate-50/5">
                      <span className="text-xl mb-1 opacity-70">📭</span>
                      No hay trabajos en cola de espera.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[290px] overflow-y-auto thin-scrollbar pr-1">
                      {printQueue.map((job, idx) => (
                        <div 
                          key={job.id} 
                          className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl transition-all duration-150 border border-slate-100/50 hover:border-slate-200/80 cursor-pointer group"
                          onClick={() => navigate('/colas-impresion')}
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[9.5px] font-bold text-slate-400 bg-slate-50 group-hover:bg-white rounded px-1.5 py-0.5 border border-slate-100 currency-val">
                                #{idx + 1}
                              </span>
                              <span className="text-[11.5px] font-bold text-slate-800 group-hover:text-blue-600 truncate block transition-colors">
                                {job.name}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-slate-400 truncate block mt-1 ml-1">
                              {job.client} • {job.format} • {job.copies} {job.copies === 1 ? 'copia' : 'copias'}
                            </span>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-slate-700 currency-val block">
                              {job.width.toFixed(2)}x{job.height.toFixed(2)} m
                            </span>
                            {renderUrgencyBadge(job.urgency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Team Pulse (Equipo) (4/12 width) */}
          <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Estado del Equipo</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Colaboradores activos y últimas acciones realizadas</p>
                </div>
                <button 
                  onClick={() => navigate('/nomina/empleados')} 
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Nómina
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[300px] lg:max-h-[320px] thin-scrollbar pr-1 flex-1">
                {usersActivity.map(user => {
                  const colors = [
                    { bg: '#f1f5f9', txt: '#334155' }, // slate
                    { bg: '#eff6ff', txt: '#1e40af' }, // blue
                    { bg: '#f5f3ff', txt: '#5b21b6' }, // purple
                    { bg: '#ecfdf5', txt: '#065f46' }, // green
                    { bg: '#fff7ed', txt: '#9a3412' }, // orange
                  ];
                  const c = colors[user.nombre.length % colors.length];
                  const initials = user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('');

                  return (
                    <div key={user.id} className="group transition-all">
                      <div className="flex items-start gap-2.5">
                        <div className="avatar-box shrink-0" style={{ backgroundColor: c.bg, color: c.txt }}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11.5px] font-bold text-slate-800 truncate">{user.nombre}</p>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide shrink-0">
                              {user.rol}
                            </span>
                          </div>

                          <div className="mt-1 space-y-1 pl-0.5 border-l border-slate-100 ml-0.5">
                            {/* Active Task */}
                            {user.activeTask ? (
                              <div className="text-[10px]">
                                <span className="text-slate-600 font-semibold hover:text-blue-600 cursor-pointer" onClick={() => navigate('/tareas')}>
                                  📋 {user.activeTask.titulo}
                                </span>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ml-1 ${
                                  user.activeTask.prioridad === 'alta' ? 'bg-rose-500 animate-pulse' :
                                  user.activeTask.prioridad === 'media' ? 'bg-amber-400' : 'bg-blue-400'
                                }`} />
                              </div>
                            ) : (
                              <p className="text-[9.5px] text-slate-400 italic">Sin tareas pendientes</p>
                            )}

                            {/* Last Action */}
                            {user.lastAction ? (
                              <p className="text-[10px] text-slate-400 leading-normal">
                                ⚡ <span className="text-slate-500 font-medium">{user.lastAction.accion}</span> ({user.lastAction.modulo})
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

        {/* ROW 3: Full-width Financial Ledger (12/12) */}
        <div className="w-full">
          <div className="custom-card p-6 flex flex-col justify-between h-full">
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Movimientos de Caja</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Bitácora consolidada de ingresos y egresos recientes</p>
                </div>
                <button 
                  onClick={() => navigate('/movimientos')} 
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Ver historial →
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
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Fecha</th>
                        <th className="pb-3 font-semibold">Concepto</th>
                        <th className="pb-3 font-semibold">Entidad / Cliente</th>
                        <th className="pb-3 font-semibold">Responsable</th>
                        <th className="pb-3 font-semibold">Método</th>
                        <th className="pb-3 text-right font-semibold">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentMovements.slice(0, 7).map(m => (
                        <tr key={m.id + m.origen} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 font-semibold text-slate-400">
                            {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-slate-800 max-w-[200px] truncate">
                            {m.descripcion}
                          </td>
                          <td className="py-3 pr-2 text-slate-500 font-medium truncate max-w-[150px]">
                            {m.entidad || '—'}
                          </td>
                          <td className="py-3 text-slate-500 font-medium">
                            {m.usuario || '—'}
                          </td>
                          <td className="py-3">
                            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200/30">
                              {m.metodoPago}
                            </span>
                          </td>
                          <td className={`py-3 text-right font-bold text-[13px] currency-val ${
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
    </div>
  );
}
