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
    case 'Presente': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Atraso': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Falta': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
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
    <div className="space-y-4 sm:space-y-6 animate-slide-up asistencia-page" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .asistencia-page, .asistencia-page * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .btn-primary { background: linear-gradient(135deg, #0b2d64 0%, #164e96 100%); border: 1px solid rgba(200,150,62,0.4); color: white; transition: all 0.15s ease; }
        .btn-primary:hover { background: linear-gradient(135deg, #071f45 0%, #0b2d64 100%); border-color: #c8963e; box-shadow: 0 4px 14px rgba(11,45,100,0.35); }
        .btn-ghost { transition: all 0.15s ease; }
        .btn-ghost:hover { background: #f1f5f9; }
        .input-field { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; font-weight: 500; color: #1e293b; outline: none; transition: all 0.15s ease; background: white; width: 100%; }
        .input-field:focus { border-color: #93c5fd; ring: 2px; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .input-field::placeholder { color: #94a3b8; }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-in {
          from { transform: scale(0.96) translateY(12px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-modal-in { animation: modal-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .asistencia-table td:first-child,
        .asistencia-table td:first-child .normal-case {
          text-transform: none !important;
        }
      `}</style>

      {/* Header Premium */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">
                  Registro de Asistencia
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                  Activo
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Control de entrada y salida de colaboradores
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => navigate('/nomina')}
            className="btn-ghost inline-flex items-center justify-center gap-2 px-4 py-2 text-slate-600 rounded-xl font-semibold text-sm whitespace-nowrap transition-all border border-slate-200 w-full lg:w-auto"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver a Nómina
          </button>
        </div>
      </div>

      {/* Contenedor de la Tabla con Sombras Suaves */}
      <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm asistencia-table text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Entrada</th>
                <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Salida</th>
                <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {registros.map(r => {
                const emp = empleadoMap[r.empleadoId];
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 transition-transform group-hover:scale-105">
                          <PersonInitialsAvatar name={emp?.nombre} seed={emp?.id} size="sm" image={emp?.foto} />
                        </div>
                        <span className="font-semibold text-slate-800 normal-case">{emp?.nombre || `ID ${r.empleadoId}`}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-medium text-slate-600">{r.fecha}</td>
                    <td className="px-5 py-3.5 text-[13px] font-mono font-medium text-slate-700">{r.entrada}</td>
                    <td className="px-5 py-3.5 text-[13px] font-mono font-medium text-slate-700">{r.salida}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass(r.estado)}`}>
                        {r.estado}
                      </span>
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
