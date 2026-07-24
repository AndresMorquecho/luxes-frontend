import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getProformaById, aprobarProforma, rechazarProforma, registrarAbonoProforma, editarAbonoProforma, eliminarAbonoProforma, saveProforma } from '../../application/proformasService';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { ProformaPDF } from '../components/ProformaPDF';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { useIsMobileSm } from '../../../../shared/hooks/useMediaQuery.js';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { FileText, Calendar, CheckCircle2, User, Check, Edit2, Trash2, Download, ArrowLeft, X, DollarSign } from 'lucide-react';

const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const formatFecha = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const ProformaDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [proforma, setProforma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metodosPago, setMetodosPago] = useState([]);
  const [configuracion, setConfiguracion] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // Modal states
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [editingAbono, setEditingAbono] = useState(null);
  const [abonoForm, setAbonoForm] = useState({
    monto: '',
    metodoPagoId: '',
    referencia: '',
    aplicarIva: false,
  });
  const [submittingAbono, setSubmittingAbono] = useState(false);
  const isMobileSm = useIsMobileSm();
  
  // User auth state
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (loggedInUser?.rol || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const [data, metodos, config] = await Promise.all([
          getProformaById(id),
          getMetodosPago().catch(() => []),
          getConfiguracion().catch(() => null),
        ]);
        setProforma(data);
        setMetodosPago(metodos);
        setConfiguracion(config);
        if (metodos.length > 0) {
          setAbonoForm(prev => ({ ...prev, metodoPagoId: metodos[0].id, aplicarIva: data?.iva > 0 }));
        } else {
          setAbonoForm(prev => ({ ...prev, aplicarIva: data?.iva > 0 }));
        }

        if (searchParams.get('action') === 'abono') {
          // Calculate the total to prepopulate
          const totalPend = data.items.reduce((s, i) => s + (parseFloat(i.cantidad) || 0) * (parseFloat(i.precioUnitario) || 0), 0) * (1 + data.iva);
          setAbonoForm(prev => ({
            ...prev,
            monto: data.estado === 'Pendiente' ? totalPend.toFixed(2) : prev.monto
          }));
          setShowAbonoModal(true);
          
          // Remove the query param cleanly
          const params = new URLSearchParams(searchParams);
          params.delete('action');
          setSearchParams(params, { replace: true });
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar los detalles de la proforma');
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-5 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{`.shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }`}</style>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
        </div>
      </div>
    );
  }

  if (!proforma) {
    return (
      <div className="space-y-3 sm:space-y-5 animate-slide-up pb-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{`.shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }`}</style>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 py-16 text-center px-4">
          <p className="text-slate-600 font-semibold mb-4">Proforma no encontrada</p>
          <button
            type="button"
            onClick={() => navigate('/proformas')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Volver a Proformas
          </button>
        </div>
      </div>
    );
  }

  const subtotal = (proforma.items || []).reduce((s, item) => s + Number(item.cantidad) * Number(item.precioUnitario), 0);
  const currentIvaValue = (showAbonoModal && proforma?.estado === 'Pendiente') ? (abonoForm.aplicarIva ? 0.15 : 0) : Number(proforma.iva);
  const total = subtotal * (1 + currentIvaValue);
  const totalCobrado = (proforma.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
  const totalPendiente = Math.max(0, total - totalCobrado);
  
  const sumOtrosAbonos = editingAbono 
    ? (proforma.abonos || []).filter(ab => ab.id !== editingAbono.id).reduce((s, ab) => s + Number(ab.monto), 0)
    : 0;

  const handleRechazar = async () => {
    const confirmed = await confirmDialog(
      'Rechazar Proforma',
      '¿Está seguro de que desea rechazar esta proforma?',
      { type: 'danger', confirmLabel: 'Rechazar', cancelLabel: 'Cancelar' }
    );
    if (!confirmed) return;
    try {
      const updated = await rechazarProforma(proforma.id);
      setProforma(updated);
      toast.success('Proforma rechazada correctamente');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al rechazar la proforma');
    }
  };

  const handleOpenAprobar = () => {
    const isIva = proforma.iva > 0;
    const initialTotal = subtotal * (1 + (isIva ? 0.15 : 0));
    setAbonoForm(prev => ({
      ...prev,
      monto: initialTotal.toFixed(2),
      aplicarIva: isIva,
    }));
    setShowAbonoModal(true);
  };

  const handleOpenRegistrarAbono = () => {
    setAbonoForm(prev => ({
      ...prev,
      monto: totalPendiente.toFixed(2),
    }));
    setShowAbonoModal(true);
  };

  const handleCloseModal = () => {
    deferClose(() => {
      setShowAbonoModal(false);
      setEditingAbono(null);
      setAbonoForm({
        monto: '',
        metodoPagoId: metodosPago.length > 0 ? metodosPago[0].id : '',
        referencia: '',
        aplicarIva: proforma?.iva > 0,
      });
    });
  };

  const handleOpenEditarAbono = (abono) => {
    setEditingAbono(abono);
    setAbonoForm({
      monto: abono.monto.toString(),
      metodoPagoId: abono.metodoPago?.id || '',
      referencia: abono.referencia || '',
      aplicarIva: proforma?.iva > 0,
    });
    setShowAbonoModal(true);
  };

  const handleEliminarAbono = async (abonoId) => {
    const confirmed = await confirmDialog(
      'Eliminar Abono',
      '¿Está seguro de que desea eliminar este abono?',
      { type: 'danger', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' }
    );
    if (!confirmed) return;
    try {
      setLoading(true);
      const updated = await eliminarAbonoProforma(proforma.id, abonoId);
      setProforma(updated);
      toast.success('Abono eliminado correctamente');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el abono');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAbono = async (e) => {
    e.preventDefault();
    const numericMonto = parseFloat(abonoForm.monto);
    
    if (isNaN(numericMonto) || numericMonto < 0) {
      toast.error('Por favor, ingresa un monto válido (0 o mayor)');
      return;
    }

    const maxPermitted = proforma.estado === 'Pendiente' 
      ? total 
      : (editingAbono ? total - sumOtrosAbonos : totalPendiente);

    if (maxPermitted > 0 && numericMonto > (maxPermitted + 0.01)) {
      toast.error(`El abono no puede superar el valor restante de ${formatUSD(maxPermitted)}`);
      return;
    }

    setSubmittingAbono(true);
    try {
      let updated;
      if (editingAbono) {
        updated = await editarAbonoProforma(proforma.id, editingAbono.id, {
          monto: numericMonto,
          metodoPagoId: abonoForm.metodoPagoId,
          referencia: abonoForm.referencia,
        });
        toast.success('Abono editado correctamente');
      } else if (proforma.estado === 'Pendiente') {
        updated = await aprobarProforma(proforma.id, {
          monto: numericMonto,
          metodoPagoId: abonoForm.metodoPagoId,
          referencia: abonoForm.referencia,
          aplicarIva: abonoForm.aplicarIva,
        });
        toast.success('Proforma aprobada y abono registrado correctamente');
      } else {
        updated = await registrarAbonoProforma(proforma.id, {
          monto: numericMonto,
          metodoPagoId: abonoForm.metodoPagoId,
          referencia: abonoForm.referencia,
        });
        toast.success('Abono registrado correctamente');
      }
      setProforma(updated);
      handleCloseModal();
      
      if (proforma.estado === 'Pendiente') {
        navigate('/proformas');
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al registrar la transacción');
    } finally {
      setSubmittingAbono(false);
    }
  };

  // UI helpers
  const badgeStyle = (est) => {
    switch (est) {
      case 'Aprobada':
      case 'Pagada':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          dot: 'bg-emerald-500'
        };
      case 'Rechazada':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-100',
          dot: 'bg-rose-500'
        };
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-100',
          dot: 'bg-amber-500'
        };
    }
  };

  const getCondicionesList = () => {
    if (proforma.condiciones && proforma.condiciones.trim()) {
      return proforma.condiciones.split('\n').filter(Boolean);
    }
    return [
      "60% de anticipo y 40% contra entrega, efectivo o transferencias bancarias",
      "Entrega en 15 días hábiles después de la confirmación de diseño",
      "Esta cotización es válida por 3 días después de su fecha de emisión",
      "Nuestros productos cuentan con garantía mínima de 12 meses, no cubre daños por mal uso o instalación incorrecta"
    ];
  };

  const estStyle = badgeStyle(proforma.estado);

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-8"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/proformas')}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              title="Volver"
              aria-label="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100 text-blue-600">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800 truncate">{proforma.id}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Detalle
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${estStyle.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${estStyle.dot}`} />
                  {proforma.estado === 'Pagada' ? 'Aprobada' : proforma.estado}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Consulta, aprueba y gestiona abonos de la proforma
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setPreview(proforma)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={16} className="text-slate-500" />
              Ver PDF
            </button>

            {isAdmin && proforma.estado === 'Pendiente' && (
              <>
                <button
                  type="button"
                  onClick={handleRechazar}
                  className="inline-flex items-center justify-center px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={handleOpenAprobar}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Aprobar y Registrar Abono
                </button>
              </>
            )}

            {isAdmin && (proforma.estado === 'Aprobada' || proforma.estado === 'Pagada') && totalPendiente > 0.01 && (
              <button
                type="button"
                onClick={handleOpenRegistrarAbono}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Registrar Nuevo Abono
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fechas / meta */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-slate-400 shrink-0" />
            <span>
              Emisión: <span className="font-semibold text-slate-700">{formatFecha(proforma.fecha)}</span>
            </span>
          </div>

          {proforma.vencimiento && (
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-slate-400 shrink-0" />
              <span>
                Vence: <span className="font-semibold text-slate-700">{formatFecha(proforma.vencimiento)}</span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-slate-400 shrink-0" />
            <span>
              {proforma.estado === 'Pendiente' ? (
                'Pendiente de aprobación'
              ) : (
                <>
                  Aprobada:{' '}
                  <span className="font-semibold text-slate-700">
                    {proforma.fechaAprobacion ? formatDateTime(proforma.fechaAprobacion) : formatFecha(proforma.fecha)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Cliente / ejecutivo / condiciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Cliente</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <span className="block font-semibold text-slate-800 text-sm truncate">{proforma.cliente}</span>
              <span className="block text-xs text-slate-500 mt-1">
                {proforma.clienteCedula
                  ? `RUC/CC: ${proforma.clienteCedula}`
                  : proforma.telefono
                    ? `Teléfono: ${proforma.telefono}`
                    : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Ejecutivo y validez</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <User size={15} />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Atendido por</span>
                <span className="block text-xs text-slate-700 font-semibold mt-0.5 truncate uppercase">
                  {proforma.atiende || 'No asignado'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Calendar size={15} />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validez</span>
                <span className="block text-xs text-slate-700 font-semibold mt-0.5">
                  {proforma.diasValidez || 3} días
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Condiciones de pago</p>
          <ul className="space-y-2">
            {getCondicionesList().map((cond, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-500">
                <span className="w-4 h-4 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={10} strokeWidth={3} />
                </span>
                <span className="leading-snug">{cond}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Detalle de la proforma</h2>
        </div>

        {isMobileSm ? (
          <div className="divide-y divide-slate-100">
            {(proforma.items || []).map((item, idx) => (
              <div key={idx} className="px-4 py-3 flex flex-col gap-1">
                <p className="text-sm font-semibold text-slate-800">{item.descripcion}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Cant: <span className="tabular-nums font-semibold text-slate-700">{item.cantidad.toFixed(2)}</span>
                  </span>
                  <span>
                    P/u: <span className="tabular-nums font-semibold text-slate-700">{formatUSD(item.precioUnitario)}</span>
                  </span>
                  <span className="tabular-nums font-bold text-slate-800">
                    {formatUSD(item.cantidad * item.precioUnitario)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="text-left px-5 py-3">Descripción</th>
                  <th className="text-center px-4 py-3 w-28">Cantidad</th>
                  <th className="text-right px-4 py-3 w-36">Precio unitario</th>
                  <th className="text-right px-5 py-3 w-36">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(proforma.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-3.5 text-slate-800 font-medium">{item.descripcion}</td>
                    <td className="px-4 py-3.5 text-center text-slate-600 tabular-nums">{item.cantidad.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-600 tabular-nums">{formatUSD(item.precioUnitario)}</td>
                    <td className="px-5 py-3.5 text-right text-slate-800 font-semibold tabular-nums">
                      {formatUSD(item.cantidad * item.precioUnitario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 bg-slate-50/40 px-4 sm:px-5 py-4 flex flex-col items-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="tabular-nums font-semibold text-slate-700">{formatUSD(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <div className="flex items-center gap-1">
                <span>IVA</span>
                {proforma.estado === 'Pendiente' ? (
                  <select
                    className="ml-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                    value={proforma.iva}
                    onChange={async (e) => {
                      const newIva = Number(e.target.value);
                      try {
                        const updated = await saveProforma({ ...proforma, iva: newIva });
                        setProforma(updated);
                        toast.success(`IVA actualizado al ${newIva * 100}%`);
                      } catch (err) {
                        toast.error('Error al actualizar el IVA');
                      }
                    }}
                  >
                    <option value={0}>0%</option>
                    <option value={0.05}>5%</option>
                    <option value={0.10}>10%</option>
                    <option value={0.15}>15%</option>
                  </select>
                ) : (
                  <span>({Number(proforma.iva * 100)}%)</span>
                )}
                <span>:</span>
              </div>
              <span className="tabular-nums font-semibold text-slate-700">
                {formatUSD(subtotal * Number(proforma.iva))}
              </span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold text-base border-t border-slate-200 pt-2">
              <span>Total proforma:</span>
              <span className="tabular-nums text-blue-600">{formatUSD(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Abonos */}
      {proforma.estado !== 'Pendiente' && (
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800">Historial de cobros y abonos</h2>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg px-3 py-1">
                Cobrado: {formatUSD(totalCobrado)}
              </span>
              {totalPendiente > 0.01 ? (
                <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-lg px-3 py-1">
                  Pendiente: {formatUSD(totalPendiente)}
                </span>
              ) : (
                <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-3 py-1">
                  Liquidada totalmente
                </span>
              )}
            </div>
          </div>

          {(proforma.abonos && proforma.abonos.length > 0) ? (
            isMobileSm ? (
              <div className="divide-y divide-slate-100">
                {proforma.abonos.map((ab, idx) => (
                  <div key={ab.id} className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-700">
                          {ab.metodoPago?.nombre || 'Caja General'}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">{formatDateTime(ab.fecha)}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800 tabular-nums">{formatUSD(ab.monto)}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg p-2">
                      {ab.referencia && (
                        <span>
                          <strong className="text-slate-500">Ref:</strong> {ab.referencia}
                        </span>
                      )}
                      <span>
                        <strong className="text-slate-500">Registrado por:</strong>{' '}
                        {ab.registradoPor?.nombre || 'N/A'}
                      </span>
                    </div>
                    {isAdmin && idx === proforma.abonos.length - 1 && (
                      <div className="flex justify-end gap-3 mt-1 pt-2 border-t border-dashed border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenEditarAbono(ab)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarAbono(ab.id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                      <th className="text-left px-5 py-3">Fecha y hora</th>
                      <th className="text-left px-5 py-3">Caja / cuenta</th>
                      <th className="text-left px-5 py-3">Referencia</th>
                      <th className="text-left px-5 py-3">Usuario</th>
                      <th className="text-right px-5 py-3">Monto</th>
                      <th className="text-right px-5 py-3 w-48">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proforma.abonos.map((ab, idx) => (
                      <tr key={ab.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-3.5 text-slate-600 tabular-nums text-xs">{formatDateTime(ab.fecha)}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-700">{ab.metodoPago?.nombre || 'General'}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">{ab.referencia || 'N/A'}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">{ab.registradoPor?.nombre || 'N/A'}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-800 tabular-nums">
                          {formatUSD(ab.monto)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {isAdmin && idx === proforma.abonos.length - 1 && (
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => handleOpenEditarAbono(ab)}
                                className="text-blue-600 hover:text-blue-800 font-semibold text-xs inline-flex items-center gap-1"
                                title="Editar Abono"
                              >
                                <Edit2 size={13} />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarAbono(ab.id)}
                                className="text-red-600 hover:text-red-800 font-semibold text-xs inline-flex items-center gap-1"
                                title="Eliminar Abono"
                              >
                                <Trash2 size={13} />
                                Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No se han registrado abonos en esta proforma.
            </div>
          )}
        </div>
      )}

      {proforma.fechaAprobacion && (
        <p className="text-center text-xs text-slate-400">
          Última actualización: {formatDateTime(proforma.fechaAprobacion)}
        </p>
      )}

      {/* Abonos Modal */}
      <ModalPortal open={showAbonoModal}>
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={handleCloseModal}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-3xl overflow-hidden relative pointer-events-auto max-h-[90vh] flex flex-col"
              style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                    <DollarSign size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base truncate">
                    {editingAbono
                      ? 'Editar Abono'
                      : (proforma.estado === 'Pendiente' ? 'Aprobación y Registro de Abono' : 'Registrar Abono')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 border border-slate-200 transition-colors shrink-0"
                  title="Cerrar"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveAbono} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Información Financiera y Monto */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        {editingAbono
                          ? 'Modifica los valores del abono. El total del abono no debe superar el saldo pendiente.'
                          : 'Ingresa el monto del cobro. Este abono puede representar la totalidad de la proforma o ser un pago parcial.'}
                      </p>

                      {proforma.estado === 'Pendiente' && !editingAbono && (
                        <label className="flex items-center cursor-pointer flex-shrink-0 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={abonoForm.aplicarIva}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAbonoForm(prev => {
                                  const newIvaVal = checked ? 0.15 : 0;
                                  const newTotal = subtotal * (1 + newIvaVal);
                                  const isTotal = prev.monto === total.toFixed(2);
                                  return {
                                    ...prev,
                                    aplicarIva: checked,
                                    monto: isTotal ? newTotal.toFixed(2) : prev.monto
                                  };
                                });
                              }}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${abonoForm.aplicarIva ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${abonoForm.aplicarIva ? 'transform translate-x-4' : ''}`}></div>
                          </div>
                          <div className="ml-3 text-xs font-bold text-slate-700 select-none">
                            Aplicar IVA (15%)
                          </div>
                        </label>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center text-xs">
                        <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Valor Total</span>
                        <span className="font-extrabold text-blue-600 font-mono text-base mt-1">{formatUSD(total)}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center text-xs">
                        <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Saldo Pendiente</span>
                        <span className="font-extrabold text-amber-600 font-mono text-base mt-1">
                          {proforma.estado === 'Pendiente'
                            ? formatUSD(total)
                            : formatUSD(editingAbono ? total - sumOtrosAbonos : totalPendiente)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Monto del Abono *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={abonoForm.monto}
                          onChange={e => setAbonoForm(prev => ({ ...prev, monto: e.target.value }))}
                          className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 font-mono font-bold focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex gap-2.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setAbonoForm(prev => ({ ...prev, monto: (proforma.estado === 'Pendiente' ? total : totalPendiente).toFixed(2) }))}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline"
                        >
                          Abono Total (100%)
                        </button>
                        {proforma.estado === 'Pendiente' && (
                          <button
                            type="button"
                            onClick={() => setAbonoForm(prev => ({ ...prev, monto: (total / 2).toFixed(2) }))}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline"
                          >
                            Abono 50%
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Detalles del Pago */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Caja / Método de Pago *
                      </label>
                      <select
                        required
                        value={abonoForm.metodoPagoId}
                        onChange={e => setAbonoForm(prev => ({ ...prev, metodoPagoId: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 font-semibold text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                      >
                        <option value="">Seleccione una caja...</option>
                        {metodosPago.map(m => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Referencia / N° Comprobante
                      </label>
                      <input
                        type="text"
                        value={abonoForm.referencia}
                        onChange={e => setAbonoForm(prev => ({ ...prev, referencia: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 placeholder-slate-400 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
                        placeholder="Ej. Transf 88910, Depósito, Efectivo"
                      />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAbono}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submittingAbono && (
                      <span
                        className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"
                        aria-hidden="true"
                      />
                    )}
                    {submittingAbono ? (editingAbono ? 'Guardando...' : 'Registrando...') : (editingAbono ? 'Guardar Cambios' : 'Confirmar Registro')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      </ModalPortal>

      {preview && (
        <ProformaPDF
          proforma={preview}
          configuracion={configuracion}
          onClose={() => setPreview(null)}
        />
      )}

    </div>
  );
};
