// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/components/HorasExtrasTable.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { HoraExtra } from '../../domain/entities/HoraExtra';
import { calcularHorasExtras } from '../../domain/use-cases/calcularHorasExtras';
import { toast } from '../../../../shared/ui/components/Toast';

const formatUSD = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const parts = fechaStr.split('T')[0].split('-');
  if (parts.length !== 3) return fechaStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const HorasExtrasTable = ({ employees, initialOvertime, onSave, fechasActuales }) => {
  const [records, setRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    fecha: '',
    colaboradorId: '',
    horas: 1,
    detalleHorario: '',
    descripcion: '',
    valorPorHora: 2.50,
    estado: 'DEUDOR',
  });

  // Sincronizar el estado local cuando cambia la planilla inicial (ej. cambio de período)
  useEffect(() => {
    setRecords(
      initialOvertime.map(he => ({
        id: he.id,
        fecha: he.fecha,
        colaboradorId: he.colaboradorId,
        horas: Number(he.horas),
        detalleHorario: he.detalleHorario,
        descripcion: he.descripcion,
        valorPorHora: Number(he.valorPorHora),
        estado: he.estado || 'DEUDOR',
      }))
    );
  }, [initialOvertime]);

  // Inicializar campos de fecha y colaborador del modal al abrirse
  useEffect(() => {
    if (isModalOpen) {
      const today = new Date().toISOString().split('T')[0];
      let defaultFecha = today;
      if (fechasActuales) {
        if (today >= fechasActuales.fechaInicio && today <= fechasActuales.fechaFin) {
          defaultFecha = today;
        } else {
          defaultFecha = fechasActuales.fechaInicio;
        }
      }
      const firstEmpId = employees.length > 0 ? employees[0].id : '';
      setModalData({
        fecha: defaultFecha,
        colaboradorId: firstEmpId,
        horas: 1,
        detalleHorario: '17:30 - 18:30',
        descripcion: 'Horas extras de soporte',
        valorPorHora: 2.50,
        estado: 'DEUDOR',
      });
    }
  }, [isModalOpen, employees, fechasActuales]);

  // Calcular resumen consolidado reactivo
  const summary = useMemo(() => {
    const heEntities = records.map(r => new HoraExtra(r));
    return calcularHorasExtras(employees, heEntities);
  }, [records, employees]);

  // Sincronizar cambios en el backend
  const syncWithBackend = async (updatedRecords, successMessage) => {
    try {
      const entities = updatedRecords.map(r => new HoraExtra(r));
      await onSave(entities);
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (err) {
      toast.error(`Error al guardar en el servidor: ${err.message}`);
    }
  };

  // Alternar el estado (Pagado / Por Pagar) instantáneamente al dar clic
  const handleToggleEstado = async (id) => {
    const updated = records.map(row => {
      if (row.id === id) {
        const nextEstado = row.estado === 'PAGADO' ? 'DEUDOR' : 'PAGADO';
        return { ...row, estado: nextEstado };
      }
      return row;
    });
    setRecords(updated);
    await syncWithBackend(updated, 'Estado de pago de horas extras actualizado.');
  };

  // Eliminar un registro instantáneamente
  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este registro de horas extras?')) return;
    const updated = records.filter(row => row.id !== id);
    setRecords(updated);
    await syncWithBackend(updated, 'Registro de horas extras eliminado.');
  };

  // Crear un nuevo registro desde el formulario modal
  const handleAddSubmit = async (e) => {
    e.preventDefault();

    if (!modalData.fecha || !modalData.colaboradorId || !modalData.horas || !modalData.descripcion) {
      toast.error('Por favor, completa todos los campos obligatorios.');
      return;
    }

    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      fecha: modalData.fecha,
      colaboradorId: Number(modalData.colaboradorId) ? Number(modalData.colaboradorId) : String(modalData.colaboradorId),
      horas: Number(modalData.horas),
      detalleHorario: modalData.detalleHorario,
      descripcion: modalData.descripcion,
      valorPorHora: Number(modalData.valorPorHora),
      estado: modalData.estado,
    };

    const updated = [...records, newRecord];
    setRecords(updated);
    setIsModalOpen(false);
    await syncWithBackend(updated, 'Horas extras registradas correctamente.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-slide-up">
      
      {/* Planilla de Historial / Registros (9 columnas en lg) */}
      <div className="lg:col-span-9 bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden flex flex-col p-6 space-y-4 premium-card">
        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
          <div>
            <h2 className="text-base font-extrabold text-blue-900 uppercase tracking-wide">Planilla de Horas Extras</h2>
            <p className="text-gray-500 text-xs mt-0.5">Historial acumulado del período seleccionado. Cualquier cambio se guarda automáticamente.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
          >
            <span>➕</span> Registrar Horas Extras
          </button>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No hay registros de horas extras en esta planilla. Haz clic en "Registrar Horas Extras" para ingresar una nueva jornada.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] sticky-scrollbar">
            <table className="min-w-full divide-y divide-gray-250 text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0 z-10 sticky-table-header">
                <tr>
                  <th className="px-4 py-3.5 w-[100px]">Fecha</th>
                  <th className="px-4 py-3.5 w-[180px]">Colaborador</th>
                  <th className="px-4 py-3.5 w-[65px] text-center">Horas</th>
                  <th className="px-4 py-3.5 w-[110px]">Horario</th>
                  <th className="px-4 py-3.5">Descripción</th>
                  <th className="px-4 py-3.5 w-[70px]">V/Hora</th>
                  <th className="px-4 py-3.5 w-[75px]">Total</th>
                  <th className="px-4 py-3.5 w-[95px] text-center">Estado</th>
                  <th className="px-4 py-3.5 w-[45px] text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {records.map((row) => {
                  const emp = employees.find(e => e.id === row.colaboradorId);
                  const empName = emp ? emp.nombre : 'Empleado no encontrado';
                  const calculatedTotal = row.horas * row.valorPorHora;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-600 text-xs whitespace-nowrap">
                        {formatFecha(row.fecha)}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800 text-xs uppercase truncate max-w-[170px]">
                        {empName}
                      </td>
                      <td className="px-4 py-3 font-black text-gray-800 text-xs text-center">
                        {row.horas}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {row.detalleHorario || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]">
                        {row.descripcion}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {formatUSD(row.valorPorHora)}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-blue-900 text-xs">
                        {formatUSD(calculatedTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(row.id)}
                          className={`px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-wider cursor-pointer transition-all border border-solid ${
                            row.estado === 'PAGADO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200/60 hover:bg-red-100'
                          }`}
                        >
                          {row.estado === 'PAGADO' ? 'Pagado' : 'Por Pagar'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer border-none bg-transparent"
                          title="Eliminar registro"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
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

      {/* Resumen por Colaborador (3 columnas en lg) */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6 space-y-4 premium-card border-t-4 border-t-blue-700">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Resumen Acumulado</h3>
            <p className="text-gray-500 text-xs mt-0.5">Totales acumulados a pagar por colaborador en este período.</p>
          </div>

          <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto sticky-scrollbar">
            {Object.values(summary.porColaborador).map(col => (
              <div key={col.empleadoId} className="py-3 flex justify-between items-center text-xs">
                <div className="flex flex-col">
                  <span className="font-bold text-gray-800 uppercase text-xs">{col.nombre}</span>
                  <span className="text-gray-500 text-[10px]">{col.horas} horas extras</span>
                </div>
                <span className="font-bold text-blue-700 text-xs bg-blue-50/50 border border-blue-100/60 px-2.5 py-1 rounded-lg">
                  {formatUSD(col.total)}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-center pt-3 mt-4 border-t border-gray-200">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total General</span>
              <span className="text-gray-600 text-xs font-semibold">{summary.totalHorasGeneral} horas</span>
            </div>
            <span className="font-black text-blue-900 text-base">
              {formatUSD(summary.totalGeneral)}
            </span>
          </div>
        </div>
      </div>

      {/* Formulario Modal para Registro de Horas Extras */}
      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-[95vw] md:max-w-2xl lg:max-w-3xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100 max-h-[92vh] overflow-y-auto flex flex-col space-y-5 animate-modal-in">
            
            {/* Botón cerrar */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-450 hover:text-gray-600 cursor-pointer border-none"
            >
              ✕
            </button>

            <div className="text-center md:text-left space-y-1 pb-2 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-gray-900">Registrar Horas Extras</h3>
              <p className="text-[11px] text-gray-400 font-medium">Ingresa los detalles para la nueva jornada laboral</p>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-6 text-left">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Columna 1 */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Fecha</label>
                    <input
                      type="date"
                      required
                      value={modalData.fecha}
                      onChange={e => setModalData(prev => ({ ...prev, fecha: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Colaborador</label>
                    <select
                      required
                      value={modalData.colaboradorId}
                      onChange={e => setModalData(prev => ({ ...prev, colaboradorId: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Nro. Horas</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        required
                        value={modalData.horas}
                        onChange={e => setModalData(prev => ({ ...prev, horas: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-bold text-gray-700 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Valor p/ Hora</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={modalData.valorPorHora}
                        onChange={e => setModalData(prev => ({ ...prev, valorPorHora: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-bold text-gray-700 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Columna 2 */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Detalle Horario</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 17:30 - 19:30"
                      value={modalData.detalleHorario}
                      onChange={e => setModalData(prev => ({ ...prev, detalleHorario: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Descripción del Trabajo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Mantenimiento preventivo..."
                      value={modalData.descripcion}
                      onChange={e => setModalData(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Estado Inicial</label>
                    <select
                      value={modalData.estado}
                      onChange={e => setModalData(prev => ({ ...prev, estado: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      <option value="DEUDOR">Por Pagar</option>
                      <option value="PAGADO">Pagado</option>
                    </select>
                  </div>
                </div>

              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer transition-all bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md cursor-pointer transition-all border-none"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modal-in {
          from { transform: scale(0.95) translateY(8px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-in { animation: modal-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}} />
    </div>
  );
};
