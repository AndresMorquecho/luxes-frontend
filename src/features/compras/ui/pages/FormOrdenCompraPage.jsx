import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { getOrdenById, createOrden, updateOrden, editarOrden } from '../../application/comprasService';
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

const MATERIAL_SEARCH_LIMIT = 5;
const MIN_FILTER_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 350;

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
  const [ordenOriginal, setOrdenOriginal] = useState(null); // Para el panel de ajuste financiero
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
        const [projResult, o, units] = await Promise.all([
          proyectosPromise,
          getOrdenById(id).catch(err => {
            console.error('Error al cargar la orden:', err);
            return null;
          }),
          unidadesPromise
        ]);

        setProyectos(Array.isArray(projResult?.data) ? projResult.data : []);
        setUnidades(units);

        if (o) {
          setOrdenOriginal(o);
          setForm({
            fecha: o.fecha ? new Date(o.fecha).toISOString().split('T')[0] : '',
            concepto: o.concepto || '',
            notas: o.notas || '',
            detalles: o.detalles && o.detalles.length > 0
              ? o.detalles.map(d => ({
                  id: d.id, // Preservar ID para reconciliación
                  descripcion: d.descripcion,
                  cantidad: d.cantidad,
                  precioUnitario: d.precioUnitario ?? 0, // Cargar precio existente
                  materialId: d.materialId || null,
                  isCustom: !d.materialId,
                  cantidadRecibida: d.cantidadRecibida ?? 0, // Para saber si está bloqueado
                }))
              : [],
            proyectoId: o.proyectoId || '',
          });
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
  }, [id, isEdit]);

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
          descripcion: itemInput.descripcion,
          cantidad: itemInput.cantidad,
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

  // Calcular totales para el panel de ajuste financiero
  const totalAnterior = ordenOriginal?.total ?? 0;
  const montoPagado = ordenOriginal?.cuentaPorPagar?.montoPagado ?? 0;
  const totalNuevo = form.detalles.reduce((sum, d) => sum + (parseFloat(d.cantidad) || 0) * (parseFloat(d.precioUnitario) || 0), 0);
  const diferencia = totalNuevo - totalAnterior;
  const nuevoSaldo = Math.max(0, totalNuevo - montoPagado);
  const esSaldoAFavor = totalNuevo < montoPagado;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.detalles.length === 0) {
      toast.error('Debe agregar al menos un item a la orden.');
      return;
    }

    if (form.proyectoId && form.detalles.some(d => d.isCustom || !d.materialId)) {
      toast.error('Esta orden está asociada a un proyecto y no puede contener materiales libres. Registra los materiales o remuévelos de la lista.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fecha: form.fecha,
        concepto: form.concepto,
        notas: form.notas,
        proyectoId: form.proyectoId || null,
        detalles: form.detalles.map(d => ({
          id: d.id || undefined,
          descripcion: d.descripcion,
          cantidad: parseFloat(d.cantidad) || 0,
          precioUnitario: isAdmin && isEdit ? (parseFloat(d.precioUnitario) || 0) : 0,
          materialId: d.materialId || null,
          isCustom: d.isCustom,
        })),
      };

      if (isEdit) {
        if (isAdmin) {
          // Admin: usa el endpoint de reconciliación financiera
          await editarOrden(id, { ...payload, impuesto: 0 });
        } else {
          // Creador pendiente: actualización simple sin precios
          await updateOrden(id, payload);
        }
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

  if (loading) {
    return (
      <div className="co-page animate-slide-up">
        <div className="co-card co-loader-box">
          <div className="co-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="co-page animate-slide-up">
      {/* Header */}
      <div className="co-card co-header" style={{ border: '1.5px solid #cbd5e1', background: '#ffffff' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="co-title" style={{ color: '#1e293b', fontWeight: 800 }}>
              {isEdit ? (isAdmin ? 'Editar Orden de Compra' : 'Modificar mi Solicitud') : 'Nueva Orden de Compra'}
            </h1>
            <p className="co-subtitle">
              {isEdit 
                ? (isAdmin 
                  ? 'Modifica ítems, cantidades y precios. Los pagos previos se reconcilian automáticamente.'
                  : 'Modifica los ítems de tu solicitud (aún pendiente de aprobación)')
                : 'Registra qué necesitas comprar (sin precios ni proveedores)'}
            </p>
          </div>
        </div>
        <Link to="/compras" className="co-btn-ghost" style={{ color: '#2563eb', fontWeight: 700 }}>
          ← Volver
        </Link>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Encabezado Card */}
        <div className="co-card p-5" style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
            Información de la Orden
          </div>
          <div className={`grid grid-cols-1 gap-4 ${isTaller || isAdmin || isEdit ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {!isTaller && !isAdmin && !isEdit && (
              <div>
                <label className="co-label">No. de Orden</label>
                <div className="co-input bg-slate-50 font-mono text-xs font-semibold flex items-center h-[38px] text-slate-400 px-4 border border-slate-200/80" style={{ borderRadius: '10px' }}>
                  ORC-XXX (Autogenerado)
                </div>
              </div>
            )}
            <div>
              <label className="co-label">Fecha de Solicitud</label>
              <input
                type="date"
                className="co-input"
                value={form.fecha}
                onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="co-label">Proyecto Asociado</label>
              <select
                className="co-input bg-white"
                style={{ height: '38px', borderRadius: '10px', padding: '0 10px', fontSize: '13px' }}
                value={form.proyectoId || ''}
                onChange={e => setForm(p => ({ ...p, proyectoId: e.target.value }))}
              >
                <option value="">-- Sin Proyecto (Gasto General) --</option>
                {proyectosAsociables.map(p => (
                  <option key={p.id} value={p.id}>{p.id} - {p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="co-label">Concepto / Motivo de la Compra</label>
            <input
              type="text"
              className="co-input"
              placeholder="Ej. Materiales para proyecto X, Reposición de stock..."
              value={form.concepto}
              onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
            />
          </div>
        </div>

        {/* Item Entry Bar */}
        <div className="p-5" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px' }}>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Agregar Item a la Orden
          </div>
          <div className="flex flex-wrap items-end gap-3">
            
            {/* Description with Autocomplete */}
            <div className="relative flex-1 min-w-[280px]">
              <label className="co-label">Descripción del Material/Recurso</label>
              <input
                type="text"
                className="co-input"
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
                      <div className="co-spinner co-spinner-xs" style={{ width: '16px', height: '16px', borderTopColor: '#6366f1' }}></div>
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
                          <div>+ Registrar "{itemInput.descripcion.trim()}" en el Inventario</div>
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
                          + Registrar "{itemInput.descripcion.trim()}" en el Inventario
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
              <label className="co-label">Cantidad</label>
              <input
                type="number"
                className="co-input text-center"
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
              className="co-add-btn-moderate h-[38px] shrink-0"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="co-items-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '60px' }}>N°</th>
                <th style={{ width: '130px' }}>Tipo</th>
                <th>Descripción / Material</th>
                <th className="text-center" style={{ width: '150px' }}>Cantidad</th>
                {isAdmin && isEdit && (
                  <th className="text-right" style={{ width: '130px' }}>Precio Unit.</th>
                )}
                {isAdmin && isEdit && (
                  <th className="text-right" style={{ width: '110px' }}>Subtotal</th>
                )}
                <th className="text-center" style={{ width: '80px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {form.detalles.map((d, index) => {
                const fueRecepcionado = (d.cantidadRecibida ?? 0) > 0;
                const esInventario = !!d.materialId;
                const cantidadBloqueada = isEdit && fueRecepcionado && esInventario;
                const eliminacionBloqueada = isEdit && fueRecepcionado && esInventario;
                const subtotalFila = (parseFloat(d.cantidad) || 0) * (parseFloat(d.precioUnitario) || 0);

                return (
                  <tr key={index} style={cantidadBloqueada ? { background: '#f8fafc' } : {}}>
                    <td className="text-center font-bold text-slate-400">{index + 1}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className={`co-badge-pill ${d.isCustom ? 'co-badge-pill-slate' : 'co-badge-pill-blue'}`}>
                          {d.isCustom ? 'Libre' : 'Inventario'}
                        </span>
                        {cantidadBloqueada && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-fit">
                            ✓ Recibido
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {d.isCustom ? (
                        <input
                          type="text"
                          className="co-table-input w-full"
                          value={d.descripcion}
                          onChange={e => updateDetalle(index, 'descripcion', e.target.value)}
                          required
                        />
                      ) : (
                        <span className="font-semibold text-slate-700">{d.descripcion}</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        className={`co-table-input text-center mx-auto ${cantidadBloqueada ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                        style={{ width: '100px' }}
                        min="0.01"
                        step="0.01"
                        value={d.cantidad}
                        onChange={e => !cantidadBloqueada && updateDetalle(index, 'cantidad', e.target.value)}
                        readOnly={cantidadBloqueada}
                        title={cantidadBloqueada ? 'Cantidad bloqueada: este ítem ya fue recibido en inventario' : undefined}
                        required
                        onWheel={e => e.target.blur()}
                      />
                    </td>
                    {isAdmin && isEdit && (
                      <td>
                        <input
                          type="number"
                          className="co-table-input text-right mx-auto"
                          style={{ width: '110px' }}
                          min="0"
                          step="0.01"
                          value={d.precioUnitario ?? ''}
                          onChange={e => updateDetalle(index, 'precioUnitario', e.target.value)}
                          placeholder="0.00"
                          onWheel={e => e.target.blur()}
                        />
                      </td>
                    )}
                    {isAdmin && isEdit && (
                      <td className="text-right font-semibold text-slate-700 pr-3">
                        ${subtotalFila.toFixed(2)}
                      </td>
                    )}
                    <td className="text-center">
                      {eliminacionBloqueada ? (
                        <span 
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-300 cursor-not-allowed"
                          title="No se puede eliminar: ítem ya recibido en inventario"
                        >
                          🔒
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeDetalle(index)}
                          className="co-table-remove-btn"
                          title="Eliminar item"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {form.detalles.length === 0 && (
                <tr>
                  <td colSpan={isAdmin && isEdit ? 7 : 5} className="text-center py-16 text-slate-400 font-medium text-sm">
                    No hay items agregados. Usa la barra superior para agregar items.
                  </td>
                </tr>
              )}
              {isAdmin && isEdit && form.detalles.length > 0 && (
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                  <td colSpan={4} />
                  <td className="text-right text-xs font-bold text-slate-500 uppercase pr-2 py-3">Total orden</td>
                  <td className="text-right font-bold text-slate-800 text-base pr-3">${totalNuevo.toFixed(2)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Panel de Ajuste Financiero - Solo para admin en modo edición */}
        {isAdmin && isEdit && ordenOriginal && (
          <div className="co-card p-5" style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              Ajuste Financiero
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total anterior</div>
                <div className="text-lg font-bold text-slate-700">${totalAnterior.toFixed(2)}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Total nuevo</div>
                <div className="text-lg font-bold text-blue-700">${totalNuevo.toFixed(2)}</div>
              </div>
              <div className={`rounded-xl p-3 border ${diferencia > 0 ? 'bg-red-50 border-red-100' : diferencia < 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${diferencia > 0 ? 'text-red-400' : diferencia < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>Diferencia</div>
                <div className={`text-lg font-bold ${diferencia > 0 ? 'text-red-700' : diferencia < 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)}
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Ya pagado</div>
                <div className="text-lg font-bold text-amber-700">${montoPagado.toFixed(2)}</div>
              </div>
            </div>
            {montoPagado > 0 && (
              <div className={`mt-3 p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${esSaldoAFavor ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {esSaldoAFavor ? (
                  <>
                    <span>✅</span>
                    <span>Saldo a favor del cliente/proveedor: <strong>${(montoPagado - totalNuevo).toFixed(2)}</strong>. El historial de pagos se preserva; la CxP quedará en $0.00.</span>
                  </>
                ) : (
                  <>
                    <span>💳</span>
                    <span>Nuevo saldo pendiente de pago: <strong>${nuevoSaldo.toFixed(2)}</strong>. Los abonos previos de <strong>${montoPagado.toFixed(2)}</strong> se conservan en el historial.</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes and Submit */}
        <div className="flex flex-wrap md:flex-nowrap gap-6">
          <div className="flex-1">
            <label className="co-label">Observaciones</label>
            <textarea
              className="co-input co-textarea"
              style={{ borderRadius: '10px' }}
              rows={3}
              placeholder="Notas adicionales sobre la orden..."
              value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-end gap-3 shrink-0 self-end mt-4">
            <button 
              type="button" 
              onClick={() => navigate('/compras')} 
              className="co-btn-ghost" 
              style={{ fontWeight: 600 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="co-btn-primary"
              style={{ padding: '12px 30px', borderRadius: '10px' }}
            >
              {saving ? 'Guardando...' : 'Guardar Orden'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
