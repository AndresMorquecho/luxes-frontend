import React, { useEffect, useMemo, useState, useContext, useCallback } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { NominaContext } from '../../application/context/NominaContext';
import { calcularNomina } from '../../domain/use-cases/calcularNomina';
import { registrarAbono } from '../../domain/use-cases/registrarAbono';
import { obtenerFechasPeriodo } from '../../application/hooks/useNomina';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import {
  sueldoDiarioEnQuincena,
  calcSueldoBrutoQuincena,
  sueldoQuincenaBase,
} from '../../../../shared/utils/sueldoHelpers.js';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const formatUSD = (val) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(val ?? 0);

const ESTADO_BADGE = {
  PENDIENTE:     { label: 'Pendiente',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  ABONO_PARCIAL: { label: 'Abono Parcial', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  PAGADO:        { label: 'Pagado',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const PayModal = ({ emp, monto, maxMonto, restante, quincenaLabel, isCross, nomina, onDeleteAbono, onClose, onConfirm, onMontoChange }) => {
  const [activeTab, setActiveTab] = useState('registrar'); // 'registrar' | 'historial'
  const [metodosPago, setMetodosPago] = useState([]);
  const [selectedMetodoPagoId, setSelectedMetodoPagoId] = useState('');
  const [loadingMps, setLoadingMps] = useState(true);

  useEffect(() => {
    let active = true;
    getMetodosPago()
      .then(data => {
        if (active) {
          const activeMps = (data || []).filter(m => m.activo);
          setMetodosPago(activeMps);
          if (activeMps.length > 0) {
            setSelectedMetodoPagoId(activeMps[0].id);
          }
        }
      })
      .catch(err => {
        console.error('Error al cargar métodos de pago', err);
        toast.error('No se pudieron cargar las cuentas/cajas de pago.');
      })
      .finally(() => {
        if (active) setLoadingMps(false);
      });
    return () => { active = false; };
  }, []);

  const setPercentage = (pct) => {
    const val = Math.round((maxMonto * pct) * 100) / 100;
    onMontoChange(Math.min(val, maxMonto));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full md:w-[90vw] max-w-4xl mx-4 overflow-hidden border border-slate-200 animate-slide-up animate-duration-200"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Minimalist Header */}
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200/80 flex justify-between items-center relative">
          <div>
            <h3 className="text-xs font-extrabold tracking-wider text-slate-800 uppercase flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-18 0a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25m-18 0v12.5A2.25 2.25 0 0 0 5.25 17h13.5A2.25 2.25 0 0 0 21 14.75V4.5M9 9h.008v.008H9V9Zm.008 3h.008v.008H9.008V12Zm3-3h.008v.008h-.008V9Zm0 3h.008v.008h-.008V12Zm3-3h.008v.008h-.008V9Zm0 3h.008v.008h-.008V12Z" />
              </svg>
              Registro de Pago / Abono
            </h3>
            <p className="text-slate-500 text-[9px] mt-0.5 font-semibold tracking-wide">
              {quincenaLabel} — {emp.nombre}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 p-1.5 rounded-full transition-all cursor-pointer bg-transparent border-0 outline-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200/60 bg-slate-50/50 px-8">
          <button
            onClick={() => setActiveTab('registrar')}
            className={`py-3 px-5 text-center focus:outline-none transition-all font-bold text-[10px] uppercase tracking-wider border-b-2 -mb-[2px] cursor-pointer ${
              activeTab === 'registrar'
                ? 'border-blue-900 text-blue-900 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Registrar Pago
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`py-3 px-5 text-center focus:outline-none transition-all font-bold text-[10px] uppercase tracking-wider border-b-2 -mb-[2px] cursor-pointer ${
              activeTab === 'historial'
                ? 'border-blue-900 text-blue-900 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Historial de Pagos ({nomina?.abonos?.length || 0})
          </button>
        </div>

        {/* Fixed-Size Content Wrapper without vertical scrollbar */}
        <div className="px-8 py-5 h-[410px] overflow-hidden flex flex-col justify-between">
          
          <div className="flex-1 min-h-0">
            {activeTab === 'registrar' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full items-stretch">
                
                {/* Columna Izquierda: Datos del Colaborador y Banco */}
                <div className="flex flex-col justify-between space-y-3 min-h-0 h-full py-0.5">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold text-blue-650 uppercase tracking-widest block">Colaborador Destinatario</span>
                    <h4 className="text-lg font-black text-slate-800 uppercase leading-none tracking-tight">
                      {emp.nombre}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold leading-snug">
                      Verifique que la cuenta destino coincida con el registro impreso antes de proceder con la transferencia bancaria.
                    </p>
                  </div>

                  {/* Tarjeta de Cuenta Bancaria Registrada (Credit Card style) */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-xl p-4 shadow-md relative overflow-hidden border border-slate-850 flex-1 flex flex-col justify-between max-h-[145px]">
                    <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-slate-800 rounded-full opacity-35 filter blur-xl" />
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block">Cuenta de Nómina Registrada</span>
                        <span className="text-[11px] font-bold tracking-wider text-white uppercase mt-0.5 block">
                          {emp.banco || 'SIN BANCO REGISTRADO'}
                        </span>
                      </div>
                      <div className="p-1.5 bg-white/5 rounded-lg text-slate-300 backdrop-blur-xs">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5m15 0V9M4.5 10.5V9M21 21h-2.25H5.25H3" />
                        </svg>
                      </div>
                    </div>

                    <div className="my-1.5 relative z-10">
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Número de Cuenta</span>
                      <div className="text-sm font-mono tracking-widest font-bold text-slate-200 flex items-center gap-1">
                        {emp.cuentaBanco ? (
                          emp.cuentaBanco.match(/.{1,4}/g).join(' ')
                        ) : (
                          '— — — —'
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-end relative z-10 pt-1.5 border-t border-white/5">
                      <div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block">Beneficiario</span>
                        <span className="text-[10px] font-bold tracking-wide text-white uppercase truncate max-w-[180px] block">
                          {emp.nombre}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 px-1 py-0.5 rounded-md text-[7px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Activa
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Detalle de Liquidación / Abono y Selección de Caja */}
                <div className="border border-slate-250/50 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-2 h-full min-h-0">
                  
                  {/* 1. Monto Total a Pagar */}
                  <div className="flex justify-between items-center py-1.5 px-3 bg-white border border-slate-200 rounded-lg shadow-xs shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50/80 text-blue-655 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Monto Total a Pagar</span>
                        <span className="text-[10px] font-semibold text-slate-500">Neto del período</span>
                      </div>
                    </div>
                    <span className="text-base font-black text-slate-800 tracking-tight">{formatUSD(maxMonto)}</span>
                  </div>

                  {/* 2. Caja/Cuenta de Salida */}
                  <div className="space-y-0.5 bg-white border border-slate-200 rounded-lg p-3 shadow-xs shrink-0">
                    <div className="flex justify-between items-center">
                      <label className="text-[8px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                        </svg>
                        Origen del Pago
                      </label>
                      {loadingMps && <span className="text-[8px] text-blue-600 animate-pulse font-bold">Cargando...</span>}
                    </div>
                    <select
                      value={selectedMetodoPagoId}
                      onChange={(e) => setSelectedMetodoPagoId(e.target.value)}
                      disabled={loadingMps}
                      className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                    >
                      {loadingMps ? (
                        <option value="">Cargando cuentas...</option>
                      ) : metodosPago.length === 0 ? (
                        <option value="">No hay cuentas activas disponibles</option>
                      ) : (
                        metodosPago.map((mp) => (
                          <option key={mp.id} value={mp.id}>
                            {mp.nombre} (Saldo: {formatUSD(mp.saldoActual)})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* 3. Input de Abono a realizar */}
                  <div className="space-y-0.5 bg-white border border-slate-200 rounded-lg p-3 shadow-xs shrink-0">
                    <div className="flex justify-between items-center">
                      <label className="text-[8px] font-extrabold text-slate-655 uppercase tracking-wider">
                        {isCross ? 'Abono pendiente de otra quincena' : 'Monto a pagar hoy'}
                      </label>
                      <span className="text-[8px] font-bold text-slate-400">USD</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-455 font-extrabold text-xs">$</span>
                      <input type="number" step="0.01" min="0.01" max={maxMonto}
                        value={monto}
                        onChange={(e) => onMontoChange(Math.min(parseFloat(e.target.value) || 0, maxMonto))}
                        className="w-full pl-5 pr-2.5 py-1 text-base font-black text-slate-800 border border-slate-200 rounded bg-slate-50/20 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" />
                    </div>

                    <div className="flex gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setPercentage(0.5)}
                        className="flex-1 py-1 rounded border border-slate-200 text-[8px] font-extrabold text-slate-600 bg-white hover:bg-slate-55 transition-all cursor-pointer"
                      >
                        Abonar 50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPercentage(1)}
                        className="flex-1 py-1 rounded bg-blue-50 border border-blue-200 text-[8px] font-extrabold text-blue-900 hover:bg-blue-100 transition-all cursor-pointer"
                      >
                        Pagar Total
                      </button>
                    </div>
                  </div>

                  {/* 4. Saldo Pendiente que quedaría */}
                  <div className="flex justify-between items-center py-1.5 px-3 bg-white border border-slate-200 rounded-lg shadow-xs shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-orange-50 text-orange-600 rounded-md">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Restante</span>
                      </div>
                    </div>
                    {restante <= 0.01 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Liquidada
                      </span>
                    ) : (
                      <span className="text-sm font-black text-orange-600 tracking-tight">{formatUSD(restante)}</span>
                    )}
                  </div>

                </div>
                
              </div>
            ) : (
              /* Historial de Pagos Tab (Fixed-Size content) */
              <div className="space-y-3 h-full flex flex-col justify-start">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Pagos y Abonos Registrados en el Período</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs flex-1 max-h-[340px] overflow-y-auto">
                  <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3">Fecha y Hora</th>
                        <th className="px-4 py-3">Registrado Por</th>
                        <th className="px-4 py-3">Caja / Cuenta</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                        <th className="px-4 py-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(!nomina || !nomina.abonos || nomina.abonos.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
                            No hay abonos registrados en este período para el colaborador.
                          </td>
                        </tr>
                      ) : (
                        nomina.abonos.map((ab, idx) => (
                          <tr key={ab.id || idx} className="hover:bg-slate-50/50">
                            {/* Fecha y Hora con Icono */}
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-slate-500 font-mono">
                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                {ab.fechaHora || ab.fecha}
                              </span>
                            </td>
                            {/* Registrado Por con Icono */}
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-slate-700">
                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                                {ab.usuarioNombre || 'Usuario'}
                              </span>
                            </td>
                            {/* Caja / Cuenta de Salida con Icono */}
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                                <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                                </svg>
                                {ab.metodoPagoNombre || 'No especificado'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-black text-slate-800">{formatUSD(ab.monto)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={() => onDeleteAbono(nomina, ab.id)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-all cursor-pointer bg-transparent border-0 outline-none"
                                title="Eliminar abono y devolver fondos a caja"
                              >
                                <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-5 border-t border-slate-100 justify-end shrink-0">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-650 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer bg-white">
              Cerrar
            </button>
            {activeTab === 'registrar' && (
              <button
                onClick={() => onConfirm(selectedMetodoPagoId)}
                disabled={!monto || monto <= 0 || !selectedMetodoPagoId || loadingMps}
                className="px-8 py-2.5 rounded-lg bg-blue-900 text-white font-extrabold text-xs hover:bg-blue-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {monto > 0 ? `Confirmar Pago de ${formatUSD(monto)}` : 'Ingrese un monto'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetalleEgresosModal = ({
  empleadoId,
  empleadoNombre,
  fechaInicio,
  fechaFin,
  adapter,
  onClose,
  onUpdate
}) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [tipo, setTipo] = useState('ANTICIPO');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(fechaInicio);
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adapter.getDetailedEgresos(empleadoId, fechaInicio, fechaFin);
      setRecords(data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalle de egresos');
    } finally {
      setLoading(false);
    }
  }, [adapter, empleadoId, fechaInicio, fechaFin]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0 || !fecha) {
      toast.error('Por favor, ingrese un monto y fecha válidos');
      return;
    }

    setSubmitting(true);
    try {
      await adapter.createDetailedEgreso({
        empleadoId,
        tipo,
        monto: parseFloat(monto),
        fecha,
        motivo
      });
      toast.success('Registro de egreso creado');
      setMonto('');
      setMotivo('');
      setFecha(fechaInicio);
      await fetchRecords();
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Error al crear egreso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
    try {
      await adapter.deleteDetailedEgreso(id);
      toast.success('Registro de egreso eliminado');
      await fetchRecords();
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el registro');
    }
  };

  // Summary Card Calculations
  const totalAnticipos = useMemo(() => records.filter(r => r.tipo === 'ANTICIPO').reduce((s, r) => s + r.monto, 0), [records]);
  const totalMultas = useMemo(() => records.filter(r => r.tipo === 'MULTA').reduce((s, r) => s + r.monto, 0), [records]);
  const totalOtros = useMemo(() => records.filter(r => r.tipo === 'OTROS').reduce((s, r) => s + r.monto, 0), [records]);
  const totalGeneral = useMemo(() => records.reduce((s, r) => s + r.monto, 0), [records]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full md:w-[94vw] lg:w-[88vw] max-w-6xl h-[700px] mx-4 overflow-hidden border border-slate-200 flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-blue-900 px-8 py-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight uppercase">Desglose de Egresos</h3>
            <p className="text-blue-200 text-xs mt-0.5">{empleadoNombre} — del {fechaInicio} al {fechaFin}</p>
          </div>
          <button onClick={onClose} className="text-blue-300 hover:text-white transition-colors cursor-pointer bg-transparent border-0 outline-none">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col min-h-0 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Anticipos</span>
              <span className="text-base font-bold text-slate-700 mt-1 block">{formatUSD(totalAnticipos)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Multas</span>
              <span className="text-base font-bold text-slate-700 mt-1 block">{formatUSD(totalMultas)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Otros Descuentos</span>
              <span className="text-base font-bold text-slate-700 mt-1 block">{formatUSD(totalOtros)}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">Total Egresos Varios</span>
              <span className="text-base font-extrabold text-blue-900 mt-1 block">{formatUSD(totalGeneral)}</span>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="shrink-0 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nuevo Registro</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</label>
                <input
                  type="date"
                  required
                  min={fechaInicio}
                  max={fechaFin}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ANTICIPO">Anticipo</option>
                  <option value="MULTA">Multa</option>
                  <option value="OTROS">Otro Descuento</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1 md:col-span-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Motivo / Detalle</label>
                <input
                  type="text"
                  placeholder="Ej. Anticipo quincenal"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-1.5 px-3 h-[32px] rounded-lg bg-blue-900 text-white font-bold text-xs hover:bg-blue-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 border-0 outline-none"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  )}
                  Añadir
                </button>
              </div>
            </div>
          </form>

          {/* List Section */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Registros Existentes</h4>
            <div className="flex-1 border border-slate-200 rounded-xl overflow-y-auto bg-slate-50/50 min-h-0">
              {loading ? (
                <div className="p-3 text-center text-xs text-slate-500 font-semibold">Cargando registros...</div>
              ) : records.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400 font-medium italic">No hay registros de egresos para este período.</div>
              ) : (
                <table className="min-w-full text-xs divide-y divide-slate-200 table-fixed border-collapse">
                  <thead className="bg-blue-50 text-[10px] font-bold text-blue-900 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="border border-slate-200 px-3 py-1.5 text-left w-32 bg-blue-50">Fecha</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-center w-32 bg-blue-50">Tipo</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-left bg-blue-50">Motivo / Detalle</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-right w-28 bg-blue-50">Monto</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-center w-20 bg-blue-50">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-xs">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="border border-slate-200 px-3 py-1.5 font-mono text-slate-600 truncate">{r.fecha}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-center truncate">
                          {r.tipo === 'ANTICIPO' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded-full font-bold text-[9px] uppercase border border-sky-100">Anticipo</span>
                          ) : r.tipo === 'MULTA' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[9px] uppercase border border-amber-100">Multa</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-full font-bold text-[9px] uppercase border border-purple-100">Otros</span>
                          )}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800 truncate" title={r.motivo}>{r.motivo || <span className="text-slate-400 italic">Sin motivo</span>}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-slate-900">{formatUSD(r.monto)}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-center">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-all cursor-pointer bg-transparent border-0 outline-none"
                            title="Eliminar"
                          >
                            <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetalleIngresosModal = ({
  empleadoId,
  empleadoNombre,
  fechaInicio,
  fechaFin,
  adapter,
  onClose,
  onUpdate
}) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [tipo, setTipo] = useState('TRAB_EMP');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(fechaInicio);
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [horasExtras, setHorasExtras] = useState([]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [ingresosData, overtimeData] = await Promise.all([
        adapter.getDetailedIngresos(empleadoId, fechaInicio, fechaFin),
        adapter.getOvertime(fechaInicio, fechaFin)
      ]);
      setRecords(ingresosData);
      const empOvertime = overtimeData.filter(
        (he) =>
          he.colaboradorId === empleadoId &&
          (he.aprobacionEstado === 'APROBADA' || !he.aprobacionEstado),
      );
      setHorasExtras(empOvertime);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar detalle de ingresos');
    } finally {
      setLoading(false);
    }
  }, [adapter, empleadoId, fechaInicio, fechaFin]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0 || !fecha) {
      toast.error('Por favor, ingrese un monto y fecha válidos');
      return;
    }

    setSubmitting(true);
    try {
      await adapter.createDetailedIngreso({
        empleadoId,
        tipo,
        monto: parseFloat(monto),
        fecha,
        motivo
      });
      toast.success('Registro de ingreso creado');
      setMonto('');
      setMotivo('');
      setFecha(fechaInicio);
      await fetchRecords();
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Error al crear ingreso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
    try {
      await adapter.deleteDetailedIngreso(id);
      toast.success('Registro de ingreso eliminado');
      await fetchRecords();
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el registro');
    }
  };

  const totalHorasExtrasVal = useMemo(() => horasExtras.reduce((s, r) => s + Number(r.total), 0), [horasExtras]);
  const totalTrabajosEmpresa = useMemo(() => records.filter(r => r.tipo === 'TRAB_EMP').reduce((s, r) => s + Number(r.monto), 0), [records]);
  const totalOtrosIngresos = useMemo(() => records.filter(r => r.tipo === 'OTROS').reduce((s, r) => s + Number(r.monto), 0), [records]);
  const totalGeneral = totalHorasExtrasVal + totalTrabajosEmpresa + totalOtrosIngresos;

  const combinedList = useMemo(() => {
    const listHE = horasExtras.map(he => ({
      id: he.id,
      fecha: he.fecha,
      tipo: 'HORA_EXTRA',
      motivo: `${he.horas} horas (${he.detalleHorario || he.descripcion || 'Extra'})`,
      monto: Number(he.total),
      readOnly: true
    }));
    const listOther = records.map(r => ({
      ...r,
      monto: Number(r.monto),
      readOnly: false
    }));
    return [...listHE, ...listOther].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [horasExtras, records]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full md:w-[94vw] lg:w-[88vw] max-w-6xl h-[700px] mx-4 overflow-hidden border border-slate-200 flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-blue-900 px-8 py-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight uppercase">Desglose de Ingresos Adicionales</h3>
            <p className="text-blue-200 text-xs mt-0.5">{empleadoNombre} — del {fechaInicio} al {fechaFin}</p>
          </div>
          <button onClick={onClose} className="text-blue-300 hover:text-white transition-colors cursor-pointer bg-transparent border-0 outline-none">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col min-h-0 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Horas Extras (Módulo)</span>
              <span className="text-base font-bold text-slate-700 mt-1 block">{formatUSD(totalHorasExtrasVal)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trabajo en Empresa</span>
              <span className="text-base font-bold text-slate-700 mt-1 block">{formatUSD(totalTrabajosEmpresa)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Otros Ingresos</span>
              <span className="text-base font-bold text-slate-700 mt-1 block">{formatUSD(totalOtrosIngresos)}</span>
            </div>
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Ingresos Var.</span>
              <span className="text-base font-extrabold text-blue-900 mt-1 block">{formatUSD(totalGeneral)}</span>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="shrink-0 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nuevo Registro (Trab. Empresa / Otros)</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</label>
                <input
                  type="date"
                  required
                  min={fechaInicio}
                  max={fechaFin}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="TRAB_EMP">Trabajo Empresa</option>
                  <option value="OTROS">Otro Ingreso</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1 md:col-span-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Motivo / Detalle</label>
                <input
                  type="text"
                  placeholder="Ej. Soporte técnico especial"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-1.5 px-3 h-[32px] rounded-lg bg-blue-900 text-white font-bold text-xs hover:bg-blue-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 border-0 outline-none"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  )}
                  Añadir
                </button>
              </div>
            </div>
          </form>

          {/* List Section */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Registros Existentes (Período)</h4>
            <div className="flex-1 border border-slate-200 rounded-xl overflow-y-auto bg-slate-50/50 min-h-0">
              {loading ? (
                <div className="p-3 text-center text-xs text-slate-500 font-semibold">Cargando registros...</div>
              ) : combinedList.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400 font-medium italic">No hay registros de ingresos para este período.</div>
              ) : (
                <table className="min-w-full text-xs divide-y divide-slate-200 table-fixed border-collapse">
                  <thead className="bg-blue-50 text-[10px] font-bold text-blue-900 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="border border-slate-200 px-3 py-1.5 text-left w-32 bg-blue-50">Fecha</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-center w-32 bg-blue-50">Tipo</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-left bg-blue-50">Motivo / Detalle</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-right w-28 bg-blue-50">Monto</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-center w-20 bg-blue-50">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-xs">
                    {combinedList.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50/50">
                        <td className="border border-slate-200 px-3 py-1.5 font-mono text-slate-600 truncate">{r.fecha}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-center truncate">
                          {r.tipo === 'HORA_EXTRA' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[9px] uppercase border border-emerald-100">Horas Extras</span>
                          ) : r.tipo === 'TRAB_EMP' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded-full font-bold text-[9px] uppercase border border-sky-100">Trab. Empresa</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-full font-bold text-[9px] uppercase border border-purple-100">Otros</span>
                          )}
                        </td>
                        <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800 truncate" title={r.motivo}>{r.motivo || <span className="text-slate-400 italic">Sin motivo</span>}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-slate-900">{formatUSD(r.monto)}</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-center">
                          {r.readOnly ? (
                            <span className="text-slate-400 text-[9px] italic" title="Las horas extras se editan/eliminan en el módulo de Horas Extras">Módulo HE</span>
                          ) : (
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-all cursor-pointer bg-transparent border-0 outline-none"
                              title="Eliminar"
                            >
                              <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CellInput = ({ value, onChange, disabled = false, placeholder = "0" }) => (
  <input
    type="number"
    step="0.01"
    value={value == null || value === 0 ? '' : value}
    onChange={e => onChange(parseFloat(e.target.value) || 0)}
    disabled={disabled}
    placeholder={placeholder}
    className="w-[65px] text-center bg-transparent border border-transparent hover:border-slate-350 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-600 rounded py-1 px-1 text-xs font-semibold text-slate-800 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
  />
);

const computeSubtotal = (emp, cp, includeIess = true) => {
  if (!cp) return 0;
  return cp.netoRecibir ?? 0;
};

/** Separa el neto a pagar: mensualidad (sueldo quincena + otros − descuentos) y horas extras aprobadas. */
const splitNetoPago = (netoTotal, horasExtras) => {
  const neto = Number(netoTotal) || 0;
  const he = Math.max(0, Number(horasExtras) || 0);
  const netoHorasExtras = Math.min(he, neto);
  const netoMensualidad = Math.round((neto - netoHorasExtras) * 100) / 100;
  return { netoMensualidad, netoHorasExtras, netoTotal: neto };
};

const resolveAbonado = (cp, raw) =>
  cp?.totalAbonado ?? (raw?.abonos ?? []).reduce((s, a) => s + Number(a.monto || 0), 0);

/** Saldo pendiente de pago de nómina (no incluye HE sin aprobar). */
const computePendientePago = (cp, raw, totalBrutoFallback = 0) => {
  const neto = cp?.netoRecibir ?? totalBrutoFallback ?? 0;
  const abonado = resolveAbonado(cp, raw);
  return Math.max(0, Math.round((neto - abonado) * 100) / 100);
};

const sumPendingHEInRange = (pendingList, fechaInicio, fechaFin) => {
  const map = {};
  (pendingList || []).forEach((p) => {
    if (p.aprobacionEstado && p.aprobacionEstado !== 'PENDIENTE') return;
    const fecha = String(p.fecha).split('T')[0];
    if (fecha < fechaInicio || fecha > fechaFin) return;
    const id = p.colaboradorId;
    map[id] = (map[id] || 0) + Number(p.total || 0);
  });
  return map;
};

/** Sueldo bruto quincenal: contrato = mitad fija; por asistencia = prorrateo. */
const resolveTotalBruto = (emp, cp, raw) => {
  if (cp?.totalBruto > 0) return cp.totalBruto;
  const diasLab = raw?.diasLaborables ?? cp?.diasLaborables ?? 15;
  const diasT = cp?.diasLaborados ?? raw?.diasLaborados ?? 0;
  return calcSueldoBrutoQuincena(emp.sueldoDiario, diasT, diasLab);
};

const QuincenaTable = ({
  label,
  quincenaNum,
  rows,
  crossPendientes,
  pendingOvertime = [],
  fechaInicio,
  fechaFin,
  onPagar,
  onPagarCross,
  onCellChange,
  onOpenEgresos,
  onOpenIngresos,
}) => {
  const pendingHEByEmp = useMemo(
    () => sumPendingHEInRange(pendingOvertime, fechaInicio, fechaFin),
    [pendingOvertime, fechaInicio, fechaFin],
  );
  const totalSueldoDiario = useMemo(
    () => rows.reduce((s, r) => {
      const diasLab = r.raw?.diasLaborables ?? r.cp?.diasLaborables ?? 15;
      return s + sueldoDiarioEnQuincena(r.emp.sueldoDiario, diasLab);
    }, 0),
    [rows],
  );
  const totalBruto = useMemo(
    () => rows.reduce((s, r) => s + resolveTotalBruto(r.emp, r.cp, r.raw), 0),
    [rows],
  );
  const totalHE = useMemo(() => rows.reduce((s, r) => s + (r.cp?.ingresos?.horasExtras ?? 0), 0), [rows]);
  const totalTE = useMemo(() => rows.reduce((s, r) => s + (r.cp?.ingresos?.trabajosEnEmpresa ?? 0), 0), [rows]);
  const totalProvD3 = useMemo(() => rows.reduce((s, r) => s + (r.cp?.ingresos?.provisionDecimo3 ?? 0), 0), [rows]);
  const totalProvD4 = useMemo(() => rows.reduce((s, r) => s + (r.cp?.ingresos?.provisionDecimo4 ?? 0), 0), [rows]);
  const totalAcumD3 = useMemo(() => rows.reduce((s, r) => s + (r.cp?.ingresos?.acumuladoDecimo3 ?? 0), 0), [rows]);
  const totalAcumD4 = useMemo(() => rows.reduce((s, r) => s + (r.cp?.ingresos?.acumuladoDecimo4 ?? 0), 0), [rows]);
  const totalFR = useMemo(() => rows.reduce((s, r) => s + (r.cp?.ingresos?.fondosReserva ?? 0), 0), [rows]);
  const totalSumaIngresos = useMemo(() => rows.reduce((s, r) => s + (r.cp?.sumaIngresos ?? 0), 0), [rows]);
  const totalIESS = useMemo(() => rows.reduce((s, r) => s + (r.cp?.egresos?.iess ?? 0), 0), [rows]);
  const totalAnticipos = useMemo(() => rows.reduce((s, r) => s + (r.cp?.egresos?.anticipos ?? 0), 0), [rows]);
  const totalMultas = useMemo(() => rows.reduce((s, r) => s + (r.cp?.egresos?.multas ?? 0), 0), [rows]);
  const totalOtrosEgress = useMemo(() => rows.reduce((s, r) => s + (r.cp?.egresos?.dctoGenerico ?? 0), 0), [rows]);
  const totalSumaEgresos = useMemo(() => rows.reduce((s, r) => s + (r.cp?.sumaEgresos ?? 0), 0), [rows]);
  const totalNeto = useMemo(() => rows.reduce((s, r) => s + (r.cp?.netoRecibir ?? 0), 0), [rows]);
  const totalNetoMens = useMemo(
    () => rows.reduce((s, r) => {
      const he = r.cp?.ingresos?.horasExtras ?? 0;
      return s + splitNetoPago(r.cp?.netoRecibir ?? 0, he).netoMensualidad;
    }, 0),
    [rows],
  );
  const totalNetoHE = useMemo(
    () => rows.reduce((s, r) => {
      const he = r.cp?.ingresos?.horasExtras ?? 0;
      return s + splitNetoPago(r.cp?.netoRecibir ?? 0, he).netoHorasExtras;
    }, 0),
    [rows],
  );
  const totalAbonado = useMemo(
    () => rows.reduce((s, r) => s + resolveAbonado(r.cp, r.raw), 0),
    [rows],
  );
  const totalPendiente = useMemo(
    () => rows.reduce((s, r) => {
      const totalB = resolveTotalBruto(r.emp, r.cp, r.raw);
      return s + computePendientePago(r.cp, r.raw, totalB);
    }, 0),
    [rows],
  );
  const totalHEPendiente = useMemo(
    () => Object.values(pendingHEByEmp).reduce((s, v) => s + v, 0),
    [pendingHEByEmp],
  );

  return (
    <div className="flex flex-col w-full">
      <div className="bg-slate-700 text-white text-center py-2.5 font-bold text-xs tracking-wider uppercase shrink-0">
        <span>{label}</span>
      </div>
      <div className="hidden md:block overflow-auto max-h-[520px] relative border-t border-slate-200">
        <table className="min-w-full text-xs border-collapse">
          <thead className="z-30 shadow-xs">
            <tr className="bg-slate-100 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
              <th colSpan={3} className="border border-slate-200 px-2 py-2 text-center bg-slate-100 sticky top-0 left-0 z-40 border-r-2 border-r-slate-350 w-[320px] min-w-[320px] max-w-[320px]"><span>Colaborador</span></th>
              <th colSpan={3} className="border border-slate-200 px-2 py-2 text-center bg-slate-50 sticky top-0 z-30"><span>Sueldo Base</span></th>
              <th colSpan={4} className="border border-slate-200 px-2 py-2 text-center bg-violet-50 text-violet-950 sticky top-0 z-30"><span>Provisiones (no neto)</span></th>
              <th colSpan={4} className="border border-slate-200 px-2 py-2 text-center bg-emerald-50 text-emerald-950 sticky top-0 z-30"><span>Ingresos al Neto (+)</span></th>
              <th colSpan={3} className="border border-slate-200 px-2 py-2 text-center bg-red-50 text-red-950 sticky top-0 z-30"><span>Egresos / Descuentos (-)</span></th>
              <th colSpan={6} className="border border-slate-200 px-2 py-2 text-center bg-blue-50 text-blue-950 sticky top-0 z-30"><span>Liquidación Final</span></th>
              <th rowSpan={2} className="border border-slate-200 px-2 py-2.5 text-center w-28 bg-slate-100 text-slate-700 sticky top-0 z-30"><span>Acción</span></th>
            </tr>
            <tr className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200">
              <th className="border border-slate-200 px-1 py-2 text-center w-[40px] min-w-[40px] max-w-[40px] sticky top-[38px] left-0 z-40 bg-slate-100"><span>#</span></th>
              <th className="border border-slate-200 px-2 py-2 text-left w-[190px] min-w-[190px] max-w-[190px] sticky top-[38px] left-[40px] z-40 bg-slate-100"><span>Nombres</span></th>
              <th className="border border-slate-200 px-2 py-2 text-center w-[90px] min-w-[90px] max-w-[90px] sticky top-[38px] left-[230px] z-40 bg-slate-100 border-r-2 border-r-slate-300"><span>Contrato</span></th>
              
              <th className="border border-slate-200 px-1 py-2 text-center bg-slate-50 sticky top-[38px] z-30"><span>Diario</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center min-w-[65px] bg-slate-50 sticky top-[38px] z-30"><span>Días T.</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center bg-slate-50 sticky top-[38px] z-30"><span>Sueldo B.</span></th>

              <th className="border border-slate-200 px-1 py-2 text-center min-w-[72px] bg-violet-50 text-violet-900 sticky top-[38px] z-30"><span>Prov. D3</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center min-w-[72px] bg-violet-50 text-violet-900 sticky top-[38px] z-30"><span>Prov. D4</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center min-w-[72px] bg-violet-100 text-violet-950 sticky top-[38px] z-30"><span>Acum. D3</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center min-w-[72px] bg-violet-100 text-violet-950 sticky top-[38px] z-30"><span>Acum. D4</span></th>

              <th className="border border-slate-200 px-1 py-2 text-center min-w-[72px] bg-emerald-50 text-emerald-900 sticky top-[38px] z-30" title="Monto de horas extras aprobadas en el período"><span>H. Extras</span></th>
              <th className="border border-slate-200 px-2 py-2 text-center min-w-[110px] bg-emerald-50 text-emerald-900 sticky top-[38px] z-30"><span>Ingresos Var.</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center min-w-[65px] bg-emerald-50 text-emerald-900 sticky top-[38px] z-30"><span>F. Res.</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center bg-emerald-100 text-emerald-950 font-black sticky top-[38px] z-30"><span>Total +</span></th>

              <th className="border border-slate-200 px-1 py-2 text-center min-w-[65px] bg-red-50 text-red-900 sticky top-[38px] z-30"><span>IESS</span></th>
              <th className="border border-slate-200 px-2 py-2 text-center min-w-[110px] bg-red-50 text-red-900 sticky top-[38px] z-30"><span>Egresos Varios</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center bg-red-100 text-red-950 font-black sticky top-[38px] z-30"><span>Total -</span></th>

              <th className="border border-slate-200 px-1 py-2 text-center min-w-[78px] bg-blue-50 text-blue-900 font-bold sticky top-[38px] z-30" title="Sueldo quincena y otros ingresos, menos descuentos"><span>Neto Mens.</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center min-w-[72px] bg-emerald-50 text-emerald-900 font-bold sticky top-[38px] z-30" title="Monto neto por horas extras aprobadas"><span>Neto H.E.</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center min-w-[72px] bg-amber-50 text-amber-900 font-bold sticky top-[38px] z-30" title="Horas extras registradas, pendientes de aprobación"><span>H.E. Pend.</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center bg-blue-100 text-blue-950 font-black sticky top-[38px] z-30"><span>Total</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center bg-green-100 text-green-950 font-black sticky top-[38px] z-30"><span>Pagado</span></th>
              <th className="border border-slate-200 px-1 py-2 text-center bg-orange-100 text-orange-950 font-black sticky top-[38px] z-30"><span>Pendiente</span></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map(({ emp, cp, raw }, idx) => {
              const hasContract = emp.tieneContrato !== false;
              const diasLab     = raw?.diasLaborables ?? cp?.diasLaborables ?? 15;
              const sueldo      = sueldoDiarioEnQuincena(emp.sueldoDiario, diasLab);
              const diasT       = cp?.diasLaborados ?? raw?.diasLaborados ?? 0;
              const totalB      = resolveTotalBruto(emp, cp, raw);
              
              const totalAb     = resolveAbonado(cp, raw);
              const cross       = crossPendientes?.find(p => p.empId === emp.id);
              const hePendiente = pendingHEByEmp[emp.id] || 0;

              // Valores de ingresos y egresos (HE = solo aprobadas, viene del backend)
              const he          = cp?.ingresos?.horasExtras ?? raw?.ingresos?.horasExtras ?? 0;
              const te          = raw?.ingresos?.trabajosEnEmpresa ?? 0;
              const fr          = raw?.ingresos?.fondosReserva ?? 0;
              const iessVal     = raw?.egresos?.iess ?? 0;
              const ant         = raw?.egresos?.anticipos ?? 0;
              const multas      = raw?.egresos?.multas ?? 0;
              const otrosE      = raw?.egresos?.dctoGenerico ?? 0;

              const provD3      = cp?.ingresos?.provisionDecimo3 ?? 0;
              const provD4      = cp?.ingresos?.provisionDecimo4 ?? 0;
              const acumD3      = cp?.ingresos?.acumuladoDecimo3 ?? 0;
              const acumD4      = cp?.ingresos?.acumuladoDecimo4 ?? 0;
              const pagoMensD3  = cp?.ingresos?.pagoDecimo3 ?? 0;
              const pagoMensD4  = cp?.ingresos?.pagoDecimo4 ?? 0;

              const ep          = cp?.estadoPago ?? 'PENDIENTE';
              const badge       = ESTADO_BADGE[ep] ?? ESTADO_BADGE.PENDIENTE;
              const subtotalNeto = cp?.netoRecibir ?? totalB;
              const { netoMensualidad, netoHorasExtras } = splitNetoPago(subtotalNeto, he);
              const pendientePago = computePendientePago(cp, raw, totalB);
              const subtotalIngr = cp?.sumaIngresos ?? 0;
              const subtotalEgr  = cp?.sumaEgresos ?? 0;

              const stickyBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

              return (
                <tr key={emp.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-slate-100/30 transition-colors group`}>
                  <td className={`border border-slate-200 text-center font-bold text-slate-400 px-1.5 py-2 w-[40px] min-w-[40px] max-w-[40px] sticky left-0 z-10 ${stickyBg} group-hover:bg-slate-100`}>
                    <span>{idx + 1}</span>
                  </td>
                  <td className={`border border-slate-200 px-2.5 py-2 font-bold text-slate-800 uppercase text-xs w-[190px] min-w-[190px] max-w-[190px] sticky left-[40px] z-10 ${stickyBg} group-hover:bg-slate-100 truncate`} title={emp.nombre}>
                    <span className="block truncate">{emp.nombre}</span>
                  </td>
                  <td className={`border border-slate-200 text-center px-1.5 py-2 w-[90px] min-w-[90px] max-w-[90px] sticky left-[230px] z-10 ${stickyBg} group-hover:bg-slate-100 border-r-2 border-r-slate-300`}>
                    {hasContract ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[9px] uppercase tracking-wide border border-emerald-100">Contrato</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[9px] uppercase tracking-wide border border-amber-100">Por Asis</span>
                    )}
                  </td>

                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-slate-50/50 text-slate-700 font-semibold text-xs">{formatUSD(sueldo)}</td>
                  <td className="border border-slate-200 text-center px-1 py-1 bg-slate-50/50">
                    <CellInput value={diasT} onChange={val => onCellChange(emp.id, 'diasLaborados', val)} />
                  </td>
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-slate-50/80 font-bold text-slate-700 text-xs">{formatUSD(totalB)}</td>

                  <td className="border border-slate-200 text-center px-1 py-1.5 bg-violet-50/30 text-violet-900 text-[10px] font-semibold" title="Provisión décimo tercero (gravado/12)">
                    {hasContract && provD3 > 0 ? (
                      <div className="leading-tight">
                        <div>{formatUSD(provD3)}</div>
                        {pagoMensD3 > 0 && <div className="text-[8px] text-violet-600">+pagado</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="border border-slate-200 text-center px-1 py-1.5 bg-violet-50/30 text-violet-900 text-[10px] font-semibold" title="Provisión décimo cuarto (SBU/12 prorrateado)">
                    {hasContract && provD4 > 0 ? (
                      <div className="leading-tight">
                        <div>{formatUSD(provD4)}</div>
                        {pagoMensD4 > 0 && <div className="text-[8px] text-violet-600">+pagado</div>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="border border-slate-200 text-center px-1 py-1.5 bg-violet-100/40 text-violet-950 text-[10px] font-bold">
                    {hasContract && acumD3 > 0 ? formatUSD(acumD3) : '—'}
                  </td>
                  <td className="border border-slate-200 text-center px-1 py-1.5 bg-violet-100/40 text-violet-950 text-[10px] font-bold">
                    {hasContract && acumD4 > 0 ? formatUSD(acumD4) : '—'}
                  </td>

                  {/* Ingresos al neto */}
                  <td
                    className="border border-slate-200 text-center px-1.5 py-2 bg-emerald-50/50 text-emerald-800 font-bold text-xs"
                    title="Horas extras aprobadas en Registro de Horas Extras"
                  >
                    {he > 0 ? formatUSD(he) : '—'}
                  </td>
                  <td className="border border-slate-200 text-center p-0.5 bg-emerald-50/5 hover:bg-emerald-50/20 transition-colors group/cell relative">
                    <button
                      onClick={() => onOpenIngresos(emp.id, emp.nombre)}
                      className="w-full h-full flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold text-slate-800 transition-all outline-none border border-transparent rounded hover:border-emerald-200 cursor-pointer"
                    >
                      {te > 0 ? (
                        <>
                          <span className="text-emerald-700 font-bold">{formatUSD(te)}</span>
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-all duration-200 flex items-center justify-center bg-emerald-600 text-white rounded-full w-4 h-4 shadow-xs">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400 group-hover/cell:opacity-0 transition-opacity">—</span>
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all duration-200">
                            <span className="flex items-center justify-center bg-emerald-600 text-white rounded-full w-4 h-4 shadow-xs">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            </span>
                          </span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="border border-slate-200 text-center px-0.5 py-0.5">
                    <CellInput value={fr} onChange={val => onCellChange(emp.id, 'ingresos.fondosReserva', val)} disabled={!hasContract} />
                  </td>
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-emerald-50/40 font-bold text-slate-700 text-xs">{formatUSD(subtotalIngr)}</td>

                  {/* Egresos / Descuentos */}
                  <td className="border border-slate-200 text-center px-0.5 py-0.5">
                    <CellInput 
                      value={iessVal} 
                      onChange={val => onCellChange(emp.id, 'egresos.iess', val)} 
                      placeholder={cp?.egresos?.iess ? String(cp.egresos.iess) : '0'} 
                      disabled={!hasContract}
                    />
                  </td>
                  <td className="border border-slate-200 text-center p-0.5 bg-red-50/5 hover:bg-red-50/20 transition-colors group/cell relative">
                    <button
                      onClick={() => onOpenEgresos(emp.id, emp.nombre)}
                      className="w-full h-full flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold text-slate-800 transition-all outline-none border border-transparent rounded hover:border-red-200 cursor-pointer"
                    >
                      {(ant + multas + otrosE) > 0 ? (
                        <>
                          <span className="text-red-700 font-bold">{formatUSD(ant + multas + otrosE)}</span>
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-all duration-200 flex items-center justify-center bg-red-600 text-white rounded-full w-4 h-4 shadow-xs">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400 group-hover/cell:opacity-0 transition-opacity">—</span>
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all duration-200">
                            <span className="flex items-center justify-center bg-red-600 text-white rounded-full w-4 h-4 shadow-xs">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            </span>
                          </span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-red-50/40 font-bold text-red-700 text-xs">{formatUSD(subtotalEgr)}</td>

                  {/* Liquidación Final */}
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-blue-50/40 font-bold text-blue-900 text-xs">
                    {formatUSD(netoMensualidad)}
                  </td>
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-emerald-50/50 font-bold text-emerald-800 text-xs">
                    {netoHorasExtras > 0 ? formatUSD(netoHorasExtras) : '—'}
                  </td>
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-amber-50/60 font-bold text-amber-800 text-xs" title="Aún no aprobado — no suma en el neto">
                    {hePendiente > 0 ? formatUSD(hePendiente) : '—'}
                  </td>
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-blue-50/30 font-black text-blue-900 text-xs">{formatUSD(subtotalNeto)}</td>
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-green-50/30 font-bold text-green-700 text-xs">{totalAb > 0 ? formatUSD(totalAb) : '—'}</td>
                  <td className="border border-slate-200 text-center px-1.5 py-2 bg-orange-50/30 font-bold text-orange-700 text-xs">
                    {pendientePago > 0 ? formatUSD(pendientePago) : '—'}
                  </td>

                  <td className="border border-slate-200 text-center px-1.5 py-1.5">
                    <div className="flex justify-center items-center">
                      {ep === 'PAGADO' ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider border ${badge.cls} w-full justify-center`}>
                          {badge.label}
                        </span>
                      ) : (
                        <button onClick={() => onPagar(emp, cp, subtotalNeto, pendientePago)}
                          className="w-full py-1.5 rounded-lg bg-slate-800 text-white font-bold text-[9px] uppercase tracking-wider hover:bg-slate-700 shadow-xs transition-all cursor-pointer">
                          {ep === 'ABONO_PARCIAL' ? 'Abonar' : 'Pagar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot className="font-black text-[11px] uppercase shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <tr className="bg-slate-100 border-t-2 border-slate-350">
              <td colSpan={3} className="border border-slate-200 px-3 py-2.5 text-slate-700 uppercase tracking-widest sticky left-0 z-40 bg-slate-100 border-r-2 border-r-slate-300 w-[320px] min-w-[320px] max-w-[320px]">
                <span>TOTALES</span>
              </td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-800 text-xs bg-slate-100">{formatUSD(totalSueldoDiario)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-400 bg-slate-100">—</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-800 text-xs bg-slate-100">{formatUSD(totalBruto)}</td>

              <td className="border border-slate-200 text-center px-1 py-2.5 text-violet-800 text-xs bg-violet-100">{formatUSD(totalProvD3)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-violet-800 text-xs bg-violet-100">{formatUSD(totalProvD4)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-violet-900 text-xs bg-violet-200">{formatUSD(totalAcumD3)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-violet-900 text-xs bg-violet-200">{formatUSD(totalAcumD4)}</td>

              <td className="border border-slate-200 text-center px-1 py-2.5 text-emerald-800 text-xs bg-emerald-100">{formatUSD(totalHE)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-emerald-800 text-xs bg-emerald-100">{formatUSD(totalTE)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-emerald-800 text-xs bg-emerald-100">{formatUSD(totalFR)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 bg-emerald-200 text-emerald-950 font-black text-xs">{formatUSD(totalSumaIngresos)}</td>

              <td className="border border-slate-200 text-center px-1 py-2.5 text-red-800 text-xs bg-red-100">{formatUSD(totalIESS)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-red-800 text-xs bg-red-100">{formatUSD(totalAnticipos + totalMultas + totalOtrosEgress)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 bg-red-200 text-red-950 font-black text-xs">{formatUSD(totalSumaEgresos)}</td>

              <td className="border border-slate-200 text-center px-2 py-2.5 bg-blue-50 text-blue-900 font-extrabold text-xs">{formatUSD(totalNetoMens)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-emerald-50 text-emerald-800 font-extrabold text-xs">{formatUSD(totalNetoHE)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-amber-100 text-amber-900 font-extrabold text-xs">{formatUSD(totalHEPendiente)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-blue-100 text-blue-900 font-extrabold text-xs">{formatUSD(totalNeto)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-green-100 text-green-700 font-extrabold text-xs">{formatUSD(totalAbonado)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-orange-100 text-orange-700 font-extrabold text-xs">{formatUSD(totalPendiente)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-400 bg-slate-100">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Móvil: una card por colaborador */}
      <div className="md:hidden border-t border-slate-200 p-3 space-y-3 max-h-[70vh] overflow-y-auto bg-slate-50/40">
        {rows.map(({ emp, cp, raw }, idx) => {
          const hasContract = emp.tieneContrato !== false;
          const diasLab = raw?.diasLaborables ?? cp?.diasLaborables ?? 15;
          const diasT = cp?.diasLaborados ?? raw?.diasLaborados ?? 0;
          const totalB = resolveTotalBruto(emp, cp, raw);
          const totalAb = resolveAbonado(cp, raw);
          const hePendiente = pendingHEByEmp[emp.id] || 0;
          const he = cp?.ingresos?.horasExtras ?? raw?.ingresos?.horasExtras ?? 0;
          const te = raw?.ingresos?.trabajosEnEmpresa ?? 0;
          const ant = raw?.egresos?.anticipos ?? 0;
          const multas = raw?.egresos?.multas ?? 0;
          const otrosE = raw?.egresos?.dctoGenerico ?? 0;
          const ep = cp?.estadoPago ?? 'PENDIENTE';
          const badge = ESTADO_BADGE[ep] ?? ESTADO_BADGE.PENDIENTE;
          const subtotalNeto = cp?.netoRecibir ?? totalB;
          const { netoMensualidad, netoHorasExtras } = splitNetoPago(subtotalNeto, he);
          const pendientePago = computePendientePago(cp, raw, totalB);

          return (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-400">#{idx + 1}</p>
                  <p className="text-sm font-bold text-slate-800 uppercase leading-snug truncate" title={emp.nombre}>
                    {emp.nombre}
                  </p>
                  <span className={`inline-flex mt-1 items-center px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                    hasContract
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {hasContract ? 'Contrato' : 'Por Asis.'}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-bold text-[9px] uppercase border shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                <div>
                  <span className="text-slate-400 font-semibold block">Sueldo Bruto</span>
                  <span className="font-bold text-slate-800">{formatUSD(totalB)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Días Trab.</span>
                  <CellInput value={diasT} onChange={val => onCellChange(emp.id, 'diasLaborados', val)} />
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">H. Extras</span>
                  <span className="font-bold text-emerald-700">{he > 0 ? formatUSD(he) : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">H.E. Pend.</span>
                  <span className="font-bold text-amber-700">{hePendiente > 0 ? formatUSD(hePendiente) : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Neto Mens.</span>
                  <span className="font-bold text-blue-900">{formatUSD(netoMensualidad)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Neto H.E.</span>
                  <span className="font-bold text-emerald-800">{netoHorasExtras > 0 ? formatUSD(netoHorasExtras) : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Total Neto</span>
                  <span className="font-black text-blue-900">{formatUSD(subtotalNeto)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Pendiente</span>
                  <span className="font-bold text-orange-700">{pendientePago > 0 ? formatUSD(pendientePago) : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Pagado</span>
                  <span className="font-bold text-green-700">{totalAb > 0 ? formatUSD(totalAb) : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Egresos Var.</span>
                  <span className="font-bold text-red-700">{formatUSD(ant + multas + otrosE)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenIngresos(emp.id, emp.nombre)}
                  className="flex-1 min-w-[80px] py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold"
                >
                  Ingresos {te > 0 ? formatUSD(te) : ''}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenEgresos(emp.id, emp.nombre)}
                  className="flex-1 min-w-[80px] py-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-[10px] font-bold"
                >
                  Egresos
                </button>
                {ep !== 'PAGADO' && (
                  <button
                    type="button"
                    onClick={() => onPagar(emp, cp, subtotalNeto, pendientePago)}
                    className="flex-1 min-w-[80px] py-2 rounded-lg bg-slate-800 text-white text-[10px] font-bold uppercase"
                  >
                    {ep === 'ABONO_PARCIAL' ? 'Abonar' : 'Pagar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {rows.length > 0 && (
          <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 text-[10px]">
            <p className="font-bold text-slate-600 uppercase tracking-wider mb-2">Totales quincena</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-slate-400 block text-[9px]">Neto</span>
                <span className="font-black text-slate-800">{formatUSD(totalNeto)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Pagado</span>
                <span className="font-bold text-green-700">{formatUSD(totalAbonado)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Pendiente</span>
                <span className="font-bold text-orange-700">{formatUSD(totalPendiente)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const NominaMesTab = () => {
  const { adapter } = useContext(NominaContext);

  const [month, setMonth]   = useState(() => new Date().getMonth() + 1);
  const [year, setYear]     = useState(() => new Date().getFullYear());

  const [employees, setEmployees] = useState([]);
  const [q1Raw, setQ1Raw] = useState([]);
  const [q2Raw, setQ2Raw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('q1');
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [activeEgresoModal, setActiveEgresoModal] = useState(null);
  const [activeIngresoModal, setActiveIngresoModal] = useState(null);
  const [pendingOvertime, setPendingOvertime] = useState([]);

  const handleOpenEgresos = (empleadoId, empleadoNombre) => {
    const dates = activeTab === 'q1' ? fechas1 : fechas2;
    setActiveEgresoModal({
      empleadoId,
      empleadoNombre,
      fechaInicio: dates.fechaInicio,
      fechaFin: dates.fechaFin
    });
  };

  const handleOpenIngresos = (empleadoId, empleadoNombre) => {
    const dates = activeTab === 'q1' ? fechas1 : fechas2;
    setActiveIngresoModal({
      empleadoId,
      empleadoNombre,
      fechaInicio: dates.fechaInicio,
      fechaFin: dates.fechaFin
    });
  };

  const mesLabel = MESES[month - 1]?.toUpperCase() ?? '';

  const fechas1 = useMemo(() => obtenerFechasPeriodo(year, month, '1ra_quincena'), [year, month]);
  const fechas2 = useMemo(() => obtenerFechasPeriodo(year, month, '2da_quincena'), [year, month]);

  const loadAll = useCallback(async () => {
    if (!adapter) return;
    setLoading(true);
    try {
      const [emps, p1, p2, pending] = await Promise.all([
        adapter.getEmployees(),
        adapter.getPayrolls(fechas1.fechaInicio, fechas1.fechaFin),
        adapter.getPayrolls(fechas2.fechaInicio, fechas2.fechaFin),
        adapter.getPendingOvertime?.() ?? Promise.resolve([]),
      ]);
      setEmployees(emps);
      setQ1Raw(p1);
      setQ2Raw(p2);
      setPendingOvertime(Array.isArray(pending) ? pending : []);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [adapter, fechas1, fechas2]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const q1Calculated = useMemo(() =>
    employees.map(emp => {
      const n = q1Raw.find(p => p.empleadoId === emp.id);
      return n ? calcularNomina(emp, n) : null;
    }).filter(Boolean),
  [employees, q1Raw]);

  const q2Calculated = useMemo(() =>
    employees.map(emp => {
      const n = q2Raw.find(p => p.empleadoId === emp.id);
      return n ? calcularNomina(emp, n) : null;
    }).filter(Boolean),
  [employees, q2Raw]);

  const q1Rows = employees.map(emp => ({
    emp,
    cp: q1Calculated.find(p => p.empleadoId === emp.id) || null,
    raw: q1Raw.find(p => p.empleadoId === emp.id) || null,
  }));

  const q2Rows = employees.map(emp => ({
    emp,
    cp: q2Calculated.find(p => p.empleadoId === emp.id) || null,
    raw: q2Raw.find(p => p.empleadoId === emp.id) || null,
  }));

  const crossPendientes = useMemo(() => {
    const map = {};
    const addPending = (empId, rawRows, subtotalMap, quincenaNum) => {
      const raw = rawRows.find(p => p.empleadoId === empId);
      const totalAb = (raw?.abonos ?? []).reduce((s, a) => s + a.monto, 0);
      const sub = subtotalMap[empId] || 0;
      const restante = sub - totalAb;
      if (restante > 0.01) {
        map[empId] = { empId, pendiente: restante, quincenaOrigen: quincenaNum };
      }
    };
    const q1Subtotals = {};
    const q2Subtotals = {};
    q1Rows.forEach(r => { q1Subtotals[r.emp.id] = computeSubtotal(r.emp, r.cp, false); });
    q2Rows.forEach(r => { q2Subtotals[r.emp.id] = computeSubtotal(r.emp, r.cp, true); });
    Object.keys(q1Subtotals).forEach(id => addPending(id, q1Raw, q1Subtotals, 1));
    Object.keys(q2Subtotals).forEach(id => addPending(id, q2Raw, q2Subtotals, 2));
    return map;
  }, [q1Rows, q2Rows, q1Raw, q2Raw]);

  const handleMesAnterior = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Estás seguro de cambiar de mes y perderlos?')) return;
    }
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const handleMesSiguiente = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Estás seguro de cambiar de mes y perderlos?')) return;
    }
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleCellChange = (empId, fieldPath, value) => {
    const isQ1 = activeTab === 'q1';
    const setter = isQ1 ? setQ1Raw : setQ2Raw;
    
    setter(prev => prev.map(p => {
      if (p.empleadoId !== empId) return p;
      const updated = { ...p };
      const parts = fieldPath.split('.');
      if (parts.length === 1) {
        updated[parts[0]] = value;
      } else if (parts.length === 2) {
        updated[parts[0]] = {
          ...updated[parts[0]],
          [parts[1]]: value
        };
      }
      return updated;
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveBulk = async () => {
    setSavingBulk(true);
    try {
      const targetRaw = activeTab === 'q1' ? q1Raw : q2Raw;
      await Promise.all(targetRaw.map(p => adapter.savePayroll(p)));
      toast.success('Todos los cambios de nómina han sido guardados en la base de datos.');
      setHasUnsavedChanges(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar los cambios de la nómina.');
    } finally {
      setSavingBulk(false);
    }
  };

  const handlePagar = (emp, cp, sub, restantePagar, quincena) => {
    const maxMonto = Math.max(0, Math.round(restantePagar * 100) / 100);
    const arr = quincena === 1 ? q1Raw : q2Raw;
    const nomina = arr.find(p => p.empleadoId === emp.id);
    setPayTarget({
      emp, cp, subtotal: sub,
      monto: maxMonto,
      maxMonto,
      restante: 0,
      quincenaOrigen: quincena,
      quincenaDestino: 0,
      nomina,
    });
  };

  const handlePagarCross = (emp, cross) => {
    const monto = Math.round(cross.pendiente * 100) / 100;
    const arr = cross.quincenaOrigen === 1 ? q1Raw : q2Raw;
    const nomina = arr.find(p => p.empleadoId === emp.id);
    setPayTarget({
      emp, cp: null, subtotal: cross.pendiente,
      monto,
      maxMonto: monto,
      restante: 0,
      quincenaOrigen: cross.quincenaOrigen,
      quincenaDestino: cross.quincenaOrigen,
      isCross: true,
      nomina,
    });
  };

  const handleMontoChange = (val) => {
    if (!payTarget) return;
    const newMonto = Math.round(val * 100) / 100;
    const nuevoRestante = Math.max(0, Math.round((payTarget.maxMonto - newMonto) * 100) / 100);
    setPayTarget(prev => ({ ...prev, monto: newMonto, restante: nuevoRestante }));
  };

  const pagarQuincena = async (rawArr, setter, fechas, empId, monto, fecha, subtotal, metodoPagoId) => {
    let nomina = rawArr.find(p => p.empleadoId === empId);
    if (!nomina) {
      const created = await adapter.getPayrolls(fechas.fechaInicio, fechas.fechaFin);
      nomina = created.find(p => p.empleadoId === empId);
    }
    if (nomina) {
      const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const usuarioNombre = loggedUser.nombre || 'Usuario';
      
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const fechaHora = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const actualizada = registrarAbono(nomina, { monto, fecha, metodoPagoId, usuarioNombre, fechaHora });
      const totalAb = actualizada.abonos.reduce((s, a) => s + a.monto, 0);
      if (subtotal > 0 && totalAb >= subtotal) {
        actualizada.estado = 'PAGADO';
      } else if (totalAb > 0) {
        actualizada.estado = 'ABONO_PARCIAL';
      }
      const saved = await adapter.savePayroll(actualizada);
      setter(prev => prev.map(p => p.empleadoId === saved.empleadoId ? saved : p));
    }
  };

  const handleConfirmPago = async (metodoPagoId) => {
    if (!payTarget || !payTarget.monto || payTarget.monto <= 0) return;
    if (!metodoPagoId) {
      toast.error('Debe seleccionar una cuenta de pago (caja).');
      return;
    }

    const confirm = await confirmDialog(
      'Confirmar registro de pago',
      `¿Está seguro de registrar el pago de ${formatUSD(payTarget.monto)} para el colaborador ${payTarget.emp.nombre}?`,
      { type: 'warning', confirmLabel: 'Aceptar y Pagar', cancelLabel: 'Cancelar' }
    );
    if (!confirm) return;

    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const empId = payTarget.emp.id;
      const emp   = payTarget.emp;
      const cp1   = q1Calculated.find(p => p.empleadoId === empId);
      const cp2   = q2Calculated.find(p => p.empleadoId === empId);
      const subQ1 = computeSubtotal(emp, cp1, false);
      const subQ2 = computeSubtotal(emp, cp2, true);

      if (payTarget.isCross) {
        const qDest = payTarget.quincenaDestino || payTarget.quincenaOrigen;
        const sub   = qDest === 1 ? subQ1 : subQ2;
        const arr   = qDest === 1 ? q1Raw : q2Raw;
        const set   = qDest === 1 ? setQ1Raw : setQ2Raw;
        const fec   = qDest === 1 ? fechas1 : fechas2;
        await pagarQuincena(arr, set, fec, empId, payTarget.monto, hoy, sub, metodoPagoId);
      } else {
        if (payTarget.quincenaOrigen === 2) {
          await pagarQuincena(q2Raw, setQ2Raw, fechas2, empId, payTarget.monto, hoy, subQ2, metodoPagoId);
        } else {
          await Promise.all([
            pagarQuincena(q1Raw, setQ1Raw, fechas1, empId, payTarget.monto, hoy, subQ1, metodoPagoId),
            pagarQuincena(q2Raw, setQ2Raw, fechas2, empId, payTarget.monto, hoy, subQ2, metodoPagoId),
          ]);
        }
      }
      deferClose(() => setPayTarget(null));
      toast.success('Pago registrado exitosamente.');
      await loadAll();
    } catch (err) {
      toast.error('Error al registrar el pago: ' + (err.message || err));
    }
  };

  const handleDeleteAbono = async (nomina, abonoId) => {
    if (!payTarget) return;

    const confirm = await confirmDialog(
      'Confirmar eliminación de pago',
      '¿Está seguro de eliminar este pago del historial? El dinero se devolverá automáticamente a la caja/banco correspondiente.',
      { type: 'warning', confirmLabel: 'Eliminar Pago', cancelLabel: 'Cancelar' }
    );
    if (!confirm) return;

    try {
      const abonosActualizados = (nomina.abonos || []).filter(a => a.id !== abonoId);

      let nuevoEstado = 'PENDIENTE';
      const totalAb = abonosActualizados.reduce((s, a) => s + a.monto, 0);

      const empId = payTarget.emp.id;
      const emp   = payTarget.emp;
      const cp1   = q1Calculated.find(p => p.empleadoId === empId);
      const cp2   = q2Calculated.find(p => p.empleadoId === empId);
      const sub = payTarget.quincenaOrigen === 1
        ? computeSubtotal(emp, cp1, false)
        : computeSubtotal(emp, cp2, true);

      if (sub > 0 && totalAb >= sub) {
        nuevoEstado = 'PAGADO';
      } else if (totalAb > 0) {
        nuevoEstado = 'ABONO_PARCIAL';
      }

      const actualizada = new nomina.constructor({
        ...nomina,
        abonos: abonosActualizados,
        estado: nuevoEstado,
      });

      const saved = await adapter.savePayroll(actualizada);

      const isQ1 = payTarget.quincenaOrigen === 1;
      const setter = isQ1 ? setQ1Raw : setQ2Raw;
      setter(prev => prev.map(p => p.empleadoId === saved.empleadoId ? saved : p));

      setPayTarget(prev => {
        if (!prev) return null;
        const newMax = Math.max(0, sub - totalAb);
        return {
          ...prev,
          nomina: saved,
          maxMonto: newMax,
          monto: newMax,
          restante: 0,
        };
      });

      toast.success('Pago eliminado y saldo devuelto a la caja.');
      await loadAll();
    } catch (err) {
      console.error('[deleteAbono]', err);
      toast.error(err.message || 'Error al eliminar el pago.');
    }
  };

  const handleExportarExcel = async () => {
    try {
      toast.info('Generando reporte en Excel...');
      const blob = await adapter.exportToExcel(year, month);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nomina_${mesLabel}_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte Excel descargado correctamente.');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar o descargar el archivo Excel.');
    }
  };

  const totalPagadoQ1 = q1Rows.reduce((s, r) => s + ((r.raw?.abonos ?? []).reduce((a, b) => a + b.monto, 0)), 0);
  const totalPagadoQ2 = q2Rows.reduce((s, r) => s + ((r.raw?.abonos ?? []).reduce((a, b) => a + b.monto, 0)), 0);
  const totalQ1 = q1Rows.reduce((s, r) => s + computeSubtotal(r.emp, r.cp, false), 0);
  const totalQ2 = q2Rows.reduce((s, r) => s + computeSubtotal(r.emp, r.cp, true), 0);

  const mesNetoSplit = useMemo(() => {
    const allRows = [...q1Rows, ...q2Rows];
    return allRows.reduce(
      (acc, r) => {
        const he = r.cp?.ingresos?.horasExtras ?? 0;
        const { netoMensualidad, netoHorasExtras } = splitNetoPago(r.cp?.netoRecibir ?? 0, he);
        return {
          netoMensualidad: acc.netoMensualidad + netoMensualidad,
          netoHorasExtras: acc.netoHorasExtras + netoHorasExtras,
        };
      },
      { netoMensualidad: 0, netoHorasExtras: 0 },
    );
  }, [q1Rows, q2Rows]);

  const mesHEPendiente = useMemo(() => {
    const map = sumPendingHEInRange(pendingOvertime, fechas1.fechaInicio, fechas2.fechaFin);
    return Object.values(map).reduce((s, v) => s + v, 0);
  }, [pendingOvertime, fechas1, fechas2]);

  const totalPagado = totalPagadoQ1 + totalPagadoQ2;
  const totalPendiente = (totalQ1 + totalQ2) - totalPagado;

  if (loading && !employees.length) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm font-semibold">
        <svg className="animate-spin h-5 w-5 mr-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Cargando nómina...
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-5">
      {/* Title & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase">
            Rol Quincenal — {mesLabel} {year}
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Nómina dividida en primera y segunda quincena. Ingresa y edita datos directamente en las celdas y guarda los cambios de forma masiva.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveBulk}
              disabled={savingBulk}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-700"
            >
              {savingBulk ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h19.5M9 3.75v3a1.5 1.5 0 0 0 1.5 1.5h3A1.5 1.5 0 0 0 15 6.75v-3M9 3.75h6M12 11.25v5m-3-3h6" />
                </svg>
              )}
              Guardar Cambios de Nómina
            </button>
          )}

          <div className="flex items-center gap-2">
            <button onClick={handleMesAnterior}
              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold shadow-xs transition-all cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center">{mesLabel} {year}</span>
            <button onClick={handleMesSiguiente}
              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold shadow-xs transition-all cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleExportarExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* KPI Cards — horizontal en móvil, layout amplio en escritorio */}
      <div className="grid grid-cols-3 gap-2 md:gap-5">
        {/* Total Mes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-3 md:px-5 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-slate-400 leading-tight">
              Total Nómina Mes
            </p>
            <p className="text-sm md:text-2xl font-black text-slate-800 mt-1 md:mt-1 leading-none">
              {formatUSD(totalQ1 + totalQ2)}
            </p>
            <div className="text-[8px] md:text-[10px] text-slate-500 mt-1.5 md:mt-1 font-semibold leading-snug line-clamp-3 md:line-clamp-none">
              <span className="md:hidden">Mens. {formatUSD(mesNetoSplit.netoMensualidad)} · H.E. {formatUSD(mesNetoSplit.netoHorasExtras)}</span>
              <span className="hidden md:inline">
                Mensualidad {formatUSD(mesNetoSplit.netoMensualidad)} · H. Extras {formatUSD(mesNetoSplit.netoHorasExtras)}
                {mesHEPendiente > 0 && (
                  <span className="text-amber-700"> · H.E. pend. {formatUSD(mesHEPendiente)}</span>
                )}
              </span>
            </div>
            {mesHEPendiente > 0 && (
              <p className="text-[8px] text-amber-700 font-semibold mt-0.5 md:hidden line-clamp-1">
                H.E. pend. {formatUSD(mesHEPendiente)}
              </p>
            )}
          </div>
          <div className="hidden md:block p-3 bg-slate-50 rounded-lg text-slate-500 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </div>

        {/* Pagado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-3 md:px-5 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-slate-400 leading-tight">
              Pagado
            </p>
            <p className="text-sm md:text-2xl font-black text-emerald-600 mt-1 leading-none">
              {formatUSD(totalPagado)}
            </p>
          </div>
          <div className="hidden md:block p-3 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </div>

        {/* Pendiente */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-3 md:px-5 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-slate-400 leading-tight">
              Total Pendiente
            </p>
            <p className="text-sm md:text-2xl font-black text-red-600 mt-1 leading-none">
              {formatUSD(totalPendiente)}
            </p>
          </div>
          <div className="hidden md:block p-3 bg-red-50 rounded-lg text-red-600 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border border-slate-200 bg-white rounded-t-xl overflow-hidden shadow-xs">
        <button
          onClick={() => {
            if (hasUnsavedChanges) {
              if (!window.confirm('Tienes cambios sin guardar. ¿Estás seguro de cambiar de pestaña y perderlos?')) return;
            }
            setActiveTab('q1');
          }}
          className={`flex-1 py-3 px-6 text-center focus:outline-none transition-all flex flex-col items-center justify-center gap-1 border-b-2 ${
            activeTab === 'q1'
              ? 'border-slate-700 text-slate-800 font-extrabold bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30 font-semibold'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span className="text-xs uppercase tracking-wider">1ra Quincena (01 - 15)</span>
          </div>
          <span className="text-[10px] opacity-85 font-mono">
            Subtotal: {formatUSD(totalQ1)} | Pendiente: {formatUSD(Math.max(0, totalQ1 - totalPagadoQ1))}
          </span>
        </button>

        <button
          onClick={() => {
            if (hasUnsavedChanges) {
              if (!window.confirm('Tienes cambios sin guardar. ¿Estás seguro de cambiar de pestaña y perderlos?')) return;
            }
            setActiveTab('q2');
          }}
          className={`flex-1 py-3 px-6 text-center focus:outline-none transition-all flex flex-col items-center justify-center gap-1 border-b-2 ${
            activeTab === 'q2'
              ? 'border-slate-700 text-slate-800 font-extrabold bg-slate-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/30 font-semibold'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="text-xs uppercase tracking-wider">2da Quincena (16 - Fin)</span>
          </div>
          <span className="text-[10px] opacity-85 font-mono">
            Subtotal: {formatUSD(totalQ2)} | Pendiente: {formatUSD(Math.max(0, totalQ2 - totalPagadoQ2))}
          </span>
        </button>
      </div>

      {/* Una sola tabla activa + key por quincena: remount limpio (sticky + React 19) */}
      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-xs overflow-hidden min-h-[250px] transition-all">
        <QuincenaTable
          key={`${year}-${month}-${activeTab}`}
          label={
            activeTab === 'q1'
              ? `PRIMERA QUINCENA — ${mesLabel} ${year} (01 AL 15)`
              : `SEGUNDA QUINCENA — ${mesLabel} ${year} (16 AL ${new Date(year, month, 0).getDate()})`
          }
          quincenaNum={activeTab === 'q1' ? 1 : 2}
          rows={activeTab === 'q1' ? q1Rows : q2Rows}
          crossPendientes={
            activeTab === 'q1'
              ? Object.values(crossPendientes).filter((p) => p.quincenaOrigen === 2)
              : Object.values(crossPendientes).filter((p) => p.quincenaOrigen === 1)
          }
          pendingOvertime={pendingOvertime}
          fechaInicio={activeTab === 'q1' ? fechas1.fechaInicio : fechas2.fechaInicio}
          fechaFin={activeTab === 'q1' ? fechas1.fechaFin : fechas2.fechaFin}
          onPagar={(emp, cp, sub, restante) =>
            handlePagar(emp, cp, sub, restante, activeTab === 'q1' ? 1 : 2)
          }
          onPagarCross={(emp, cross) => handlePagarCross(emp, cross)}
          onCellChange={handleCellChange}
          onOpenEgresos={handleOpenEgresos}
          onOpenIngresos={handleOpenIngresos}
        />
      </div>

      {payTarget ? (
        <ModalPortal>
          <PayModal
            emp={payTarget.emp}
            monto={payTarget.monto}
            maxMonto={payTarget.maxMonto}
            restante={payTarget.restante}
            isCross={payTarget.isCross}
            nomina={payTarget.nomina}
            onDeleteAbono={handleDeleteAbono}
            quincenaLabel={`${mesLabel} ${year}`}
            onClose={() => deferClose(() => setPayTarget(null))}
            onConfirm={handleConfirmPago}
            onMontoChange={handleMontoChange}
          />
        </ModalPortal>
      ) : null}

      {activeEgresoModal ? (
        <ModalPortal>
          <DetalleEgresosModal
            empleadoId={activeEgresoModal.empleadoId}
            empleadoNombre={activeEgresoModal.empleadoNombre}
            fechaInicio={activeEgresoModal.fechaInicio}
            fechaFin={activeEgresoModal.fechaFin}
            adapter={adapter}
            onClose={() => deferClose(() => setActiveEgresoModal(null))}
            onUpdate={loadAll}
          />
        </ModalPortal>
      ) : null}

      {activeIngresoModal ? (
        <ModalPortal>
          <DetalleIngresosModal
            empleadoId={activeIngresoModal.empleadoId}
            empleadoNombre={activeIngresoModal.empleadoNombre}
            fechaInicio={activeIngresoModal.fechaInicio}
            fechaFin={activeIngresoModal.fechaFin}
            adapter={adapter}
            onClose={() => deferClose(() => setActiveIngresoModal(null))}
            onUpdate={loadAll}
          />
        </ModalPortal>
      ) : null}
    </div>
  );
};
