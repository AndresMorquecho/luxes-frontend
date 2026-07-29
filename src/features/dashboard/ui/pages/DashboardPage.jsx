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
  Layers, 
  ChevronRight,
  Calendar
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
        strokeWidth="1.5"
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
  
  // Find min and max for Y scale
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
  
  // Grid line ticks
  const yTicks = [minVal, minVal + range / 2, maxVal];
  
  // Build paths
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
      {/* Grid Lines */}
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
      
      {/* Zero line */}
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
      
      {/* Date Labels (Start and End) */}
      <text x={padding.left} y={height - 5} className="text-[9px] fill-slate-400 font-bold">
        {new Date(dailyData[0].fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
      </text>
      <text x={width - padding.right} y={height - 5} textAnchor="end" className="text-[9px] fill-slate-400 font-bold">
        {new Date(dailyData[dailyData.length - 1].fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
      </text>
      
      {/* Paths */}
      <path d={ingPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={egrPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={balPath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Donut Chart for categories breakdown
function DonutEgresos({ data, total }) {
  const r = 36;
  const circ = 2 * Math.PI * r; // ~226.19
  
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
        <span className="text-[12px] font-black text-slate-900 currency-val leading-none">{formatUSD(total)}</span>
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
      // mes (comienzo del mes actual)
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
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
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

  // Extracción de datos de sparklines reales
  const sparklineBalance = dailyData.map(d => d.balance);
  const sparklineIngresos = dailyData.map(d => d.ingresos);
  const sparklineEgresos = dailyData.map(d => d.egresos);

  // Proyectos con/sin instalación
  const instCompletados = proyectosActivos.filter(p => p.requiereInstalacion && p.faseActual === 'COMPLETADO').length;
  const instPendientes = proyectosActivos.filter(p => p.requiereInstalacion && p.faseActual !== 'COMPLETADO').length;
  const noInstCompletados = proyectosActivos.filter(p => !p.requiereInstalacion && p.faseActual === 'COMPLETADO').length;
  const noInstPendientes = proyectosActivos.filter(p => !p.requiereInstalacion && p.faseActual !== 'COMPLETADO').length;

  // Comparativa de caja variables
  const maxCajaVal = Math.max(kpi.ingresos, kpi.egresos, 1);
  const widthIngPct = (kpi.ingresos / maxCajaVal) * 100;
  const widthEgrPct = (kpi.egresos / maxCajaVal) * 100;

  // Colores para las categorías de egresos
  const egresoColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'];

  const getColaboradorBadgeClass = (rol) => {
    const r = (rol || '').toLowerCase();
    if (r === 'taller') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (r === 'administrador') return 'bg-violet-50 text-violet-700 border-violet-100';
    return 'bg-purple-50 text-purple-700 border-purple-100'; // ventas / visor / etc
  };

  const getTrendText = (val) => {
    if (val > 0) return `▲ ${val}% vs anterior`;
    if (val < 0) return `▼ ${Math.abs(val)}% vs anterior`;
    return `─ 0% vs anterior`;
  };

  return (
    <div className="pb-16 dashboard-container max-w-[1440px] mx-auto animate-fade-in px-4 sm:px-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        
        .dashboard-container {
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          letter-spacing: -0.015em;
          background-color: #f8fafc;
        }
        .currency-val {
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: -0.03em;
        }
        .custom-card {
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 16px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01), 0 4px 12px -5px rgba(0, 0, 0, 0.015);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .custom-card:hover {
          border-color: rgba(203, 213, 225, 0.95);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 8px 18px -4px rgba(0, 0, 0, 0.025);
        }
        .segment-btn {
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 8px;
          transition: all 0.15s ease;
          color: #64748b;
        }
        .segment-btn.active {
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pt-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">Resumen de Operaciones</h1>
          <p className="text-xs font-semibold text-slate-400 mt-2">
            Perspectiva consolidada de flujo de caja, proyectos y cuentas del negocio.
          </p>
        </div>

        {/* Range Toggles & Calendar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/40 shrink-0">
            <button onClick={() => setRango('7dias')} className={`segment-btn cursor-pointer ${rango === '7dias' ? 'active' : ''}`}>
              7 días
            </button>
            <button onClick={() => setRango('30dias')} className={`segment-btn cursor-pointer ${rango === '30dias' ? 'active' : ''}`}>
              30 días
            </button>
            <button onClick={() => setRango('mes')} className={`segment-btn cursor-pointer ${rango === 'mes' ? 'active' : ''}`}>
              Último mes
            </button>
          </div>
          <button className="p-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-500 rounded-xl cursor-pointer shadow-sm transition-colors">
            <Calendar size={15} />
          </button>
        </div>
      </div>

      {/* Top Row: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        
        {/* Card 1: Balance Neto */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block" /> Balance Neto
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-3 currency-val">
                {formatUSD(kpi.balance)}
              </h3>
              <p className="text-[10px] font-bold text-slate-450 mt-1">Saldo neto en caja</p>
            </div>
            <div className="pt-2">
              <Sparkline data={sparklineBalance} color="#8b5cf6" />
            </div>
          </div>
          <div className="border-t border-slate-50 mt-4 pt-3">
            <span className={`text-[10px] font-bold flex items-center gap-1 ${kpi.changeBalance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {getTrendText(kpi.changeBalance)}
            </span>
          </div>
        </div>

        {/* Card 2: Ingresos */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> Ingresos
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-3 currency-val">
                {formatUSD(kpi.ingresos)}
              </h3>
              <p className="text-[10px] font-bold text-slate-455 mt-1">Cobros reales liquidados</p>
            </div>
            <div className="pt-2">
              <Sparkline data={sparklineIngresos} color="#10b981" />
            </div>
          </div>
          <div className="border-t border-slate-50 mt-4 pt-3">
            <span className={`text-[10px] font-bold flex items-center gap-1 ${kpi.changeIngresos >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {getTrendText(kpi.changeIngresos)}
            </span>
          </div>
        </div>

        {/* Card 3: Egresos */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block" /> Egresos
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-3 currency-val">
                {formatUSD(kpi.egresos)}
              </h3>
              <p className="text-[10px] font-bold text-slate-455 mt-1">Gastos y compras pagados</p>
            </div>
            <div className="pt-2">
              <Sparkline data={sparklineEgresos} color="#ef4444" />
            </div>
          </div>
          <div className="border-t border-slate-50 mt-4 pt-3">
            <span className={`text-[10px] font-bold flex items-center gap-1 ${kpi.changeEgresos >= 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
              {getTrendText(kpi.changeEgresos)}
            </span>
          </div>
        </div>

        {/* Card 4: Por Cobrar */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block" /> Por Cobrar
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-3 currency-val">
                {formatUSD(kpi.totalProformasPendienteCobro)}
              </h3>
              <p className="text-[10px] font-bold text-slate-455 mt-1">Saldo de proformas aprobadas</p>
            </div>
            <div className="pt-2">
              <svg width="60" height="24" className="overflow-visible">
                <line x1="0" y1="12" x2="60" y2="12" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
          <div className="border-t border-slate-50 mt-4 pt-3">
            <span className={`text-[10px] font-bold flex items-center gap-1 ${kpi.changeProformasPendienteCobro >= 0 ? 'text-slate-500' : 'text-rose-500'}`}>
              {getTrendText(kpi.changeProformasPendienteCobro)}
            </span>
          </div>
        </div>

        {/* Card 5: Cuentas por Pagar */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full inline-block" /> Cuentas por Pagar
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-3 currency-val">
                {formatUSD(kpi.totalCxPPendientes)}
              </h3>
              <p className="text-[10px] font-bold text-slate-455 mt-1">Saldos de OC's pendientes</p>
            </div>
            <div className="pt-2">
              <svg width="60" height="24" className="overflow-visible">
                <line x1="0" y1="12" x2="60" y2="12" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>
          </div>
          <div className="border-t border-slate-50 mt-4 pt-3">
            <span className={`text-[10px] font-bold flex items-center gap-1 ${kpi.changeCxPPendientes >= 0 ? 'text-violet-600' : 'text-emerald-600'}`}>
              {getTrendText(kpi.changeCxPPendientes)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Flujo de Caja (Line Chart), Distribución de Egresos (Donut Chart), Carga de Trabajo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
        
        {/* Flujo de Caja Line Chart */}
        <div className="lg:col-span-5 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Flujo de Caja</h3>
              <span className="text-[10px] font-bold text-slate-450 bg-slate-50 rounded px-2 py-0.5 border border-slate-200/50">
                {rango === '7dias' ? 'Últimos 7 días' : rango === '30dias' ? 'Últimos 30 días' : 'Último mes'}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#10b981] rounded-full inline-block" /> Ingresos</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#ef4444] rounded-full inline-block" /> Egresos</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#8b5cf6] rounded-full inline-block" /> Balance Neto</span>
            </div>
          </div>

          <div className="h-[180px] w-full mt-6">
            <FlujoCajaChart dailyData={dailyData} />
          </div>
        </div>

        {/* Distribución de Egresos Donut Chart */}
        <div className="lg:col-span-3 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Distribución de Egresos</h3>
            </div>

            <div className="flex items-center gap-3">
              <DonutEgresos data={egresosDistribucion} total={kpi.egresos} />
              
              <div className="flex-1 space-y-1.5 max-h-[140px] overflow-y-auto thin-scrollbar pl-1">
                {egresosDistribucion.slice(0, 5).map((eg, idx) => (
                  <div key={eg.categoria} className="flex flex-col text-[10px]">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span className="flex items-center gap-1 truncate max-w-[70px]">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: egresoColors[idx % egresoColors.length] }} />
                        <span className="truncate">{eg.categoria}</span>
                      </span>
                      <span className="currency-val text-slate-900">{formatUSD(eg.valor).replace('.00', '')}</span>
                    </div>
                    <span className="text-[8px] text-slate-400 ml-2.5 font-bold">{eg.porcentaje}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center text-[10px] font-bold text-indigo-650">
            <button onClick={() => navigate('/gastos')} className="hover:underline cursor-pointer flex items-center gap-0.5">
              Ver detalle de egresos
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Carga de Trabajo (Installation status statistics) */}
        <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Carga de Trabajo</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-1">Proyectos según requerimiento de instalación</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Con Instalación */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Con Instalación</span>
                  <h4 className="text-xl font-black text-slate-900 mt-1 tracking-tight">
                    {instCompletados + instPendientes} <span className="text-[10px] font-bold text-slate-400">Proyectos</span>
                  </h4>
                </div>
                
                <div className="mt-4 space-y-1.5 border-t border-slate-100/80 pt-3 text-[10px] font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Completados</span>
                    <span className="text-emerald-600">{instCompletados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">En Curso</span>
                    <span className="text-amber-500">{instPendientes}</span>
                  </div>
                </div>
              </div>

              {/* Sin Instalación */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Sin Instalación</span>
                  <h4 className="text-xl font-black text-slate-900 mt-1 tracking-tight">
                    {noInstCompletados + noInstPendientes} <span className="text-[10px] font-bold text-slate-400">Proyectos</span>
                  </h4>
                </div>
                
                <div className="mt-4 space-y-1.5 border-t border-slate-100/80 pt-3 text-[10px] font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Completados</span>
                    <span className="text-emerald-600">{noInstCompletados}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">En Curso</span>
                    <span className="text-amber-500">{noInstPendientes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center text-[10px] font-bold text-indigo-650">
            <button onClick={() => navigate('/proyectos')} className="hover:underline cursor-pointer flex items-center gap-0.5">
              Ver todos los proyectos
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

      </div>

      {/* Row 3: Proyectos en Ejecución, Comparativa de Caja (Horizontal Bar), Resumen Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
        
        {/* Proyectos en Ejecución */}
        <div className="lg:col-span-5 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Proyectos en Ejecución</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Control del avance de los proyectos y compromisos</p>
              </div>
              <button 
                onClick={() => navigate('/proyectos')} 
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center cursor-pointer"
              >
                Ver todos
                <ChevronRight size={12} />
              </button>
            </div>

            {proyectosActivos.length === 0 ? (
              <div className="py-12 text-center text-[11px] font-medium text-slate-400 italic">
                Sin proyectos activos en este periodo.
              </div>
            ) : (
              <div className="overflow-x-auto thin-scrollbar">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2 font-bold">Proyecto</th>
                      <th className="pb-2 font-bold">Fase</th>
                      <th className="pb-2 font-bold">Progreso</th>
                      <th className="pb-2 font-bold">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                    {proyectosActivos.slice(0, 3).map(p => (
                      <tr 
                        key={p.id} 
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors" 
                        onClick={() => navigate(`/proyectos/${p.id}`)}
                      >
                        <td className="py-3 pr-2">
                          <span className="font-extrabold text-slate-800 block text-[11.5px] leading-tight">
                            {p.nombre}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-bold">{p.clienteNombre}</span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <span 
                              className="w-1.5 h-1.5 rounded-full shrink-0" 
                              style={{ backgroundColor: FASE_COLORS[p.faseActual] || '#94a3b8' }}
                            />
                            <span className="text-[10.5px]">
                              {FASE_LABELS[p.faseActual] || p.faseActual}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1 shrink-0 overflow-hidden">
                              <div 
                                className="bg-slate-800 h-full rounded-full" 
                                style={{ width: `${p.progreso}%` }} 
                              />
                            </div>
                            <span className="font-bold text-[9.5px] currency-val">{p.progreso}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-[10.5px] text-slate-500 font-bold">
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

        {/* Comparativa de Caja (Horizontal progress bars) */}
        <div className="lg:col-span-3 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Comparativa de Caja</h3>
              <p className="text-[10px] font-semibold text-slate-450 mt-0.5">Relación de ingresos vs egresos del periodo</p>
            </div>

            <div className="space-y-4">
              {/* Ingresos bar */}
              <div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                  <span>Ingresos</span>
                  <span className="text-slate-800 currency-val">{formatUSD(kpi.ingresos)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${widthIngPct}%` }} />
                </div>
              </div>

              {/* Egresos bar */}
              <div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                  <span>Egresos</span>
                  <span className="text-slate-800 currency-val">{formatUSD(kpi.egresos)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-[#ef4444] h-full rounded-full" style={{ width: `${widthEgrPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-4 text-center">
            <span className={`text-[10.5px] font-extrabold ${kpi.balance >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {kpi.balance >= 0 
                ? `Superávit operativo +${formatUSD(kpi.balance)}` 
                : `Déficit operativo -${formatUSD(Math.abs(kpi.balance))}`
              }
            </span>
          </div>
        </div>

        {/* Resumen Rápido */}
        <div className="lg:col-span-4 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Resumen Rápido</h3>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-[8px]">●</span>
                  <span className="text-[10.5px] font-bold text-slate-500">Proyectos activos</span>
                </div>
                <span className="text-xs font-black text-slate-700 currency-val">{proyectosActivos.filter(p => p.estado === 'ACTIVO').length}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-[8px]">●</span>
                  <span className="text-[10.5px] font-bold text-slate-500">OC's pendientes</span>
                </div>
                <span className="text-xs font-black text-slate-700 currency-val">{quickSummary.ocsPendientes || 0}</span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-[8px]">●</span>
                  <span className="text-[10.5px] font-bold text-slate-500">Proformas aprobadas</span>
                </div>
                <span className="text-xs font-black text-slate-700 currency-val">{quickSummary.proformasAprobadas || 0}</span>
              </div>

              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center font-bold text-[8px]">●</span>
                  <span className="text-[10.5px] font-bold text-slate-500">Tareas pendientes</span>
                </div>
                <span className="text-xs font-black text-slate-700 currency-val">{quickSummary.tareasPendientes || 0}</span>
              </div>
            </div>
          </div>

          <div className="text-[9.5px] text-slate-400 font-bold text-center border-t border-slate-100 pt-3 mt-4">
            Auditoría de almacén y tareas operativas
          </div>
        </div>

      </div>

      {/* Row 4: Movimientos de Caja Recientes (7/12) y Colaboradores (5/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Movimientos de Caja Recientes */}
        <div className="lg:col-span-7 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Movimientos de Caja Recientes</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Bitácora consolidada de ingresos y egresos recientes</p>
              </div>
              <button 
                onClick={() => navigate('/movimientos')} 
                className="text-[10px] font-bold text-indigo-650 hover:text-indigo-750 transition-colors flex items-center cursor-pointer"
              >
                Ver todos
                <ChevronRight size={12} />
              </button>
            </div>

            {recentMovements.length === 0 ? (
              <div className="py-12 text-center text-[11px] font-medium text-slate-400 italic">
                Sin movimientos financieros recientes en el período.
              </div>
            ) : (
              <div className="overflow-x-auto thin-scrollbar">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2 font-bold">Fecha</th>
                      <th className="pb-2 font-bold">Concepto</th>
                      <th className="pb-2 font-bold">Entidad / Cliente</th>
                      <th className="pb-2 font-bold">Método</th>
                      <th className="pb-2 text-right font-bold">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                    {recentMovements.slice(0, 4).map(m => (
                      <tr key={m.id + m.origen} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 text-slate-400 font-bold">
                          {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }).replace('.', '')}
                        </td>
                        <td className="py-3 pr-2 text-slate-800 font-extrabold max-w-[150px] truncate">
                          {m.descripcion}
                        </td>
                        <td className="py-3 pr-2 text-slate-500 font-bold truncate max-w-[110px]">
                          {m.entidad || '—'}
                        </td>
                        <td className="py-3">
                          <span className="inline-block text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200/50">
                            {m.metodoPago}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-bold text-[11.5px] currency-val ${
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

        {/* Colaboradores */}
        <div className="lg:col-span-5 custom-card p-6 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Colaboradores</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Estado actual y asignaciones activas</p>
              </div>
              <button 
                onClick={() => navigate('/nomina/empleados')} 
                className="text-[10px] font-bold text-indigo-650 hover:text-indigo-750 transition-colors flex items-center cursor-pointer"
              >
                Ver todos
                <ChevronRight size={12} />
              </button>
            </div>

            <div className="space-y-4 max-h-[220px] overflow-y-auto thin-scrollbar pr-1">
              {usersActivity.map(user => {
                return (
                  <div key={user.id} className="flex items-center justify-between gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <PersonInitialsAvatar 
                        name={user.nombre}
                        image={user.foto}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-black text-slate-800 truncate leading-none">{user.nombre}</p>
                        <span className="text-[9.5px] text-slate-400 font-bold block mt-1">
                          {user.pendingTasksCount > 0 
                            ? `${user.pendingTasksCount} ${user.pendingTasksCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}` 
                            : 'Sin tareas pendientes'
                          }
                        </span>
                      </div>
                    </div>
                    
                    <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${getColaboradorBadgeClass(user.rol)}`}>
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
