import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getClientes } from '../../../clientes/application/clientesService';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { saveProforma, getProformaById } from '../../application/proformasService';
import { ProformaPDF } from '../components/ProformaPDF';
import { toast } from '../../../../shared/ui/components/Toast';
import '../../../compras/ui/pages/ComprasPage.css';

const parseNum = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const num = parseFloat(String(v).replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

const EMPTY_PROFORMA = {
  clienteId: '',
  cliente: '',
  telefono: '',
  email: '',
  direccion: '',
  fecha: new Date().toISOString().split('T')[0],
  vencimiento: '',
  diasValidez: 3,
  medio: 'ALUX',
  atiende: '',
  condiciones: `60% DE ANTICIPO Y 40% CONTRAENTREGA\nENTREGA DE 7-8 DIAS LABORABLES DESPUES DE LA CONFIRMACION DE PAGO\nESTA COTIZACION ES VALIDA POR 3 DIAS DESPUÉS DE SU EMISIÓN`,
  iva: 0,
  descuento: 0,
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

  // Compact bar input state
  const [itemInput, setItemInput] = useState({
    cod: '',
    cantidad: '1',
    ancho: '',
    alto: '',
    descripcion: '',
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
              direccion: existing.direccion || related?.direccion || '',
              medio: existing.medio || 'ALUX',
              items: (existing.items || []).map(i => ({ ...i })),
            });
            setClienteSearch(existing.cliente);
          } else {
            toast.error('No se encontró la proforma especificada');
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
            condiciones: config?.condicionesPago || EMPTY_PROFORMA.condiciones,
            fecha: today.toISOString().split('T')[0],
            vencimiento: venc.toISOString().split('T')[0],
            diasValidez: valDays,
            atiende: currentUser?.nombre || currentUser?.name || currentUser?.username || currentUser?.email || '',
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
      direccion: c.direccion || prev.direccion || '',
    }));
    setClienteSearch(c.nombre);
    setClienteDropdownOpen(false);
  };

  const handleAddItem = () => {
    const qty = parseNum(itemInput.cantidad) || 1;
    const price = parseNum(itemInput.precioUnitario);
    const ancho = parseNum(itemInput.ancho);
    const alto = parseNum(itemInput.alto);

    if (!itemInput.descripcion.trim()) {
      toast.error('La descripción no puede estar vacía.');
      return;
    }
    if (qty <= 0) {
      toast.error('La cantidad debe ser mayor a 0.');
      return;
    }

    const metraje = (ancho > 0 && alto > 0) ? (ancho * alto) : 1;
    const metrajeTotal = (ancho > 0 && alto > 0) ? (qty * metraje) : qty;
    const valor = metrajeTotal * price;

    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          cod: itemInput.cod || `V${prev.items.length + 1}`,
          cantidad: qty,
          ancho: ancho > 0 ? ancho : '',
          alto: alto > 0 ? alto : '',
          metraje: metraje > 0 ? metraje : 1,
          metrajeTotal: metrajeTotal > 0 ? metrajeTotal : qty,
          descripcion: itemInput.descripcion,
          precioUnitario: price,
          valor,
        }
      ]
    }));

    // Reset input fields
    setItemInput({
      cod: '',
      cantidad: '1',
      ancho: '',
      alto: '',
      descripcion: '',
      precioUnitario: '0',
    });
  };

  const updateDetalle = (index, field, val) => {
    setForm(prev => {
      const items = [...prev.items];
      const item = { ...items[index], [field]: val };
      
      const qty = parseNum(item.cantidad) || 1;
      const price = parseNum(item.precioUnitario);
      const ancho = parseNum(item.ancho);
      const alto = parseNum(item.alto);

      const metraje = (ancho > 0 && alto > 0) ? (ancho * alto) : (parseNum(item.metraje) || 1);
      const metrajeTotal = (ancho > 0 && alto > 0) ? (qty * metraje) : qty;
      const valor = metrajeTotal * price;

      item.metraje = metraje;
      item.metrajeTotal = metrajeTotal;
      item.valor = valor;

      items[index] = item;
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
      toast.error('Debe agregar al menos un ítem a la tabla antes de guardar.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        condiciones: form.condiciones || configuracion?.condicionesPago || EMPTY_PROFORMA.condiciones,
        iva: parseNum(form.iva),
        descuento: parseNum(form.descuento),
        diasValidez: parseNum(form.diasValidez),
        items: form.items.map(it => {
          const qty = parseNum(it.cantidad) || 1;
          const ancho = parseNum(it.ancho);
          const alto = parseNum(it.alto);
          const metraje = (ancho > 0 && alto > 0) ? (ancho * alto) : (parseNum(it.metraje) || 0);
          const metrajeTotal = (ancho > 0 && alto > 0) ? (qty * metraje) : (parseNum(it.metrajeTotal) || qty);
          const precio = parseNum(it.precioUnitario);
          const valor = parseNum(it.valor) || (metrajeTotal * precio);

          return {
            cod: it.cod || '',
            descripcion: it.descripcion,
            cantidad: qty,
            ancho: ancho > 0 ? ancho : undefined,
            alto: alto > 0 ? alto : undefined,
            metraje: metraje > 0 ? metraje : undefined,
            metrajeTotal: metrajeTotal > 0 ? metrajeTotal : undefined,
            precioUnitario: precio,
            valor,
          };
        })
      };

      if (form.estado === 'Rechazada') {
        payload.estado = 'Pendiente';
      }
      
      const action = e.nativeEvent.submitter?.value || 'pdf';
      const saved = await saveProforma(payload);
      toast.success(isEdit ? 'Proforma actualizada con éxito' : 'Proforma creada con éxito');
      
      if (action === 'abono') {
        navigate(`/proformas/detalle/${saved.id}?action=abono`);
      } else {
        setPreview({ ...saved, items: saved.items && saved.items.length > 0 ? saved.items : payload.items });
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al guardar la proforma');
    } finally {
      setSaving(false);
    }
  };

  const calculateRowValor = (item) => {
    if (item.valor !== undefined && item.valor !== null && !isNaN(parseNum(item.valor)) && parseNum(item.valor) > 0) {
      return parseNum(item.valor);
    }
    const qty = parseNum(item.cantidad) || 1;
    const price = parseNum(item.precioUnitario);
    const ancho = parseNum(item.ancho);
    const alto = parseNum(item.alto);
    const metraje = (ancho > 0 && alto > 0) ? (ancho * alto) : (parseNum(item.metraje) || 1);
    const metrajeTotal = (ancho > 0 && alto > 0) ? (qty * metraje) : (parseNum(item.metrajeTotal) || qty);
    return metrajeTotal * price;
  };

  const subTotal = form.items.reduce((s, i) => s + calculateRowValor(i), 0);
  const descuentoVal = parseNum(form.descuento);
  const total = Math.max(0, subTotal - descuentoVal);

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

  // Live Calculations for Item Bar
  const barQty = parseNum(itemInput.cantidad) || 1;
  const barAncho = parseNum(itemInput.ancho);
  const barAlto = parseNum(itemInput.alto);
  const barPrice = parseNum(itemInput.precioUnitario);

  const barMetraje = (barAncho > 0 && barAlto > 0) ? (barAncho * barAlto) : 0;
  const barMetrajeTotal = (barAncho > 0 && barAlto > 0) ? (barQty * barMetraje) : barQty;
  const barValor = (barAncho > 0 && barAlto > 0) ? (barMetrajeTotal * barPrice) : (barQty * barPrice);

  return (
    <div className="co-page animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="co-card co-header mb-4" style={{ border: '1px solid #e2e8f0', background: '#ffffff', padding: '16px 24px' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
              {isEdit ? 'Editar Proforma Alux' : 'Nueva Proforma Alux'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Cotizador con metraje automático (Alto x Ancho) y resumen visual
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/proformas')} className="co-btn-ghost text-xs" style={{ color: '#2563eb', fontWeight: 700 }}>
          Volver al listado
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        
        {/* Upper Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Main Form Fields Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-3">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Información de la Proforma Alux
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              
              <div className="relative md:col-span-2 lg:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Cliente *</label>
                <input
                  type="text"
                  className="co-input text-xs font-semibold"
                  placeholder="Buscar o escribir nombre del cliente..."
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
                          <div className="font-semibold text-slate-800 text-xs">{c.nombre}</div>
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
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Fecha de Emisión *</label>
                <input
                  name="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={handleChange}
                  required
                  className="co-input text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Días de validez *</label>
                <input
                  name="diasValidez"
                  type="number"
                  min={0}
                  value={form.diasValidez}
                  onChange={handleChange}
                  required
                  className="co-input text-xs text-center"
                />
              </div>

            </div>

            {/* Accordion Toggle */}
            <div className="border-t border-slate-100 pt-2 mt-1">
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
                {showMoreClientData ? 'Ocultar datos de contacto' : 'Ver más datos del cliente (Teléfono, Email, Dirección)'}
              </button>
            </div>

            {showMoreClientData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2 pt-3 border-t border-slate-100/60 animate-slide-up">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Teléfono / Celular</label>
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="Ej. 0985740242"
                    className="co-input text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Email Cliente</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Ej. cliente@correo.com"
                    className="co-input text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Dirección Cliente</label>
                  <input
                    name="direccion"
                    value={form.direccion || ''}
                    onChange={handleChange}
                    placeholder="Ej. Edificio Huancavilca"
                    className="co-input text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Atiende *</label>
                  <input
                    name="atiende"
                    value={form.atiende}
                    onChange={handleChange}
                    required
                    readOnly
                    className="co-input text-xs bg-slate-50 text-slate-400 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Totals Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">
              Resumen de Cotización
            </div>
            <div className="space-y-3 flex-1 justify-center flex flex-col">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Subtotal:</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatUSD(subTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Descuento ($):</span>
                <input
                  type="text"
                  name="descuento"
                  placeholder="0.00"
                  value={form.descuento || ''}
                  onChange={e => setForm(p => ({ ...p, descuento: e.target.value }))}
                  className="co-input text-right font-bold text-xs"
                  style={{ width: '90px', padding: '4px 8px', height: '28px' }}
                />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Total Final:</span>
              <span className="text-xl font-black text-blue-600 font-mono">{formatUSD(total)}</span>
            </div>
          </div>

        </div>

        {/* Sección de Ingreso Fijada a 2 Filas Exactas */}
        <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            AGREGAR ÍTEM A LA COTIZACIÓN
          </div>

          {/* FILA 1 DE 2: 7 columnas idénticas forzadas siempre en 1 sola línea */}
          <div className="grid grid-cols-7 gap-2.5 w-full items-end">
            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-1 block text-center truncate">
                CANT *
              </label>
              <input
                type="text"
                className="co-input text-center font-bold text-xs w-full"
                placeholder="1"
                value={itemInput.cantidad}
                onChange={e => setItemInput(prev => ({ ...prev, cantidad: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-1 block text-center truncate">
                ANCHO (m)
              </label>
              <input
                type="text"
                className="co-input text-center font-semibold text-xs w-full"
                placeholder="0.00"
                value={itemInput.ancho}
                onChange={e => setItemInput(prev => ({ ...prev, ancho: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-1 block text-center truncate">
                ALTO (m)
              </label>
              <input
                type="text"
                className="co-input text-center font-semibold text-xs w-full"
                placeholder="0.00"
                value={itemInput.alto}
                onChange={e => setItemInput(prev => ({ ...prev, alto: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block text-center truncate">
                METRAJE (m²)
              </label>
              <input
                type="text"
                readOnly
                tabIndex={-1}
                className="co-input text-center font-mono text-xs bg-slate-100 text-slate-700 cursor-not-allowed w-full"
                value={barMetraje > 0 ? barMetraje.toFixed(2) : '—'}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block text-center truncate">
                M. TOTAL (m²)
              </label>
              <input
                type="text"
                readOnly
                tabIndex={-1}
                className="co-input text-center font-mono font-bold text-xs bg-slate-100 text-slate-800 cursor-not-allowed w-full"
                value={barMetrajeTotal.toFixed(2)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 mb-1 block text-center truncate">
                VALOR UNIT ($)
              </label>
              <input
                type="text"
                className="co-input text-right font-semibold text-xs w-full"
                placeholder="0.00"
                value={itemInput.precioUnitario}
                onChange={e => setItemInput(prev => ({ ...prev, precioUnitario: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 mb-1 block text-center truncate">
                VALOR TOTAL ($)
              </label>
              <input
                type="text"
                readOnly
                tabIndex={-1}
                className="co-input text-right font-mono font-extrabold text-xs bg-slate-100 text-slate-900 cursor-not-allowed w-full"
                value={formatUSD(barValor)}
              />
            </div>
          </div>

          {/* FILA 2 DE 2: Descripción full-width + Botón Agregar */}
          <div className="flex items-end gap-2.5 w-full pt-1">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-600 mb-1 block">
                DESCRIPCIÓN DEL ÍTEM / SERVICIO *
              </label>
              <input
                type="text"
                className="co-input w-full text-xs font-medium"
                placeholder="Ej. Ventana de aluminio claro + vidrio transparente con mallas anti-mosquitos..."
                value={itemInput.descripcion}
                onChange={e => setItemInput(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="px-6 h-[38px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-colors shrink-0"
            >
              + Agregar Ítem
            </button>
          </div>
        </div>

        {/* Tabla Sobria de Ítems Registrados */}
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-[10.5px] font-extrabold text-slate-700 bg-slate-100 uppercase tracking-wider">
                  <th className="text-center py-2.5 px-2 w-12 border-r border-slate-200">CÓD</th>
                  <th className="text-center py-2.5 px-2 w-16 border-r border-slate-200">CANT</th>
                  <th className="text-center py-2.5 px-2 w-20 border-r border-slate-200">ANCHO</th>
                  <th className="text-center py-2.5 px-2 w-20 border-r border-slate-200">ALTO</th>
                  <th className="text-center py-2.5 px-2 w-24 border-r border-slate-200">METRAJE</th>
                  <th className="text-center py-2.5 px-2 w-24 border-r border-slate-200">M. TOTAL</th>
                  <th className="text-left py-2.5 px-3 border-r border-slate-200">DESCRIPCIÓN</th>
                  <th className="text-right py-2.5 px-3 w-28 border-r border-slate-200">VALOR UNIT.</th>
                  <th className="text-right py-2.5 px-3 w-28 border-r border-slate-200">VALOR</th>
                  <th className="text-center py-2.5 px-2 w-14">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {form.items.map((d, index) => {
                  const rowValor = calculateRowValor(d);
                  const qty = parseNum(d.cantidad) || 1;
                  const ancho = parseNum(d.ancho);
                  const alto = parseNum(d.alto);
                  const metraje = (ancho > 0 && alto > 0) ? (ancho * alto) : (parseNum(d.metraje) || 0);
                  const metrajeTotal = (ancho > 0 && alto > 0) ? (qty * metraje) : (parseNum(d.metrajeTotal) || qty);

                  return (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-center border-r border-slate-200 font-mono font-bold text-slate-700 bg-slate-50/50">
                        {d.cod || `V${index + 1}`}
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <input
                          type="text"
                          className="co-table-input text-center font-bold mx-auto text-xs"
                          style={{ width: '50px' }}
                          value={d.cantidad}
                          onChange={e => updateDetalle(index, 'cantidad', e.target.value)}
                          required
                        />
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <input
                          type="text"
                          className="co-table-input text-center mx-auto text-xs"
                          style={{ width: '55px' }}
                          placeholder="—"
                          value={d.ancho || ''}
                          onChange={e => updateDetalle(index, 'ancho', e.target.value)}
                        />
                      </td>
                      <td className="p-2 text-center border-r border-slate-200">
                        <input
                          type="text"
                          className="co-table-input text-center mx-auto text-xs"
                          style={{ width: '55px' }}
                          placeholder="—"
                          value={d.alto || ''}
                          onChange={e => updateDetalle(index, 'alto', e.target.value)}
                        />
                      </td>
                      <td className="p-2 text-center border-r border-slate-200 font-mono font-semibold text-slate-600">
                        {metraje > 0 ? metraje.toFixed(2) : '—'}
                      </td>
                      <td className="p-2 text-center border-r border-slate-200 font-mono font-bold text-slate-800">
                        {metrajeTotal.toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          className="co-table-input w-full font-medium text-xs"
                          value={d.descripcion}
                          onChange={e => updateDetalle(index, 'descripcion', e.target.value)}
                          required
                        />
                      </td>
                      <td className="p-2 text-right border-r border-slate-200">
                        <input
                          type="text"
                          className="co-table-input text-right font-semibold text-xs ml-auto"
                          style={{ width: '80px' }}
                          value={d.precioUnitario}
                          onChange={e => updateDetalle(index, 'precioUnitario', e.target.value)}
                          required
                        />
                      </td>
                      <td className="p-2 text-right border-r border-slate-200 font-extrabold text-blue-700 font-mono text-xs">
                        {formatUSD(rowValor)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 font-black text-base px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                          title="Eliminar ítem"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {form.items.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400 font-medium text-xs">
                      No hay ítems registrados en esta cotización. Rellene los campos superiores y presione "+ Agregar Ítem".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Observaciones y Footer de acciones */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-3 border-t border-slate-100 mt-2">
          <div className="flex-1 min-w-0">
            <label className="text-[11px] font-bold text-slate-600 mb-1 block">Observaciones Generales</label>
            <textarea
              className="co-input co-textarea text-xs text-slate-700 font-medium w-full"
              style={{ borderRadius: '10px' }}
              rows={2}
              name="notas"
              placeholder="Comentarios o especificaciones adicionales para la cotización…"
              value={form.notas}
              onChange={handleChange}
            />
          </div>
          
          <div className="flex items-center justify-end gap-3 shrink-0 pb-1">
            <button type="button" onClick={() => navigate('/proformas')} className="co-btn-ghost text-xs" style={{ fontWeight: 600 }}>
              Cancelar
            </button>
            <button
              type="submit"
              name="action"
              value="pdf"
              disabled={saving}
              className="co-btn-primary flex items-center justify-center relative overflow-hidden text-xs font-bold"
              style={{
                padding: '12px 28px',
                borderRadius: '10px'
              }}
            >
              {saving && <div className="co-spinner-sm mr-2" />}
              {form.estado === 'Rechazada' ? 'Guardar y Enviar a Aprobación' : 'Guardar y Ver PDF Alux'}
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
    </div>
  );
};


