import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { getOrdenById, updateOrden, getProveedores, getMetodosPago } from '../../application/comprasService';
import { getOrdenProyectoLabel, normalizeOrdenDetalles } from '../../helpers/ordenCompraHelpers';
import { toast } from '../../../../shared/ui/components/Toast';
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
  const [impuesto, setImpuesto] = useState('0');
  const [preciosEditados, setPreciosEditados] = useState({});

  // Payment integration states
  const [abonoMonto, setAbonoMonto] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [abonoReferencia, setAbonoReferencia] = useState('');

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

      setImpuesto(String(ordenMerged.impuesto || 0));

      const lineas = normalizeOrdenDetalles(ordenMerged);
      const preciosIniciales = {};
      lineas.forEach((linea) => {
        preciosIniciales[linea.id] = linea.precioUnitario;
      });
      setPreciosEditados(preciosIniciales);
    } catch (err) {
      toast.error('Error al cargar la orden: ' + err.message);
      navigate('/compras/aprobaciones');
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
  const impuestoVal = parseFloat(impuesto) || 0;
  const total = subtotal + impuestoVal;

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const numericAbono = parseFloat(abonoMonto) || 0;
  const isSinProveedor = !proveedorId;

  const isSubmitDisabled = () => {
    if (numericAbono < 0) return true;
    if (numericAbono > total + 0.01) return true;
    if (numericAbono > 0 && !metodoPagoId) return true;
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
      }

      await updateOrden(id, payload);
      toast.success('Orden guardada y aprobada con éxito');
      navigate('/compras/aprobaciones');
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
      navigate('/compras/aprobaciones');
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
      {/* Header */}
      <div className="co-card co-header">
        <div>
          <h1 className="co-title">Detalle de Orden - {orden.numero}</h1>
          <p className="co-subtitle">Asigna proveedor y precios a cada item antes de aprobar</p>
        </div>
        <button onClick={() => navigate('/compras/aprobaciones')} className="co-btn-ghost">
          ← Volver a Aprobaciones
        </button>
      </div>

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
            <input
              type="number"
              step="0.01"
              value={impuesto}
              onChange={(e) => setImpuesto(e.target.value)}
              className="co-input"
              placeholder="0.00"
            />
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
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/compras/editar/${id}`)}
                      className="co-btn-primary mt-4"
                      style={{ padding: '8px 18px', fontSize: '12px' }}
                    >
                      Editar orden y volver a agregar materiales
                    </button>
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
                <span>IVA / Impuesto:</span>
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
      {showApproveConfirm && (
        <>
          <div className="co-overlay" onClick={() => setShowApproveConfirm(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal-fixed-wide animate-co-modal-in">
              <div className="co-modal-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Confirmar Aprobación</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Verifica los datos y registra el abono inicial</p>
                </div>
                <button onClick={() => setShowApproveConfirm(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="co-modal-body">
                <div className="co-modal-grid-2col">
                  {/* Left Column: Summary */}
                  <div className="co-modal-col-left" style={{ justifyContent: 'center' }}>
                    <div style={{ padding: '1.5rem', borderRadius: '16px', background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
                      <p className="text-[10px] font-bold text-slate-400 mb-4" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Resumen de Orden
                      </p>
                      <div className="flex justify-between text-xs" style={{ marginBottom: '0.85rem' }}>
                        <span className="text-slate-500 font-medium">Orden:</span>
                        <span className="font-bold text-slate-800 font-mono" style={{ letterSpacing: '0.02em' }}>{orden.numero}</span>
                      </div>
                      <div className="flex justify-between text-xs" style={{ marginBottom: '0.85rem' }}>
                        <span className="text-slate-500 font-medium">Proveedor:</span>
                        <span className="font-semibold text-slate-700">{providerSearch || 'Sin proveedor específico'}</span>
                      </div>
                      <div className="flex justify-between text-xs" style={{ marginBottom: '0.85rem' }}>
                        <span className="text-slate-500 font-medium">Proyecto:</span>
                        <span className="font-semibold text-slate-700 text-right max-w-[60%]">
                          {proyectoLabel || 'Gasto general'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs" style={{ paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                        <span className="text-slate-500 font-bold">Total de Orden:</span>
                        <span className="font-extrabold text-slate-900" style={{ fontSize: '15px' }}>{fmt(total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Inputs */}
                  <div className="co-modal-col-right">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="co-label" style={{ margin: 0, fontSize: '10px' }}>Monto a Abonar ($)</label>
                        <span 
                          onClick={() => {
                            setAbonoMonto(total.toFixed(2));
                            if (!metodoPagoId && metodosPago.length > 0) {
                              const activeMethod = metodosPago.find(mp => mp.activo);
                              if (activeMethod) setMetodoPagoId(activeMethod.id);
                            }
                          }} 
                          style={{ cursor: 'pointer', fontSize: '10px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline' }}
                        >
                          Copiar Total
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={total}
                        value={abonoMonto}
                        onChange={(e) => {
                          setAbonoMonto(e.target.value);
                          // Auto-select payment method if empty and they start typing a value
                          if (e.target.value && parseFloat(e.target.value) > 0 && !metodoPagoId && metodosPago.length > 0) {
                            const activeMethod = metodosPago.find(mp => mp.activo);
                            if (activeMethod) setMetodoPagoId(activeMethod.id);
                          }
                        }}
                        className="co-input"
                        placeholder="0.00 (Dejar en blanco para Ninguno)"
                      />
                      
                      {/* Legends under input with SVG icons, NO emojis */}
                      {numericAbono < 0 && (
                        <p style={{ color: '#ef4444', fontSize: '10.5px', fontWeight: '600', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          El abono no puede ser menor a 0.
                        </p>
                      )}
                      {numericAbono > total + 0.01 && (
                        <p style={{ color: '#ef4444', fontSize: '10.5px', fontWeight: '600', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          El abono no puede exceder el total de {fmt(total)}.
                        </p>
                      )}
                      {isSinProveedor && numericAbono < total - 0.01 && (
                        <p style={{ color: '#ea580c', fontSize: '10.5px', fontWeight: '600', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg className="w-3.5 h-3.5 text-orange-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          No se puede abonar menos del total sin un proveedor específico.
                        </p>
                      )}
                      {!isSinProveedor && numericAbono === 0 && (
                        <p style={{ color: '#64748b', fontSize: '10.5px', fontWeight: '500', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Se registrará la orden como cuenta por pagar de {fmt(total)}.
                        </p>
                      )}
                      {!isSinProveedor && numericAbono > 0 && numericAbono < total - 0.01 && (
                        <p style={{ color: '#2563eb', fontSize: '10.5px', fontWeight: '500', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Abono parcial. Saldo de {fmt(total - numericAbono)} a Cuentas por Pagar.
                        </p>
                      )}
                      {numericAbono >= total - 0.01 && numericAbono <= total + 0.01 && (
                        <p style={{ color: '#16a34a', fontSize: '10.5px', fontWeight: '500', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pago Total: La orden se registrará como pagada y cerrada.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="co-label" style={{ fontSize: '10px' }}>Cuenta / Método de Pago</label>
                      <select
                        value={metodoPagoId}
                        onChange={(e) => setMetodoPagoId(e.target.value)}
                        className="co-input"
                        disabled={!(parseFloat(abonoMonto) > 0)}
                        style={{ background: !(parseFloat(abonoMonto) > 0) ? '#f8fafc' : '#ffffff' }}
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

                    <div>
                      <label className="co-label" style={{ fontSize: '10px' }}>Referencia / Observación</label>
                      <input
                        type="text"
                        value={abonoReferencia}
                        onChange={(e) => setAbonoReferencia(e.target.value)}
                        className="co-input"
                        disabled={!(parseFloat(abonoMonto) > 0)}
                        style={{ background: !(parseFloat(abonoMonto) > 0) ? '#f8fafc' : '#ffffff' }}
                        placeholder="No. transferencia, cheque, etc."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer containing action buttons */}
              <div className="co-modal-fixed-footer">
                <button onClick={() => setShowApproveConfirm(false)} className="co-btn-ghost">
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarYAprobar}
                  disabled={saving || isSubmitDisabled()}
                  className="co-btn-primary"
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
        </>
      )}

      {/* Modal de Rechazo */}
      {showRejectModal && (
        <>
          <div className="co-overlay" onClick={() => setShowRejectModal(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal animate-co-modal-in">
              <div className="co-modal-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Rechazar Orden</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Indica el motivo del rechazo</p>
                </div>
                <button onClick={() => setShowRejectModal(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="co-modal-body">
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="co-input co-textarea"
                  rows={4}
                  placeholder="Motivo del rechazo..."
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => { setShowRejectModal(false); setMotivoRechazo(''); }} className="co-btn-ghost">
                    Cancelar
                  </button>
                  <button
                    onClick={handleRechazar}
                    disabled={saving || !motivoRechazo.trim()}
                    className="co-btn-primary"
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
          </div>
        </>
      )}
    </div>
  );
};
