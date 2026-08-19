import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';
import aluxLogoHQ from '../../../../assets/aluxLogoHQ.png';
import {
  LayoutDashboard,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Layers,
  ChevronRight,
  Calendar,
  Clock,
  User,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Package,
  ShoppingCart,
  CheckSquare,
  Eye,
  Plus,
  ArrowRight,
  Briefcase,
  Building2,
  Wrench,
  Percent,
  Timer,
  Activity,
  Flame,
  CheckCircle,
  XCircle,
  Hourglass,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

const FASE_LABELS = {
  COTIZACION: 'Cotización',
  DISENO: 'Diseño y Planos',
  DISEÑO: 'Diseño y Planos',
  DISENIO: 'Diseño y Planos',
  APROBACION: 'Aprobación Técnica',
  PRODUCCION: 'Fabricación en Taller',
  TALLER: 'Fabricación en Taller',
  INSTALACION: 'Instalación en Obra',
  OBRA: 'Instalación en Obra',
  ENTREGA: 'Entrega Final',
  COMPLETADO: 'Completado',
};

const FASE_COLORS = {
  COTIZACION: '#64748b',
  DISENO: '#8b5cf6',
  DISEÑO: '#8b5cf6',
  DISENIO: '#8b5cf6',
  APROBACION: '#f59e0b',
  PRODUCCION: '#2563eb',
  TALLER: '#2563eb',
  INSTALACION: '#ea580c',
  OBRA: '#ea580c',
  ENTREGA: '#0891b2',
  COMPLETADO: '#059669',
};

// Sparkline component to draw small trends based on dailyData
function Sparkline({ data, color }) {
  if (!data || data.length < 2) {
    return (
      <svg width="60" height="24" className="overflow-visible">
        <line x1="0" y1="12" x2="60" y2="12" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    );
  }
  const width = 60;
  const height = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - 2 - ((val - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Interactive SVG Flow Line Chart
function FlujoCajaChart({ dailyData }) {
  if (!dailyData || dailyData.length === 0) return null;

  const width = 500;
  const height = 170;
  const padding = { top: 15, right: 15, bottom: 25, left: 45 };

  const allVals = dailyData.flatMap(d => [d.ingresos, d.egresos, d.balance]);
  const maxVal = Math.max(...allVals, 100);
  const minVal = Math.min(...allVals, -100);
  const range = maxVal - minVal || 1;

  const getX = (index) => {
    return padding.left + (index / (dailyData.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (val) => {
    return padding.top + (1 - (val - minVal) / range) * (height - padding.top - padding.bottom);
  };

  const yTicks = [minVal, minVal + range / 2, maxVal];

  let ingPath = '';
  let egrPath = '';
  let balPath = '';

  dailyData.forEach((d, idx) => {
    const x = getX(idx);
    const yIng = getY(d.ingresos);
    const yEgr = getY(d.egresos);
    const yBal = getY(d.balance);

    if (idx === 0) {
      ingPath = `M ${x} ${yIng}`;
      egrPath = `M ${x} ${yEgr}`;
      balPath = `M ${x} ${yBal}`;
    } else {
      ingPath += ` L ${x} ${yIng}`;
      egrPath += ` L ${x} ${yEgr}`;
      balPath += ` L ${x} ${yBal}`;
    }
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={getY(tick)}
            x2={width - padding.right}
            y2={getY(tick)}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={getY(tick) + 3}
            textAnchor="end"
            className="text-[9px] fill-slate-400 font-bold"
          >
            {formatUSD(tick).replace('.00', '')}
          </text>
        </g>
      ))}

      {minVal < 0 && maxVal > 0 && (
        <line
          x1={padding.left}
          y1={getY(0)}
          x2={width - padding.right}
          y2={getY(0)}
          stroke="#cbd5e1"
          strokeDasharray="2 2"
          strokeWidth="1"
        />
      )}

      <text x={padding.left} y={height - 5} className="text-[9px] fill-slate-400 font-bold">
        {new Date(dailyData[0].fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
      </text>
      <text x={width - padding.right} y={height - 5} textAnchor="end" className="text-[9px] fill-slate-400 font-bold">
        {new Date(dailyData[dailyData.length - 1].fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
      </text>

      <path d={ingPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={egrPath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={balPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [rango, setRango] = useState('mes'); // '7dias', '30dias', 'mes'
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [radarFilter, setRadarFilter] = useState('all'); // 'all', 'risk', 'today'

  const getDatesForRange = (range) => {
    const hasta = new Date();
    const desde = new Date();

    if (range === '7dias') {
      desde.setDate(desde.getDate() - 7);
      desde.setHours(0, 0, 0, 0);
    } else if (range === '30dias') {
      desde.setDate(desde.getDate() - 30);
      desde.setHours(0, 0, 0, 0);
    } else {
      desde.setDate(1);
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
      <div className="flex flex-col items-center justify-center h-[55vh] gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-[#0b2d64] animate-spin" />
        <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase animate-pulse">
          Calculando métricas operativas y de fases ALUX...
        </p>
      </div>
    );
  }

  const {
    kpi = {},
    conversionComercial = {},
    radarFases = [],
    fasesAlertas = { vencidas: 0, porVencer: 0, enPlazo: 0 },
    puntualidad = { totalCompletados: 0, entregasATiempo: 0, entregasConRetraso: 0, tasaPuntualidad: 100 },
    reclamosPostVenta = { pendientes: 0, finalizados: 0 },
    usersActivity = [],
    recentMovements = [],
    dailyData = [],
    quickSummary = {},
  } = summary || {};

  // Filtrado de radar de proyectos
  const filteredRadar = radarFases.filter((p) => {
    if (radarFilter === 'risk') {
      return p.urgencia === 'VENCIDO' || p.urgencia === 'HOY' || p.urgencia === 'POR_VENCER';
    }
    if (radarFilter === 'today') {
      return p.urgencia === 'HOY';
    }
    return true;
  });

  const getUrgencyBadge = (urgencia, diasRestantes, fechaLimite) => {
    if (urgencia === 'VENCIDO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
          <AlertCircle size={13} className="text-rose-600" />
          <span>Vencido hace {Math.abs(diasRestantes || 1)}d</span>
        </span>
      );
    }
    if (urgencia === 'HOY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-300">
          <Flame size={13} className="text-amber-600" />
          <span>Vence HOY</span>
        </span>
      );
    }
    if (urgencia === 'POR_VENCER') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={13} className="text-amber-600" />
          <span>Vence en {diasRestantes}d</span>
        </span>
      );
    }
    if (urgencia === 'A_TIEMPO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>En plazo ({diasRestantes}d)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
        <span>Sin fecha límite</span>
      </span>
    );
  };

  const getColaboradorBadgeClass = (rol) => {
    const r = (rol || '').toLowerCase();
    if (r === 'taller') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (r === 'administrador') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const totalProformasEmitidas = conversionComercial.totalEmitidas || 0;
  const tasaConversionPct = conversionComercial.tasaConversion || 0;
  const tasaPuntualidadPct = puntualidad.tasaPuntualidad || 100;
  const totalAlertasFases = (fasesAlertas.vencidas || 0) + (fasesAlertas.porVencer || 0);

  return (
    <div className="w-full pb-20 md:pb-8 animate-slide-up db-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .db-root, .db-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
      `}</style>

      {/* ── HEADER EJECUTIVO ALUX ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs mb-4 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo e Identidad */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0b2d64] to-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-1.5 shadow-sm">
              <img src={aluxLogoHQ} alt="ALUX" className="w-full h-full object-contain brightness-110" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                  Centro de Control Operativo ALUX
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/60">
                  Aluminio & Vidrio
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento de fases por vencer, efectividad de cotizaciones a venta y puntualidad de entrega
              </p>
            </div>
          </div>

          {/* Filtros de Rango y Acciones */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setRango('7dias')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  rango === '7dias' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => setRango('30dias')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  rango === '30dias' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                30 días
              </button>
              <button
                type="button"
                onClick={() => setRango('mes')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  rango === 'mes' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Último mes
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/proformas/nueva')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Nueva Proforma</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/proyectos/nuevo')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b2d64] hover:bg-[#071f45] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Nuevo Proyecto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILA 1: 4 KPIS PRINCIPALES DE DESEMPEÑO (CONVERSIÓN, PUNTUALIDAD, FASES LÍMITE, LIQUIDEZ) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-4 sm:mb-6">
        {/* KPI 1: Tasa de Conversión (Proformas -> Ventas) */}
        <div 
          onClick={() => navigate('/proformas')}
          className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all min-h-[145px] cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate group-hover:text-blue-600 transition-colors">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full inline-block shrink-0" />
                Conversión a Ventas
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {tasaConversionPct}%
                </h3>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {conversionComercial.totalConvertidas || 0} de {totalProformasEmitidas}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                {formatUSD(conversionComercial.totalVendidoAprobado)} de {formatUSD(conversionComercial.totalCotizado)} cotizados
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Percent size={18} />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-2.5 mt-auto flex items-center justify-between">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mr-3 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${Math.min(tasaConversionPct, 100)}%` }} />
            </div>
            <span className="text-[10px] font-bold text-blue-600 shrink-0 group-hover:underline">Ver &rarr;</span>
          </div>
        </div>

        {/* KPI 2: Tasa de Puntualidad en Entregas */}
        <div 
          onClick={() => navigate('/proyectos')}
          className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all min-h-[145px] cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate group-hover:text-emerald-600 transition-colors">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block shrink-0" />
                Puntualidad en Entregas
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {tasaPuntualidadPct}%
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {puntualidad.entregasATiempo || 0} a tiempo
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                {puntualidad.entregasConRetraso === 0
                  ? 'Todas las obras completadas en fecha estimada'
                  : `${puntualidad.entregasConRetraso} ${puntualidad.entregasConRetraso === 1 ? 'obra con retraso' : 'obras con retraso'}`
                }
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-2.5 mt-auto flex items-center justify-between">
            <div className="w-full bg-slate-100 rounded-full h-1.5 mr-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(tasaPuntualidadPct, 100)}%` }} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 shrink-0 group-hover:underline">Detalle &rarr;</span>
          </div>
        </div>

        {/* KPI 3: Control de Fases Críticas y Vencimientos */}
        <div 
          onClick={() => setRadarFilter('risk')}
          className={`bg-white border rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all min-h-[145px] cursor-pointer group ${
            totalAlertasFases > 0 ? 'border-amber-200/80 bg-amber-50/20' : 'border-slate-100'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate group-hover:text-amber-700 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${totalAlertasFases > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} />
                Fases por Vencer / Vencidas
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <h3 className={`text-2xl sm:text-3xl font-black tracking-tight ${totalAlertasFases > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
                  {totalAlertasFases}
                </h3>
                {fasesAlertas.vencidas > 0 ? (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    {fasesAlertas.vencidas} vencidas
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {fasesAlertas.porVencer} en &le;48h
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                {fasesAlertas.enPlazo} proyectos con fases en plazo normal
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
              totalAlertasFases > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
            }`}>
              <Timer size={18} />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-2.5 mt-auto flex items-center justify-between text-[10px] font-bold text-amber-800">
            <span>{totalAlertasFases > 0 ? 'Requiere atención en taller/obra' : 'Todo en orden'}</span>
            <span className="text-blue-600 group-hover:underline">Filtrar &rarr;</span>
          </div>
        </div>

        {/* KPI 4: Balance Neto & Liquidez Operativa */}
        <div 
          onClick={() => navigate('/movimientos')}
          className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all min-h-[145px] cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate group-hover:text-indigo-600 transition-colors">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block shrink-0" />
                Balance Neto en Caja
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                  {formatUSD(kpi.balance)}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                +{formatUSD(kpi.ingresos)} cobrados / -{formatUSD(kpi.egresos)} egresos
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-2.5 mt-auto flex items-center justify-between text-[10px] font-bold">
            <span className="text-emerald-600">Por cobrar: {formatUSD(kpi.totalProformasPendienteCobro).replace('.00', '')}</span>
            <span className="text-blue-600 group-hover:underline">Caja &rarr;</span>
          </div>
        </div>
      </div>

      {/* ── FILA 2: EMBUDO COMERCIAL (PROFORMAS -> VENTAS) & FLUJO DE CAJA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch mb-4 sm:mb-6">
        {/* Embudo Comercial ALUX (6/12) */}
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={15} className="text-blue-600" />
                  <span>Embudo de Conversión Comercial (Cotizaciones &rarr; Ventas)</span>
                </h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Efectividad de proformas emitidas en el período</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/proformas')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                Ver proformas
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Etapas del Funnel */}
            <div className="space-y-3 pt-1">
              {/* 1. Proformas Totales Emitidas */}
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Cotizaciones Realizadas</h4>
                    <span className="text-[10px] text-slate-400 font-medium">Volumen total emitido</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-slate-800 block">
                    {conversionComercial.totalEmitidas || 0} proformas
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {formatUSD(conversionComercial.totalCotizado)}
                  </span>
                </div>
              </div>

              {/* 2. Por Aprobar / Negociación */}
              <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">En Negociación / Por Aprobar</h4>
                    <span className="text-[10px] text-amber-700 font-medium">Esperando confirmación del cliente</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-amber-900 block">
                    {conversionComercial.porAprobar || 0} proformas
                  </span>
                  <span className="text-[10px] font-bold text-amber-700">En seguimiento</span>
                </div>
              </div>

              {/* 3. Convertidas en Venta (Aprobadas / Pagadas) */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>Cerradas en Venta</span>
                      <span className="text-[9px] font-extrabold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-full">
                        {tasaConversionPct}% Éxito
                      </span>
                    </h4>
                    <span className="text-[10px] text-emerald-700 font-medium">Proformas aprobadas que van a taller</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-emerald-900 block">
                    {conversionComercial.totalConvertidas || 0} proyectos
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700">
                    {formatUSD(conversionComercial.totalVendidoAprobado)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Efectividad comercial: <strong className="text-blue-600">{tasaConversionPct}%</strong></span>
            <button
              type="button"
              onClick={() => navigate('/proformas/nueva')}
              className="text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              + Nueva cotización &rarr;
            </button>
          </div>
        </div>

        {/* Flujo de Caja y Rendimiento Financiero (6/12) */}
        <div className="lg:col-span-6 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Flujo de Liquidez ALUX</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Evolución diaria de cobros, compras de insumos y balance</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 rounded-lg px-2.5 py-0.5 border border-slate-200">
                {rango === '7dias' ? '7 días' : rango === '30dias' ? '30 días' : 'Mes actual'}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#10b981] rounded-full inline-block" /> Cobros (+{formatUSD(kpi.ingresos).replace('.00', '')})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#ef4444] rounded-full inline-block" /> Egresos (-{formatUSD(kpi.egresos).replace('.00', '')})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#8b5cf6] rounded-full inline-block" /> Balance ({formatUSD(kpi.balance).replace('.00', '')})</span>
            </div>

            <div className="h-[170px] w-full mt-3">
              <FlujoCajaChart dailyData={dailyData} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">
              Cuentas por pagar OC: <strong className="text-rose-600">{formatUSD(kpi.totalCxPPendientes)}</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate('/gastos')}
              className="text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              Ver gastos &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── FILA 3: RADAR DE PROYECTOS, FASES ACTIVAS Y TIEMPOS LÍMITE (EL NÚCLEO OPERATIVO) ── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Timer size={17} className="text-[#0b2d64]" />
                <span>Radar de Fases ALUX y Tiempos Límite</span>
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {radarFases.length} Proyectos en curso
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Supervisión de la fase actual, fecha límite estimada y alerta de vencimientos para taller y obra
            </p>
          </div>

          {/* Filtros de Urgencia */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setRadarFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                radarFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos ({radarFases.length})
            </button>
            <button
              type="button"
              onClick={() => setRadarFilter('risk')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                radarFilter === 'risk' ? 'bg-amber-50 text-amber-800 shadow-xs font-black' : 'text-slate-500 hover:text-amber-800'
              }`}
            >
              <AlertTriangle size={12} className={totalAlertasFases > 0 ? 'text-amber-600' : ''} />
              <span>Por vencer / Vencidos ({totalAlertasFases})</span>
            </button>
            <button
              type="button"
              onClick={() => setRadarFilter('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                radarFilter === 'today' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Vencen hoy ({radarFases.filter(p => p.urgencia === 'HOY').length})
            </button>
          </div>
        </div>

        {/* Tabla / Lista de Radar */}
        {filteredRadar.length === 0 ? (
          <div className="py-14 text-center">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-bold text-slate-700">Sin proyectos con alertas pendientes en este filtro</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Todas las fases de proyectos en taller y obra se encuentran en plazo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Proyecto / Obra</th>
                  <th className="pb-3">Fase Actual ALUX</th>
                  <th className="pb-3">Tiempo Límite / Estado</th>
                  <th className="pb-3">Responsable</th>
                  <th className="pb-3 text-right pr-2">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRadar.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                  >
                    {/* Proyecto & Cliente */}
                    <td className="py-3.5 pl-2 pr-3">
                      <div className="flex items-center gap-2.5">
                        <PersonInitialsAvatar name={p.nombre} seed={p.id} size="sm" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block text-xs leading-snug truncate max-w-[220px] group-hover:text-blue-600 transition-colors">
                            {p.nombre}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[200px]">
                            {p.clienteNombre}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Fase Actual con color y número */}
                    <td className="py-3.5 pr-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: FASE_COLORS[p.faseActual] || '#2563eb' }}
                          />
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[190px]">
                            {p.faseNombre || FASE_LABELS[p.faseActual] || p.faseActual}
                          </span>
                        </div>
                        <span className="text-[9.5px] text-slate-400 font-semibold ml-4 mt-0.5">
                          Fase {p.faseIndex} de {p.totalFases}
                        </span>
                      </div>
                    </td>

                    {/* Tiempo Límite / Alerta */}
                    <td className="py-3.5 pr-3">
                      <div className="flex flex-col items-start gap-1">
                        {getUrgencyBadge(p.urgencia, p.diasRestantes, p.fechaLimite)}
                        {p.fechaLimite && (
                          <span className="text-[10px] text-slate-400 font-medium ml-1">
                            Límite: {new Date(p.fechaLimite + 'T12:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Responsable */}
                    <td className="py-3.5 pr-3">
                      <span className="text-xs text-slate-700 font-semibold truncate max-w-[130px] block">
                        {p.responsable || 'Sin asignar'}
                      </span>
                    </td>

                    {/* Acción Directa */}
                    <td className="py-3.5 pr-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/proyectos/${p.id}`);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye size={13} />
                        <span>Ver Fase</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3.5 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-500">
          <span>Mostrando {filteredRadar.length} proyectos activos</span>
          <button
            type="button"
            onClick={() => navigate('/proyectos')}
            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
          >
            Ver todos los proyectos y fases &rarr;
          </button>
        </div>
      </div>

      {/* ── FILA 4: MOVIMIENTOS FINANCIEROS RECIENTES ── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Movimientos de Caja Recientes</h3>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Bitácora consolidada de cobros, compras de insumos y gastos operativos</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/movimientos')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            Ver todos los movimientos
            <ChevronRight size={14} />
          </button>
        </div>

        {recentMovements.length === 0 ? (
          <div className="py-8 text-center text-xs font-medium text-slate-400 italic">
            Sin movimientos financieros recientes en este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-2.5 pl-2">Fecha</th>
                  <th className="pb-2.5">Concepto / Descripción</th>
                  <th className="pb-2.5">Entidad / Cliente</th>
                  <th className="pb-2.5">Método de Pago</th>
                  <th className="pb-2.5 text-right pr-2">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentMovements.slice(0, 5).map((m) => (
                  <tr key={m.id + m.origen} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-2 text-slate-400 font-medium whitespace-nowrap">
                      {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3 pr-3 text-slate-800 font-bold max-w-[280px] truncate">
                      {m.descripcion}
                    </td>
                    <td className="py-3 pr-3 text-slate-500 truncate max-w-[180px]">
                      {m.entidad || '—'}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                        {m.metodoPago}
                      </span>
                    </td>
                    <td className={`py-3 pr-2 text-right font-black ${
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

        <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center text-xs font-bold text-slate-500">
          <span>Libro diario y control de efectivo</span>
          <button
            type="button"
            onClick={() => navigate('/movimientos')}
            className="text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
          >
            Ir al Libro Diario &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
