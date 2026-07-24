import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';
import { LayoutDashboard, ChevronRight } from 'lucide-react';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

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
  DISENO: '#64748b',
  DISEÑO: '#64748b',
  DISENIO: '#64748b',
  APROBACION: '#d97706',
  PRODUCCION: '#2563eb',
  INSTALACION: '#ea580c',
  ENTREGA: '#0891b2',
  COMPLETADO: '#059669',
};

function FlujoCajaChart({ dailyData }) {
  if (!dailyData || dailyData.length === 0) return null;

  const width = 500;
  const height = 180;
  const padding = { top: 15, right: 15, bottom: 25, left: 45 };

  const allVals = dailyData.flatMap((d) => [d.ingresos, d.egresos, d.balance]);
  const maxVal = Math.max(...allVals, 100);
  const minVal = Math.min(...allVals, -100);
  const range = maxVal - minVal || 1;

  const getX = (index) =>
    padding.left + (index / Math.max(dailyData.length - 1, 1)) * (width - padding.left - padding.right);

  const getY = (val) =>
    padding.top + (1 - (val - minVal) / range) * (height - padding.top - padding.bottom);

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
            className="text-[9px] fill-slate-400 font-medium"
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

      <text x={padding.left} y={height - 5} className="text-[9px] fill-slate-400 font-medium">
        {new Date(dailyData[0].fecha).toLocaleDateString('es-EC', {
          day: '2-digit',
          month: 'short',
        })}
      </text>
      <text
        x={width - padding.right}
        y={height - 5}
        textAnchor="end"
        className="text-[9px] fill-slate-400 font-medium"
      >
        {new Date(dailyData[dailyData.length - 1].fecha).toLocaleDateString('es-EC', {
          day: '2-digit',
          month: 'short',
        })}
      </text>

      <path d={ingPath} fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={egrPath} fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={balPath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutEgresos({ data, total }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const colors = ['#e11d48', '#d97706', '#059669', '#2563eb', '#475569', '#64748b'];

  let accumulatedOffset = 0;
  const slices = data.map((item, idx) => {
    const strokeLength = (item.valor / (total || 1)) * circ;
    const strokeOffset = accumulatedOffset;
    accumulatedOffset -= strokeLength;
    return {
      ...item,
      color: colors[idx % colors.length],
      strokeLength,
      strokeOffset,
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
        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide block mb-0.5">
          Total
        </span>
        <span className="text-xs font-bold text-slate-800 tabular-nums leading-none">
          {formatUSD(total)}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [rango, setRango] = useState('mes');
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
      hasta: hasta.toISOString().split('T')[0],
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
      <div
        className="flex flex-col items-center justify-center h-[50vh] gap-3"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Cargando métricas...</p>
      </div>
    );
  }

  const {
    kpi,
    usersActivity,
    proyectosActivos,
    recentMovements,
    dailyData = [],
    egresosDistribucion = [],
    quickSummary = {},
  } = summary;

  const instCompletados = proyectosActivos.filter(
    (p) => p.requiereInstalacion && p.faseActual === 'COMPLETADO'
  ).length;
  const instPendientes = proyectosActivos.filter(
    (p) => p.requiereInstalacion && p.faseActual !== 'COMPLETADO'
  ).length;
  const noInstCompletados = proyectosActivos.filter(
    (p) => !p.requiereInstalacion && p.faseActual === 'COMPLETADO'
  ).length;
  const noInstPendientes = proyectosActivos.filter(
    (p) => !p.requiereInstalacion && p.faseActual !== 'COMPLETADO'
  ).length;

  const maxCajaVal = Math.max(kpi.ingresos, kpi.egresos, 1);
  const widthIngPct = (kpi.ingresos / maxCajaVal) * 100;
  const widthEgrPct = (kpi.egresos / maxCajaVal) * 100;

  const egresoColors = ['#e11d48', '#d97706', '#059669', '#2563eb', '#475569', '#64748b'];

  const getColaboradorBadgeClass = (rol) => {
    const r = (rol || '').toLowerCase();
    if (r === 'taller') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (r === 'administrador') return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const getTrendText = (val) => {
    if (val > 0) return `▲ ${val}% vs anterior`;
    if (val < 0) return `▼ ${Math.abs(val)}% vs anterior`;
    return `─ 0% vs anterior`;
  };

  const rangoLabel =
    rango === '7dias' ? 'Últimos 7 días' : rango === '30dias' ? 'Últimos 30 días' : 'Último mes';

  const kpiCards = [
    {
      label: 'Balance neto',
      value: formatUSD(kpi.balance),
      hint: 'Saldo neto en caja',
      trend: kpi.changeBalance,
      trendPositiveIsGood: true,
      border: 'border-t-blue-600',
      color: 'text-blue-600',
    },
    {
      label: 'Ingresos',
      value: formatUSD(kpi.ingresos),
      hint: 'Cobros liquidados',
      trend: kpi.changeIngresos,
      trendPositiveIsGood: true,
      border: 'border-t-emerald-500',
      color: 'text-emerald-600',
    },
    {
      label: 'Egresos',
      value: formatUSD(kpi.egresos),
      hint: 'Gastos y compras',
      trend: kpi.changeEgresos,
      trendPositiveIsGood: false,
      border: 'border-t-red-500',
      color: 'text-red-500',
    },
    {
      label: 'Por cobrar',
      value: formatUSD(kpi.totalProformasPendienteCobro),
      hint: 'Proformas aprobadas',
      trend: kpi.changeProformasPendienteCobro,
      trendPositiveIsGood: null,
      border: 'border-t-amber-500',
      color: 'text-amber-600',
    },
    {
      label: 'Cuentas por pagar',
      value: formatUSD(kpi.totalCxPPendientes),
      hint: "OC's pendientes",
      trend: kpi.changeCxPPendientes,
      trendPositiveIsGood: false,
      border: 'border-t-indigo-500',
      color: 'text-indigo-600',
    },
  ];

  const sectionLink =
    'text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-0.5';

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .thin-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
            <LayoutDashboard className="w-5 h-5 text-blue-600" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                Operaciones
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Flujo de caja, proyectos y cuentas del negocio
            </p>
          </div>
        </div>
      </div>

      {/* Rango de fechas (fuera del header) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">Periodo</p>
        <div className="flex items-center gap-1 p-1 rounded-xl border border-slate-200 bg-white shadow-card">
          {[
            { id: '7dias', label: '7 días' },
            { id: '30dias', label: '30 días' },
            { id: 'mes', label: 'Último mes' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRango(opt.id)}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                rango === opt.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs — 2 cols en móvil; una fila de 5 en web */}
      <div className="grid grid-cols-5 max-sm:grid-cols-2 gap-2 sm:gap-3">
        {kpiCards.map(({ label, value, hint, trend, trendPositiveIsGood, border, color }, index) => {
          let trendClass = 'text-slate-500';
          if (trendPositiveIsGood === true) {
            trendClass = trend >= 0 ? 'text-emerald-600' : 'text-rose-600';
          } else if (trendPositiveIsGood === false) {
            trendClass = trend >= 0 ? 'text-rose-600' : 'text-emerald-600';
          }

          return (
            <div
              key={label}
              className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${border} px-2.5 sm:px-3 py-3 sm:py-2.5 min-w-0 ${
                index === kpiCards.length - 1 ? 'max-sm:col-span-2' : ''
              }`}
            >
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:truncate">{label}</p>
              <p className={`text-sm sm:text-base font-bold mt-1 sm:mt-0.5 tabular-nums truncate ${color}`}>{value}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-[10px] text-slate-400 truncate">{hint}</p>
                <p className={`text-[10px] font-semibold shrink-0 ${trendClass}`}>
                  {getTrendText(trend)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Flujo / Egresos / Carga */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        <div className="lg:col-span-5 bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-800">Flujo de caja</h3>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5">
              {rangoLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-600 rounded-full" /> Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-600 rounded-full" /> Egresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-600 rounded-full" /> Balance
            </span>
          </div>
          <div className="h-[180px] w-full mt-4 flex-1">
            <FlujoCajaChart dailyData={dailyData} />
          </div>
        </div>

        <div className="lg:col-span-3 bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Distribución de egresos</h3>
          </div>
          <div className="flex items-center gap-3 flex-1">
            <DonutEgresos data={egresosDistribucion} total={kpi.egresos} />
            <div className="flex-1 space-y-2 max-h-[140px] overflow-y-auto thin-scrollbar">
              {egresosDistribucion.slice(0, 5).map((eg, idx) => (
                <div key={eg.categoria} className="text-[11px]">
                  <div className="flex items-center justify-between font-semibold text-slate-700 gap-2">
                    <span className="flex items-center gap-1.5 truncate min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: egresoColors[idx % egresoColors.length] }}
                      />
                      <span className="truncate">{eg.categoria}</span>
                    </span>
                    <span className="tabular-nums text-slate-800 shrink-0">
                      {formatUSD(eg.valor).replace('.00', '')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 ml-3">{eg.porcentaje}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-4">
            <button type="button" onClick={() => navigate('/gastos')} className={sectionLink}>
              Ver detalle de egresos
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Carga de trabajo</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Proyectos según requerimiento de instalación
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">Con instalación</p>
              <p className="text-xl font-bold text-slate-800 mt-1 tabular-nums">
                {instCompletados + instPendientes}
              </p>
              <div className="mt-3 space-y-1.5 border-t border-slate-200/80 pt-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Completados</span>
                  <span className="font-semibold text-slate-800">{instCompletados}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">En curso</span>
                  <span className="font-semibold text-slate-800">{instPendientes}</span>
                </div>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">Sin instalación</p>
              <p className="text-xl font-bold text-slate-800 mt-1 tabular-nums">
                {noInstCompletados + noInstPendientes}
              </p>
              <div className="mt-3 space-y-1.5 border-t border-slate-200/80 pt-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Completados</span>
                  <span className="font-semibold text-slate-800">{noInstCompletados}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">En curso</span>
                  <span className="font-semibold text-slate-800">{noInstPendientes}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-4">
            <button type="button" onClick={() => navigate('/proyectos')} className={sectionLink}>
              Ver todos los proyectos
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Proyectos / Comparativa / Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        <div className="lg:col-span-5 bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Proyectos en ejecución</h3>
              <p className="text-xs text-slate-500 mt-0.5">Avance y responsables</p>
            </div>
            <button type="button" onClick={() => navigate('/proyectos')} className={sectionLink}>
              Ver todos
              <ChevronRight size={12} />
            </button>
          </div>

          {proyectosActivos.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Sin proyectos activos en este periodo.
            </div>
          ) : (
            <div className="overflow-x-auto thin-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Proyecto</th>
                    <th className="pb-2">Fase</th>
                    <th className="pb-2">Progreso</th>
                    <th className="pb-2">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {proyectosActivos.slice(0, 3).map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/proyectos/${p.id}`)}
                    >
                      <td className="py-3 pr-2">
                        <span className="font-semibold text-slate-800 block leading-tight">
                          {p.nombre}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {p.clienteNombre}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: FASE_COLORS[p.faseActual] || '#94a3b8' }}
                          />
                          <span>{FASE_LABELS[p.faseActual] || p.faseActual}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-slate-100 rounded-full h-1.5 shrink-0 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{ width: `${p.progreso}%` }}
                            />
                          </div>
                          <span className="font-semibold tabular-nums text-[11px]">
                            {p.progreso}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-500">{p.responsable || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Comparativa de caja</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ingresos vs egresos del periodo</p>
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-1.5">
                <span>Ingresos</span>
                <span className="text-slate-800 font-semibold tabular-nums">
                  {formatUSD(kpi.ingresos)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${widthIngPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-500 mb-1.5">
                <span>Egresos</span>
                <span className="text-slate-800 font-semibold tabular-nums">
                  {formatUSD(kpi.egresos)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full"
                  style={{ width: `${widthEgrPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 mt-4 text-center">
            <span
              className={`text-xs font-semibold ${
                kpi.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {kpi.balance >= 0
                ? `Superávit ${formatUSD(kpi.balance)}`
                : `Déficit ${formatUSD(Math.abs(kpi.balance))}`}
            </span>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Resumen rápido</h3>
          </div>
          <div className="space-y-0 divide-y divide-slate-100 flex-1">
            {[
              {
                label: 'Proyectos activos',
                value: proyectosActivos.filter((p) => p.estado === 'ACTIVO').length,
              },
              { label: "OC's pendientes", value: quickSummary.ocsPendientes || 0 },
              {
                label: 'Proformas aprobadas',
                value: quickSummary.proformasAprobadas || 0,
              },
              { label: 'Tareas pendientes', value: quickSummary.tareasPendientes || 0 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <span className="text-xs font-medium text-slate-500">{row.label}</span>
                <span className="text-sm font-bold text-slate-800 tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Movimientos / Colaboradores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        <div className="lg:col-span-7 bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Movimientos recientes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ingresos y egresos del periodo</p>
            </div>
            <button type="button" onClick={() => navigate('/movimientos')} className={sectionLink}>
              Ver todos
              <ChevronRight size={12} />
            </button>
          </div>

          {recentMovements.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Sin movimientos financieros recientes.
            </div>
          ) : (
            <div className="overflow-x-auto thin-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Concepto</th>
                    <th className="pb-2">Entidad</th>
                    <th className="pb-2">Método</th>
                    <th className="pb-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {recentMovements.slice(0, 4).map((m) => (
                    <tr key={m.id + m.origen} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 text-slate-400 font-medium whitespace-nowrap">
                        {new Date(m.fecha)
                          .toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
                          .replace('.', '')}
                      </td>
                      <td className="py-3 pr-2 text-slate-800 font-semibold max-w-[150px] truncate">
                        {m.descripcion}
                      </td>
                      <td className="py-3 pr-2 text-slate-500 truncate max-w-[110px]">
                        {m.entidad || '—'}
                      </td>
                      <td className="py-3">
                        <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                          {m.metodoPago}
                        </span>
                      </td>
                      <td
                        className={`py-3 text-right font-semibold tabular-nums ${
                          m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.tipo === 'ingreso' ? '+' : '-'}
                        {formatUSD(m.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Colaboradores</h3>
              <p className="text-xs text-slate-500 mt-0.5">Asignaciones activas</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/nomina/empleados')}
              className={sectionLink}
            >
              Ver todos
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="space-y-3 max-h-[240px] overflow-y-auto thin-scrollbar pr-1">
            {usersActivity.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PersonInitialsAvatar name={user.nombre} image={user.foto} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-none">
                      {user.nombre}
                    </p>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      {user.pendingTasksCount > 0
                        ? `${user.pendingTasksCount} ${
                            user.pendingTasksCount === 1
                              ? 'tarea pendiente'
                              : 'tareas pendientes'
                          }`
                        : 'Sin tareas pendientes'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wide shrink-0 ${getColaboradorBadgeClass(
                    user.rol
                  )}`}
                >
                  {user.rol}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
