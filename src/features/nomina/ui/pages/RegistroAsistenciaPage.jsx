import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNomina } from '../../application/hooks/useNomina';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';

const MOCK_ASISTENCIA = [
  { id: 1, empleadoId: 1, fecha: '2026-06-01', entrada: '08:00', salida: '17:00', estado: 'Presente' },
  { id: 2, empleadoId: 2, fecha: '2026-06-01', entrada: '08:15', salida: '17:00', estado: 'Atraso' },
  { id: 3, empleadoId: 3, fecha: '2026-06-01', entrada: '08:00', salida: '16:30', estado: 'Presente' },
  { id: 4, empleadoId: 4, fecha: '2026-06-01', entrada: '-', salida: '-', estado: 'Falta' },
  { id: 5, empleadoId: 5, fecha: '2026-06-02', entrada: '07:50', salida: '17:10', estado: 'Presente' },
  { id: 6, empleadoId: 6, fecha: '2026-06-02', entrada: '08:05', salida: '17:00', estado: 'Presente' },
  { id: 7, empleadoId: 1, fecha: '2026-06-02', entrada: '08:00', salida: '17:00', estado: 'Presente' },
  { id: 8, empleadoId: 3, fecha: '2026-06-02', entrada: '09:00', salida: '17:00', estado: 'Atraso' },
  { id: 9, empleadoId: 2, fecha: '2026-06-03', entrada: '08:00', salida: '17:00', estado: 'Presente' },
  { id: 10, empleadoId: 4, fecha: '2026-06-03', entrada: '08:00', salida: '17:00', estado: 'Presente' },
];

const badgeClass = (estado) => {
  switch (estado) {
    case 'Presente': return 'bg-green-100 text-green-700 border-green-200';
    case 'Atraso': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'Falta': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const RegistroAsistenciaPage = () => {
  const navigate = useNavigate();
  const { employees, loadData } = useNomina();
  const [registros] = useState(MOCK_ASISTENCIA);

  useEffect(() => { loadData(); }, [loadData]);

  const empleadoMap = {};
  employees.forEach(e => { empleadoMap[e.id] = e; });

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider">
        <button onClick={() => navigate('/nomina')} className="hover:text-blue-700 font-bold transition-all">Nómina</button>
        <span>/</span>
        <span className="font-semibold text-gray-800">Registro de Asistencia</span>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">Registro de Asistencia</h1>
        <p className="text-gray-500 text-sm mt-1">Control de entrada y salida de colaboradores.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Entrada</th>
                <th className="text-left px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Salida</th>
                <th className="text-center px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registros.map(r => {
                const emp = empleadoMap[r.empleadoId];
                return (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PersonInitialsAvatar name={emp?.nombre} seed={emp?.id} size="sm" image={emp?.foto} />
                        <span className="font-medium text-gray-800 normal-case">{emp?.nombre || `ID ${r.empleadoId}`}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">{r.fecha}</td>
                    <td className="px-5 py-3 text-xs font-mono text-gray-600">{r.entrada}</td>
                    <td className="px-5 py-3 text-xs font-mono text-gray-600">{r.salida}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badgeClass(r.estado)}`}>{r.estado}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
