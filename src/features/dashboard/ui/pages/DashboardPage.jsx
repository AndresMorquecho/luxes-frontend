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
  Award,
  Clock,
  Search,
  CheckCircle,
  AlertTriangle,
  Users,
  Activity
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
  const [activeTab, setActiveTab] = useState('ejecutivo'); // 'ejecutivo', 'ventas', 'operaciones'
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCat, setHoveredCat] = useState(null);
  const [filtroProformaSearch, setFiltroProformaSearch] = useState('');

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
        <p className="text-xs font-medium text-slate-400 tracking-wider uppercase animate-pulse">Cargando métricas de negocio...</p>
      </div>
    );
  }

  const { kpi, usersActivity, proyectosActivos, proyectosFaseCount, recentMovements, proformas = [] } = summary;

  // CALCULOS DE KPIS REALES DE NEGOCIO (SaaS / Project-based Management)
  // 1. Margen Operativo Neto (%)
  const margenOperativo = kpi.ingresos > 0 
    ? ((kpi.ingresos - kpi.egresos) / kpi.ingresos) * 100 
    : 0;

  // 2. Tasa de Conversión / Cierre (Win Rate)
  // Aprobadas + Pagadas / Total proformas en el período
  const totalCerradas = kpi.aprobadas + kpi.pagadas;
  const tasaConversion = kpi.proformasTotal > 0 
    ? (totalCerradas / kpi.proformasTotal) * 100 
    : 0;

  // 3. Ticket Promedio (Monto Promedio por Cotización)
  const ticketPromedio = kpi.proformasTotal > 0 
    ? kpi.proformasMonto / kpi.proformasTotal 
    : 0;

  // 4. Ratio de Cobertura Financiera (Ingresos / Egresos)
  const ratioCobertura = kpi.egresos > 0 
    ? kpi.ingresos / kpi.egresos 
    : 0;

  // Donut chart variables
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

  // Filtrado de proformas para la pestaña de ventas
  const proformasFiltradas = proformas.filter(p => 
    p.id.toLowerCase().includes(filtroProformaSearch.toLowerCase()) ||
    (p.clienteNombre || '').toLowerCase().includes(filtroProformaSearch.toLowerCase())
  );

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
        .tab-btn {
          font-weight: 700;
          font-size: 13px;
          padding: 10px 16px;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          color: #64748b;
        }
        .tab-btn.active {
          border-bottom-color: #4f46e5;
          color: #4f46e5;
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">Dashboard de Negocio</h1>
          <p className="text-xs font-semibold text-slate-400 mt-2">
            Métricas estratégicas de rentabilidad, embudo de ventas y capacidad operativa.
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

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200/60 mb-8 overflow-x-auto thin-scrollbar">
        <button 
          onClick={() => setActiveTab('ejecutivo')} 
          className={`tab-btn cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'ejecutivo' ? 'active' : ''}`}
        >
          <TrendingUp size={15} />
          Resumen Ejecutivo
        </button>
        <button 
          onClick={() => setActiveTab('ventas')} 
          className={`tab-btn cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'ventas' ? 'active' : ''}`}
        >
          <Percent size={15} />
          Análisis de Ventas
        </button>
        <button 
          onClick={() => setActiveTab('operaciones')} 
          className={`tab-btn cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${activeTab === 'operaciones' ? 'active' : ''}`}
        >
          <Layers size={15} />
          Eficiencia Operativa
        </button>
      </div>

      {/* TAB CONTENT: RESUMEN EJECUTIVO */}
      {activeTab === 'ejecutivo' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Executive KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Margen Operativo */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Margen de Utilidad</span>
                <div className={`p-2 rounded-xl ${margenOperativo >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} group-hover:scale-110 transition-transform`}>
                  <Percent size={15} />
                </div>
              </div>
              <div className="mt-4">
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${margenOperativo >= 0 ? 'text-slate-900' : 'text-rose-650'}`}>
                  {margenOperativo.toFixed(1)}%
                </h3>
                <span className="text-[9.5px] font-semibold text-slate-450 mt-1 block">
                  Caja Neta: <strong className="text-slate-700 font-bold">{formatUSD(kpi.balance)}</strong>
                </span>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Rentabilidad real de la operación descontando costos.
                </p>
              </div>
            </div>

            {/* Card 2: Tasa de Conversión (Win Rate) */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Win Rate (Tasa de Cierre)</span>
                <div className="p-2 bg-indigo-50 text-indigo-650 rounded-xl group-hover:scale-110 transition-transform">
                  <Award size={15} />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-indigo-650 leading-none">
                  {tasaConversion.toFixed(1)}%
                </h3>
                <span className="text-[9.5px] font-semibold text-slate-450 mt-1 block">
                  Aprobadas/Pagadas: <strong className="text-slate-700 font-bold">{totalCerradas} de {kpi.proformasTotal}</strong>
                </span>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Porcentaje de cotizaciones convertidas con éxito.
                </p>
              </div>
            </div>

            {/* Card 3: Ticket Promedio */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ticket Promedio</span>
                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-110 transition-transform">
                  <DollarSign size={15} />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 currency-val leading-none">
                  {formatUSD(ticketPromedio)}
                </h3>
                <span className="text-[9.5px] font-semibold text-slate-455 mt-1 block">
                  Cotizado: <strong className="text-slate-750 font-bold">{formatUSD(kpi.proformasMonto)}</strong>
                </span>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Valor económico estimado por cada cotización.
                </p>
              </div>
            </div>

            {/* Card 4: Cobertura Financiera */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-200 flex flex-col justify-between group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Cobertura de Gastos</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp size={15} />
                </div>
              </div>
              <div className="mt-4">
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${ratioCobertura >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ratioCobertura.toFixed(2)}x
                </h3>
                <span className="text-[9.5px] font-semibold text-slate-455 mt-1 block">
                  Egresos totales: <strong className="text-slate-750 font-bold">{formatUSD(kpi.egresos)}</strong>
                </span>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Veces que los ingresos cubren los egresos operativos.
                </p>
              </div>
            </div>
          </div>

          {/* Row: Proyectos en curso (8/12) y Movimientos Recientes (4/12) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Proyectos en Curso */}
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

            {/* Movimientos Recientes */}
            <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Caja Reciente</h3>
                    <p className="text-[11px] text-slate-450 mt-0.5">Últimos cobros y egresos registrados</p>
                  </div>
                  <button 
                    onClick={() => navigate('/movimientos')} 
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Ver todos
                  </button>
                </div>

                {recentMovements.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    Sin transacciones recientes en el periodo.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {recentMovements.slice(0, 5).map(m => (
                      <div key={m.id + m.origen} className="flex items-start justify-between gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-bold text-slate-800 truncate" title={m.descripcion}>
                            {m.descripcion}
                          </p>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">
                            {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} • {m.entidad || '—'}
                          </span>
                        </div>
                        <span className={`font-bold currency-val text-[11.5px] shrink-0 text-right ${
                          m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-500'
                        }`}>
                          {m.tipo === 'ingreso' ? '+' : '-'}{formatUSD(m.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ANALISIS DE VENTAS */}
      {activeTab === 'ventas' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Sales metrics & Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Sales funnel representation */}
            <div className="lg:col-span-8 custom-card p-6 flex flex-col justify-between h-full">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-6">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Embudo de Conversión Comercial</h3>
                  <p className="text-[11px] text-slate-450 mt-0.5">Visualización del flujo de ingresos desde cotizaciones emitidas hasta cobros efectivos</p>
                </div>

                <div className="space-y-5">
                  {/* Step 1: Total Cotizado */}
                  <div className="relative">
                    <div className="flex justify-between items-center text-xs mb-1 font-semibold text-slate-650">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center font-bold text-[10px]">1</span>
                        <span>Total Cotizado (Proformas creadas)</span>
                      </span>
                      <strong className="text-slate-800 currency-val">{formatUSD(kpi.proformasMonto)}</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-lg" style={{ width: '100%' }} />
                    </div>
                    <span className="text-[9.5px] text-slate-400 block mt-1">Volumen total de propuestas comerciales enviadas ({kpi.proformasTotal} proformas)</span>
                  </div>

                  {/* Step 2: Total Aprobado / En curso */}
                  <div className="relative">
                    <div className="flex justify-between items-center text-xs mb-1 font-semibold text-slate-655">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center font-bold text-[10px]">2</span>
                        <span>Cierre Aprobado / Pagado ({tasaConversion.toFixed(1)}% tasa de éxito)</span>
                      </span>
                      <strong className="text-slate-800 currency-val">
                        {formatUSD(proformas.filter(p => p.estado === 'Aprobada' || p.estado === 'Pagada').reduce((s, p) => s + p.total, 0))}
                      </strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-lg transition-all duration-500" style={{ width: `${tasaConversion}%` }} />
                    </div>
                    <span className="text-[9.5px] text-slate-400 block mt-1">Monto de cotizaciones aceptadas formalmente por los clientes</span>
                  </div>

                  {/* Step 3: Total Cobrado */}
                  {(() => {
                    const cobradoAbonos = kpi.ingresos;
                    const aprobadoVal = proformas.filter(p => p.estado === 'Aprobada' || p.estado === 'Pagada').reduce((s, p) => s + p.total, 0) || 1;
                    const pctCobro = Math.min((cobradoAbonos / aprobadoVal) * 100, 100);

                    return (
                      <div className="relative">
                        <div className="flex justify-between items-center text-xs mb-1 font-semibold text-slate-655">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-teal-50 text-teal-600 rounded flex items-center justify-center font-bold text-[10px]">3</span>
                            <span>Cobro Efectivo en Caja ({pctCobro.toFixed(1)}% de cobro)</span>
                          </span>
                          <strong className="text-emerald-600 currency-val">{formatUSD(kpi.ingresos)}</strong>
                        </div>
                        <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                          <div className="bg-teal-500 h-full rounded-lg transition-all duration-500" style={{ width: `${pctCobro}%` }} />
                        </div>
                        <span className="text-[9.5px] text-slate-400 block mt-1">Fondos monetarios reales liquidados en el período</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Donut Chart / Metrics breakdown */}
            <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Donut de Conversión</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Distribución de cotizaciones</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between space-y-4">
                {/* SVG Donut */}
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative w-[140px] h-[140px] flex items-center justify-center">
                    <svg width="140" height="140" viewBox="0 0 100 100" className="transform -rotate-90">
                      {totalProformas === 0 ? (
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
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
                          <span className="text-[9px] font-bold text-slate-500 mt-1 block">
                            {hoveredCat.percentage}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xl font-extrabold text-slate-900 currency-val leading-none">
                            {kpi.proformasTotal}
                          </span>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1 block">
                            Proformas
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px]">
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
                          <span className="text-slate-550 font-bold truncate">{cat.label}</span>
                        </div>
                        <span className={`font-extrabold currency-val ${cat.textClass}`}>
                          {cat.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* List of Proformas in the Period */}
          <div className="custom-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Desglose de Cotizaciones</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Auditoría y control de montos de proformas registradas</p>
              </div>

              {/* Search filter */}
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  value={filtroProformaSearch}
                  onChange={(e) => setFiltroProformaSearch(e.target.value)}
                  placeholder="Buscar proforma o cliente..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 transition-all shadow-xs"
                />
              </div>
            </div>

            {proformasFiltradas.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                No se encontraron proformas coincidentes en este período
              </div>
            ) : (
              <div className="overflow-x-auto thin-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-455 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Código</th>
                      <th className="pb-3 font-semibold">Fecha</th>
                      <th className="pb-3 font-semibold">Cliente</th>
                      <th className="pb-3 font-semibold">Estado</th>
                      <th className="pb-3 text-right font-semibold">Monto Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {proformasFiltradas.map(p => {
                      const estColors = {
                        Pendiente: 'bg-amber-50 text-amber-700 border-amber-100',
                        Aprobada: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        Pagada: 'bg-blue-50 text-blue-700 border-blue-100',
                        Rechazada: 'bg-rose-50 text-rose-700 border-rose-100',
                      };
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 font-bold text-slate-800">{p.id}</td>
                          <td className="py-3 text-slate-450 font-medium">
                            {new Date(p.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="py-3 font-semibold text-slate-700 max-w-[250px] truncate">{p.clienteNombre}</td>
                          <td className="py-3">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-md border ${estColors[p.estado] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                              {p.estado}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-[12.5px] currency-val text-slate-800">
                            {formatUSD(p.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: EFICIENCIA OPERATIVA */}
      {activeTab === 'operaciones' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Workload grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Active projects phases summary */}
            <div className="lg:col-span-8 custom-card p-6 flex flex-col justify-between h-full">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-6">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Carga de Trabajo por Fases Operativas</h3>
                  <p className="text-[11px] text-slate-450 mt-0.5">Volumen y porcentaje de proyectos activos distribuidos en la cadena de ejecución del taller</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(proyectosFaseCount).map(([fase, val]) => {
                    const totalProy = proyectosActivos.length || 1;
                    const pct = Math.round((val / totalProy) * 100);
                    return (
                      <div key={fase} className="bg-slate-50/50 border border-slate-200/50 rounded-2xl p-4 text-center flex flex-col justify-between shadow-xs">
                        <div>
                          <span 
                            className="w-2.5 h-2.5 rounded-full inline-block mb-2" 
                            style={{ backgroundColor: FASE_COLORS[fase] || '#94a3b8' }}
                          />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                            {FASE_LABELS[fase] || fase}
                          </p>
                        </div>
                        <div className="mt-3">
                          <h4 className="text-xl font-black text-slate-800">{val}</h4>
                          <span className="text-[10px] font-semibold text-slate-450 mt-0.5 block">{pct}% del total</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 bg-slate-50 border border-slate-250/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-100 text-indigo-600 shrink-0">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Eficiencia de Ejecución</h4>
                    <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                      Actualmente hay <strong className="text-slate-700 font-bold">{proyectosActivos.filter(p => p.faseActual === 'COMPLETADO').length} proyectos completados</strong> y <strong className="text-slate-750 font-bold">{proyectosActivos.filter(p => p.faseActual !== 'COMPLETADO').length} en fase operativa activa</strong>. La fase de mayor carga actual es: <strong className="text-slate-800 font-extrabold">{
                        Object.entries(proyectosFaseCount).reduce((max, e) => e[1] > max[1] ? e : max, ['', -1])[0]
                      }</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Roster with Avatars and Active Tasks */}
            <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
              <div className="flex flex-col h-full justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">Colaboradores</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Monitoreo de tareas del equipo en tiempo real</p>
                  </div>
                  <button 
                    onClick={() => navigate('/nomina/empleados')} 
                    className="text-xs font-bold text-slate-550 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Nómina
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[340px] thin-scrollbar pr-1 flex-1">
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
                                <p className="text-[9.5px] text-slate-450 leading-normal truncate" title={`${user.lastAction.accion} (${user.lastAction.modulo})`}>
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
      )}

    </div>
  );
}
