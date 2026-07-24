import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, X } from 'lucide-react';
import { getOrdenById, updateOrden, getProveedores, getMetodosPago } from '../../application/comprasService';
import { getOrdenProyectoLabel, normalizeOrdenDetalles } from '../../helpers/ordenCompraHelpers';
import { toast } from '../../../../shared/ui/components/Toast';
import './ComprasPage.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const inputClass =
  'w-full h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-60 disabled:cursor-not-allowed';
const labelClass = 'block text-xs font-semibold text-slate-500 mb-1.5';

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

  const [abonoMonto, setAbonoMonto] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [abonoReferencia, setAbonoReferencia] = useState('');

  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

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

      const lineasInit = normalizeOrdenDetalles(ordenMerged);
      const preciosIniciales = {};
      lineasInit.forEach((linea) => {
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
      const numericAbonoLocal = parseFloat(abonoMonto) || 0;
      if (numericAbonoLocal > 0 && numericAbonoLocal < total - 0.01) {
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

  const numericAbono = parseFloat(abonoMonto) || 0;
  const isSinProveedor = !proveedorId;

  const isSubmitDisabled = () => {
    if (numericAbono < 0) return true;
    if (numericAbono > total + 0.01) return true;
    if (numericAbono > 0 && !metodoPagoId) return true;
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
      <div className="space-y-3 sm:space-y-5 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
        </div>
      </div>
    );
  }

  if (!orden) return null;

  const proyectoLabel = getOrdenProyectoLabel(orden);
  const estadoPendiente = orden.estado === 'pendiente_aprobacion';

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-8"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/compras?vista=aprobaciones')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            title="Volver"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
            <ClipboardCheck className="w-5 h-5 text-blue-600" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight truncate">
                Detalle de orden — {orden.numero}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700">
                Aprobación
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
              Asigna proveedor y precios a cada ítem antes de aprobar
            </p>
          </div>
        </div>
      </div>

      {/* Información general */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
          Información general
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className={labelClass}>Orden</p>
            <p className="text-sm font-bold text-slate-800 font-mono">{orden.numero}</p>
          </div>
          <div>
            <p className={labelClass}>Emisor</p>
            <p className="text-sm font-semibold text-slate-700">{orden.usuario?.nombre || '—'}</p>
          </div>
          <div>
            <p className={labelClass}>Fecha</p>
            <p className="text-sm font-semibold text-slate-700">
              {orden.fecha ? new Date(orden.fecha).toLocaleDateString('es-EC') : '—'}
            </p>
          </div>
          <div>
            <p className={labelClass}>Estado</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              estadoPendiente
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
              {estadoPendiente ? 'Pendiente' : orden.estado}
            </span>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className={labelClass}>Proyecto</p>
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
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            {orden.concepto && (
              <div>
                <p className={labelClass}>Concepto</p>
                <p className="text-sm text-slate-700">{orden.concepto}</p>
              </div>
            )}
            {orden.notas && (
              <div>
                <p className={labelClass}>Notas</p>
                <p className="text-sm text-slate-500">{orden.notas}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Datos de facturación */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 overflow-visible relative z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
          Datos de facturación
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className={labelClass}>Proveedor</label>
            <input
              type="text"
              className={inputClass}
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
                  const nAbono = parseFloat(abonoMonto) || 0;
                  if (nAbono > 0 && nAbono < total - 0.01) {
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
          <div>
            <label className={labelClass}>IVA / Impuesto</label>
            <input
              type="number"
              step="0.01"
              value={impuesto}
              onChange={(e) => setImpuesto(e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Ítems */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-800">Ítems de la orden</h3>
          <span className="text-xs font-medium text-gray-400">
            {lineas.length} {lineas.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-center w-[100px]">Cantidad</th>
                <th className="px-4 py-3 text-right w-[180px]">Precio unitario</th>
                <th className="px-4 py-3 text-right w-[140px]">Total parcial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineas.map((d) => {
                const subtotalItem = d.cantidad * (parseFloat(d.precioUnitario) || 0);
                return (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{d.descripcion}</td>
                    <td className="px-4 py-3 text-center text-slate-500 tabular-nums">{d.cantidad}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={d.precioUnitario}
                        onChange={(e) => updateDetallePrecio(d.id, e.target.value)}
                        className={`${inputClass} text-right !h-9 ml-auto`}
                        style={{ maxWidth: '140px' }}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">{fmt(subtotalItem)}</td>
                  </tr>
                );
              })}
              {lineas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-slate-400 text-sm">
                    <p>No hay artículos registrados en esta orden.</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Gestiona los ítems desde esta pantalla de aprobación antes de confirmar.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 sm:px-5 py-4 border-t border-slate-100 flex justify-end">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total parcial</span>
              <span className="font-semibold text-slate-800 tabular-nums">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">IVA / Impuesto</span>
              <span className="font-semibold text-slate-800 tabular-nums">{fmt(impuestoVal)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="font-bold text-slate-900 tabular-nums text-base">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowRejectModal(true)}
          disabled={saving}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-rose-600 border border-rose-200 bg-white hover:bg-rose-50 transition-colors disabled:opacity-50"
        >
          Rechazar orden
        </button>
        <button
          type="button"
          onClick={triggerAprobarConfirm}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 transition-opacity shadow-sm disabled:opacity-50"
        >
          {saving ? 'Procesando...' : 'Guardar y aprobar orden'}
        </button>
      </div>

      {/* Modal aprobar */}
      {showApproveConfirm && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => setShowApproveConfirm(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl flex flex-col border border-slate-200 max-h-[min(780px,92vh)] overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Confirmar aprobación</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Verifica los datos y registra el abono inicial</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApproveConfirm(false)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Resumen de orden
                    </p>
                    <div className="flex justify-between text-xs gap-3">
                      <span className="text-slate-500 font-medium">Orden</span>
                      <span className="font-bold text-slate-800 font-mono">{orden.numero}</span>
                    </div>
                    <div className="flex justify-between text-xs gap-3">
                      <span className="text-slate-500 font-medium">Proveedor</span>
                      <span className="font-semibold text-slate-700 text-right">{providerSearch || 'Sin proveedor específico'}</span>
                    </div>
                    <div className="flex justify-between text-xs gap-3">
                      <span className="text-slate-500 font-medium">Proyecto</span>
                      <span className="font-semibold text-slate-700 text-right max-w-[60%]">
                        {proyectoLabel || 'Gasto general'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs gap-3 pt-3 border-t border-slate-200">
                      <span className="text-slate-500 font-bold">Total de orden</span>
                      <span className="font-bold text-slate-900 tabular-nums">{fmt(total)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className={`${labelClass} !mb-0`}>Monto a abonar ($)</label>
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            setAbonoMonto(total.toFixed(2));
                            if (!metodoPagoId && metodosPago.length > 0) {
                              const activeMethod = metodosPago.find(mp => mp.activo);
                              if (activeMethod) setMetodoPagoId(activeMethod.id);
                            }
                          }}
                        >
                          Copiar total
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={total}
                        value={abonoMonto}
                        onChange={(e) => {
                          setAbonoMonto(e.target.value);
                          if (e.target.value && parseFloat(e.target.value) > 0 && !metodoPagoId && metodosPago.length > 0) {
                            const activeMethod = metodosPago.find(mp => mp.activo);
                            if (activeMethod) setMetodoPagoId(activeMethod.id);
                          }
                        }}
                        className={inputClass}
                        placeholder="0.00 (dejar en blanco para ninguno)"
                      />
                      {numericAbono < 0 && (
                        <p className="text-[10.5px] font-semibold text-red-600 mt-1">El abono no puede ser menor a 0.</p>
                      )}
                      {numericAbono > total + 0.01 && (
                        <p className="text-[10.5px] font-semibold text-red-600 mt-1">
                          El abono no puede exceder el total de {fmt(total)}.
                        </p>
                      )}
                      {isSinProveedor && numericAbono < total - 0.01 && (
                        <p className="text-[10.5px] font-semibold text-orange-600 mt-1">
                          No se puede abonar menos del total sin un proveedor específico.
                        </p>
                      )}
                      {!isSinProveedor && numericAbono === 0 && (
                        <p className="text-[10.5px] font-medium text-slate-500 mt-1">
                          Se registrará la orden como cuenta por pagar de {fmt(total)}.
                        </p>
                      )}
                      {!isSinProveedor && numericAbono > 0 && numericAbono < total - 0.01 && (
                        <p className="text-[10.5px] font-medium text-blue-600 mt-1">
                          Abono parcial. Saldo de {fmt(total - numericAbono)} a cuentas por pagar.
                        </p>
                      )}
                      {numericAbono >= total - 0.01 && numericAbono <= total + 0.01 && (
                        <p className="text-[10.5px] font-medium text-emerald-600 mt-1">
                          Pago total: la orden se registrará como pagada y cerrada.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Cuenta / método de pago</label>
                      <select
                        value={metodoPagoId}
                        onChange={(e) => setMetodoPagoId(e.target.value)}
                        className={inputClass}
                        disabled={!(parseFloat(abonoMonto) > 0)}
                        style={{ background: !(parseFloat(abonoMonto) > 0) ? '#f8fafc' : '#ffffff' }}
                      >
                        <option value="">{parseFloat(abonoMonto) > 0 ? 'Selecciona cuenta...' : 'No requiere (sin abono)'}</option>
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
                      <label className={labelClass}>Referencia / observación</label>
                      <input
                        type="text"
                        value={abonoReferencia}
                        onChange={(e) => setAbonoReferencia(e.target.value)}
                        className={inputClass}
                        disabled={!(parseFloat(abonoMonto) > 0)}
                        style={{ background: !(parseFloat(abonoMonto) > 0) ? '#f8fafc' : '#ffffff' }}
                        placeholder="No. transferencia, cheque, etc."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowApproveConfirm(false)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarYAprobar}
                  disabled={saving || isSubmitDisabled()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-700 transition-opacity shadow-sm disabled:opacity-50 min-w-[160px]"
                >
                  {saving ? 'Aprobando...' : 'Confirmar y aprobar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal rechazar */}
      {showRejectModal && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => setShowRejectModal(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl flex flex-col border border-slate-200 overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Rechazar orden</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Indica el motivo del rechazo</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className={`${inputClass} h-auto py-2.5 resize-y min-h-[100px]`}
                  rows={4}
                  placeholder="Motivo del rechazo..."
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowRejectModal(false); setMotivoRechazo(''); }}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRechazar}
                    disabled={saving || !motivoRechazo.trim()}
                    className="inline-flex items-center justify-center px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 transition-opacity shadow-sm disabled:opacity-50"
                  >
                    {saving ? 'Rechazando...' : 'Confirmar rechazo'}
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
