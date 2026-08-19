import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getProformaById, aprobarProforma, rechazarProforma, registrarAbonoProforma, editarAbonoProforma, eliminarAbonoProforma, saveProforma } from '../../application/proformasService';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { ProformaPDF } from '../components/ProformaPDF';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { useIsMobileSm } from '../../../../shared/hooks/useMediaQuery.js';
import { FileText, Calendar, CheckCircle2, User, Check, Edit2, Trash2, Download, Clock, ArrowLeft, Image as ImageIcon, Share2 } from 'lucide-react';
import { AbonoModal } from '../components/AbonoModal';
import { ComprobanteViewerModal } from '../components/ComprobanteViewerModal';
import { isAdminUser } from '../../../../shared/utils/userRoleHelpers.js';

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
  const [viewComprobanteUrl, setViewComprobanteUrl] = useState(null);
  const [abonoForm, setAbonoForm] = useState({
    monto: '',
    metodoPagoId: '',
    referencia: '',
    comprobanteUrl: null,
    aplicarIva: false,
  });
  const [submittingAbono, setSubmittingAbono] = useState(false);
  const isMobileSm = useIsMobileSm();
  // User auth state
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = isAdminUser(loggedInUser);

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
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!proforma) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <p className="text-slate-600 font-semibold mb-4">Proforma no encontrada</p>
        <button onClick={() => navigate('/proformas')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
          Volver a Proformas
        </button>
      </div>
    );
  }

const parseNum = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const num = parseFloat(String(v).replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

  const calculateRowValor = (item) => {
    if (item.valor !== undefined && item.valor !== null && !isNaN(parseNum(item.valor)) && parseNum(item.valor) > 0) {
      return parseNum(item.valor);
    }
    const qty = parseNum(item.cantidad) || 1;
    const price = parseNum(item.precioUnitario);
    const ancho = parseNum(item.ancho);
    const alto = parseNum(item.alto);
    const metraje = (ancho > 0 && alto > 0) ? (ancho * alto) : (parseNum(item.metraje) || 1);
    const metrajeTotal = (ancho > 0 && alto > 0) ? (qty * metraje) : (parseNum(item.metrajeTotal) || qty);
    return metrajeTotal * price;
  };

  const subtotal = (proforma.items || []).reduce((s, item) => s + calculateRowValor(item), 0);
  const descuentoVal = parseFloat(proforma.descuento) || 0;
  const total = Math.max(0, subtotal - descuentoVal + (proforma.iva ? subtotal * Number(proforma.iva) : 0));
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
    setAbonoForm(prev => ({
      ...prev,
      monto: '',
    }));
    setShowAbonoModal(true);
  };

  const handleOpenRegistrarAbono = () => {
    setAbonoForm(prev => ({
      ...prev,
      monto: '',
    }));
    setShowAbonoModal(true);
  };

  const handleCloseModal = () => {
    setShowAbonoModal(false);
    setEditingAbono(null);
    setAbonoForm({
      monto: '',
      metodoPagoId: metodosPago.length > 0 ? metodosPago[0].id : '',
      referencia: '',
      comprobanteUrl: null,
    });
  };

  const handleOpenEditarAbono = (abono) => {
    setEditingAbono(abono);
    setAbonoForm({
      monto: abono.monto.toString(),
      metodoPagoId: abono.metodoPago?.id || '',
      referencia: abono.referencia || '',
      comprobanteUrl: abono.comprobanteUrl || null,
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
    const numericMonto = parseFloat(abonoForm.monto || '0');
    
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
          comprobanteUrl: abonoForm.comprobanteUrl,
        });
        toast.success('Abono editado correctamente');
      } else if (proforma.estado === 'Pendiente') {
        updated = await aprobarProforma(proforma.id, {
          monto: numericMonto,
          metodoPagoId: abonoForm.metodoPagoId,
          referencia: abonoForm.referencia,
          aplicarIva: abonoForm.aplicarIva,
          comprobanteUrl: abonoForm.comprobanteUrl,
        });
        toast.success('Proforma aprobada y abono registrado correctamente');
      } else {
        updated = await registrarAbonoProforma(proforma.id, {
          monto: numericMonto,
          metodoPagoId: abonoForm.metodoPagoId,
          referencia: abonoForm.referencia,
          comprobanteUrl: abonoForm.comprobanteUrl,
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
      "60% DE ANTICIPO Y 40% CONTRAENTREGA",
      "ENTREGA DE 7-8 DIAS LABORABLES DESPUES DE LA CONFIRMACION DE PAGO",
      "ESTA COTIZACION ES VALIDA POR 3 DÍAS DESPUÉS DE SU EMISIÓN"
    ];
  };

  const estStyle = badgeStyle(proforma.estado);

  return (
    <div className="w-full pb-12" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Back button */}
      <div className="mb-4">
        <button onClick={() => navigate('/proformas')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5">
          <ArrowLeft size={16} /> Volver a Proformas
        </button>
      </div>

      {/* Excedente Alert Banner */}
      {proforma.excedente > 0.01 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-black text-sm shrink-0">!</div>
          <div>
            <strong className="font-extrabold text-amber-950 block text-sm mb-0.5">Excedente de Cobro (${proforma.excedente.toFixed(2)})</strong>
            <p className="text-amber-800 leading-relaxed font-medium">
              El valor total actual de la proforma es menor al monto total cobrado previamente. Si la empresa realiza una devolución de dinero (${proforma.excedente.toFixed(2)}) al cliente, recuerde registrar el movimiento manualmente en el <strong>Módulo de Gastos</strong> para mantener sincronizada la caja del día.
            </p>
          </div>
        </div>
      )}

      {/* Main Header Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">PROFORMA ALUX</span>
              <div className="flex items-center gap-2.5 mt-1.5">
                <h1 className="text-2xl font-black text-slate-900 leading-none">{proforma.id}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${estStyle.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${estStyle.dot}`} />
                  {proforma.estado === 'Pagada' ? 'Aprobada' : proforma.estado}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setPreview(proforma)}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download size={14} className="text-slate-500" /> Ver PDF Alux
            </button>

            {(isAdmin || isVentasODisenador) && (
              <button
                onClick={() => navigate(`/proformas/editar/${proforma.id}`)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Edit2 size={14} className="text-slate-500" /> Editar Proforma
              </button>
            )}

            {isAdmin && proforma.estado === 'Pendiente' && (
              <>
                <button
                  onClick={handleRechazar}
                  className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors"
                >
                  Rechazar Proforma
                </button>
                <button
                  onClick={handleOpenAprobar}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-blue-100"
                >
                  Aprobar
                </button>
              </>
            )}

            {isAdmin && (proforma.estado === 'Aprobada' || proforma.estado === 'Pagada') && totalPendiente > 0.01 && (
              <button
                onClick={handleOpenRegistrarAbono}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-blue-100"
              >
                Registrar Nuevo Abono
              </button>
            )}
          </div>
        </div>

        {/* Meta Info Row */}
        <div className="flex items-center gap-8 flex-wrap text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-slate-400" />
            <span>Fecha de emisión: <strong className="text-slate-700 font-bold">{formatFecha(proforma.fecha)}</strong></span>
          </div>
          
          {proforma.vencimiento && (
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-slate-400" />
              <span>Vence: <strong className="text-slate-700 font-bold">{formatFecha(proforma.vencimiento)}</strong></span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-slate-400" />
            <span>
              {proforma.estado === 'Pendiente' ? (
                'Pendiente de aprobación'
              ) : (
                <>Aprobada: <strong className="text-slate-700 font-bold">{proforma.fechaAprobacion ? formatDateTime(proforma.fechaAprobacion) : formatFecha(proforma.fecha)}</strong></>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Client & Emisión */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Cliente Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4">
              Cliente
            </h2>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <User size={22} />
              </div>
              <div className="min-w-0">
                <span className="block font-extrabold text-slate-800 text-sm">{proforma.cliente}</span>
                <span className="block text-xs text-slate-500 font-medium mt-1">
                  {proforma.telefono ? `Tel: ${proforma.telefono}` : ''}
                  {proforma.direccion ? `${proforma.telefono ? ' | ' : ''}Dir: ${proforma.direccion}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ejecutivo y validez Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-4">
              Ejecutivo y validez
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Atendido por</span>
                  <span className="block text-xs text-slate-700 font-bold uppercase mt-0.5">{proforma.atiende || 'No asignado'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Días de validez</span>
                  <span className="block text-xs text-slate-700 font-bold mt-0.5">{proforma.diasValidez || 3} días</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Share2 size={16} />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Medio</span>
                  <span className="block text-xs text-slate-700 font-bold uppercase mt-0.5">{proforma.medio || 'ALUX'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Condiciones de pago Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">
            Condiciones de pago
          </h2>
          <ul className="space-y-2">
            {getCondicionesList().map((cond, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-500 font-medium">
                <span className="w-4 h-4 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={10} strokeWidth={3} />
                </span>
                <span className="leading-snug">{cond}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Items Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Detalle de la Proforma Alux</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 bg-slate-50/70">
                <th className="text-center px-3 py-3.5 w-16">COD</th>
                <th className="text-center px-3 py-3.5 w-16">CANT</th>
                <th className="text-center px-3 py-3.5 w-20">ANCHO</th>
                <th className="text-center px-3 py-3.5 w-20">ALTO</th>
                <th className="text-center px-3 py-3.5 w-24">METRAJE</th>
                <th className="text-center px-3 py-3.5 w-28">M. TOTAL</th>
                <th className="text-left px-4 py-3.5">DESCRIPCIÓN</th>
                <th className="text-right px-4 py-3.5 w-32">VALOR UNIT.</th>
                <th className="text-right px-6 py-3.5 w-32">VALOR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(proforma.items || []).map((item, idx) => {
                const qty = parseFloat(item.cantidad) || 0;
                const ancho = parseFloat(item.ancho) || 0;
                const alto = parseFloat(item.alto) || 0;
                const metraje = (ancho > 0 && alto > 0) ? (ancho * alto) : (parseFloat(item.metraje) || 0);
                const metrajeTotal = (ancho > 0 && alto > 0) ? (qty * metraje) : (parseFloat(item.metrajeTotal) || qty);
                const rowValor = calculateRowValor(item);

                return (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-3 py-4 text-center text-slate-800 font-bold">{item.cod || `V${idx+1}`}</td>
                    <td className="px-3 py-4 text-center text-slate-700 font-mono font-bold">{qty}</td>
                    <td className="px-3 py-4 text-center text-slate-600 font-mono">{ancho > 0 ? ancho : '—'}</td>
                    <td className="px-3 py-4 text-center text-slate-600 font-mono">{alto > 0 ? alto : '—'}</td>
                    <td className="px-3 py-4 text-center text-slate-600 font-mono font-semibold">{metraje > 0 ? metraje.toFixed(2) : '—'}</td>
                    <td className="px-3 py-4 text-center text-slate-800 font-mono font-bold">{metrajeTotal.toFixed(2)}</td>
                    <td className="px-4 py-4 text-slate-800 font-semibold">{item.descripcion}</td>
                    <td className="px-4 py-4 text-right text-slate-600 font-mono font-semibold">{formatUSD(item.precioUnitario)}</td>
                    <td className="px-6 py-4 text-right text-slate-900 font-bold font-mono text-base">{formatUSD(rowValor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4 flex flex-col items-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-500 font-semibold">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-700">{formatUSD(subtotal)}</span>
            </div>
            {descuentoVal > 0 && (
              <div className="flex justify-between text-slate-500 font-semibold">
                <span>Descuento:</span>
                <span className="font-mono font-bold text-slate-700">- {formatUSD(descuentoVal)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 font-bold text-base border-t border-slate-200 pt-2">
              <span>Total Cotización:</span>
              <span className="font-mono text-blue-600 font-extrabold">{formatUSD(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments History Card */}
      {proforma.estado !== 'Pendiente' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-4">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800">Historial de Cobros y Abonos</h2>
            
            <div className="flex items-center gap-2 text-xs font-bold">
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
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-700">{ab.metodoPago?.nombre || 'Caja General'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDateTime(ab.fecha)}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-800 font-mono">{formatUSD(ab.monto)}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-[10px] text-slate-400 bg-slate-50 border border-slate-100/50 rounded-lg p-2">
                      {ab.referencia && (
                        <span><strong className="text-slate-500 font-semibold">Ref:</strong> {ab.referencia}</span>
                      )}
                      {ab.comprobanteUrl && (
                        <button
                          type="button"
                          onClick={() => setViewComprobanteUrl(ab.comprobanteUrl)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100 w-fit mt-0.5"
                        >
                          <ImageIcon size={12} />
                          Ver Comprobante
                        </button>
                      )}
                      <span><strong className="text-slate-500 font-semibold">Registrado por:</strong> {ab.registradoPor?.nombre || 'N/A'}</span>
                    </div>
                    {isAdmin && idx === proforma.abonos.length - 1 && (
                      <div className="flex justify-end gap-3 mt-1 pt-2 border-t border-dashed border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenEditarAbono(ab)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarAbono(ab.id)}
                          className="text-xs font-bold text-red-600 hover:text-red-800"
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
                    <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 bg-slate-50/70">
                      <th className="text-left px-6 py-3.5">Fecha y Hora</th>
                      <th className="text-left px-6 py-3.5">Caja / Cuenta</th>
                      <th className="text-left px-6 py-3.5">Comprobante</th>
                      <th className="text-left px-6 py-3.5">Usuario</th>
                      <th className="text-right px-6 py-3.5 font-semibold">Monto</th>
                      <th className="text-right px-6 py-3.5 w-48">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proforma.abonos.map((ab, idx) => (
                      <tr key={ab.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">{formatDateTime(ab.fecha)}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{ab.metodoPago?.nombre || 'General'}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                          <div className="flex flex-col gap-1 items-start">
                            {ab.referencia && <span className="text-slate-700 font-semibold">{ab.referencia}</span>}
                            {ab.comprobanteUrl ? (
                              <button
                                type="button"
                                onClick={() => setViewComprobanteUrl(ab.comprobanteUrl)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-[11px] font-bold border border-blue-100"
                                title="Ver Comprobante de Pago"
                              >
                                <ImageIcon size={13} />
                                Ver Comprobante
                              </button>
                            ) : (
                              !ab.referencia && <span className="text-slate-400">Sin comprobante</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-medium">{ab.registradoPor?.nombre || 'N/A'}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono">{formatUSD(ab.monto)}</td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin && idx === proforma.abonos.length - 1 && (
                            <div className="flex justify-end gap-3.5">
                              <button
                                onClick={() => handleOpenEditarAbono(ab)}
                                className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1"
                                title="Editar Abono"
                              >
                                <Edit2 size={13} />
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminarAbono(ab.id)}
                                className="text-red-600 hover:text-red-800 font-bold text-xs flex items-center gap-1"
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
            <div className="p-6 text-center text-slate-400 text-sm font-medium">
              No se han registrado abonos en esta proforma.
            </div>
          )}
        </div>
      )}

      {/* Watermark/Footer metadata */}
      {proforma.fechaAprobacion && (
        <div className="text-center text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-6">
          Última actualización: {formatDateTime(proforma.fechaAprobacion)}
        </div>
      )}

      {/* Abonos Modal Normalizado */}
      <AbonoModal
        open={showAbonoModal}
        onClose={handleCloseModal}
        title={
          editingAbono
            ? 'Editar Abono'
            : proforma.estado === 'Pendiente'
            ? 'Aprobación y Registro de Abono'
            : 'Registrar Abono'
        }
        subtitle={
          editingAbono
            ? 'Modifica los valores del abono registrado.'
            : 'Ingresa el monto del cobro y adjunta el comprobante opcional.'
        }
        proformaId={proforma.id}
        total={total}
        pending={
          proforma.estado === 'Pendiente'
            ? total
            : editingAbono
            ? total - sumOtrosAbonos
            : totalPendiente
        }
        monto={abonoForm.monto}
        setMonto={(val) => setAbonoForm((prev) => ({ ...prev, monto: val }))}
        metodoPagoId={abonoForm.metodoPagoId}
        setMetodoPagoId={(val) => setAbonoForm((prev) => ({ ...prev, metodoPagoId: val }))}
        metodosPago={metodosPago}
        referencia={abonoForm.referencia}
        setReferencia={(val) => setAbonoForm((prev) => ({ ...prev, referencia: val }))}
        comprobanteUrl={abonoForm.comprobanteUrl}
        setComprobanteUrl={(val) => setAbonoForm((prev) => ({ ...prev, comprobanteUrl: val }))}
        isApproval={proforma.estado === 'Pendiente'}
        onSubmit={handleSaveAbono}
        submitting={submittingAbono}
        submitText={editingAbono ? 'Guardar Cambios' : 'Confirmar Registro'}
      />

      {/* Modal Visor de Comprobante */}
      <ComprobanteViewerModal
        open={!!viewComprobanteUrl}
        url={viewComprobanteUrl}
        onClose={() => setViewComprobanteUrl(null)}
      />

      {preview && (
        <ProformaPDF
          proforma={preview}
          configuracion={configuracion}
          onClose={() => setPreview(null)}
        />
      )}

      <style>{`
        .co-desktop-only { display: block; }
        .co-mobile-only { display: none; }
        @media (max-width: 768px) {
          .co-desktop-only { display: none !important; }
          .co-mobile-only { display: block !important; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
