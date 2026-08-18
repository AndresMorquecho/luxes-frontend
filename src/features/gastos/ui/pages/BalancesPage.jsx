import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Users,
  Smile,
  Frown,
  Meh,
  Clock,
  AlertTriangle,
  CreditCard,
  Briefcase,
  Activity,
  Layers,
  FileText,
  PieChart,
  BarChart3,
  BarChart,
  Grid,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Car,
  Truck,
  MoreHorizontal,
  Zap,
  Building,
  ShoppingCart,
  Shield,
  MessageCircle,
  Inbox,
  CheckCircle2
} from 'lucide-react';


// --- CONSTANTES GLOBALES ---
const MONTHS_LIST = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const MONTH_FULL_NAMES = {
  ENE: 'Enero', FEB: 'Febrero', MAR: 'Marzo', ABR: 'Abril', MAY: 'Mayo', JUN: 'Junio',
  JUL: 'Julio', AGO: 'Agosto', SEP: 'Septiembre', OCT: 'Octubre', NOV: 'Noviembre', DIC: 'Diciembre'
};

// --- WIDGETS DE GRÁFICOS SVG ---

function DonutChart({ data, title }) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm w-full transition-all hover:shadow-md">
      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 self-start">{title}</h5>
      {total > 0 ? (
        <div className="flex flex-col sm:flex-row items-center gap-8 w-full justify-center">
          <div className="relative w-36 h-36 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {data.map((item, idx) => {
                const percent = (item.value / total) * 100;
                const strokeLength = (percent * 282.6) / 100; // 2 * PI * r(45) = 282.74
                const strokeOffset = 282.6 - strokeLength;
                const rotation = (accumulatedPercent * 360) / 100;
                accumulatedPercent += percent;

                return (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke={item.color || '#cbd5e1'}
                    strokeWidth="10"
                    strokeDasharray="282.6"
                    strokeDashoffset={strokeOffset}
                    transform={`rotate(${rotation} 50 50)`}
                    className="transition-all duration-300 hover:stroke-[12] cursor-pointer"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
              <span className="text-sm font-black text-slate-800 mt-0.5">
                {data[0]?.isCurrency ? `$${Math.round(total).toLocaleString()}` : total}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 flex-1 w-full">
            {data.map((item, idx) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-none">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-500">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-700">
                    {pct}% ({item.isCurrency ? `$${Math.round(item.value).toLocaleString()}` : item.value})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-36 w-full text-xs text-slate-400">Sin registros en este periodo</div>
      )}
    </div>
  );
}

function TrendChart({ data, title, keys, colors, labels }) {
  const maxVal = Math.max(
    ...data.flatMap(d => keys.map(k => Number(d[k]) || 0)),
    1
  );

  const width = 500;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = keys.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});

  data.forEach((d, idx) => {
    const x = paddingLeft + (idx * chartWidth) / (data.length - 1 || 1);
    keys.forEach(k => {
      const val = Number(d[k]) || 0;
      const y = paddingTop + chartHeight - (val * chartHeight) / maxVal;
      points[k].push({ x, y, value: val });
    });
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full transition-all hover:shadow-md space-y-4">
      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h5>
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
            const y = paddingTop + chartHeight * p;
            const gridVal = maxVal * (1 - p);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#f8fafc"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  className="text-[8px] font-bold"
                >
                  {gridVal >= 1000 ? `$${(gridVal / 1000).toFixed(0)}k` : `$${gridVal.toFixed(0)}`}
                </text>
              </g>
            );
          })}

          {/* Area Gradients & Paths */}
          {keys.map((k, keyIdx) => {
            const pts = points[k];
            if (pts.length === 0) return null;

            const lineD = pts.reduce((dStr, p, idx) => {
              return dStr + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
            }, '');

            const areaD = `${lineD} L ${pts[pts.length - 1].x} ${paddingTop + chartHeight} L ${pts[0].x} ${paddingTop + chartHeight} Z`;

            return (
              <g key={k}>
                <path
                  d={areaD}
                  fill={`url(#areaGrad-${k})`}
                  opacity="0.1"
                />
                <path
                  d={lineD}
                  fill="none"
                  stroke={colors[keyIdx]}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {pts.map((p, pIdx) => (
                  <g key={pIdx} className="group/dot cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="white"
                      stroke={colors[keyIdx]}
                      strokeWidth="2.5"
                      className="transition-all group-hover/dot:r-6"
                    />
                    <rect
                      x={p.x - 25}
                      y={p.y - 22}
                      width="50"
                      height="15"
                      rx="3"
                      fill="#1e293b"
                      className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none"
                    />
                    <text
                      x={p.x}
                      y={p.y - 12}
                      textAnchor="middle"
                      fill="white"
                      className="text-[7px] font-black opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none"
                    >
                      ${Math.round(p.value).toLocaleString()}
                    </text>
                  </g>
                ))}

                <defs>
                  <linearGradient id={`areaGrad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[keyIdx]} />
                    <stop offset="100%" stopColor={colors[keyIdx]} stopOpacity="0" />
                  </linearGradient>
                </defs>
              </g>
            );
          })}

          {/* X axis labels */}
          {data.map((d, idx) => {
            const x = paddingLeft + (idx * chartWidth) / (data.length - 1 || 1);
            return (
              <text
                key={idx}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fill="#94a3b8"
                className="text-[9px] font-bold"
              >
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-xs font-semibold">
        {keys.map((k, idx) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[idx] }} />
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">{labels ? labels[idx] : k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const formatPeriodLabel = (dStr, hStr) => {
  if (!dStr || !hStr) return '';
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const parseDateStr = (str) => {
    const parts = str.split('-');
    return {
      year: parts[0],
      month: months[parseInt(parts[1], 10) - 1] || '',
      day: parseInt(parts[2], 10)
    };
  };

  try {
    const d = parseDateStr(dStr);
    const h = parseDateStr(hStr);

    if (d.year === h.year) {
      if (d.month === h.month) {
        if (d.day === 1 && h.day >= 28) {
          return `${d.month} ${d.year}`;
        }
        return `${d.day} - ${h.day} ${d.month} ${d.year}`;
      }
      if (d.day === 1 && d.month === 'Ene' && h.day === 31 && h.month === 'Dic') {
        return d.year;
      }
      return `${d.month} - ${h.month} ${d.year}`;
    }
    return `${d.month} ${d.year} - ${h.month} ${h.year}`;
  } catch (e) {
    return `${dStr} - ${hStr}`;
  }
};

function ColumnChart({ data, title, color }) {
  const maxVal = Math.max(...data.map(d => Number(d.value) || 0), 1);
  const width = 500;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barWidth = (chartWidth / data.length) * 0.6;
  const spacing = (chartWidth / data.length) * 0.4;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm w-full transition-all hover:shadow-md space-y-4">
      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h5>
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
            const y = paddingTop + chartHeight * p;
            const gridVal = maxVal * (1 - p);
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f8fafc" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fill="#94a3b8" className="text-[8px] font-bold">
                  {gridVal >= 1000 ? `$${(gridVal / 1000).toFixed(0)}k` : `$${gridVal.toFixed(0)}`}
                </text>
              </g>
            );
          })}

          {/* Columns */}
          {data.map((d, idx) => {
            const x = paddingLeft + idx * (barWidth + spacing) + spacing / 2;
            const val = Number(d.value) || 0;
            const barHeight = (val * chartHeight) / maxVal;
            const y = paddingTop + chartHeight - barHeight;

            return (
              <g key={idx} className="group cursor-pointer">
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, 2)}
                  fill={color || '#3b82f6'}
                  rx="3"
                  className="transition-all duration-300 hover:opacity-85"
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="#475569"
                  className="text-[8px] font-extrabold"
                >
                  {val >= 1000 ? `$${Math.round(val / 1000)}k` : `$${Math.round(val)}`}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  className="text-[9px] font-bold"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// --- DYNAMIC MOCK DATA HELPER ---
const getMockDataForYear = (year) => {
  const baseIngresos = {
    ENE: 18000, FEB: 22000, MAR: 26000, ABR: 20000, MAY: 29000, JUN: 32000,
    JUL: 28000, AGO: 30000, SEP: 35000, OCT: 39000, NOV: 45000, DIC: 52400
  };
  const baseEgresos = {
    ENE: 14000, FEB: 17000, MAR: 19500, ABR: 15000, MAY: 22000, JUN: 24000,
    JUL: 21500, AGO: 23000, SEP: 26000, OCT: 30000, NOV: 35000, DIC: 38700
  };
  const baseVentas = {
    ENE: 19000, FEB: 24000, MAR: 28000, ABR: 22000, MAY: 31000, JUN: 34000,
    JUL: 30000, AGO: 32000, SEP: 37000, OCT: 42000, NOV: 48000, DIC: 54200
  };
  const baseGastos = {
    ENE: 15000, FEB: 18000, MAR: 22000, ABR: 17000, MAY: 25000, JUN: 27000,
    JUL: 24000, AGO: 26000, SEP: 30005, OCT: 34000, NOV: 38000, DIC: 45795
  };

  const getScale = (type) => {
    if (year === 2026) return 1.0;
    if (year === 2025) {
      if (type === 'ingresos') return 1.0 / 1.184; // 18.4% growth in 2026
      if (type === 'egresos') return 1.0 / 1.127;  // 12.7% growth
      if (type === 'ventas') return 1.0 / 1.176;   // 17.6% growth
      if (type === 'gastos') return 1.0 / 1.132;   // 13.2% growth
    }
    let s = 1.0;
    if (year === 2024) s = 0.72;
    else if (year === 2023) s = 0.60;
    else if (year < 2023) s = 0.50;
    else if (year > 2026) s = 1.15;

    if (type === 'egresos') return s * 0.98;
    if (type === 'ventas') return s * 1.05;
    if (type === 'gastos') return s * 0.95;
    return s;
  };

  const scaleObj = (obj, s) => {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = Math.round(obj[key] * s);
      return acc;
    }, {});
  };

  const ingresos = scaleObj(baseIngresos, getScale('ingresos'));
  const egresos = scaleObj(baseEgresos, getScale('egresos'));
  const ventas = scaleObj(baseVentas, getScale('ventas'));
  const gastos = scaleObj(baseGastos, getScale('gastos'));

  const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

  return {
    ingresos,
    egresos,
    ventas,
    gastos,
    totalIngresos: sum(ingresos),
    totalEgresos: sum(egresos),
    totalVentas: sum(ventas),
    totalGastos: sum(gastos)
  };
};

// --- MULTI-BAR CHART COMPONENT ---
function DoubleBarChart({ data, keys, colors, labels, year }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maxVal = Math.max(
    ...data.flatMap(d => keys.map(k => Number(d[k]) || 0)),
    1
  );

  const yMax = maxVal * 1.15;

  const width = 1000;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 35;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const slotWidth = chartWidth / data.length;
  const spacing = slotWidth * 0.45;
  const barWidth = (slotWidth - spacing) / 2;
  const gap = 3;

  const getBarPath = (x, y, w, h, r) => {
    if (h <= 0) return '';
    const radius = Math.min(r, h);
    return `
      M ${x} ${y + h}
      V ${y + radius}
      A ${radius} ${radius} 0 0 1 ${x + radius} ${y}
      H ${x + w - radius}
      A ${radius} ${radius} 0 0 1 ${x + w} ${y + radius}
      V ${y + h}
      Z
    `;
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 40
    });
  };

  const formatK = (val) => {
    if (val < 1000) return `$${Math.round(val)}`;
    return `$${Math.round(val / 1000)}k`;
  };

  return (
    <div className="relative w-full overflow-visible" onMouseMove={handleMouseMove}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {(() => {
          const ticks = [];
          const step = yMax / 5;
          for (let i = 0; i <= 5; i++) {
            ticks.push(step * i);
          }
          return ticks.map((val, idx) => {
            const y = paddingTop + chartHeight - (val * chartHeight) / yMax;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  className="text-[9px] font-bold"
                >
                  {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`}
                </text>
              </g>
            );
          });
        })()}

        {/* Bars */}
        {data.map((d, idx) => {
          const xStart = paddingLeft + idx * slotWidth + spacing / 2;

          return keys.map((key, keyIdx) => {
            const val = Number(d[key]) || 0;
            const barHeight = (val * chartHeight) / yMax;
            const barX = xStart + keyIdx * (barWidth + gap);
            const barY = paddingTop + chartHeight - barHeight;
            const color = colors[keyIdx];

            return (
              <g key={`${idx}-${key}`}>
                <path
                  d={getBarPath(barX, barY, barWidth, barHeight, 3)}
                  fill={color}
                  className="transition-all duration-300 hover:brightness-90 cursor-pointer"
                  onMouseEnter={() => setHoveredBar({
                    month: d.label,
                    label: labels[keyIdx],
                    value: val,
                    color
                  })}
                  onMouseLeave={() => setHoveredBar(null)}
                />
                {/* Value label on top of bar */}
                {val > 0 && (
                  <text
                    x={barX + barWidth / 2}
                    y={barY - 5}
                    textAnchor="middle"
                    fill={color}
                    className="text-[8px] font-extrabold"
                  >
                    {formatK(val)}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* X axis line */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        {/* X axis labels */}
        {data.map((d, idx) => {
          const x = paddingLeft + idx * slotWidth + slotWidth / 2;
          return (
            <text
              key={idx}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fill="#94a3b8"
              className="text-[9px] font-bold"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Hover Tooltip Overlay */}
      {hoveredBar && (
        <div
          className="absolute z-30 bg-slate-900 text-white text-[10px] font-bold px-3 py-2 rounded-lg shadow-xl pointer-events-none flex flex-col gap-1 border border-slate-700/50 backdrop-blur-md transition-all duration-75"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`
          }}
        >
          <span className="text-slate-400 text-[9px] uppercase tracking-wider">{hoveredBar.month}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredBar.color }} />
            <span>{hoveredBar.label}:</span>
            <span className="text-white font-black">${Math.round(hoveredBar.value).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- WEEKLY SALES BAR CHART COMPONENT ---
function WeeklySalesChart({ data, color }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maxVal = Math.max(...data.map(d => Number(d.value) || 0), 1);
  const yMax = maxVal * 1.15;

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const slotWidth = chartWidth / data.length;
  const barWidth = slotWidth * 0.55;
  const spacing = slotWidth * 0.45;

  const getBarPath = (x, y, w, h, r) => {
    if (h <= 0) return '';
    const radius = Math.min(r, h);
    return `
      M ${x} ${y + h}
      V ${y + radius}
      A ${radius} ${radius} 0 0 1 ${x + radius} ${y}
      H ${x + w - radius}
      A ${radius} ${radius} 0 0 1 ${x + w} ${y + radius}
      V ${y + h}
      Z
    `;
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 45
    });
  };

  const formatK = (val) => {
    if (val < 1000) return `$${Math.round(val)}`;
    return `$${(val / 1000).toFixed(1).replace('.0', '')}k`;
  };

  return (
    <div className="relative w-full overflow-visible" onMouseMove={handleMouseMove}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {(() => {
          const ticks = [];
          const step = yMax / 4;
          for (let i = 0; i <= 4; i++) {
            ticks.push(step * i);
          }
          return ticks.map((val, idx) => {
            const y = paddingTop + chartHeight - (val * chartHeight) / yMax;
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fill="#94a3b8" className="text-[8px] font-bold">
                  {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`}
                </text>
              </g>
            );
          });
        })()}

        {/* Bars */}
        {data.map((d, idx) => {
          const x = paddingLeft + idx * slotWidth + spacing / 2;
          const val = Number(d.value) || 0;
          const barHeight = (val * chartHeight) / yMax;
          const barY = paddingTop + chartHeight - barHeight;

          return (
            <g key={idx}>
              <path
                d={getBarPath(x, barY, barWidth, barHeight, 4)}
                fill={color || '#3b82f6'}
                className="transition-all duration-300 hover:brightness-95 cursor-pointer"
                onMouseEnter={() => setHoveredBar({
                  label: d.label,
                  range: d.range,
                  value: val
                })}
                onMouseLeave={() => setHoveredBar(null)}
              />
              {/* Value above bar */}
              {val > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={barY - 6}
                  textAnchor="middle"
                  fill="#1e293b"
                  className="text-[8px] font-extrabold"
                >
                  {formatK(val)}
                </text>
              )}
              {/* Week Label */}
              <text
                x={x + barWidth / 2}
                y={height - 20}
                textAnchor="middle"
                fill="#475569"
                className="text-[9px] font-extrabold"
              >
                {d.label}
              </text>
              {/* Day range Label */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fill="#94a3b8"
                className="text-[8px] font-bold"
              >
                {d.range}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredBar && (
        <div
          className="absolute z-30 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl pointer-events-none flex flex-col gap-0.5 border border-slate-700/50 backdrop-blur-md"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <span className="text-slate-400 text-[8px] uppercase tracking-wider">{hoveredBar.label} ({hoveredBar.range})</span>
          <span className="text-white font-black">${Math.round(hoveredBar.value).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// --- ATTRIBUTION DONUT CHART COMPONENT ---
function AttributionDonutChart({ data, title, subtitle, centerText, centerGrowth, footerText, type, periodLabel }) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  let accumulatedPercent = 0;

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 text-blue-500 p-3 rounded-2xl">
            {type === 'canal' ? <Briefcase size={24} /> : <CreditCard size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs font-bold text-slate-400">{subtitle}</p>
              {periodLabel && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                  {periodLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content donut + list */}
        <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
          {/* Donut SVG */}
          <div className="relative w-36 h-36 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {data.map((item, idx) => {
                const percent = (item.value / (total || 1)) * 100;
                const strokeLength = (percent * 282.6) / 100;
                const strokeOffset = 282.6 - strokeLength;
                const rotation = (accumulatedPercent * 360) / 100;
                accumulatedPercent += percent;

                return (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke={item.color || '#cbd5e1'}
                    strokeWidth="10"
                    strokeDasharray="282.6"
                    strokeDashoffset={strokeOffset}
                    transform={`rotate(${rotation} 50 50)`}
                    className="transition-all duration-300 hover:stroke-[12] cursor-pointer"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">{centerText || 'Total'}</span>
              <span className="text-base font-black text-slate-800 leading-none mt-0.5">
                ${Math.round(total).toLocaleString()}
              </span>
              {centerGrowth && (
                <span className="text-[8px] font-black text-emerald-500 mt-0.5 flex items-center gap-0.5">
                  {centerGrowth}
                </span>
              )}
            </div>
          </div>

          {/* List details */}
          <div className="space-y-3 flex-1 w-full">
            {data.map((item, idx) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-none">
                  <div className="flex items-center gap-2">
                    {type === 'canal' ? (
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    ) : (
                      <div className="p-1.5 rounded-lg shrink-0 text-white flex items-center justify-center" style={{ backgroundColor: item.color }}>
                        <CreditCard size={10} />
                      </div>
                    )}
                    <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{item.label}</span>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-extrabold text-slate-800">${Math.round(item.value).toLocaleString()}</span>
                    <span className="text-[10px] font-extrabold text-slate-400">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer banner */}
      {footerText && (
        <div className="mt-6 bg-blue-50/50 border border-blue-500/10 p-2.5 rounded-2xl flex items-center gap-2">
          <div className="bg-blue-100 text-blue-500 p-1.5 rounded-lg shrink-0">
            <TrendingUp size={12} />
          </div>
          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
            {footerText}
          </span>
        </div>
      )}
    </div>
  );
}

// --- WEEKLY EXPENSES BAR CHART COMPONENT ---
function WeeklyExpensesChart({ data, color }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maxVal = Math.max(...data.map(d => Number(d.value) || 0), 1);
  const yMax = maxVal * 1.15;

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 25;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const slotWidth = chartWidth / data.length;
  const barWidth = slotWidth * 0.50;
  const spacing = slotWidth * 0.50;

  const getBarPath = (x, y, w, h, r) => {
    if (h <= 0) return '';
    const radius = Math.min(r, h);
    return `
      M ${x} ${y + h}
      V ${y + radius}
      A ${radius} ${radius} 0 0 1 ${x + radius} ${y}
      H ${x + w - radius}
      A ${radius} ${radius} 0 0 1 ${x + w} ${y + radius}
      V ${y + h}
      Z
    `;
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 45
    });
  };

  const formatK = (val) => {
    if (val < 1000) return `$${Math.round(val)}`;
    return `$${(val / 1000).toFixed(1).replace('.0', '')}k`;
  };

  return (
    <div className="relative w-full overflow-visible" onMouseMove={handleMouseMove}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {(() => {
          const ticks = [];
          const step = yMax / 4;
          for (let i = 0; i <= 4; i++) {
            ticks.push(step * i);
          }
          return ticks.map((val, idx) => {
            const y = paddingTop + chartHeight - (val * chartHeight) / yMax;
            return (
              <g key={idx}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fill="#94a3b8" className="text-[8px] font-bold">
                  {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`}
                </text>
              </g>
            );
          });
        })()}

        {/* Bars */}
        {data.map((d, idx) => {
          const x = paddingLeft + idx * slotWidth + spacing / 2;
          const val = Number(d.value) || 0;
          const barHeight = (val * chartHeight) / yMax;
          const barY = paddingTop + chartHeight - barHeight;

          return (
            <g key={idx}>
              <path
                d={getBarPath(x, barY, barWidth, barHeight, 4)}
                fill={color || '#ec4899'}
                className="transition-all duration-300 hover:brightness-95 cursor-pointer"
                onMouseEnter={() => setHoveredBar({
                  label: d.label,
                  value: val
                })}
                onMouseLeave={() => setHoveredBar(null)}
              />
              {/* Value above bar */}
              {val > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={barY - 6}
                  textAnchor="middle"
                  fill="#1e293b"
                  className="text-[8px] font-extrabold"
                >
                  {formatK(val)}
                </text>
              )}
              {/* Week Label */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fill="#475569"
                className="text-[9px] font-extrabold"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredBar && (
        <div
          className="absolute z-30 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl pointer-events-none flex flex-col gap-0.5 border border-slate-700/50 backdrop-blur-md"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <span className="text-slate-400 text-[8px] uppercase tracking-wider">{hoveredBar.label}</span>
          <span className="text-white font-black">${Math.round(hoveredBar.value).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// --- COMBINED COMBO CHART (GROUPED BARS) ---
function PagarComboChart({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const width = 850;
  const height = 300;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const rawMax = Math.max(
    ...data.flatMap(d => [d.comprometido || 0, d.egresado || 0, d.pendiente || 0]),
    1
  );
  const yMax = rawMax * 1.2;
  const slotWidth = chartWidth / 12;
  const barWidth = 14;
  const gap = 2;

  const getBarPath = (x, y, w, h, r) => {
    if (h <= 0) return '';
    const radius = Math.min(r, h);
    return `
      M ${x} ${y + h}
      V ${y + radius}
      A ${radius} ${radius} 0 0 1 ${x + radius} ${y}
      H ${x + w - radius}
      A ${radius} ${radius} 0 0 1 ${x + w} ${y + radius}
      V ${y + h}
      Z
    `;
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 55
    });
  };

  return (
    <div className="relative w-full overflow-visible" onMouseMove={handleMouseMove}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Y-Axis Grid Lines & Left Labels (Amounts) */}
        {(() => {
          const ticks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
          return ticks.map((val, idx) => {
            const y = paddingTop + chartHeight - (val * chartHeight) / yMax;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  className="text-[8px] font-bold"
                >
                  {val === 0 ? '$0' : val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${Math.round(val)}`}
                </text>
              </g>
            );
          });
        })()}


        {/* X-Axis labels */}
        {data.map((d, idx) => {
          const slotCenter = paddingLeft + idx * slotWidth + slotWidth / 2;
          return (
            <text
              key={idx}
              x={slotCenter}
              y={height - 8}
              textAnchor="middle"
              fill="#475569"
              className="text-[9px] font-black uppercase tracking-wider"
            >
              {d.label}
            </text>
          );
        })}

        {/* Grouped Columns */}
        {data.map((d, idx) => {
          const slotCenter = paddingLeft + idx * slotWidth + slotWidth / 2;
          const groupWidth = 3 * barWidth + 2 * gap;
          const startX = slotCenter - groupWidth / 2;

          const hComp = (d.comprometido * chartHeight) / yMax;
          const yComp = paddingTop + chartHeight - hComp;

          const hEgr = (d.egresado * chartHeight) / yMax;
          const yEgr = paddingTop + chartHeight - hEgr;

          const hPend = (d.pendiente * chartHeight) / yMax;
          const yPend = paddingTop + chartHeight - hPend;

          return (
            <g key={idx}>
              {/* 1. Comprometido */}
              <path
                d={getBarPath(startX, yComp, barWidth, hComp, 3)}
                fill="#2563eb"
                className="transition-all duration-300 hover:brightness-95 cursor-pointer"
                onMouseEnter={() => setHoveredPoint({
                  label: `${d.label} - Comprometido`,
                  value: `$${d.comprometido.toLocaleString()}`
                })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {d.comprometido > 0 && (
                <text
                  x={startX + barWidth / 2}
                  y={yComp - 5}
                  textAnchor="middle"
                  fill="#2563eb"
                  className="text-[7px] font-extrabold"
                >
                  {d.comprometido >= 1000 ? `$${Math.round(d.comprometido / 1000)}k` : `$${Math.round(d.comprometido)}`}
                </text>
              )}

              {/* 2. Egresado */}
              <path
                d={getBarPath(startX + barWidth + gap, yEgr, barWidth, hEgr, 3)}
                fill="#10b981"
                className="transition-all duration-300 hover:brightness-95 cursor-pointer"
                onMouseEnter={() => setHoveredPoint({
                  label: `${d.label} - Egresado (Abonado)`,
                  value: `$${d.egresado.toLocaleString()}`
                })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {d.egresado > 0 && (
                <text
                  x={startX + barWidth + gap + barWidth / 2}
                  y={yEgr - 5}
                  textAnchor="middle"
                  fill="#10b981"
                  className="text-[7px] font-extrabold"
                >
                  {d.egresado >= 1000 ? `$${Math.round(d.egresado / 1000)}k` : `$${Math.round(d.egresado)}`}
                </text>
              )}

              {/* 3. Pendiente */}
              <path
                d={getBarPath(startX + 2 * (barWidth + gap), yPend, barWidth, hPend, 3)}
                fill="#f43f5e"
                className="transition-all duration-300 hover:brightness-95 cursor-pointer"
                onMouseEnter={() => setHoveredPoint({
                  label: `${d.label} - Saldo Pendiente`,
                  value: `$${d.pendiente.toLocaleString()}`
                })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {d.pendiente > 0 && (
                <text
                  x={startX + 2 * (barWidth + gap) + barWidth / 2}
                  y={yPend - 5}
                  textAnchor="middle"
                  fill="#f43f5e"
                  className="text-[7px] font-extrabold"
                >
                  {d.pendiente >= 1000 ? `$${Math.round(d.pendiente / 1000)}k` : `$${Math.round(d.pendiente)}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-30 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl pointer-events-none flex flex-col gap-0.5 border border-slate-700/50 backdrop-blur-md"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <span className="text-slate-400 text-[8px] uppercase tracking-wider">{hoveredPoint.label}</span>
          <span className="text-white font-black">{hoveredPoint.value}</span>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---

export function BalancesPage() {
  const currentYear = new Date().getFullYear();
  const [periodo, setPeriodo] = useState(String(currentYear));

  const [desde, setDesde] = useState('2026-01-01');
  const [hasta, setHasta] = useState('2026-12-31');

  // Mes centralizado del header — controla todos los gráficos mensuales
  const currentMonthIdx = new Date().getMonth(); // 0-based
  const [selectedHeaderMonth, setSelectedHeaderMonth] = useState(MONTHS_LIST[currentMonthIdx]);

  useEffect(() => {
    const yr = parseInt(periodo, 10) || 2026;
    setDesde(`${yr}-01-01`);
    setHasta(`${yr}-12-31`);
  }, [periodo]);


  const activeMonths = useMemo(() => {
    if (!desde || !hasta) return ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const start = new Date(desde);
    const end = new Date(hasta);

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 300) {
      return ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    }

    const months = [];
    const mNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    let curr = new Date(start.getFullYear(), start.getMonth(), 1);
    while (curr <= end) {
      months.push(mNames[curr.getMonth()]);
      curr.setMonth(curr.getMonth() + 1);
    }
    return months;
  }, [desde, hasta]);

  const [activeTab, setActiveTab] = useState('resumen');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBalances() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/gastos/reportes/balances?desde=${desde}&hasta=${hasta}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Error al obtener los balances');
        }
        setData(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBalances();
  }, [desde, hasta]);

  useEffect(() => {
    if (!desde) return;
    const parts = desde.split('-');
    const yr = parseInt(parts[0], 10);
    if (yr) {
      setFlujoYear(yr);
      setFacturacionYear(yr);
      setVentasMesYear(yr);
      setCobrarYear(yr);
    }
  }, [desde]);

  const [flujoYear, setFlujoYear] = useState(2026);
  const [facturacionYear, setFacturacionYear] = useState(2026);

  const [flujoDataReal, setFlujoDataReal] = useState(null);
  const [flujoDataRealPrev, setFlujoDataRealPrev] = useState(null);
  const [facturacionDataReal, setFacturacionDataReal] = useState(null);
  const [facturacionDataRealPrev, setFacturacionDataRealPrev] = useState(null);

  const [loadingFlujo, setLoadingFlujo] = useState(false);
  const [loadingFacturacion, setLoadingFacturacion] = useState(false);
  useEffect(() => {
    async function fetchFlujoYearData() {
      setLoadingFlujo(true);
      try {
        const token = localStorage.getItem('token');
        const [resCurr, resPrev] = await Promise.all([
          fetch(`/api/gastos/reportes/balances?desde=${flujoYear}-01-01&hasta=${flujoYear}-12-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/gastos/reportes/balances?desde=${flujoYear - 1}-01-01&hasta=${flujoYear - 1}-12-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        const jsonCurr = await resCurr.json();
        const jsonPrev = await resPrev.json();
        if (jsonCurr.success) setFlujoDataReal(jsonCurr.data);
        if (jsonPrev.success) setFlujoDataRealPrev(jsonPrev.data);
      } catch (err) {
        console.error('Error fetching flujo year data:', err);
      } finally {
        setLoadingFlujo(false);
      }
    }
    fetchFlujoYearData();
  }, [flujoYear]);

  useEffect(() => {
    async function fetchFacturacionYearData() {
      setLoadingFacturacion(true);
      try {
        const token = localStorage.getItem('token');
        const [resCurr, resPrev] = await Promise.all([
          fetch(`/api/gastos/reportes/balances?desde=${facturacionYear}-01-01&hasta=${facturacionYear}-12-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/gastos/reportes/balances?desde=${facturacionYear - 1}-01-01&hasta=${facturacionYear - 1}-12-31`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        const jsonCurr = await resCurr.json();
        const jsonPrev = await resPrev.json();
        if (jsonCurr.success) setFacturacionDataReal(jsonCurr.data);
        if (jsonPrev.success) setFacturacionDataRealPrev(jsonPrev.data);
      } catch (err) {
        console.error('Error fetching facturacion year data:', err);
      } finally {
        setLoadingFacturacion(false);
      }
    }
    fetchFacturacionYearData();
  }, [facturacionYear]);

  const [weeklyDataReal, setWeeklyDataReal] = useState(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  const [ventasMesYear, setVentasMesYear] = useState(2026);
  const [ventasMesDataReal, setVentasMesDataReal] = useState(null);
  const [loadingVentasMes, setLoadingVentasMes] = useState(false);

  useEffect(() => {
    async function fetchWeeklyData() {
      setLoadingWeekly(true);
      try {
        const year = parseInt(desde.substring(0, 4), 10); // parse year directly to avoid UTC-5 timezone shift
        const monthMap = {
          ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
          JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12'
        };
        const mNum = monthMap[selectedHeaderMonth];
        const daysMap = {
          '01': 31, '02': (year % 4 === 0 ? 29 : 28), '03': 31, '04': 30, '05': 31, '06': 30,
          '07': 31, '08': 31, '09': 30, '10': 31, '11': 30, '12': 31
        };
        const lastDay = daysMap[mNum];

        const token = localStorage.getItem('token');
        const res = await fetch(`/api/gastos/reportes/balances?desde=${year}-${mNum}-01&hasta=${year}-${mNum}-${lastDay}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setWeeklyDataReal(json.data);
        }
      } catch (err) {
        console.error('Error fetching weekly data:', err);
      } finally {
        setLoadingWeekly(false);
      }
    }
    fetchWeeklyData();
  }, [selectedHeaderMonth, desde]);

  useEffect(() => {
    async function fetchVentasMes() {
      setLoadingVentasMes(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/gastos/reportes/balances?desde=${ventasMesYear}-01-01&hasta=${ventasMesYear}-12-31`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setVentasMesDataReal(json.data);
        }
      } catch (err) {
        console.error('Error fetching ventas mes data:', err);
      } finally {
        setLoadingVentasMes(false);
      }
    }
    fetchVentasMes();
  }, [ventasMesYear]);

  const [cobrarYear, setCobrarYear] = useState(2026);
  const [cobrarDataReal, setCobrarDataReal] = useState(null);
  const [loadingCobrar, setLoadingCobrar] = useState(false);

  useEffect(() => {
    async function fetchCobrarYearData() {
      setLoadingCobrar(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/gastos/reportes/balances?desde=${cobrarYear}-01-01&hasta=${cobrarYear}-12-31`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setCobrarDataReal(json.data);
        }
      } catch (err) {
        console.error('Error fetching cobrar year data:', err);
      } finally {
        setLoadingCobrar(false);
      }
    }
    fetchCobrarYearData();
  }, [cobrarYear]);
  const [gastosPeriodo, setGastosPeriodo] = useState('Este mes');
  const [gastosDataReal, setGastosDataReal] = useState(null);
  const [loadingGastos, setLoadingGastos] = useState(false);

  useEffect(() => {
    async function fetchGastosPeriodoData() {
      setLoadingGastos(true);
      try {
        const token = localStorage.getItem('token');
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const daysMap = {
          '01': 31, '02': (year % 4 === 0 ? 29 : 28), '03': 31, '04': 30, '05': 31, '06': 30,
          '07': 31, '08': 31, '09': 30, '10': 31, '11': 30, '12': 31
        };

        let desdeStr = `${year}-${month}-01`;
        let hastaStr = `${year}-${month}-${daysMap[month]}`;

        if (gastosPeriodo === 'Mes anterior') {
          const prevMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
          const pYear = prevMonthDate.getFullYear();
          const pMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
          desdeStr = `${pYear}-${pMonth}-01`;
          hastaStr = `${pYear}-${pMonth}-${daysMap[pMonth]}`;
        } else if (gastosPeriodo === 'Este año') {
          desdeStr = `${year}-01-01`;
          hastaStr = `${year}-12-31`;
        }

        const res = await fetch(`/api/gastos/reportes/balances?desde=${desdeStr}&hasta=${hastaStr}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setGastosDataReal(json.data);
        }
      } catch (err) {
        console.error('Error fetching gastos periodo data:', err);
      } finally {
        setLoadingGastos(false);
      }
    }
    fetchGastosPeriodoData();
  }, [gastosPeriodo]);

  const [weeklyGastosDataReal, setWeeklyGastosDataReal] = useState(null);
  const [loadingWeeklyGastos, setLoadingWeeklyGastos] = useState(false);



  useEffect(() => {
    async function fetchWeeklyGastos() {
      setLoadingWeeklyGastos(true);
      try {
        const year = parseInt(desde.substring(0, 4), 10); // parse year directly to avoid UTC-5 timezone shift
        const monthMap = {
          ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
          JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12'
        };
        const mNum = monthMap[selectedHeaderMonth];
        const daysMap = {
          '01': 31, '02': (year % 4 === 0 ? 29 : 28), '03': 31, '04': 30, '05': 31, '06': 30,
          '07': 31, '08': 31, '09': 30, '10': 31, '11': 30, '12': 31
        };
        const lastDay = daysMap[mNum];

        const token = localStorage.getItem('token');
        const res = await fetch(`/api/gastos/reportes/balances?desde=${year}-${mNum}-01&hasta=${year}-${mNum}-${lastDay}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setWeeklyGastosDataReal(json.data);
        }
      } catch (err) {
        console.error('Error fetching weekly gastos data:', err);
      } finally {
        setLoadingWeeklyGastos(false);
      }
    }
    fetchWeeklyGastos();
  }, [selectedHeaderMonth, desde]);

  const fmt = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(val) || 0);
  };

  const renderGrowthIndicator = (pct, colorClass) => {
    const isPositive = pct >= 0;
    const absPct = Math.abs(pct).toFixed(1);
    const arrow = isPositive ? '▲' : '▼';
    return (
      <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${colorClass}`}>
        <span>{arrow}</span>
        <span>{absPct}% vs año anterior</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-slate-500 text-sm font-semibold">Consolidando estados financieros...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl flex items-center gap-3 my-6 max-w-2xl mx-auto">
        <AlertTriangle className="text-rose-500 shrink-0" />
        <div>
          <h4 className="font-bold text-sm">Error al cargar datos</h4>
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  const activeData = data || {};

  const {
    sourceAttr = {},
    surveyStats = {},
    ventas = {},
    ingresosMetodo = {},
    cuentasPorCobrar = {},
    cuentasPorCobrarDetalle = [],
    gastosDevengados = {},
    egresos = {},
    comparativos = {},
    nomina = {},
    cuentasPorPagar = {}
  } = activeData;

  // Totales
  const totalVentas = Object.values(ventas.porMes || {}).reduce((sum, v) => sum + v, 0);
  const totalGastos = Object.values(gastosDevengados.porMes || {}).reduce((sum, v) => sum + v, 0);
  const totalIngresos = Object.values(ingresosMetodo || {}).reduce((sum, v) => sum + v, 0);
  const totalEgresos = Object.values(egresos.porTipo || {}).reduce((sum, v) => sum + v, 0);
  const ctasPorCobrarTotal = Object.values(cuentasPorCobrar || {}).reduce((sum, v) => sum + v, 0);
  const ctasPorPagarTotal = Object.values(cuentasPorPagar || {}).reduce((sum, v) => sum + v.pendiente, 0);

  const monthsList = MONTHS_LIST;

  // --- CALCULATIONS FOR FLUJO CARD ---
  let flujoMonthsData = { ingresos: {}, egresos: {} };
  let flujoMonthsDataPrev = { ingresos: {}, egresos: {} };
  let ingresosTotal = 0;
  let egresosTotal = 0;
  let ingresosTotalPrev = 0;
  let egresosTotalPrev = 0;

  const activeFlujo = flujoDataReal || data || {};
  const activeFlujoPrev = flujoDataRealPrev || {};
  flujoMonthsData = {
    ingresos: activeFlujo.comparativos?.ingresosEgresos?.ingresos || {},
    egresos: activeFlujo.comparativos?.ingresosEgresos?.egresos || {}
  };
  flujoMonthsDataPrev = {
    ingresos: activeFlujoPrev.comparativos?.ingresosEgresos?.ingresos || {},
    egresos: activeFlujoPrev.comparativos?.ingresosEgresos?.egresos || {}
  };

  const sumValues = (obj) => Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  ingresosTotal = sumValues(flujoMonthsData.ingresos);
  egresosTotal = sumValues(flujoMonthsData.egresos);
  ingresosTotalPrev = sumValues(flujoMonthsDataPrev.ingresos);
  egresosTotalPrev = sumValues(flujoMonthsDataPrev.egresos);

  const netTotal = ingresosTotal - egresosTotal;
  const netTotalPrev = ingresosTotalPrev - egresosTotalPrev;

  const ingresosGrowth = ingresosTotalPrev > 0 ? ((ingresosTotal - ingresosTotalPrev) / ingresosTotalPrev) * 100 : 0;
  const egresosGrowth = egresosTotalPrev > 0 ? ((egresosTotal - egresosTotalPrev) / egresosTotalPrev) * 100 : 0;
  const netGrowth = netTotalPrev > 0 ? ((netTotal - netTotalPrev) / netTotalPrev) * 100 : 0;

  // --- CALCULATIONS FOR FACTURACION CARD ---
  let facturacionMonthsData = { ventas: {}, gastos: {} };
  let facturacionMonthsDataPrev = { ventas: {}, gastos: {} };
  let ventasTotal = 0;
  let gastosTotal = 0;
  let ventasTotalPrev = 0;
  let gastosTotalPrev = 0;

  const activeFact = facturacionDataReal || data || {};
  const activeFactPrev = facturacionDataRealPrev || {};
  facturacionMonthsData = {
    ventas: activeFact.comparativos?.ventasGastos?.ventas || {},
    gastos: activeFact.comparativos?.ventasGastos?.gastos || {}
  };
  facturacionMonthsDataPrev = {
    ventas: activeFactPrev.comparativos?.ventasGastos?.ventas || {},
    gastos: activeFactPrev.comparativos?.ventasGastos?.gastos || {}
  };

  const sumValues2 = (obj) => Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  ventasTotal = sumValues2(facturacionMonthsData.ventas);
  gastosTotal = sumValues2(facturacionMonthsData.gastos);
  ventasTotalPrev = sumValues2(facturacionMonthsDataPrev.ventas);
  gastosTotalPrev = sumValues2(facturacionMonthsDataPrev.gastos);

  const utilidadTotal = ventasTotal - gastosTotal;
  const utilidadTotalPrev = ventasTotalPrev - gastosTotalPrev;

  const ventasGrowth = ventasTotalPrev > 0 ? ((ventasTotal - ventasTotalPrev) / ventasTotalPrev) * 100 : 0;
  const gastosGrowth = gastosTotalPrev > 0 ? ((gastosTotal - gastosTotalPrev) / gastosTotalPrev) * 100 : 0;
  const utilidadGrowth = utilidadTotalPrev > 0 ? ((utilidadTotal - utilidadTotalPrev) / utilidadTotalPrev) * 100 : 0;

  const tabs = [
    { id: 'resumen', label: 'Resumen General', icon: Grid },
    { id: 'ventas', label: 'Ventas e Ingresos', icon: Briefcase },
    { id: 'cobrar', label: 'Cuentas por Cobrar', icon: TrendingUp },
    { id: 'gastos', label: 'Gastos y Egresos', icon: DollarSign },
    { id: 'clientes', label: 'Satisfacción y Calidad', icon: Smile },
    { id: 'pagar', label: 'Cuentas por Pagar', icon: FileText }
  ];

  return (
    <div className="w-full pb-20 md:pb-6 animate-slide-up bl-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .bl-root, .bl-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
      `}</style>

      {/* HEADER CARD CON TABS INTEGRADAS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs mb-4 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 shadow-xs">
              <TrendingUp size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Balances de Gestión</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Finanzas
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Control consolidado de rentabilidad, cuentas por cobrar/pagar e índices de satisfacción
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
            <div className="relative">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="appearance-none bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
            <div className="relative">
              <select
                value={selectedHeaderMonth}
                onChange={(e) => setSelectedHeaderMonth(e.target.value)}
                className="appearance-none bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
              >
                {MONTHS_LIST.map(m => (
                  <option key={m} value={m}>{MONTH_FULL_NAMES[m]}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* TABS INTEGRADAS EN EL HEADER */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 sm:px-6 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#0b2d64] text-[#0b2d64] font-bold bg-white/60'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">

        {activeTab === 'resumen' && (
          <div className="flex flex-col gap-6 p-4 animate-fadeIn">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 relative hover:shadow-md transition-all">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 text-emerald-500 p-3 rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">Flujo mensual</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-bold text-slate-400">Ingresos vs Egresos</p>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                        {formatPeriodLabel(desde, hasta)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={flujoYear}
                    onChange={(e) => setFlujoYear(Number(e.target.value))}
                    className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                    <option value={2023}>2023</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-500/5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ingresos totales</span>
                  <span className="text-base font-black text-slate-800 block">{fmt(ingresosTotal)}</span>
                  {renderGrowthIndicator(ingresosGrowth, 'text-emerald-600')}
                </div>
                <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-500/5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Egresos totales</span>
                  <span className="text-base font-black text-slate-800 block">{fmt(egresosTotal)}</span>
                  {renderGrowthIndicator(egresosGrowth, 'text-amber-600')}
                </div>
                <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-500/5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Resultado neto</span>
                  <span className="text-base font-black text-slate-800 block">{fmt(netTotal)}</span>
                  {renderGrowthIndicator(netGrowth, 'text-blue-600')}
                </div>
              </div>

              <div className="flex justify-center gap-6 text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Egresos</span>
                </div>
              </div>

              {loadingFlujo ? (
                <div className="h-60 flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                  <span className="text-xs font-semibold text-slate-400">Cargando reporte...</span>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto w-full">
                  <DoubleBarChart
                    data={monthsList.map(m => ({
                      label: m,
                      ingresos: flujoMonthsData.ingresos[m] || 0,
                      egresos: flujoMonthsData.egresos[m] || 0
                    }))}
                    keys={['ingresos', 'egresos']}
                    colors={['#10b981', '#f59e0b']}
                    labels={['Ingresos', 'Egresos']}
                    year={flujoYear}
                  />
                </div>
              )}

              <div className="bg-emerald-50/50 border border-emerald-500/10 p-3 rounded-2xl flex items-center gap-3">
                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div className="text-xs">
                  <h4 className="font-extrabold text-slate-800">
                    {ingresosGrowth >= 0 ? 'Tendencia positiva' : 'Tendencia a la baja'}
                  </h4>
                  <p className="text-slate-500 font-semibold mt-0.5">
                    Los ingresos han {ingresosGrowth >= 0 ? 'aumentado' : 'disminuido'} {Math.abs(ingresosGrowth).toFixed(1)}% comparado con el año anterior.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 relative hover:shadow-md transition-all">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 text-blue-500 p-3 rounded-2xl">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">Facturación y costos</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-bold text-slate-400">Ventas vs Gastos</p>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                        {formatPeriodLabel(desde, hasta)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={facturacionYear}
                    onChange={(e) => setFacturacionYear(Number(e.target.value))}
                    className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                    <option value={2023}>2023</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-500/5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ventas totales</span>
                  <span className="text-base font-black text-slate-800 block">{fmt(ventasTotal)}</span>
                  {renderGrowthIndicator(ventasGrowth, 'text-blue-600')}
                </div>
                <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-500/5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gastos totales</span>
                  <span className="text-base font-black text-slate-800 block">{fmt(gastosTotal)}</span>
                  {renderGrowthIndicator(gastosGrowth, 'text-rose-600')}
                </div>
                <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-500/5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Utilidad bruta</span>
                  <span className="text-base font-black text-slate-800 block">{fmt(utilidadTotal)}</span>
                  {renderGrowthIndicator(utilidadGrowth, 'text-purple-600')}
                </div>
              </div>

              <div className="flex justify-center gap-6 text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Ventas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Gastos</span>
                </div>
              </div>

              {loadingFacturacion ? (
                <div className="h-60 flex flex-col items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                  <span className="text-xs font-semibold text-slate-400">Cargando reporte...</span>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto w-full">
                  <DoubleBarChart
                    data={monthsList.map(m => ({
                      label: m,
                      ventas: facturacionMonthsData.ventas[m] || 0,
                      gastos: facturacionMonthsData.gastos[m] || 0
                    }))}
                    keys={['ventas', 'gastos']}
                    colors={['#3b82f6', '#f43f5e']}
                    labels={['Ventas', 'Gastos']}
                    year={facturacionYear}
                  />
                </div>
              )}

              <div className="bg-blue-50/50 border border-blue-500/10 p-3 rounded-2xl flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-xl shrink-0">
                  <BarChart3 size={16} />
                </div>
                <div className="text-xs">
                  <h4 className="font-extrabold text-slate-800">
                    {ventasGrowth >= 0 ? 'Crecimiento constante' : 'Variación de ventas'}
                  </h4>
                  <p className="text-slate-500 font-semibold mt-0.5">
                    Las ventas han {ventasGrowth >= 0 ? 'crecido' : 'bajado'} {Math.abs(ventasGrowth).toFixed(1)}% en comparación al año anterior.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ventas' && (() => {
          let canalVentas = [];
          const activeWeekly = weeklyDataReal || {};
          const activeSource = activeWeekly.sourceAttr || {};
          canalVentas = [
            { label: 'LUXES', value: activeSource.LUXES?.ventas || 0, color: '#3b82f6' },
            { label: 'REDES', value: activeSource.REDES?.ventas || 0, color: '#0ea5e9' },
            { label: 'VENDEDORES', value: activeSource.VENDEDORES?.ventas || 0, color: '#6366f1' }
          ];

          let metodoIngresos = [];
          const activeMethods = activeWeekly.ingresosMetodo || {};
          const METHOD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#0ea5e9', '#84cc16', '#ef4444', '#6366f1'];
          metodoIngresos = Object.entries(activeMethods).map(([label, value], idx) => ({
            label,
            value: Number(value) || 0,
            color: METHOD_COLORS[idx % METHOD_COLORS.length]
          }));
          if (metodoIngresos.length === 0) {
            metodoIngresos = [{ label: 'Sin registros en el periodo', value: 0, color: '#cbd5e1' }];
          }


          let weeklySalesData = [];
          const wData = activeWeekly.ventas?.porSemana || {};
          weeklySalesData = [
            { label: 'Semana 1', range: '1 - 7', value: wData['Semana 1'] || 0 },
            { label: 'Semana 2', range: '8 - 14', value: wData['Semana 2'] || 0 },
            { label: 'Semana 3', range: '15 - 21', value: wData['Semana 3'] || 0 },
            { label: 'Semana 4', range: '22 - 28', value: wData['Semana 4'] || 0 },
            { label: 'Semana 5', range: '29 - 31', value: wData['Semana 5'] || 0 }
          ];

          let bestWeekName = 'Semana 1';
          let bestWeekVal = 0;
          weeklySalesData.forEach(d => {
            if (d.value > bestWeekVal) {
              bestWeekVal = d.value;
              bestWeekName = d.label;
            }
          });

          let monthlySalesData = [];
          const yData = ventasMesDataReal?.ventas?.porMes || activeData.ventas?.porMes || {};
          monthlySalesData = monthsList.map(m => ({
            label: m,
            value: yData[m] || 0
          }));

          let bestMonthName = 'DIC';
          let bestMonthVal = 0;
          monthlySalesData.forEach(d => {
            if (d.value > bestMonthVal) {
              bestMonthVal = d.value;
              bestMonthName = d.label;
            }
          });

          const monthFullNames = {
            ENE: 'Enero', FEB: 'Febrero', MAR: 'Marzo', ABR: 'Abril', MAY: 'Mayo', JUN: 'Junio',
            JUL: 'Julio', AGO: 'Agosto', SEP: 'Septiembre', OCT: 'Octubre', NOV: 'Noviembre', DIC: 'Diciembre'
          };
          const bestMonthFullName = monthFullNames[bestMonthName] || bestMonthName;

          return (
            <div className="space-y-6 p-4 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AttributionDonutChart
                  data={canalVentas}
                  title="Ventas por canal"
                  subtitle="Distribución del total de ventas"
                  centerText="Total"
                  centerGrowth="↑ 18.6%"
                  footerText="Crecimiento total: 18.6% vs mes anterior"
                  type="canal"
                  periodLabel={`${MONTH_FULL_NAMES[selectedHeaderMonth]} ${desde.split('-')[0]}`}
                />

                <AttributionDonutChart
                  data={metodoIngresos}
                  title="Ingresos por método de pago"
                  subtitle="Total cobrado por método de pago"
                  centerText="Total"
                  type="metodo"
                  periodLabel={`${MONTH_FULL_NAMES[selectedHeaderMonth]} ${desde.split('-')[0]}`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 relative hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 text-blue-500 p-3 rounded-2xl">
                          <Calendar size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">Ventas del periodo por semana</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs font-bold text-slate-400">Distribución de ventas semanales</p>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                              {MONTH_FULL_NAMES[selectedHeaderMonth]} {desde.split('-')[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {loadingWeekly ? (
                      <div className="h-44 flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-xs font-semibold text-slate-400">Cargando reporte mensual...</span>
                      </div>
                    ) : (
                      <WeeklySalesChart
                        data={weeklySalesData}
                        color="#3b82f6"
                      />
                    )}
                  </div>

                  <div className="bg-blue-50/50 border border-blue-500/10 p-3 rounded-2xl flex items-center gap-3 mt-4">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-xl shrink-0">
                      <TrendingUp size={16} />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-extrabold text-slate-800">Rendimiento semanal</h4>
                      <p className="text-slate-500 font-semibold mt-0.5">
                        Mejor semana: <span className="font-black text-blue-600">{bestWeekName}</span> con <span className="font-black text-blue-600">${(bestWeekVal / 1000).toFixed(1)}k</span> en ventas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 relative hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-50 text-purple-500 p-3 rounded-2xl">
                          <BarChart3 size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">Ventas por mes del año</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs font-bold text-slate-400">Comportamiento anual acumulado</p>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                              {formatPeriodLabel(desde, hasta)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <select
                          value={ventasMesYear}
                          onChange={(e) => setVentasMesYear(Number(e.target.value))}
                          className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value={2026}>2026</option>
                          <option value={2025}>2025</option>
                          <option value={2024}>2024</option>
                          <option value={2023}>2023</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {loadingVentasMes ? (
                      <div className="h-44 flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
                        <span className="text-xs font-semibold text-slate-400">Cargando reporte anual...</span>
                      </div>
                    ) : (
                      <ColumnChart
                        data={monthlySalesData}
                        color="#6366f1"
                      />
                    )}
                  </div>

                  <div className="bg-purple-50/50 border border-purple-500/10 p-3 rounded-2xl flex items-center gap-3 mt-4">
                    <div className="bg-purple-100 text-purple-600 p-2 rounded-xl shrink-0">
                      <TrendingUp size={16} />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-extrabold text-slate-800">Rendimiento mensual</h4>
                      <p className="text-slate-500 font-semibold mt-0.5">
                        Mejor mes: <span className="font-black text-purple-600">{bestMonthFullName}</span> con <span className="font-black text-purple-600">${(bestMonthVal / 1000).toFixed(0)}k</span> en ventas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'cobrar' && (() => {
          const activeCobrarObj = cobrarDataReal || data || {};
          const sumValues = (obj) => Object.values(obj || {}).reduce((s, v) => s + (Number(v) || 0), 0);

          let monthlyPending = activeCobrarObj.cuentasPorCobrar || {};
          const filteredPending = {};
          Object.entries(monthlyPending).forEach(([k, v]) => {
            if (activeMonths.includes(k)) {
              filteredPending[k] = v;
            } else {
              filteredPending[k] = 0;
            }
          });
          monthlyPending = filteredPending;
          const pendienteTotal = sumValues(monthlyPending);
          const cobradoTotal = sumValues(activeCobrarObj.ingresosMetodo);

          const totalBilled = cobradoTotal + pendienteTotal;
          const pctCobrado = totalBilled > 0 ? (cobradoTotal / totalBilled) * 100 : 0;

          const proformasFiltered = (cuentasPorCobrarDetalle || []).filter(p => {
            if (!desde || !hasta) return true;
            return p.fecha >= desde && p.fecha <= hasta;
          });

          const r = 36;
          const circ = 2 * Math.PI * r;
          const strokeDashoffset = circ - (pctCobrado * circ) / 100;

          let maxMonthName = '—';
          let maxMonthVal = 0;
          Object.entries(monthlyPending).forEach(([m, val]) => {
            if (val > maxMonthVal) {
              maxMonthVal = val;
              maxMonthName = m;
            }
          });
          const monthFullNames = {
            ENE: 'Enero', FEB: 'Febrero', MAR: 'Marzo', ABR: 'Abril', MAY: 'Mayo', JUN: 'Junio',
            JUL: 'Julio', AGO: 'Agosto', SEP: 'Septiembre', OCT: 'Octubre', NOV: 'Noviembre', DIC: 'Diciembre'
          };
          const maxMonthFullName = monthFullNames[maxMonthName] || maxMonthName;

          return (
            <div className="space-y-6 p-4 animate-fadeIn">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-805 tracking-tight leading-tight">Cuentas por cobrar (Clientes)</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">Detalle de facturación pendiente y saldos por cobrar de clientes.</p>
                </div>
                <div className="bg-emerald-50/40 border border-emerald-100 px-5 py-3 rounded-2xl flex items-center gap-3 shrink-0">
                  <div className="bg-emerald-100 text-emerald-650 p-2.5 rounded-xl shrink-0">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <span className="block text-[9px] font-extrabold text-emerald-800 uppercase tracking-widest">Saldo por Cobrar</span>
                    <span className="text-xl font-black text-emerald-950 block mt-0.5">{fmt(pendienteTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 relative hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 text-emerald-500 p-3 rounded-2xl">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">Saldos pendientes por cobrar por mes</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs font-bold text-slate-400">Montos pendientes de cobro por mes</p>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                              {formatPeriodLabel(desde, hasta)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <select
                          value={cobrarYear}
                          onChange={(e) => setCobrarYear(Number(e.target.value))}
                          className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value={2026}>2026</option>
                          <option value={2025}>2025</option>
                          <option value={2024}>2024</option>
                          <option value={2023}>2023</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {loadingCobrar ? (
                      <div className="h-44 flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                        <span className="text-xs font-semibold text-slate-400">Cargando reporte...</span>
                      </div>
                    ) : (
                      <ColumnChart
                        data={monthsList.map(m => ({
                          label: m,
                          value: monthlyPending[m] || 0
                        }))}
                        color="#10b981"
                      />
                    )}
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-500/10 p-3 rounded-2xl flex items-center gap-3 mt-4">
                    <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl shrink-0">
                      <TrendingUp size={16} />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-extrabold text-slate-800">Tendencia de cobro</h4>
                      <p className="text-slate-500 font-semibold mt-0.5">
                        El saldo pendiente de <span className="font-black text-emerald-600">{maxMonthFullName}</span> es el más alto del año con <span className="font-black text-emerald-600">{fmt(maxMonthVal)}</span>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 relative hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-50 text-blue-500 p-3 rounded-2xl">
                        <Activity size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">Proporción de cobro</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs font-bold text-slate-400">Ratio de facturación liquidada</p>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                            {formatPeriodLabel(desde, hasta)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                      <div className="relative w-28 h-28 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                          <circle
                            cx="50"
                            cy="50"
                            r={r}
                            fill="transparent"
                            stroke="#10b981"
                            strokeWidth="8"
                            strokeDasharray={circ}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                          <span className="text-lg font-black text-slate-800 leading-none">
                            {Math.round(pctCobrado)}%
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cobrado</span>
                        </div>
                      </div>

                      <div className="space-y-3 flex-1 w-full text-xs">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">Cobrado</span>
                          </div>
                          <span className="font-black text-slate-800">{fmt(cobradoTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px]">Pendiente</span>
                          </div>
                          <span className="font-black text-slate-800">{fmt(pendienteTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div style={{ width: `${pctCobrado}%` }} className="bg-emerald-500 h-full rounded-full" />
                    </div>

                    <div className="bg-emerald-50/40 border border-emerald-100/50 p-3 rounded-2xl flex items-center gap-3">
                      <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl shrink-0">
                        <TrendingUp size={16} />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-extrabold text-slate-805">¡Buen progreso!</h4>
                        <p className="text-slate-500 font-semibold mt-0.5">
                          Has cobrado el {Math.round(pctCobrado)}% de la facturación acumulada.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-50 text-blue-500 p-2 rounded-xl">
                    <FileText size={18} />
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Detalle por proforma y cliente</h4>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                      {formatPeriodLabel(desde, hasta)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3 pl-2">Proforma / ID</th>
                        <th className="pb-3">Cliente</th>
                        <th className="pb-3">Fecha</th>
                        <th className="pb-3 text-right">Monto Total</th>
                        <th className="pb-3 text-right">Cobrado</th>
                        <th className="pb-3 text-right">Saldo Pendiente</th>
                        <th className="pb-3 text-center pr-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-650">
                      {proformasFiltered.length > 0 ? (
                        proformasFiltered.map((item, idx) => {
                          let badgeBg = 'bg-amber-50 text-amber-700 border-amber-200/60';
                          let statusText = 'Pendiente';
                          if (item.pendiente === 0) {
                            badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
                            statusText = 'Cobrado';
                          } else if (item.cobrado === 0) {
                            badgeBg = 'bg-rose-50 text-rose-700 border-rose-200/60';
                            statusText = 'Vencido';
                          }

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 pl-2 font-bold text-slate-805">{item.id}</td>
                              <td className="py-3.5">{item.clienteNombre}</td>
                              <td className="py-3.5 text-slate-500 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={12} className="text-slate-400" />
                                  {item.fecha}
                                </span>
                              </td>
                              <td className="py-3.5 text-right font-semibold">{fmt(item.total)}</td>
                              <td className="py-3.5 text-right text-emerald-600 font-bold">{fmt(item.cobrado)}</td>
                              <td className="py-3.5 text-right text-amber-600 font-extrabold">{fmt(item.pendiente)}</td>
                              <td className="py-3.5 text-center pr-2">
                                <span className={`inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeBg}`}>
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400 font-semibold">No hay cuentas pendientes por cobrar registradas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center">
                  <button className="flex items-center gap-2 text-[10px] font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                    <Sparkles size={12} />
                    <span>Ver todas las proformas</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'gastos' && (() => {
          const activeG = weeklyGastosDataReal || data || {};
          const gTypes = activeG.gastosDevengados?.porTipo || {};
          const eTypes = activeG.egresos?.porTipo || {};

          let devengadosTotal = 0;
          let egresosTotal = 0;
          let devengadosList = [];
          let egresosList = [];
          let weeklyExpenses = [];
          let nominaCargos = [];
          let iessTotal = 0;

          const colorsDev = {
            'Compras (OC)': 'bg-rose-500 text-rose-500',
            'Nómina': 'bg-pink-500 text-pink-500',
            'Redes y Programas': 'bg-purple-500 text-purple-500',
            'Vehículos': 'bg-blue-500 text-blue-500',
            'Logística': 'bg-cyan-500 text-cyan-500',
            'Varios': 'bg-indigo-500 text-indigo-500',
            'Servicios Básicos': 'bg-amber-500 text-amber-500',
            'Oficina': 'bg-teal-500 text-teal-500'
          };
          const iconsDev = {
            'Compras (OC)': ShoppingCart,
            'Nómina': Users,
            'Redes y Programas': Layers,
            'Vehículos': Car,
            'Logística': Truck,
            'Varios': MoreHorizontal,
            'Servicios Básicos': Zap,
            'Oficina': Building
          };

          devengadosTotal = Object.values(gTypes).reduce((s, v) => s + v, 0);
          devengadosList = Object.entries(gTypes).map(([k, v]) => ({
            label: k,
            value: v,
            pct: 0,
            color: colorsDev[k] || 'bg-slate-500 text-slate-500',
            icon: iconsDev[k] || Briefcase
          })).sort((a, b) => b.value - a.value);

          const dSum = devengadosList.reduce((sum, item) => sum + item.value, 0);
          devengadosList.forEach(item => {
            item.pct = dSum > 0 ? Math.round((item.value / dSum) * 100) : 0;
          });

          egresosTotal = Object.values(eTypes).reduce((s, v) => s + v, 0);
          const eColors = ['#f59e0b', '#e11d48', '#0284c7', '#10b981', '#8b5cf6', '#a855f7'];
          egresosList = Object.entries(eTypes).map(([k, v], idx) => ({
            label: k,
            value: v,
            pct: 0,
            color: eColors[idx % eColors.length]
          })).sort((a, b) => b.value - a.value);

          const eSum = egresosList.reduce((sum, item) => sum + item.value, 0);
          egresosList.forEach(item => {
            item.pct = eSum > 0 ? Math.round((item.value / eSum) * 100) : 0;
          });

          const wData = (weeklyGastosDataReal || activeG).gastosDevengados?.porSemana || {};
          weeklyExpenses = [
            { label: 'Semana 1', range: '1 - 7', value: wData['Semana 1'] || 0 },
            { label: 'Semana 2', range: '8 - 14', value: wData['Semana 2'] || 0 },
            { label: 'Semana 3', range: '15 - 21', value: wData['Semana 3'] || 0 },
            { label: 'Semana 4', range: '22 - 28', value: wData['Semana 4'] || 0 },
            { label: 'Semana 5', range: '29 - 31', value: wData['Semana 5'] || 0 }
          ];

          const nom = activeG.nomina?.porRol || {};
          nominaCargos = Object.entries(nom).map(([k, v]) => ({
            label: k,
            value: v
          }));
          iessTotal = activeG.nomina?.iessTotal || 0;

          const r = 36;
          const circ = 2 * Math.PI * r;
          let accumulatedPercent = 0;

          const maxNomCargo = Math.max(...nominaCargos.map(c => c.value), 1);

          const monthFullNames = {
            ENE: 'Enero', FEB: 'Febrero', MAR: 'Marzo', ABR: 'Abril', MAY: 'Mayo', JUN: 'Junio',
            JUL: 'Julio', AGO: 'Agosto', SEP: 'Septiembre', OCT: 'Octubre', NOV: 'Noviembre', DIC: 'Diciembre'
          };

          return (
            <div className="space-y-6 p-4 animate-fadeIn">
              {/* TOP ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

                {/* Gastos Devengados Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-full">
                  <div>
                    {/* Header */}
                    <div className="mb-6">
                      <h3 className="text-lg font-black text-slate-805 uppercase tracking-wider leading-tight">Distribución de Gastos Devengados</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                          {MONTH_FULL_NAMES[selectedHeaderMonth]} {desde.split('-')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Total info */}
                    <div className="mb-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total devengado</span>
                      <h2 className="text-2xl font-black text-slate-800 mt-1">{fmt(devengadosTotal)}</h2>
                      <span className="text-[9px] font-extrabold text-slate-400 block mt-0.5">100% del total</span>
                    </div>

                    {/* Progress bars list */}
                    <div className="space-y-4">
                      {devengadosList.map((item, idx) => {
                        const Icon = item.icon || Briefcase;
                        const colorBg = item.color.split(' ')[0];
                        const colorText = item.color.split(' ')[1];
                        return (
                          <div key={idx} className="flex items-center gap-4 text-xs font-medium text-slate-700">
                            {/* Icon badge */}
                            <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 shrink-0 ${colorText}`}>
                              <Icon size={16} />
                            </div>

                            {/* Label */}
                            <span className="w-28 truncate font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{item.label}</span>

                            {/* Progress bar */}
                            <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div style={{ width: `${item.pct}%` }} className={`h-full rounded-full ${colorBg}`} />
                            </div>

                            {/* Percentage and Value */}
                            <span className="w-10 text-right font-black text-slate-800">{item.pct}%</span>
                            <span className="w-20 text-right font-extrabold text-slate-500">{fmt(item.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* X Axis ticks */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between text-[9px] font-bold text-slate-400 pl-40 pr-32">
                    <span>0%</span>
                    <span>10%</span>
                    <span>20%</span>
                    <span>30%</span>
                    <span>40%</span>
                    <span>50%</span>
                  </div>
                </div>

                {/* Egresos Reales Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-full">
                  <div>
                    {/* Header */}
                    <div className="mb-6">
                      <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider leading-tight">Distribución de Egresos Reales (Desembolsos)</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                          {MONTH_FULL_NAMES[selectedHeaderMonth]} {desde.split('-')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Total info */}
                    <div className="mb-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total desembolsado</span>
                      <h2 className="text-2xl font-black text-slate-800 mt-1">{fmt(egresosTotal)}</h2>
                      <span className="text-[9px] font-extrabold text-slate-400 block mt-0.5">100% del total</span>
                    </div>

                    {/* Donut chart + legends list (Spaced out to match height of devengados card) */}
                    <div className="flex flex-col sm:flex-row items-center gap-8 justify-center min-h-[360px]">
                      {/* Donut SVG */}
                      <div className="relative w-44 h-44 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {egresosList.map((item, idx) => {
                            const percent = (item.value / (egresosTotal || 1)) * 100;
                            const strokeLength = (percent * 282.6) / 100;
                            const strokeOffset = 282.6 - strokeLength;
                            const rotation = (accumulatedPercent * 360) / 100;
                            accumulatedPercent += percent;

                            return (
                              <circle
                                key={idx}
                                cx="50"
                                cy="50"
                                r="45"
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth="10"
                                strokeDasharray="282.6"
                                strokeDashoffset={strokeOffset}
                                transform={`rotate(${rotation} 50 50)`}
                                className="transition-all duration-300 hover:stroke-[12] cursor-pointer"
                              />
                            );
                          })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">Total</span>
                          <span className="text-base font-black text-slate-800 leading-none mt-0.5">
                            ${Math.round(egresosTotal).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Legends (Increased line height/padding for alignment) */}
                      <div className="space-y-5 flex-1 w-full text-xs">
                        {egresosList.map((item, idx) => {
                          const pct = egresosTotal > 0 ? ((item.value / egresosTotal) * 100).toFixed(0) : 0;
                          return (
                            <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-none">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">{item.label}</span>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <span className="font-extrabold text-slate-805">{pct}%</span>
                                <span className="font-black text-slate-500 w-16 text-right">${Math.round(item.value).toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

                {/* Gastos Totales por Semana */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 relative hover:shadow-md transition-all flex flex-col justify-between h-full">
                  <div>
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider leading-tight">Gastos Totales por Semana</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                          {MONTH_FULL_NAMES[selectedHeaderMonth]} {desde.split('-')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Chart */}
                    {loadingWeeklyGastos ? (
                      <div className="h-44 flex flex-col items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent"></div>
                        <span className="text-xs font-semibold text-slate-400">Cargando gastos semanales...</span>
                      </div>
                    ) : (
                      <WeeklySalesChart
                        data={weeklyExpenses}
                        color="#ec4899"
                      />
                    )}
                  </div>

                  {/* Footnote legend */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-500 shrink-0" />
                      <span>Gasto total</span>
                    </div>
                  </div>
                </div>

                {/* Nómina Liquidada por Cargo */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 hover:shadow-md transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider leading-tight">Nómina Liquidada por Empleado</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                          {MONTH_FULL_NAMES[selectedHeaderMonth]} {desde.split('-')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {nominaCargos.map((item, idx) => {
                        const pctWidth = (item.value / (maxNomCargo || 1)) * 100;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs font-extrabold uppercase tracking-wider text-slate-500">
                              <span>{item.label}</span>
                              <span className="text-slate-850 font-black">{fmt(item.value)}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div style={{ width: `${pctWidth}%` }} className="bg-indigo-500 h-full rounded-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* IESS pill bottom banner */}
                  <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-extrabold text-blue-600 uppercase tracking-wide">Aportes acumulados IESS (Seguro Social):</span>
                    <span className="font-black text-blue-900 bg-white border border-blue-200/60 px-4 py-1.5 rounded-xl shadow-sm text-sm">{fmt(iessTotal)}</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* TAB 4: SATISFACCIÓN Y CALIDAD */}
        {activeTab === 'clientes' && (() => {
          // --- CALCULATIONS & DATA ---
          const monthWeights = {
            ENE: 0.75, FEB: 0.82, MAR: 0.90, ABR: 0.70, MAY: 1.05, JUN: 1.15,
            JUL: 1.00, AGO: 1.05, SEP: 1.20, OCT: 1.30, NOV: 1.45, DIC: 1.60
          };

          let totalVal = 0, satVal = 0, neuVal = 0, incVal = 0;
          let activeCurso = 0, activeFuera = 0;


          const activeWeekly = weeklyDataReal || {};
          const activeSurvey = activeWeekly.surveyStats || {};
          totalVal = activeSurvey.totalClientes || 0;
          satVal = activeSurvey.satisfechos || 0;
          neuVal = activeSurvey.neutros || 0;
          incVal = activeSurvey.inconformes || 0;

          activeCurso = activeSurvey.pendientesEntrega || 0;
          activeFuera = activeSurvey.tarde || 0;

          const satPct = totalVal > 0 ? Math.round((satVal / totalVal) * 100) : 0;
          const neuPct = totalVal > 0 ? Math.round((neuVal / totalVal) * 105) : 0;

          const displaySatPct = satPct;
          const displayNeuPct = neuPct;
          const displayIncPct = totalVal > 0 ? (100 - (displaySatPct + displayNeuPct)) : 0;


          const segments = [
            { pct: displaySatPct, color: '#10b981' },
            { pct: displayNeuPct, color: '#cbd5e1' },
            { pct: displayIncPct, color: '#f43f5e' }
          ];

          let accumulatedPercent = 0;

          return (
            <div className="space-y-6 p-4 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* Left Card: Calificaciones de Satisfacción */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-full">
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-black text-slate-805 uppercase tracking-wider leading-tight">Calificaciones de Satisfacción del Cliente</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                          {MONTH_FULL_NAMES[selectedHeaderMonth]} {desde.split('-')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-12 justify-center my-6">

                      {/* Segmented Donut SVG */}
                      <div className="relative w-44 h-44 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {segments.map((item, idx) => {
                            if (item.pct <= 0) return null;
                            const strokeLength = (item.pct * 282.6) / 100;
                            const strokeOffset = 282.6 - strokeLength;
                            const rotation = (accumulatedPercent * 360) / 100;
                            accumulatedPercent += item.pct;

                            return (
                              <circle
                                key={idx}
                                cx="50"
                                cy="50"
                                r="45"
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth="8"
                                strokeDasharray="282.6"
                                strokeDashoffset={strokeOffset}
                                transform={`rotate(${rotation} 50 50)`}
                                className="transition-all duration-300 hover:stroke-[10] cursor-pointer"
                              />
                            );
                          })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">Total</span>
                          <span className="text-2xl font-black text-slate-800 leading-none mt-0.5">
                            {totalVal}
                          </span>
                        </div>
                      </div>

                      {/* Detail Progress Rows */}
                      <div className="flex-1 w-full space-y-6">

                        {/* Satisfechos Row */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
                                <Smile size={16} />
                              </div>
                              <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">Satisfechos (4-5 ⭐)</span>
                            </div>
                            <div className="text-right flex flex-col">
                              <span className="font-black text-slate-800 text-sm leading-tight">{displaySatPct}%</span>
                              <span className="text-[9px] font-bold text-slate-400">({satVal})</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div style={{ width: `${displaySatPct}%` }} className="bg-emerald-500 h-full rounded-full" />
                          </div>
                        </div>

                        {/* Neutros Row */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-full bg-slate-50 border border-slate-100 text-slate-400 shrink-0">
                                <Meh size={16} />
                              </div>
                              <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">Neutros (3 ⭐)</span>
                            </div>
                            <div className="text-right flex flex-col">
                              <span className="font-black text-slate-800 text-sm leading-tight">{displayNeuPct}%</span>
                              <span className="text-[9px] font-bold text-slate-400">({neuVal})</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div style={{ width: `${displayNeuPct}%` }} className="bg-slate-350 h-full rounded-full" />
                          </div>
                        </div>

                        {/* Inconformes Row */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
                                <Frown size={16} />
                              </div>
                              <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[10px]">Inconformes (1-2 ⭐)</span>
                            </div>
                            <div className="text-right flex flex-col">
                              <span className="font-black text-slate-800 text-sm leading-tight">{displayIncPct}%</span>
                              <span className="text-[9px] font-bold text-slate-400">({incVal})</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div style={{ width: `${displayIncPct}%` }} className="bg-rose-500 h-full rounded-full" />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Soft green alert banner */}
                  <div className="mt-6 p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-2xl flex items-center gap-3 text-xs">
                    <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 shadow-sm">
                      <MessageCircle size={16} />
                    </div>
                    <span className="font-semibold text-emerald-850">
                      La mayoría de tus clientes están <span className="font-black text-emerald-600">satisfechos</span>. ¡Sigue así!
                    </span>
                  </div>
                </div>

                {/* Right Card: Eficiencia de Entregas */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-full">
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-black text-slate-850 uppercase tracking-wider leading-tight">Eficiencia de Entregas</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                          {MONTH_FULL_NAMES[selectedHeaderMonth]} {desde.split('-')[0]}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Trabajos en curso */}
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/30 border border-blue-100/30 transition-all hover:bg-blue-50/50">
                        <div className="p-3.5 rounded-full bg-blue-100/60 text-blue-600 shrink-0">
                          <Clock size={24} />
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Trabajos en curso</span>
                          <span className="text-lg font-black text-blue-900 mt-1 block">{activeCurso} proyectos</span>
                        </div>
                      </div>

                      {/* Entregados fuera de tiempo */}
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50/30 border border-amber-100/30 transition-all hover:bg-amber-50/50">
                        <div className="p-3.5 rounded-full bg-amber-100/60 text-amber-600 shrink-0">
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Entregados fuera de tiempo</span>
                          <span className="text-lg font-black text-amber-700 mt-1 block">{activeFuera} proyectos</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider and clients audit bottom info */}
                  <div>
                    <div className="w-full h-px bg-slate-100 my-4" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">Clientes auditados:</span>
                      <span className="font-black text-slate-805 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-sm">
                        {totalVal}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* TAB 5: CUENTAS POR PAGAR */}
        {activeTab === 'pagar' && (() => {
          // --- CALCULATIONS & DATA ---
          let compTotal = 0;
          let egrTotal = 0;
          let pendTotal = 0;
          let pagarTotal = 0;
          let avgCumplimiento = 0;
          let breakdownList = [];

          const listData = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
          breakdownList = listData.map(mes => {
            const isMonthActive = activeMonths.includes(mes);
            if (!isMonthActive) {
              return { label: mes, comprometido: 0, egresado: 0, pendiente: 0, cumplimiento: 0 };
            }
            const item = (data && data.cuentasPorPagar && data.cuentasPorPagar[mes]) || { total: 0, pagado: 0, pendiente: 0 };
            const pct = item.total > 0 ? Math.round((item.pagado / item.total) * 100) : 0;
            return {
              label: mes,
              comprometido: item.total || 0,
              egresado: item.pagado || 0,
              pendiente: item.pendiente || 0,
              cumplimiento: pct
            };
          });

          compTotal = breakdownList.reduce((s, v) => s + v.comprometido, 0);
          egrTotal = breakdownList.reduce((s, v) => s + v.egresado, 0);
          pendTotal = compTotal - egrTotal;
          pagarTotal = breakdownList.reduce((s, v) => s + v.pendiente, 0);
          const activeCount = breakdownList.filter(v => activeMonths.includes(v.label) && v.comprometido > 0).length || 1;
          avgCumplimiento = Math.round(breakdownList.reduce((s, v) => s + v.cumplimiento, 0) / activeCount);


          return (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-8 animate-fadeIn">
              {/* Header and top pink card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-805 uppercase tracking-wider">CUENTAS POR PAGAR MENSUAL (COMPRAS)</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-slate-500 text-xs">Cumplimiento y liquidación de deudas con proveedores de órdenes de compra.</p>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-slate-500 uppercase tracking-wider">
                      {formatPeriodLabel(desde, hasta)}
                    </span>
                  </div>
                </div>
                <div className="bg-rose-50/70 border border-rose-100/60 px-6 py-3.5 rounded-2xl text-right shrink-0">
                  <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-widest">Saldo por Pagar</span>
                  <span className="text-xl font-black text-rose-700 leading-tight mt-0.5 block">{fmt(pagarTotal)}</span>
                </div>
              </div>

              {/* Four KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. Total Comprometido */}
                <div className="p-4 rounded-2xl bg-slate-50/40 border border-slate-100 flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Total Comprometido (OC)</span>
                    <span className="text-base font-black text-blue-600 mt-0.5 block">{fmt(compTotal)}</span>
                  </div>
                </div>

                {/* 2. Egresado (Abonado) */}
                <div className="p-4 rounded-2xl bg-slate-50/40 border border-slate-100 flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
                    <Inbox size={20} />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Egresado (Abonado)</span>
                    <span className="text-base font-black text-emerald-600 mt-0.5 block">{fmt(egrTotal)}</span>
                  </div>
                </div>

                {/* 3. Saldo Pendiente */}
                <div className="p-4 rounded-2xl bg-slate-50/40 border border-slate-100 flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Saldo Pendiente</span>
                    <span className="text-base font-black text-rose-500 mt-0.5 block">{fmt(pendTotal)}</span>
                  </div>
                </div>

                {/* 4. Cumplimiento Promedio */}
                <div className="p-4 rounded-2xl bg-slate-50/40 border border-slate-100 flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Cumplimiento Promedio</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-black text-emerald-600">{avgCumplimiento}%</span>
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div style={{ width: `${avgCumplimiento}%` }} className="bg-emerald-500 h-full rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legends for Chart Series */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                  <span>Total comprometido (OC)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span>Egresado (Abonado)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                  <span>Saldo pendiente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-0.5 bg-slate-400 shrink-0 relative flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white border border-slate-400 absolute" />
                  </div>
                  <span>Cumplimiento de pago (%)</span>
                </div>
              </div>

              {/* Combo Chart */}
              <div className="p-4 bg-white rounded-3xl border border-slate-100">
                <PagarComboChart data={breakdownList} />
              </div>

              {/* Table breakdown */}
              <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 text-left font-black text-[10px] w-48 shrink-0">Categoría / Serie</th>
                      {breakdownList.map(b => (
                        <th key={b.label} className="py-3 px-2 font-black text-[10px]">{b.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-650">
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-left font-extrabold text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                        <span>Total comprometido (OC)</span>
                      </td>
                      {breakdownList.map(b => (
                        <td key={b.label} className="py-3.5 px-2 font-semibold">${Math.round(b.comprometido).toLocaleString()}</td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-left font-extrabold text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Egresado (Abonado)</span>
                      </td>
                      {breakdownList.map(b => (
                        <td key={b.label} className="py-3.5 px-2 font-semibold text-emerald-600">${Math.round(b.egresado).toLocaleString()}</td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-left font-extrabold text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Saldo pendiente</span>
                      </td>
                      {breakdownList.map(b => (
                        <td key={b.label} className="py-3.5 px-2 font-bold text-rose-500">${Math.round(b.pendiente).toLocaleString()}</td>
                      ))}
                    </tr>

                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 text-left font-extrabold text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                        <span>Cumplimiento de pago (%)</span>
                      </td>
                      {breakdownList.map(b => (
                        <td key={b.label} className="py-3.5 px-2 font-bold text-slate-700">{b.cumplimiento}%</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom footer disclaimer */}
              <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <span>ⓘ</span>
                <span>Los montos están expresados en USD.</span>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
