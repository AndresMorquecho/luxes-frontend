import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Wrench, Package, RefreshCw, FileSpreadsheet, ArrowLeft, Download, Check, AlertCircle
} from 'lucide-react';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import { downloadProductoTemplate, parseProductoExcel } from '../application/productoExcelUtils.js';
import { downloadImportTemplate, importMaterialesBulk } from '../application/inventarioService.js';
import { getEmpleados } from '../../empleados/application/empleadosService.js';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import './ProductoFormModal.css';

export function ProductoFormModal({ item, unidades = [], onClose, onSave, onImportComplete }) {
  const isEdit = !!item;
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Type State ('herramienta' | 'consumible')
  const initialTipo = item?.tipo === 'herramienta' || item?.categoria === 'Taller' ? 'herramienta' : 'consumible';
  const [tipo, setTipo] = useState(initialTipo);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('form');
  const [isDragging, setIsDragging] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [empleados, setEmpleados] = useState([]);

  useEffect(() => {
    getEmpleados().then(data => setEmpleados(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

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
        aCargoId: item.aCargoId || item.aCargoEmpleado?.id || '',
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
      aCargoId: '',
      aCargo: '',
    };
  });

  // Assign default unit if empty
  useEffect(() => {
    if (!form.unidadMedidaId && unidades.length > 0) {
      const defUnit = tipo === 'herramienta' 
        ? unidades.find(u => u.nombre.toLowerCase().includes('unidad')) || unidades[0]
        : unidades[0];
      if (defUnit) {
        setForm(prev => ({
          ...prev,
          unidadMedidaId: defUnit.id,
          unidadMedida: defUnit.nombre
        }));
      }
    }
  }, [unidades, tipo, form.unidadMedidaId]);

  const set = (key, value) => setForm(prev => {
    const updated = { ...prev, [key]: value };
    if (key === 'estadoUso' && value === 'BODEGA') {
      updated.aCargo = '';
      updated.aCargoId = '';
    }
    return updated;
  });

  // Submit Handler
  async function handleSubmit(e, keepOpen = false) {
    if (e) e.preventDefault();
    if (!form.nombre.trim()) return;

    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo: tipo === 'herramienta' ? 'herramienta' : 'consumible',
        subtipo: tipo === 'herramienta' ? 'herramienta' : 'consumible_registro',
        categoria: tipo === 'herramienta' ? 'Taller' : 'General',
        descargaStock: tipo !== 'herramienta',
        esPrestable: tipo === 'herramienta',
        stockActual: parseFloat(form.stockActual) || 0,
        stockMinimo: Number(form.stockMinimo) || 0,
        precioCosto: parseFloat(form.precioCosto) || 0,
        unidadMedidaId: form.unidadMedidaId,
        unidadMedida: form.unidadMedida,
        codigo: form.codigo.trim() || undefined,
        ...(tipo === 'herramienta' ? {
          marca: form.marca.trim() || undefined,
          modelo: form.modelo.trim() || undefined,
          serie: form.serie.trim() || undefined,
          estadoUso: form.estadoUso,
          aCargoId: form.aCargoId || undefined,
          aCargo: form.aCargoId ? empleados.find(emp => emp.id === form.aCargoId)?.nombre : (form.aCargo.trim() || undefined),
        } : {}),
      };

      await onSave(payload, keepOpen);

      if (keepOpen) {
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
          aCargoId: '',
          aCargo: '',
        }));
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }
    } catch (err) {
      // Handled by toast in caller
    } finally {
      setSaving(false);
    }
  }

  const handleClose = () => deferClose(onClose);

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
      await downloadImportTemplate(tipo === 'herramienta' ? 'Taller' : 'General');
      toast.success('Plantilla descargada.');
    } catch {
      try {
        downloadProductoTemplate(tipo === 'herramienta' ? 'Taller' : 'General');
        toast.success('Plantilla descargada.');
      } catch (err) {
        toast.error(err.message || 'No se pudo descargar la plantilla.');
      }
    }
  };

  const processImportFile = async (file) => {
    if (!file) return;
    setParsing(true);
    setImportFile(file);
    try {
      const { rows, errors } = await parseProductoExcel(file, tipo === 'herramienta' ? 'Taller' : 'General', unidades);
      setImportRows(rows);
      setImportErrors(errors);
      if (rows.length === 0 && errors.length === 0) {
        toast.warning('El archivo no contiene filas.');
      } else if (errors.length > 0) {
        toast.warning(`${errors.length} fila(s) con errores. Revise antes de importar.`);
      } else {
        toast.success(`${rows.length} registros listos para importar.`);
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo leer el archivo Excel.');
      resetImportState();
    } finally {
      setParsing(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importRows.length) {
      toast.error('No hay registros válidos para importar.');
      return;
    }

    setImporting(true);
    try {
      const { created, failed } = await importMaterialesBulk(tipo === 'herramienta' ? 'Taller' : 'General', importRows);
      if (created.length > 0) {
        toast.success(`${created.length} registros importados correctamente.`);
        onImportComplete?.();
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} registros no se pudieron importar.`);
        setImportErrors(prev => [
          ...prev,
          ...failed.map(f => ({ line: f.line, nombre: f.nombre, messages: [f.message] })),
        ]);
      }
      if (failed.length === 0) {
        handleClose();
      }
    } catch (err) {
      toast.error(err.message || 'Error al importar.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="inv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="inv-modal pfm-modal-widescreen" onMouseDown={e => e.stopPropagation()}>
          
          <div className="inv-modal-header">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
              {isEdit ? 'Editar Registro de Inventario' : mode === 'import' ? 'Importar desde Excel' : 'Nuevo Registro de Inventario'}
            </h3>
            <button type="button" className="inv-close" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          {mode === 'import' && !isEdit ? (
            <div className="pfm-import-container">
              <div className="pfm-import-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="pfm-download-template-btn"
                  onClick={handleDownloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8125rem' }}
                >
                  <Download size={15} />
                  Descargar plantilla Excel
                </button>
              </div>

              <div
                className={`pfm-import-dropzone ${isDragging ? 'dragging' : ''} ${importFile ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processImportFile(f); }}
                onClick={() => !parsing && fileInputRef.current?.click()}
                style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) processImportFile(f); e.target.value = ''; }}
                />
                <FileSpreadsheet size={32} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>
                  {importFile ? importFile.name : 'Haz clic o arrastra un archivo Excel (.xlsx)'}
                </p>
              </div>

              {importRows.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check size={16} />
                  <span>{importRows.length} registros listos para importar</span>
                </div>
              )}

              <div className="pfm-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="inv-btn-ghost" onClick={switchToForm}>
                  <ArrowLeft size={14} /> Volver
                </button>
                <button
                  type="button"
                  className="inv-btn-primary"
                  disabled={importing || importRows.length === 0}
                  onClick={handleImportSubmit}
                >
                  {importing ? 'Importando…' : 'Importar ahora'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => handleSubmit(e, false)} className="pfm-widescreen-form">
              
              {!isEdit && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setTipo('herramienta')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: tipo === 'herramienta' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: tipo === 'herramienta' ? '#f0f9ff' : '#ffffff',
                      color: tipo === 'herramienta' ? '#0369a1' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: tipo === 'herramienta' ? '#e0f2fe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tipo === 'herramienta' ? '#0284c7' : '#64748b' }}>
                      <Wrench size={18} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9375rem' }}>Herramienta / Equipo</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Taladros, amoladoras, herramientas de taller</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipo('consumible')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: tipo === 'consumible' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      background: tipo === 'consumible' ? '#f0fdf4' : '#ffffff',
                      color: tipo === 'consumible' ? '#15803d' : '#475569',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: tipo === 'consumible' ? '#dcfce7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tipo === 'consumible' ? '#16a34a' : '#64748b' }}>
                      <Package size={18} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.9375rem' }}>Producto / Material</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Insumos, perfiles, productos a fabricar</span>
                    </div>
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="pfm-input-label">Nombre del {tipo === 'herramienta' ? 'equipo / herramienta' : 'producto / material'} *
                    <input
                      ref={nameInputRef}
                      required
                      value={form.nombre}
                      onChange={e => set('nombre', e.target.value)}
                      placeholder={tipo === 'herramienta' ? 'Ej: Taladro Percutor DeWalt 20V' : 'Ej: Perfil de Aluminio Serie 20 (3m)'}
                    />
                  </label>
                </div>

                <label className="pfm-input-label">Código / Referencia
                  <input
                    value={form.codigo}
                    onChange={e => set('codigo', e.target.value)}
                    placeholder={tipo === 'herramienta' ? 'Ej: HERR-001' : 'Ej: PROD-001'}
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

                <label className="pfm-input-label">Stock Actual / Cantidad *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0"
                    value={form.stockActual}
                    onChange={e => set('stockActual', e.target.value)}
                  />
                </label>

                <label className="pfm-input-label">Stock Mínimo (Alerta)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1"
                    value={form.stockMinimo}
                    onChange={e => set('stockMinimo', e.target.value)}
                  />
                </label>

                <label className="pfm-input-label">Costo / Precio ($)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.precioCosto}
                    onChange={e => set('precioCosto', e.target.value)}
                  />
                </label>

                {tipo === 'herramienta' && (
                  <label className="pfm-input-label">Marca / Modelo
                    <input
                      value={form.marca}
                      onChange={e => set('marca', e.target.value)}
                      placeholder="Ej: DeWalt, Bosch, Milwaukee"
                    />
                  </label>
                )}

                {tipo === 'herramienta' && (
                  <label className="pfm-input-label">Estado de la Herramienta
                    <select value={form.estadoUso} onChange={e => set('estadoUso', e.target.value)}>
                      <option value="BODEGA">En Bodega / Disponible</option>
                      <option value="EN USO">En Uso</option>
                      <option value="NO SIRVE">Dañada / No Sirve</option>
                      <option value="EN REPARACION">En Reparación</option>
                    </select>
                  </label>
                )}
              </div>

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
                  <button type="submit" className="inv-btn-primary" disabled={saving}>
                    {saving ? 'Guardando…' : isEdit ? 'Guardar Cambios' : 'Guardar'}
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
