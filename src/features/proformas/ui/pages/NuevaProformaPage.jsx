import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getClientes } from '../../../clientes/application/clientesService';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { saveProforma, getProformaById } from '../../application/proformasService';
import { ProformaPDF } from '../components/ProformaPDF';
import { toast } from '../../../../shared/ui/components/Toast';
import '../../../compras/ui/pages/ComprasPage.css';

const EMPTY_PROFORMA = {
  clienteId: '',
  cliente: '',
  telefono: '',
  email: '',
  fecha: new Date().toISOString().split('T')[0],
  vencimiento: '',
  diasValidez: 3,
  atiende: '',
  condiciones: '',
  iva: 0.12,
  notas: '',
  estado: 'Pendiente',
  items: [],
};

export const NuevaProformaPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY_PROFORMA);
  const [clientes, setClientes] = useState([]);
  const [configuracion, setConfiguracion] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  // Search states for dropdowns
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [showMoreClientData, setShowMoreClientData] = useState(false);

  // Top Bar input state for adding item to table
  const [itemInput, setItemInput] = useState({
    descripcion: '',
    cantidad: '1',
    precioUnitario: '0',
  });

  // Get current logged-in user
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [cList, config] = await Promise.all([
          getClientes(),
          getConfiguracion().catch(() => null),
        ]);
        setClientes(cList);
        setConfiguracion(config);

        if (isEdit) {
          const existing = await getProformaById(id);
          if (existing) {
            const related = cList.find(c => c.nombre === existing.cliente);
            setForm({
              ...existing,
              clienteId: related?.id || existing.clienteId || '',
              items: existing.items.map(i => ({ ...i })),
            });
            setClienteSearch(existing.cliente);
          } else {
            toast.error('No se encontro la proforma especificada');
            navigate('/proformas');
          }
        } else {
          // New Proforma - Apply Defaults
          const today = new Date();
          const valDays = config?.diasValidez ?? 3;
          const venc = new Date(today);
          venc.setDate(today.getDate() + valDays);

          setForm({
            ...EMPTY_PROFORMA,
            fecha: today.toISOString().split('T')[0],
            vencimiento: venc.toISOString().split('T')[0],
            diasValidez: valDays,
            atiende: currentUser.nombre || '',
            condiciones: config?.condicionesPago || '',
          });
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar datos necesarios');
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'fecha') {
      setForm(prev => {
        const next = { ...prev, [name]: value };
        const days = next.diasValidez;
        const emit = new Date(value);
        emit.setDate(emit.getDate() + Number(days));
        next.vencimiento = emit.toISOString().split('T')[0];
        return next;
      });
    } else if (name === 'diasValidez') {
      const days = Number(value);
      setForm(prev => {
        const next = { ...prev, [name]: days };
        const emit = new Date(next.fecha);
        emit.setDate(emit.getDate() + days);
        next.vencimiento = emit.toISOString().split('T')[0];
        return next;
      });
    } else if (name === 'vencimiento') {
      setForm(prev => {
        const next = { ...prev, [name]: value };
        const emit = new Date(next.fecha);
        const venc = new Date(value);
        const diffTime = venc - emit;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        next.diasValidez = diffDays >= 0 ? diffDays : 0;
        return next;
      });
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const selectCliente = (c) => {
    setForm(prev => ({
      ...prev,
      clienteId: c.id,
      cliente: c.nombre,
      telefono: c.telefono || prev.telefono,
      email: c.email || prev.email,
    }));
    setClienteSearch(c.nombre);
    setClienteDropdownOpen(false);
  };

  const handleAddItem = () => {
    const qty = parseFloat(itemInput.cantidad) || 0;
    const price = parseFloat(itemInput.precioUnitario) || 0;

    if (!itemInput.descripcion.trim()) {
      toast.error('La descripcion no puede estar vacia.');
      return;
    }
    if (qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0.');
      return;
    }
    if (price < 0) {
      toast.error('El precio unitario no puede ser negativo.');
      return;
    }

    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          descripcion: itemInput.descripcion,
          cantidad: qty,
          precioUnitario: price,
        }
      ]
    }));

    // Reset input fields
    setItemInput({
      descripcion: '',
      cantidad: '1',
      precioUnitario: '0',
    });
  };

  const updateDetalle = (index, field, val) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: val };
      return { ...prev, items };
    });
  };

  const removeItem = (index) => {
    setForm(prev => ({ 
      ...prev, 
      items: prev.items.filter((_, i) => i !== index) 
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.cliente) {
      toast.error('Por favor seleccione un cliente.');
      return;
    }
    if (form.items.length === 0) {
      toast.error('Debe agregar al menos un item a la tabla antes de guardar.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        iva: Number(form.iva),
        diasValidez: Number(form.diasValidez),
        items: form.items.map(it => ({
          descripcion: it.descripcion,
          cantidad: parseFloat(it.cantidad) || 0,
          precioUnitario: parseFloat(it.precioUnitario) || 0,
        }))
      };
      
      const saved = await saveProforma(payload);
      toast.success(isEdit ? 'Proforma actualizada con exito' : 'Proforma creada con exito');
      setPreview(saved);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar la proforma');
    } finally {
      setSaving(false);
    }
  };

  const subTotal = form.items.reduce((s, i) => s + (parseFloat(i.cantidad) || 0) * (parseFloat(i.precioUnitario) || 0), 0);
  const ivaVal = subTotal * form.iva;
  const total = subTotal + ivaVal;

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

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
              {isEdit ? 'Editar Proforma' : 'Nueva Proforma'}
            </h1>
            <p className="co-subtitle">
              {isEdit ? 'Modifica los datos de la proforma seleccionada' : 'Completa la cotización para el cliente'}
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/proformas')} className="co-btn-ghost" style={{ color: '#2563eb', fontWeight: 700 }}>
          Volver al listado
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Encabezado and Valores split grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Encabezado Card */}
          <div className="co-card lg:col-span-3 p-4" style={{ background: '#fff', border: '1.5px solid #e2e8f0', overflow: 'visible' }}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1.5">
              Informacion de la Proforma
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              
              <div className="relative md:col-span-2 lg:col-span-2">
                <label className="co-label">Cliente *</label>
                <input
                  type="text"
                  className="co-input"
                  placeholder="Buscar cliente..."
                  value={clienteSearch}
                  onChange={e => {
                    setClienteSearch(e.target.value);
                    setClienteDropdownOpen(true);
                    const found = clientes.find(c => c.nombre === e.target.value);
                    setForm(prev => ({ ...prev, clienteId: found ? found.id : '', cliente: e.target.value }));
                  }}
                  onFocus={() => setClienteDropdownOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setClienteDropdownOpen(false), 200);
                  }}
                />
                {clienteDropdownOpen && (
                  <div className="co-search-dropdown">
                    {clientes
                      .filter(c => {
                        const term = clienteSearch.toLowerCase();
                        return c.nombre.toLowerCase().includes(term) || (c.cedulaRuc && c.cedulaRuc.includes(term));
                      })
                      .map(c => (
                        <div
                          key={c.id}
                          className="co-search-item"
                          onMouseDown={() => selectCliente(c)}
                        >
                          <div className="font-semibold text-slate-800">{c.nombre}</div>
                          <div className="text-slate-400 text-[10px]">RUC: {c.cedulaRuc || 'N/A'} | Tel: {c.telefono || 'N/A'}</div>
                        </div>
                      ))}
                    {clientes.filter(c => {
                      const term = clienteSearch.toLowerCase();
                      return c.nombre.toLowerCase().includes(term);
                    }).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-400 text-center">Cliente nuevo (escribe nombre libre)</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="co-label">Fecha de Emision *</label>
                <input
                  name="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={handleChange}
                  required
                  className="co-input"
                />
              </div>

              <div>
                <label className="co-label">Dias de validez *</label>
                <input
                  name="diasValidez"
                  type="number"
                  min={0}
                  value={form.diasValidez}
                  onChange={handleChange}
                  required
                  className="co-input"
                />
              </div>

              <div>
                <label className="co-label">Fecha de vencimiento *</label>
                <input
                  name="vencimiento"
                  type="date"
                  value={form.vencimiento}
                  onChange={handleChange}
                  required
                  className="co-input"
                />
              </div>

            </div>

            {/* Accordion Toggle */}
            <div className="border-t border-slate-100 pt-2 mt-2">
              <button
                type="button"
                onClick={() => setShowMoreClientData(!showMoreClientData)}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-1 focus:outline-none"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${showMoreClientData ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                {showMoreClientData ? 'Ocultar datos de contacto' : 'Ver más datos del cliente (Teléfono, Email, etc.)'}
              </button>
            </div>

            {showMoreClientData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100/60 animate-slide-up">
                <div>
                  <label className="co-label">Telefono Cliente *</label>
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    required
                    placeholder="Ej. 0991234567"
                    className="co-input"
                  />
                </div>

                <div>
                  <label className="co-label">Email Cliente</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Ej. cliente@correo.com"
                    className="co-input"
                  />
                </div>

                <div>
                  <label className="co-label">Atiende *</label>
                  <input
                    name="atiende"
                    value={form.atiende}
                    onChange={handleChange}
                    required
                    readOnly
                    className="co-input bg-slate-50 text-slate-400 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Valores Summary Card */}
          <div className="co-card p-4 flex flex-col justify-between" style={{ background: '#fff', border: '1.5px solid #e2e8f0' }}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1.5">
              Valores de la Proforma
            </div>
            <div className="space-y-3 flex-1 justify-center flex flex-col">
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Subtotal:</span>
                <span className="font-bold text-slate-800 text-sm">{formatUSD(subTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-2">
                  IVA (%):
                  <select
                    name="iva"
                    value={form.iva}
                    onChange={e => setForm(p => ({ ...p, iva: parseFloat(e.target.value) }))}
                    className="co-input"
                    style={{ width: '70px', padding: '2px 8px', display: 'inline', fontSize: '12px', height: '26px' }}
                  >
                    <option value={0}>0%</option>
                    <option value={0.08}>8%</option>
                    <option value={0.12}>12%</option>
                    <option value={0.15}>15%</option>
                  </select>
                </span>
                <span className="font-bold text-slate-800 text-sm">{formatUSD(ivaVal)}</span>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-2.5 mt-2.5 flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Final:</span>
              <span className="text-xl font-black text-blue-600">{formatUSD(total)}</span>
            </div>
          </div>

        </div>

        {/* Dynamic Item Entry Bar */}
        <div className="p-5" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px' }}>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Agregar Recurso a la Proforma
          </div>
          <div className="co-add-item-bar">
            
            {/* Manual Description Input */}
            <div className="flex-[3] min-w-[280px]">
              <label className="co-label">Descripcion del Articulo / Servicio</label>
              <input
                type="text"
                className="co-input"
                placeholder="Escribe la descripción del ítem o servicio..."
                value={itemInput.descripcion}
                onChange={e => {
                  const val = e.target.value;
                  setItemInput(prev => ({
                    ...prev,
                    descripcion: val,
                  }));
                }}
              />
            </div>

            <div className="w-[90px]">
              <label className="co-label">Cantidad</label>
              <input
                type="number"
                className="co-input text-center"
                min="0.01"
                step="0.01"
                value={itemInput.cantidad}
                onChange={e => setItemInput(prev => ({ ...prev, cantidad: e.target.value }))}
              />
            </div>

            <div className="w-[120px]">
              <label className="co-label">Precio Unit.</label>
              <input
                type="number"
                className="co-input text-right"
                min="0"
                step="0.01"
                value={itemInput.precioUnitario}
                onChange={e => setItemInput(prev => ({ ...prev, precioUnitario: e.target.value }))}
              />
            </div>

            <div className="w-[120px]">
              <label className="co-label">Subtotal</label>
              <div className="co-input bg-slate-50 text-right font-semibold text-slate-500 flex items-center justify-end px-3 border border-slate-200/80" style={{ height: '38px', borderRadius: '10px' }}>
                {formatUSD((parseFloat(itemInput.cantidad) || 0) * (parseFloat(itemInput.precioUnitario) || 0))}
              </div>
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

        {/* Line Items Table */}
        <>
          <div className="co-items-desktop-only">
            <div className="overflow-x-auto">
              <table className="co-items-table">
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: '60px' }}>N°</th>
                    <th className="text-center" style={{ width: '100px' }}>Cantidad</th>
                    <th>Descripción / Artículo / Servicio</th>
                    <th className="text-center" style={{ width: '130px' }}>Precio Unit.</th>
                    <th className="text-right" style={{ width: '130px' }}>Subtotal</th>
                    <th className="text-right" style={{ width: '130px' }}>Total + IVA</th>
                    <th className="text-center" style={{ width: '80px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((d, index) => {
                    const sub = (parseFloat(d.cantidad) || 0) * (parseFloat(d.precioUnitario) || 0);
                    const totalWithIva = sub + sub * form.iva;
                    return (
                      <tr key={index}>
                        <td className="text-center font-bold text-slate-400">{index + 1}</td>
                        <td>
                          <input
                            type="number"
                            className="co-table-input text-center mx-auto"
                            style={{ width: '75px' }}
                            min="0.01"
                            step="0.01"
                            value={d.cantidad}
                            onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="co-table-input w-full font-medium"
                            value={d.descripcion}
                            onChange={e => updateDetalle(index, 'descripcion', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              className="co-table-input text-right"
                              style={{ width: '95px' }}
                              min="0"
                              step="0.01"
                              value={d.precioUnitario}
                              onChange={e => updateDetalle(index, 'precioUnitario', e.target.value)}
                              required
                            />
                          </div>
                        </td>
                        <td className="text-right font-semibold text-slate-700">
                          {formatUSD(sub)}
                        </td>
                        <td className="text-right font-extrabold text-blue-600">
                          {formatUSD(totalWithIva)}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="co-table-remove-btn"
                            title="Eliminar item"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {form.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400 font-medium text-sm">
                        No hay items agregados en esta proforma. Utilice la barra superior para agregar items a la tabla.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="co-items-mobile-only">
            {form.items.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm border border-slate-200/80 rounded-2xl bg-slate-50/50">
                No hay items agregados en esta proforma. Utilice el formulario de arriba para agregar items.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {form.items.map((d, index) => {
                  const sub = (parseFloat(d.cantidad) || 0) * (parseFloat(d.precioUnitario) || 0);
                  const totalWithIva = sub + sub * form.iva;
                  return (
                    <div key={index} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-500 text-xs">Ítem #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="co-table-remove-btn"
                          title="Eliminar item"
                        >
                          &times;
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="co-label !mb-1">Descripción</label>
                        <input
                          type="text"
                          className="co-table-input font-medium"
                          value={d.descripcion}
                          onChange={e => updateDetalle(index, 'descripcion', e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="co-label !mb-1">Cantidad</label>
                          <input
                            type="number"
                            className="co-table-input text-center"
                            min="0.01"
                            step="0.01"
                            value={d.cantidad}
                            onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="co-label !mb-1">Precio Unitario ($)</label>
                          <input
                            type="number"
                            className="co-table-input text-right"
                            min="0"
                            step="0.01"
                            value={d.precioUnitario}
                            onChange={e => updateDetalle(index, 'precioUnitario', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/70 rounded-xl p-2.5 mt-1 text-center">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">Subtotal</span>
                          <span className="text-xs font-bold text-slate-700 font-mono mt-0.5">{formatUSD(sub)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">Total + IVA</span>
                          <span className="text-xs font-bold text-blue-600 font-mono mt-0.5">{formatUSD(totalWithIva)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>

        {/* Observaciones and Submit footer */}
        <div className="flex flex-wrap md:flex-nowrap gap-6">
          <div className="flex-1">
            <label className="co-label">Notas libres / Observaciones Generales (se imprimen arriba de las condiciones)</label>
            <textarea
              className="co-input co-textarea"
              style={{ borderRadius: '10px' }}
              rows={2}
              name="notas"
              placeholder="Comentarios adicionales visibles para el cliente en la proforma…"
              value={form.notas}
              onChange={handleChange}
            />
          </div>
          
          <div className="flex items-center justify-end gap-3 shrink-0 self-end mt-4">
            <button type="button" onClick={() => navigate('/proformas')} className="co-btn-ghost" style={{ fontWeight: 600 }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="co-btn-primary"
              style={{
                padding: '12px 30px',
                borderRadius: '10px'
              }}
            >
              {saving && <div className="co-spinner-sm" />}
              Guardar y Ver PDF
            </button>
          </div>
        </div>

      </form>
      {preview && (
        <ProformaPDF
          proforma={preview}
          configuracion={configuracion}
          onClose={() => {
            setPreview(null);
            navigate('/proformas');
          }}
        />
      )}

      <style>{`
        .co-input, .co-table-input {
          box-sizing: border-box !important;
        }
        .co-add-item-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          gap: 12px;
        }
        .co-items-desktop-only { display: block; }
        .co-items-mobile-only { display: none; }
        
        @media (max-width: 768px) {
          .co-add-item-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .co-add-item-bar > div {
            width: 100% !important;
            min-width: 0 !important;
            flex: none !important;
          }
          .co-add-item-bar button {
            width: 100% !important;
            margin-top: 8px;
          }
          .co-items-desktop-only { display: none !important; }
          .co-items-mobile-only { display: block !important; }
        }
      `}</style>
    </div>
  );
};
