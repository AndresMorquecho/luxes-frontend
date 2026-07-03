import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Check, Wrench, Package, Monitor, Printer, Droplets,
  ScrollText, ArrowDownToLine, ArrowUpFromLine, RefreshCw
} from 'lucide-react';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import './ProductoFormModal.css';

// ── Subtype Definitions ────────────────────────────────────────────────────
const SUBTYPES = {
  Taller: [
    {
      id: 'herramienta',
      name: 'Herramienta / Equipo',
      desc: 'Martillos, taladros, moladoras, etc. Se presta/asigna a responsable.',
      Icon: Wrench,
      descargaStock: false,
      esPrestable: true,
      tipo: 'herramienta',
    },
    {
      id: 'consumible_registro',
      name: 'Consumible (solo registro)',
      desc: 'Tornillos, clavos, cintas. Se registra gasto pero no descarga inventario.',
      Icon: Package,
      descargaStock: false,
      esPrestable: false,
      tipo: 'consumible',
    },
  ],
  Oficina: [
    {
      id: 'activo_fijo',
      name: 'Activo fijo',
      desc: 'Computadoras, sillas, mesas. Patrimonio de la empresa.',
      Icon: Monitor,
      descargaStock: false,
      esPrestable: false,
      tipo: 'consumible',
    },
  ],
  'Impresión': [
    {
      id: 'consumible_descargable',
      name: 'Material descargable (rollos/lonas)',
      desc: 'Se descuenta del inventario por metraje de impresión.',
      Icon: ScrollText,
      descargaStock: true,
      esPrestable: false,
      tipo: 'consumible',
    },
    {
      id: 'consumible_registro',
      name: 'Material no rastreable (tintas)',
      desc: 'Se compra pero no se descarga automáticamente.',
      Icon: Droplets,
      descargaStock: false,
      esPrestable: false,
      tipo: 'consumible',
    },
  ],
};

const CATEGORIES = [
  { id: 'Taller', name: 'Taller', Icon: Wrench, cssClass: 'taller' },
  { id: 'Oficina', name: 'Oficina', Icon: Monitor, cssClass: 'oficina' },
  { id: 'Impresión', name: 'Impresión', Icon: Printer, cssClass: 'impresion' },
];

export function ProductoFormModal({ item, unidades = [], lockedCategory, onClose, onSave }) {
  const isEdit = !!item;
  const nameInputRef = useRef(null);

  // ── Resolve default category and subtype
  const defaultCategory = lockedCategory || item?.categoria || 'Taller';
  
  const resolveSubtype = (cat) => {
    if (item?.subtipo) return item.subtipo;
    if (item?.tipo === 'herramienta') return 'herramienta';
    if (cat === 'Oficina') return 'activo_fijo';
    if (cat === 'Impresión') return 'consumible_descargable';
    return 'consumible_registro';
  };

  // ── State ──
  const [categoria, setCategoria] = useState(defaultCategory);
  const [subtipo, setSubtipo] = useState(() => resolveSubtype(defaultCategory));
  const [saving, setSaving] = useState(false);

  // Auto-focus name field on mount
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // When category changes, auto-select the first subtype of that category
  const handleCategoryChange = (newCat) => {
    setCategoria(newCat);
    const subs = SUBTYPES[newCat] || [];
    if (subs.length > 0) {
      handleSubtypeSelect(subs[0]);
    }
  };

  const subtipoConfig = useMemo(() => {
    if (!categoria || !subtipo) return null;
    const subs = SUBTYPES[categoria] || [];
    return subs.find(s => s.id === subtipo) || null;
  }, [categoria, subtipo]);

  // Default unit calculation
  const defaultUnit = useMemo(() => {
    if (item?.unidadMedida?.id) {
      return unidades.find(u => u.id === (item.unidadMedidaId || item.unidadMedida?.id));
    }
    if (subtipo === 'herramienta' || subtipo === 'activo_fijo') {
      return unidades.find(u => u.nombre.toLowerCase() === 'unidades') || unidades[0];
    }
    return unidades.find(u => u.nombre.toLowerCase() === 'metros') || unidades[0];
  }, [unidades, subtipo, item]);

  // Form State
  const [form, setForm] = useState(() => {
    if (item) {
      return {
        nombre: item.nombre || '',
        stockActual: item.stockActual ?? 0,
        stockMinimo: item.stockMinimo ?? 0,
        precioCosto: item.precioCosto ?? 0,
        unidadMedidaId: item.unidadMedidaId || item.unidadMedida?.id || '',
        unidadMedida: item.unidadMedida?.nombre || '',
        codigo: item.codigo || '',
        marca: item.marca || '',
        modelo: item.modelo || '',
        serie: item.serie || '',
        estadoUso: item.estadoUso || 'BODEGA',
        aCargo: item.aCargo || '',
      };
    }
    return {
      nombre: '',
      stockActual: '',
      stockMinimo: 0,
      precioCosto: '',
      unidadMedidaId: '',
      unidadMedida: '',
      codigo: '',
      marca: '',
      modelo: '',
      serie: '',
      estadoUso: 'BODEGA',
      aCargo: '',
    };
  });

  // Assign unit once units are loaded
  useEffect(() => {
    if (!isEdit && defaultUnit && !form.unidadMedidaId) {
      setForm(prev => ({
        ...prev,
        unidadMedidaId: defaultUnit.id,
        unidadMedida: defaultUnit.nombre
      }));
    }
  }, [defaultUnit, unidades, isEdit, form.unidadMedidaId]);

  const set = (key, value) => setForm(prev => {
    const updated = { ...prev, [key]: value };
    if (key === 'estadoUso' && value === 'BODEGA') {
      updated.aCargo = '';
    }
    return updated;
  });

  const handleSubtypeSelect = (sub) => {
    setSubtipo(sub.id);
    if (!isEdit) {
      let unit;
      if (sub.id === 'herramienta' || sub.id === 'activo_fijo') {
        unit = unidades.find(u => u.nombre.toLowerCase() === 'unidades') || unidades[0];
      } else {
        unit = unidades.find(u => u.nombre.toLowerCase() === 'metros') || unidades[0];
      }
      if (unit) {
        setForm(f => ({ ...f, unidadMedidaId: unit.id, unidadMedida: unit.nombre }));
      }
    }
  };

  // Submit Handler
  async function handleSubmit(e, keepOpen = false) {
    if (e) e.preventDefault();
    if (!subtipoConfig) return;

    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo: subtipoConfig.tipo,
        subtipo: subtipoConfig.id,
        descargaStock: subtipoConfig.descargaStock,
        esPrestable: subtipoConfig.esPrestable,
        categoria: categoria,
        stockActual: parseFloat(form.stockActual) || 0,
        stockMinimo: Number(form.stockMinimo) || 0,
        precioCosto: parseFloat(form.precioCosto) || 0,
        unidadMedidaId: form.unidadMedidaId,
        unidadMedida: form.unidadMedida,
        // Herramienta/Activo Fijo specific fields
        ...((subtipo === 'herramienta' || subtipo === 'activo_fijo') ? {
          codigo: form.codigo.trim() || undefined,
          marca: form.marca.trim() || undefined,
          modelo: form.modelo.trim() || undefined,
          serie: form.serie.trim() || undefined,
          estadoUso: form.estadoUso,
          aCargo: form.aCargo.trim() || undefined,
        } : {}),
      };

      await onSave(payload, keepOpen);

      if (keepOpen) {
        // Reset name, stock, prices, etc. But preserve category, subtype, and unit
        setForm(prev => ({
          ...prev,
          nombre: '',
          stockActual: '',
          precioCosto: '',
          codigo: '',
          marca: '',
          modelo: '',
          serie: '',
          estadoUso: 'BODEGA',
          aCargo: '',
        }));
        
        // Re-focus the name field
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    } catch (err) {
      // Error handled by parent component / toast
    } finally {
      setSaving(false);
    }
  }

  const handleClose = () => deferClose(onClose);
  const showHerramientaFields = subtipo === 'herramienta' || subtipo === 'activo_fijo';

  return (
    <ModalPortal>
      <div className="inv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="inv-modal" style={{ maxWidth: '580px', maxHeight: '92vh' }} onMouseDown={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="inv-modal-header">
            <h3>{isEdit ? 'Editar Producto' : 'Registro de Producto Rápido'}</h3>
            <button type="button" className="inv-close" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={(e) => handleSubmit(e, false)} className="inv-modal-body" style={{ gap: '0.85rem' }}>
            
            {/* Inline selectors (Only if not editing) */}
            {!isEdit ? (
              <div className="pfm-inline-selectors-box">
                {/* Category Button Group */}
                {!lockedCategory && (
                  <div style={{ marginBottom: '0.65rem' }}>
                    <p className="pfm-section-title">Sección o Destino</p>
                    <div className="pfm-inline-categories">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`pfm-inline-cat-btn ${categoria === cat.id ? 'selected' : ''}`}
                          onClick={() => handleCategoryChange(cat.id)}
                        >
                          <cat.Icon size={14} />
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtype Pill Selector */}
                <div style={{ marginBottom: '0.25rem' }}>
                  <p className="pfm-section-title">Clasificación / Tipo</p>
                  <div className="pfm-inline-sub-row">
                    {(SUBTYPES[categoria] || []).map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        className={`pfm-inline-sub-btn ${subtipo === sub.id ? 'selected' : ''}`}
                        onClick={() => handleSubtypeSelect(sub)}
                      >
                        <sub.Icon size={13} />
                        <span>{sub.name}</span>
                      </button>
                    ))}
                  </div>
                  {subtipoConfig && (
                    <p className="pfm-sub-hint">{subtipoConfig.desc}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Static summary when editing */
              subtipoConfig && (
                <div className="pfm-summary-bar">
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{categoria}</span>
                  <span style={{ color: '#cbd5e1' }}>→</span>
                  <span>{subtipoConfig.name}</span>
                  <div className="pfm-behavior-tags" style={{ marginTop: 0, marginLeft: 'auto' }}>
                    <span className={`pfm-tag ${subtipoConfig.descargaStock ? 'descarga-si' : 'descarga-no'}`}>
                      {subtipoConfig.descargaStock ? 'Descarga stock' : 'Solo registro'}
                    </span>
                    {subtipoConfig.esPrestable && (
                      <span className="pfm-tag prestable-si">Prestable</span>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Behavior Tags display when creating */}
            {!isEdit && subtipoConfig && (
              <div className="pfm-behavior-tags" style={{ padding: '0 0.25rem' }}>
                <span className={`pfm-tag ${subtipoConfig.descargaStock ? 'descarga-si' : 'descarga-no'}`}>
                  {subtipoConfig.descargaStock ? <><ArrowDownToLine size={10} /> Descarga stock automáticamente</> : <><ArrowUpFromLine size={10} /> Solo registro (no descuenta del total)</>}
                </span>
                {subtipoConfig.esPrestable && (
                  <span className="pfm-tag prestable-si">
                    Asignación y Préstamo (con responsable)
                  </span>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div className="pfm-fields-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.8rem' }}>
              
              {/* Product Name */}
              <label>Nombre del producto *
                <input
                  ref={nameInputRef}
                  id="pfm-name-input"
                  required
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder={
                    subtipo === 'herramienta' ? 'Ej: Taladro percutor 18V' :
                    subtipo === 'activo_fijo' ? 'Ej: Silla ergonómica giratoria' :
                    subtipo === 'consumible_descargable' ? 'Ej: Rollo Vinil Mate 1.2m' :
                    'Ej: Tinta Cyan 1 litro'
                  }
                />
              </label>

              {/* Stock and Unit */}
              <div className="pfm-form-cols">
                <label>
                  {subtipoConfig?.descargaStock ? 'Stock Inicial *' : 'Cantidad Referencial'}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required={subtipoConfig?.descargaStock}
                    placeholder="0"
                    value={form.stockActual}
                    onChange={e => set('stockActual', e.target.value)}
                  />
                </label>
                <label>Unidad de Medida *
                  <select
                    required
                    value={form.unidadMedidaId || ''}
                    onChange={e => {
                      const selected = unidades.find(u => u.id === e.target.value);
                      setForm(f => ({
                        ...f,
                        unidadMedidaId: e.target.value,
                        unidadMedida: selected?.nombre || '',
                      }));
                    }}
                  >
                    <option value="" disabled>Seleccionar unidad</option>
                    {unidades.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} {u.abreviacion ? `(${u.abreviacion})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Price and Stock Limit */}
              <div className="pfm-form-cols">
                {subtipoConfig?.descargaStock ? (
                  <label>Stock Mínimo
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.stockMinimo}
                      onChange={e => set('stockMinimo', e.target.value)}
                    />
                  </label>
                ) : (
                  <div /> /* spacer */
                )}
                <label>Precio Costo ($)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.precioCosto}
                    onChange={e => set('precioCosto', e.target.value)}
                  />
                </label>
              </div>

              {/* Extra fields for tool/fixed assets */}
              {showHerramientaFields && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <div className="pfm-form-cols">
                    <label>Código / Placa
                      <input
                        value={form.codigo}
                        onChange={e => set('codigo', e.target.value)}
                        placeholder="Ej: HER-001"
                      />
                    </label>
                    <label>Marca
                      <input
                        value={form.marca}
                        onChange={e => set('marca', e.target.value)}
                        placeholder="Ej: Bosch, Milwaukee"
                      />
                    </label>
                  </div>
                  <div className="pfm-form-cols">
                    <label>Modelo
                      <input
                        value={form.modelo}
                        onChange={e => set('modelo', e.target.value)}
                        placeholder="Ej: GSB 18V"
                      />
                    </label>
                    <label>Estado de Uso
                      <select value={form.estadoUso} onChange={e => set('estadoUso', e.target.value)}>
                        <option value="BODEGA">En Bodega / Disponible</option>
                        <option value="EN USO">En Uso / Asignado</option>
                        <option value="NO SIRVE">No Sirve / Dañado</option>
                        <option value="EN REPARACION">En Reparación</option>
                      </select>
                    </label>
                  </div>
                  <label>Serie o Características
                    <input
                      value={form.serie}
                      onChange={e => set('serie', e.target.value)}
                      placeholder="Ej: Serie A-9874, cargador extra..."
                    />
                  </label>
                  {form.estadoUso !== 'BODEGA' && (
                    <label>Responsable Asignado
                      <input
                        value={form.aCargo}
                        onChange={e => set('aCargo', e.target.value)}
                        placeholder="Ej: Jimmy, Víctor, etc."
                      />
                    </label>
                  )}
                </div>
              )}

            </div>

            {/* Footer with multiple action paths */}
            <div className="pfm-footer" style={{ margin: '0.5rem -1.5rem -1.25rem', width: 'calc(100% + 3rem)' }}>
              <div className="pfm-footer-left">
                <button type="button" className="inv-btn-ghost" onClick={handleClose} disabled={saving}>
                  Cancelar
                </button>
              </div>
              <div className="pfm-footer-right">
                {/* Save and Add Another option (Only for creation) */}
                {!isEdit && (
                  <button
                    type="button"
                    className="inv-btn-secondary"
                    disabled={saving || !form.nombre.trim()}
                    onClick={() => handleSubmit(null, true)}
                    style={{ borderColor: '#3b82f6', color: '#1d4ed8' }}
                  >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : 'Guardar y agregar otro'}
                  </button>
                )}
                
                {/* Standard Save (Closes modal) */}
                <button type="submit" className="inv-btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : isEdit ? 'Guardar Cambios' : 'Guardar y Cerrar'}
                </button>
              </div>
            </div>
            
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
