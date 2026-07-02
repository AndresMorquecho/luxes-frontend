import React, { useEffect, useState } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate } from 'react-router-dom';
import { getVentas, registrarCobro } from '../../application/ventasService';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';

const ESTADO_BADGES = {
  Aprobada: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Aprobada' },
  Pagada: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Pagada' },
};

const fmt = (n) => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const VentasPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 8;

  // Métodos de Pago
  const [metodosPago, setMetodosPago] = useState([]);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [submittingAbono, setSubmittingAbono] = useState(false);
  const [abonoForm, setAbonoForm] = useState({
    proformaId: '',
    monto: '',
    metodoPagoId: '',
    referencia: '',
    pending: 0,
    total: 0
  });

  const load = async () => {
    setLoading(true);
    try {
      // Pedimos las proformas aprobadas y pagadas. Usamos un límite alto (100) para calcular KPIs y paginar
      const res = await getVentas({ limit: 100 });
      const onlyApprovedOrPaid = (res.data || []).filter(
        v => v.estado === 'Aprobada' || v.estado === 'Pagada' || v.estado === 'Pagado'
      );
      setItems(onlyApprovedOrPaid);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getMetodosPago()
      .then(data => {
        setMetodosPago(data || []);
        if (data && data.length > 0) {
          setAbonoForm(prev => ({ ...prev, metodoPagoId: data[0].id }));
        }
      })
      .catch(err => console.error('Error cargando métodos de pago:', err));
  }, []);

  const handleOpenAbono = (proforma, pendiente, total) => {
    setAbonoForm({
      proformaId: proforma.id,
      monto: pendiente.toFixed(2),
      metodoPagoId: metodosPago.length > 0 ? metodosPago[0].id : '',
      referencia: '',
      pending: pendiente,
      total: total
    });
    setShowAbonoModal(true);
  };

  const handleSaveAbono = async (e) => {
    e.preventDefault();
    const numericMonto = parseFloat(abonoForm.monto);

    if (isNaN(numericMonto) || numericMonto <= 0) {
      toast.error('Por favor, ingresa un monto válido mayor a $0');
      return;
    }

    if (numericMonto > (abonoForm.pending + 0.01)) {
      toast.error(`El abono no puede superar el valor restante de ${fmt(abonoForm.pending)}`);
      return;
    }

    setSubmittingAbono(true);
    try {
      await registrarCobro(abonoForm.proformaId, {
        monto: numericMonto,
        metodoPagoId: abonoForm.metodoPagoId,
        referencia: abonoForm.referencia,
      });
      toast.success('Cobro registrado correctamente');
      setShowAbonoModal(false);
      load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al registrar el cobro');
    } finally {
      setSubmittingAbono(false);
    }
  };

  const badgeStyle = (estado) => {
    switch (estado) {
      case 'Pagada': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  // Filtrado local
  const q = search.toLowerCase();
  const filteredAll = items.filter(v => {
    const subtotal = v.items.reduce((s, item) => s + (item.cantidad || 0) * (item.precioUnitario || 0), 0);
    const total = subtotal * (1 + (v.iva || 0));
    const cobrado = (v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
    const pendiente = Math.max(0, total - cobrado);
    
    return !q || 
      v.id.toLowerCase().includes(q) ||
      v.cliente.toLowerCase().includes(q) || 
      v.estado.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => { setPage(1); }, [search]);

  // Totales basados en la lista completa
  const totalFacturado = items.reduce((sum, v) => {
    const subtotal = v.items.reduce((s, item) => s + (item.cantidad || 0) * (item.precioUnitario || 0), 0);
    return sum + subtotal * (1 + (v.iva || 0));
  }, 0);

  const totalCobradoAcumulado = items.reduce((sum, v) => {
    const cobrado = (v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
    return sum + cobrado;
  }, 0);

  const totalPendienteAcumulado = items.reduce((sum, v) => {
    const subtotal = v.items.reduce((s, item) => s + (item.cantidad || 0) * (item.precioUnitario || 0), 0);
    const total = subtotal * (1 + (v.iva || 0));
    const cobrado = (v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
    return sum + Math.max(0, total - cobrado);
  }, 0);

  const totales = {
    total: items.length,
    pendientes: items.filter(v => {
      const subtotal = v.items.reduce((s, item) => s + (item.cantidad || 0) * (item.precioUnitario || 0), 0);
      const total = subtotal * (1 + (v.iva || 0));
      const cobrado = (v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
      return (total - cobrado) > 0.01;
    }).length,
    pagados: items.filter(v => {
      const subtotal = v.items.reduce((s, item) => s + (item.cantidad || 0) * (item.precioUnitario || 0), 0);
      const total = subtotal * (1 + (v.iva || 0));
      const cobrado = (v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
      return (total - cobrado) <= 0.01;
    }).length,
  };

  return (
    <div className="p-6 xl:p-8 w-full animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .ve-card {
          background: rgba(255,255,255,0.75);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(37,99,235,0.06), 0 1px 2px rgba(0,0,0,0.03);
          overflow: hidden;
        }

        .ve-btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(37,99,235,0.3);
          letter-spacing: 0.01em;
        }
        .ve-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.42); }
        .ve-btn-primary:active { transform: translateY(0); }
        .ve-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ve-btn-ghost {
          background: transparent;
          border: none;
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .ve-btn-ghost:hover { background: rgba(241,245,249,0.8); color: #475569; }

        .ve-input {
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
          backdrop-filter: blur(4px);
        }
        .ve-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); background: #fff; }
        .ve-input::placeholder { color: #94a3b8; }

        .ve-tr { transition: background 0.15s ease; }
        .ve-tr:hover td { background: rgba(59,130,246,0.03); }

        @keyframes ve-modal-in {
          from { transform: scale(0.95) translateY(8px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-ve-modal-in { animation: ve-modal-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }

        .ve-desktop-only { display: block; }
        .ve-mobile-only { display: none; }
        @media (max-width: 768px) {
          .ve-desktop-only { display: none !important; }
          .ve-mobile-only { display: block !important; }
        }
      `}</style>

      {/* Header */}
      <div className="ve-card px-6 py-5 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Ventas e Ingresos</h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">Control de cobros y saldos pendientes de proformas aprobadas</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="ve-card px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <svg className="w-5 h-5" style={{ color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ventas (Proformas)</div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">{totales.total}</div>
          </div>
        </div>
        <div className="ve-card px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <svg className="w-5 h-5" style={{ color: '#6366f1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5zm16.5 4.5h-16.5" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Facturado</div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totalFacturado)}</div>
          </div>
        </div>
        <div className="ve-card px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <svg className="w-5 h-5" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cobrado Acumulado</div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totalCobradoAcumulado)}</div>
          </div>
        </div>
        <div className="ve-card px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <svg className="w-5 h-5" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pendiente Acumulado</div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">{fmt(totalPendienteAcumulado)}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="ve-card">
        <div className="px-5 py-4 border-b border-slate-100/60 flex items-center gap-3">
          <svg className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input className="ve-input max-w-xs !border-0 !bg-transparent !p-0 !shadow-none !text-sm !font-medium placeholder:!text-slate-400 focus:!ring-0"
            placeholder="Buscar por proforma, cliente o estado…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <>
            <div className="ve-desktop-only">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-100/60 bg-slate-50/50">
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proforma</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cobrado</th>
                      <th className="text-right px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendiente</th>
                      <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/40">
                    {paginated.map((v) => {
                      const subtotal = v.items.reduce((s, item) => s + (item.cantidad || 0) * (item.precioUnitario || 0), 0);
                      const total = subtotal * (1 + (v.iva || 0));
                      const cobrado = (v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
                      const pendiente = Math.max(0, total - cobrado);

                      return (
                        <tr key={v.id} className="ve-tr">
                          <td className="px-5 py-4">
                            <span className="font-mono text-[12px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{v.id}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800">{v.cliente}</div>
                            {v.email && <div className="text-[11px] text-slate-400 mt-0.5">{v.email}</div>}
                          </td>
                          <td className="px-5 py-4 text-slate-500 text-[12px]">{v.fecha}</td>
                          <td className="px-5 py-4 text-right font-bold text-slate-800 font-mono">{fmt(total)}</td>
                          <td className="px-5 py-4 text-right font-semibold text-emerald-600 font-mono">{fmt(cobrado)}</td>
                          <td className="px-5 py-4 text-right font-semibold text-amber-600 font-mono">{fmt(pendiente)}</td>
                          <td className="px-5 py-4 text-center">
                            {pendiente > 0.01 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200" title={`Falta cobrar ${fmt(pendiente)}`}>
                                Aprobada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                                Pagado
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => navigate(`/proformas/detalle/${v.id}`)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" 
                                title="Ver Detalle">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                              </button>
                              {pendiente > 0.01 && (
                                <button onClick={() => handleOpenAbono(v, pendiente, total)}
                                  className="p-2 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" 
                                  title="Registrar Cobro/Abono">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards for Ventas */}
            <div className="ve-mobile-only p-4">
              <div className="flex flex-col gap-4">
                {paginated.map((v) => {
                  const subtotal = v.items.reduce((s, item) => s + (item.cantidad || 0) * (item.precioUnitario || 0), 0);
                  const total = subtotal * (1 + (v.iva || 0));
                  const cobrado = (v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
                  const pendiente = Math.max(0, total - cobrado);

                  return (
                    <div key={v.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{v.id}</span>
                        <span className="text-slate-400 text-xs">{v.fecha}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-slate-800 text-sm">{v.cliente}</div>
                        {v.email && <div className="text-[11px] text-slate-400">{v.email}</div>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 bg-slate-50/50 rounded-xl p-2.5 mt-1 text-center">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">Total</span>
                          <span className="text-xs font-bold text-slate-800 font-mono mt-0.5">{fmt(total)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">Cobrado</span>
                          <span className="text-xs font-bold text-emerald-600 font-mono mt-0.5">{fmt(cobrado)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">Saldo</span>
                          <span className="text-xs font-bold text-amber-600 font-mono mt-0.5">{fmt(pendiente)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                        <div>
                          {pendiente > 0.01 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              Aprobada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Pagado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/proformas/detalle/${v.id}`)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                            title="Ver Detalle">
                            Ver
                          </button>
                          {pendiente > 0.01 && (
                            <button onClick={() => handleOpenAbono(v, pendiente, total)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
                              title="Registrar Cobro/Abono">
                              Cobrar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100/60 bg-slate-50/30">
            <span className="text-[12px] font-medium text-slate-400">{filteredAll.length} registro{filteredAll.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1">
              <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white hover:border-slate-300 transition-all text-xs font-bold">‹</button>
              <span className="text-[12px] font-semibold text-slate-500 px-2">{safePage} / {totalPages}</span>
              <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white hover:border-slate-300 transition-all text-xs font-bold">›</button>
            </div>
          </div>
        )}
      </div>

      {/* Abono Modal */}
      {showAbonoModal && (
        <ModalPortal>
        <>
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(14px) saturate(130%)', WebkitBackdropFilter: 'blur(14px) saturate(130%)' }}
            onClick={() => setShowAbonoModal(false)} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl animate-ve-modal-in overflow-hidden border border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">Registrar Cobro / Abono</h2>
                <button type="button" onClick={() => setShowAbonoModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
              </div>
              <form onSubmit={handleSaveAbono} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Información Financiera y Monto */}
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Registra un cobro parcial o total para la proforma <strong className="text-slate-700">{abonoForm.proformaId}</strong>.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center text-xs">
                        <span className="text-slate-500 font-medium text-[10px] uppercase">Valor Total</span>
                        <span className="font-bold text-blue-700 font-mono text-sm mt-1">{fmt(abonoForm.total)}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center text-xs">
                        <span className="text-slate-500 font-medium text-[10px] uppercase">Saldo Pendiente</span>
                        <span className="font-bold text-amber-700 font-mono text-sm mt-1">{fmt(abonoForm.pending)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Monto a Cobrar *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={abonoForm.monto}
                          onChange={e => setAbonoForm(prev => ({ ...prev, monto: e.target.value }))}
                          className="ve-input !pl-7 font-mono"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setAbonoForm(prev => ({ ...prev, monto: abonoForm.pending.toFixed(2) }))}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline"
                        >
                          Cobrar Saldo Total (100%)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Detalles del Pago */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Caja / Método de Pago *</label>
                        <select
                          required
                          value={abonoForm.metodoPagoId}
                          onChange={e => setAbonoForm(prev => ({ ...prev, metodoPagoId: e.target.value }))}
                          className="ve-input"
                        >
                          <option value="">Seleccione una caja...</option>
                          {metodosPago.map(m => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Referencia / N° Comprobante</label>
                        <input
                          type="text"
                          value={abonoForm.referencia}
                          onChange={e => setAbonoForm(prev => ({ ...prev, referencia: e.target.value }))}
                          className="ve-input"
                          placeholder="Ej. Transferencia, Depósito, N° control"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAbonoModal(false)} className="ve-btn-ghost">Cancelar</button>
                  <button type="submit" disabled={submittingAbono} className="ve-btn-primary flex items-center gap-1.5">
                    {submittingAbono && <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />}
                    {submittingAbono ? 'Registrando...' : 'Confirmar Cobro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
        </ModalPortal>
      )}

    </div>
  );
};
