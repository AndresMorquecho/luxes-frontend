import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProyectosContext } from '../../../proyectos/application/context/ProyectosContext';
import { getProformas } from '../../../proformas/application/proformasService';
import { getClientes } from '../../../clientes/application/clientesService';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { getFinancialDashboard } from '../../../gastos/application/gastosService';

const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

/* ── SVG Donut ── */
const Donut = ({ segments, size = 100, strokeWidth = 18 }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, v) => s + v.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      {segments.map((s) => {
        const dash = (s.value / total) * circ;
        const seg = (
          <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.color} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        );
        offset += dash;
        return seg;
      })}
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="text-sm font-bold fill-slate-800" fontFamily="Inter, sans-serif">
        {total}
      </text>
    </svg>
  );
};

/* ── SVG Horizontal Bar ── */
const HBar = ({ data }) => {
  const m = Math.max(...data.map(d => d.value), 1);
  const barH = 30;
  const gap = 10;
  const barX = 78;
  const barMaxW = 200;
  const h = data.length * (barH + gap) - gap;
  return (
    <svg width="100%" height={h + 4} viewBox={`0 0 300 ${h + 4}`} className="w-full overflow-visible" preserveAspectRatio="xMinYMid meet">
      <defs>
        {data.map((d, i) => (
          <linearGradient key={d.label} id={`barGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={d.color} stopOpacity={0.85} />
            <stop offset="100%" stopColor={d.color} stopOpacity={1} />
          </linearGradient>
        ))}
      </defs>
      {data.map((d, i) => {
        const y = i * (barH + gap);
        const w = Math.max(6, (d.value / m) * barMaxW);
        const r = barH / 2;
        const cx = barX + w - r;
        const path = w > r
          ? `M${barX},${y} L${cx},${y} A${r},${r} 0 0,1 ${barX + w},${y + r} A${r},${r} 0 0,1 ${cx},${y + barH} L${barX},${y + barH} Z`
          : `M${barX},${y} L${barX},${y + barH} Z`;
        return (
          <g key={d.label}>
            <rect x={barX} y={y} width={barMaxW} height={barH} rx={r} fill="#f1f5f9" />
            <path d={path} fill={`url(#barGrad-${i})`} style={{ transition: 'd 0.6s ease' }} />
            <text x={barX - 6} y={y + barH / 2} textAnchor="end" dominantBaseline="central" fontSize={12} fontWeight={600} fill="#475569" fontFamily="Inter, sans-serif">{d.label}</text>
            <text x={barX + w + 5} y={y + barH / 2} dominantBaseline="central" fontSize={12} fontWeight={800} fill={d.color} fontFamily="Inter, sans-serif">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
};

/* ── SVG Column Chart ── */
const ColumnChart = ({ data, height = 120 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const cols = data.length;
  const gap = 8;
  const colW = Math.max(24, Math.min(40, (290 - gap * (cols - 1)) / cols));
  const totalW = cols * colW + (cols - 1) * gap;
  const offsetX = (300 - totalW) / 2;
  return (
    <svg width="100%" height={height + 24} viewBox={`0 0 300 ${height + 24}`} className="w-full overflow-visible" preserveAspectRatio="xMinYMid meet">
      <defs>
        <linearGradient id="colGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.95} />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const x = offsetX + i * (colW + gap);
        const barH = Math.max(4, (d.value / max) * height);
        const y = height - barH;
        const r = 4;
        const path = barH > r
          ? `M${x},${y + barH} L${x},${y + r} A${r},${r} 0 0,1 ${x + r},${y} L${x + colW - r},${y} A${r},${r} 0 0,1 ${x + colW},${y + r} L${x + colW},${y + barH} Z`
          : `M${x},${y + barH} L${x},${y + barH} Z`;
        const isMax = d.value === max && d.value > 0;
        const pct = max > 0 ? Math.round((d.value / max) * 100) : 0;
        return (
          <g key={d.label}>
            <rect x={x} y={0} width={colW} height={height} rx={r} fill="#f8fafc" />
            <path d={path} fill="url(#colGrad)" style={{ transition: 'd 0.5s ease' }} />
            {d.value > 0 && (
              <text x={x + colW / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={800}
                fill={isMax ? '#1d4ed8' : '#475569'} fontFamily="Inter, sans-serif">{d.value}</text>
            )}
            <text x={x + colW / 2} y={height + 14} textAnchor="middle" fontSize={10} fontWeight={600}
              fill={isMax ? '#1d4ed8' : '#94a3b8'} fontFamily="Inter, sans-serif">{d.label}</text>
          </g>
        );
      })}
      <line x1={offsetX} y1={height} x2={offsetX + totalW} y2={height} stroke="#e2e8f0" strokeWidth={1} />
    </svg>
  );
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { state } = useProyectosContext();
  const { proyectos } = state;

  const [proformas, setProformas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProformas(),
      getClientes(),
      getEmpleados(),
      getFinancialDashboard().catch(() => null)
    ]).then(([pResponse, c, e, fin]) => {
      setProformas(pResponse.data || []);
      setClientes(c);
      setEmpleados(e);
      setFinancialData(fin);
      setLoading(false);
    });
  }, []);

  const prodCount = proyectos.filter(p => p.faseActual === 'PRODUCCION').length;
  const instalCount = proyectos.filter(p => p.faseActual === 'INSTALACION').length;

  const montoTotalProformas = proformas.reduce((s, p) => {
    const sub = p.items.reduce((a, i) => a + (i.cantidad || 0) * (i.precioUnitario || 0), 0);
    return s + sub + sub * (p.iva ?? 0.12);
  }, 0);

  const personas = clientes.filter(c => c.tipo === 'Persona').length;
  const empresas = clientes.filter(c => c.tipo === 'Empresa').length;

  const ultimasProformas = [...proformas].sort((a, b) => b.fecha?.localeCompare(a.fecha) || 0).slice(0, 5);
  const ultimosProyectos = [...proyectos].sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || '') || 0).slice(0, 5);

  /* ── Chart data ── */
  const faseLabels = { DISENIO: 'Diseño', APROBACION: 'Aprobación', PRODUCCION: 'Producción', INSTALACION: 'Instalación', COMPLETADO: 'Completado' };
  const faseColors = { DISENIO: '#8b5cf6', APROBACION: '#f59e0b', PRODUCCION: '#3b82f6', INSTALACION: '#f97316', COMPLETADO: '#10b981' };
  const fasesOrder = ['DISENIO', 'APROBACION', 'PRODUCCION', 'INSTALACION', 'COMPLETADO'];

  const proyFase = fasesOrder.map(f => ({ label: faseLabels[f], value: proyectos.filter(p => p.faseActual === f).length, color: faseColors[f] }));

  const estadoProformas = [
    { label: 'Pendiente', value: proformas.filter(p => p.estado === 'Pendiente').length, color: '#f59e0b' },
    { label: 'Aprobada', value: proformas.filter(p => p.estado === 'Aprobada').length, color: '#10b981' },
    { label: 'Pagada', value: proformas.filter(p => p.estado === 'Pagada').length, color: '#6366f1' },
    { label: 'Rechazada', value: proformas.filter(p => p.estado === 'Rechazada').length, color: '#ef4444' },
  ];

  const clientesTipo = [
    { label: 'Personas', value: personas, color: '#3b82f6' },
    { label: 'Empresas', value: empresas, color: '#6366f1' },
  ];

  const proformasPorMes = () => {
    const mesCount = {};
    proformas.forEach(p => {
      if (!p.fecha) return;
      const d = new Date(p.fecha);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      mesCount[key] = (mesCount[key] || 0) + 1;
    });
    const today = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ label: MONTHS[d.getMonth()], value: mesCount[key] || 0 });
    }
    return months;
  };

  const badgeProy = (fase) => {
    const map = {
      DISENIO: 'bg-purple-100 text-purple-700',
      APROBACION: 'bg-amber-100 text-amber-700',
      PRODUCCION: 'bg-blue-100 text-blue-700',
      INSTALACION: 'bg-orange-100 text-orange-700',
      COMPLETADO: 'bg-emerald-100 text-emerald-700',
    };
    return map[fase] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Resumen general del sistema LUXES</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Todo operativo
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button onClick={() => navigate('/proyectos/nuevo')}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all text-left">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
            <svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">Nuevo Proyecto</p>
            <p className="text-xs text-slate-400 mt-0.5">Crear un proyecto desde cero con fases y asignación</p>
          </div>
        </button>
        <button onClick={() => navigate('/proformas')}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all text-left">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">Nueva Proforma</p>
            <p className="text-xs text-slate-400 mt-0.5">Generar cotización o proforma para un cliente</p>
          </div>
        </button>
      </div>

      {/* Resumen Financiero */}
      {financialData && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              Resumen de Caja (Últimos 30 días)
            </h3>
            <button 
              onClick={() => navigate('/gastos')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Ver Caja y Cierres →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingresos</p>
                <p className="text-base font-extrabold text-slate-800">{formatUSD(financialData.kpi.ingresos)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 text-red-500 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Egresos</p>
                <p className="text-base font-extrabold text-slate-800">{formatUSD(financialData.kpi.egresos)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Neto</p>
                <p className={`text-base font-extrabold ${financialData.kpi.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                  {formatUSD(financialData.kpi.balance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
            <svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{proyectos.length}</p>
            <p className="text-xs text-slate-500">Proyectos</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{prodCount} prod. · {instalCount} instal.</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{proformas.length}</p>
            <p className="text-xs text-slate-500">Proformas</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{formatUSD(montoTotalProformas)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{clientes.length}</p>
            <p className="text-xs text-slate-500">Clientes</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{personas} pers. · {empresas} emp.</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{empleados.length}</p>
            <p className="text-xs text-slate-500">Empleados</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Registrados en nómina</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Proyectos por fase */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Proyectos por fase</h3>
          <HBar data={proyFase} />
        </div>

        {/* Proformas por estado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 self-start">Proformas por estado</h3>
          <Donut segments={estadoProformas} size={120} strokeWidth={20} />
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {estadoProformas.filter(s => s.value > 0).map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} <span className="font-semibold text-slate-700">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Clientes por tipo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 self-start">Clientes por tipo</h3>
          <Donut segments={clientesTipo} size={120} strokeWidth={20} />
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {clientesTipo.filter(s => s.value > 0).map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} <span className="font-semibold text-slate-700">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Proformas por mes */}
      {proformas.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-center gap-6 mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Proformas por mes</h3>
            <p className="text-[11px] text-slate-400">Últimos 6 meses</p>
            <div className="flex items-center gap-4 text-xs ml-4 pl-4 border-l border-slate-200">
              <span className="text-slate-400">Total <span className="font-bold text-slate-800">{proformas.length}</span></span>
              <span className="text-slate-400">Promedio <span className="font-bold text-slate-800">{(proformas.length / 6).toFixed(1)}</span></span>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-full max-w-xl">
              <ColumnChart data={proformasPorMes()} height={180} />
            </div>
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Últimas Proformas</h3>
            <button onClick={() => navigate('/proformas')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Ver todas</button>
          </div>
          {ultimasProformas.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Sin proformas registradas</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {ultimasProformas.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.cliente}</p>
                    <p className="text-xs text-slate-400">{p.id} · {p.fecha}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-bold text-slate-700">{formatUSD(p.items.reduce((s, i) => s + (i.cantidad || 0) * (i.precioUnitario || 0), 0) * (1 + (p.iva ?? 0.12)))}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.estado === 'Aprobada' ? 'bg-emerald-50 text-emerald-700' :
                      p.estado === 'Rechazada' ? 'bg-red-50 text-red-700' :
                      p.estado === 'Pagada' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>{p.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Últimos Proyectos</h3>
            <button onClick={() => navigate('/proyectos')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Ver todos</button>
          </div>
          {ultimosProyectos.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Sin proyectos registrados</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {ultimosProyectos.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/proyectos/${p.id}`)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.cliente?.nombre || 'Sin cliente'} · {p.responsable}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-3 ${badgeProy(p.faseActual)}`}>{p.faseActual}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
