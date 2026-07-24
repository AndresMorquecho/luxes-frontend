// src/features/proyectos/ui/pages/NuevoProyectoPage.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Search, ChevronDown, Info, ClipboardList, FolderPlus } from 'lucide-react';
import { useProyectos } from '../../application/hooks/useProyectos.js';
import { getClientes } from '../../../clientes/application/clientesService.js';
import { getTodayDateISO } from '../../domain/utils/proyectoDates.js';
import {
  ComprasHeaderButton,
  ComprasHeaderGhostButton,
} from '../../../compras/ui/components/ComprasPageHeader';

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
  medio: 'LUXES',
};

const inputClass =
  'w-full h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';
const labelClass = 'block text-xs font-semibold text-slate-500 mb-1.5';
const textareaClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors resize-none';

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
    getClientes().then((data) => {
      const clientesData = data?.data || data || [];
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setClientesLoading(false);
    }).catch((err) => {
      console.error('Error al cargar clientes:', err);
      setClientesLoading(false);
    });

    const token = localStorage.getItem('token');
    fetch('/api/empleados', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const empleadosData = Array.isArray(data.data) ? data.data : [];
          setEmpleados(empleadosData);
        }
        setEmpleadosLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar empleados:', err);
        setEmpleadosLoading(false);
      });
  }, []);

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
      const clienteObj = clientes.find((c) => c.id === form.clienteId) || clientes[0];

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
        medio: form.medio,
      });
      navigate(`/proyectos/${proyecto.id}`);
    } catch (err) {
      setErrors({ submit: err.message });
      setGuardando(false);
    }
  }

  const filteredClientes = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(clientSearch.toLowerCase()),
  );
  const filteredEmpleados = empleados.filter((e) =>
    e.nombre.toLowerCase().includes(responsableSearch.toLowerCase()),
  );

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10 w-full"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 sm:px-7 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate('/proyectos')}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors"
              title="Volver"
              aria-label="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <FolderPlus className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">Nuevo Proyecto</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Proyectos
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                Completa la información para registrar un proyecto
              </p>
            </div>
          </div>
          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <ComprasHeaderGhostButton onClick={() => navigate('/proyectos')}>
              Cancelar
            </ComprasHeaderGhostButton>
            <ComprasHeaderButton onClick={handleSubmit} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Crear Proyecto'}
              <Check size={15} />
            </ComprasHeaderButton>
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        {/* Información principal */}
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Info size={15} />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">Información principal</h2>
          </div>

          <div>
            <label className={labelClass}>
              Nombre del proyecto *
              {errors.nombre && <span className="text-rose-500 font-normal ml-1">({errors.nombre})</span>}
            </label>
            <input
              className={`${inputClass} ${errors.nombre ? 'border-rose-400' : ''}`}
              placeholder="Ej: Letrero luminoso"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
            />
          </div>

          <div className="relative">
            <label className={labelClass}>
              Cliente *
              {errors.clienteId && <span className="text-rose-500 font-normal ml-1">({errors.clienteId})</span>}
            </label>
            <div
              className={`flex items-center w-full h-10 border rounded-xl px-3 text-sm bg-gray-50 cursor-text transition-colors
                ${errors.clienteId ? 'border-rose-400' : 'border-slate-200'}
                ${clientDropdownOpen ? 'ring-2 ring-blue-100 border-blue-300 bg-white' : ''}`}
              onClick={() => setClientDropdownOpen(true)}
            >
              <Search size={15} className="text-slate-400 mr-2 shrink-0" />
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
              <ChevronDown
                size={15}
                className="text-slate-400 ml-2 shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setClientDropdownOpen(!clientDropdownOpen);
                }}
              />
            </div>

            {clientDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setClientDropdownOpen(false)} />
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                  {clientesLoading ? (
                    <div className="px-4 py-6 text-center text-slate-400 text-sm">Cargando clientes…</div>
                  ) : filteredClientes.length > 0 ? (
                    filteredClientes.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0
                          ${form.clienteId === c.id ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          set('clienteId', c.id);
                          setClientSearch(c.nombre);
                          setClientDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800 text-sm">{c.nombre}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.tipo === 'Empresa' ? 'text-indigo-600 bg-indigo-50' : 'text-blue-600 bg-blue-50'}`}>
                            {c.tipo}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.cedulaRuc} · {c.telefono}</p>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-slate-500 text-sm">Sin resultados.</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className={labelClass}>Descripción del trabajo</label>
            <textarea
              className={`${textareaClass} min-h-[140px]`}
              placeholder="Especificaciones, dimensiones, detalles técnicos..."
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </div>
        </div>

        {/* Configuración y asignación */}
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <ClipboardList size={15} />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">Configuración y asignación</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tipo de proyecto *</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-slate-200 px-3 py-2.5 rounded-xl hover:border-blue-300 transition-colors">
                  <input
                    type="radio"
                    name="requiereInstalacion"
                    checked={form.requiereInstalacion === true}
                    onChange={() => set('requiereInstalacion', true)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">Con instalación</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-slate-200 px-3 py-2.5 rounded-xl hover:border-blue-300 transition-colors">
                  <input
                    type="radio"
                    name="requiereInstalacion"
                    checked={form.requiereInstalacion === false}
                    onChange={() => set('requiereInstalacion', false)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">Sin instalación</span>
                </label>
              </div>
            </div>

            <div>
              <label className={labelClass}>Prioridad</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORIDADES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('prioridad', p)}
                    className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all border text-center
                      ${form.prioridad === p
                        ? `${PRIORIDAD_COLORS[p]} border-current ring-1 ring-current shadow-sm`
                        : 'bg-gray-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className={labelClass}>
                Responsable *
                {errors.responsable && <span className="text-rose-500 font-normal ml-1">({errors.responsable})</span>}
              </label>
              <div
                className={`flex items-center w-full h-10 border rounded-xl px-3 text-sm bg-gray-50 cursor-text transition-colors
                  ${errors.responsable ? 'border-rose-400' : 'border-slate-200'}
                  ${responsableDropdownOpen ? 'ring-2 ring-blue-100 border-blue-300 bg-white' : ''}`}
                onClick={() => setResponsableDropdownOpen(true)}
              >
                <Search size={15} className="text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Asignar a…"
                  className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400"
                  value={responsableSearch}
                  onChange={(e) => {
                    setResponsableSearch(e.target.value);
                    setResponsableDropdownOpen(true);
                  }}
                  onFocus={() => setResponsableDropdownOpen(true)}
                />
                <ChevronDown
                  size={15}
                  className="text-slate-400 ml-2 shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResponsableDropdownOpen(!responsableDropdownOpen);
                  }}
                />
              </div>

              {responsableDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setResponsableDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                    {empleadosLoading ? (
                      <div className="px-4 py-6 text-center text-slate-400 text-sm">Cargando…</div>
                    ) : filteredEmpleados.length > 0 ? (
                      filteredEmpleados.map((emp) => (
                        <button
                          type="button"
                          key={emp.id}
                          className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0
                            ${form.responsable === emp.nombre ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            set('responsable', emp.nombre);
                            setResponsableSearch(emp.nombre);
                            setResponsableDropdownOpen(false);
                          }}
                        >
                          <p className="font-semibold text-slate-800 text-sm">{emp.nombre}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{emp.cargo}</p>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">Sin resultados.</div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <label className={labelClass}>Fecha de inicio</label>
              <input
                type="date"
                className={`${inputClass} bg-slate-100 cursor-default`}
                value={form.fechaInicio}
                readOnly
                title="Se registra automáticamente al crear el proyecto"
              />
              <p className="text-[11px] text-slate-400 mt-1">Se guarda con la fecha de hoy al crear el proyecto.</p>
            </div>

            <div>
              <label className={labelClass}>Entrega estimada</label>
              <input
                type="date"
                className={inputClass}
                value={form.fechaEntregaEstimada}
                onChange={(e) => set('fechaEntregaEstimada', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Medio de consecución *</label>
              <select
                className={inputClass}
                value={form.medio}
                onChange={(e) => set('medio', e.target.value)}
              >
                <option value="LUXES">LUXES</option>
                <option value="REDES">REDES</option>
                <option value="VENDEDORES">VENDEDORES</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Etiquetas</label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Ej: urgente, acrílico…"
                value={form.etiquetaInput}
                onChange={(e) => set('etiquetaInput', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEtiqueta())}
              />
              <button
                type="button"
                onClick={addEtiqueta}
                className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {form.etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.etiquetas.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium border border-blue-100">
                    {tag}
                    <button
                      type="button"
                      onClick={() => set('etiquetas', form.etiquetas.filter((t) => t !== tag))}
                      className="hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Notas iniciales</label>
            <textarea
              className={`${textareaClass} min-h-[90px]`}
              placeholder="Referencia de pago, observaciones…"
              value={form.notasCotizacion}
              onChange={(e) => set('notasCotizacion', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
