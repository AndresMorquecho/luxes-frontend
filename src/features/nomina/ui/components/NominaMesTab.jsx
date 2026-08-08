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
import { calcularMultaAtraso, DEFAULT_HORARIOS_CONFIG } from '../../../asistencia/helpers/horarioLaboral.js';

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

const BANCO_THEMES = {
  '': {
    gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    text: '#ffffff',
    accent: '#cbd5e1',
    chip: '#94a3b8',
    light: false,
  },
  Pichincha: {
    gradient: 'linear-gradient(135deg, #ffdd00 0%, #ffc800 50%, #f5b000 100%)',
    text: '#003087',
    accent: '#003087',
    chip: '#003087',
    light: true,
  },
  Guayaquil: {
    gradient: 'linear-gradient(135deg, #c41230 0%, #e31837 50%, #9b0f24 100%)',
    text: '#ffffff',
    accent: '#ffffff',
    chip: '#ffd6dc',
    light: false,
  },
  Bolivariano: {
    gradient: 'linear-gradient(135deg, #004d2e 0%, #006b3f 50%, #003322 100%)',
    text: '#ffffff',
    accent: '#ffd700',
    chip: '#c5e86c',
    light: false,
  },
  Pacifico: {
    gradient: 'linear-gradient(135deg, #002d72 0%, #003da5 50%, #001a45 100%)',
    text: '#ffffff',
    accent: '#5eb6ff',
    chip: '#7ec8ff',
    light: false,
  },
  Internacional: {
    gradient: 'linear-gradient(135deg, #003087 0%, #f47920 120%)',
    text: '#ffffff',
    accent: '#ffffff',
    chip: '#ffb380',
    light: false,
  },
  Produbanco: {
    gradient: 'linear-gradient(135deg, #6b0015 0%, #c8102e 50%, #4a000e 100%)',
    text: '#ffffff',
    accent: '#f5c6ce',
    chip: '#e8a0ab',
    light: false,
  },
  Austro: {
    gradient: 'linear-gradient(135deg, #005a28 0%, #00843d 50%, #003d18 100%)',
    text: '#ffffff',
    accent: '#ffffff',
    chip: '#7ddea0',
    light: false,
  },
  Machala: {
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #065f46 120%)',
    text: '#ffffff',
    accent: '#7dd3fc',
    chip: '#6ee7b7',
    light: false,
  },
};

const normalizeBankName = (name) => {
  if (!name) return '';
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const bankNames = Object.keys(BANCO_THEMES);
  return bankNames.find((b) => {
    const candidate = b
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized === candidate || normalized.includes(candidate);
  }) || '';
};

const PayModal = ({ emp, monto, maxMonto, restante, quincenaLabel, isCross, nomina, onDeleteAbono, onClose, onConfirm, onMontoChange }) => {
  const [activeTab, setActiveTab] = useState('registrar'); // 'registrar' | 'historial'
  const [metodosPago, setMetodosPago] = useState([]);
  const [selectedMetodoPagoId, setSelectedMetodoPagoId] = useState('');
  const [loadingMps, setLoadingMps] = useState(true);

  // Comprobante de pago (upload)
  const [comprobanteUrl, setComprobanteUrl] = useState(null);
  const [comprobantePreview, setComprobantePreview] = useState(null);
  const [comprobanteName, setComprobanteName] = useState('');
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const comprobanteInputRef = React.useRef(null);

  // Modal para ver comprobante del historial
  const [viewComprobanteUrl, setViewComprobanteUrl] = useState(null);

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

  // Upload comprobante
  const handleUploadComprobante = async (file) => {
    if (!file) return;
    setUploadingComprobante(true);
    setComprobanteName(file.name);

    // Preview local
    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setComprobantePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setComprobantePreview(null);
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('comprobante', file);
      const res = await fetch('/api/nomina/comprobantes/upload', {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        setComprobanteUrl(json.data.url);
      } else {
        toast.error('Error al subir el comprobante');
        setComprobantePreview(null);
        setComprobanteName('');
      }
    } catch (err) {
      console.error('Error uploading comprobante:', err);
      toast.error('Error al subir el comprobante');
      setComprobantePreview(null);
      setComprobanteName('');
    } finally {
      setUploadingComprobante(false);
    }
  };

  const handleRemoveComprobante = async () => {
    if (comprobanteUrl) {
      try {
        const token = localStorage.getItem('token');
        const filename = comprobanteUrl.split('/').pop();
        await fetch(`/api/nomina/comprobantes/${filename}`, {
          method: 'DELETE',
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
      } catch (err) {
        console.error('Error deleting comprobante:', err);
      }
    }
    setComprobanteUrl(null);
    setComprobantePreview(null);
    setComprobanteName('');
    if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUploadComprobante(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full md:w-[90vw] max-w-4xl mx-4 h-[620px] overflow-hidden border border-slate-200 flex flex-col animate-slide-up animate-duration-200"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Minimalist Header */}
        <div className="bg-slate-50 px-8 py-3.5 border-b border-slate-200/80 flex justify-between items-center relative shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-sm font-extrabold tracking-wider text-slate-800 uppercase flex items-center gap-2 leading-none">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-18 0a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25m-18 0v12.5A2.25 2.25 0 0 0 5.25 17h13.5A2.25 2.25 0 0 0 21 14.75V4.5M9 9h.008v.008H9V9Zm.008 3h.008v.008H9.008V12Zm3-3h.008v.008h-.008V9Zm0 3h.008v.008h-.008V12Zm3-3h.008v.008h-.008V9Zm0 3h.008v.008h-.008V12Z" />
                </svg>
                Registro de Pago
              </h3>
              <p className="text-slate-500 text-[10px] mt-1.5 font-bold tracking-wide leading-none">
                {quincenaLabel} — {emp.nombre}
              </p>
            </div>

            {/* Pill tabs inside header */}
            <div className="flex bg-slate-200/50 rounded-lg p-0.5 border border-slate-300/30 ml-4 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('registrar')}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                  activeTab === 'registrar'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 bg-transparent'
                }`}
              >
                Registrar Pago
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('historial')}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                  activeTab === 'historial'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 bg-transparent'
                }`}
              >
                Historial ({nomina?.abonos?.length || 0})
              </button>
            </div>
          </div>
          
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 p-1.5 rounded-full transition-all cursor-pointer bg-transparent border-0 outline-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Wrapper (Fixed height inside flex-col) */}
        <div className="px-8 py-5 flex-1 min-h-0 flex flex-col justify-between">
          
          <div className="flex-1 min-h-0">
            {activeTab === 'registrar' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-2">
                
                {/* Columna Izquierda: Datos del Colaborador y Banco */}
                <div className="flex flex-col justify-center items-center space-y-4 py-1">
                  <div className="space-y-1.5 w-full text-center">
                    <span className="text-[10px] font-bold text-blue-650 uppercase tracking-widest block">Colaborador Destinatario</span>
                    <h4 className="text-xl font-bold text-slate-800 uppercase leading-none tracking-tight">
                      {emp.nombre}
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold leading-snug max-w-sm mx-auto">
                      Verifique que la cuenta destino coincida con el registro impreso antes de proceder con la transferencia bancaria.
                    </p>
                  </div>

                  {/* Tarjeta de Cuenta Bancaria Registrada (Credit Card style with dynamic colors) */}
                  {(() => {
                    const normalizedBank = normalizeBankName(emp.banco);
                    const theme = BANCO_THEMES[normalizedBank] || BANCO_THEMES[''];
                    const light = theme.light;

                    return (
                      <div
                        className="relative rounded-2xl p-5 shadow-md transition-all duration-300 w-full max-w-[350px] mx-auto aspect-[1.63/1] flex flex-col justify-between overflow-hidden"
                        style={{ background: theme.gradient }}
                      >
                        {/* Decorative circles */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                          <div
                            className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full opacity-20"
                            style={{ background: theme.accent }}
                          />
                          <div
                            className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-10"
                            style={{ background: theme.accent }}
                          />
                        </div>

                        {/* Header with chip and bank */}
                        <div className="flex items-start justify-between relative z-10">
                          <div
                            className={`relative w-8 h-[22px] rounded overflow-hidden ${light ? 'border border-[#003087]/25 shadow-sm' : 'border border-black/20 shadow-sm'}`}
                            style={{ background: `linear-gradient(135deg, #fde047 0%, #eab308 100%)` }}
                          >
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[0.5px] bg-black/20"></div>
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[0.5px] bg-black/20"></div>
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${light ? 'bg-[#003087]/10 text-[#003087]' : 'bg-white/10 text-white'}`}>
                            Cuenta
                          </div>
                        </div>

                        {/* Bank name */}
                        <div className="relative z-10">
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${light ? 'text-[#003087]/65' : 'text-white/60'}`}>
                            Institución financiera
                          </p>
                          <p className={`text-xl font-black uppercase tracking-tight mt-0.5 ${light ? 'text-[#003087]' : 'text-white'}`}>
                            {emp.banco || 'Sin banco registrado'}
                          </p>
                        </div>

                        {/* Account number */}
                        <div className="relative z-10">
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${light ? 'text-[#003087]/65' : 'text-white/60'}`}>
                            Número de cuenta
                          </p>
                          <p className={`text-lg font-mono tracking-[0.2em] font-bold mt-1 ${light ? 'text-[#003087]' : 'text-white'}`}>
                            {emp.cuentaBanco ? emp.cuentaBanco.match(/.{1,4}/g).join(' ') : '—— —— ——'}
                          </p>
                        </div>

                        {/* Beneficiary and logo */}
                        <div className="flex items-end justify-between relative z-10">
                          <div className="flex-1 min-w-0">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${light ? 'text-[#003087]/65' : 'text-white/60'}`}>
                              Beneficiario
                            </p>
                            <p className={`text-sm font-bold uppercase truncate mt-0.5 ${light ? 'text-[#003087]' : 'text-white'}`}>
                              {emp.nombre}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <div className={`w-8 h-5 rounded ${light ? 'bg-red-500' : 'bg-red-500'}`}></div>
                            <div className={`w-8 h-5 rounded ${light ? 'bg-amber-400' : 'bg-amber-400'} -ml-2`}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Columna Derecha: Detalle de Liquidación / Abono y Selección de Caja */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 flex flex-col space-y-3 shadow-xs shrink-0">
                  
                  {/* 1. Monto Total a Pagar */}
                  <div className="flex justify-between items-center py-2.5 px-4 bg-white border border-slate-200 rounded-xl shadow-xs shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50/80 text-blue-655 rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monto Total a Pagar</span>
                        <span className="text-xs font-semibold text-slate-500">Neto del período</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-800 tracking-tight">{formatUSD(maxMonto)}</span>
                  </div>

                  {/* 2. Caja/Cuenta de Salida */}
                  <div className="space-y-1.5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs shrink-0">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-650 uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                        </svg>
                        Origen del Pago
                      </label>
                      {loadingMps && <span className="text-xs text-blue-600 animate-pulse font-bold">Cargando...</span>}
                    </div>
                    <select
                      value={selectedMetodoPagoId}
                      onChange={(e) => setSelectedMetodoPagoId(e.target.value)}
                      disabled={loadingMps}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
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
                  <div className="space-y-1.5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs shrink-0">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-655 uppercase tracking-wider">
                        {isCross ? 'Abono pendiente de otra quincena' : 'Monto a pagar hoy'}
                      </label>
                      <span className="text-[10px] font-bold text-slate-400">USD</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-455 font-extrabold text-xs">$</span>
                      <input type="number" step="0.01" min="0.01" max={maxMonto}
                        value={monto}
                        onChange={(e) => onMontoChange(Math.min(parseFloat(e.target.value) || 0, maxMonto))}
                        className="w-full pl-6 pr-3 py-2 text-lg font-black text-slate-800 border border-slate-200 rounded-lg bg-slate-50/20 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" />
                    </div>

                    {/* Zona de comprobante de pago (drag & drop) */}
                    <div className="pt-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Comprobante de pago <span className="text-slate-300 font-medium">(opcional)</span></label>
                      {comprobanteUrl ? (
                        <div className="flex items-center gap-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                          {comprobantePreview ? (
                            <img src={comprobantePreview} alt="Comprobante" className="w-10 h-10 rounded-md object-cover border border-emerald-200 shrink-0 cursor-pointer" onClick={() => setViewComprobanteUrl(comprobantePreview)} />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-emerald-800 truncate">{comprobanteName}</p>
                            <p className="text-[10px] text-emerald-600 font-medium">Archivo subido correctamente</p>
                          </div>
                          <button type="button" onClick={handleRemoveComprobante} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer bg-transparent border-0 outline-none shrink-0" title="Quitar comprobante">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onClick={() => comprobanteInputRef.current?.click()}
                          className={`flex flex-col items-center justify-center gap-1 py-3 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                            isDragOver
                              ? 'border-blue-400 bg-blue-50/60'
                              : 'border-slate-200 bg-slate-50/30 hover:border-blue-300 hover:bg-blue-50/30'
                          } ${uploadingComprobante ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {uploadingComprobante ? (
                            <span className="text-xs text-blue-600 font-bold animate-pulse">Subiendo archivo...</span>
                          ) : (
                            <>
                              <svg className={`w-6 h-6 ${isDragOver ? 'text-blue-500' : 'text-slate-300'} transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v13.5A1.5 1.5 0 0 0 3.75 21Z" />
                              </svg>
                              <span className="text-[10px] font-bold text-slate-400">Arrastra el comprobante aquí o haz clic</span>
                            </>
                          )}
                          <input ref={comprobanteInputRef} type="file" className="hidden" onChange={(e) => handleUploadComprobante(e.target.files?.[0])} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Saldo Pendiente que quedaría */}
                  <div className="flex justify-between items-center py-2.5 px-4 bg-white border border-slate-200 rounded-xl shadow-xs shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-orange-50 text-orange-600 rounded-md">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Restante</span>
                      </div>
                    </div>
                    {restante <= 0.01 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Liquidada
                      </span>
                    ) : (
                      <span className="text-base font-black text-orange-600 tracking-tight">{formatUSD(restante)}</span>
                    )}
                  </div>

                </div>
                
              </div>
            ) : (
              /* Historial de Pagos Tab (Fixed-Size content) */
              <div className="space-y-3 h-full flex flex-col justify-start">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Pagos y Abonos Registrados en el Período</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs flex-1 max-h-[340px] overflow-y-auto">
                  <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-3">Fecha y Hora</th>
                        <th className="px-3 py-3">Registrado Por</th>
                        <th className="px-3 py-3">Caja / Cuenta</th>
                        <th className="px-3 py-3 text-right">Monto</th>
                        <th className="px-3 py-3 text-center">Comprobante</th>
                        <th className="px-3 py-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-xs">
                      {(!nomina || !nomina.abonos || nomina.abonos.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">
                            No hay abonos registrados en este período para el colaborador.
                          </td>
                        </tr>
                      ) : (
                        nomina.abonos.map((ab, idx) => (
                          <tr key={ab.id || idx} className="hover:bg-slate-50/50">
                            {/* Fecha y Hora con Icono */}
                            <td className="px-3 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-slate-500 font-mono">
                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                                {ab.fechaHora || ab.fecha}
                              </span>
                            </td>
                            {/* Registrado Por con Icono */}
                            <td className="px-3 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-slate-700">
                                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                                {ab.usuarioNombre || 'Usuario'}
                              </span>
                            </td>
                            {/* Caja / Cuenta de Salida con Icono */}
                            <td className="px-3 py-3.5">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold">
                                <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                                </svg>
                                {ab.metodoPagoNombre || 'No especificado'}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-right font-black text-slate-800">{formatUSD(ab.monto)}</td>
                            {/* Comprobante */}
                            <td className="px-3 py-3.5 text-center">
                              {ab.comprobanteUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setViewComprobanteUrl(ab.comprobanteUrl)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold hover:bg-blue-100 transition-all cursor-pointer border border-blue-200 outline-none"
                                  title="Ver comprobante"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v13.5A1.5 1.5 0 0 0 3.75 21Z" />
                                  </svg>
                                  Ver
                                </button>
                              ) : (
                                <span className="text-slate-300 text-[10px] font-medium">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-center">
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
                onClick={() => onConfirm(selectedMetodoPagoId, comprobanteUrl)}
                disabled={!monto || monto <= 0 || !selectedMetodoPagoId || loadingMps || uploadingComprobante}
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

        {/* Modal de visualización de comprobante */}
        {viewComprobanteUrl && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setViewComprobanteUrl(null)}>
            {/* Botón cerrar — fijo en esquina superior derecha del overlay */}
            <button
              onClick={() => setViewComprobanteUrl(null)}
              className="fixed top-4 right-4 w-10 h-10 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:scale-110 transition-all cursor-pointer border border-slate-200 z-[10002] outline-none"
              title="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mx-4 max-w-4xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img src={viewComprobanteUrl} alt="Comprobante de pago" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DetallePermisosModal = ({
  emp,
  fechaInicio,
  fechaFin,
  raw,
  adapter,
  onClose,
  onUpdate,
}) => {
  const empleadoId = emp?.id;
  const empleadoNombre = emp?.nombre;
  const sueldoDiarioVal = parseFloat(emp?.sueldoDiario) || 0;
  const hourlyRate = sueldoDiarioVal / 8;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fecha, setFecha] = useState(() => fechaInicio ? fechaInicio.slice(0, 10) : '');
  const [tipo, setTipo] = useState('PERMISO_PERSONAL');
  const [horas, setHoras] = useState('1.0');
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const initRecords = async () => {
      setLoading(true);
      try {
        const desdeStr = fechaInicio ? fechaInicio.slice(0, 10) : '';
        const hastaStr = fechaFin ? fechaFin.slice(0, 10) : '';
        if (desdeStr && hastaStr) {
          const token = localStorage.getItem('token');

          // Load horario config to get toleranciaMinutos and day-specific schedules
          let horariosConfig = DEFAULT_HORARIOS_CONFIG;
          try {
            const cfgRes = await fetch('/api/asistencias/horario-config', {
              headers: { Authorization: token ? `Bearer ${token}` : '' }
            });
            const cfgJson = await cfgRes.json();
            if (cfgJson.success && cfgJson.data) horariosConfig = cfgJson.data;
          } catch {
            // fallback to defaults silently
          }
          const toleranciaMinutos = Number(horariosConfig.toleranciaMinutos ?? DEFAULT_HORARIOS_CONFIG.toleranciaMinutos);

          /**
           * Resolves the expected entry time (in minutes since midnight) for a given date.
           * Returns null for Sunday (day 0).
           */
          const getExpectedEntradaMins = (fechaHoraStr) => {
            const date = new Date(fechaHoraStr);
            const day = date.getDay();
            if (day === 0) return null; // Sunday — skip
            const diaConfig = day === 6 ? horariosConfig.sabado : horariosConfig.semana;
            if (!diaConfig?.entrada) return null;
            const [eh, em] = diaConfig.entrada.split(':').map(Number);
            return eh * 60 + em;
          };

          /**
           * Calculates the fine in $ for a late entry (ENTRADA).
           * Returns null if there is no lateness or it is Sunday.
           */
          const calcMultaEntrada = (asistencia) => {
            const expectedMins = getExpectedEntradaMins(asistencia.fechaHora);
            if (expectedMins === null) return null;
            const date = new Date(asistencia.fechaHora);
            const realMins = date.getHours() * 60 + date.getMinutes();
            const atrasoMins = realMins - expectedMins;
            if (atrasoMins <= 0) return null;
            const multa = calcularMultaAtraso(atrasoMins, toleranciaMinutos);
            if (multa <= 0) return null;
            return { multa, atrasoMins };
          };

          /**
           * Calculates the fine in $ for a late return from lunch (FIN_ALMUERZO).
           * The expected return is INICIO_ALMUERZO timestamp + 60 minutes.
           * Returns null if no lateness or data is missing.
           */
          const calcMultaRegAlmuerzo = (finAlmuerzo, inicioAlmuerzo) => {
            if (!inicioAlmuerzo) return null;
            const expectedReturn = new Date(inicioAlmuerzo.fechaHora).getTime() + 60 * 60 * 1000;
            const realReturn = new Date(finAlmuerzo.fechaHora).getTime();
            const atrasoMins = Math.floor((realReturn - expectedReturn) / 60000);
            if (atrasoMins <= 0) return null;
            const multa = calcularMultaAtraso(atrasoMins, toleranciaMinutos);
            if (multa <= 0) return null;
            return { multa, atrasoMins };
          };

          const res = await fetch(`/api/asistencias?desde=${desdeStr}&hasta=${hastaStr}`, {
            headers: { Authorization: token ? `Bearer ${token}` : '' }
          });
          const json = await res.json();

          if (json.success && Array.isArray(json.data)) {
            const empAsistencias = json.data.filter(a => a.empleadoId === empleadoId);

            // Group by date to pair INICIO_ALMUERZO with FIN_ALMUERZO
            const byDate = {};
            for (const a of empAsistencias) {
              const d = a.fechaHora.slice(0, 10);
              if (!byDate[d]) byDate[d] = {};
              byDate[d][a.tipo] = a;
            }

            const qrAtrasos = [];

            for (const [dateStr, marcaciones] of Object.entries(byDate)) {
              // 1. ENTRADA late fine
              if (marcaciones.ENTRADA) {
                const r = calcMultaEntrada(marcaciones.ENTRADA);
                if (r) {
                  const locTime = new Date(marcaciones.ENTRADA.fechaHora)
                    .toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
                  qrAtrasos.push({
                    id: `qr-ent-${marcaciones.ENTRADA.id}`,
                    fecha: dateStr,
                    horaMarcacion: locTime,
                    // Store multa in `horas` field (semantically: multa en $)
                    // calcularNomina.js will treat permisoHoras as $ directly after the fix below
                    horas: r.multa,
                    multaDolares: r.multa,
                    atrasoMinutos: r.atrasoMins,
                    motivo: `Atraso entrada QR ${locTime} (+${r.atrasoMins} min)`,
                    tipo: 'ATRASO_QR',
                  });
                }
              }

              // 2. REGRESO ALMUERZO late fine
              if (marcaciones.FIN_ALMUERZO && marcaciones.INICIO_ALMUERZO) {
                const r = calcMultaRegAlmuerzo(marcaciones.FIN_ALMUERZO, marcaciones.INICIO_ALMUERZO);
                if (r) {
                  const locTime = new Date(marcaciones.FIN_ALMUERZO.fechaHora)
                    .toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
                  qrAtrasos.push({
                    id: `qr-alm-${marcaciones.FIN_ALMUERZO.id}`,
                    fecha: dateStr,
                    horaMarcacion: locTime,
                    horas: r.multa,
                    multaDolares: r.multa,
                    atrasoMinutos: r.atrasoMins,
                    motivo: `Atraso reg. almuerzo QR ${locTime} (+${r.atrasoMins} min)`,
                    tipo: 'ATRASO_QR_ALMUERZO',
                  });
                }
              }
            }

            const existingList = (raw?.egresos?.permisosDetalle && Array.isArray(raw.egresos.permisosDetalle))
              ? raw.egresos.permisosDetalle
              : [];

            // Add any QR atrasos not already saved.
            // Match by exact ID OR by fecha+tipo to avoid duplicates when
            // AsistenciaService uses 'qr-atraso-TIMESTAMP' and the modal generates 'qr-ent-ASISTENCIA_ID'.
            const existingIds = new Set(existingList.map(ex => ex.id));
            const existingFechaTipo = new Set(existingList.map(ex => `${ex.fecha}|${ex.tipo}`));
            const missingAtrasos = qrAtrasos.filter(qr =>
              !existingIds.has(qr.id) && !existingFechaTipo.has(`${qr.fecha}|${qr.tipo}`)
            );

            if (missingAtrasos.length > 0) {
              const newList = [...existingList, ...missingAtrasos];
              // permisoHoras now accumulates multa $ values directly
              const totalMultas = newList.reduce((s, r) => s + (r.multaDolares ?? r.horas ?? 0), 0);
              const updated = {
                ...raw,
                permisoHoras: totalMultas,
                egresos: {
                  ...raw.egresos,
                  permisosDetalle: newList
                }
              };
              const saved = await adapter.savePayroll(updated);
              setRecords(saved.egresos?.permisosDetalle || newList);
              if (onUpdate) await onUpdate();
            } else {
              setRecords(existingList);
              // Refresh table even when no new entries — backend may have stale dctoHorasNoLaboradas
              if (onUpdate) onUpdate();
            }
          }
        }
      } catch (err) {
        console.error('Error loading QR asistencias:', err);
      } finally {
        setLoading(false);
      }
    };
    initRecords();
  }, [empleadoId, fechaInicio, fechaFin, raw, adapter, onUpdate]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const parsedHoras = parseFloat(horas);
    if (isNaN(parsedHoras) || parsedHoras <= 0) {
      toast.error('Ingrese una cantidad de horas válida');
      return;
    }
    if (!fecha) {
      toast.error('Seleccione una fecha');
      return;
    }

    const newRecord = {
      id: `manual-${Date.now()}-${Math.random()}`,
      fecha,
      horas: parsedHoras,
      motivo: motivo.trim() || 'Permiso manual',
      tipo: tipo
      // No multaDolares → will use horas * 2.50 formula in calcularNomina
    };

    const newList = [...records, newRecord];
    // Recalculate total: multa $ for QR records, horas formula for manual
    const totalMultas = newList
      .filter(r => !r.eliminado)
      .reduce((s, r) => {
        if (r.multaDolares !== undefined) return s + Number(r.multaDolares);
        const h = Number(r.horas || 0);
        return s + Math.floor(h) * 2.50 + ((h % 1) >= 0.499 ? 1.50 : 0);
      }, 0);

    setSubmitting(true);
    try {
      const updated = {
        ...raw,
        permisoHoras: totalMultas,
        egresos: {
          ...raw.egresos,
          permisosDetalle: newList
        }
      };
      const saved = await adapter.savePayroll(updated);
      setRecords(saved.egresos?.permisosDetalle || newList);
      toast.success('Permiso registrado en la base de datos');
      setMotivo('');
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el permiso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog(
      'Eliminar Registro',
      '¿Está seguro de eliminar este registro?',
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    
    let newList;
    if (String(id).startsWith('qr-')) {
      // Zero out the multa and mark as eliminated for QR records
      newList = records.map(r => r.id === id ? { ...r, horas: 0, multaDolares: 0, eliminado: true } : r);
    } else {
      newList = records.filter(r => r.id !== id);
    }
    // Recalculate total using the mixed formula
    const totalMultas = newList
      .filter(r => !r.eliminado)
      .reduce((s, r) => {
        if (r.multaDolares !== undefined) return s + Number(r.multaDolares);
        const h = Number(r.horas || 0);
        return s + Math.floor(h) * 2.50 + ((h % 1) >= 0.499 ? 1.50 : 0);
      }, 0);

    try {
      const updated = {
        ...raw,
        permisoHoras: totalMultas,
        egresos: {
          ...raw.egresos,
          permisosDetalle: newList
        }
      };
      const saved = await adapter.savePayroll(updated);
      setRecords(saved.egresos?.permisosDetalle || newList);
      toast.success('Registro eliminado');
      if (onUpdate) await onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el registro');
    }
  };

  // Summary calculations
  const visibleRecords = useMemo(() => records.filter(r => !r.eliminado), [records]);

  // QR fine records (ATRASO_QR + ATRASO_QR_ALMUERZO) — values are in $ directly
  const totalAtrasosQR = useMemo(
    () => records.filter(r => (r.tipo === 'ATRASO_QR' || r.tipo === 'ATRASO_QR_ALMUERZO') && !r.eliminado)
      .reduce((s, r) => s + (r.multaDolares ?? r.horas ?? 0), 0),
    [records]
  );

  // Manual permiso records — values are hours to be converted
  const totalPermisosManualHoras = useMemo(
    () => records.filter(r => r.tipo !== 'ATRASO_QR' && r.tipo !== 'ATRASO_QR_ALMUERZO' && !r.eliminado)
      .reduce((s, r) => s + Number(r.horas || 0), 0),
    [records]
  );

  const calcularDescuentoManual = (h) => {
    const hours = Number(h || 0);
    return Math.floor(hours) * 2.50 + ((hours % 1) >= 0.499 ? 1.50 : 0);
  };

  const totalPermisosManualValor = calcularDescuentoManual(totalPermisosManualHoras);

  const totalDescuentoValor = totalAtrasosQR + totalPermisosManualValor;


  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full md:w-[90vw] max-w-5xl h-[620px] mx-4 overflow-hidden border border-slate-200 flex flex-col animate-slide-up animate-duration-200"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Minimalist Header */}
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200/80 flex justify-between items-center relative shrink-0">
          <div>
            <h3 className="text-xs font-extrabold tracking-wider text-slate-800 uppercase flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-violet-650" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Desglose de Permisos y Atrasos
            </h3>
            <p className="text-slate-500 text-[9px] mt-0.5 font-semibold tracking-wide">
              {empleadoNombre} — del {fechaInicio} al {fechaFin}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 p-1.5 rounded-full transition-all cursor-pointer bg-transparent border-0 outline-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col min-h-0 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Multas QR</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{formatUSD(totalAtrasosQR)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Permisos Manuales</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{totalPermisosManualHoras} hs ({formatUSD(totalPermisosManualValor)})</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Registros</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{visibleRecords.length}</span>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center shadow-xs">
              <span className="text-[9px] font-bold text-violet-650 uppercase tracking-wider block">Total Descuento</span>
              <span className="text-sm font-extrabold text-violet-950 mt-1 block">{formatUSD(totalDescuentoValor)}</span>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleAdd} className="shrink-0 space-y-2">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nuevo Registro</h4>
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
                  <option value="PERMISO_PERSONAL">Permiso Personal</option>
                  <option value="PERMISO_MEDICO">Permiso Médico</option>
                  <option value="ATRASO_MANUAL">Atraso Manual</option>
                  <option value="OTROS">Otros</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horas</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1 md:col-span-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Motivo / Detalle</label>
                <input
                  type="text"
                  placeholder="Ej. Cita odontológica"
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
              ) : visibleRecords.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-400 font-medium italic">No hay registros de permisos ni atrasos para este período.</div>
              ) : (
                <table className="min-w-full text-xs divide-y divide-slate-200 table-fixed border-collapse">
                  <thead className="bg-blue-50 text-[10px] font-bold text-blue-900 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="border border-slate-200 px-3 py-1.5 text-left w-32 bg-blue-50">Fecha</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-center w-36 bg-blue-50">Tipo</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-left bg-blue-50">Motivo / Detalle</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-right w-24 bg-blue-50">Horas</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-right w-24 bg-blue-50">Valor</th>
                      <th className="border border-slate-200 px-3 py-1.5 text-center w-20 bg-blue-50">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-xs">
                    {visibleRecords.map((r) => {
                      const isQR = r.tipo === 'ATRASO_QR' || r.tipo === 'ATRASO_QR_ALMUERZO';
                      const valor = isQR
                        ? (r.multaDolares ?? r.horas ?? 0)
                        : calcularDescuentoManual(r.horas);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                          <td className="border border-slate-200 px-3 py-1.5 font-mono text-slate-600 truncate">{r.fecha}</td>
                          <td className="border border-slate-200 px-3 py-1.5 text-center truncate">
                            {r.tipo === 'ATRASO_QR' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[9px] uppercase border border-amber-100">Atraso Entrada</span>
                            ) : r.tipo === 'ATRASO_QR_ALMUERZO' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded-full font-bold text-[9px] uppercase border border-orange-100">Atraso Almuerzo</span>
                            ) : r.tipo === 'ATRASO_MANUAL' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-yellow-50 text-yellow-850 rounded-full font-bold text-[9px] uppercase border border-yellow-100">Atraso Manual</span>
                            ) : r.tipo === 'PERMISO_MEDICO' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[9px] uppercase border border-emerald-100">Permiso Médico</span>
                            ) : r.tipo === 'PERMISO_PERSONAL' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-full font-bold text-[9px] uppercase border border-purple-100">Permiso Personal</span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-50 text-slate-700 rounded-full font-bold text-[9px] uppercase border border-slate-200">Otros</span>
                            )}
                          </td>
                          <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800 truncate" title={r.motivo}>{r.motivo || <span className="text-slate-400 italic">Sin motivo</span>}</td>
                          <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-slate-700">
                            {isQR
                              ? <span className="text-[9px] text-amber-700 font-bold">+{r.atrasoMinutos ?? '?'} min</span>
                              : `${r.horas} hs`}
                          </td>
                          <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-red-650">-{formatUSD(valor)}</td>
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
                      );
                    })}

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
    const confirmed = await confirmDialog(
      '¿Eliminar egreso?',
      '¿Está seguro de eliminar este registro?',
      { type: 'danger', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' }
    );
    if (!confirmed) return;
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full md:w-[90vw] max-w-5xl h-[620px] mx-4 overflow-hidden border border-slate-200 flex flex-col animate-slide-up animate-duration-200"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Minimalist Header */}
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200/80 flex justify-between items-center relative shrink-0">
          <div>
            <h3 className="text-xs font-extrabold tracking-wider text-slate-800 uppercase flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
              </svg>
              Desglose de Egresos
            </h3>
            <p className="text-slate-500 text-[9px] mt-0.5 font-semibold tracking-wide">
              {empleadoNombre} — del {fechaInicio} al {fechaFin}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 p-1.5 rounded-full transition-all cursor-pointer bg-transparent border-0 outline-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col min-h-0 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Anticipos</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{formatUSD(totalAnticipos)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Multas</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{formatUSD(totalMultas)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Otros Descuentos</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{formatUSD(totalOtros)}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center shadow-xs">
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">Total Egresos Varios</span>
              <span className="text-sm font-extrabold text-blue-900 mt-1 block">{formatUSD(totalGeneral)}</span>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="shrink-0 space-y-2">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nuevo Registro</h4>
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
    const confirmed = await confirmDialog(
      '¿Eliminar ingreso?',
      '¿Está seguro de eliminar este registro?',
      { type: 'danger', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' }
    );
    if (!confirmed) return;
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full md:w-[90vw] max-w-5xl h-[620px] mx-4 overflow-hidden border border-slate-200 flex flex-col animate-slide-up animate-duration-200"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Minimalist Header */}
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200/80 flex justify-between items-center relative shrink-0">
          <div>
            <h3 className="text-xs font-extrabold tracking-wider text-slate-800 uppercase flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
              </svg>
              Desglose de Ingresos Adicionales
            </h3>
            <p className="text-slate-500 text-[9px] mt-0.5 font-semibold tracking-wide">
              {empleadoNombre} — del {fechaInicio} al {fechaFin}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 hover:bg-slate-200/50 p-1.5 rounded-full transition-all cursor-pointer bg-transparent border-0 outline-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col min-h-0 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Horas Extras (Módulo)</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{formatUSD(totalHorasExtrasVal)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Trabajo en Empresa</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{formatUSD(totalTrabajosEmpresa)}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-blue-200 transition-all shadow-xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Otros Ingresos</span>
              <span className="text-sm font-bold text-slate-700 mt-1 block">{formatUSD(totalOtrosIngresos)}</span>
            </div>
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-center shadow-xs">
              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">Total Ingresos Var.</span>
              <span className="text-sm font-extrabold text-blue-900 mt-1 block">{formatUSD(totalGeneral)}</span>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="shrink-0 space-y-2">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nuevo Registro (Trab. Empresa / Otros)</h4>
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
  onOpenPermisos,
}) => {
  const pendingHEByEmp = useMemo(
    () => sumPendingHEInRange(pendingOvertime, fechaInicio, fechaFin),
    [pendingOvertime, fechaInicio, fechaFin],
  );

  const totalSueldoDiario = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.sueldoDiario ?? 0), 0),
    [rows],
  );
  const totalDiasLaborables = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.diasLaborables ?? 0), 0),
    [rows],
  );
  const totalTeorico = useMemo(
    () => rows.reduce((s, r) => s + ((r.cp?.sueldoDiario ?? 0) * (r.cp?.diasLaborables ?? 0)), 0),
    [rows],
  );
  const totalDiasTrabajados = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.diasLaborados ?? 0), 0),
    [rows],
  );
  const totalValorPermisoHoras = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.valorPermisoHoras ?? 0), 0),
    [rows],
  );
  const totalSubtotalDias = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.subtotalDias ?? 0), 0),
    [rows],
  );
  const totalDecimoCuarto = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.decimoCuarto ?? 0), 0),
    [rows],
  );
  const totalDecimoTercero = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.decimoTercero ?? 0), 0),
    [rows],
  );
  const totalIESS = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.iess ?? 0), 0),
    [rows],
  );
  const totalSubtotalLiquidacion = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.subtotalLiquidacion ?? 0), 0),
    [rows],
  );
  const totalSumaIngresos = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.sumaIngresos ?? 0), 0),
    [rows],
  );
  const totalSumaEgresos = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.sumaEgresos ?? 0), 0),
    [rows],
  );
  const totalNeto = useMemo(
    () => rows.reduce((s, r) => s + (r.cp?.netoRecibir ?? 0), 0),
    [rows],
  );
  const totalAbonado = useMemo(
    () => rows.reduce((s, r) => s + resolveAbonado(r.cp, r.raw), 0),
    [rows],
  );
  const totalPendiente = useMemo(
    () => rows.reduce((s, r) => s + computePendientePago(r.cp, r.raw, 0), 0),
    [rows],
  );

  return (
    <div className="flex flex-col w-full animate-fade-in">
      <div className="bg-slate-700 text-white text-center py-2.5 font-bold text-xs tracking-wider uppercase shrink-0 rounded-t-xl">
        <span>{label}</span>
      </div>
      <div className="hidden md:block overflow-auto max-h-[520px] relative border-t border-slate-200">
        <table className="min-w-full text-xs border-collapse">
          <thead className="z-30 shadow-xs">
            <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
              <th rowSpan={2} className="border border-slate-200 px-2 py-3.5 text-left bg-slate-100 sticky top-0 left-0 z-40 border-r border-r-slate-300 w-[200px] min-w-[200px]">Colaborador</th>
              <th colSpan={3} className="border border-slate-200 px-2 py-1.5 text-center bg-slate-150 text-slate-650 tracking-wider border-r border-r-slate-300">
                <svg className="w-3.5 h-3.5 mr-1.5 inline-block text-slate-500 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Tarifa Base
              </th>
              <th colSpan={3} className="border border-slate-200 px-2 py-1.5 text-center bg-sky-100 text-sky-800 tracking-wider border-r border-r-slate-300">
                <svg className="w-3.5 h-3.5 mr-1.5 inline-block text-sky-650 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Asistencia / Atrasos
              </th>
              <th colSpan={4} className="border border-slate-200 px-2 py-1.5 text-center bg-purple-100 text-purple-800 tracking-wider border-r border-r-slate-300">
                <svg className="w-3.5 h-3.5 mr-1.5 inline-block text-purple-650 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
                Leyes y Beneficios
              </th>
              <th colSpan={3} className="border border-slate-200 px-2 py-1.5 text-center bg-amber-100 text-amber-800 tracking-wider border-r border-r-slate-300">
                <svg className="w-3.5 h-3.5 mr-1.5 inline-block text-amber-650 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
                Otros Ingresos / Egresos
              </th>
              <th colSpan={2} className="border border-slate-200 px-2 py-1.5 text-center bg-blue-100 text-blue-800 tracking-wider border-r border-r-slate-300">
                <svg className="w-3.5 h-3.5 mr-1.5 inline-block text-blue-650 align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Resultado
              </th>
              <th rowSpan={2} className="border border-slate-200 px-2 py-3 text-center bg-slate-100 sticky top-0 z-30">Estado</th>
              <th rowSpan={2} className="border border-slate-200 px-2 py-3 text-center bg-slate-100 sticky top-0 z-30 w-28">Acción</th>
            </tr>
            <tr className="bg-slate-100 text-[9px] uppercase font-bold text-slate-700 border-b border-slate-200">
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30">Sueldo Diario</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30">Días Lab.</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-200 font-extrabold text-slate-800 sticky top-0 z-30 border-r border-r-slate-300">Total</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30 w-[75px] min-w-[75px]">Días Trab.</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30 w-[75px] min-w-[75px]">Permisos / Horas</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-200 font-extrabold text-slate-850 sticky top-0 z-30 border-r border-r-slate-300">Subtotal Días</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30">Décimo 4to</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30">Décimo 3ro</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30 w-[75px] min-w-[75px]">IESS</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-violet-100 font-extrabold text-violet-900 sticky top-0 z-30 border-r border-r-slate-300">Subtotal</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30">Ingresos</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-100 sticky top-0 z-30">Egresos</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-slate-200 font-extrabold text-slate-800 sticky top-0 z-30 border-r border-r-slate-300">Total neto</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-blue-100 text-blue-950 font-black sticky top-0 z-30">Total a pagar</th>
              <th className="border border-slate-200 px-2 py-1.5 text-center bg-emerald-100 text-emerald-800 font-extrabold sticky top-0 z-30 border-r border-r-slate-300">Abonado</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map(({ emp, cp, raw }, idx) => {
              const hasContract = emp.tieneContrato !== false;
              const contractBadge = hasContract
                ? "bg-blue-50 text-blue-700 border-blue-100"
                : "bg-amber-50 text-amber-700 border-amber-100";
              const contractLabel = hasContract ? "Fijo" : "Eventual";
              
              const sueldo = cp?.sueldoDiario ?? 0;
              const diasLab = cp?.diasLaborables ?? 15;
              const totalTeorico = sueldo * diasLab;
              
              const diasT = cp?.diasLaborados ?? 0;
              const permisoHoras = cp?.permisoHoras ?? 0;
              const valorPermisoHoras = cp?.valorPermisoHoras ?? 0;
              const subtotalDias = cp?.subtotalDias ?? 0;
              const dec4 = cp?.decimoCuarto ?? 0;
              const dec3 = cp?.decimoTercero ?? 0;
              const iessVal = cp?.iess ?? 0;
              const subtotalLiq = cp?.subtotalLiquidacion ?? 0;
              
              const sumaIngresos = cp?.sumaIngresos ?? 0;
              const sumaEgresos = cp?.sumaEgresos ?? 0;
              const netoRecibir = cp?.netoRecibir ?? 0;
              const totalNetoAjustes = sumaIngresos - sumaEgresos;
              
              const totalAb = resolveAbonado(cp, raw);
              const pendientePago = computePendientePago(cp, raw, 0);
              const ep = cp?.estadoPago ?? 'PENDIENTE';
              const badge = ESTADO_BADGE[ep] ?? ESTADO_BADGE.PENDIENTE;

              const stickyBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

              return (
                <tr key={emp.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-slate-100/30 transition-colors group`}>
                  {/* Colaborador */}
                  <td className={`border border-slate-200 px-3 py-2 w-[200px] min-w-[200px] sticky left-0 z-10 ${stickyBg} group-hover:bg-slate-100 border-r-2 border-r-slate-300`}>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 uppercase text-xs truncate" title={emp.nombre}>
                        {emp.nombre}
                      </span>
                      <span className={`inline-flex w-fit px-1.5 py-0.5 rounded text-[9px] font-bold border mt-1 ${contractBadge}`}>
                        {contractLabel}
                      </span>
                    </div>
                  </td>

                  {/* Sueldo Diario */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-slate-700 font-semibold text-xs">
                    {formatUSD(sueldo)}
                  </td>

                  {/* Días Lab. */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-slate-600 font-semibold text-xs">
                    {diasLab}
                  </td>

                  {/* Total Teórico */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-slate-700 font-bold text-xs bg-slate-100/50 border-r border-r-slate-300">
                    {formatUSD(totalTeorico)}
                  </td>

                  {/* Días Trab. (No editable, viene del QR) */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-slate-700 font-semibold text-xs bg-slate-50/10">
                    {diasT}
                  </td>

                  {/* Permisos Horas (Clickable, abre modal) */}
                  <td
                    className="border border-slate-200 text-center px-2 py-2 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-100 transition-colors group/cell"
                    onClick={() => onOpenPermisos(emp, raw)}
                    title="Haga clic para gestionar permisos de horas"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{formatUSD(valorPermisoHoras)}</span>
                      <span className="text-[10px] text-blue-600 font-black opacity-0 group-hover/cell:opacity-100 transition-opacity">
                        [+]
                      </span>
                    </div>
                  </td>

                  {/* Subtotal Días */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-slate-800 font-extrabold text-xs bg-slate-200/25 border-r border-r-slate-300">
                    {formatUSD(subtotalDias)}
                  </td>

                  {/* Décimo 4to */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-violet-900 font-semibold text-xs bg-violet-50/10">
                    {dec4 > 0 ? formatUSD(dec4) : '—'}
                  </td>

                  {/* Décimo 3ro */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-violet-900 font-semibold text-xs bg-violet-50/10">
                    {dec3 > 0 ? formatUSD(dec3) : '—'}
                  </td>

                  {/* IESS (Editable) */}
                  <td className="border border-slate-200 text-center px-1 py-1 bg-red-50/5">
                    <CellInput 
                      value={raw?.egresos?.iess ?? ''} 
                      onChange={val => onCellChange(emp.id, 'egresos.iess', val)} 
                      placeholder={String(iessVal)} 
                      disabled={!hasContract}
                    />
                  </td>

                  {/* Subtotal */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-violet-950 font-extrabold text-xs bg-violet-100/20 border-r border-r-slate-300">
                    {formatUSD(subtotalLiq)}
                  </td>

                  {/* Ingresos (Clickable) */}
                  <td
                    className="border border-slate-200 text-center px-2 py-2 text-green-700 font-bold text-xs cursor-pointer hover:bg-green-50/50 transition-colors group/cell"
                    onClick={() => onOpenIngresos(emp.id, emp.nombre)}
                    title="Haga clic para editar ingresos"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>+{formatUSD(sumaIngresos)}</span>
                      <span className="text-[10px] text-green-700 font-black opacity-0 group-hover/cell:opacity-100 transition-opacity">
                        [+]
                      </span>
                    </div>
                  </td>

                  {/* Egresos (Clickable) */}
                  <td
                    className="border border-slate-200 text-center px-2 py-2 text-red-650 font-bold text-xs cursor-pointer hover:bg-red-50/50 transition-colors group/cell"
                    onClick={() => onOpenEgresos(emp.id, emp.nombre)}
                    title="Haga clic para editar egresos"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>-{formatUSD(sumaEgresos)}</span>
                      <span className="text-[10px] text-red-600 font-black opacity-0 group-hover/cell:opacity-100 transition-opacity">
                        [+]
                      </span>
                    </div>
                  </td>

                  {/* Total neto (Ajustes) */}
                  <td className={`border border-slate-200 text-center px-2 py-2 font-bold text-xs bg-slate-50/50 border-r border-r-slate-300 ${totalNetoAjustes > 0 ? 'text-green-700' : totalNetoAjustes < 0 ? 'text-red-650' : 'text-slate-500'}`}>
                    {totalNetoAjustes > 0 ? '+' : ''}{formatUSD(totalNetoAjustes)}
                  </td>

                  {/* Total Pagar */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-blue-950 font-black text-sm bg-blue-100/80">
                    {formatUSD(netoRecibir)}
                  </td>

                  {/* Abonado */}
                  <td className="border border-slate-200 text-center px-2 py-2 text-emerald-800 font-extrabold text-xs bg-emerald-50/60 border-r border-r-slate-300">
                    {formatUSD(totalAb)}
                  </td>

                  {/* Estado */}
                  <td className="border border-slate-200 text-center px-2 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="border border-slate-200 text-center px-2 py-1.5">
                    <div className="flex justify-center items-center">
                      {ep === 'PAGADO' ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wider border ${badge.cls} w-full justify-center`}>
                          Liquidada
                        </span>
                      ) : (
                        <button onClick={() => onPagar(emp, cp, netoRecibir, pendientePago, quincenaNum)}
                          className="w-full py-1 rounded-lg bg-slate-800 text-white font-bold text-[9px] uppercase tracking-wider hover:bg-slate-700 shadow-xs transition-all cursor-pointer border-0">
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
              <td className="border border-slate-200 px-3 py-2.5 text-slate-700 uppercase tracking-widest sticky left-0 z-45 bg-slate-100 border-r-2 border-r-slate-300 w-[200px] min-w-[200px]">
                <span>TOTALES</span>
              </td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-700 text-xs bg-slate-100">{formatUSD(totalSueldoDiario)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-700 text-xs bg-slate-100">{totalDiasLaborables}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-800 font-extrabold text-xs bg-slate-200/55 border-r border-r-slate-300">{formatUSD(totalTeorico)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-700 text-xs bg-slate-100">{totalDiasTrabajados}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-700 text-xs bg-slate-100">{formatUSD(totalValorPermisoHoras)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-850 font-extrabold text-xs bg-slate-200/75 border-r border-r-slate-300">{formatUSD(totalSubtotalDias)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-violet-850 text-xs bg-violet-100/40">{formatUSD(totalDecimoCuarto)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-violet-850 text-xs bg-violet-100/40">{formatUSD(totalDecimoTercero)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-slate-700 text-xs bg-slate-100">{formatUSD(totalIESS)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-violet-100 text-violet-950 font-black text-xs border-r border-r-slate-300">{formatUSD(totalSubtotalLiquidacion)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-green-700 text-xs bg-green-100/40">+{formatUSD(totalSumaIngresos)}</td>
              <td className="border border-slate-200 text-center px-1 py-2.5 text-red-700 text-xs bg-red-100/40">-{formatUSD(totalSumaEgresos)}</td>
              <td className={`border border-slate-200 text-center px-1 py-2.5 font-bold text-xs bg-slate-100 border-r border-r-slate-300 ${(totalSumaIngresos - totalSumaEgresos) > 0 ? 'text-green-700' : (totalSumaIngresos - totalSumaEgresos) < 0 ? 'text-red-700' : 'text-slate-600'}`}>
                {(totalSumaIngresos - totalSumaEgresos) > 0 ? '+' : ''}{formatUSD(totalSumaIngresos - totalSumaEgresos)}
              </td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-blue-100 text-blue-950 font-black text-xs">{formatUSD(totalNeto)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-emerald-100 text-emerald-800 font-black text-xs border-r border-r-slate-300">{formatUSD(totalAbonado)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 bg-orange-150 text-orange-850 font-extrabold text-xs">{formatUSD(totalPendiente)}</td>
              <td className="border border-slate-200 text-center px-2 py-2.5 text-slate-400 bg-slate-100">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Móvil: una card por colaborador */}
      <div className="md:hidden border-t border-slate-200 p-3 space-y-3 max-h-[70vh] overflow-y-auto bg-slate-50/40">
        {rows.map(({ emp, cp, raw }, idx) => {
          const hasContract = emp.tieneContrato !== false;
          
          const sueldo = cp?.sueldoDiario ?? 0;
          const diasLab = cp?.diasLaborables ?? 15;
          const totalTeorico = sueldo * diasLab;
          
          const diasT = cp?.diasLaborados ?? 0;
          const valorPermisoHoras = cp?.valorPermisoHoras ?? 0;
          const subtotalDias = cp?.subtotalDias ?? 0;
          const dec4 = cp?.decimoCuarto ?? 0;
          const dec3 = cp?.decimoTercero ?? 0;
          const iessVal = cp?.iess ?? 0;
          const subtotalLiq = cp?.subtotalLiquidacion ?? 0;
          
          const sumaIngresos = cp?.sumaIngresos ?? 0;
          const sumaEgresos = cp?.sumaEgresos ?? 0;
          const netoRecibir = cp?.netoRecibir ?? 0;
          
          const totalAb = resolveAbonado(cp, raw);
          const pendientePago = computePendientePago(cp, raw, 0);
          const ep = cp?.estadoPago ?? 'PENDIENTE';
          const badge = ESTADO_BADGE[ep] ?? ESTADO_BADGE.PENDIENTE;

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
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {hasContract ? 'Fijo' : 'Eventual'}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-bold text-[9px] uppercase border shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                <div>
                  <span className="text-slate-400 font-semibold block">Sueldo Diario</span>
                  <span className="font-bold text-slate-800">{formatUSD(sueldo)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Días Lab.</span>
                  <span className="font-bold text-slate-800">{diasLab}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Total Teórico</span>
                  <span className="font-bold text-slate-800">{formatUSD(totalTeorico)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Días Trab.</span>
                  <span className="font-bold text-slate-800">{diasT}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Permisos Horas</span>
                  <span
                    onClick={() => onOpenPermisos(emp, raw)}
                    className="font-bold text-blue-900 cursor-pointer underline hover:text-blue-800"
                  >
                    {formatUSD(valorPermisoHoras)} [+]
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Subtotal Días</span>
                  <span className="font-bold text-slate-800">{formatUSD(subtotalDias)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Décimo 4to</span>
                  <span className="font-bold text-slate-800">{dec4 > 0 ? formatUSD(dec4) : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Décimo 3ro</span>
                  <span className="font-bold text-slate-800">{dec3 > 0 ? formatUSD(dec3) : '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">IESS Override</span>
                  <CellInput 
                    value={raw?.egresos?.iess ?? ''} 
                    onChange={val => onCellChange(emp.id, 'egresos.iess', val)} 
                    placeholder={String(iessVal)} 
                    disabled={!hasContract}
                  />
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Subtotal</span>
                  <span className="font-bold text-blue-900">{formatUSD(subtotalLiq)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Ingresos Var</span>
                  <span className="font-bold text-green-700">+{formatUSD(sumaIngresos)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Egresos Var</span>
                  <span className="font-bold text-red-700">-{formatUSD(sumaEgresos)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Total a Pagar</span>
                  <span className="font-black text-blue-900">{formatUSD(netoRecibir)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Abonado</span>
                  <span className="font-bold text-green-700">{formatUSD(totalAb)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Pendiente</span>
                  <span className="font-bold text-orange-700">{pendientePago > 0 ? formatUSD(pendientePago) : '—'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenPermisos(emp, raw)}
                  className="flex-1 min-w-[70px] py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 text-[10px] font-bold cursor-pointer"
                >
                  Permisos
                </button>
                <button
                  type="button"
                  onClick={() => onOpenIngresos(emp.id, emp.nombre)}
                  className="flex-1 min-w-[70px] py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold cursor-pointer"
                >
                  Ingresos
                </button>
                <button
                  type="button"
                  onClick={() => onOpenEgresos(emp.id, emp.nombre)}
                  className="flex-1 min-w-[70px] py-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-[10px] font-bold cursor-pointer"
                >
                  Egresos
                </button>
                {ep !== 'PAGADO' && (
                  <button
                    type="button"
                    onClick={() => onPagar(emp, cp, netoRecibir, pendientePago, quincenaNum)}
                    className="flex-1 min-w-[80px] py-2 rounded-lg bg-slate-800 text-white text-[10px] font-bold uppercase cursor-pointer"
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
  // Selecciona automáticamente la quincena activa según el día del mes actual:
  // días 1-15 → primera quincena, días 16-fin → segunda quincena.
  // Solo aplica para el mes/año actuales; cambiar de mes siempre arranca en q1.
  const [activeTab, setActiveTab] = useState(() => {
    const hoy = new Date();
    return hoy.getDate() >= 16 ? 'q2' : 'q1';
  });
  
  const [activeEgresoModal, setActiveEgresoModal] = useState(null);
  const [activeIngresoModal, setActiveIngresoModal] = useState(null);
  const [activePermisoModal, setActivePermisoModal] = useState(null);
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

  const handleOpenPermisos = (emp, raw) => {
    const dates = activeTab === 'q1' ? fechas1 : fechas2;
    setActivePermisoModal({
      emp,
      fechaInicio: dates.fechaInicio,
      fechaFin: dates.fechaFin,
      raw
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

      // Normaliza permisoHoras desde permisosDetalle para garantizar que
      // calcularNomina siempre tenga el valor correcto en la primera carga,
      // independientemente de si el campo en DB estaba desactualizado.
      const normalizeRaw = (raw) => raw.map(r => {
        const egresosObj = typeof r.egresos === 'string'
          ? (() => { try { return JSON.parse(r.egresos); } catch { return {}; } })()
          : (r.egresos || {});
        const detalle = egresosObj?.permisosDetalle;
        if (!Array.isArray(detalle) || detalle.length === 0) return { ...r, egresos: egresosObj };
        const total = detalle
          .filter(d => !d.eliminado)
          .reduce((s, d) => {
            if (d.multaDolares !== undefined) return s + Number(d.multaDolares);
            const h = Number(d.horas || 0);
            return s + Math.floor(h) * 2.50 + ((h % 1) >= 0.499 ? 1.50 : 0);
          }, 0);
        return { ...r, permisoHoras: total, egresos: egresosObj };
      });

      setQ1Raw(normalizeRaw(p1));
      setQ2Raw(normalizeRaw(p2));
      setPendingOvertime(Array.isArray(pending) ? pending : []);
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
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const handleMesSiguiente = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleCellChange = async (empId, fieldPath, value) => {
    const isQ1 = activeTab === 'q1';
    const rawArr = isQ1 ? q1Raw : q2Raw;
    const setter = isQ1 ? setQ1Raw : setQ2Raw;

    const record = rawArr.find(p => p.empleadoId === empId);
    if (!record) return;

    const updated = { ...record };
    const parts = fieldPath.split('.');
    if (parts.length === 1) {
      updated[parts[0]] = value;
    } else if (parts.length === 2) {
      updated[parts[0]] = {
        ...updated[parts[0]],
        [parts[1]]: value
      };
    }

    try {
      const saved = await adapter.savePayroll(updated);
      setter(prev => prev.map(p => p.empleadoId === empId ? saved : p));
      await loadAll();
    } catch (err) {
      console.error('Error saving cell change:', err);
      toast.error('Error al guardar cambios de nómina');
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

  const pagarQuincena = async (rawArr, setter, fechas, empId, monto, fecha, subtotal, metodoPagoId, comprobanteUrl) => {
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

      const actualizada = registrarAbono(nomina, { monto, fecha, metodoPagoId, usuarioNombre, fechaHora, comprobanteUrl });
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

  const handleConfirmPago = async (metodoPagoId, comprobanteUrl) => {
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
        await pagarQuincena(arr, set, fec, empId, payTarget.monto, hoy, sub, metodoPagoId, comprobanteUrl);
      } else {
        if (payTarget.quincenaOrigen === 2) {
          await pagarQuincena(q2Raw, setQ2Raw, fechas2, empId, payTarget.monto, hoy, subQ2, metodoPagoId, comprobanteUrl);
        } else {
          await pagarQuincena(q1Raw, setQ1Raw, fechas1, empId, payTarget.monto, hoy, subQ1, metodoPagoId, comprobanteUrl);
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
            Nómina dividida en primera y segunda quincena. Los cambios se guardan automáticamente al instante.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">

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
          onClick={() => setActiveTab('q1')}
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
          onClick={() => setActiveTab('q2')}
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
          onOpenPermisos={handleOpenPermisos}
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

      {activePermisoModal ? (
        <ModalPortal>
          <DetallePermisosModal
            emp={activePermisoModal.emp}
            fechaInicio={activePermisoModal.fechaInicio}
            fechaFin={activePermisoModal.fechaFin}
            raw={activePermisoModal.raw}
            adapter={adapter}
            onClose={() => deferClose(() => setActivePermisoModal(null))}
            onUpdate={loadAll}
          />
        </ModalPortal>
      ) : null}
    </div>
  );
};
