import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getClientes } from '../../../clientes/application/clientesService';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { saveProforma, getProformaById } from '../../application/proformasService';
import { ProformaPDF } from '../components/ProformaPDF';
import { toast } from '../../../../shared/ui/components/Toast';

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

const inputClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

const labelClass = 'block text-xs font-semibold text-slate-500 mb-1.5';

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

  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);

  const [itemInput, setItemInput] = useState({
    descripcion: '',
    cantidad: '1',
    precioUnitario: '0',
  });

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

      const action = e.nativeEvent.submitter?.value || 'pdf';
      const saved = await saveProforma(payload);
      toast.success(isEdit ? 'Proforma actualizada con exito' : 'Proforma creada con exito');

      if (action === 'abono') {
        navigate(`/proformas/detalle/${saved.id}?action=abono`);
      } else {
        setPreview(saved);
      }
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
        .np-items-desktop { display: block; }
        .np-items-mobile { display: none; }
        .np-add-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          gap: 12px;
        }
        .np-search-dropdown {
          position: absolute;
          left: 0;
          right: 0;
          margin-top: 4px;
          max-height: 200px;
          overflow-y: auto;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          z-index: 100;
        }
        .np-search-item {
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          text-align: left;
          color: #334155;
        }
        .np-search-item:hover { background-color: #f8fafc; }
        .np-search-item:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .np-add-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .np-add-bar > div {
            width: 100% !important;
            min-width: 0 !important;
            flex: none !important;
          }
          .np-add-bar button {
            width: 100% !important;
            margin-top: 4px;
          }
          .np-items-desktop { display: none !important; }
          .np-items-mobile { display: block !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/proformas')}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            title="Volver"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">
                {isEdit ? 'Editar Proforma' : 'Nueva Proforma'}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                {isEdit ? 'Edición' : 'Nueva'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? 'Modifica los datos de la proforma seleccionada' : 'Completa la cotización para el cliente'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3 sm:space-y-5">
        {/* Información + valores en una sola sección */}
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 overflow-visible">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
            Información de la proforma
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="relative sm:col-span-2">
              <label className={labelClass}>Cliente *</label>
              <input
                type="text"
                className={inputClass}
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
                <div className="np-search-dropdown">
                  {clientes
                    .filter(c => {
                      const term = clienteSearch.toLowerCase();
                      return c.nombre.toLowerCase().includes(term) || (c.cedulaRuc && c.cedulaRuc.includes(term));
                    })
                    .map(c => (
                      <div
                        key={c.id}
                        className="np-search-item"
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
              <label className={labelClass}>Fecha de emisión *</label>
              <input
                name="fecha"
                type="date"
                value={form.fecha}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Días de validez *</label>
              <input
                name="diasValidez"
                type="number"
                min={0}
                value={form.diasValidez}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Fecha de vencimiento *</label>
              <input
                name="vencimiento"
                type="date"
                value={form.vencimiento}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Teléfono cliente *</label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                required
                placeholder="Ej. 0991234567"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email cliente</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Ej. cliente@correo.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Atiende *</label>
              <input
                name="atiende"
                value={form.atiende}
                onChange={handleChange}
                required
                readOnly
                className={`${inputClass} bg-slate-100 text-slate-400 font-semibold cursor-not-allowed`}
              />
            </div>
          </div>

          {/* Valores integrados (sin card aparte) */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <div className="flex sm:flex-col sm:items-start items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Subtotal</span>
              <span className="text-sm font-bold text-slate-800 tabular-nums">{formatUSD(subTotal)}</span>
            </div>
            <div className="flex sm:flex-col sm:items-start items-center justify-between gap-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                IVA
                <select
                  name="iva"
                  value={form.iva}
                  onChange={e => setForm(p => ({ ...p, iva: parseFloat(e.target.value) }))}
                  className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-gray-50 text-slate-700 outline-none focus:border-blue-300"
                >
                  <option value={0}>0%</option>
                  <option value={0.08}>8%</option>
                  <option value={0.12}>12%</option>
                  <option value={0.15}>15%</option>
                </select>
              </span>
              <span className="text-sm font-bold text-slate-800 tabular-nums">{formatUSD(ivaVal)}</span>
            </div>
            <div className="flex sm:flex-col sm:items-start items-center justify-between gap-1 sm:text-left">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total final</span>
              <span className="text-lg font-bold text-blue-600 tabular-nums">{formatUSD(total)}</span>
            </div>
          </div>
        </div>

        {/* Add item bar */}
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Agregar recurso a la proforma
          </p>
          <div className="np-add-bar">
            <div className="flex-[3] min-w-[220px]">
              <label className={labelClass}>Descripción del artículo / servicio</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Escribe la descripción del ítem o servicio..."
                value={itemInput.descripcion}
                onChange={e => setItemInput(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>
            <div className="w-[90px]">
              <label className={labelClass}>Cantidad</label>
              <input
                type="number"
                className={`${inputClass} text-center`}
                min="0.01"
                step="0.01"
                value={itemInput.cantidad}
                onChange={e => setItemInput(prev => ({ ...prev, cantidad: e.target.value }))}
              />
            </div>
            <div className="w-[120px]">
              <label className={labelClass}>Precio unit.</label>
              <input
                type="number"
                className={`${inputClass} text-right`}
                min="0"
                step="0.01"
                value={itemInput.precioUnitario}
                onChange={e => setItemInput(prev => ({ ...prev, precioUnitario: e.target.value }))}
              />
            </div>
            <div className="w-[120px]">
              <label className={labelClass}>Subtotal</label>
              <div className={`${inputClass} bg-slate-100 text-right font-semibold text-slate-500 flex items-center justify-end`}>
                {formatUSD((parseFloat(itemInput.cantidad) || 0) * (parseFloat(itemInput.precioUnitario) || 0))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center justify-center gap-1.5 h-[42px] px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm shrink-0"
            >
              + Agregar
            </button>
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="np-items-desktop">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[60px]">N°</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[100px]">Cantidad</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Descripción / Artículo / Servicio</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[130px]">Precio unit.</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[120px]">Subtotal</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[120px]">Total + IVA</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[80px]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((d, index) => {
                    const sub = (parseFloat(d.cantidad) || 0) * (parseFloat(d.precioUnitario) || 0);
                    const totalWithIva = sub + sub * form.iva;
                    return (
                      <tr key={index} className="border-b border-slate-50 hover:bg-slate-50/40">
                        <td className="text-center py-2.5 font-semibold text-slate-400">{index + 1}</td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            className={`${inputClass} text-center mx-auto !py-1.5`}
                            style={{ width: '75px' }}
                            min="0.01"
                            step="0.01"
                            value={d.cantidad}
                            onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                            required
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            className={`${inputClass} font-medium !py-1.5`}
                            value={d.descripcion}
                            onChange={e => updateDetalle(index, 'descripcion', e.target.value)}
                            required
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-slate-400 font-semibold text-xs">$</span>
                            <input
                              type="number"
                              className={`${inputClass} text-right !py-1.5`}
                              style={{ width: '95px' }}
                              min="0"
                              step="0.01"
                              value={d.precioUnitario}
                              onChange={e => updateDetalle(index, 'precioUnitario', e.target.value)}
                              required
                            />
                          </div>
                        </td>
                        <td className="text-right px-4 py-2.5 font-semibold text-slate-700 tabular-nums">
                          {formatUSD(sub)}
                        </td>
                        <td className="text-right px-4 py-2.5 font-bold text-blue-600 tabular-nums">
                          {formatUSD(totalWithIva)}
                        </td>
                        <td className="text-center py-2.5">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-lg font-bold"
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
                        No hay items agregados. Usa la barra superior para agregar ítems.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="np-items-mobile p-4">
            {form.items.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                No hay items agregados. Usa el formulario de arriba para agregar ítems.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {form.items.map((d, index) => {
                  const sub = (parseFloat(d.cantidad) || 0) * (parseFloat(d.precioUnitario) || 0);
                  const totalWithIva = sub + sub * form.iva;
                  return (
                    <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="font-semibold text-slate-500 text-xs">Ítem #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-lg font-bold"
                          title="Eliminar item"
                        >
                          &times;
                        </button>
                      </div>

                      <div>
                        <label className={labelClass}>Descripción</label>
                        <input
                          type="text"
                          className={`${inputClass} font-medium`}
                          value={d.descripcion}
                          onChange={e => updateDetalle(index, 'descripcion', e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Cantidad</label>
                          <input
                            type="number"
                            className={`${inputClass} text-center`}
                            min="0.01"
                            step="0.01"
                            value={d.cantidad}
                            onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Precio unitario ($)</label>
                          <input
                            type="number"
                            className={`${inputClass} text-right`}
                            min="0"
                            step="0.01"
                            value={d.precioUnitario}
                            onChange={e => updateDetalle(index, 'precioUnitario', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2.5 text-center">
                        <div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">Subtotal</span>
                          <p className="text-xs font-bold text-slate-700 tabular-nums mt-0.5">{formatUSD(sub)}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">Total + IVA</span>
                          <p className="text-xs font-bold text-blue-600 tabular-nums mt-0.5">{formatUSD(totalWithIva)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Notes + actions */}
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            <div className="flex-1">
              <label className={labelClass}>
                Notas / observaciones (se imprimen arriba de las condiciones)
              </label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                name="notas"
                placeholder="Comentarios adicionales visibles para el cliente…"
                value={form.notas}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/proformas')}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                name="action"
                value="pdf"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50"
              >
                {saving && (
                  <span className="inline-block h-3.5 w-3.5 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin" />
                )}
                Guardar y ver PDF
              </button>
              <button
                type="submit"
                name="action"
                value="abono"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-opacity disabled:opacity-50"
              >
                {saving && (
                  <span className="inline-block h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Guardar y registrar abono
              </button>
            </div>
          </div>
        </div>
      </form>

      {preview && (
        <ProformaPDF
          proforma={preview}
          configuracion={configuracion}
          onClose={() => {
            const savedId = preview.id;
            setPreview(null);
            navigate(`/proformas/detalle/${savedId}`);
          }}
        />
      )}
    </div>
  );
};
