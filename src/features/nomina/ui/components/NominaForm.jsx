// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/components/NominaForm.jsx

import React, { useState, useMemo } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { alertDialog } from '../../../../shared/ui/components/ConfirmModal';
import { Nomina } from '../../domain/entities/Nomina';
import { calcularNomina } from '../../domain/use-cases/calcularNomina';

const formatUSD = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export const NominaForm = ({ empleado, rawNomina, onSave, onCancel }) => {
  // Inicializar estado local del formulario a partir de los datos crudos del dominio
  const [formData, setFormData] = useState({
    empleadoId: rawNomina.empleadoId,
    fechaInicio: rawNomina.fechaInicio,
    fechaFin: rawNomina.fechaFin,
    diasLaborables: rawNomina.diasLaborables,
    diasLaborados: rawNomina.diasLaborados,
    permisoHoras: rawNomina.permisoHoras,
    ingresos: { ...rawNomina.ingresos },
    egresos: { ...rawNomina.egresos },
    abonos: [...rawNomina.abonos],
  });

  // Cálculo reactivo en tiempo real utilizando el caso de uso del dominio
  const calculoEnTiempoReal = useMemo(() => {
    try {
      const nominaEntidad = new Nomina(formData);
      return calcularNomina(empleado, nominaEntidad);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [formData, empleado]);

  const handleGeneralChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleIngresoChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      ingresos: {
        ...prev.ingresos,
        [field]: Number(value),
      },
    }));
  };

  const handleEgresoChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      egresos: {
        ...prev.egresos,
        [field]: Number(value),
      },
    }));
  };

  // Manejo de abonos
  const handleAddAbono = () => {
    setFormData((prev) => ({
      ...prev,
      abonos: [...prev.abonos, { monto: 0, fecha: new Date().toISOString().split('T')[0] }],
    }));
  };

  const handleRemoveAbono = (index) => {
    setFormData((prev) => ({
      ...prev,
      abonos: prev.abonos.filter((_, i) => i !== index),
    }));
  };

  const handleAbonoChange = (index, field, value) => {
    setFormData((prev) => {
      const newAbonos = [...prev.abonos];
      newAbonos[index] = {
        ...newAbonos[index],
        [field]: field === 'monto' ? Number(value) : value,
      };
      return {
        ...prev,
        abonos: newAbonos,
      };
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    try {
      const nominaParaGuardar = new Nomina(formData);
      onSave(nominaParaGuardar);
    } catch (err) {
      await alertDialog('Error de validación', err.message, { type: 'warning' });
    }
  };

  if (!calculoEnTiempoReal) return null;
  return (
    <ModalPortal>
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-8 py-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">Editar Nómina de Pago</h2>
            <p className="text-blue-200 text-xs mt-0.5 font-medium">
              Colaborador: <span className="font-bold text-white uppercase">{empleado.nombre}</span> ({empleado.cargo} - {empleado.departamento})
            </p>
          </div>
          <div className="text-right">
            <span className="bg-white/10 text-white border border-white/20 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Período: {formData.fechaInicio} al {formData.fechaFin}
            </span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 sticky-scrollbar">
          
          {/* Lado Izquierdo: Conceptos (12 cols en md, 8 cols en lg) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Parámetros Básicos */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">Días Laborados</label>
                <input
                  type="number"
                  disabled
                  value={formData.diasLaborados}
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-400 outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">Horas Permiso</label>
                <input
                  type="number"
                  min="0"
                  value={formData.permisoHoras}
                  onChange={(e) => handleGeneralChange('permisoHoras', e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all payroll-input"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1">Días Laborables</label>
                <input
                  type="number"
                  value={formData.diasLaborables}
                  disabled
                  className="w-full bg-gray-100/80 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-400 cursor-not-allowed outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sección Ingresos */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-black text-green-700 border-b border-green-100 pb-2 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>💰</span> Ingresos Adicionales
                </h3>
                <div className="space-y-4">
                  <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 space-y-2">
                    <p className="text-[10px] font-bold text-violet-800 uppercase tracking-wider">Décimos Quincenales (Fijos)</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-violet-700">Décimo Tercero</span>
                      <span className="font-bold text-violet-900">{formatUSD(calculoEnTiempoReal.decimoTercero ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-violet-700">Décimo Cuarto</span>
                      <span className="font-bold text-violet-900">{formatUSD(calculoEnTiempoReal.decimoCuarto ?? 0)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Horas Extras ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ingresos.horasExtras}
                      onChange={(e) => handleIngresoChange('horasExtras', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Trabajos en Empresa ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ingresos.trabajosEnEmpresa}
                      onChange={(e) => handleIngresoChange('trabajosEnEmpresa', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Fondos de Reserva ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ingresos.fondosReserva}
                      onChange={(e) => handleIngresoChange('fondosReserva', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                    />
                  </div>
                </div>
              </div>

              {/* Egresos */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-black text-red-700 border-b border-red-100 pb-2 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>📉</span> Descuentos / Egresos
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">IESS Personal (9.45%)</label>
                      <span className="text-[9px] text-blue-600 font-bold uppercase">Autocalculado: {formatUSD(calculoEnTiempoReal.egresos.iess)}</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Dejar en 0 para autocalcular"
                      value={formData.egresos.iess || ''}
                      onChange={(e) => handleEgresoChange('iess', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Ext. Cónyuge</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.egresos.extensionConyuge}
                        onChange={(e) => handleEgresoChange('extensionConyuge', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quirografario</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.egresos.prestamoQuirografario}
                        onChange={(e) => handleEgresoChange('prestamoQuirografario', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Anticipos ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.egresos.anticipos}
                        onChange={(e) => handleEgresoChange('anticipos', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dcto. Horas No Lab.</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.egresos.dctoHorasNoLaboradas}
                        onChange={(e) => handleEgresoChange('dctoHorasNoLaboradas', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Multas ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.egresos.multas}
                        onChange={(e) => handleEgresoChange('multas', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Dcto. Fiesta</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.egresos.dctoFiesta}
                        onChange={(e) => handleEgresoChange('dctoFiesta', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Herramientas</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.egresos.dctoHerramientas}
                        onChange={(e) => handleEgresoChange('dctoHerramientas', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Otros / Genérico</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.egresos.dctoGenerico}
                        onChange={(e) => handleEgresoChange('dctoGenerico', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-800 focus:border-blue-600 outline-none transition-all payroll-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Lado Derecho: Resumen en Tiempo Real & Abonos (4 cols en lg) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Panel de Resumen Financiero Real-Time */}
            <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-lg border border-gray-800 space-y-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                Resumen de Liquidación
              </h3>
              
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Bruto ({formData.diasLaborados} días):</span>
                  <span className="font-semibold text-white">{formatUSD(calculoEnTiempoReal.totalBruto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Total Ingresos (+):</span>
                  <span className="font-semibold text-green-400">+{formatUSD(calculoEnTiempoReal.sumaIngresos)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-red-400">Total Egresos (-):</span>
                  <span className="font-semibold text-red-400">-{formatUSD(calculoEnTiempoReal.sumaEgresos)}</span>
                </div>
                <div className="flex justify-between pt-2 items-baseline">
                  <span className="text-white font-bold">Neto a Recibir:</span>
                  <span className="text-xl font-extrabold text-blue-400">{formatUSD(calculoEnTiempoReal.netoRecibir)}</span>
                </div>
              </div>

              {/* Barra de progreso de pago */}
              <div className="pt-2">
                <div className="flex justify-between text-2xs text-gray-400 mb-1">
                  <span>Abonado: {formatUSD(calculoEnTiempoReal.totalAbonado)}</span>
                  <span>Restan: {formatUSD(Math.max(0, calculoEnTiempoReal.netoRecibir - calculoEnTiempoReal.totalAbonado))}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (calculoEnTiempoReal.totalAbonado / (calculoEnTiempoReal.netoRecibir || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-2xs text-gray-400 uppercase font-semibold">Estado de Pago:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider border ${
                  calculoEnTiempoReal.estadoPago === 'PAGADO'
                    ? 'bg-green-950/60 text-green-400 border-green-900'
                    : calculoEnTiempoReal.estadoPago === 'ABONO_PARCIAL'
                    ? 'bg-orange-950/60 text-orange-400 border-orange-900'
                    : 'bg-red-950/60 text-red-400 border-red-900'
                }`}>
                  {calculoEnTiempoReal.estadoPago === 'PENDIENTE' ? 'PENDIENTE' : calculoEnTiempoReal.estadoPago === 'ABONO_PARCIAL' ? 'ABONO PARCIAL' : 'PAGADO'}
                </span>
              </div>
            </div>

            {/* Gestión de Abonos / Anticipos */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span>💳</span> Abonos ({formData.abonos.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddAbono}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  + Agregar
                </button>
              </div>

              {formData.abonos.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs">
                  No hay abonos registrados para este período.
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.abonos.map((abono, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 p-3 rounded-lg flex items-center gap-3 relative group">
                      <div className="flex-1">
                        <label className="block text-3xs font-bold text-gray-500 uppercase mb-0.5">Monto ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={abono.monto || ''}
                          onChange={(e) => handleAbonoChange(index, 'monto', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-semibold text-gray-800 outline-none focus:border-blue-600"
                          required
                        />
                      </div>
                      <div className="w-[110px]">
                        <label className="block text-3xs font-bold text-gray-500 uppercase mb-0.5">Fecha</label>
                        <input
                          type="date"
                          value={abono.fecha}
                          onChange={(e) => handleAbonoChange(index, 'fecha', e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-blue-600"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAbono(index)}
                        className="text-red-500 hover:text-red-700 font-bold self-end mb-1 text-sm outline-none"
                        title="Eliminar Abono"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer del Formulario */}
          <div className="lg:col-span-12 border-t border-gray-150 pt-6 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-sm transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-900/10 transition-all duration-200"
            >
              Guardar Cambios
            </button>
          </div>

        </form>

      </div>
      </div>
    </>
    </ModalPortal>
  );
};
