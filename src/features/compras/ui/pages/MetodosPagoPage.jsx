import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  ArrowLeftRight,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import {
  getMetodosPago, createMetodoPago, updateMetodoPago, deleteMetodoPago
} from '../../application/comprasService';
import {
  createIngresoCaja, createTransferencia
} from '../../../gastos/application/movimientosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal.jsx';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import './ComprasPage.css';

const getInitialRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
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

  const totalEfectivo = metodos
    .filter(m => m.activo && m.tipo === 'EFECTIVO')
    .reduce((sum, m) => sum + (m.saldoActual || 0), 0);

  const totalBanco = metodos
    .filter(m => m.activo && m.tipo === 'BANCO')
    .reduce((sum, m) => sum + (m.saldoActual || 0), 0);

  const totalGeneral = totalEfectivo + totalBanco;

  const ingresosPeriodo = metodos
    .filter(m => m.activo)
    .reduce((sum, m) => sum + (m.ingresosPeriod || 0), 0);

  const egresosPeriodo = metodos
    .filter(m => m.activo)
    .reduce((sum, m) => sum + (m.egresosPeriod || 0), 0);

  const balancePeriodo = ingresosPeriodo - egresosPeriodo;

  return (
    <div className="space-y-3 sm:space-y-5 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .mp-toggle {
          width: 40px; height: 22px; border-radius: 9999px; background: #e2e8f0;
          border: none; cursor: pointer; position: relative; transition: background 0.15s ease;
          padding: 0; flex-shrink: 0;
        }
        .mp-toggle-on { background: #2563eb; }
        .mp-toggle-dot {
          position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
          border-radius: 9999px; background: #fff; transition: transform 0.15s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.12);
        }
        .mp-toggle-on .mp-toggle-dot { transform: translateX(18px); }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <CreditCard className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Métodos de pago</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Caja
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Canales de cobro y pago (caja, banco, etc.)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openNewIngreso}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <Plus size={15} />
              Nuevo ingreso
            </button>
            <button
              type="button"
              onClick={openNewTransferencia}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
            >
              <ArrowLeftRight size={15} />
              Transferir
            </button>
            <button
              type="button"
              onClick={openNewMetodo}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm"
            >
              <Plus size={15} />
              Nuevo método
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards — 2 cols en móvil (total general ancho completo); 3 en una fila en web */}
      <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-emerald-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total efectivo</p>
          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tabular-nums truncate">{formatUSD(totalEfectivo)}</p>
        </div>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-blue-600 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total banco</p>
          <p className="text-base sm:text-lg font-bold text-blue-600 mt-1 tabular-nums truncate">{formatUSD(totalBanco)}</p>
        </div>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-indigo-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0 max-sm:col-span-2">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total general</p>
          <p className="text-base sm:text-lg font-bold text-indigo-600 mt-1 tabular-nums truncate">{formatUSD(totalGeneral)}</p>
        </div>
      </div>

      {/* Period filter + stats */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Rango de fechas</label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-64"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-500 font-medium">Ingresos periodo</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5 tabular-nums">
                {ingresosPeriodo > 0 ? `+${formatUSD(ingresosPeriodo)}` : formatUSD(ingresosPeriodo)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-500 font-medium">Egresos periodo</p>
              <p className="text-sm font-bold text-rose-600 mt-0.5 tabular-nums">
                {egresosPeriodo > 0 ? `-${formatUSD(egresosPeriodo)}` : formatUSD(egresosPeriodo)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-500 font-medium">Balance periodo</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5 tabular-nums">{formatUSD(balancePeriodo)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Detalle de cuentas</h2>
        </div>

        {metodosLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-200 border-t-blue-500" />
            <span className="text-xs text-slate-400">Cargando métodos...</span>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Nombre</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo actual</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Ingresos (P)</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Egresos (P)</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Neto (P)</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Estado</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {metodos.map(m => {
                    const isEfectivo = m.tipo === 'EFECTIVO';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">{m.nombre}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            isEfectivo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                            {m.tipo || 'EFECTIVO'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 tabular-nums">{formatUSD(m.saldoActual)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-emerald-700 tabular-nums">
                          {m.ingresosPeriod > 0 ? `+${formatUSD(m.ingresosPeriod)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-rose-600 tabular-nums">
                          {m.egresosPeriod > 0 ? `-${formatUSD(m.egresosPeriod)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 tabular-nums">{formatUSD(m.netoPeriod)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleMetodoToggle(m)}
                            className={`mp-toggle ${m.activo ? 'mp-toggle-on' : ''}`}
                            title={m.activo ? 'Desactivar' : 'Activar'}
                          >
                            <span className="mp-toggle-dot" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditMetodo(m)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMetodoDelete(m.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {metodos.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-400 font-medium">
                        No hay métodos de pago registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-3 p-4">
              {metodos.map(m => {
                const isEfectivo = m.tipo === 'EFECTIVO';
                return (
                  <div key={m.id} className="border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{m.nombre}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        isEfectivo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {m.tipo || 'EFECTIVO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Saldo actual</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{formatUSD(m.saldoActual)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Neto periodo</span>
                        <span className="font-semibold text-slate-700 tabular-nums">{formatUSD(m.netoPeriod)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Ingresos (P)</span>
                        <span className="font-medium text-emerald-700 tabular-nums">
                          {m.ingresosPeriod > 0 ? `+${formatUSD(m.ingresosPeriod)}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Egresos (P)</span>
                        <span className="font-medium text-rose-600 tabular-nums">
                          {m.egresosPeriod > 0 ? `-${formatUSD(m.egresosPeriod)}` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleMetodoToggle(m)}
                        className={`mp-toggle ${m.activo ? 'mp-toggle-on' : ''}`}
                        title={m.activo ? 'Desactivar' : 'Activar'}
                      >
                        <span className="mp-toggle-dot" />
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditMetodo(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMetodoDelete(m.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
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
          <>
            <div className="co-overlay" onClick={() => setMetodoFormOpen(false)} />
            <div className="co-modal-wrap">
              <div className="co-modal animate-co-modal-in" style={{ maxWidth: '420px' }}>
                <div className="co-modal-header">
                  <h2 className="text-lg font-bold text-slate-800">{editingMetodo ? 'Editar método' : 'Nuevo método de pago'}</h2>
                  <button type="button" onClick={() => setMetodoFormOpen(false)} className="co-modal-close">
                    <X size={16} />
                  </button>
                </div>
                <div className="co-modal-body">
                  <form onSubmit={handleMetodoSave} className="space-y-4">
                    <div>
                      <label className="co-label">Nombre</label>
                      <input className="co-input" value={metodoForm.nombre} placeholder="Ej: Caja Chica, Diego Guayaquil 6357, Transferencia…"
                        onChange={e => setMetodoForm(p => ({ ...p, nombre: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="co-label">Tipo de cuenta</label>
                      <select className="co-input" value={metodoForm.tipo}
                        onChange={e => setMetodoForm(p => ({ ...p, tipo: e.target.value }))}>
                        <option value="EFECTIVO">EFECTIVO (Caja Principal, Caja Chica, etc.)</option>
                        <option value="BANCO">BANCO (Cuentas bancarias, Transferencia, etc.)</option>
                      </select>
                    </div>
                    <div>
                      <label className="co-label">Descripción</label>
                      <input className="co-input" value={metodoForm.descripcion} placeholder="Opcional"
                        onChange={e => setMetodoForm(p => ({ ...p, descripcion: e.target.value }))} />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                      <button type="button" onClick={() => setMetodoFormOpen(false)} className="co-btn-ghost">Cancelar</button>
                      <button type="submit" disabled={metodoSaving} className="co-btn-primary">
                        {metodoSaving && <div className="co-spinner-sm" />}
                        {editingMetodo ? 'Guardar' : 'Crear método'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        </ModalPortal>
      )}

      {ingresoFormOpen && (
        <ModalPortal>
          <>
            <div className="co-overlay" onClick={() => setIngresoFormOpen(false)} />
            <div className="co-modal-wrap">
              <div className="co-modal animate-co-modal-in" style={{ maxWidth: '460px' }}>
                <div className="co-modal-header">
                  <h2 className="text-lg font-bold text-slate-800">Registrar ingreso manual</h2>
                  <button type="button" onClick={() => setIngresoFormOpen(false)} className="co-modal-close">
                    <X size={16} />
                  </button>
                </div>
                <div className="co-modal-body">
                  <form onSubmit={handleIngresoSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="co-label">Monto ($) *</label>
                        <input type="number" className="co-input font-semibold" value={ingresoForm.monto} placeholder="0.00" min="0.01" step="0.01"
                          onChange={e => setIngresoForm(p => ({ ...p, monto: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="co-label">Fecha *</label>
                        <input type="date" className="co-input" value={ingresoForm.fecha}
                          onChange={e => setIngresoForm(p => ({ ...p, fecha: e.target.value }))} required />
                      </div>
                    </div>
                    <div>
                      <label className="co-label">Cuenta de depósito *</label>
                      <select className="co-input" value={ingresoForm.metodoPagoId}
                        onChange={e => setIngresoForm(p => ({ ...p, metodoPagoId: e.target.value }))} required>
                        <option value="" disabled>Seleccione cuenta...</option>
                        {metodos.filter(m => m.activo).map(m => (
                          <option key={m.id} value={m.id}>{m.nombre} ({formatUSD(m.saldoActual)})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="co-label">Concepto / Motivo *</label>
                      <input className="co-input" value={ingresoForm.concepto} placeholder="Ej: Venta de desperdicio, Intereses, etc."
                        onChange={e => setIngresoForm(p => ({ ...p, concepto: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="co-label">Cliente (opcional)</label>
                        <input className="co-input" value={ingresoForm.cliente} placeholder="Nombre del cliente"
                          onChange={e => setIngresoForm(p => ({ ...p, cliente: e.target.value }))} />
                      </div>
                      <div>
                        <label className="co-label">Categoría (opcional)</label>
                        <input className="co-input" value={ingresoForm.categoria} placeholder="Ej: Varios, Reembolso"
                          onChange={e => setIngresoForm(p => ({ ...p, categoria: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="co-label">Notas / Observaciones</label>
                      <textarea className="co-input h-20 resize-none p-2" value={ingresoForm.notas} placeholder="Detalles adicionales..."
                        onChange={e => setIngresoForm(p => ({ ...p, notas: e.target.value }))} />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                      <button type="button" onClick={() => setIngresoFormOpen(false)} className="co-btn-ghost">Cancelar</button>
                      <button type="submit" disabled={ingresoSaving} className="co-btn-primary">
                        {ingresoSaving && <div className="co-spinner-sm" />}
                        Registrar ingreso
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        </ModalPortal>
      )}

      {transferenciaFormOpen && (
        <ModalPortal>
          <>
            <div className="co-overlay" onClick={() => setTransferenciaFormOpen(false)} />
            <div className="co-modal-wrap">
              <div className="co-modal animate-co-modal-in" style={{ maxWidth: '460px' }}>
                <div className="co-modal-header">
                  <h2 className="text-lg font-bold text-slate-800">Transferencia entre cuentas</h2>
                  <button type="button" onClick={() => setTransferenciaFormOpen(false)} className="co-modal-close">
                    <X size={16} />
                  </button>
                </div>
                <div className="co-modal-body">
                  <form onSubmit={handleTransferenciaSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="co-label">Monto ($) *</label>
                        <input type="number" className="co-input font-semibold" value={transferenciaForm.monto} placeholder="0.00" min="0.01" step="0.01"
                          onChange={e => setTransferenciaForm(p => ({ ...p, monto: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="co-label">Fecha *</label>
                        <input type="date" className="co-input" value={transferenciaForm.fecha}
                          onChange={e => setTransferenciaForm(p => ({ ...p, fecha: e.target.value }))} required />
                      </div>
                    </div>
                    <div>
                      <label className="co-label">Cuenta origen (sale fondos) *</label>
                      <select className="co-input" value={transferenciaForm.origenMetodoId}
                        onChange={e => setTransferenciaForm(p => ({ ...p, origenMetodoId: e.target.value }))} required>
                        <option value="" disabled>Seleccione cuenta de origen...</option>
                        {metodos.filter(m => m.activo).map(m => (
                          <option key={m.id} value={m.id}>{m.nombre} ({formatUSD(m.saldoActual)})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="co-label">Cuenta destino (ingresa fondos) *</label>
                      <select className="co-input" value={transferenciaForm.destinoMetodoId}
                        onChange={e => setTransferenciaForm(p => ({ ...p, destinoMetodoId: e.target.value }))} required>
                        <option value="" disabled>Seleccione cuenta de destino...</option>
                        {metodos.filter(m => m.activo).map(m => (
                          <option key={m.id} value={m.id} disabled={m.id === transferenciaForm.origenMetodoId}>{m.nombre} ({formatUSD(m.saldoActual)})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="co-label">Referencia / Notas</label>
                      <input className="co-input" value={transferenciaForm.referencia} placeholder="Ej: Retiro para caja chica, Depósito…"
                        onChange={e => setTransferenciaForm(p => ({ ...p, referencia: e.target.value }))} />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                      <button type="button" onClick={() => setTransferenciaFormOpen(false)} className="co-btn-ghost">Cancelar</button>
                      <button type="submit" disabled={transferenciaSaving} className="co-btn-primary">
                        {transferenciaSaving && <div className="co-spinner-sm" />}
                        Transferir fondos
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        </ModalPortal>
      )}
    </div>
  );
};
