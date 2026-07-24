import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Plus, X } from 'lucide-react';
import { getOrdenById, createOrden, updateOrden, editarOrden, getMetodosPago, getOrdenDetalles } from '../../application/comprasService';
import { 
  getMateriales, 
  buildMaterialesQuery, 
  normalizeMaterialesList,
  getUnidadesMedida,
  createMaterial
} from '../../../inventario/application/inventarioService';
import { getProyectos } from '../../../proyectos/application/proyectosService';
import './ComprasPage.css';
import { toast } from '../../../../shared/ui/components/Toast';
import { isAdminUser, isTallerUser } from '../../../../shared/utils/userRoleHelpers.js';
import { filterProyectosAsociables, isProyectoEnCurso } from '../../../proyectos/domain/proyectoDisplayUtils.js';
import { fmtMoney, isOrdenEditable, getOrdenNoEditableMensaje, mergeOrdenDetalles, mapDetallesToFormRows } from '../../helpers/ordenCompraHelpers.js';

const MATERIAL_SEARCH_LIMIT = 5;
const MIN_FILTER_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 350;

const inputClass =
  'w-full h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-60 disabled:cursor-not-allowed';
const labelClass = 'block text-xs font-semibold text-slate-500 mb-1.5';

export const FormOrdenCompraPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isTaller = isTallerUser(currentUser);
  const isAdmin = isAdminUser(currentUser);

  const [searchParams] = useSearchParams();
  const queryProyectoId = searchParams.get('proyectoId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  const [ordenEstado, setOrdenEstado] = useState('');
  const [ordenNumero, setOrdenNumero] = useState('');
  const [totalAnterior, setTotalAnterior] = useState(0);
  const [impuestoOrden, setImpuestoOrden] = useState(0);
  const [montoPagado, setMontoPagado] = useState(0);
  const [metodosPago, setMetodosPago] = useState([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [confirmPago, setConfirmPago] = useState({ monto: '', metodoPagoId: '', referencia: '' });
  const [form, setForm] = useState(() => {
    const defaultState = {
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      notas: '',
      detalles: [],
      proyectoId: queryProyectoId,
    };
    try {
      const preloaded = localStorage.getItem('preloaded_po_items');
      if (preloaded) {
        const parsed = JSON.parse(preloaded);
        localStorage.removeItem('preloaded_po_items');
        return {
          ...defaultState,
          concepto: parsed.concepto || '',
          proyectoId: parsed.proyectoId || queryProyectoId,
          detalles: parsed.detalles || [],
        };
      }
    } catch (e) {
      console.error('Error parsing preloaded_po_items:', e);
    }
    return defaultState;
  });
  const [itemInput, setItemInput] = useState({
    materialId: '',
    descripcion: '',
    cantidad: '1',
  });
  const [matDropdownOpen, setMatDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingMateriales, setSearchingMateriales] = useState(false);
  const searchRequestRef = useRef(0);

  const proyectosAsociables = useMemo(
    () => filterProyectosAsociables(proyectos, { incluirProyectoId: form.proyectoId || null }),
    [proyectos, form.proyectoId],
  );

  const editBloqueado = isEdit && !isOrdenEditable(ordenEstado);
  const adminEditaPrecios = isAdmin && isEdit && !editBloqueado;
  const adminVePrecios = isAdmin && isEdit;
  const usaEdicionReconciliada = isEdit && isAdmin && !editBloqueado;

  const proyectoLabel = useMemo(() => {
    if (!form.proyectoId) return null;
    const p = proyectos.find((pr) => pr.id === form.proyectoId);
    return p ? (p.nombre ? `${p.id} - ${p.nombre}` : p.id) : form.proyectoId;
  }, [form.proyectoId, proyectos]);

  const subtotalOrden = useMemo(
    () => form.detalles.reduce(
      (sum, d) => sum + (parseFloat(d.cantidad) || 0) * (parseFloat(d.precioUnitario) || 0),
      0,
    ),
    [form.detalles],
  );

  const totalNuevo = useMemo(
    () => subtotalOrden + (parseFloat(impuestoOrden) || 0),
    [subtotalOrden, impuestoOrden],
  );

  const diferenciaTotal = useMemo(
    () => totalNuevo - (parseFloat(totalAnterior) || 0),
    [totalNuevo, totalAnterior],
  );

  const nuevoSaldoPendiente = useMemo(
    () => Math.max(0, totalNuevo - (parseFloat(montoPagado) || 0)),
    [totalNuevo, montoPagado],
  );

  const abonoConfirmNum = parseFloat(confirmPago.monto) || 0;
  const hayCambioPrecio = Math.abs(diferenciaTotal) > 0.01;

  const tableColCount = useMemo(() => {
    let cols = 4;
    if (adminVePrecios) cols += 2;
    if (!editBloqueado) cols += 1;
    return cols;
  }, [adminVePrecios, editBloqueado]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const proyectosPromise = getProyectos({ limit: 100 }).catch(err => {
        console.error('Error al cargar proyectos:', err);
        return { data: [] };
      });

      const unidadesPromise = getUnidadesMedida().catch(err => {
        console.error('Error al cargar unidades:', err);
        return [];
      });

      if (isEdit) {
        const metodosPromise = isAdmin
          ? getMetodosPago().catch(() => [])
          : Promise.resolve([]);

        const [projResult, o, units, metodos, detallesApi] = await Promise.all([
          proyectosPromise,
          getOrdenById(id).catch(err => {
            console.error('Error al cargar la orden:', err);
            return null;
          }),
          unidadesPromise,
          metodosPromise,
          getOrdenDetalles(id).catch(() => []),
        ]);

        setProyectos(Array.isArray(projResult?.data) ? projResult.data : []);
        setUnidades(units);
        setMetodosPago(Array.isArray(metodos) ? metodos : []);

        const ordenMerged = mergeOrdenDetalles(o, detallesApi);

        if (ordenMerged) {
          setOrdenEstado(ordenMerged.estado || '');
          setOrdenNumero(ordenMerged.numero || '');
          setTotalAnterior(Number(ordenMerged.total) || 0);
          setImpuestoOrden(Number(ordenMerged.impuesto) || 0);
          setMontoPagado(Number(ordenMerged.cuentaPorPagar?.montoPagado) || 0);

          const filas = mapDetallesToFormRows(ordenMerged);
          setForm({
            fecha: ordenMerged.fecha ? new Date(ordenMerged.fecha).toISOString().split('T')[0] : '',
            concepto: ordenMerged.concepto || '',
            notas: ordenMerged.notas || '',
            detalles: filas,
            proyectoId: ordenMerged.proyectoId || '',
          });

          if (filas.length === 0) {
            window.setTimeout(() => {
              toast.error('Esta orden no tiene ítems cargados. Agrégalos manualmente o revisa en aprobación.');
            }, 0);
          }
        } else {
          toast.error('No se pudo cargar la orden de compra.');
        }
      } else {
        const [projResult, units] = await Promise.all([
          proyectosPromise,
          unidadesPromise
        ]);
        setProyectos(Array.isArray(projResult?.data) ? projResult.data : []);
        setUnidades(units);
      }
    } catch (err) {
      toast.error('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Nueva orden: no preseleccionar un proyecto ya terminado o cancelado
  useEffect(() => {
    if (loading || isEdit || !form.proyectoId || proyectos.length === 0) return;
    const selected = proyectos.find((p) => p.id === form.proyectoId);
    if (selected && !isProyectoEnCurso(selected)) {
      setForm((p) => ({ ...p, proyectoId: '' }));
    }
  }, [loading, isEdit, proyectos, form.proyectoId]);

  // Al abrir: muestra 5 productos. Al escribir 2+ caracteres: filtra en servidor.
  useEffect(() => {
    if (!matDropdownOpen) return undefined;

    const query = itemInput.descripcion.trim();
    const requestId = ++searchRequestRef.current;
    const delay = query.length >= MIN_FILTER_CHARS ? SEARCH_DEBOUNCE_MS : 0;

    const timer = setTimeout(async () => {
      setSearchingMateriales(true);
      try {
        const res = await getMateriales(buildMaterialesQuery({
          ...(query.length >= MIN_FILTER_CHARS ? { search: query } : {}),
          limit: MATERIAL_SEARCH_LIMIT,
          page: 1,
          tipo: 'consumible',
        }));
        if (requestId !== searchRequestRef.current) return;
        setSearchResults(normalizeMaterialesList(res).slice(0, MATERIAL_SEARCH_LIMIT));
      } catch (err) {
        if (requestId !== searchRequestRef.current) return;
        console.error('Error al buscar inventario:', err);
        setSearchResults([]);
      } finally {
        if (requestId === searchRequestRef.current) {
          setSearchingMateriales(false);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [itemInput.descripcion, matDropdownOpen]);

  const handleQuickCreateMaterial = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const nombreNuevo = itemInput.descripcion.trim();
    if (!nombreNuevo) return;

    // Obtener la categoría por defecto del usuario
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const rol = (user?.rol || 'visor').toLowerCase();
    
    let defaultCategory = 'Taller';
    if (rol.includes('impresion') || rol.includes('impresión')) {
      defaultCategory = 'Impresión';
    }

    // Buscar ID de unidad por defecto ('unidades' o el primero disponible)
    const defaultUnit = unidades.find(u => u.nombre.toLowerCase() === 'unidades') || unidades[0];
    const defaultUnitId = defaultUnit?.id || null;

    setCreatingMaterial(true);
    try {
      const payload = {
        nombre: nombreNuevo,
        tipo: 'consumible',
        categoria: defaultCategory,
        unidadMedidaId: defaultUnitId,
        stockActual: 0,
        stockMinimo: 0,
        precioCosto: 0,
        codigo: `MAT_${Date.now().toString().slice(-6)}`
      };

      const newMat = await createMaterial(payload);
      toast.success(`"${newMat.nombre}" ha sido registrado en el inventario.`);
      
      setItemInput({
        materialId: newMat.id,
        descripcion: newMat.nombre,
        cantidad: '1',
      });
      setMatDropdownOpen(false);
    } catch (err) {
      toast.error('Error al registrar material: ' + err.message);
    } finally {
      setCreatingMaterial(false);
    }
  };

  // Add Item from Top Line to Table - SIN PRECIOS
  const handleAddItem = () => {
    const qty = parseFloat(itemInput.cantidad) || 0;

    if (!itemInput.descripcion.trim()) {
      toast.error('La descripción no puede estar vacía.');
      return;
    }
    if (qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0.');
      return;
    }

    const isProyecto = !!form.proyectoId;
    if (isProyecto && !itemInput.materialId) {
      toast.error('Para compras asociadas a un proyecto, el material debe estar registrado en el inventario. Por favor, búscalo y elígelo o usa la opción rápida de registrar nuevo material.');
      return;
    }

    setForm(prev => ({
      ...prev,
      detalles: [
        ...prev.detalles,
        {
          lineId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          descripcion: itemInput.descripcion,
          cantidad: itemInput.cantidad,
          precioUnitario: adminEditaPrecios ? '0' : undefined,
          materialId: itemInput.materialId || null,
          isCustom: !itemInput.materialId
        }
      ]
    }));

    // Reset top input fields
    setItemInput({
      materialId: '',
      descripcion: '',
      cantidad: '1',
    });
  };

  const removeDetalle = (index) => {
    setForm(prev => ({ ...prev, detalles: prev.detalles.filter((_, i) => i !== index) }));
  };

  const updateDetalle = (index, field, val) => {
    setForm(prev => {
      const detalles = [...prev.detalles];
      detalles[index] = { ...detalles[index], [field]: val };
      return { ...prev, detalles };
    });
  };

  const handlePrecioChange = (index, rawValue) => {
    const val = String(rawValue ?? '');
    if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return;
    updateDetalle(index, 'precioUnitario', val);
  };

  const buildPayload = () => ({
    fecha: form.fecha,
    concepto: form.concepto,
    notas: form.notas,
    proyectoId: form.proyectoId || null,
    detalles: form.detalles.map((d) => ({
      descripcion: d.descripcion,
      cantidad: parseFloat(d.cantidad) || 0,
      materialId: d.materialId || null,
      ...(isEdit
        ? {
            precioUnitario: parseFloat(d.precioUnitario) || 0,
            ...(d.lineId && !String(d.lineId).startsWith('det-') ? { id: d.lineId } : {}),
            isCustom: !!d.isCustom,
          }
        : {}),
    })),
    ...(isEdit ? { impuesto: parseFloat(impuestoOrden) || 0 } : {}),
  });

  const validateForm = () => {
    if (editBloqueado) {
      toast.error(getOrdenNoEditableMensaje(ordenEstado));
      return false;
    }
    if (form.detalles.length === 0) {
      toast.error('Debe agregar al menos un item a la orden.');
      return false;
    }
    if (form.proyectoId && form.detalles.some((d) => d.isCustom || !d.materialId)) {
      toast.error('Esta orden está asociada a un proyecto y no puede contener materiales libres. Registra los materiales o remuévelos de la lista.');
      return false;
    }
    if (adminEditaPrecios && form.detalles.some((d) => !parseFloat(d.precioUnitario) || parseFloat(d.precioUnitario) <= 0)) {
      toast.error('Todos los items deben tener un precio unitario mayor a 0.');
      return false;
    }
    return true;
  };

  const openSaveConfirm = () => {
    const activeMethod = metodosPago.find((m) => m.activo);
    setConfirmPago({
      monto: totalNuevo > 0 ? totalNuevo.toFixed(2) : '',
      metodoPagoId: activeMethod?.id || '',
      referencia: '',
    });
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (abonoConfirmNum > 0 && !confirmPago.metodoPagoId) {
      toast.error('Selecciona un método de pago para registrar el abono.');
      return;
    }
    if (abonoConfirmNum > totalNuevo + 0.01) {
      toast.error(`El abono no puede exceder el total de la orden (${fmtMoney(totalNuevo)}).`);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (abonoConfirmNum > 0) {
        payload.abonoMonto = abonoConfirmNum;
        payload.metodoPagoId = confirmPago.metodoPagoId;
        payload.abonoReferencia = confirmPago.referencia.trim()
          || `Pago inicial - edición ${ordenNumero}`;
      }

      await editarOrden(id, payload);
      toast.success('Orden de compra actualizada con éxito');
      setShowSaveConfirm(false);
      navigate('/compras');
    } catch (err) {
      toast.error('Error al guardar la orden: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (usaEdicionReconciliada) {
      openSaveConfirm();
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await updateOrden(id, payload);
      } else {
        await createOrden(payload);
      }
      toast.success(isEdit ? 'Orden de compra actualizada con éxito' : 'Orden de compra creada con éxito');
      navigate('/compras');
    } catch (err) {
      toast.error('Error al guardar la orden: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const subtitle = editBloqueado
    ? getOrdenNoEditableMensaje(ordenEstado)
    : isEdit && isAdmin
      ? 'Modifica ítems, cantidades y precios de la orden.'
      : isEdit
        ? 'Modifica los ítems de la orden.'
        : 'Registra qué necesitas comprar (sin precios ni proveedores)';

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-5 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-8"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .fo-add-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .fo-add-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .fo-add-bar > div {
            width: 100% !important;
            min-width: 0 !important;
            flex: none !important;
          }
          .fo-add-bar button {
            width: 100% !important;
            margin-top: 4px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/compras')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            title="Volver"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
            <ShoppingCart className="w-5 h-5 text-blue-600" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">
                {isEdit ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                {isEdit ? 'Edición' : 'Nueva'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
        {editBloqueado && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            {getOrdenNoEditableMensaje(ordenEstado)}
          </div>
        )}

        {/* Información + Observaciones en una sola fila */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
          <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              Información de la orden
            </p>
            <div className="space-y-3">
              <div className="max-w-xs">
                <label className={labelClass}>Fecha de solicitud</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.fecha}
                  onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                  required
                  disabled={editBloqueado}
                />
              </div>
              <div>
                <label className={labelClass}>Concepto / Motivo de la compra</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Ej. Materiales para proyecto X, Reposición de stock..."
                  value={form.concepto}
                  onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                  disabled={editBloqueado}
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              Observaciones
            </p>
            <label className={labelClass}>Notas adicionales</label>
            <textarea
              className={`${inputClass} h-auto py-2.5 resize-y min-h-[108px]`}
              rows={4}
              placeholder="Notas adicionales sobre la orden..."
              value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              disabled={editBloqueado}
            />
          </div>
        </div>

        {/* Agregar ítem */}
        {!editBloqueado && (
          <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Agregar ítem a la orden
            </p>
            <div className="fo-add-bar">
              <div className="relative flex-[3] min-w-[220px]">
                <label className={labelClass}>Descripción del material/recurso</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Escribe o busca en inventario..."
                  value={itemInput.descripcion}
                  onChange={e => {
                    const val = e.target.value;
                    setItemInput(prev => ({
                      ...prev,
                      descripcion: val,
                      materialId: ''
                    }));
                    setMatDropdownOpen(true);
                  }}
                  onFocus={() => setMatDropdownOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      if (dropdownRef.current?.contains(document.activeElement)) return;
                      setMatDropdownOpen(false);
                    }, 120);
                  }}
                />
                {matDropdownOpen && (
                  <div className="co-search-dropdown co-search-dropdown--compact" ref={dropdownRef}>
                    {creatingMaterial ? (
                      <div className="px-3 py-4 text-xs text-slate-500 font-semibold text-center flex flex-col items-center gap-2">
                        <div className="co-spinner co-spinner-xs" style={{ width: '16px', height: '16px', borderTopColor: '#6366f1' }} />
                        Registrando material en el catálogo...
                      </div>
                    ) : searchingMateriales ? (
                      <div className="px-3 py-2 text-xs text-slate-400 text-center">
                        Cargando productos...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((m) => (
                          <div
                            key={m.id}
                            className="co-search-item"
                            onMouseDown={() => {
                              setItemInput((prev) => ({
                                ...prev,
                                materialId: m.id,
                                descripcion: m.nombre,
                              }));
                              setMatDropdownOpen(false);
                            }}
                          >
                            <div className="font-semibold text-slate-800">{m.nombre}</div>
                            <div className="text-slate-400 text-[10px]">
                              Existencias: {m.stockActual ?? 0}
                              {m.categoria ? ` · ${m.categoria}` : ''}
                            </div>
                          </div>
                        ))}
                        {itemInput.descripcion.trim().length >= MIN_FILTER_CHARS && (
                          <div
                            className="co-search-item co-search-item--create font-bold text-indigo-600 border-t border-slate-100"
                            style={{ background: '#f8fafc', padding: '10px 12px' }}
                            onMouseDown={handleQuickCreateMaterial}
                          >
                            <div>+ Registrar &quot;{itemInput.descripcion.trim()}&quot; en el Inventario</div>
                            <div className="text-[9px] text-slate-400 font-normal">Crear automáticamente con stock 0</div>
                          </div>
                        )}
                        {itemInput.descripcion.trim().length < MIN_FILTER_CHARS && (
                          <div className="co-search-hint">
                            Escribe para buscar entre más productos
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-3 py-4 text-center">
                        <div className="text-xs text-slate-400 mb-2">Sin coincidencias en el catálogo.</div>
                        {itemInput.descripcion.trim().length >= MIN_FILTER_CHARS ? (
                          <button
                            type="button"
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                            onMouseDown={handleQuickCreateMaterial}
                          >
                            + Registrar &quot;{itemInput.descripcion.trim()}&quot; en el Inventario
                          </button>
                        ) : (
                          <div className="text-[10px] text-slate-400">Escribe al menos 2 caracteres para buscar o registrar</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-[110px]">
                <label className={labelClass}>Cantidad</label>
                <input
                  type="number"
                  className={`${inputClass} text-center`}
                  min="0.01"
                  step="0.01"
                  value={itemInput.cantidad}
                  onChange={e => setItemInput(prev => ({ ...prev, cantidad: e.target.value }))}
                  onWheel={e => e.target.blur()}
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm shrink-0"
              >
                <Plus size={15} />
                Agregar
              </button>
            </div>
          </div>
        )}

        {/* Tabla de ítems */}
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-800">Ítems de la orden</h3>
            <span className="text-xs font-medium text-gray-400">
              {form.detalles.length} {form.detalles.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-center w-[60px]">N°</th>
                  <th className="px-4 py-3 w-[120px]">Tipo</th>
                  <th className="px-4 py-3">Descripción / Material</th>
                  <th className="px-4 py-3 text-center w-[140px]">Cantidad</th>
                  {adminVePrecios && (
                    <>
                      <th className="px-4 py-3 text-right w-[140px]">Precio unit.</th>
                      <th className="px-4 py-3 text-right w-[120px]">Subtotal</th>
                    </>
                  )}
                  {!editBloqueado && (
                    <th className="px-4 py-3 text-center w-24">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.detalles.map((d, index) => {
                  const lineSubtotal = (parseFloat(d.cantidad) || 0) * (parseFloat(d.precioUnitario) || 0);
                  const rowKey = d.lineId || `${d.materialId || 'custom'}-${d.descripcion}-${index}`;
                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-center font-semibold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${d.isCustom ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>
                          {d.isCustom ? 'Libre' : 'Inventario'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {d.isCustom && !editBloqueado ? (
                          <input
                            type="text"
                            className={`${inputClass} !h-9`}
                            value={d.descripcion}
                            onChange={e => updateDetalle(index, 'descripcion', e.target.value)}
                            required
                          />
                        ) : (
                          <span className="font-medium text-slate-800">{d.descripcion}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editBloqueado ? (
                          <span className="block text-center font-semibold text-slate-700">{d.cantidad}</span>
                        ) : (
                          <input
                            type="number"
                            className={`${inputClass} text-center mx-auto !h-9`}
                            style={{ width: '100px' }}
                            min="0.01"
                            step="0.01"
                            value={d.cantidad}
                            onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                            required
                            onWheel={e => e.target.blur()}
                          />
                        )}
                      </td>
                      {adminVePrecios && (
                        <>
                          <td className="px-4 py-3 text-right">
                            {adminEditaPrecios ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className={`${inputClass} text-right !h-9`}
                                style={{ maxWidth: '130px', marginLeft: 'auto' }}
                                value={d.precioUnitario ?? ''}
                                onChange={(e) => handlePrecioChange(index, e.target.value)}
                                placeholder="0.00"
                                required
                                autoComplete="off"
                              />
                            ) : (
                              <span className="font-semibold text-slate-700">{fmtMoney(d.precioUnitario)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">{fmtMoney(lineSubtotal)}</td>
                        </>
                      )}
                      {!editBloqueado && (
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeDetalle(index)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Eliminar ítem"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!form.detalles.length && (
                  <tr>
                    <td colSpan={tableColCount} className="px-4 py-16 text-center text-slate-400 text-sm">
                      No hay ítems agregados. Usa la barra superior para agregar ítems.
                    </td>
                  </tr>
                )}
                {adminVePrecios && form.detalles.length > 0 && (
                  <tr className="bg-slate-50/40">
                    <td colSpan={5} className="px-4 py-3 text-right font-semibold text-slate-500 text-sm">Total orden</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">{fmtMoney(totalNuevo)}</td>
                    {!editBloqueado && <td />}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ajuste financiero al editar precios */}
        {adminEditaPrecios && form.detalles.length > 0 && (
          <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
              Ajuste financiero
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total anterior</p>
                <p className="text-sm font-bold text-slate-700 mt-1 tabular-nums">{fmtMoney(totalAnterior)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total nuevo</p>
                <p className="text-sm font-bold text-slate-900 mt-1 tabular-nums">{fmtMoney(totalNuevo)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Diferencia</p>
                <p className={`text-sm font-bold mt-1 tabular-nums ${diferenciaTotal > 0 ? 'text-orange-600' : diferenciaTotal < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                  {diferenciaTotal > 0 ? '+' : ''}{fmtMoney(diferenciaTotal)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Ya pagado</p>
                <p className="text-sm font-bold text-slate-700 mt-1 tabular-nums">{fmtMoney(montoPagado)}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Nuevo saldo pendiente</span>
                <span className="text-base font-bold text-slate-900 tabular-nums">{fmtMoney(nuevoSaldoPendiente)}</span>
              </div>
              <p className="text-[11px] font-medium mt-2 min-h-[16px]">
                {diferenciaTotal < -0.01 ? (
                  <span className="text-green-700">
                    El total bajó. Al guardar se creará una nueva orden y los pagos anteriores se revertirán automáticamente.
                  </span>
                ) : hayCambioPrecio && diferenciaTotal > 0.01 ? (
                  <span className="text-orange-700">
                    El total aumentó en {fmtMoney(diferenciaTotal)}. Al confirmar podrás registrar el pago de la nueva orden.
                  </span>
                ) : montoPagado > 0 ? (
                  <span className="text-slate-600">
                    Esta orden tiene pagos registrados. Al guardar se anulará la orden actual y podrás registrar el pago de la nueva.
                  </span>
                ) : (
                  <span className="text-slate-400">Revisa los totales antes de guardar los cambios.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/compras')}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          {!editBloqueado && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar orden'}
            </button>
          )}
        </div>
      </form>

      {showSaveConfirm && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => !saving && setShowSaveConfirm(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl flex flex-col border border-slate-200 max-h-[min(780px,92vh)] overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Confirmar edición e inicializar pago</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    La orden anterior se anulará y se creará una nueva con los cambios aplicados
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setShowSaveConfirm(false)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                  disabled={saving}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="co-modal-body overflow-y-auto">
                {montoPagado > 0 && (
                  <div className="co-modal-edit-alert">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold mb-0.5">Información de reversión</p>
                      <p className="font-medium">
                        Se devolvieron {fmtMoney(montoPagado)} a las cuentas de origen al anular la orden anterior.
                        Puedes registrar aquí el pago de la nueva orden o dejar el saldo en cuenta por pagar.
                      </p>
                    </div>
                  </div>
                )}

                <div className="co-modal-grid-2col">
                  <div className="co-modal-col-left">
                    <div className="co-modal-summary-card">
                      <p className="co-modal-summary-card__title">Resumen de nueva orden</p>
                      <div className="co-modal-summary-row">
                        <span>Orden original</span>
                        <span className="font-mono">{ordenNumero || '—'}</span>
                      </div>
                      <div className="co-modal-summary-row">
                        <span>Concepto</span>
                        <span>{form.concepto?.trim() || 'Sin concepto'}</span>
                      </div>
                      {proyectoLabel && (
                        <div className="co-modal-summary-row">
                          <span>Proyecto</span>
                          <span>{proyectoLabel}</span>
                        </div>
                      )}
                      {Math.abs(diferenciaTotal) > 0.01 && (
                        <div className="co-modal-summary-row">
                          <span>Total anterior</span>
                          <span>{fmtMoney(totalAnterior)}</span>
                        </div>
                      )}
                      <div className="co-modal-summary-row co-modal-summary-total">
                        <span>Total nueva orden</span>
                        <span>{fmtMoney(totalNuevo)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="co-modal-col-right">
                    <div className="co-modal-payment-stack">
                      <div>
                        <label className={labelClass}>Cuenta / método de pago</label>
                        <select
                          className={inputClass}
                          value={confirmPago.metodoPagoId}
                          onChange={(e) => setConfirmPago((p) => ({ ...p, metodoPagoId: e.target.value }))}
                          disabled={!(abonoConfirmNum > 0) || saving}
                          style={{ background: abonoConfirmNum > 0 ? '#fff' : '#f8fafc' }}
                        >
                          <option value="">
                            {abonoConfirmNum > 0 ? 'Selecciona cuenta...' : 'No requiere (sin abono)'}
                          </option>
                          {metodosPago.filter((m) => m.activo).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} — Saldo: {fmtMoney(m.saldoActual || 0)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className={`${labelClass} !mb-0`}>Monto a pagar ($)</label>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                            onClick={() => setConfirmPago((p) => ({
                              ...p,
                              monto: totalNuevo.toFixed(2),
                              metodoPagoId: p.metodoPagoId || metodosPago.find((m) => m.activo)?.id || '',
                            }))}
                          >
                            Copiar total
                          </button>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={inputClass}
                          value={confirmPago.monto}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== '' && !/^\d*\.?\d{0,2}$/.test(val)) return;
                            setConfirmPago((p) => ({ ...p, monto: val }));
                          }}
                          placeholder="0.00 (opcional)"
                          disabled={saving}
                          autoComplete="off"
                        />
                        {abonoConfirmNum > totalNuevo + 0.01 && (
                          <p className="text-[10.5px] font-semibold text-red-600 mt-1">
                            El abono no puede exceder {fmtMoney(totalNuevo)}.
                          </p>
                        )}
                        {abonoConfirmNum <= 0 && (
                          <p className="text-[10.5px] font-medium text-slate-500 mt-1">
                            Deja en 0 para registrar la orden como cuenta por pagar.
                          </p>
                        )}
                        {abonoConfirmNum > 0 && abonoConfirmNum < totalNuevo - 0.01 && (
                          <p className="text-[10.5px] font-medium text-blue-600 mt-1">
                            Abono parcial. Saldo de {fmtMoney(totalNuevo - abonoConfirmNum)} quedará pendiente.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Referencia / nota de pago</label>
                        <input
                          type="text"
                          className={inputClass}
                          value={confirmPago.referencia}
                          onChange={(e) => setConfirmPago((p) => ({ ...p, referencia: e.target.value }))}
                          placeholder="No. transferencia, cheque..."
                          disabled={!(abonoConfirmNum > 0) || saving}
                          style={{ background: abonoConfirmNum > 0 ? '#fff' : '#f8fafc' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowSaveConfirm(false)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={saving || abonoConfirmNum > totalNuevo + 0.01}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50 min-w-[160px]"
                >
                  {saving ? 'Guardando...' : 'Confirmar guardar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
