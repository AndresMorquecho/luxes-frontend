import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate } from 'react-router-dom';
import {
  getOrdenes, updateOrden, deleteOrden, getComprasStats,
  registrarAbono, getMetodosPago, recepcionarOrden
} from '../../application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import './ComprasPage.css';

const ESTADOS = ['pendiente_aprobacion', 'aprobada', 'recibida', 'cancelada'];
const ESTADO_BADGES = {
  pendiente_aprobacion: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Pendiente Aprobación' },
  aprobada:             { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6', label: 'Aprobada' },
  recibida:             { bg: 'rgba(16,185,129,0.1)',   color: '#10b981', label: 'Recibida' },
  cancelada:            { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', label: 'Cancelada' },
};
const PAGO_BADGES = {
  sin_pagar: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', label: 'Sin Pagar' },
  parcial:   { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Parcial' },
  pagado:    { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Pagado' },
};

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const mapOrdenToPDFFormat = (orden) => {
  if (!orden) return null;
  return {
    id: orden.numero,
    fechaCreacion: orden.fecha ? new Date(orden.fecha).toISOString().split('T')[0] : '',
    estado: (orden.estado || 'PENDIENTE').toUpperCase(),
    proyectoNombre: orden.concepto || 'Compra de Materiales',
    comentarios: orden.notas || 'Sin observaciones.',
    items: (orden.detalles || []).map(d => ({
      sku: d.materialId ? d.materialId.slice(-8).toUpperCase() : 'ESP-LIBRE',
      nombre: d.descripcion,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      unidad: 'unidad'
    }))
  };
};

export const ComprasPage = () => {
  const navigate = useNavigate();
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (currentUser?.rol || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrador';
  const isImpresion = userRole === 'impresión' || userRole === 'impresion';
  const isTaller = userRole === 'taller';

  const [stats, setStats] = useState({ totalOrdenes: 0, pendientes: 0, totalGastado: 0, totalDeuda: 0 });

  // ── Órdenes state ──
  const [ordenes, setOrdenes] = useState([]);
  const [ordenPage, setOrdenPage] = useState(1);
  const [ordenTotal, setOrdenTotal] = useState(0);
  const [ordenSearch, setOrdenSearch] = useState('');
  const [ordenLoading, setOrdenLoading] = useState(true);
  const perPage = 8;

  // ── PDF state ──
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);

  const openPDFPreview = (orden) => {
    setPreviewOC(mapOrdenToPDFFormat(orden));
    setIsPDFOpen(true);
  };

  // ── Rejection reason state & handlers ──
  const [viewReasonOpen, setViewReasonOpen] = useState(false);
  const [viewReasonText, setViewReasonText] = useState('');
  const [viewReasonNumero, setViewReasonNumero] = useState('');

  const openViewReasonModal = (notas, numero) => {
    setViewReasonText(notas);
    setViewReasonNumero(numero);
    setViewReasonOpen(true);
  };

  // ── Abono modal state ──
  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [abonoOrden, setAbonoOrden] = useState(null);
  const [abonoForm, setAbonoForm] = useState({ metodoPagoId: '', monto: '', referencia: '' });
  const [abonoSaving, setAbonoSaving] = useState(false);
  const [metodos, setMetodos] = useState([]);

  // ── Recepción modal state ──
  const [recepcionModalOpen, setRecepcionModalOpen] = useState(false);
  const [recepcionOrden, setRecepcionOrden] = useState(null);
  const [recepcionDetalles, setRecepcionDetalles] = useState([]);
  const [recepcionSaving, setRecepcionSaving] = useState(false);

  const searchTimer = useRef(null);

  // ── Data loading ──
  const loadStats = useCallback(async () => {
    try { const s = await getComprasStats(); setStats(s); } catch {}
  }, []);

  const loadOrdenes = useCallback(async () => {
    setOrdenLoading(true);
    try {
      const data = await getOrdenes({
        page: ordenPage,
        limit: perPage,
        search: ordenSearch || undefined,
        creadorRol: (isImpresion || isTaller) ? currentUser?.rol : undefined
      });
      setOrdenes(data.items || []);
      setOrdenTotal(data.total || 0);
    } catch { setOrdenes([]); setOrdenTotal(0); }
    finally { setOrdenLoading(false); }
  }, [ordenPage, ordenSearch, isImpresion, isTaller, currentUser]);

  const loadMetodos = useCallback(async () => {
    try { const m = await getMetodosPago(); setMetodos(m); } catch {}
  }, []);

  useEffect(() => {
    loadStats();
    loadOrdenes();
    loadMetodos();
  }, [loadStats, loadOrdenes, loadMetodos]);

  // ── Search debounce ──
  const handleOrdenSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOrdenSearch(val); setOrdenPage(1); }, 350);
  };

  const handleOrdenDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta orden de compra y todos sus datos asociados?')) return;
    try {
      await deleteOrden(id);
      toast.success('Orden de compra eliminada con éxito');
      loadOrdenes(); loadStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOrdenEstadoChange = async (id, estado) => {
    try {
      await updateOrden(id, { estado });
      toast.success('Estado de la orden actualizado con éxito');
      loadOrdenes(); loadStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Abono handlers ──
  const openAbonoModal = (orden) => {
    setAbonoOrden(orden);
    setAbonoForm({ metodoPagoId: metodos.filter(m => m.activo)[0]?.id || '', monto: '', referencia: '' });
    setAbonoModalOpen(true);
  };

  const handleAbonoSave = async (e) => {
    e.preventDefault();
    setAbonoSaving(true);
    try {
      await registrarAbono(abonoOrden.id, {
        metodoPagoId: abonoForm.metodoPagoId,
        monto: parseFloat(abonoForm.monto) || 0,
        referencia: abonoForm.referencia
      });
      toast.success('Abono registrado con éxito');
      setAbonoModalOpen(false);
      loadOrdenes(); loadStats();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAbonoSaving(false);
    }
  };

  // ── Recepción handlers ──
  const openRecepcionModal = (orden) => {
    setRecepcionOrden(orden);
    const details = (orden.detalles || []).map(d => ({
      id: d.id,
      materialId: d.materialId,
      descripcion: d.descripcion,
      cantidadOriginal: d.cantidad,
      cantidadRecibida: String(d.cantidad),
      descargableInventario: !!d.materialId,
    }));
    setRecepcionDetalles(details);
    setRecepcionModalOpen(true);
  };

  const handleRecepcionSave = async (e) => {
    e.preventDefault();
    setRecepcionSaving(true);
    try {
      const items = recepcionDetalles.filter(d => (parseFloat(d.cantidadRecibida) || 0) > 0);
      const payload = {
        fechaRecepcion: new Date().toISOString().split('T')[0],
        detalles: items.map(d => ({
          detalleId: d.id,
          materialId: d.materialId,
          cantidad: parseFloat(d.cantidadRecibida) || 0,
          descargableInventario: d.descargableInventario === true && !!d.materialId,
        })),
      };

      await recepcionarOrden(recepcionOrden.id, payload);
      toast.success('Productos registrados con éxito');
      setRecepcionModalOpen(false);
      loadOrdenes(); loadStats();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRecepcionSaving(false);
    }
  };

  const ordenTotalPages = Math.max(1, Math.ceil(ordenTotal / perPage));

  return (
    <div className="co-page animate-slide-up">

      {/* Header */}
      <div className="co-card co-header">
        <div>
          <h1 className="co-title">Órdenes de Compra</h1>
          <p className="co-subtitle">Solicitud, control y emisión de compras de materiales y activos</p>
        </div>
        <button onClick={() => navigate('/compras/nueva')} className="co-btn-primary" id="btn-nueva-orden">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nueva Orden
        </button>
      </div>

      {/* KPI Cards */}
      <div className="co-kpi-grid">
        {[
          { label: 'Total Órdenes', value: stats.totalOrdenes, color: '#3b82f6', icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12a1.125 1.125 0 0 1 1.263-1.123h12.974c.576 0 1.059.435 1.119 1.007z' },
          { label: 'Pendientes Aprobación', value: stats.pendientes, color: '#f59e0b', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
          ...(isAdmin ? [
            { label: 'Total Gastado', value: fmt(stats.totalGastado), color: '#10b981', icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
            { label: 'Deuda Pendiente', value: fmt(stats.totalDeuda), color: '#ef4444', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z' }
          ] : [])
        ].map((kpi, i) => (
          <div key={i} className="co-card co-kpi-card">
            <div className="co-kpi-icon" style={{ background: `${kpi.color}15` }}>
              <svg className="w-5 h-5" style={{ color: kpi.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
              </svg>
            </div>
            <div>
              <div className="co-kpi-label">{kpi.label}</div>
              <div className="co-kpi-value">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="co-card co-table-card">
        <div className="co-table-header">
          <svg className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input className="co-search-inline" placeholder="Buscar por número, proveedor o concepto…" onChange={handleOrdenSearchChange} id="search-ordenes" />
        </div>

        {ordenLoading ? (
          <div className="co-loader-box"><div className="co-spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="co-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Proveedor</th>
                  <th>Emisor</th>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Observación / Notas</th>
                  {isAdmin && <th className="text-right">Total</th>}
                  <th className="text-center">Estado</th>
                  {isAdmin && <th className="text-center">Pago</th>}
                  <th className="text-center w-44">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map(o => (
                  <tr key={o.id} className="co-tr">
                    <td className="font-mono text-xs font-semibold text-slate-700">{o.numero}</td>
                    <td className="font-semibold text-slate-800">{o.proveedor?.nombre || '—'}</td>
                    <td className="text-slate-600 text-xs font-medium">{o.usuario?.nombre || '—'}</td>
                    <td className="text-slate-500 text-xs">{fmtDate(o.fecha)}</td>
                    <td className="text-slate-700 text-xs font-semibold max-w-[200px] truncate" title={o.concepto}>{o.concepto || '—'}</td>
                    <td className="text-slate-400 text-xs max-w-[150px] truncate" title={o.notas}>{o.notas || '—'}</td>
                    {isAdmin && <td className="text-right font-semibold text-slate-800">{fmt(o.total)}</td>}
                    <td className="text-center">
                      <span className="co-badge" style={{ background: ESTADO_BADGES[o.estado]?.bg, color: ESTADO_BADGES[o.estado]?.color }}>
                        {ESTADO_BADGES[o.estado]?.label || o.estado}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="text-center">
                        <span className="co-badge" style={{ background: PAGO_BADGES[o.estadoPago]?.bg, color: PAGO_BADGES[o.estadoPago]?.color }}>
                          {PAGO_BADGES[o.estadoPago]?.label || o.estadoPago}
                        </span>
                      </td>
                    )}
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openPDFPreview(o)} className="co-action-btn co-action-blue" title="Ver Previsualización PDF">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </button>
                        {o.estado === 'cancelada' && o.notas && (
                          <button
                            onClick={() => openViewReasonModal(o.notas, o.numero)}
                            className="co-action-btn co-action-red"
                            style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}
                            title="Ver Motivo de Rechazo"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button onClick={() => navigate(`/compras/editar/${o.id}`)} className="co-action-btn co-action-blue" title="Editar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button onClick={() => handleOrdenDelete(o.id)} className="co-action-btn co-action-red" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr><td colSpan={isAdmin ? 10 : 8} className="text-center py-16 text-slate-400 text-sm font-medium">No se encontraron órdenes de compra</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {ordenTotalPages > 1 && (
          <div className="co-pagination">
            <span className="text-xs font-medium text-slate-400">{ordenTotal} orden{ordenTotal !== 1 ? 'es' : ''}</span>
            <div className="flex items-center gap-1">
              <button disabled={ordenPage <= 1} onClick={() => setOrdenPage(p => p - 1)} className="co-page-btn">‹</button>
              <span className="text-xs font-semibold text-slate-500 px-2">{ordenPage} / {ordenTotalPages}</span>
              <button disabled={ordenPage >= ordenTotalPages} onClick={() => setOrdenPage(p => p + 1)} className="co-page-btn">›</button>
            </div>
          </div>
        )}
      </div>

      {/* Registrar Abono Modal */}
      {abonoModalOpen && (
        <ModalPortal>
        <div className="co-portal-root">
          <div className="co-overlay" onClick={() => setAbonoModalOpen(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal animate-co-modal-in">
              <div className="co-modal-header">
                <h2 className="text-lg font-bold text-slate-800">Registrar Abono</h2>
                <button type="button" onClick={() => setAbonoModalOpen(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="co-modal-body">
                {abonoOrden && (
                  <div className="co-abono-info">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Orden:</span>
                      <span className="font-bold text-slate-800">{abonoOrden.numero}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total:</span>
                      <span className="font-semibold">{fmt(abonoOrden.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Saldo pendiente:</span>
                      <span className="font-bold text-red-500">{fmt(abonoOrden.cuentaPorPagar?.saldo || abonoOrden.total)}</span>
                    </div>
                  </div>
                )}
                <form onSubmit={handleAbonoSave} className="space-y-4 mt-4">
                  <div>
                    <label className="co-label">Método de Pago</label>
                    <select className="co-input" value={abonoForm.metodoPagoId}
                      onChange={e => setAbonoForm(p => ({ ...p, metodoPagoId: e.target.value }))} required>
                      <option value="">Seleccionar método…</option>
                      {metodos.filter(m => m.activo).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="co-label">Monto ($)</label>
                    <input type="number" className="co-input" step="0.01" min="0.01"
                      max={abonoOrden?.cuentaPorPagar?.saldo || 999999}
                      value={abonoForm.monto}
                      onChange={e => setAbonoForm(p => ({ ...p, monto: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="co-label">Referencia (Nro. cheque, transferencia, etc.)</label>
                    <input className="co-input" value={abonoForm.referencia} placeholder="Opcional"
                      onChange={e => setAbonoForm(p => ({ ...p, referencia: e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setAbonoModalOpen(false)} className="co-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={abonoSaving} className="co-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                      {abonoSaving && <div className="co-spinner-sm" />}
                      Registrar Abono
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Recepción de Insumos Modal */}
      {recepcionModalOpen && (
        <ModalPortal>
        <div className="co-portal-root">
          <div className="co-overlay" onClick={() => setRecepcionModalOpen(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal animate-co-modal-in" style={{ maxWidth: '720px', width: '95%' }}>
              <div className="co-modal-header">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Recibir productos</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Orden: <span className="font-semibold text-slate-700">{recepcionOrden?.numero}</span> &middot; Proveedor: <span className="font-semibold text-slate-700">{recepcionOrden?.proveedor?.nombre}</span>
                  </p>
                </div>
                <button type="button" onClick={() => setRecepcionModalOpen(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="co-modal-body">
                <form onSubmit={handleRecepcionSave} className="space-y-4">
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="co-table text-left" style={{ margin: 0 }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr>
                          <th className="py-2 px-3 text-xs font-bold text-slate-500">Descripción / Artículo</th>
                          <th className="py-2 px-3 text-xs font-bold text-slate-500 text-center w-24">Tipo</th>
                          <th className="py-2 px-3 text-xs font-bold text-slate-500 text-right w-28">Cant. Pedida</th>
                          <th className="py-2 px-3 text-xs font-bold text-slate-500 text-right w-36">Cant. Recibida</th>
                          <th className="py-2 px-3 text-xs font-bold text-slate-500 text-center w-28">Inventario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recepcionDetalles.map((det, index) => (
                          <tr key={index} className="border-t border-slate-100">
                            <td className="py-2.5 px-3 text-xs font-semibold text-slate-700">{det.descripcion}</td>
                            <td className="py-2.5 px-3 text-center">
                              {det.materialId ? (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full text-blue-600 bg-blue-50">Insumo</span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full text-slate-500 bg-slate-50">Servicio/Otro</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs font-medium text-slate-500">{det.cantidadOriginal}</td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                className="co-input text-right"
                                style={{ height: '32px', padding: '2px 8px', fontSize: '12px', width: '100%' }}
                                min="0"
                                max={det.cantidadOriginal * 2}
                                step="any"
                                value={det.cantidadRecibida}
                                onChange={(e) => {
                                  const valStr = e.target.value;
                                  setRecepcionDetalles(prev => prev.map((item, idx) =>
                                    idx === index ? { ...item, cantidadRecibida: valStr } : item
                                  ));
                                }}
                                onWheel={e => e.target.blur()}
                                required
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={det.descargableInventario && !!det.materialId}
                                disabled={!det.materialId}
                                title={det.materialId ? 'Suma al inventario' : 'Sin material vinculado'}
                                onChange={(e) => {
                                  setRecepcionDetalles(prev => prev.map((item, idx) =>
                                    idx === index ? { ...item, descargableInventario: e.target.checked } : item
                                  ));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-amber-50/60 border border-amber-200/50 rounded-lg flex gap-3 text-amber-800 text-xs">
                    <svg className="w-5 h-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <span className="font-bold">Nota:</span> Solo los items con <span className="font-bold text-slate-800">Inventario</span> marcado y vinculados a un material ingresarán al stock (lona, vinil por metro). Desmarca para tinta u otros que no se controlan así.
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setRecepcionModalOpen(false)} className="co-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={recepcionSaving} className="co-btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}>
                      {recepcionSaving && <div className="co-spinner-sm" />}
                      Confirmar productos recibidos
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Visor Reutilizable de PDF */}
      <PDFPreviewModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        oc={previewOC}
        title="Orden de Compra"
      />

      {/* Modal Premium Ver Motivo de Rechazo */}
      {viewReasonOpen && (
        <ModalPortal>
        <div className="co-portal-root">
          <div className="co-overlay" onClick={() => setViewReasonOpen(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal animate-co-modal-in" style={{ maxWidth: '480px' }}>
              <div className="co-modal-header">
                <h2 className="text-lg font-bold text-slate-800">Motivo del Rechazo</h2>
                <button type="button" onClick={() => setViewReasonOpen(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="co-modal-body">
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Motivo ingresado para el rechazo de la orden de compra <strong className="font-mono">{viewReasonNumero}</strong>:
                  </div>
                  <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl text-slate-700 text-sm font-semibold whitespace-pre-wrap leading-relaxed">
                    {viewReasonText || 'No se ingresó un motivo específico.'}
                  </div>
                  <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setViewReasonOpen(false)} className="co-btn-primary" style={{ background: '#475569' }}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};
