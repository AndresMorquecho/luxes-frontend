import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Check, Wrench, Package, Monitor, Printer, Droplets,
  ScrollText, RefreshCw, UploadCloud, Download, FileSpreadsheet, ArrowLeft, AlertCircle
} from 'lucide-react';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import { downloadProductoTemplate, parseProductoExcel } from '../application/productoExcelUtils.js';
import { downloadImportTemplate, importMaterialesBulk } from '../application/inventarioService.js';
import { getEmpleados } from '../../empleados/application/empleadosService.js';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import './ProductoFormModal.css';

// ── Subtype Definitions ────────────────────────────────────────────────────
const SUBTYPES = {
  Taller: [
    {
      id: 'herramienta',
      name: 'Herramienta / Equipo',
      desc: 'Martillos, taladros, moladoras, etc. Se asigna y presta con responsable.',
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
      desc: 'Computadoras, sillas, mesas. Activos de la empresa.',
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

export function ProductoFormModal({ item, unidades = [], lockedCategory, onClose, onSave, onImportComplete }) {
  const isEdit = !!item;
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Resolve default category and subtype
  const defaultCategory = lockedCategory || item?.categoria || 'Taller';
  
  const resolveSubtype = (cat) => {
    const validSubs = SUBTYPES[cat] || [];
    if (item?.subtipo && validSubs.some(s => s.id === item.subtipo)) {
      return item.subtipo;
    }
    if (item?.tipo === 'herramienta' && validSubs.some(s => s.id === 'herramienta')) {
      return 'herramienta';
    }
    if (cat === 'Oficina') return 'activo_fijo';
    if (cat === 'Impresión') return 'consumible_descargable';
    return 'consumible_registro';
  };

  // ── State ──
  const [categoria, setCategoria] = useState(defaultCategory);
  const [subtipo, setSubtipo] = useState(() => resolveSubtype(defaultCategory));
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('form');
  const [isDragging, setIsDragging] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [empleados, setEmpleados] = useState([]);

  // Fetch employees on mount
  useEffect(() => {
    getEmpleados().then(data => setEmpleados(data || [])).catch(() => {});
  }, []);

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
        aCargoId: item.aCargoId || item.aCargoEmpleado?.id || '',
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
      aCargoId: '',
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
      updated.aCargoId = '';
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
          aCargoId: form.aCargoId || undefined,
          aCargo: form.aCargoId ? empleados.find(e => e.id === form.aCargoId)?.nombre : (form.aCargo.trim() || undefined),
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
          aCargoId: '',
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

  const resetImportState = () => {
    setImportFile(null);
    setImportRows([]);
    setImportErrors([]);
    setIsDragging(false);
  };

  const switchToImport = () => {
    resetImportState();
    setMode('import');
  };

  const switchToForm = () => {
    resetImportState();
    setMode('form');
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadImportTemplate(categoria);
      toast.success(`Plantilla de ${categoria} descargada.`);
    } catch (err) {
      try {
        downloadProductoTemplate(categoria);
        toast.success(`Plantilla de ${categoria} descargada.`);
      } catch {
        toast.error(err.message || 'No se pudo descargar la plantilla.');
      }
    }
  };

  const processImportFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Formato no válido. Use un archivo .xlsx, .xls o .csv');
      return;
    }

    setParsing(true);
    setImportFile(file);
    try {
      const { rows, errors } = await parseProductoExcel(file, categoria, unidades);
      setImportRows(rows);
      setImportErrors(errors);
      if (rows.length === 0 && errors.length === 0) {
        toast.warning('El archivo no contiene filas de productos.');
      } else if (errors.length > 0) {
        toast.warning(`${errors.length} fila(s) con errores. Revise antes de importar.`);
      } else {
        toast.success(`${rows.length} producto(s) listos para importar.`);
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo leer el archivo Excel.');
      resetImportState();
    } finally {
      setParsing(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImportFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processImportFile(file);
    e.target.value = '';
  };

  const handleImportSubmit = async () => {
    if (!importRows.length) {
      toast.error('No hay productos válidos para importar.');
      return;
    }

    setImporting(true);
    try {
      const { created, failed } = await importMaterialesBulk(categoria, importRows);
      if (created.length > 0) {
        toast.success(`${created.length} producto(s) importados correctamente.`);
        onImportComplete?.();
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} producto(s) no se pudieron importar.`);
        setImportErrors(prev => [
          ...prev,
          ...failed.map(f => ({ line: f.line, nombre: f.nombre, messages: [f.message] })),
        ]);
      }
      if (failed.length === 0) {
        handleClose();
      } else if (created.length > 0) {
        const failedLines = new Set(failed.map(f => f.line));
        setImportRows(prev => prev.filter(r => failedLines.has(r.line)));
      }
    } catch (err) {
      toast.error(err.message || 'Error al importar productos.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="inv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="inv-modal pfm-modal-widescreen" onMouseDown={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="inv-modal-header">
            <h3>
              {isEdit ? 'Editar Producto' : mode === 'import' ? 'Importar Productos desde Excel' : 'Registro de Producto Rápido'}
            </h3>
            <button type="button" className="inv-close" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          {mode === 'import' && !isEdit ? (
            <div className="pfm-import-container">
              <div className="pfm-import-toolbar">
                {!lockedCategory ? (
                  <div className="pfm-import-categories">
                    <p className="pfm-section-title">Sección o Destino</p>
                    <div className="pfm-inline-categories">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`pfm-inline-cat-btn ${categoria === cat.id ? 'selected' : ''}`}
                          onClick={() => {
                            setCategoria(cat.id);
                            resetImportState();
                          }}
                        >
                          <cat.Icon size={14} />
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pfm-import-locked-cat">
                    <p className="pfm-section-title">Sección</p>
                    <span className="pfm-import-cat-badge">{categoria}</span>
                  </div>
                )}

                <button
                  type="button"
                  className="pfm-download-template-btn"
                  onClick={handleDownloadTemplate}
                >
                  <Download size={15} />
                  Descargar plantilla ({categoria})
                </button>
              </div>

              <div
                className={`pfm-import-dropzone ${isDragging ? 'dragging' : ''} ${importFile ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleFileDrop}
                onClick={() => !parsing && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="pfm-import-file-input"
                  onChange={handleFileSelect}
                />
                {parsing ? (
                  <>
                    <RefreshCw size={28} className="pfm-spin pfm-import-icon" />
                    <p className="pfm-import-drop-title">Leyendo archivo…</p>
                  </>
                ) : importFile ? (
                  <>
                    <FileSpreadsheet size={28} className="pfm-import-icon file" />
                    <p className="pfm-import-drop-title">{importFile.name}</p>
                    <p className="pfm-import-drop-hint">Haz clic o arrastra otro archivo para reemplazar</p>
                  </>
                ) : (
                  <>
                    <UploadCloud size={32} className="pfm-import-icon" />
                    <p className="pfm-import-drop-title">Arrastra tu Excel aquí o haz clic para subir</p>
                    <p className="pfm-import-drop-hint">
                      Usa la plantilla de <strong>{categoria}</strong> con columnas de subtipo, nombre, cantidad y unidad
                    </p>
                  </>
                )}
              </div>

              {(importRows.length > 0 || importErrors.length > 0) && (
                <div className="pfm-import-preview">
                  {importRows.length > 0 && (
                    <div className="pfm-import-summary ok">
                      <Check size={14} />
                      <span>{importRows.length} producto(s) listos para importar</span>
                    </div>
                  )}
                  {importErrors.length > 0 && (
                    <div className="pfm-import-error-list">
                      <div className="pfm-import-summary error">
                        <AlertCircle size={14} />
                        <span>{importErrors.length} fila(s) con errores</span>
                      </div>
                      <ul>
                        {importErrors.slice(0, 6).map(err => (
                          <li key={`${err.line}-${err.nombre}`}>
                            Fila {err.line} — {err.nombre}: {err.messages.join(', ')}
                          </li>
                        ))}
                        {importErrors.length > 6 && (
                          <li className="pfm-import-more">… y {importErrors.length - 6} más</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="pfm-footer">
                <div className="pfm-footer-left">
                  <button type="button" className="inv-btn-ghost" onClick={handleClose} disabled={importing}>
                    Cancelar
                  </button>
                  <button type="button" className="pfm-back-form-btn" onClick={switchToForm} disabled={importing}>
                    <ArrowLeft size={14} />
                    Registro manual
                  </button>
                </div>
                <div className="pfm-footer-right">
                  <button
                    type="button"
                    className="inv-btn-primary"
                    disabled={importing || importRows.length === 0}
                    onClick={handleImportSubmit}
                  >
                    {importing ? 'Importando…' : `Importar ${importRows.length || ''} producto(s)`}
                  </button>
                </div>
              </div>
            </div>
          ) : (

          <form onSubmit={(e) => handleSubmit(e, false)} className="pfm-widescreen-form">
            
            <div className="pfm-body-grid">
              
              {/* Left Column: Classification selectors */}
              <div className="pfm-body-left">
                {!isEdit ? (
                  <div className="pfm-inline-selectors-box">
                    {/* Category Selector */}
                    {!lockedCategory && (
                      <div className="pfm-selector-group">
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

                    {/* Subtype Selector */}
                    <div className="pfm-selector-group">
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                        <span className="pfm-section-title">Ubicación del Producto</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                          <span>{categoria}</span>
                          <span style={{ color: '#94a3b8' }}>➔</span>
                          <span>{subtipoConfig.name}</span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.15rem 0 0', lineHeight: 1.3 }}>
                          {subtipoConfig.desc}
                        </p>
                      </div>
                    </div>
                  )
                )}

                {/* Behavior Rules & Help Cards */}
                {subtipoConfig && (
                  <div className="pfm-rules-card">
                    <p className="pfm-section-title">Reglas de Negocio Aplicadas</p>
                    <div className="pfm-rules-list">
                      <div className={`pfm-rule-item ${subtipoConfig.descargaStock ? 'active' : ''}`}>
                        <span className="pfm-rule-bullet"></span>
                        <div className="pfm-rule-text">
                          <strong>Descarga de Stock:</strong> {subtipoConfig.descargaStock ? 'Sí, se descontará automáticamente con los consumos y órdenes.' : 'No, solo se lleva un registro informativo/logístico.'}
                        </div>
                      </div>
                      <div className={`pfm-rule-item ${subtipoConfig.esPrestable ? 'active' : ''}`}>
                        <span className="pfm-rule-bullet"></span>
                        <div className="pfm-rule-text">
                          <strong>Asignación y Préstamo:</strong> {subtipoConfig.esPrestable ? 'Sí, requiere asignar un responsable al salir de bodega y genera devoluciones pendientes.' : 'No, no aplica para préstamos temporales.'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Inputs */}
              <div className="pfm-body-right">
                
                {/* Product Name */}
                <label className="pfm-input-label">Nombre del producto *
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

                {/* Inputs Grid */}
                <div className="pfm-inputs-subgrid">
                  
                  {/* Row 1: Stock and Unit */}
                  <label className="pfm-input-label">
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
                  <label className="pfm-input-label">Unidad de Medida *
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

                  {/* Row 2: Price and dynamic field */}
                  <label className="pfm-input-label">Precio Costo ($)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.precioCosto}
                      onChange={e => set('precioCosto', e.target.value)}
                    />
                  </label>

                  {subtipoConfig?.descargaStock ? (
                    <label className="pfm-input-label">Stock Mínimo
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.stockMinimo}
                        onChange={e => set('stockMinimo', e.target.value)}
                      />
                    </label>
                  ) : showHerramientaFields ? (
                    <label className="pfm-input-label">Código / Placa
                      <input
                        value={form.codigo}
                        onChange={e => set('codigo', e.target.value)}
                        placeholder="Ej: HER-001"
                      />
                    </label>
                  ) : (
                    <div className="pfm-empty-grid-slot" />
                  )}

                  {/* Additional rows if tool or fixed asset */}
                  {showHerramientaFields && (
                    <>
                      {/* Row 3: Marca and Modelo */}
                      <label className="pfm-input-label">Marca
                        <input
                          value={form.marca}
                          onChange={e => set('marca', e.target.value)}
                          placeholder="Ej: Bosch, Milwaukee"
                        />
                      </label>
                      <label className="pfm-input-label">Modelo
                        <input
                          value={form.modelo}
                          onChange={e => set('modelo', e.target.value)}
                          placeholder="Ej: GSB 18V"
                        />
                      </label>

                      {/* Row 4: Estado de Uso and Responsable */}
                      <label className="pfm-input-label">Estado de Uso
                        <select value={form.estadoUso} onChange={e => set('estadoUso', e.target.value)}>
                          <option value="BODEGA">En Bodega / Disponible</option>
                          <option value="EN USO">En Uso / Asignado</option>
                          <option value="NO SIRVE">No Sirve / Dañado</option>
                          <option value="EN REPARACION">En Reparación</option>
                        </select>
                      </label>
                      
                      {form.estadoUso !== 'BODEGA' ? (
                        <label className="pfm-input-label">Responsable Asignado
                          <select
                            value={form.aCargoId}
                            onChange={e => set('aCargoId', e.target.value)}
                          >
                            <option value="">-- Seleccionar empleado --</option>
                            {empleados.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <div className="pfm-empty-grid-slot" />
                      )}

                      {/* Row 5 (Span 2): Serie */}
                      <label className="pfm-input-label pfm-span-2">Serie o Características
                        <input
                          value={form.serie}
                          onChange={e => set('serie', e.target.value)}
                          placeholder="Ej: Serie A-9874, cargador extra..."
                        />
                      </label>
                    </>
                  )}

                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="pfm-footer">
              <div className="pfm-footer-left">
                <button type="button" className="inv-btn-ghost" onClick={handleClose} disabled={saving}>
                  Cancelar
                </button>
                {!isEdit && (
                  <button
                    type="button"
                    className="pfm-import-btn"
                    onClick={switchToImport}
                    disabled={saving}
                  >
                    <FileSpreadsheet size={14} />
                    Importar Excel
                  </button>
                )}
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
                    {saving ? <RefreshCw size={14} className="pfm-spin" /> : 'Guardar y agregar otro'}
                  </button>
                )}
                
                {/* Standard Save */}
                <button type="submit" className="inv-btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : isEdit ? 'Guardar Cambios' : 'Guardar y Cerrar'}
                </button>
              </div>
            </div>

          </form>
          )}

        </div>
      </div>
    </ModalPortal>
  );
}
