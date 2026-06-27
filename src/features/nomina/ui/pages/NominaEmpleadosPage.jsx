import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNomina } from '../../application/hooks/useNomina';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';

export const NominaEmpleadosPage = () => {
  const navigate = useNavigate();
  const { employees, loadData } = useNomina();

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider">
        <button onClick={() => navigate('/nomina')} className="hover:text-blue-700 font-bold transition-all">Nómina</button>
        <span>/</span>
        <span className="font-semibold text-gray-800">Empleados</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">Empleados</h1>
          <p className="text-gray-500 text-sm mt-1">Colaboradores registrados en el sistema de nómina.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">#</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Cédula</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Cargo</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Departamento</th>
                <th className="text-right px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sueldo Diario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp, i) => (
                <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 text-xs font-mono text-gray-400">{emp.id}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <PersonInitialsAvatar name={emp.nombre} seed={emp.id || emp.nombre} size="sm" />
                      <span className="font-medium text-gray-800 normal-case">{emp.nombre}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-gray-600">{emp.cedula || '-'}</td>
                  <td className="px-5 py-3 text-xs text-gray-600">{emp.cargo || '-'}</td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{emp.departamento || '-'}</span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                    ${Number(emp.sueldoDiario).toFixed(2)}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-gray-400">No hay empleados registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
