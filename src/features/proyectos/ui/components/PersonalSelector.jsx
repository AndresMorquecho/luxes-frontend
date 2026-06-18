// src/features/proyectos/ui/components/PersonalSelector.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Search, UserCheck, X, FileEdit } from 'lucide-react';
import { AsignacionPersonal } from '../../domain/entities/AsignacionPersonal.js';

const ROLES = AsignacionPersonal.ROLES;

export function PersonalSelector({ empleados = [], personalAsignado = [], onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unassignedEmployees = empleados.filter(
    (emp) => !personalAsignado.some((p) => p.empleadoId === emp.id) &&
             (emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
              emp.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (empleado) => {
    onChange([
      ...personalAsignado,
      { empleadoId: empleado.id, nombre: empleado.nombre, cargo: empleado.cargo, rol: ROLES[1], notas: '' }
    ]);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const handleRemove = (empleadoId) => {
    onChange(personalAsignado.filter((p) => p.empleadoId !== empleadoId));
  };

  const handleChangeAtributo = (empleadoId, campo, valor) => {
    onChange(
      personalAsignado.map((p) =>
        p.empleadoId === empleadoId ? { ...p, [campo]: valor } : p
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="relative" ref={searchRef}>
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-colors"
          placeholder="Buscar personal por nombre o cargo..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
        />
        
        {/* Dropdown */}
        {isDropdownOpen && searchTerm.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {unassignedEmployees.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                No se encontró personal disponible
              </div>
            ) : (
              unassignedEmployees.map((emp) => (
                <button
                  key={emp.id}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors text-left"
                  onClick={() => handleSelect(emp)}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{emp.nombre}</p>
                    <p className="text-xs text-slate-500">{emp.cargo}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Lista/Tabla de personal asignado */}
      {personalAsignado.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="p-3 font-bold uppercase tracking-wider">Nombre / Cargo</th>
                <th className="p-3 font-bold uppercase tracking-wider" style={{ width: '150px' }}>Rol de Instalación</th>
                <th className="p-3 font-bold uppercase tracking-wider">Observaciones</th>
                <th className="p-3 font-bold uppercase tracking-wider text-center" style={{ width: '80px' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {personalAsignado.map((p) => (
                <tr key={p.empleadoId} className="border-b border-slate-100 text-slate-600 hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="font-bold text-slate-800">{p.nombre}</div>
                    <div className="text-[10px] text-slate-400">{p.cargo || 'Personal'}</div>
                  </td>
                  <td className="p-3">
                    <select
                      value={p.rol}
                      onChange={(e) => handleChangeAtributo(p.empleadoId, 'rol', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={p.notes || p.notas || ''}
                      onChange={(e) => handleChangeAtributo(p.empleadoId, 'notas', e.target.value)}
                      placeholder="Ej. Lleva la escalera..."
                      className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => handleRemove(p.empleadoId)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                      title="Quitar personal"
                    >
                      <X size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
