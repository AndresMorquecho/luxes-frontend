import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrdenById, updateOrden, getProveedores } from '../../application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import './ComprasPage.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const DetalleAprobacionPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  
  const [orden, setOrden] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [proveedorId, setProveedorId] = useState('');
  const [impuesto, setImpuesto] = useState('0');
  const [detalles, setDetalles] = useState([]);

  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordenData, provList] = await Promise.all([
        getOrdenById(id),
        getProveedores()
      ]);

      setOrden(ordenData);
      setProveedores(provList);
      setProveedorId(ordenData.proveedorId || '');
      setImpuesto(String(ordenData.impuesto || 0));
      
      setDetalles((ordenData.detalles || []).map(d => ({
        id: d.id,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitario: String(d.precioUnitario || 0),
        materialId: d.materialId,
      })));
    } catch (err) {
      toast.error('Error al cargar la orden: ' + err.message);
      navigate('/compras/aprobaciones');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateDetallePrecio = (index, value) => {
    setDetalles(prev => {
      const newDetalles = [...prev];
      newDetalles[index] = { ...newDetalles[index], precioUnitario: value };
      return newDetalles;
    });
  };

  const subtotal = detalles.reduce((sum, d) => {
    return sum + (d.cantidad * (parseFloat(d.precioUnitario) || 0));
  }, 0);
  const impuestoVal = parseFloat(impuesto) || 0;
  const total = subtotal + impuestoVal;

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const triggerAprobarConfirm = () => {
    if (!proveedorId) {
      toast.error('Selecciona un proveedor');
      return;
    }

    const sinPrecio = detalles.some(d => !d.precioUnitario || parseFloat(d.precioUnitario) <= 0);
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
      await updateOrden(id, {
        proveedorId,
        impuesto: impuestoVal,
        detalles: detalles.map(d => ({
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precioUnitario: parseFloat(d.precioUnitario) || 0,
          materialId: d.materialId,
        })),
        estado: 'aprobada',
        aprobadoPorId: currentUser?.id,
      });
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
      <div className="co-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="text-xs font-bold text-slate-500" style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Datos de Facturación
        </h3>
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div>
            <label className="co-label">
              Proveedor <span className="text-red-500">*</span>
            </label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="co-input"
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
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
                <th style={{ width: '140px', textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((d, idx) => {
                const subtotalItem = d.cantidad * (parseFloat(d.precioUnitario) || 0);
                return (
                  <tr key={d.id || idx}>
                    <td className="font-semibold text-slate-800">{d.descripcion}</td>
                    <td className="text-center text-slate-500">{d.cantidad}</td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={d.precioUnitario}
                        onChange={(e) => updateDetallePrecio(idx, e.target.value)}
                        className="co-table-input"
                        style={{ maxWidth: '140px', marginLeft: 'auto' }}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="text-right font-bold text-slate-800">{fmt(subtotalItem)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px' }}>
            <div className="co-totals-box">
              <div className="co-total-row">
                <span>Subtotal:</span>
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
      <div className="flex items-center justify-end gap-3" style={{ marginBottom: '2rem' }}>
        <button
          onClick={triggerAprobarConfirm}
          disabled={saving || !proveedorId}
          className="co-btn-primary"
          style={{ 
            background: (saving || !proveedorId) ? '#94a3b8' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            boxShadow: (saving || !proveedorId) ? 'none' : '0 4px 14px rgba(22,163,74,0.3)'
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

      {/* Modal de Confirmación de Aprobación */}
      {showApproveConfirm && (
        <>
          <div className="co-overlay" onClick={() => setShowApproveConfirm(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal animate-co-modal-in">
              <div className="co-modal-header">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Confirmar Aprobación</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Verifica los datos antes de continuar</p>
                </div>
                <button onClick={() => setShowApproveConfirm(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="co-modal-body">
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  ¿Estás seguro de que deseas guardar los precios, el proveedor y el impuesto ingresados, y aprobar esta orden de compra? 
                  Esto registrará automáticamente el gasto en la gestión del proyecto y notificará al taller.
                </p>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setShowApproveConfirm(false)} className="co-btn-ghost">
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarYAprobar}
                    disabled={saving}
                    className="co-btn-primary"
                    style={{ 
                      background: saving ? '#94a3b8' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      boxShadow: saving ? 'none' : '0 4px 14px rgba(22,163,74,0.3)'
                    }}
                  >
                    {saving ? 'Aprobando...' : 'Confirmar y Aprobar'}
                  </button>
                </div>
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
