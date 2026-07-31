// src/features/proyectos/ui/pages/NuevoProyectoPage.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Search, ChevronDown, Info, ClipboardList } from 'lucide-react';
import { useProyectos } from '../../application/hooks/useProyectos.js';
import { getClientes } from '../../../clientes/application/clientesService.js';
import { getProformas } from '../../../proformas/application/proformasService.js';
import { getProyectos } from '../../application/proyectosService.js';
import { getTodayDateISO } from '../../domain/utils/proyectoDates.js';

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];
const PRIORIDAD_COLORS = {
  BAJA: 'bg-slate-100 text-slate-600',
  MEDIA: 'bg-blue-50 text-blue-700',
  ALTA: 'bg-orange-50 text-orange-700',
  URGENTE: 'bg-red-50 text-red-700',
};

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  prioridad: 'MEDIA',
  fechaInicio: getTodayDateISO(),
  fechaEntregaEstimada: '',
  responsable: '',
  etiquetaInput: '',
  etiquetas: [],
  clienteId: '',
  responsableId: '',
  requiereInstalacion: true,
  notasCotizacion: '',
};

export default function NuevoProyectoPage() {
  const navigate = useNavigate();
  const { addProyecto } = useProyectos();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const [empleados, setEmpleados] = useState([]);
  const [empleadosLoading, setEmpleadosLoading] = useState(true);

  useEffect(() => {
    // Cargar clientes
    getClientes().then(data => {
      const clientesData = data?.data || data || [];
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setClientesLoading(false);
    }).catch(err => {
      console.error('Error al cargar clientes:', err);
      setClientesLoading(false);
    });

    // Cargar empleados
    const token = localStorage.getItem('token');
    fetch('/api/empleados', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const empleadosData = Array.isArray(data.data) ? data.data : [];
          setEmpleados(empleadosData);
        }
        setEmpleadosLoading(false);
      })
      .catch(err => {
        console.error('Error al cargar empleados:', err);
        setEmpleadosLoading(false);
      });
  }, []);

  const [proformas, setProformas] = useState([]);
  const [selectedProformaIds, setSelectedProformaIds] = useState([]);
  const [proformasLoading, setProformasLoading] = useState(false);
  const [allProjects, setAllProjects] = useState([]);

  useEffect(() => {
    getProyectos({ limit: 1000 }).then(res => {
      const pData = res?.data || res || [];
      setAllProjects(Array.isArray(pData) ? pData : []);
    }).catch(err => console.error('Error al cargar proyectos:', err));
  }, []);

  useEffect(() => {
    if (!form.clienteId) {
      setProformas([]);
      setSelectedProformaIds([]);
      return;
    }

    setProformasLoading(true);
    const clienteObj = clientes.find(c => c.id === form.clienteId);
    const filters = { limit: 1000, estado: 'Aprobada', clienteId: form.clienteId };

    getProformas(filters).then(res => {
      const list = res?.data || res || [];
      const norm = (Array.isArray(list) ? list : []).map(p => ({
        id: p.id,
        clienteId: p.clienteId,
        cliente: p.cliente || p.clienteNombre || '',
        atiende: p.atiende || '—',
        fecha: p.fecha,
        total: (p.items || []).reduce((s, i) => s + i.cantidad * i.precioUnitario, 0),
        estado: p.estado,
        items: p.items || [],
        iva: p.iva,
        abonos: p.abonos || [],
      })).filter(p => p.estado === 'Aprobada' || p.estado === 'Pagada');

      const clientNameNorm = (clienteObj?.nombre || '').toLowerCase().trim();
      const available = norm.filter(p => {
        if (p.clienteId && form.clienteId && p.clienteId === form.clienteId) {
          // Coincide por clienteId
        } else {
          const cleanPName = (p.cliente || '').replace(/^\d+\s*-\s*/, '').toLowerCase();
          if (clientNameNorm && !cleanPName.includes(clientNameNorm) && !clientNameNorm.includes(cleanPName)) {
            return false;
          }
        }

        const pIdStr = String(p.id);
        const isLinked = allProjects.some(proj => 
          proj.estado !== 'CANCELADO' && proj.estado !== 'Cancelado' &&
          proj.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas?.some(sc => String(sc.id) === pIdStr)
        );
        return !isLinked;
      });

      setProformas(available);
      setProformasLoading(false);
    }).catch(err => {
      console.error('Error al cargar proformas del cliente:', err);
      setProformas([]);
      setProformasLoading(false);
    });
  }, [form.clienteId, clientes, allProjects]);

  // Estados para buscadores
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [responsableSearch, setResponsableSearch] = useState('');
  const [responsableDropdownOpen, setResponsableDropdownOpen] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    if (errors[campo]) setErrors((e) => ({ ...e, [campo]: null }));
  }

  function addEtiqueta() {
    const tag = form.etiquetaInput.trim();
    if (tag && !form.etiquetas.includes(tag)) {
      set('etiquetas', [...form.etiquetas, tag]);
    }
    set('etiquetaInput', '');
  }

  function validate() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.responsable) e.responsable = 'Requerido';
    if (!form.clienteId) e.clienteId = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    
    setGuardando(true);
    try {
      const clienteObj = clientes.find(c => c.id === form.clienteId) || clientes[0];

      const selectedProformasObjs = proformas
        .filter(p => selectedProformaIds.includes(p.id))
        .map(p => ({
          ...p,
          fechaVinculacion: new Date().toISOString(),
        }));

      const proyecto = await addProyecto({
        nombre: form.nombre,
        descripcion: form.descripcion,
        prioridad: form.prioridad,
        fechaInicio: form.fechaInicio,
        fechaCreacion: form.fechaInicio,
        fechaEntregaEstimada: form.fechaEntregaEstimada || null,
        responsable: form.responsable,
        etiquetas: form.etiquetas,
        requiereInstalacion: form.requiereInstalacion,
        clienteId: form.clienteId,
        cliente: {
          nombre: clienteObj.nombre,
          empresa: clienteObj.tipo === 'Empresa' ? clienteObj.nombre : '',
          telefono: clienteObj.telefono,
          email: clienteObj.email,
          direccion: clienteObj.direccion || '',
        },
        notasCotizacion: form.notasCotizacion,
      });

      if (selectedProformasObjs.length > 0) {
        const token = localStorage.getItem('token');
        await fetch(`/api/proyectos/${proyecto.id}/fases/COTIZACION`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            datos: {
              cotizacionesSeleccionadas: selectedProformasObjs,
            },
          }),
        });
      }

      navigate(`/proyectos/${proyecto.id}`);
    } catch (err) {
      setErrors({ submit: err.message });
      setGuardando(false);
    }
  }

  return (
    <div className="w-full h-[calc(100vh-60px)] flex flex-col overflow-hidden pb-4">
      {/* Header Fijo */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-2 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/proyectos')}
            className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">Nuevo Proyecto</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/proyectos')}
            className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardando}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 shadow-md"
            style={{ backgroundColor: '#1d4ed8' }}
          >
            {guardando ? 'Guardando...' : 'Crear Proyecto'}
            <Check size={18} />
          </button>
        </div>
      </div>

      {/* Grid de 2 Columnas para aprovechar el espacio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto px-2">
        
        {/* Columna Izquierda: Información General */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Info size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Información Principal</h2>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nombre del proyecto * {errors.nombre && <span className="text-red-500 font-normal ml-1">({errors.nombre})</span>}
            </label>
            <input
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 focus:bg-white transition-colors
                ${errors.nombre ? 'border-red-400' : 'border-slate-200'}`}
              placeholder="Ej: Letrero luminoso"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Cliente * {errors.clienteId && <span className="text-red-500 font-normal ml-1">({errors.clienteId})</span>}
            </label>
            <div 
              className={`flex items-center w-full border rounded-xl px-4 py-3 text-sm bg-slate-50 cursor-text transition-colors
                ${errors.clienteId ? 'border-red-400' : 'border-slate-200'}
                ${clientDropdownOpen ? 'ring-2 ring-blue-400 border-blue-400 bg-white' : ''}`}
              onClick={() => setClientDropdownOpen(true)}
            >
              <Search size={16} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar cliente…"
                className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setClientDropdownOpen(true);
                }}
                onFocus={() => setClientDropdownOpen(true)}
              />
              <ChevronDown size={16} className="text-slate-400 ml-2 shrink-0 cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                setClientDropdownOpen(!clientDropdownOpen);
              }} />
            </div>

            {clientDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setClientDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto overflow-hidden">
                  {clientesLoading ? (
                    <div className="px-4 py-6 text-center text-slate-400 text-sm">Cargando clientes…</div>
                  ) : clientes.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase())).length > 0 ? (
                    clientes.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                      <div
                        key={c.id}
                        className={`px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0
                          ${form.clienteId === c.id ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          set('clienteId', c.id);
                          setClientSearch(c.nombre);
                          setClientDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-800 text-sm">{c.nombre}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.tipo === 'Empresa' ? 'text-indigo-600 bg-indigo-50' : 'text-blue-600 bg-blue-50'}`}>{c.tipo}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.cedulaRuc} · {c.telefono}</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-slate-500 text-sm">Sin resultados.</div>
                  )}
                </div>
              </>
            )}
          </div>

          {form.clienteId && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-700">Proformas Aprobadas Disponibles</span>
                {proformasLoading && <span className="text-xs text-slate-400">Cargando…</span>}
              </div>
              {!proformasLoading && proformas.length === 0 && (
                <p className="text-xs text-slate-400 italic">No hay proformas aprobadas disponibles para vincular a este cliente.</p>
              )}
              {!proformasLoading && proformas.length > 0 && (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {proformas.map((pf) => {
                    const isSelected = selectedProformaIds.includes(pf.id);
                    return (
                      <div
                        key={pf.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProformaIds(selectedProformaIds.filter((id) => id !== pf.id));
                          } else {
                            setSelectedProformaIds([...selectedProformaIds, pf.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{pf.id}</p>
                            <p className="text-[11px] text-slate-500">{pf.cliente}</p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-emerald-600">${pf.total.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción del trabajo</label>
            <textarea
              className="w-full h-full min-h-[120px] border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-colors"
              placeholder="Especificaciones, dimensiones, detalles técnicos..."
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </div>
        </div>

        {/* Columna Derecha: Detalles Adicionales y Configuración */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ClipboardList size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Configuración y Asignación</h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de proyecto *</label>
              <div className="flex flex-col gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-2.5 rounded-lg hover:border-blue-400 transition-colors">
                  <input
                    type="radio"
                    name="requiereInstalacion"
                    checked={form.requiereInstalacion === true}
                    onChange={() => set('requiereInstalacion', true)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 font-semibold">Con instalación</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-2.5 rounded-lg hover:border-blue-400 transition-colors">
                  <input
                    type="radio"
                    name="requiereInstalacion"
                    checked={form.requiereInstalacion === false}
                    onChange={() => set('requiereInstalacion', false)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 font-semibold">Sin instalación</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Prioridad</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORIDADES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('prioridad', p)}
                    className={`px-2 py-2.5 rounded-lg text-xs font-bold transition-all border text-center
                      ${form.prioridad === p ? `${PRIORIDAD_COLORS[p]} border-current ring-1 ring-current shadow-sm` : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Responsable * {errors.responsable && <span className="text-red-500 font-normal ml-1">({errors.responsable})</span>}
              </label>
              <div 
                className={`flex items-center w-full border rounded-xl px-4 py-3 text-sm bg-slate-50 cursor-text transition-colors
                  ${errors.responsable ? 'border-red-400' : 'border-slate-200'}
                  ${responsableDropdownOpen ? 'ring-2 ring-blue-400 border-blue-400 bg-white' : ''}`}
                onClick={() => setResponsableDropdownOpen(true)}
              >
                <Search size={16} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Asignar a..."
                  className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400"
                  value={responsableSearch}
                  onChange={(e) => {
                    setResponsableSearch(e.target.value);
                    setResponsableDropdownOpen(true);
                  }}
                  onFocus={() => setResponsableDropdownOpen(true)}
                />
                <ChevronDown size={16} className="text-slate-400 ml-2 shrink-0 cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  setResponsableDropdownOpen(!responsableDropdownOpen);
                }} />
              </div>

              {responsableDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setResponsableDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto overflow-hidden">
                    {empleados.filter(e => e.nombre.toLowerCase().includes(responsableSearch.toLowerCase())).length > 0 ? (
                      empleados.filter(e => e.nombre.toLowerCase().includes(responsableSearch.toLowerCase())).map(emp => (
                        <div
                          key={emp.id}
                          className={`px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0
                            ${form.responsable === emp.nombre ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            set('responsable', emp.nombre);
                            setResponsableSearch(emp.nombre);
                            setResponsableDropdownOpen(false);
                          }}
                        >
                          <p className="font-semibold text-slate-800 text-sm">{emp.nombre}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{emp.cargo}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">Sin resultados.</div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Fecha de inicio</label>
              <input
                type="date"
                className="w-full border border-slate-200 bg-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 cursor-default"
                value={form.fechaInicio}
                readOnly
                title="Se registra automáticamente al crear el proyecto"
              />
              <p className="text-[11px] text-slate-400 mt-1">Se guarda con la fecha de hoy al crear el proyecto.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Entrega estimada</label>
              <input
                type="date"
                className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                value={form.fechaEntregaEstimada}
                onChange={(e) => set('fechaEntregaEstimada', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Etiquetas</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
                placeholder="Ej: urgente, acrílico..."
                value={form.etiquetaInput}
                onChange={(e) => set('etiquetaInput', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEtiqueta())}
              />
              <button
                type="button"
                onClick={addEtiqueta}
                className="px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-600 transition-colors border border-blue-100"
              >
                <Plus size={18} />
              </button>
            </div>
            {form.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.etiquetas.map((tag) => (
                  <span key={tag} className="flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full font-medium">
                    {tag}
                    <button type="button" onClick={() => set('etiquetas', form.etiquetas.filter((t) => t !== tag))} className="hover:text-red-500 bg-white/50 rounded-full w-4 h-4 flex items-center justify-center">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Notas iniciales</label>
            <textarea
              className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-colors min-h-[80px]"
              placeholder="Referencia de pago, observaciones..."
              value={form.notasCotizacion}
              onChange={(e) => set('notasCotizacion', e.target.value)}
            />
          </div>

        </div>

      </div>
    </div>
  );
}


