import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { getOrdenById, updateOrden, getProveedores, getMetodosPago } from '../../application/comprasService';
import { getOrdenProyectoLabel, normalizeOrdenDetalles } from '../../helpers/ordenCompraHelpers';
import { toast } from '../../../../shared/ui/components/Toast';
import { ComprasPageHeader, ComprasHeaderGhostButton } from '../components/ComprasPageHeader';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal';
import { X, AlertCircle, Info, CheckCircle, Calendar, Hash, CreditCard } from 'lucide-react';
import './ComprasPage.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const mergeOrdenConDetalles = (ordenApi, ordenFallback) => {
  if (!ordenApi) return null;
  const detallesApi = normalizeOrdenDetalles(ordenApi);
  if (detallesApi.length > 0) return ordenApi;
  if (!ordenFallback || ordenFallback.id !== ordenApi.id) return ordenApi;
  const detallesFallback = normalizeOrdenDetalles(ordenFallback);
  if (detallesFallback.length === 0) return ordenApi;
  return { ...ordenApi, detalles: ordenFallback.detalles };
};

export const DetalleAprobacionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [ordenFromList] = useState(() => location.state?.ordenFromList ?? null);
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  const [orden, setOrden] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [proveedorId, setProveedorId] = useState('');
  const [providerSearch, setProviderSearch] = useState('');
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [ivaPct, setIvaPct] = useState(0);
  const [preciosEditados, setPreciosEditados] = useState({});

  // Payment integration states
  const [abonoMonto, setAbonoMonto] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [abonoReferencia, setAbonoReferencia] = useState('');
  const [esChequePosfechado, setEsChequePosfechado] = useState(false);
  const [numeroCheque, setNumeroCheque] = useState('');
  const [fechaCobroCheque, setFechaCobroCheque] = useState('');

  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordenData, provList, mpsList] = await Promise.all([
        getOrdenById(id),
        getProveedores(),
        getMetodosPago().catch(() => []),
      ]);

      const ordenMerged = mergeOrdenConDetalles(
        ordenData,
        ordenFromList?.id === id ? ordenFromList : null,
      );

      setOrden(ordenMerged);
      setProveedores(provList);
      setMetodosPago(mpsList);
      setProveedorId(ordenMerged.proveedorId || '');

      if (ordenMerged.proveedorId) {
        const provObj = provList.find(p => p.id === ordenMerged.proveedorId);
        if (provObj) setProviderSearch(provObj.nombre);
      } else {
        setProviderSearch('Sin proveedor específico');
      }

      // Las órdenes pendientes tienen impuesto=0. El % lo elige el aprobador.
      setIvaPct(0);

      const lineas = normalizeOrdenDetalles(ordenMerged);
      const preciosIniciales = {};
      lineas.forEach((linea) => {
        preciosIniciales[linea.id] = linea.precioUnitario;
      });
      setPreciosEditados(preciosIniciales);
    } catch (err) {
      toast.error('Error al cargar la orden: ' + err.message);
      navigate('/compras?vista=aprobaciones');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, ordenFromList]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectProveedor = (p) => {
    if (p === null) {
      setProveedorId('');
      setProviderSearch('Sin proveedor específico');
      // If payment is partial, reset to 0/empty to prevent saving with unassigned provider
      const numericAbono = parseFloat(abonoMonto) || 0;
      if (numericAbono > 0 && numericAbono < total - 0.01) {
        setAbonoMonto('');
      }
    } else {
      setProveedorId(p.id);
      setProviderSearch(p.nombre);
    }
    setProviderDropdownOpen(false);
  };

  const lineas = useMemo(() => {
    return normalizeOrdenDetalles(orden).map((linea) => ({
      ...linea,
      precioUnitario: preciosEditados[linea.id] ?? linea.precioUnitario,
    }));
  }, [orden, preciosEditados]);

  const updateDetallePrecio = (lineId, value) => {
    setPreciosEditados((prev) => ({ ...prev, [lineId]: value }));
  };

  const subtotal = lineas.reduce((sum, d) => {
    return sum + (d.cantidad * (parseFloat(d.precioUnitario) || 0));
  }, 0);
  const impuestoVal = subtotal * ivaPct;
  const total = subtotal + impuestoVal;

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const numericAbono = parseFloat(abonoMonto) || 0;
  const isSinProveedor = !proveedorId;

  const isSubmitDisabled = () => {
    if (numericAbono < 0) return true;
    if (numericAbono > total + 0.01) return true;
    if (numericAbono > 0 && !metodoPagoId) return true;
    if (esChequePosfechado && numericAbono > 0) {
      if (!numeroCheque.trim()) return true;
      if (!fechaCobroCheque) return true;
    }
    // Unassigned provider cannot leave debt (no 0 payment, no partial payment)
    if (isSinProveedor && numericAbono < total - 0.01) return true;
    return false;
  };

  const triggerAprobarConfirm = () => {
    if (lineas.length === 0) {
      toast.error('La orden no tiene items para aprobar');
      return;
    }

    const sinPrecio = lineas.some(d => !d.precioUnitario || parseFloat(d.precioUnitario) <= 0);
    if (sinPrecio) {
      toast.error('Todos los items deben tener un precio unitario mayor a 0');
      return;
    }

    setShowApproveConfirm(true);
  };

  const handleGuardarYAprobar = async () => {
    setShowApproveConfirm(false);
    setSaving(true);
    try {
      const payload = {
        proveedorId: proveedorId || null,
        impuesto: impuestoVal,
        estado: 'aprobada',
        aprobadoPorId: currentUser?.id,
      };

      if (lineas.length > 0) {
        payload.detalles = lineas.map(d => ({
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precioUnitario: parseFloat(d.precioUnitario) || 0,
          materialId: d.materialId,
        }));
      }

      const nAbono = parseFloat(abonoMonto) || 0;
      if (nAbono > 0) {
        payload.abonoMonto = nAbono;
        payload.metodoPagoId = metodoPagoId;
        payload.abonoReferencia = abonoReferencia.trim();
        if (esChequePosfechado) {
          payload.esChequePosfechado = true;
          payload.numeroCheque = numeroCheque.trim();
          payload.fechaCobroCheque = fechaCobroCheque;
        }
      }

      await updateOrden(id, payload);
      toast.success(esChequePosfechado ? 'Orden aprobada con cheque posfechado registrado con éxito' : 'Orden guardada y aprobada con éxito');
      navigate('/compras?vista=aprobaciones');
    } catch (err) {
      toast.error('Error al aprobar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      toast.error('Ingresa el motivo del rechazo');
      return;
    }

    setSaving(true);
    try {
      await updateOrden(id, {
        estado: 'rechazada',
        notas: motivoRechazo.trim(),
      });
      toast.success('Orden rechazada');
      navigate('/compras?vista=aprobaciones');
    } catch (err) {
      toast.error('Error al rechazar: ' + err.message);
    } finally {
      setSaving(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return (
      <div className="co-page animate-slide-up">
        <div className="co-card co-loader-box">
          <div className="co-spinner" />
        </div>
      </div>
    );
  }

  if (!orden) return null;

  const proyectoLabel = getOrdenProyectoLabel(orden);

  return (
    <div className="co-page animate-slide-up">
      <ComprasPageHeader
        title={`Detalle de Orden - ${orden.numero}`}
        subtitle="Asigna proveedor y precios a cada item antes de aprobar"
        action={(
          <ComprasHeaderGhostButton onClick={() => navigate('/compras?vista=aprobaciones')}>
            ← Volver a Aprobaciones
          </ComprasHeaderGhostButton>
        )}
      />

      {/* Información General */}
      <div className="co-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="text-xs font-bold text-slate-500" style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Información General
        </h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
          <div>
            <p className="co-label">Orden</p>
            <p className="text-sm font-bold text-slate-800">{orden.numero}</p>
          </div>
          <div>
            <p className="co-label">Emisor</p>
            <p className="text-sm font-semibold text-slate-700">{orden.usuario?.nombre || '—'}</p>
          </div>
          <div>
            <p className="co-label">Fecha</p>
            <p className="text-sm font-semibold text-slate-700">
              {orden.fecha ? new Date(orden.fecha).toLocaleDateString('es-EC') : '—'}
            </p>
          </div>
          <div>
            <p className="co-label">Estado</p>
            <span className="co-badge" style={{
              background: orden.estado === 'pendiente_aprobacion' ? '#fef3c7' : '#dbeafe',
              color: orden.estado === 'pendiente_aprobacion' ? '#f59e0b' : '#3b82f6'
            }}>
              {orden.estado === 'pendiente_aprobacion' ? 'Pendiente' : orden.estado}
            </span>
          </div>
          <div>
            <p className="co-label">Proyecto</p>
            {proyectoLabel ? (
              orden.proyecto?.id ? (
                <Link
                  to={`/proyectos/${orden.proyecto.id}`}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {proyectoLabel}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-slate-700">{proyectoLabel}</p>
              )
            ) : (
              <p className="text-sm text-slate-500">Gasto general (sin proyecto)</p>
            )}
          </div>
        </div>
        {(orden.concepto || orden.notas) && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            {orden.concepto && (
              <div style={{ marginBottom: '0.75rem' }}>
                <p className="co-label">Concepto</p>
                <p className="text-sm text-slate-700">{orden.concepto}</p>
              </div>
            )}
            {orden.notas && (
              <div>
                <p className="co-label">Notas</p>
                <p className="text-sm text-slate-500">{orden.notas}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Datos de Facturación */}
      <div className="co-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', overflow: 'visible', position: 'relative', zIndex: 10 }}>
        <h3 className="text-xs font-bold text-slate-500" style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Datos de Facturación
        </h3>
        <div className="co-form-row-split">
          <div className="co-form-field relative">
            <label className="co-label">
              Proveedor
            </label>
            <input
              type="text"
              className="co-input"
              placeholder="Buscar proveedor..."
              value={providerSearch}
              onChange={e => {
                setProviderSearch(e.target.value);
                setProviderDropdownOpen(true);
                const found = proveedores.find(p => p.nombre === e.target.value);
                if (found) {
                  setProveedorId(found.id);
                } else if (e.target.value === 'Sin proveedor específico' || e.target.value === '') {
                  setProveedorId('');
                  const numericAbono = parseFloat(abonoMonto) || 0;
                  if (numericAbono > 0 && numericAbono < total - 0.01) {
                    setAbonoMonto('');
                  }
                }
              }}
              onFocus={() => setProviderDropdownOpen(true)}
              onBlur={() => {
                setTimeout(() => {
                  setProviderDropdownOpen(false);
                  if (proveedorId) {
                    const found = proveedores.find(p => p.id === proveedorId);
                    if (found) setProviderSearch(found.nombre);
                  } else {
                    setProviderSearch('Sin proveedor específico');
                  }
                }, 200);
              }}
            />
            {providerDropdownOpen && (
              <div className="co-search-dropdown">
                <div
                  className="co-search-item"
                  onMouseDown={() => selectProveedor(null)}
                  style={{ borderBottom: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                >
                  <div className="font-bold text-blue-600">Sin proveedor específico</div>
                  <div className="text-slate-400 text-[10px]">Permite aprobar sin proveedor asignado</div>
                </div>
                {proveedores
                  .filter(p => {
                    const term = providerSearch.toLowerCase();
                    if (providerSearch === 'Sin proveedor específico') return true;
                    return p.nombre.toLowerCase().includes(term) || (p.ruc && p.ruc.includes(term));
                  })
                  .map(p => (
                    <div
                      key={p.id}
                      className="co-search-item"
                      onMouseDown={() => selectProveedor(p)}
                    >
                      <div className="font-semibold text-slate-800">{p.nombre}</div>
                      <div className="text-slate-400 text-[10px]">
                        RUC: {p.ruc || 'N/A'} | Tel: {p.telefono || 'N/A'}
                      </div>
                    </div>
                  ))}
                {proveedores.filter(p => {
                  const term = providerSearch.toLowerCase();
                  if (providerSearch === 'Sin proveedor específico') return true;
                  return p.nombre.toLowerCase().includes(term);
                }).length === 0 && providerSearch !== 'Sin proveedor específico' && (
                    <div className="px-3 py-2 text-xs text-slate-400 text-center">
                      No se encontraron proveedores
                    </div>
                  )}
              </div>
            )}
          </div>
          <div className="co-form-field">
            <label className="co-label">IVA / Impuesto</label>
            <select
              value={ivaPct}
              onChange={(e) => setIvaPct(parseFloat(e.target.value))}
              className="co-input"
            >
              <option value={0}>0% — Sin IVA</option>
              <option value={0.08}>8%</option>
              <option value={0.12}>12%</option>
              <option value={0.15}>15%</option>
            </select>
          </div>
        </div>
      </div>




      {/* Items de la Orden */}
      <div className="co-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="text-xs font-bold text-slate-500" style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Items de la Orden
        </h3>

        <div className="overflow-x-auto">
          <table className="co-items-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Cantidad</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Precio Unitario</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Total parcial</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((d) => {
                const subtotalItem = d.cantidad * (parseFloat(d.precioUnitario) || 0);
                return (
                  <tr key={d.id}>
                    <td className="font-semibold text-slate-800">{d.descripcion}</td>
                    <td className="text-center text-slate-500">{d.cantidad}</td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={d.precioUnitario}
                        onChange={(e) => updateDetallePrecio(d.id, e.target.value)}
                        className="co-table-input"
                        style={{ maxWidth: '140px', marginLeft: 'auto' }}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="text-right font-bold text-slate-800">{fmt(subtotalItem)}</td>
                  </tr>
                );
              })}
              {lineas.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400 text-sm font-medium">
                    <p>No hay artículos registrados en esta orden.</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Si la orden tenía materiales, es posible que se hayan perdido al aprobar sin cargar los ítems.
                      Gestiona los ítems desde esta pantalla de aprobación antes de confirmar.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px' }}>
            <div className="co-totals-box">
              <div className="co-total-row">
                <span>Total parcial:</span>
                <span className="font-bold text-slate-800">{fmt(subtotal)}</span>
              </div>
              <div className="co-total-row">
                <span>IVA ({(ivaPct * 100).toFixed(0)}%):</span>
                <span className="font-bold text-slate-800">{fmt(impuestoVal)}</span>
              </div>
              <div className="co-total-row co-total-final">
                <span>Total:</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="co-actions-row">
        <button
          onClick={triggerAprobarConfirm}
          disabled={saving}
          className="co-btn-primary"
          style={{
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            boxShadow: saving ? 'none' : '0 4px 14px rgba(22,163,74,0.3)'
          }}
        >
          {saving ? 'Procesando...' : 'Guardar y Aprobar Orden'}
        </button>
        <button
          onClick={() => setShowRejectModal(true)}
          disabled={saving}
          className="co-btn-primary"
          style={{
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            boxShadow: saving ? 'none' : '0 4px 14px rgba(220,38,38,0.3)'
          }}
        >
          Rechazar Orden
        </button>
      </div>

      {/* Modal de Confirmación de Aprobación con Pago Integrado */}
      <ModalPortal open={showApproveConfirm}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          {/* Backdrop Overlay with Blur */}
          <div
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-md transition-opacity"
            onClick={() => setShowApproveConfirm(false)}
          />

          {/* Modal Container */}
          <div
            className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-2xl flex flex-col overflow-hidden relative z-[201] animate-slide-up w-full max-w-3xl max-h-[92vh]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100/80 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800 leading-tight">Confirmar Aprobación</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Verifica los datos y registra el abono inicial</p>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveConfirm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto min-h-0 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
                {/* Left Column: Resumen de Orden (5 cols) */}
                <div className="md:col-span-5 bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                        Resumen de Orden
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {lineas.length} {lineas.length === 1 ? 'ítem' : 'ítems'}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                        <span className="text-slate-500 font-medium">N° Orden:</span>
                        <span className="font-bold text-slate-900 font-mono">{orden.numero}</span>
                      </div>

                      <div className="flex justify-between items-start pb-2 border-b border-slate-200/60">
                        <span className="text-slate-500 font-medium shrink-0">Proveedor:</span>
                        <span className="font-semibold text-slate-800 text-right truncate max-w-[140px]">
                          {providerSearch || 'Sin proveedor específico'}
                        </span>
                      </div>

                      <div className="flex justify-between items-start pb-2 border-b border-slate-200/60">
                        <span className="text-slate-500 font-medium shrink-0">Proyecto:</span>
                        <span className="font-semibold text-slate-800 text-right truncate max-w-[140px]">
                          {proyectoLabel || 'Gasto general'}
                        </span>
                      </div>

                      {orden.concepto && (
                        <div className="flex justify-between items-start pb-2 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium shrink-0">Concepto:</span>
                          <span className="font-medium text-slate-700 text-right line-clamp-2 max-w-[140px]">
                            {orden.concepto}
                          </span>
                        </div>
                      )}

                      {/* Items mini summary */}
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Detalle de ítems</span>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {lineas.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                              <span className="truncate max-w-[120px] font-medium">• {it.descripcion}</span>
                              <span className="font-mono text-slate-800 shrink-0">{it.cantidad}x {fmt(it.precioUnitario)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center bg-white/60 p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-xs font-extrabold text-slate-600">Total de Orden:</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono">{fmt(total)}</span>
                  </div>
                </div>

                {/* Right Column: Inputs (7 cols) */}
                <div className="md:col-span-7 space-y-3.5">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Monto a Abonar ($)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAbonoMonto(total.toFixed(2));
                          if (!metodoPagoId && metodosPago.length > 0) {
                            const activeMethod = metodosPago.find(mp => mp.activo);
                            if (activeMethod) setMetodoPagoId(activeMethod.id);
                          }
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer bg-transparent border-none p-0"
                      >
                        Copiar Total
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={abonoMonto}
                      onChange={(e) => {
                        setAbonoMonto(e.target.value);
                        if (e.target.value && parseFloat(e.target.value) > 0 && !metodoPagoId && metodosPago.length > 0) {
                          const activeMethod = metodosPago.find(mp => mp.activo);
                          if (activeMethod) setMetodoPagoId(activeMethod.id);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="0.00 (Dejar en blanco para Ninguno)"
                    />

                    {/* Legends under input with SVG icons */}
                    {numericAbono < 0 && (
                      <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle size={14} className="shrink-0" />
                        El abono no puede ser menor a 0.
                      </p>
                    )}
                    {numericAbono > total + 0.01 && (
                      <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle size={14} className="shrink-0" />
                        El abono no puede exceder el total de {fmt(total)}.
                      </p>
                    )}
                    {isSinProveedor && numericAbono < total - 0.01 && (
                      <p className="text-[11px] text-orange-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle size={14} className="shrink-0" />
                        No se puede abonar menos del total sin un proveedor específico.
                      </p>
                    )}
                    {!isSinProveedor && numericAbono === 0 && (
                      <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <Info size={14} className="shrink-0 text-slate-400" />
                        Se registrará la orden como cuenta por pagar de {fmt(total)}.
                      </p>
                    )}
                    {!isSinProveedor && numericAbono > 0 && numericAbono < total - 0.01 && (
                      <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
                        <Info size={14} className="shrink-0 text-blue-500" />
                        Abono parcial. Saldo de {fmt(total - numericAbono)} a Cuentas por Pagar.
                      </p>
                    )}
                    {numericAbono >= total - 0.01 && numericAbono <= total + 0.01 && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle size={14} className="shrink-0 text-emerald-500" />
                        Pago Total: La orden se registrará como pagada y cerrada.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Cuenta / Método de Pago
                    </label>
                    <select
                      value={metodoPagoId}
                      onChange={(e) => setMetodoPagoId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={!(parseFloat(abonoMonto) > 0)}
                    >
                      <option value="">{parseFloat(abonoMonto) > 0 ? "Selecciona cuenta..." : "No requiere (Sin abono)"}</option>
                      {metodosPago
                        .filter(mp => mp.activo)
                        .map(mp => (
                          <option key={mp.id} value={mp.id}>
                            {mp.nombre} ({fmt(mp.saldoActual || 0)})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Toggle & Fields Cheque Posfechado */}
                  {numericAbono > 0 && (
                    <div className={`rounded-2xl p-3.5 transition-all duration-200 border ${esChequePosfechado
                        ? 'bg-blue-50/60 border-blue-200/80 shadow-sm'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                      }`}>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={esChequePosfechado}
                          onChange={(e) => setEsChequePosfechado(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                        />
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CreditCard size={15} className={`shrink-0 ${esChequePosfechado ? 'text-blue-600' : 'text-slate-500'}`} />
                          <span className={`text-xs font-extrabold truncate ${esChequePosfechado ? 'text-blue-950' : 'text-slate-700'}`}>
                            Registrar como Pago por Cheque Posfechado (A Fecha)
                          </span>
                        </div>
                      </label>

                      {esChequePosfechado && (
                        <div className="pt-3 mt-2.5 border-t border-blue-200/70 grid grid-cols-2 gap-3 animate-fade-in">
                          <div>
                            <label className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1 mb-1 whitespace-nowrap">
                              <Hash size={12} className="text-blue-600 shrink-0" /> N° Cheque *
                            </label>
                            <input
                              type="text"
                              value={numeroCheque}
                              onChange={(e) => setNumeroCheque(e.target.value)}
                              placeholder="Ej. CHQ-10492"
                              className="w-full px-3 py-2 rounded-xl border border-blue-200 text-xs font-mono font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1 mb-1 whitespace-nowrap">
                              <Calendar size={12} className="text-blue-600 shrink-0" /> Fecha Cobro *
                            </label>
                            <input
                              type="date"
                              value={fechaCobroCheque}
                              onChange={(e) => setFechaCobroCheque(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-blue-200 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              required
                            />
                          </div>
                          <div className="col-span-2 bg-white/80 border border-blue-100 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed font-medium">
                            <Info size={15} className="shrink-0 text-blue-600 mt-0.5" />
                            <span>
                              El dinero permanecerá en la cuenta y se debitará automáticamente en la fecha de cobro.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                      Referencia / Observación
                    </label>
                    <input
                      type="text"
                      value={abonoReferencia}
                      onChange={(e) => setAbonoReferencia(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={!(parseFloat(abonoMonto) > 0)}
                      placeholder="No. transferencia, cheque, etc."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowApproveConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarYAprobar}
                disabled={saving || isSubmitDisabled()}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: (saving || isSubmitDisabled()) ? '#94a3b8' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  boxShadow: (saving || isSubmitDisabled()) ? 'none' : '0 4px 14px rgba(22,163,74,0.3)'
                }}
              >
                {saving ? 'Aprobando...' : 'Confirmar y Aprobar'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Modal de Rechazo */}
      <ModalPortal open={showRejectModal}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
          <div
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-md transition-opacity"
            onClick={() => setShowRejectModal(false)}
          />

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-md p-6 relative z-[201] space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Rechazar Orden</h3>
                <p className="text-xs text-slate-500 mt-0.5">Indica el motivo del rechazo</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              rows={4}
              placeholder="Motivo del rechazo..."
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setMotivoRechazo(''); }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRechazar}
                disabled={saving || !motivoRechazo.trim()}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
                style={{
                  background: (saving || !motivoRechazo.trim()) ? '#94a3b8' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  boxShadow: (saving || !motivoRechazo.trim()) ? 'none' : '0 4px 14px rgba(220,38,38,0.3)'
                }}
              >
                {saving ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
