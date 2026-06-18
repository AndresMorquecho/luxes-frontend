import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { getOrdenById, createOrden, updateOrden } from '../../application/comprasService';
import { getMateriales } from '../../../inventario/application/inventarioService';
import { getProyectos } from '../../../proyectos/application/proyectosService';
import './ComprasPage.css';
import { toast } from '../../../../shared/ui/components/Toast';

export const FormOrdenCompraPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [searchParams] = useSearchParams();
  const queryProyectoId = searchParams.get('proyectoId') || '';

  const [proyectos, setProyectos] = useState([]);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    notas: '',
    detalles: [],
    proyectoId: queryProyectoId,
  });

  // Top Bar input state - SIN PRECIOS
  const [itemInput, setItemInput] = useState({
    materialId: '',
    descripcion: '',
    cantidad: '1',
  });

  // Search combobox auto-suggest states
  const [matDropdownOpen, setMatDropdownOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const matResult = await getMateriales({ limit: 100 });
      const matList = matResult.items || matResult || [];
      setMateriales(matList);

      try {
        const projResult = await getProyectos({ limit: 200 });
        setProyectos(projResult.data || projResult || []);
      } catch (pErr) {
        console.error('Error al cargar proyectos:', pErr);
      }

      if (isEdit) {
        const o = await getOrdenById(id);
        if (o) {
          setForm({
            fecha: o.fecha ? new Date(o.fecha).toISOString().split('T')[0] : '',
            concepto: o.concepto || '',
            notas: o.notas || '',
            detalles: o.detalles && o.detalles.length > 0
              ? o.detalles.map(d => ({
                  descripcion: d.descripcion,
                  cantidad: d.cantidad,
                  materialId: d.materialId || null,
                  isCustom: !d.materialId
                }))
              : [],
            proyectoId: o.proyectoId || '',
          });
        }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.detalles.length === 0) {
      toast.error('Debe agregar al menos un item a la orden.');
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
          descripcion: d.descripcion,
          cantidad: parseFloat(d.cantidad) || 0,
          materialId: d.materialId || null
        })),
      };

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
              {isEdit ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
            </h1>
            <p className="co-subtitle">
              {isEdit ? 'Modifica los items de la orden' : 'Registra qué necesitas comprar (sin precios ni proveedores)'}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="co-label">No. de Orden</label>
              <div className="co-input bg-slate-50 font-mono text-xs font-semibold flex items-center h-[38px] text-slate-400 px-4 border border-slate-200/80" style={{ borderRadius: '10px' }}>
                {isEdit ? `ORC-${id}` : 'ORC-XXX (Autogenerado)'}
              </div>
            </div>
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
                {proyectos.map(p => (
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
                onBlur={() => setTimeout(() => setMatDropdownOpen(false), 200)}
              />
              {matDropdownOpen && (
                <div className="co-search-dropdown">
                  {materiales
                    .filter(m => m.nombre.toLowerCase().includes(itemInput.descripcion.toLowerCase()))
                    .map(m => (
                      <div
                        key={m.id}
                        className="co-search-item"
                        onMouseDown={() => {
                          setItemInput(prev => ({
                            ...prev,
                            materialId: m.id,
                            descripcion: m.nombre,
                          }));
                          setMatDropdownOpen(false);
                        }}
                      >
                        <div className="font-semibold text-slate-800">{m.nombre}</div>
                        <div className="text-slate-400 text-[10px]">Stock: {m.stockActual}</div>
                      </div>
                    ))}
                  {materiales.filter(m => m.nombre.toLowerCase().includes(itemInput.descripcion.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-400 text-center">
                      Material nuevo (texto libre)
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
                <th className="text-center" style={{ width: '80px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {form.detalles.map((d, index) => (
                <tr key={index}>
                  <td className="text-center font-bold text-slate-400">{index + 1}</td>
                  <td>
                    <span className={`co-badge-pill ${d.isCustom ? 'co-badge-pill-slate' : 'co-badge-pill-blue'}`}>
                      {d.isCustom ? 'Libre' : 'Inventario'}
                    </span>
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
                      className="co-table-input text-center mx-auto"
                      style={{ width: '100px' }}
                      min="0.01"
                      step="0.01"
                      value={d.cantidad}
                      onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                      required
                      onWheel={e => e.target.blur()}
                    />
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => removeDetalle(index)}
                      className="co-table-remove-btn"
                      title="Eliminar item"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {form.detalles.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400 font-medium text-sm">
                    No hay items agregados. Usa la barra superior para agregar items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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
