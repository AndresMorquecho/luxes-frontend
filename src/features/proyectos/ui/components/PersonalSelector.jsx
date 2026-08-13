// src/features/proyectos/ui/components/PersonalSelector.jsx

import React, { useState } from 'react';
import { Search, CheckCircle2, User, UserCheck, ShieldCheck, FileText } from 'lucide-react';
import { AsignacionPersonal } from '../../domain/entities/AsignacionPersonal.js';

const ROLES = AsignacionPersonal.ROLES;

export function PersonalSelector({ empleados = [], personalAsignado = [], onChange, soloLectura = false }) {
  const [filterText, setFilterText] = useState('');

  // Helper para iniciales
  const getInitials = (name = '') => {
    return name
      .split(' ')
      .filter((w) => w.length > 0)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Toggle de asignación de empleado
  const toggleEmpleado = (emp) => {
    if (soloLectura) return;
    const exists = personalAsignado.some((p) => p.empleadoId === emp.id);
    if (exists) {
      onChange(personalAsignado.filter((p) => p.empleadoId !== emp.id));
    } else {
      // Por defecto asignar primer rol o 'Instalador principal'
      onChange([
        ...personalAsignado,
        {
          empleadoId: emp.id,
          nombre: emp.nombre,
          cargo: emp.cargo || 'Personal',
          rol: ROLES[0] || 'Instalador principal',
          notas: '',
        },
      ]);
    }
  };

  // Cambio de atributos (rol, notas)
  const handleChangeAttribute = (empleadoId, campo, valor) => {
    if (soloLectura) return;
    onChange(
      personalAsignado.map((p) => (p.empleadoId === empleadoId ? { ...p, [campo]: valor } : p))
    );
  };

  // Filtrar lista de empleados si hay búsqueda
  const filteredEmployees = empleados.filter((emp) =>
    (emp.nombre || '').toLowerCase().includes(filterText.toLowerCase()) ||
    (emp.cargo || '').toLowerCase().includes(filterText.toLowerCase())
  );

  // Si es solo lectura, filtramos únicamente los asignados
  const displayEmployees = soloLectura
    ? empleados.filter((emp) => personalAsignado.some((p) => p.empleadoId === emp.id))
    : filteredEmployees;

  return (
    <div className="space-y-4">
      {/* Buscador opcional si hay más de 5 empleados */}
      {!soloLectura && empleados.length > 5 && (
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            placeholder="Filtrar por nombre o cargo..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      )}

      {/* Grid de Tarjetas de Empleados */}
      {displayEmployees.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <User size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs text-slate-500 font-medium">
            {soloLectura ? 'No hay personal asignado a esta instalación' : 'No se encontraron empleados disponibles'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayEmployees.map((emp) => {
            const asignacion = personalAsignado.find((p) => p.empleadoId === emp.id);
            const isAssigned = !!asignacion;

            return (
              <div
                key={emp.id}
                className={`relative w-full overflow-hidden box-border rounded-2xl border transition-all duration-200 p-3.5 flex flex-col justify-between ${
                  isAssigned
                    ? 'border-indigo-500 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Cabecera de la Tarjeta con Switch */}
                <div className="flex items-center justify-between gap-2 mb-2 w-full overflow-hidden">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                        isAssigned
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {getInitials(emp.nombre)}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-800 truncate block w-full" title={emp.nombre}>
                        {emp.nombre}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate block w-full">{emp.cargo || 'Taller'}</p>
                    </div>
                  </div>

                  {/* Switch Toggle Rápidos */}
                  {!soloLectura && (
                    <button
                      type="button"
                      onClick={() => toggleEmpleado(emp)}
                      className={`relative inline-flex h-6 w-11 shrink-0 ml-auto cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 ${
                        isAssigned ? 'bg-indigo-600' : 'bg-slate-200'
                      }`}
                      role="switch"
                      aria-checked={isAssigned}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isAssigned ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  )}

                  {soloLectura && isAssigned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      <CheckCircle2 size={12} /> Asignado
                    </span>
                  )}
                </div>

                {/* Contenido expandible si está asignado */}
                {isAssigned && (
                  <div className="mt-3 pt-3 border-t border-indigo-100/80 space-y-2.5 animate-fadeIn">
                    {/* Pills de Selección de Rol */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Rol en Instalación:
                      </span>
                      {soloLectura ? (
                        <span className="inline-block bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                          {asignacion.rol}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ROLES.map((r) => {
                            const isSelected = asignacion.rol === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => handleChangeAttribute(emp.id, 'rol', r)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Notas u Observaciones */}
                    <div>
                      {soloLectura ? (
                        asignacion.notas || asignacion.notes ? (
                          <p className="text-[11px] text-slate-600 italic bg-white/60 p-1.5 rounded-lg border border-slate-100">
                            "{asignacion.notas || asignacion.notes}"
                          </p>
                        ) : null
                      ) : (
                        <input
                          type="text"
                          value={asignacion.notas || asignacion.notes || ''}
                          onChange={(e) => handleChangeAttribute(emp.id, 'notas', e.target.value)}
                          placeholder="Nota (ej. conduce, trae herramientas)..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-indigo-200/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 placeholder:text-slate-400"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

