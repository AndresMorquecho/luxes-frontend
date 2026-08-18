import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  CreditCard,
  Search,
  Filter,
  X,
  FileText,
  RefreshCw,
  Tag,
  Eye,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  getGastosFijos,
  saveGastoFijo,
  deleteGastoFijo,
  pagarGastoFijo,
  deleteGastoFijoPago,
} from '../../application/gastosFijosService';
import { getMetodosPago } from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';

const FRECUENCIAS = [
  { key: 'MENSUAL', label: 'Mensual' },
  { key: 'QUINCENAL', label: 'Quincenal' },
  { key: 'SEMANAL', label: 'Semanal' },
  { key: 'ANUAL', label: 'Anual' },
];

const CATEGORIAS = [
  { key: 'oficina', label: 'Oficina / Arriendo' },
  { key: 'servicios', label: 'Servicios Básicos (Luz, Agua, Tel, Net)' },
  { key: 'redes_y_programas', label: 'Software & Suscripciones' },
  { key: 'logistica', label: 'Logística & Transporte' },
  { key: 'mantenimiento', label: 'Mantenimiento' },
  { key: 'varios', label: 'Varios' },
];

export function GastosFijosTab({ isAdmin = true, onPaymentSuccess }) {
  const [items, setItems] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFrecuencia, setFilterFrecuencia] = useState('TODOS');

  // Modales
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [itemToPay, setItemToPay] = useState(null);

  // Modal Historial de Pagos
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [itemHistorial, setItemHistorial] = useState(null);
  const [historialDateRange, setHistorialDateRange] = useState({ start: '', end: '' });
  const [historialPage, setHistorialPage] = useState(1);
  const HISTORIAL_PER_PAGE = 5;

  // Form states
  const [form, setForm] = useState({
    nombre: '',
    categoria: 'oficina',
    montoEstimado: '',
    frecuencia: 'MENSUAL',
    diaVencimiento: '1',
    proximaFechaPago: new Date().toISOString().slice(0, 10),
    proveedor: '',
    notas: '',
  });

  const [payForm, setPayForm] = useState({
    monto: '',
    metodoPagoId: '',
    fecha: new Date().toISOString().slice(0, 10),
    concepto: '',
    notas: '',
    proveedor: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fijosRes, metodosData] = await Promise.all([
        getGastosFijos(),
        getMetodosPago().catch(() => []),
      ]);
      setItems(fijosRes.data || []);
      setMetodosPago(metodosData || []);
    } catch (err) {
      toast.error(err.message || 'Error al cargar gastos fijos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtros y KPIs
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.nombre.toLowerCase().includes(search.toLowerCase()) ||
        item.proveedor.toLowerCase().includes(search.toLowerCase());
      const matchesFreq =
        filterFrecuencia === 'TODOS' || item.frecuencia === filterFrecuencia;
      return matchesSearch && matchesFreq;
    });
  }, [items, search, filterFrecuencia]);

  const kpis = useMemo(() => {
    const totalActivos = items.filter((i) => i.activo).length;
    const deudasVencidas = items.filter((i) => i.esVencido).length;
    const montoMensual = items
      .filter((i) => i.activo && i.frecuencia === 'MENSUAL')
      .reduce((sum, i) => sum + Number(i.montoEstimado || 0), 0);
    return { totalActivos, deudasVencidas, montoMensual };
  }, [items]);

  // Handlers para Crear/Editar
  const handleOpenCreate = () => {
    if (!isAdmin) {
      return toast.error('Solo los usuarios administradores pueden crear o editar gastos fijos');
    }
    setEditingItem(null);
    setForm({
      nombre: '',
      categoria: 'oficina',
      montoEstimado: '',
      frecuencia: 'MENSUAL',
      diaVencimiento: '1',
      proximaFechaPago: new Date().toISOString().slice(0, 10),
      proveedor: '',
      notas: '',
    });
    setModalFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    if (!isAdmin) {
      return toast.error('Solo los usuarios administradores pueden editar gastos fijos');
    }
    setEditingItem(item);
    setForm({
      id: item.id,
      nombre: item.nombre,
      categoria: item.categoria || 'oficina',
      montoEstimado: String(item.montoEstimado),
      frecuencia: item.frecuencia || 'MENSUAL',
      diaVencimiento: String(item.diaVencimiento || 1),
      proximaFechaPago: item.proximaFechaPago,
      proveedor: item.proveedor || '',
      notas: item.notas || '',
    });
    setModalFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!isAdmin) return toast.error('Permiso denegado');
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio');
    if (!form.montoEstimado || Number(form.montoEstimado) <= 0)
      return toast.error('El monto estimado debe ser mayor a 0');

    setSubmitting(true);
    try {
      await saveGastoFijo({
        ...form,
        montoEstimado: Number(form.montoEstimado),
        diaVencimiento: form.diaVencimiento ? Number(form.diaVencimiento) : null,
      });
      toast.success(editingItem ? 'Gasto fijo actualizado' : 'Gasto fijo creado exitosamente');
      deferClose(() => setModalFormOpen(false));
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error al guardar gasto fijo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!isAdmin) {
      return toast.error('Solo los usuarios administradores pueden eliminar gastos fijos');
    }

    // PROTECCIÓN: Bloquear si existen pagos en el historial
    if (item.pagos && item.pagos.length > 0) {
      return toast.error(
        `No se puede eliminar el gasto fijo "${item.nombre}" porque contiene ${item.pagos.length} pago(s) registrado(s) en su historial. Debe anular o eliminar todos los pagos del historial primero para poder borrar esta programación.`
      );
    }

    const confirmed = await confirmDialog(
      '¿Eliminar gasto fijo?',
      `Se eliminará la programación del gasto fijo "${item.nombre}". Esta acción no se puede deshacer.`,
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;

    try {
      await deleteGastoFijo(item.id);
      toast.success('Gasto fijo eliminado');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  // Handlers para Ejecutar Pago
  const handleOpenPago = (item) => {
    setItemToPay(item);
    setPayForm({
      monto: String(item.montoEstimado),
      metodoPagoId: metodosPago[0]?.id || '',
      fecha: new Date().toISOString().slice(0, 10),
      concepto: `Pago Gasto Fijo: ${item.nombre}`,
      notas: `Pago recurrente programado (${item.frecuencia})`,
      proveedor: item.proveedor || '',
    });
    setModalPagoOpen(true);
  };

  const handleSubmitPago = async (e) => {
    e.preventDefault();
    if (!payForm.monto || Number(payForm.monto) <= 0)
      return toast.error('El monto a pagar debe ser mayor a 0');
    if (!payForm.metodoPagoId)
      return toast.error('Selecciona un método de pago válido');

    setSubmitting(true);
    try {
      await pagarGastoFijo(itemToPay.id, {
        monto: Number(payForm.monto),
        metodoPagoId: payForm.metodoPagoId,
        fecha: payForm.fecha,
        concepto: payForm.concepto,
        notas: payForm.notas,
        proveedor: payForm.proveedor,
      });
      toast.success(`Pago registrado para "${itemToPay.nombre}". Se actualizó el Cierre de Caja.`);
      deferClose(() => {
        setModalPagoOpen(false);
        setItemToPay(null);
      });
      loadData();
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err) {
      toast.error(err.message || 'Error al registrar pago');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers para Historial de Pagos
  const handleOpenHistorial = (item) => {
    setItemHistorial(item);
    setHistorialDateRange({ start: '', end: '' });
    setHistorialPage(1);
    setModalHistorialOpen(true);
  };

  const handleDeletePagoItem = async (pago) => {
    if (!isAdmin) {
      return toast.error('Solo los administradores pueden anular o eliminar pagos del historial');
    }

    const confirmed = await confirmDialog(
      '¿Eliminar este pago?',
      `Al eliminar el pago de $${pago.montoPagado.toFixed(2)}, el egreso se anulará en la lista de gastos y el dinero regresará a la cuenta "${pago.metodoPagoNombre}" para no descuadrar la caja.`,
      { confirmLabel: 'Anular Pago y Reintegrar', cancelLabel: 'Cancelar', type: 'danger' }
    );

    if (!confirmed) return;

    try {
      await deleteGastoFijoPago(pago.id);
      toast.success('Pago eliminado exitosamente. El egreso fue reintegrado a la cuenta.');
      
      // Actualizar estado local del historial
      setItemHistorial((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pagos: prev.pagos.filter((p) => p.id !== pago.id),
        };
      });

      loadData();
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar pago');
    }
  };

  // Filtrado y paginación del historial
  const filteredHistorialPagos = useMemo(() => {
    if (!itemHistorial?.pagos) return [];
    return itemHistorial.pagos.filter((p) => {
      if (!historialDateRange.start || !historialDateRange.end) return true;
      return p.fechaPago >= historialDateRange.start && p.fechaPago <= historialDateRange.end;
    });
  }, [itemHistorial, historialDateRange]);

  const paginatedHistorial = useMemo(() => {
    const startIdx = (historialPage - 1) * HISTORIAL_PER_PAGE;
    return filteredHistorialPagos.slice(startIdx, startIdx + HISTORIAL_PER_PAGE);
  }, [filteredHistorialPagos, historialPage]);

  const totalHistorialPages = Math.ceil(filteredHistorialPagos.length / HISTORIAL_PER_PAGE) || 1;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-EC', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* KPI Header Cards (Una sola fila) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <RefreshCw size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Programados</p>
            <p className="text-2xl font-extrabold text-slate-800">{kpis.totalActivos}</p>
            <p className="text-xs text-slate-500">Gastos fijos activos</p>
          </div>
        </div>

        <div className={`border rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-all ${kpis.deudasVencidas > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200/80'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${kpis.deudasVencidas > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Por Pagar / Vencidos</p>
            <p className={`text-2xl font-extrabold ${kpis.deudasVencidas > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{kpis.deudasVencidas}</p>
            <p className="text-xs text-slate-500">Requieren pago inmediato</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Presupuesto Mensual</p>
            <p className="text-2xl font-extrabold text-slate-800">${kpis.montoMensual.toFixed(2)}</p>
            <p className="text-xs text-slate-500">Estimado mensual acumulado</p>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar gasto o proveedor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={15} className="text-slate-400" />
            <select
              className="px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              value={filterFrecuencia}
              onChange={(e) => setFilterFrecuencia(e.target.value)}
            >
              <option value="TODOS">Todas las frecuencias</option>
              {FRECUENCIAS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0b2d64] hover:bg-[#071f45] text-white text-sm font-bold rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            <Plus size={16} />
            Nuevo Gasto Fijo
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-medium">Cargando gastos fijos...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar size={36} strokeWidth={1.5} className="mx-auto mb-2 text-slate-300" />
            <p className="text-base font-bold text-slate-700">No hay gastos fijos registrados</p>
            <p className="text-sm mt-1">Crea tu primer gasto fijo para automatizar notificaciones de pago</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">Gasto / Concepto</th>
                  <th className="py-3.5 px-4">Frecuencia</th>
                  <th className="py-3.5 px-4">Próximo Vencimiento</th>
                  <th className="py-3.5 px-4 text-right">Monto Estimado</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredItems.map((item) => {
                  const hasHistory = item.pagos && item.pagos.length > 0;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${item.esVencido ? 'bg-rose-50/20' : ''}`}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">{item.nombre}</p>
                            {item.proveedor && (
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Tag size={11} /> {item.proveedor}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {FRECUENCIAS.find((f) => f.key === item.frecuencia)?.label || item.frecuencia}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className={item.esVencido ? 'text-rose-500' : 'text-slate-400'} />
                          <span className={item.esVencido ? 'font-bold text-rose-600' : 'text-slate-700'}>
                            {item.proximaFechaPago}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        ${item.montoEstimado.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.esVencido ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                            <AlertTriangle size={12} />
                            Por Pagar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={12} />
                            Al día
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPago(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                            title="Ejecutar pago del gasto fijo"
                          >
                            <DollarSign size={13} />
                            Pagar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenHistorial(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                            title="Ver historial de pagos"
                          >
                            <Eye size={15} />
                            {hasHistory && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500"></span>
                            )}
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Editar programación (Solo Administradores)"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className={`p-1.5 rounded-lg transition-colors ${hasHistory ? 'text-slate-300 hover:text-rose-400 hover:bg-rose-50/50' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                title={hasHistory ? 'Protegido: contiene pagos en historial' : 'Eliminar gasto fijo (Solo Administradores)'}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR GASTO FIJO */}
      <ModalPortal open={modalFormOpen}>
        <div
          className="fixed inset-0 z-[200]"
          style={{ background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}
          onClick={() => deferClose(() => setModalFormOpen(false))}
        />
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-scale-up border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingItem ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo Programado'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Configura los parámetros para la programación recurrente</p>
              </div>
              <button
                type="button"
                onClick={() => deferClose(() => setModalFormOpen(false))}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Nombre / Concepto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Arriendo de Oficina Central"
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Categoría</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Monto Estimado ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="450.00"
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      value={form.montoEstimado}
                      onChange={(e) => setForm({ ...form, montoEstimado: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Frecuencia</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      value={form.frecuencia}
                      onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
                    >
                      {FRECUENCIAS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Próxima Fecha Pago</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      value={form.proximaFechaPago}
                      onChange={(e) => setForm({ ...form, proximaFechaPago: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Proveedor / Beneficiario</label>
                  <input
                    type="text"
                    placeholder="Ej: Inmobiliaria XYZ"
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                    value={form.proveedor}
                    onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Notas / Observaciones</label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre el contrato o cuenta..."
                    className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => deferClose(() => setModalFormOpen(false))}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold bg-[#0b2d64] hover:bg-[#071f45] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Guardar Gasto Fijo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {/* MODAL REGISTRAR PAGO */}
      <ModalPortal open={modalPagoOpen && !!itemToPay}>
        <div
          className="fixed inset-0 z-[200]"
          style={{ background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}
          onClick={() => deferClose(() => setModalPagoOpen(false))}
        />
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-up border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Registrar Pago de Gasto Fijo</h3>
                <p className="text-xs text-slate-500 font-medium">Se registrará en Gastos Operativos y Cierre de Caja</p>
              </div>
              <button
                type="button"
                onClick={() => deferClose(() => setModalPagoOpen(false))}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPago} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {itemToPay && (
                  <div className="bg-blue-50/80 border border-blue-100 p-3.5 rounded-xl">
                    <p className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider">Gasto Programado</p>
                    <p className="text-base font-extrabold text-slate-900 leading-tight mt-0.5">{itemToPay.nombre}</p>
                    <p className="text-xs text-blue-700 font-semibold mt-1">Monto Estimado: <strong>${itemToPay.montoEstimado.toFixed(2)}</strong></p>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Monto a Pagar ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-base font-extrabold text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                    value={payForm.monto}
                    onChange={(e) => setPayForm({ ...payForm, monto: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Método de Pago (Cierre de caja) *</label>
                  <select
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                    value={payForm.metodoPagoId}
                    onChange={(e) => setPayForm({ ...payForm, metodoPagoId: e.target.value })}
                  >
                    <option value="">Seleccionar método de pago...</option>
                    {metodosPago.map((m) => {
                      const saldo = Number(m.saldoActual ?? m.saldo ?? 0);
                      return (
                        <option key={m.id} value={m.id}>
                          {m.nombre} (${saldo.toFixed(2)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Fecha de Pago</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      value={payForm.fecha}
                      onChange={(e) => setPayForm({ ...payForm, fecha: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Proveedor / Factura</label>
                    <input
                      type="text"
                      placeholder="Ej: CNT / Factura 001"
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                      value={payForm.proveedor}
                      onChange={(e) => setPayForm({ ...payForm, proveedor: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-1.5">Notas / Observación</label>
                  <textarea
                    rows={2}
                    className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
                    value={payForm.notas}
                    onChange={(e) => setPayForm({ ...payForm, notas: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => deferClose(() => setModalPagoOpen(false))}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold bg-[#0b2d64] hover:bg-[#071f45] text-white rounded-xl shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  {submitting ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {/* MODAL HISTORIAL DE PAGOS DE GASTO FIJO (ALTO FIJO Y ANCHO AMPLIADO) */}
      <ModalPortal open={modalHistorialOpen && !!itemHistorial}>
        <div
          className="fixed inset-0 z-[200]"
          style={{ background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}
          onClick={() => deferClose(() => setModalHistorialOpen(false))}
        />
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
          {/* Ancho ampliado (max-w-4xl) y Alto Fijo estable (h-[550px]) */}
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[550px] shadow-2xl animate-scale-up border border-slate-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Historial de Pagos — {itemHistorial?.nombre}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Registro completo de transacciones ejecutadas para este gasto fijo
                </p>
              </div>
              <button
                type="button"
                onClick={() => deferClose(() => setModalHistorialOpen(false))}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Filtro por DateRangePicker */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60 shrink-0">
                <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Filtrar por Rango de Fechas:
                </div>
                <div className="w-full sm:w-64">
                  <DateRangePicker
                    value={historialDateRange}
                    onChange={setHistorialDateRange}
                    placeholder="Todas las fechas"
                  />
                </div>
              </div>

              {/* Tabla de Historial con scroll interno permanente */}
              <div className="flex-1 border border-slate-200/80 rounded-xl overflow-y-auto bg-white shadow-sm">
                {filteredHistorialPagos.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <FileText size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">Sin historial de pagos</p>
                    <p className="text-xs mt-1 text-slate-400">No hay pagos registrados para el filtro seleccionado</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider z-10">
                      <tr>
                        <th className="py-3 px-4">Fecha y Hora</th>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4 text-right">Monto Pagado</th>
                        <th className="py-3 px-4">Método de Pago</th>
                        <th className="py-3 px-4">Proveedor / Notas</th>
                        <th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {paginatedHistorial.map((pago) => (
                        <tr key={pago.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <div>{pago.fechaPago}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {formatDateTime(pago.createdAt)}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <User size={13} className="text-slate-400" />
                              {pago.usuarioNombre || 'Sistema'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600 text-sm">
                            ${pago.montoPagado.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <span className="inline-flex items-center gap-1.5">
                              <CreditCard size={13} className="text-slate-400" />
                              {pago.metodoPagoNombre || 'Sin especificar'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-500 max-w-[200px]">
                            {pago.proveedor ? (
                              <span className="font-semibold text-slate-700 block truncate">{pago.proveedor}</span>
                            ) : null}
                            {pago.notas ? <span className="text-[10px] text-slate-400 block truncate">{pago.notas}</span> : null}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleDeletePagoItem(pago)}
                                className="px-2.5 py-1 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold"
                                title="Anular pago y reintegrar dinero a la cuenta (Solo Administradores)"
                              >
                                <Trash2 size={13} />
                                Anular
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No permitido</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Paginador fijo al pie del body */}
              {totalHistorialPages > 1 && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                  <span className="text-xs text-slate-500 font-medium">
                    Página {historialPage} de {totalHistorialPages} ({filteredHistorialPagos.length} pagos totales)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={historialPage <= 1}
                      onClick={() => setHistorialPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-white transition-colors"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={historialPage >= totalHistorialPages}
                      onClick={() => setHistorialPage((p) => Math.min(totalHistorialPages, p + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-white transition-colors"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => deferClose(() => setModalHistorialOpen(false))}
                className="px-5 py-2 text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 rounded-xl transition-all shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
}
