import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNomina } from '../../application/hooks/useNomina';
import { getPersonInitials } from '../../../../shared/utils/personInitials.js';

export const CredencialesPage = () => {
  const navigate = useNavigate();
  const { employees, loadData } = useNomina();

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider">
        <button onClick={() => navigate('/nomina')} className="hover:text-blue-700 font-bold transition-all">Nómina</button>
        <span>/</span>
        <span className="font-semibold text-gray-800">Credenciales</span>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">Credenciales</h1>
        <p className="text-gray-500 text-sm mt-1">Tarjetas de identificación de colaboradores.</p>
      </div>

      {employees.length === 0 ? (
        <div className="flex justify-center items-center py-20 text-gray-500 text-sm">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-5 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-sm font-black text-white overflow-hidden normal-case leading-none">
                    <span className="normal-case">{getPersonInitials(emp.nombre)}</span>
                  </div>
                  <span className="bg-white/10 text-white border border-white/20 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {emp.id || 'EMP'}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-sm font-bold text-gray-900 normal-case">{emp.nombre}</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <span className="text-gray-400 font-medium">Cargo</span>
                  <span className="text-gray-700 font-semibold text-right">{emp.cargo || '-'}</span>
                  <span className="text-gray-400 font-medium">Depto.</span>
                  <span className="text-gray-700 font-semibold text-right">{emp.departamento || '-'}</span>
                  <span className="text-gray-400 font-medium">Cédula</span>
                  <span className="text-gray-700 font-semibold text-right font-mono">{emp.cedula || '-'}</span>
                  <span className="text-gray-400 font-medium">Sueldo</span>
                  <span className="text-gray-700 font-semibold text-right">${Number(emp.sueldoDiario).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
