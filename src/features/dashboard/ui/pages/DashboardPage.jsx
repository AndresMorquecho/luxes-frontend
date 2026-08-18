import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';
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
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Car,
  Briefcase
} from 'lucide-react';

const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

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
  const height = 180;
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

// Donut Chart for categories breakdown
function DonutEgresos({ data, total }) {
  const r = 36;
  const circ = 2 * Math.PI * r;

  let accumulatedOffset = 0;
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'];

  const slices = data.map((item, idx) => {
    const strokeLength = (item.valor / (total || 1)) * circ;
    const strokeOffset = accumulatedOffset;
    accumulatedOffset -= strokeLength;
    return {
      ...item,
      color: colors[idx % colors.length],
      strokeLength,
      strokeOffset
    };
  });

  return (
    <div className="relative w-[120px] h-[120px] flex items-center justify-center shrink-0">
      <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90">
        {total === 0 ? (
          <circle cx="50" cy="50" r="36" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
        ) : (
          slices.map((slice, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="36"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="10"
              strokeDasharray={`${slice.strokeLength} ${circ - slice.strokeLength}`}
              strokeDashoffset={slice.strokeOffset}
            />
          ))
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 select-none pointer-events-none">
        <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Total</span>
        <span className="text-[11px] font-bold text-slate-800 leading-none">{formatUSD(total)}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [rango, setRango] = useState('mes'); // '7dias', '30dias', 'mes'
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0b2d64] animate-spin" />
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">Cargando métricas de negocio...</p>
      </div>
    );
  }

  const {
    kpi = {},
    usersActivity = [],
    proyectosActivos = [],
    recentMovements = [],
    dailyData = [],
    egresosDistribucion = [],
    quickSummary = {},
  } = summary || {};

  const sparklineBalance = dailyData.map(d => d.balance);
  const sparklineIngresos = dailyData.map(d => d.ingresos);
  const sparklineEgresos = dailyData.map(d => d.egresos);

  const instCompletados = proyectosActivos.filter(p => p.requiereInstalacion && p.faseActual === 'COMPLETADO').length;
  const instPendientes = proyectosActivos.filter(p => p.requiereInstalacion && p.faseActual !== 'COMPLETADO').length;
  const noInstCompletados = proyectosActivos.filter(p => !p.requiereInstalacion && p.faseActual === 'COMPLETADO').length;
  const noInstPendientes = proyectosActivos.filter(p => !p.requiereInstalacion && p.faseActual !== 'COMPLETADO').length;

  const maxCajaVal = Math.max(kpi.ingresos, kpi.egresos, 1);
  const widthIngPct = (kpi.ingresos / maxCajaVal) * 100;
  const widthEgrPct = (kpi.egresos / maxCajaVal) * 100;

  const egresoColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'];

  const getColaboradorBadgeClass = (rol) => {
    const r = (rol || '').toLowerCase();
    if (r === 'taller') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (r === 'administrador') return 'bg-violet-50 text-violet-700 border-violet-100';
    return 'bg-purple-50 text-purple-700 border-purple-100';
  };

  const getTrendBadge = (val, isExpense = false) => {
    const isPositive = val > 0;
    const isNeutral = val === 0;

    let colorClass = 'bg-slate-100 text-slate-600';
    if (!isNeutral) {
      if (isExpense) {
        colorClass = isPositive ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      } else {
        colorClass = isPositive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100';
      }
    }

    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${colorClass}`}>
        {isPositive ? '↑' : isNeutral ? '─' : '↓'} {Math.abs(val)}% vs anterior
      </span>
    );
  };

  return (
    <div className="w-full pb-20 md:pb-6 animate-slide-up db-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .db-root, .db-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
      `}</style>

      {/* Header Section con Filtros de Fechas Integrados */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs mb-4 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 shadow-xs">
              <LayoutDashboard size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Resumen de Operaciones</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Principal
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Perspectiva consolidada de flujo de caja, proyectos y cuentas del negocio</p>
            </div>
          </div>

          {/* Filtros de Rango de Fechas en el Header */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setRango('7dias')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${rango === '7dias'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => setRango('30dias')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${rango === '30dias'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                30 días
              </button>
              <button
                type="button"
                onClick={() => setRango('mes')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${rango === 'mes'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Último mes
              </button>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl">
              <Calendar size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Row: 5 KPI Cards (Estrictamente una sola fila) */}
      <div className="grid grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Card 1: Balance Neto */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-all min-h-[140px]">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block shrink-0" /> Balance Neto
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mt-1.5 truncate">
                {formatUSD(kpi.balance)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Saldo neto en caja</p>
            </div>
            <div className="shrink-0 pt-1">
              <Sparkline data={sparklineBalance} color="#8b5cf6" />
            </div>
          </div>
          <div className="border-t border-slate-100/80 pt-2 mt-auto">
            {getTrendBadge(kpi.changeBalance)}
          </div>
        </div>

        {/* Card 2: Ingresos */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-all min-h-[140px]">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block shrink-0" /> Ingresos
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mt-1.5 truncate">
                {formatUSD(kpi.ingresos)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Cobros liquidados</p>
            </div>
            <div className="shrink-0 pt-1">
              <Sparkline data={sparklineIngresos} color="#10b981" />
            </div>
          </div>
          <div className="border-t border-slate-100/80 pt-2 mt-auto">
            {getTrendBadge(kpi.changeIngresos)}
          </div>
        </div>

        {/* Card 3: Egresos */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-all min-h-[140px]">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block shrink-0" /> Egresos
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mt-1.5 truncate">
                {formatUSD(kpi.egresos)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Gastos y compras pagadas</p>
            </div>
            <div className="shrink-0 pt-1">
              <Sparkline data={sparklineEgresos} color="#ef4444" />
            </div>
          </div>
          <div className="border-t border-slate-100/80 pt-2 mt-auto">
            {getTrendBadge(kpi.changeEgresos, true)}
          </div>
        </div>

        {/* Card 4: Por Cobrar */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-all min-h-[140px]">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block shrink-0" /> Por Cobrar
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mt-1.5 truncate">
                {formatUSD(kpi.totalProformasPendienteCobro)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Proformas aprobadas</p>
            </div>
            <div className="shrink-0 pt-1">
              <svg width="60" height="24" className="overflow-visible">
                <line x1="0" y1="12" x2="60" y2="12" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
          <div className="border-t border-slate-100/80 pt-2 mt-auto">
            {getTrendBadge(kpi.changeProformasPendienteCobro)}
          </div>
        </div>

        {/* Card 5: Cuentas por Pagar */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-all min-h-[140px]">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full inline-block shrink-0" /> Cuentas por Pagar
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mt-1.5 truncate">
                {formatUSD(kpi.totalCxPPendientes)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Saldos de OC's pendientes</p>
            </div>
            <div className="shrink-0 pt-1">
              <svg width="60" height="24" className="overflow-visible">
                <line x1="0" y1="12" x2="60" y2="12" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
          <div className="border-t border-slate-100/80 pt-2 mt-auto">
            {getTrendBadge(kpi.changeCxPPendientes, true)}
          </div>
        </div>
      </div>

      {/* Row 2: Flujo de Caja (Line Chart), Distribución de Egresos (Donut Chart), Carga de Trabajo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch mb-4 sm:mb-6">
        {/* Flujo de Caja Line Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Flujo de Caja</h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 rounded-lg px-2.5 py-0.5 border border-slate-200">
                {rango === '7dias' ? 'Últimos 7 días' : rango === '30dias' ? 'Últimos 30 días' : 'Último mes'}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#10b981] rounded-full inline-block" /> Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#ef4444] rounded-full inline-block" /> Egresos</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#8b5cf6] rounded-full inline-block" /> Balance</span>
            </div>
          </div>

          <div className="h-[180px] w-full mt-4">
            <FlujoCajaChart dailyData={dailyData} />
          </div>
        </div>

        {/* Distribución de Egresos Donut Chart */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Distribución de Egresos</h3>
            </div>

            <div className="flex items-center gap-3">
              <DonutEgresos data={egresosDistribucion} total={kpi.egresos} />

              <div className="flex-1 space-y-1.5 max-h-[140px] overflow-y-auto pl-1">
                {egresosDistribucion.slice(0, 5).map((eg, idx) => (
                  <div key={eg.categoria} className="flex flex-col text-[10px]">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span className="flex items-center gap-1 truncate max-w-[70px]">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: egresoColors[idx % egresoColors.length] }} />
                        <span className="truncate">{eg.categoria}</span>
                      </span>
                      <span className="text-slate-800 font-bold">{formatUSD(eg.valor).replace('.00', '')}</span>
                    </div>
                    <span className="text-[8.5px] text-slate-400 ml-2.5 font-semibold">{eg.porcentaje}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center text-xs font-bold text-blue-600">
            <button type="button" onClick={() => navigate('/gastos')} className="hover:underline cursor-pointer flex items-center gap-1 text-blue-600">
              Ver detalle de egresos
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Carga de Trabajo */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Carga de Trabajo</h3>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Proyectos según requerimiento de instalación</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Con Instalación */}
              <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Con Instalación</span>
                  <h4 className="text-lg font-bold text-slate-800 mt-1">
                    {instCompletados + instPendientes} <span className="text-[10px] font-medium text-slate-400">Proyectos</span>
                  </h4>
                </div>

                <div className="mt-3 space-y-1 border-t border-slate-200/60 pt-2 text-[10px] font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Completados</span>
                    <span className="text-emerald-600">{instCompletados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">En Curso</span>
                    <span className="text-amber-600">{instPendientes}</span>
                  </div>
                </div>
              </div>

              {/* Sin Instalación */}
              <div className="bg-slate-50/70 border border-slate-200/60 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sin Instalación</span>
                  <h4 className="text-lg font-bold text-slate-800 mt-1">
                    {noInstCompletados + noInstPendientes} <span className="text-[10px] font-medium text-slate-400">Proyectos</span>
                  </h4>
                </div>

                <div className="mt-3 space-y-1 border-t border-slate-200/60 pt-2 text-[10px] font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Completados</span>
                    <span className="text-emerald-600">{noInstCompletados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">En Curso</span>
                    <span className="text-amber-600">{noInstPendientes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center text-xs font-bold text-blue-600">
            <button type="button" onClick={() => navigate('/proyectos')} className="hover:underline cursor-pointer flex items-center gap-1 text-blue-600">
              Ver todos los proyectos
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Proyectos en Ejecución, Comparativa de Caja, Resumen Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch mb-4 sm:mb-6">
        {/* Proyectos en Ejecución */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Proyectos en Ejecución</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Control de avance de compromisos activos</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/proyectos')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                Ver todos
                <ChevronRight size={14} />
              </button>
            </div>

            {proyectosActivos.length === 0 ? (
              <div className="py-12 text-center text-xs font-medium text-slate-400 italic">
                Sin proyectos activos en este periodo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Proyecto</th>
                      <th className="pb-2">Fase</th>
                      <th className="pb-2">Progreso</th>
                      <th className="pb-2">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {proyectosActivos.slice(0, 3).map(p => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        onClick={() => navigate(`/proyectos/${p.id}`)}
                      >
                        <td className="py-3 pr-2">
                          <span className="font-bold text-slate-800 block text-xs leading-tight">
                            {p.nombre}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{p.clienteNombre}</span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: FASE_COLORS[p.faseActual] || '#94a3b8' }}
                            />
                            <span className="text-[11px] font-semibold text-slate-700">
                              {FASE_LABELS[p.faseActual] || p.faseActual}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 shrink-0 overflow-hidden">
                              <div
                                className="bg-[#0b2d64] h-full rounded-full"
                                style={{ width: `${p.progreso}%` }}
                              />
                            </div>
                            <span className="font-bold text-[10px] text-slate-700">{p.progreso}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-[11px] text-slate-500 font-medium">
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

        {/* Comparativa de Caja */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Comparativa de Caja</h3>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Relación de ingresos vs egresos</p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1">
                  <span>Ingresos</span>
                  <span className="text-slate-800">{formatUSD(kpi.ingresos)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${widthIngPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 mb-1">
                  <span>Egresos</span>
                  <span className="text-slate-800">{formatUSD(kpi.egresos)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#ef4444] h-full rounded-full" style={{ width: `${widthEgrPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 text-center">
            <span className={`text-xs font-bold ${kpi.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {kpi.balance >= 0
                ? `Superávit operativo +${formatUSD(kpi.balance)}`
                : `Déficit operativo -${formatUSD(Math.abs(kpi.balance))}`
              }
            </span>
          </div>
        </div>

        {/* Resumen Rápido */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Resumen Rápido</h3>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-[8px]">●</span>
                  <span className="text-xs font-medium text-slate-600">Proyectos activos</span>
                </div>
                <span className="text-xs font-bold text-slate-800">{proyectosActivos.filter(p => p.estado === 'ACTIVO').length}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-[8px]">●</span>
                  <span className="text-xs font-medium text-slate-600">OC's pendientes</span>
                </div>
                <span className="text-xs font-bold text-slate-800">{quickSummary.ocsPendientes || 0}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-[8px]">●</span>
                  <span className="text-xs font-medium text-slate-600">Proformas aprobadas</span>
                </div>
                <span className="text-xs font-bold text-slate-800">{quickSummary.proformasAprobadas || 0}</span>
              </div>

              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center font-bold text-[8px]">●</span>
                  <span className="text-xs font-medium text-slate-600">Tareas pendientes</span>
                </div>
                <span className="text-xs font-bold text-slate-800">{quickSummary.tareasPendientes || 0}</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold text-center border-t border-slate-100 pt-3 mt-4">
            Auditoría operativa y flujo de tareas
          </div>
        </div>
      </div>

      {/* Row 4: Movimientos de Caja Recientes (7/12) y Colaboradores (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Movimientos de Caja Recientes */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Movimientos de Caja Recientes</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Bitácora consolidada de ingresos y egresos</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/movimientos')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                Ver todos
                <ChevronRight size={14} />
              </button>
            </div>

            {recentMovements.length === 0 ? (
              <div className="py-12 text-center text-xs font-medium text-slate-400 italic">
                Sin movimientos financieros recientes en el período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Concepto</th>
                      <th className="pb-2">Entidad / Cliente</th>
                      <th className="pb-2">Método</th>
                      <th className="pb-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {recentMovements.slice(0, 4).map(m => (
                      <tr key={m.id + m.origen} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 text-slate-400 font-medium whitespace-nowrap">
                          {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }).replace('.', '')}
                        </td>
                        <td className="py-3 pr-2 text-slate-800 font-bold max-w-[150px] truncate">
                          {m.descripcion}
                        </td>
                        <td className="py-3 pr-2 text-slate-500 truncate max-w-[110px]">
                          {m.entidad || '—'}
                        </td>
                        <td className="py-3">
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                            {m.metodoPago}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-bold ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-500'
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

        {/* Colaboradores */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Colaboradores</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Estado actual y asignaciones activas</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/nomina/empleados')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                Ver todos
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {usersActivity.map(user => {
                return (
                  <div key={user.id} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PersonInitialsAvatar
                        name={user.nombre}
                        image={user.foto}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate leading-none">{user.nombre}</p>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1">
                          {user.pendingTasksCount > 0
                            ? `${user.pendingTasksCount} ${user.pendingTasksCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}`
                            : 'Sin tareas pendientes'
                          }
                        </span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${getColaboradorBadgeClass(user.rol)}`}>
                      {user.rol}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
