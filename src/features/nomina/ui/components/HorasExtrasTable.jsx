// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/components/HorasExtrasTable.jsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HoraExtra } from '../../domain/entities/HoraExtra';
import { calcularHorasExtras } from '../../domain/use-cases/calcularHorasExtras';

const formatUSD = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export const HorasExtrasTable = ({ employees, initialOvertime, onSave, onSummaryChange, onAlert }) => {
  const [records, setRecords] = useState(() =>
    (initialOvertime ?? []).map(he => ({
      id: he.id,
      fecha: he.fecha,
      colaboradorId: he.colaboradorId,
      horas: he.horas,
      detalleHorario: he.detalleHorario,
      descripcion: he.descripcion,
      valorPorHora: he.valorPorHora,
    }))
  );

  useEffect(() => {
    setRecords((prev) => {
      if (prev.length > 0) return prev;
      return (initialOvertime ?? []).map(he => ({
        id: he.id,
        fecha: he.fecha,
        colaboradorId: he.colaboradorId,
        horas: he.horas,
        detalleHorario: he.detalleHorario,
        descripcion: he.descripcion,
        valorPorHora: he.valorPorHora,
      }));
    });
  }, [initialOvertime]);

  useEffect(() => {
    if (employees.length === 0) return;
    setRecords((prev) =>
      prev.map((row) => {
        const isValid = employees.some((emp) => emp.id === row.colaboradorId);
        if (isValid) return row;
        return { ...row, colaboradorId: employees[0].id };
      })
    );
  }, [employees]);

  // Calcular resumen consolidado reactivo
  const summary = useMemo(() => {
    // Mapear records a entidades para calcular
    const heEntities = records.map(r => new HoraExtra(r));
    return calcularHorasExtras(employees, heEntities);
  }, [records, employees]);

  const handleChange = (id, field, value) => {
    setRecords(prev =>
      prev.map(row => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          return updated;
        }
        return row;
      })
    );
  };

  const handleAddRow = useCallback(() => {
    if (employees.length === 0) {
      onAlert?.(
        'Sin colaboradores',
        'No hay colaboradores disponibles para agregar a la planilla.',
        'warning'
      );
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const firstEmpId = employees[0].id;
    const newRow = {
      id: Math.random().toString(36).substr(2, 9),
      fecha: today,
      colaboradorId: firstEmpId,
      horas: 1,
      detalleHorario: '17:30 - 18:30',
      descripcion: 'Horas extras de soporte',
      valorPorHora: 2.50,
    };
    setRecords((prev) => [...prev, newRow]);
  }, [employees, onAlert]);

  const handleRemoveRow = (id) => {
    setRecords(prev => prev.filter(row => row.id !== id));
  };

  const handleSave = useCallback(() => {
    try {
      const entities = records.map(r => {
        const entity = new HoraExtra(r);
        entity.validate();
        return entity;
      });
      onSave(entities);
    } catch (err) {
      onAlert?.('Error en la planilla', err.message, 'error');
    }
  }, [records, onSave, onAlert]);

  useEffect(() => {
    onSummaryChange?.(summary);
  }, [summary, onSummaryChange]);

  return (
    <div className="animate-slide-up">
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden flex flex-col premium-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Planilla de Horas Extras</h2>
            <span className="text-xs font-medium text-gray-400">{records.length} registro{records.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-gray-50 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar Fila
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1d4ed8' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
              </svg>
              Guardar Planilla
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
        {records.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No hay registros de horas extras en esta planilla. Haz clic en "Agregar Fila" para comenzar.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[450px] sticky-scrollbar">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest sticky top-0 z-10 sticky-table-header">
                <tr>
                  <th className="px-3 py-3 w-[125px]">Fecha</th>
                  <th className="px-3 py-3 w-[180px]">Colaborador</th>
                  <th className="px-3 py-3 w-[70px] text-center">Horas</th>
                  <th className="px-3 py-3 w-[110px]">Detalle Horario</th>
                  <th className="px-3 py-3">Descripción</th>
                  <th className="px-3 py-3 w-[80px]">V/Hora</th>
                  <th className="px-3 py-3 w-[80px]">Total</th>
                  <th className="px-3 py-3 w-[45px] text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {records.map((row) => {
                  const calculatedTotal = Number(row.horas || 0) * Number(row.valorPorHora || 0);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={row.fecha}
                          onChange={(e) => handleChange(row.id, 'fecha', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 payroll-input"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={row.colaboradorId ?? ''}
                          onChange={(e) => handleChange(row.id, 'colaboradorId', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer payroll-input"
                        >
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={row.horas}
                          onChange={(e) => handleChange(row.id, 'horas', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-center font-bold text-gray-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 payroll-input"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          placeholder="17:30 - 20:00"
                          value={row.detalleHorario}
                          onChange={(e) => handleChange(row.id, 'detalleHorario', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 payroll-input"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          placeholder="Detalle de tarea..."
                          value={row.descripcion}
                          onChange={(e) => handleChange(row.id, 'descripcion', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 payroll-input"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.valorPorHora}
                          onChange={(e) => handleChange(row.id, 'valorPorHora', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 payroll-input"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        {formatUSD(calculatedTotal)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-red-500 hover:text-red-700 font-bold text-sm outline-none cursor-pointer"
                          title="Eliminar registro"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        </div>
      </div>
    </div>
  );
};
