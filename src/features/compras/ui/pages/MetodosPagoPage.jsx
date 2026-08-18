import React, { useEffect, useState, useCallback } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import {
  getMetodosPago, createMetodoPago, updateMetodoPago, deleteMetodoPago
} from '../../application/comprasService';
import {
  createIngresoCaja, createTransferencia
} from '../../../gastos/application/movimientosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal.jsx';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { ComprasPageHeader, ComprasHeaderButton } from '../components/ComprasPageHeader';
import './ComprasPage.css';

const getInitialRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;

  // Last day of current month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { start, end };
};

const formatUSD = (val) => {
  if (val === undefined || val === null) return '$0,00';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(val);
};

const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const MetodosPagoPage = () => {
  const [metodos, setMetodos] = useState([]);
  const [metodosLoading, setMetodosLoading] = useState(true);
  const [metodoFormOpen, setMetodoFormOpen] = useState(false);
  const [editingMetodo, setEditingMetodo] = useState(null);
  const [dateRange, setDateRange] = useState(getInitialRange());
  const [metodoForm, setMetodoForm] = useState({ nombre: '', descripcion: '', tipo: 'EFECTIVO' });
  const [metodoSaving, setMetodoSaving] = useState(false);

  const [ingresoFormOpen, setIngresoFormOpen] = useState(false);
  const [ingresoForm, setIngresoForm] = useState({ concepto: '', categoria: 'Otros', fecha: getTodayStr(), monto: '', cliente: '', notas: '', metodoPagoId: '' });
  const [ingresoSaving, setIngresoSaving] = useState(false);

  const [transferenciaFormOpen, setTransferenciaFormOpen] = useState(false);
  const [transferenciaForm, setTransferenciaForm] = useState({ origenMetodoId: '', destinoMetodoId: '', monto: '', fecha: getTodayStr(), referencia: '' });
  const [transferenciaSaving, setTransferenciaSaving] = useState(false);

  const loadMetodos = useCallback(async () => {
    setMetodosLoading(true);
    try {
      const m = await getMetodosPago(dateRange.start, dateRange.end);
      setMetodos(m);
    } catch {
      setMetodos([]);
    } finally {
      setMetodosLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    loadMetodos();
  }, [loadMetodos]);

  const openNewMetodo = () => {
    setEditingMetodo(null);
    setMetodoForm({ nombre: '', descripcion: '', tipo: 'EFECTIVO' });
    setMetodoFormOpen(true);
  };

  const openEditMetodo = (m) => {
    setEditingMetodo(m);
    setMetodoForm({ nombre: m.nombre, descripcion: m.descripcion || '', tipo: m.tipo || 'EFECTIVO' });
    setMetodoFormOpen(true);
  };

  const handleMetodoSave = async (e) => {
    e.preventDefault();
    setMetodoSaving(true);
    try {
      if (editingMetodo) {
        await updateMetodoPago(editingMetodo.id, metodoForm);
        toast.success('Método de pago actualizado con éxito');
      } else {
        await createMetodoPago(metodoForm);
        toast.success('Método de pago creado con éxito');
      }
      setMetodoFormOpen(false);
      loadMetodos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMetodoSaving(false);
    }
  };

  const handleMetodoDelete = async (id) => {
    const confirmed = await confirmDialog(
      '¿Eliminar método de pago?',
      '¿Está seguro de que desea eliminar este método de pago?',
      { type: 'danger', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' }
    );
    if (!confirmed) return;
    try {
      await deleteMetodoPago(id);
      loadMetodos();
      toast.success('Método de pago eliminado con éxito');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMetodoToggle = async (m) => {
    try {
      await updateMetodoPago(m.id, { activo: !m.activo });
      loadMetodos();
      toast.success(`Método de pago ${!m.activo ? 'activado' : 'desactivado'} con éxito`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openNewIngreso = () => {
    const firstActive = metodos.find(m => m.activo)?.id || '';
    setIngresoForm({
      concepto: '',
      categoria: 'Otros',
      fecha: getTodayStr(),
      monto: '',
      cliente: '',
      notas: '',
      metodoPagoId: firstActive
    });
    setIngresoFormOpen(true);
  };

  const openNewTransferencia = () => {
    const activeMethods = metodos.filter(m => m.activo);
    const origin = activeMethods[0]?.id || '';
    const dest = activeMethods[1]?.id || '';
    setTransferenciaForm({
      origenMetodoId: origin,
      destinoMetodoId: dest,
      monto: '',
      fecha: getTodayStr(),
      referencia: ''
    });
    setTransferenciaFormOpen(true);
  };

  const handleIngresoSave = async (e) => {
    e.preventDefault();
    if (!ingresoForm.concepto || !ingresoForm.monto || !ingresoForm.metodoPagoId) {
      toast.error('Por favor complete los campos obligatorios');
      return;
    }

    const confirmed = await confirmDialog(
      'Registrar Ingreso Manual',
      '¿Está seguro de que desea registrar este ingreso manual?',
      { confirmText: 'Registrar', cancelText: 'Cancelar' }
    );
    if (!confirmed) return;

    setIngresoSaving(true);
    try {
      await createIngresoCaja({
        ...ingresoForm,
        monto: Number(ingresoForm.monto)
      });
      setIngresoFormOpen(false);
      loadMetodos();
      toast.success('Ingreso registrado con éxito');
    } catch (err) {
      toast.error(err.message || 'Error al registrar ingreso');
    } finally {
      setIngresoSaving(false);
    }
  };

  const handleTransferenciaSave = async (e) => {
    e.preventDefault();
    if (!transferenciaForm.origenMetodoId || !transferenciaForm.destinoMetodoId || !transferenciaForm.monto) {
      toast.error('Por favor complete los campos obligatorios');
      return;
    }
    if (transferenciaForm.origenMetodoId === transferenciaForm.destinoMetodoId) {
      toast.error('La cuenta de origen y destino deben ser diferentes');
      return;
    }

    const confirmed = await confirmDialog(
      'Realizar Transferencia',
      '¿Está seguro de que desea transferir estos fondos?',
      { confirmText: 'Transferir', cancelText: 'Cancelar' }
    );
    if (!confirmed) return;

    setTransferenciaSaving(true);
    try {
      await createTransferencia({
        ...transferenciaForm,
        monto: Number(transferenciaForm.monto)
      });
      setTransferenciaFormOpen(false);
      loadMetodos();
      toast.success('Transferencia realizada con éxito');
    } catch (err) {
      toast.error(err.message || 'Error al realizar transferencia');
    } finally {
      setTransferenciaSaving(false);
    }
  };

  // Cumulative Calculations (Active only)
  const totalEfectivo = metodos
    .filter(m => m.activo && m.tipo === 'EFECTIVO')
    .reduce((sum, m) => sum + (m.saldoActual || 0), 0);

  const totalBanco = metodos
    .filter(m => m.activo && m.tipo === 'BANCO')
    .reduce((sum, m) => sum + (m.saldoActual || 0), 0);

  const totalGeneral = totalEfectivo + totalBanco;

  // Period Calculations (Active only)
  const ingresosPeriodo = metodos
    .filter(m => m.activo)
    .reduce((sum, m) => sum + (m.ingresosPeriod || 0), 0);

  const egresosPeriodo = metodos
    .filter(m => m.activo)
    .reduce((sum, m) => sum + (m.egresosPeriod || 0), 0);

  const balancePeriodo = ingresosPeriodo - egresosPeriodo;

  return (
    <div className="co-page animate-slide-up metodos-pago-page" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .metodos-pago-page, .metodos-pago-page * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
        .metodos-pago-page .font-mono, .metodos-pago-modal .font-mono {
          font-family: var(--font-mono, 'JetBrains Mono', monospace) !important;
        }
        @keyframes modal-in {
          from { transform: scale(0.97) translateY(8px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-in { animation: modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @media (min-width: 768px) {
          .mp-desktop-table { display: block; }
          .mp-mobile-cards { display: none; }
        }
        @media (max-width: 767px) {
          .mp-desktop-table { display: none; }
          .mp-mobile-cards { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
        }
      `}</style>

      <ComprasPageHeader
        title="Métodos de Pago"
        subtitle="Administración de canales de cobro y pago (Caja Chica, Banco, etc.)"
        action={(
          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              onClick={openNewIngreso}
              id="btn-nuevo-ingreso"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer border-none"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo Ingreso
            </button>
            <button
              type="button"
              onClick={openNewTransferencia}
              id="btn-nueva-transferencia"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer border-none"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Transferir
            </button>
            <button
              type="button"
              onClick={openNewMetodo}
              id="btn-nuevo-metodo"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0b2d64] hover:bg-[#071f45] active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer border-none"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo Método
            </button>
          </div>
        )}
      />

      {/* KPI Cards (Acumulados) - 1 fila de 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {/* Total Efectivo */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Efectivo</div>
            <div className="font-mono text-xl sm:text-2xl font-black text-emerald-600 tracking-tight mt-0.5">{formatUSD(totalEfectivo)}</div>
            <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">Efectivo en caja chica y física</div>
          </div>
        </div>

        {/* Total Banco */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Banco</div>
            <div className="font-mono text-xl sm:text-2xl font-black text-blue-600 tracking-tight mt-0.5">{formatUSD(totalBanco)}</div>
            <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">Cuentas bancarias activas</div>
          </div>
        </div>

        {/* Total General */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total General</div>
            <div className="font-mono text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-0.5">{formatUSD(totalGeneral)}</div>
            <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">Saldo consolidado total</div>
          </div>
        </div>
      </div>

      {/* Filter and Period Stats Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 mb-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rango de Fechas</div>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-full sm:w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Ingresos Periodo</div>
            <div className="font-mono text-base sm:text-lg font-extrabold text-emerald-600">
              {ingresosPeriodo > 0 ? `+${formatUSD(ingresosPeriodo)}` : formatUSD(ingresosPeriodo)}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Egresos Periodo</div>
            <div className="font-mono text-base sm:text-lg font-extrabold text-rose-500">
              {egresosPeriodo > 0 ? `-${formatUSD(egresosPeriodo)}` : formatUSD(egresosPeriodo)}
            </div>
          </div>
          <div className="text-left sm:text-right sm:border-l sm:border-slate-200/80 sm:pl-8">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">Balance Periodo</div>
            <div className="font-mono text-base sm:text-lg font-black text-slate-800">
              {formatUSD(balancePeriodo)}
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-800">Detalle de Cuentas</h2>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
              {metodos.length} {metodos.length === 1 ? 'cuenta' : 'cuentas'}
            </span>
          </div>
        </div>
        {metodosLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-[#0b2d64] mb-3" />
            <p className="text-xs text-slate-400 font-semibold">Cargando métodos de pago...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto mp-desktop-table">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nombre</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Saldo Actual</th>
                    <th className="py-3.5 px-4 text-emerald-600">Ingresos (P)</th>
                    <th className="py-3.5 px-4 text-rose-500">Egresos (P)</th>
                    <th className="py-3.5 px-4">Neto (P)</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {metodos.map(m => {
                    const isEfectivo = m.tipo === 'EFECTIVO';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-800 text-sm">{m.nombre}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isEfectivo 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200/70'
                          }`}>
                            {m.tipo || 'EFECTIVO'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-sm">{formatUSD(m.saldoActual)}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 text-sm">
                          {m.ingresosPeriod > 0 ? `+${formatUSD(m.ingresosPeriod)}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-500 text-sm">
                          {m.egresosPeriod > 0 ? `-${formatUSD(m.egresosPeriod)}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-700 text-sm">{formatUSD(m.netoPeriod)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleMetodoToggle(m)}
                            className={`w-10 h-6 inline-flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                              m.activo ? 'bg-[#0b2d64]' : 'bg-slate-200'
                            }`}
                            title={m.activo ? 'Desactivar' : 'Activar'}
                          >
                            <span className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              m.activo ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditMetodo(m)}
                              className="p-2 rounded-xl text-blue-600 bg-blue-50/80 border border-blue-200/60 hover:bg-blue-100 shadow-2xs transition-all cursor-pointer"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMetodoDelete(m.id)}
                              className="p-2 rounded-xl text-rose-600 bg-rose-50/80 border border-rose-200/60 hover:bg-rose-100 shadow-2xs transition-all cursor-pointer"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {metodos.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400 text-sm font-medium">
                        No hay métodos de pago registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mp-mobile-cards">
              {metodos.map(m => {
                const isEfectivo = m.tipo === 'EFECTIVO';
                return (
                  <div key={m.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">{m.nombre}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isEfectivo 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200/70'
                      }`}>
                        {m.tipo || 'EFECTIVO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-xs pt-1 border-t border-slate-100/80">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Saldo Actual</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{formatUSD(m.saldoActual)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Neto Periodo</span>
                        <span className="font-mono font-black text-slate-700 text-sm">{formatUSD(m.netoPeriod)}</span>
                      </div>
                      <div className="text-emerald-600">
                        <span className="text-[10px] text-emerald-600 font-bold uppercase block">Ingresos (P)</span>
                        <span className="font-mono font-bold">{m.ingresosPeriod > 0 ? `+${formatUSD(m.ingresosPeriod)}` : '—'}</span>
                      </div>
                      <div className="text-rose-500">
                        <span className="text-[10px] text-rose-500 font-bold uppercase block">Egresos (P)</span>
                        <span className="font-mono font-bold">{m.egresosPeriod > 0 ? `-${formatUSD(m.egresosPeriod)}` : '—'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-bold uppercase">Estado:</span>
                        <button
                          type="button"
                          onClick={() => handleMetodoToggle(m)}
                          className={`w-10 h-6 inline-flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                            m.activo ? 'bg-[#0b2d64]' : 'bg-slate-200'
                          }`}
                          title={m.activo ? 'Desactivar' : 'Activar'}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            m.activo ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditMetodo(m)}
                          className="p-2 rounded-xl text-blue-600 bg-blue-50/80 border border-blue-200/60 hover:bg-blue-100 shadow-2xs transition-all cursor-pointer"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMetodoDelete(m.id)}
                          className="p-2 rounded-xl text-rose-600 bg-rose-50/80 border border-rose-200/60 hover:bg-rose-100 shadow-2xs transition-all cursor-pointer"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {metodos.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm font-medium">
                  No hay métodos de pago registrados
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* New/Edit Modal */}
      {metodoFormOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs metodos-pago-modal">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full flex flex-col overflow-hidden animate-modal-in">
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{editingMetodo ? 'Editar Método' : 'Nuevo Método de Pago'}</h2>
                <button
                  type="button"
                  onClick={() => setMetodoFormOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleMetodoSave} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Nombre *</label>
                    <input
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={metodoForm.nombre}
                      placeholder="Ej: Caja Chica, Diego Guayaquil 6357, Transferencia…"
                      onChange={e => setMetodoForm(p => ({ ...p, nombre: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Tipo de Cuenta *</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={metodoForm.tipo}
                      onChange={e => setMetodoForm(p => ({ ...p, tipo: e.target.value }))}
                    >
                      <option value="EFECTIVO">EFECTIVO (Caja Principal, Caja Chica, etc.)</option>
                      <option value="BANCO">BANCO (Cuentas bancarias, Transferencia, etc.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Descripción</label>
                    <input
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={metodoForm.descripcion}
                      placeholder="Opcional"
                      onChange={e => setMetodoForm(p => ({ ...p, descripcion: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setMetodoFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white border border-slate-200 shadow-2xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={metodoSaving}
                      className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0b2d64] hover:bg-[#071f45] active:scale-[0.99] transition-all shadow-xs cursor-pointer border-none inline-flex items-center gap-2"
                    >
                      {metodoSaving && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
                      {editingMetodo ? 'Guardar Cambios' : 'Crear Método'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Ingreso Modal */}
      {ingresoFormOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs metodos-pago-modal">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full flex flex-col overflow-hidden animate-modal-in">
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Registrar Ingreso Manual</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIngresoFormOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleIngresoSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Monto ($) *</label>
                      <input
                        type="number"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all"
                        value={ingresoForm.monto}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        onChange={e => setIngresoForm(p => ({ ...p, monto: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Fecha *</label>
                      <input
                        type="date"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        value={ingresoForm.fecha}
                        onChange={e => setIngresoForm(p => ({ ...p, fecha: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Cuenta de Depósito *</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={ingresoForm.metodoPagoId}
                      onChange={e => setIngresoForm(p => ({ ...p, metodoPagoId: e.target.value }))}
                      required
                    >
                      <option value="" disabled>Seleccione cuenta...</option>
                      {metodos.filter(m => m.activo).map(m => (
                        <option key={m.id} value={m.id}>{m.nombre} ({formatUSD(m.saldoActual)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Concepto / Motivo *</label>
                    <input
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={ingresoForm.concepto}
                      placeholder="Ej: Venta de desperdicio, Intereses, etc."
                      onChange={e => setIngresoForm(p => ({ ...p, concepto: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Cliente (Opcional)</label>
                      <input
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        value={ingresoForm.cliente}
                        placeholder="Nombre del cliente"
                        onChange={e => setIngresoForm(p => ({ ...p, cliente: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Categoría (Opcional)</label>
                      <input
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        value={ingresoForm.categoria}
                        placeholder="Ej: Varios, Reembolso"
                        onChange={e => setIngresoForm(p => ({ ...p, categoria: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Notas / Observaciones</label>
                    <textarea
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all h-20 resize-none"
                      value={ingresoForm.notas}
                      placeholder="Detalles adicionales..."
                      onChange={e => setIngresoForm(p => ({ ...p, notas: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIngresoFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white border border-slate-200 shadow-2xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={ingresoSaving}
                      className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-xs cursor-pointer border-none inline-flex items-center gap-2"
                    >
                      {ingresoSaving && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
                      Registrar Ingreso
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Transferencia Modal */}
      {transferenciaFormOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs metodos-pago-modal">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full flex flex-col overflow-hidden animate-modal-in">
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Transferencia entre Cuentas</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setTransferenciaFormOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleTransferenciaSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Monto ($) *</label>
                      <input
                        type="number"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        value={transferenciaForm.monto}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        onChange={e => setTransferenciaForm(p => ({ ...p, monto: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Fecha *</label>
                      <input
                        type="date"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        value={transferenciaForm.fecha}
                        onChange={e => setTransferenciaForm(p => ({ ...p, fecha: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Cuenta Origen (Sale fondos) *</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={transferenciaForm.origenMetodoId}
                      onChange={e => setTransferenciaForm(p => ({ ...p, origenMetodoId: e.target.value }))}
                      required
                    >
                      <option value="" disabled>Seleccione cuenta de origen...</option>
                      {metodos.filter(m => m.activo).map(m => (
                        <option key={m.id} value={m.id}>{m.nombre} ({formatUSD(m.saldoActual)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Cuenta Destino (Ingresa fondos) *</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={transferenciaForm.destinoMetodoId}
                      onChange={e => setTransferenciaForm(p => ({ ...p, destinoMetodoId: e.target.value }))}
                      required
                    >
                      <option value="" disabled>Seleccione cuenta de destino...</option>
                      {metodos.filter(m => m.activo).map(m => (
                        <option key={m.id} value={m.id} disabled={m.id === transferenciaForm.origenMetodoId}>
                          {m.nombre} ({formatUSD(m.saldoActual)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Referencia / Notas</label>
                    <input
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      value={transferenciaForm.referencia}
                      placeholder="Ej: Retiro para caja chica, Depósito…"
                      onChange={e => setTransferenciaForm(p => ({ ...p, referencia: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setTransferenciaFormOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-white border border-slate-200 shadow-2xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={transferenciaSaving}
                      className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-xs cursor-pointer border-none inline-flex items-center gap-2"
                    >
                      {transferenciaSaving && <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
                      Transferir Fondos
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
