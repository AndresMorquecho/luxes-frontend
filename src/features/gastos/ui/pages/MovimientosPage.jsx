import React, { useEffect, useState, useMemo } from 'react';
import { getMovimientos } from '../../application/movimientosService';
import { getMetodosPago } from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const ORIGEN_LABELS = {
  proforma: 'Proforma',
  gasto: 'Gasto',
  orden_compra: 'Orden de Compra',
};

const ORIGEN_COLORS = {
  proforma: { bg: 'rgba(16,185,129,0.08)', color: '#059669', border: 'rgba(16,185,129,0.2)' },
  gasto: { bg: 'rgba(239,68,68,0.08)', color: '#dc2626', border: 'rgba(239,68,68,0.2)' },
  orden_compra: { bg: 'rgba(245,158,11,0.08)', color: '#d97706', border: 'rgba(245,158,11,0.2)' },
};

export const MovimientosPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [kpi, setKpi] = useState({ totalIngresos: 0, totalEgresos: 0, balance: 0, conteo: 0 });
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 12;

  // Filters
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [fechas, setFechas] = useState({
    desde: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })(),
    hasta: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, mps] = await Promise.all([
        getMovimientos({
          desde: fechas.desde,
          hasta: fechas.hasta,
          tipo: filtroTipo,
          metodoPagoId: filtroMetodo || undefined,
        }),
        getMetodosPago().catch(() => []),
      ]);
      setMovimientos(data.movimientos || []);
      setKpi(data.kpi || { totalIngresos: 0, totalEgresos: 0, balance: 0, conteo: 0 });
      setMetodosPago(mps || []);
    } catch (err) {
      toast.error('Error al cargar movimientos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fechas.desde, fechas.hasta, filtroTipo, filtroMetodo]);

  // Client-side text search
  const filtered = useMemo(() => {
    if (!search.trim()) return movimientos;
    const q = search.toLowerCase();
    return movimientos.filter(m =>
      m.descripcion?.toLowerCase().includes(q) ||
      m.entidad?.toLowerCase().includes(q) ||
      m.referencia?.toLowerCase().includes(q) ||
      m.metodoPago?.toLowerCase().includes(q)
    );
  }, [movimientos, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => { setPage(1); }, [search, filtroTipo, filtroMetodo]);

  const balanceIsPositive = kpi.balance >= 0;

  return (
    <div className="p-6 xl:p-8 w-full animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        .mv-card {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(24px) saturate(170%);
          -webkit-backdrop-filter: blur(24px) saturate(170%);
          border: 1px solid rgba(255,255,255,0.55);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(37,99,235,0.04), 0 1px 2px rgba(0,0,0,0.02);
          overflow: hidden;
        }

        .mv-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .mv-kpi-card {
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(37,99,235,0.04), 0 1px 2px rgba(0,0,0,0.02);
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .mv-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.06);
        }

        .mv-input {
          width: 100%;
          border: 1.5px solid rgba(226,232,240,0.8);
          border-radius: 10px;
          padding: 9px 13px;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          outline: none;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.9);
        }
        .mv-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.08); background: #fff; }
        .mv-input::placeholder { color: #94a3b8; }

        .mv-filter-bar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .mv-filter-pill {
          padding: 7px 16px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 9999px;
          border: 1.5px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.15s ease;
          background: #fff;
          color: #64748b;
          letter-spacing: 0.01em;
        }
        .mv-filter-pill:hover { border-color: #94a3b8; color: #475569; }
        .mv-filter-pill.active { 
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
          color: #fff; 
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(37,99,235,0.25);
        }
        .mv-filter-pill.active-green { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: #fff; 
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(16,185,129,0.25);
        }
        .mv-filter-pill.active-red { 
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
          color: #fff; 
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(239,68,68,0.25);
        }

        .mv-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .mv-table thead th {
          padding: 12px 16px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #94a3b8;
          border-bottom: 1.5px solid #f1f5f9;
          text-align: left;
          white-space: nowrap;
        }
        .mv-table tbody td {
          padding: 14px 16px;
          font-size: 13px;
          color: #475569;
          border-bottom: 1px solid #f8fafc;
          vertical-align: middle;
        }
        .mv-table tbody tr {
          transition: background 0.12s ease;
        }
        .mv-table tbody tr:hover td {
          background: rgba(59,130,246,0.015);
        }

        .mv-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .mv-badge-ingreso {
          background: rgba(16,185,129,0.1);
          color: #059669;
        }
        .mv-badge-egreso {
          background: rgba(239,68,68,0.1);
          color: #dc2626;
        }

        .mv-monto-ingreso {
          color: #059669;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
        .mv-monto-egreso {
          color: #dc2626;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }

        .mv-pagination {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mv-page-btn {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mv-page-btn:hover { border-color: #94a3b8; background: #f8fafc; }
        .mv-page-btn.active-page { background: #2563eb; color: #fff; border-color: transparent; }
        .mv-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .mv-empty {
          padding: 60px 20px;
          text-align: center;
        }

        .mv-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: mv-spin 0.7s linear infinite;
          margin: 60px auto;
        }
        @keyframes mv-spin { to { transform: rotate(360deg); } }

        @keyframes mv-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-mv-in { animation: mv-slide-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        @media (min-width: 768px) {
          .mv-desktop-table { display: block; }
          .mv-mobile-cards { display: none; }
        }
        @media (max-width: 767px) {
          .mv-desktop-table { display: none; }
          .mv-mobile-cards { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
          .mv-mobile-card {
            background: #ffffff;
            border: 1px solid #f1f5f9;
            border-radius: 14px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="mv-card px-6 py-5 flex items-center justify-between gap-4 flex-wrap mb-5 animate-mv-in">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
              <path d="M7 7l5-5 5 5" /><path d="M12 2v14" />
              <path d="M17 17l-5 5-5-5" /><path d="M12 22V12" />
            </svg>
            Movimientos Financieros
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">
            Bitácora consolidada de ingresos y egresos del negocio
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mv-kpi-grid animate-mv-in" style={{ animationDelay: '0.05s' }}>
        <div className="mv-kpi-card">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17l5-5 5 5" /><path d="M12 12V2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ingresos
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', marginTop: '2px' }}>
              {fmt(kpi.totalIngresos)}
            </div>
          </div>
        </div>

        <div className="mv-kpi-card">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 7l-5 5-5-5" /><path d="M12 12v10" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Egresos
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', marginTop: '2px' }}>
              {fmt(kpi.totalEgresos)}
            </div>
          </div>
        </div>

        <div className="mv-kpi-card">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{
            background: balanceIsPositive ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.08)',
            border: balanceIsPositive ? '1px solid rgba(59,130,246,0.15)' : '1px solid rgba(239,68,68,0.15)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={balanceIsPositive ? '#2563eb' : '#dc2626'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Balance Neto
            </div>
            <div style={{
              fontSize: '22px', fontWeight: 800,
              color: balanceIsPositive ? '#2563eb' : '#dc2626',
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', marginTop: '2px'
            }}>
              {balanceIsPositive ? '+' : ''}{fmt(kpi.balance)}
            </div>
          </div>
        </div>

        <div className="mv-kpi-card">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Transacciones
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', marginTop: '2px' }}>
              {kpi.conteo}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mv-card px-5 py-4 mb-5 animate-mv-in" style={{ animationDelay: '0.1s' }}>
        <div className="mv-filter-bar">
          {/* Date range */}
          <div className="flex items-center gap-2" style={{ minWidth: '240px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Fecha</label>
            <DateRangePicker
              value={{ start: fechas.desde, end: fechas.hasta }}
              onChange={val => setFechas({ desde: val.start, hasta: val.end })}
              placeholder="Seleccionar rango"
            />
          </div>

          {/* Separator */}
          <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 4px' }} />

          {/* Tipo filter pills */}
          <button
            className={`mv-filter-pill ${filtroTipo === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroTipo('todos')}
          >
            Todos
          </button>
          <button
            className={`mv-filter-pill ${filtroTipo === 'ingreso' ? 'active-green' : ''}`}
            onClick={() => setFiltroTipo('ingreso')}
          >
            Ingresos
          </button>
          <button
            className={`mv-filter-pill ${filtroTipo === 'egreso' ? 'active-red' : ''}`}
            onClick={() => setFiltroTipo('egreso')}
          >
            Egresos
          </button>

          <div style={{ width: '1px', height: '28px', background: '#e2e8f0', margin: '0 4px' }} />

          {/* Método de pago */}
          <select
            value={filtroMetodo}
            onChange={e => setFiltroMetodo(e.target.value)}
            className="mv-input"
            style={{ width: '180px' }}
          >
            <option value="">Todos los métodos</option>
            {metodosPago.filter(mp => mp.activo).map(mp => (
              <option key={mp.id} value={mp.id}>{mp.nombre}</option>
            ))}
          </select>

          {/* Text search */}
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar descripción, entidad, referencia..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mv-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mv-card animate-mv-in" style={{ animationDelay: '0.15s' }}>
        {loading ? (
          <div className="mv-spinner" />
        ) : filtered.length === 0 ? (
          <div className="mv-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px' }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" />
            </svg>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>No se encontraron movimientos</p>
            <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>Ajusta los filtros o el rango de fechas</p>
          </div>
        ) : (
          <>
            <div className="mv-desktop-table" style={{ overflowX: 'auto' }}>
              <table className="mv-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Origen</th>
                    <th>Descripción</th>
                    <th>Entidad</th>
                    <th>Usuario</th>
                    <th>Método de Pago</th>
                    <th>Referencia</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((m) => {
                    const origenStyle = ORIGEN_COLORS[m.origen] || {};
                    return (
                      <tr key={m.id + m.origen}>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#334155', fontSize: '12.5px' }}>
                          {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <span className={`mv-badge ${m.tipo === 'ingreso' ? 'mv-badge-ingreso' : 'mv-badge-egreso'}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              {m.tipo === 'ingreso'
                                ? <><path d="M7 17l5-5 5 5" /><path d="M12 12V2" /></>
                                : <><path d="M17 7l-5 5-5-5" /><path d="M12 12v10" /></>
                              }
                            </svg>
                            {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: origenStyle.bg,
                            color: origenStyle.color,
                            border: `1px solid ${origenStyle.border}`,
                            letterSpacing: '0.01em',
                          }}>
                            {ORIGEN_LABELS[m.origen] || m.origen}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#1e293b', maxWidth: '240px' }}>
                          {m.descripcion}
                        </td>
                        <td style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
                          {m.entidad || '—'}
                        </td>
                        <td style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
                          {m.usuario || '—'}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: 'rgba(241,245,249,0.8)',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                          }}>
                            {m.metodoPago}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#94a3b8', fontStyle: m.referencia ? 'normal' : 'italic' }}>
                          {m.referencia || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={m.tipo === 'ingreso' ? 'mv-monto-ingreso' : 'mv-monto-egreso'}>
                            {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mv-mobile-cards">
              {paginated.map((m) => {
                const origenStyle = ORIGEN_COLORS[m.origen] || {};
                return (
                  <div key={m.id + m.origen} className="mv-mobile-card">
                    <div className="flex justify-between items-center">
                      <span className="text-[11.5px] text-slate-500 font-semibold">
                        {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`mv-badge ${m.tipo === 'ingreso' ? 'mv-badge-ingreso' : 'mv-badge-egreso'}`}>
                        {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-800" style={{ lineHeight: '1.4' }}>
                      {m.descripcion}
                    </div>
                    <div className="flex justify-between items-end mt-1">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            background: origenStyle.bg,
                            color: origenStyle.color,
                            border: `1px solid ${origenStyle.border}`,
                          }}>
                            {ORIGEN_LABELS[m.origen] || m.origen}
                          </span>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '9.5px',
                            fontWeight: 600,
                            background: 'rgba(241,245,249,0.8)',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                          }}>
                            {m.metodoPago}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                          {m.entidad && <span><strong className="text-slate-400">Entidad:</strong> {m.entidad}</span>}
                          {m.usuario && <span><strong className="text-slate-400">Por:</strong> {m.usuario}</span>}
                          {m.referencia && <span><strong className="text-slate-400">Ref:</strong> {m.referencia}</span>}
                        </div>
                      </div>
                      <span className={m.tipo === 'ingreso' ? 'mv-monto-ingreso text-sm' : 'mv-monto-egreso text-sm'} style={{ fontSize: '14px' }}>
                        {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                  {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                </span>
                <div className="mv-pagination">
                  <button
                    className="mv-page-btn"
                    disabled={safePage <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (safePage <= 4) {
                      pageNum = i + 1;
                    } else if (safePage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = safePage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`mv-page-btn ${safePage === pageNum ? 'active-page' : ''}`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="mv-page-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
