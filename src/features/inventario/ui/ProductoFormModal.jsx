import React, { useState, useMemo } from 'react';
import {
  X, Check, Wrench, Package, Monitor, Printer, Droplets,
  ScrollText, ChevronLeft, ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import './ProductoFormModal.css';

// ── Subtype Definitions ────────────────────────────────────────────────────
const SUBTYPES = {
  Taller: [
    {
      id: 'herramienta',
      name: 'Herramienta / Equipo',
      desc: 'Martillos, taladros, moladoras, etc. Se asigna responsable.',
      Icon: Wrench,
      descargaStock: false,
      esPrestable: true,
      tipo: 'herramienta',
    },
    {
      id: 'consumible_registro',
      name: 'Consumible (solo registro)',
      desc: 'Tornillos, clavos, cintas. Se registra uso pero no se descarga stock.',
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
      desc: 'Se compra y se descuenta del inventario por metraje.',
      Icon: ScrollText,
      descargaStock: true,
      esPrestable: false,
      tipo: 'consumible',
    },
    {
      id: 'consumible_registro',
      name: 'Material no rastreable (tintas)',
      desc: 'Se compra pero no se puede rastrear consumo exacto.',
      Icon: Droplets,
      descargaStock: false,
      esPrestable: false,
      tipo: 'consumible',
    },
  ],
};

const CATEGORIES = [
  {
    id: 'Taller',
    name: 'Taller',
    desc: 'Herramientas y materiales de instalación',
    Icon: Wrench,
    cssClass: 'taller',
  },
  {
    id: 'Oficina',
    name: 'Oficina',
    desc: 'Activos fijos de la empresa',
    Icon: Monitor,
    cssClass: 'oficina',
  },
  {
    id: 'Impresión',
    name: 'Impresión',
    desc: 'Materiales e insumos de impresión',
    Icon: Printer,
    cssClass: 'impresion',
  },
];

// ── Component ──────────────────────────────────────────────────────────────
export function ProductoFormModal({ item, unidades = [], lockedCategory, onClose, onSave }) {
  const isEdit = !!item;

  // ── Resolve default subtype for existing items
  const resolveSubtype = () => {
    if (item?.subtipo) return item.subtipo;
    if (item?.tipo === 'herramienta') return 'herramienta';
    if (item?.categoria === 'Oficina') return 'activo_fijo';
    if (item?.categoria === 'Impresión') return 'consumible_descargable';
    return 'consumible_registro';
  };

  // ── State ──
  const [step, setStep] = useState(isEdit ? 3 : 1);
  const [categoria, setCategoria] = useState(lockedCategory || item?.categoria || '');
  const [subtipo, setSubtipo] = useState(isEdit ? resolveSubtype() : '');
  const [saving, setSaving] = useState(false);

  // Resolve subtype config
  const subtipoConfig = useMemo(() => {
    if (!categoria || !subtipo) return null;
    const subs = SUBTYPES[categoria] || [];
    return subs.find(s => s.id === subtipo) || null;
  }, [categoria, subtipo]);

  // ── Form fields ──
  const defaultUnit = useMemo(() => {
    if (item?.unidadMedida?.id) {
      return unidades.find(u => u.id === (item.unidadMedidaId || item.unidadMedida?.id));
    }
    if (subtipo === 'herramienta' || subtipo === 'activo_fijo') {
      return unidades.find(u => u.nombre.toLowerCase() === 'unidades') || unidades[0];
    }
    return unidades.find(u => u.nombre.toLowerCase() === 'metros') || unidades[0];
  }, [unidades, subtipo, item]);

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
      unidadMedidaId: defaultUnit?.id || '',
      unidadMedida: defaultUnit?.nombre || '',
      codigo: '',
      marca: '',
      modelo: '',
      serie: '',
      estadoUso: 'BODEGA',
      aCargo: '',
    };
  });

  const set = (key, value) => setForm(prev => {
    const updated = { ...prev, [key]: value };
    if (key === 'estadoUso' && value === 'BODEGA') {
      updated.aCargo = '';
    }
    return updated;
  });

  // ── When subtype changes, update the default unit
  const handleSubtypeSelect = (sub) => {
    setSubtipo(sub.id);
    // Auto-update unit of measure based on subtype
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

  // ── Submit ──
  async function handleSubmit(e) {
    e.preventDefault();
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
        // Herramienta-specific
        ...(subtipo === 'herramienta' || subtipo === 'activo_fijo' ? {
          codigo: form.codigo.trim() || undefined,
          marca: form.marca.trim() || undefined,
          modelo: form.modelo.trim() || undefined,
          serie: form.serie.trim() || undefined,
          estadoUso: form.estadoUso,
          aCargo: form.aCargo.trim() || undefined,
        } : {}),
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  }

  const handleClose = () => deferClose(onClose);

  // ── Navigation ──
  const canNext = () => {
    if (step === 1) return !!categoria;
    if (step === 2) return !!subtipo;
    return true;
  };

  const goNext = () => {
    if (step === 1 && categoria) {
      // If category has only one subtype, skip step 2
      const subs = SUBTYPES[categoria] || [];
      if (subs.length === 1) {
        handleSubtypeSelect(subs[0]);
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2 && subtipo) {
      setStep(3);
    }
  };

  const goBack = () => {
    if (step === 3) {
      const subs = SUBTYPES[categoria] || [];
      if (subs.length === 1) {
        setSubtipo('');
        setStep(1);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      setSubtipo('');
      setStep(1);
    }
  };

  // ── Render ──
  const showHerramientaFields = subtipo === 'herramienta' || subtipo === 'activo_fijo';

  return (
    <ModalPortal>
      <div className="inv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="inv-modal" style={{ maxWidth: step === 3 ? '580px' : '540px' }} onMouseDown={e => e.stopPropagation()}>
          {/* Header */}
          <div className="inv-modal-header">
            <h3>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <button type="button" className="inv-close" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          {/* Step Indicator */}
          {!isEdit && (
            <div className="pfm-steps">
              <div className={`pfm-step-dot ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`} />
              <div className={`pfm-step-line ${step > 1 ? 'done' : ''}`} />
              <div className={`pfm-step-dot ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}`} />
              <div className={`pfm-step-line ${step > 2 ? 'done' : ''}`} />
              <div className={`pfm-step-dot ${step >= 3 ? 'active' : ''}`} />
            </div>
          )}

          {/* Step 1: Category Selection */}
          {step === 1 && (
            <div className="inv-modal-body pfm-step-content">
              <p className="pfm-section-title">¿A qué sección pertenece?</p>
              <div className="pfm-category-grid">
                {CATEGORIES.map(cat => (
                  <div
                    key={cat.id}
                    className={`pfm-cat-card ${categoria === cat.id ? 'selected' : ''}`}
                    onClick={() => {
                      setCategoria(cat.id);
                      setSubtipo('');
                    }}
                  >
                    {categoria === cat.id && (
                      <span className="pfm-cat-check"><Check size={12} /></span>
                    )}
                    <div className={`pfm-cat-icon ${cat.cssClass}`}>
                      <cat.Icon size={22} />
                    </div>
                    <span className="pfm-cat-name">{cat.name}</span>
                    <span className="pfm-cat-desc">{cat.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Subtype Selection */}
          {step === 2 && (
            <div className="inv-modal-body pfm-step-content">
              <p className="pfm-section-title">¿Qué tipo de producto es?</p>
              <div className="pfm-subtype-grid">
                {(SUBTYPES[categoria] || []).map(sub => (
                  <div
                    key={sub.id}
                    className={`pfm-sub-card ${subtipo === sub.id ? 'selected' : ''}`}
                    onClick={() => handleSubtypeSelect(sub)}
                  >
                    <div className="pfm-sub-icon">
                      <sub.Icon size={18} />
                    </div>
                    <div className="pfm-sub-text">
                      <div className="pfm-sub-name">{sub.name}</div>
                      <div className="pfm-sub-desc">{sub.desc}</div>
                      <div className="pfm-behavior-tags">
                        <span className={`pfm-tag ${sub.descargaStock ? 'descarga-si' : 'descarga-no'}`}>
                          {sub.descargaStock ? <><ArrowDownToLine size={10} /> Descarga stock</> : <><ArrowUpFromLine size={10} /> Solo registro</>}
                        </span>
                        {sub.esPrestable && (
                          <span className="pfm-tag prestable-si">
                            Prestable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Form Fields */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="inv-modal-body pfm-step-content">
              {/* Summary bar showing selection */}
              {subtipoConfig && (
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
              )}

              {/* Name */}
              <label>Nombre del producto *
                <input
                  required
                  autoFocus
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder={
                    subtipo === 'herramienta' ? 'Ej: Taladro percutor 18V' :
                    subtipo === 'activo_fijo' ? 'Ej: Laptop Dell Latitude 5520' :
                    subtipo === 'consumible_descargable' ? 'Ej: Vinilo laminación mate 1.2m' :
                    'Ej: Tinta Cyan 1 litro'
                  }
                />
              </label>

              {/* Stock & Unit */}
              <div className="pfm-form-cols">
                <label>
                  {subtipoConfig?.descargaStock ? 'Stock actual *' : 'Cantidad referencial'}
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
                <label>Unidad de medida *
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

              {/* Stock mínimo & Precio */}
              <div className="pfm-form-cols">
                {subtipoConfig?.descargaStock && (
                  <label>Stock mínimo
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.stockMinimo}
                      onChange={e => set('stockMinimo', e.target.value)}
                    />
                  </label>
                )}
                <label>Precio costo ($)
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

              {/* Herramienta / Activo fijo specific fields */}
              {showHerramientaFields && (
                <>
                  <div className="pfm-form-cols">
                    <label>Código inventario / barra
                      <input
                        value={form.codigo}
                        onChange={e => set('codigo', e.target.value)}
                        placeholder="Ej: ADC001"
                      />
                    </label>
                    <label>Marca
                      <input
                        value={form.marca}
                        onChange={e => set('marca', e.target.value)}
                        placeholder="Ej: Milwaukee"
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
                    <label>Estado de uso
                      <select value={form.estadoUso} onChange={e => set('estadoUso', e.target.value)}>
                        <option value="BODEGA">En Bodega / Disponible</option>
                        <option value="EN USO">En Uso / Asignado</option>
                        <option value="NO SIRVE">No Sirve / Dañado</option>
                        <option value="EN REPARACION">En Reparación</option>
                      </select>
                    </label>
                  </div>
                  <label>Serie / Características / Descripción
                    <input
                      value={form.serie}
                      onChange={e => set('serie', e.target.value)}
                      placeholder="Ej: 19.5 LED, 7 diagonal cutting plier..."
                    />
                  </label>
                  {form.estadoUso !== 'BODEGA' && (
                    <label>A cargo de
                      <input
                        value={form.aCargo}
                        onChange={e => set('aCargo', e.target.value)}
                        placeholder="Ej: Jimmy, Víctor, etc."
                      />
                    </label>
                  )}
                </>
              )}

              {/* Footer inside form for step 3 */}
              <div className="pfm-footer" style={{ margin: '0 -1.5rem -1.25rem', width: 'calc(100% + 3rem)' }}>
                <div className="pfm-footer-left">
                  {!isEdit && (
                    <button type="button" className="pfm-btn-back" onClick={goBack}>
                      <ChevronLeft size={14} /> Atrás
                    </button>
                  )}
                </div>
                <div className="pfm-footer-right">
                  <button type="button" className="inv-btn-ghost" onClick={handleClose} disabled={saving}>
                    Cancelar
                  </button>
                  <button type="submit" className="inv-btn-primary" disabled={saving}>
                    {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear producto'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Footer for steps 1 & 2 */}
          {step < 3 && (
            <div className="pfm-footer">
              <div className="pfm-footer-left">
                {step > 1 && (
                  <button type="button" className="pfm-btn-back" onClick={goBack}>
                    <ChevronLeft size={14} /> Atrás
                  </button>
                )}
              </div>
              <div className="pfm-footer-right">
                <button type="button" className="inv-btn-ghost" onClick={handleClose}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="inv-btn-primary"
                  disabled={!canNext()}
                  onClick={goNext}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
