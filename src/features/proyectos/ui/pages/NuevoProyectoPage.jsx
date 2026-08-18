// src/features/proyectos/ui/pages/NuevoProyectoPage.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Search, ChevronDown, Info, ClipboardList, Trash2 } from 'lucide-react';
import { useProyectos } from '../../application/hooks/useProyectos.js';
import { getClientes } from '../../../clientes/application/clientesService.js';
import { getTodayDateISO } from '../../domain/utils/proyectoDates.js';
import { generateAluxFasesWithDates } from '../../domain/value-objects/aluxFasesTemplate.js';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams] = useSearchParams();
  const proformaId = searchParams.get('proformaId');

  const { addProyecto } = useProyectos();
  const [form, setForm] = useState(EMPTY_FORM);
  const [fasesAlux, setFasesAlux] = useState(() => generateAluxFasesWithDates(getTodayDateISO(), proformaId));
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
        medio: 'ALUX',
        fasesAlux: fasesAlux,
        cliente: {
          nombre: clienteObj.nombre,
          empresa: clienteObj.tipo === 'Empresa' ? clienteObj.nombre : '',
          telefono: clienteObj.telefono,
          email: clienteObj.email,
          direccion: clienteObj.direccion || '',
        },
        notasCotizacion: form.notasCotizacion,
      });

      navigate(`/proyectos/${proyecto.id}`);
    } catch (err) {
      setErrors({ submit: err.message });
      setGuardando(false);
    }
  }

  return (
    <div className="w-full pb-20 md:pb-6 animate-slide-up np-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .np-root, .np-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
      `}</style>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-4 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/proyectos')}
              className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              title="Volver a proyectos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Nuevo Proyecto</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Crear
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Registra un nuevo proyecto en el sistema ALUX con asignación de fases y responsables
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/proyectos')}
              className="px-4 sm:px-5 py-2.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={guardando}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 text-white rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all shadow-sm bg-[#0b2d64] hover:bg-[#071f45] shrink-0 cursor-pointer shadow-blue-950/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando...' : 'Crear Proyecto'}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errors.submit}
        </div>
      )}

      {/* Grid de 2 Columnas para Formulario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Columna Izquierda: Información Principal */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Información Principal</h2>
              <p className="text-[11px] text-slate-400">Datos generales del proyecto y cliente</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nombre del proyecto <span className="text-red-500">*</span> {errors.nombre && <span className="text-red-500 font-normal lowercase ml-1">({errors.nombre})</span>}
            </label>
            <input
              className={`w-full border rounded-xl px-4 py-2.5 text-sm bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800
                ${errors.nombre ? 'border-red-400 focus:border-red-400' : 'border-slate-200/90 focus:border-blue-500'}`}
              placeholder="Ej: Letrero luminoso acrílico 3D"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Cliente <span className="text-red-500">*</span> {errors.clienteId && <span className="text-red-500 font-normal lowercase ml-1">({errors.clienteId})</span>}
            </label>
            <div 
              className={`flex items-center w-full border rounded-xl px-4 py-2.5 text-sm bg-slate-50/60 cursor-text transition-all
                ${errors.clienteId ? 'border-red-400' : 'border-slate-200/90'}
                ${clientDropdownOpen ? 'ring-2 ring-blue-500/10 border-blue-500 bg-white' : ''}`}
              onClick={() => setClientDropdownOpen(true)}
            >
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Buscar cliente por nombre o RUC…"
                className="w-full bg-transparent outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setClientDropdownOpen(true);
                }}
                onFocus={() => setClientDropdownOpen(true)}
              />
              <ChevronDown className="w-4 h-4 text-slate-400 ml-2 shrink-0 cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                setClientDropdownOpen(!clientDropdownOpen);
              }} />
            </div>

            {clientDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setClientDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto overflow-hidden">
                  {clientesLoading ? (
                    <div className="px-4 py-6 text-center text-slate-400 text-xs font-medium">Cargando clientes…</div>
                  ) : clientes.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase())).length > 0 ? (
                    clientes.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                      <div
                        key={c.id}
                        className={`px-4 py-3 hover:bg-blue-50/80 cursor-pointer transition-colors border-b border-slate-100 last:border-0
                          ${form.clienteId === c.id ? 'bg-blue-50/90' : ''}`}
                        onClick={() => {
                          set('clienteId', c.id);
                          setClientSearch(c.nombre);
                          setClientDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-800 text-sm">{c.nombre}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.tipo === 'Empresa' ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'text-blue-600 bg-blue-50 border border-blue-100'}`}>{c.tipo}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.cedulaRuc || 'Sin RUC'} · {c.telefono || 'Sin teléfono'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-slate-500 text-xs font-medium">Sin resultados coincidentes.</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Descripción del trabajo
            </label>
            <textarea
              className="w-full h-full min-h-[140px] border border-slate-200/90 bg-slate-50/60 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all placeholder:text-slate-400 font-medium text-slate-800"
              placeholder="Especificaciones, dimensiones, requerimientos técnicos y observaciones..."
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </div>
        </div>

        {/* Columna Derecha: Configuración y Asignación */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Configuración y Asignación</h2>
              <p className="text-[11px] text-slate-400">Responsables, instalación, prioridad y fechas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tipo de proyecto <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-2 mt-1">
                <label className={`flex items-center gap-2.5 cursor-pointer border p-3 rounded-xl transition-all ${
                  form.requiereInstalacion === true
                    ? 'bg-blue-50/60 border-blue-200 text-blue-900 shadow-2xs'
                    : 'bg-slate-50/60 border-slate-200/90 text-slate-700 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="requiereInstalacion"
                    checked={form.requiereInstalacion === true}
                    onChange={() => set('requiereInstalacion', true)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold">Con instalación</span>
                </label>
                <label className={`flex items-center gap-2.5 cursor-pointer border p-3 rounded-xl transition-all ${
                  form.requiereInstalacion === false
                    ? 'bg-blue-50/60 border-blue-200 text-blue-900 shadow-2xs'
                    : 'bg-slate-50/60 border-slate-200/90 text-slate-700 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="requiereInstalacion"
                    checked={form.requiereInstalacion === false}
                    onChange={() => set('requiereInstalacion', false)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold">Sin instalación</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Prioridad
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PRIORIDADES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('prioridad', p)}
                    className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer
                      ${form.prioridad === p
                        ? `${PRIORIDAD_COLORS[p]} border-current ring-1 ring-current shadow-2xs`
                        : 'bg-slate-50/60 text-slate-500 border-slate-200/90 hover:border-slate-300'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Responsable <span className="text-red-500">*</span> {errors.responsable && <span className="text-red-500 font-normal lowercase ml-1">({errors.responsable})</span>}
              </label>
              <div 
                className={`flex items-center w-full border rounded-xl px-4 py-2.5 text-sm bg-slate-50/60 cursor-text transition-all
                  ${errors.responsable ? 'border-red-400' : 'border-slate-200/90'}
                  ${responsableDropdownOpen ? 'ring-2 ring-blue-500/10 border-blue-500 bg-white' : ''}`}
                onClick={() => setResponsableDropdownOpen(true)}
              >
                <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Asignar empleado…"
                  className="w-full bg-transparent outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
                  value={responsableSearch}
                  onChange={(e) => {
                    setResponsableSearch(e.target.value);
                    setResponsableDropdownOpen(true);
                  }}
                  onFocus={() => setResponsableDropdownOpen(true)}
                />
                <ChevronDown className="w-4 h-4 text-slate-400 ml-2 shrink-0 cursor-pointer" onClick={(e) => {
                  e.stopPropagation();
                  setResponsableDropdownOpen(!responsableDropdownOpen);
                }} />
              </div>

              {responsableDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setResponsableDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto overflow-hidden">
                    {empleados.filter(e => e.nombre.toLowerCase().includes(responsableSearch.toLowerCase())).length > 0 ? (
                      empleados.filter(e => e.nombre.toLowerCase().includes(responsableSearch.toLowerCase())).map(emp => (
                        <div
                          key={emp.id}
                          className={`px-4 py-3 hover:bg-blue-50/80 cursor-pointer transition-colors border-b border-slate-100 last:border-0
                            ${form.responsable === emp.nombre ? 'bg-blue-50/90' : ''}`}
                          onClick={() => {
                            set('responsable', emp.nombre);
                            setResponsableSearch(emp.nombre);
                            setResponsableDropdownOpen(false);
                          }}
                        >
                          <p className="font-semibold text-slate-800 text-sm">{emp.nombre}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{emp.cargo || 'Colaborador'}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-500 text-xs font-medium">Sin resultados coincidentes.</div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Fecha de inicio
              </label>
              <input
                type="date"
                className="w-full border border-slate-200/90 bg-slate-100/80 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium cursor-default"
                value={form.fechaInicio}
                readOnly
                title="Se registra automáticamente al crear el proyecto"
              />
              <p className="text-[10px] text-slate-400 mt-1">Se asigna la fecha actual automáticamente.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Etiquetas
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-200/90 bg-slate-50/60 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800"
                placeholder="Ej: urgente, acrílico, letrero..."
                value={form.etiquetaInput}
                onChange={(e) => set('etiquetaInput', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEtiqueta())}
              />
              <button
                type="button"
                onClick={addEtiqueta}
                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 font-semibold text-xs transition-colors border border-blue-100 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
            {form.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {form.etiquetas.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 text-xs px-3 py-1 rounded-full font-semibold">
                    {tag}
                    <button
                      type="button"
                      onClick={() => set('etiquetas', form.etiquetas.filter((t) => t !== tag))}
                      className="hover:text-red-500 text-slate-400 rounded-full w-4 h-4 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Notas iniciales
            </label>
            <textarea
              className="w-full border border-slate-200/90 bg-slate-50/60 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-xl px-4 py-2.5 text-sm outline-none resize-none transition-all min-h-[90px] placeholder:text-slate-400 font-medium text-slate-800"
              placeholder="Observaciones iniciales, notas de cotización o detalles de entrega..."
              value={form.notasCotizacion}
              onChange={(e) => set('notasCotizacion', e.target.value)}
            />
          </div>

        </div>

      </div>
    </div>
  );
}


