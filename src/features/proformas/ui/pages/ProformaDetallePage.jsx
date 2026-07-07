import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProformaById, aprobarProforma, rechazarProforma, registrarAbonoProforma, editarAbonoProforma, eliminarAbonoProforma } from '../../application/proformasService';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { ProformaPDF } from '../components/ProformaPDF';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { useIsMobileSm } from '../../../../shared/hooks/useMediaQuery.js';

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

export const ProformaDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
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
          setAbonoForm(prev => ({ ...prev, metodoPagoId: metodos[0].id }));
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
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-slate-600 font-semibold mb-4">Proforma no encontrada</p>
        <button onClick={() => navigate('/proformas')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">
          Volver a Proformas
        </button>
      </div>
    );
  }

  const subtotal = (proforma.items || []).reduce((s, item) => s + Number(item.cantidad) * Number(item.precioUnitario), 0);
  const total = subtotal * (1 + Number(proforma.iva));
  const totalCobrado = (proforma.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
  const totalPendiente = Math.max(0, total - totalCobrado);
  
  const sumOtrosAbonos = editingAbono 
    ? (proforma.abonos || []).filter(ab => ab.id !== editingAbono.id).reduce((s, ab) => s + Number(ab.monto), 0)
    : 0;

  const handleRechazar = async () => {
    if (!window.confirm('¿Está seguro de que desea rechazar esta proforma?')) return;
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
    // Default abono form to total amount
    setAbonoForm(prev => ({
      ...prev,
      monto: total.toFixed(2),
    }));
    setShowAbonoModal(true);
  };

  const handleOpenRegistrarAbono = () => {
    // Default abono form to pending amount
    setAbonoForm(prev => ({
      ...prev,
      monto: totalPendiente.toFixed(2),
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
    });
  };

  const handleOpenEditarAbono = (abono) => {
    setEditingAbono(abono);
    setAbonoForm({
      monto: abono.monto.toString(),
      metodoPagoId: abono.metodoPago?.id || '',
      referencia: abono.referencia || '',
    });
    setShowAbonoModal(true);
  };

  const handleEliminarAbono = async (abonoId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este abono?')) return;
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
    
    if (isNaN(numericMonto) || numericMonto <= 0) {
      toast.error('Por favor, ingresa un monto válido mayor a $0');
      return;
    }

    const maxPermitted = proforma.estado === 'Pendiente' 
      ? total 
      : (editingAbono ? total - sumOtrosAbonos : totalPendiente);

    if (numericMonto > (maxPermitted + 0.01)) {
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

  const badgeStyle = (estado) => {
    switch (estado) {
      case 'Aprobada': return 'bg-emerald-50/70 text-emerald-700 border-emerald-200/60';
      case 'Rechazada': return 'bg-rose-50/70 text-rose-700 border-rose-200/60';
      case 'Pagada': return 'bg-blue-50/70 text-blue-700 border-blue-200/60';
      default: return 'bg-amber-50/70 text-amber-700 border-amber-200/60';
    }
  };

  return (
    <div className="w-full pb-12" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Back link */}
      <div className="mb-4">
        <button onClick={() => navigate('/proformas')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5">
          ← Volver a Proformas
        </button>
      </div>

      {/* Main Header Box */}
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-slate-800">Proforma: {proforma.id}</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${badgeStyle(proforma.estado === 'Pagada' ? 'Aprobada' : proforma.estado)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                (proforma.estado === 'Aprobada' || proforma.estado === 'Pagada') ? 'bg-emerald-500' : 
                proforma.estado === 'Rechazada' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
              {proforma.estado === 'Pagada' ? 'Aprobada' : proforma.estado}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Fecha de emisión: <strong className="text-slate-600 font-semibold">{proforma.fecha}</strong>
            {proforma.vencimiento && <> · Vence: <strong className="text-slate-600 font-semibold">{proforma.vencimiento}</strong></>}
            {proforma.fechaEnvio && <> · Enviada: <strong className="text-slate-600 font-semibold">{proforma.fechaEnvio}</strong></>}
            {proforma.fechaAprobacion && <> · Aprobada: <strong className="text-slate-600 font-semibold">{proforma.fechaAprobacion}</strong></>}
          </p>
        </div>
        
        {/* Top actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPreview(proforma)}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 animate-pulse-subtle"
            title="Ver PDF"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Ver PDF
          </button>

          {isAdmin && proforma.estado === 'Pendiente' && (
            <>
              <button
                onClick={handleRechazar}
                className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                Rechazar Proforma
              </button>
              <button
                onClick={handleOpenAprobar}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-blue-100 shrink-0"
              >
                Aprobar y Registrar Abono
              </button>
            </>
          )}

          {isAdmin && proforma.estado === 'Aprobada' && totalPendiente > 0.01 && (
            <button
              onClick={handleOpenRegistrarAbono}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shrink-0"
            >
              Registrar Nuevo Abono
            </button>
          )}
        </div>
      </div>

      {/* Grid Client & Emisión */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Client details card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
            Información del Cliente
          </h2>
          <div className="space-y-2 text-sm">
            <p className="text-slate-800 font-bold text-base">{proforma.cliente}</p>
            {proforma.email && (
              <p className="text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-600">Email:</span> {proforma.email}
              </p>
            )}
            {proforma.telefono && (
              <p className="text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-600">Teléfono:</span> {proforma.telefono}
              </p>
            )}
          </div>
        </div>

        {/* Emisión details card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
            Detalles del Ejecutivo y Emisión
          </h2>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Atendido por</span>
                <span className="text-slate-700 font-semibold">{proforma.atiende || 'No especificado'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Días de Validez</span>
                <span className="text-slate-700 font-semibold">{proforma.diasValidez} días</span>
              </div>
            </div>
            {proforma.condiciones && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Condiciones de pago</span>
                <span className="text-slate-500 text-xs whitespace-pre-line">{proforma.condiciones}</span>
              </div>
            )}
            {proforma.notas && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Observaciones</span>
                <span className="text-slate-500 text-xs italic">{proforma.notas}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Ítems de la Proforma</h2>
        </div>

        {isMobileSm ? (
          <div className="divide-y divide-slate-100">
            {(proforma.items || []).map((item, idx) => (
              <div key={idx} className="px-4 py-3 flex flex-col gap-1">
                <p className="text-sm font-semibold text-slate-800">{item.descripcion}</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Cant: <span className="font-mono font-semibold text-slate-700">{item.cantidad.toFixed(2)}</span></span>
                  <span>P/u: <span className="font-mono font-semibold text-slate-700">{formatUSD(item.precioUnitario)}</span></span>
                  <span className="font-mono font-bold text-slate-800">{formatUSD(item.cantidad * item.precioUnitario)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-600 bg-slate-50">
                  <th className="text-left px-6 py-3.5">Descripción</th>
                  <th className="text-center px-4 py-3.5 w-24">Cantidad</th>
                  <th className="text-right px-4 py-3.5 w-32">P. Unitario</th>
                  <th className="text-right px-4 py-3.5 w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(proforma.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 text-slate-800 font-medium">{item.descripcion}</td>
                    <td className="px-4 py-4 text-center text-slate-600 font-mono">{item.cantidad.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right text-slate-600 font-mono">{formatUSD(item.precioUnitario)}</td>
                    <td className="px-4 py-4 text-right text-slate-800 font-bold font-mono">{formatUSD(item.cantidad * item.precioUnitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Summary */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 flex flex-col items-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatUSD(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>IVA ({Number(proforma.iva * 100)}%):</span>
              <span className="font-mono font-semibold">{formatUSD(subtotal * Number(proforma.iva))}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold text-base border-t border-slate-200 pt-2">
              <span>Total Proforma:</span>
              <span className="font-mono text-blue-700">{formatUSD(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments History Card */}
      {proforma.estado !== 'Pendiente' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-800">Historial de Cobros y Abonos</h2>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-emerald-600">Cobrado: {formatUSD(totalCobrado)}</span>
              {totalPendiente > 0.01 ? (
                <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">
                  Pendiente: {formatUSD(totalPendiente)}
                </span>
              ) : (
                <span className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
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
                        <span><strong className="text-slate-500">Ref:</strong> {ab.referencia}</span>
                      )}
                      <span><strong className="text-slate-500">Registrado por:</strong> {ab.registradoPor?.nombre || 'N/A'}</span>
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
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-600 bg-slate-50">
                      <th className="text-left px-5 py-3">Fecha y Hora</th>
                      <th className="text-left px-5 py-3">Caja / Cuenta</th>
                      <th className="text-left px-5 py-3">Referencia</th>
                      <th className="text-left px-5 py-3">Usuario</th>
                      <th className="text-right px-5 py-3">Monto</th>
                      <th className="text-right px-5 py-3 w-40">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {proforma.abonos.map((ab, idx) => (
                      <tr key={ab.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-5 py-3 text-slate-600 font-mono text-xs">{formatDateTime(ab.fecha)}</td>
                        <td className="px-5 py-3 font-semibold text-slate-700">{ab.metodoPago?.nombre || 'General'}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{ab.referencia || 'N/A'}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{ab.registradoPor?.nombre || 'N/A'}</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-800 font-mono">{formatUSD(ab.monto)}</td>
                        <td className="px-5 py-3 text-right">
                          {isAdmin && idx === proforma.abonos.length - 1 && (
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => handleOpenEditarAbono(ab)}
                                className="text-blue-600 hover:text-blue-800 font-semibold text-xs flex items-center gap-1"
                                title="Editar Abono"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                </svg>
                                Editar
                              </button>
                              <button
                                onClick={() => handleEliminarAbono(ab.id)}
                                className="text-red-600 hover:text-red-800 font-semibold text-xs flex items-center gap-1"
                                title="Eliminar Abono"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
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
            <div className="p-6 text-center text-slate-400 text-sm">
              No se han registrado abonos en esta proforma.
            </div>
          )}
        </div>
      )}

      {showAbonoModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseModal} />
          
          {/* Box (Wider max-w-3xl) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden relative z-[201] animate-ve-modal-in" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                {editingAbono 
                  ? 'Editar Abono' 
                  : (proforma.estado === 'Pendiente' ? 'Aprobación y Registro de Abono' : 'Registrar Abono')}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSaveAbono} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Izquierda: Información Financiera y Monto */}
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {editingAbono 
                      ? 'Modifica los valores del abono. El total del abono no debe superar el saldo pendiente.'
                      : 'Ingresa el monto del cobro. Este abono puede representar la totalidad de la proforma o ser un pago parcial.'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center text-xs">
                      <span className="text-slate-400 font-medium text-[10px] uppercase">Valor Total</span>
                      <span className="font-bold text-blue-700 font-mono text-base mt-1">{formatUSD(total)}</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center text-xs">
                      <span className="text-slate-400 font-medium text-[10px] uppercase">Saldo Pendiente</span>
                      <span className="font-bold text-amber-700 font-mono text-base mt-1">
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
                        min="0.01"
                        required
                        value={abonoForm.monto}
                        onChange={e => setAbonoForm(prev => ({ ...prev, monto: e.target.value }))}
                        className="w-full pl-7 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
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
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Caja / Método de Pago *
                      </label>
                      <select
                        required
                        value={abonoForm.metodoPagoId}
                        onChange={e => setAbonoForm(prev => ({ ...prev, metodoPagoId: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej. Transf 88910, Depósito, Efectivo"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción en la parte inferior */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAbono}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-blue-200 flex items-center gap-1.5"
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
      )}

      {/* PDF Preview Portal */}
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
