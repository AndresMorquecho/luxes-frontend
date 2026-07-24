import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrdenById, recepcionarOrden } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { formatDateOnlyES, toDateInputValue, todayDateInputValue } from '../../../../shared/utils/dateOnly.js';
import { ArrowLeft, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { isTallerUser } from '../../../../shared/utils/userRoleHelpers.js';

const fmtDate = (d) => formatDateOnlyES(d, { year: 'numeric', month: 'long', day: 'numeric' });


const mapDetalleFromOrden = (d, forceNoDescargable = false) => {
  const isDownloadable = forceNoDescargable
    ? false
    : d.material 
      ? (d.material.subtipo === 'consumible_descargable' || d.material.categoria === 'Impresión')
      : false;
  return {
    id: d.id,
    descripcion: d.descripcion,
    materialId: d.materialId,
    material: d.material,
    cantidadSolicitada: d.cantidad,
    cantidadRecibida: d.cantidadRecibida != null 
      ? String(d.cantidadRecibida) 
      : (isDownloadable ? '' : String(d.cantidad)),
    precioUnitario: d.precioUnitario,
    observacion: '',
    descargableInventario: forceNoDescargable ? false : (d.descargableInventario ?? isDownloadable),
    fechaRecepcion: d.fechaRecepcion
      ? toDateInputValue(d.fechaRecepcion)
      : todayDateInputValue(),
    yaRecibido: (d.cantidadRecibida ?? 0) > 0,
  };
};

export const RecepcionInsumosFormPage = ({ basePath = '/compras/recepcion' }) => {
  const { ordenId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isTaller = isTallerUser(user);

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detalles, setDetalles] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [showOrdenPDF, setShowOrdenPDF] = useState(false);

  // Fecha global de recepción
  const [fechaRecepcionGlobal, setFechaRecepcionGlobal] = useState(todayDateInputValue());

  const loadOrden = useCallback(async () => {
    const data = await getOrdenById(ordenId);
    const estadosValidos = ['aprobada', 'parcialmente_recibida'];
    if (!estadosValidos.includes(data.estado)) {
      toast.error('Esta orden no tiene productos pendientes por recibir');
      navigate(basePath);
      return null;
    }
    setOrden(data);
    setObservaciones(data.notasRecepcion || '');
    // Para taller: forzar descargableInventario=false en todos los items (solo registro)
    const isTallerLocal = isTallerUser(JSON.parse(localStorage.getItem('user') || 'null'));
    setDetalles((data.detalles || []).map(d => mapDetalleFromOrden(d, isTallerLocal)));
    return data;
  }, [ordenId, basePath, navigate]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (cancelled) return;
        await loadOrden();
      } catch (err) {
        if (!cancelled) {
          toast.error('Error al cargar la orden: ' + err.message);
          navigate(basePath);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [loadOrden, basePath, navigate]);

  const updateDetalle = (index, patch) => {
    setDetalles(prev => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const handleQtyChange = (index, rawVal) => {
    // Permitir string vacío mientras se edita, pero guardar como string
    const strVal = rawVal === '' ? '' : String(rawVal);
    const detail = detalles[index];
    const isDownloadable = detail.descargableInventario;
    if (!isDownloadable) {
      // Materiales no rastreables: limitar a cantidad solicitada
      const num = parseFloat(strVal) || 0;
      const capped = Math.min(num, detail.cantidadSolicitada);
      updateDetalle(index, { cantidadRecibida: String(capped) });
    } else {
      // Materiales descargables (rollos/lonas): metros libres
      updateDetalle(index, { cantidadRecibida: strVal });
    }
  };

  const handleRecepcionarTodo = async () => {
    // Validar que todos los pendientes tengan cantidad > 0
    const pendientesConCero = detalles.filter(d => !d.yaRecibido && !(parseFloat(d.cantidadRecibida) > 0));
    if (pendientesConCero.length > 0) {
      toast.error('Todos los productos deben tener una cantidad recibida mayor a 0');
      return;
    }

    const itemsParaRecepcionar = detalles.filter(d => !d.yaRecibido && (parseFloat(d.cantidadRecibida) || 0) > 0);

    if (itemsParaRecepcionar.length === 0) {
      toast.error('Ingresa al menos una cantidad mayor a 0 para recibir');
      return;
    }

    setSavingId('ALL');
    try {
      const payload = {
        notasRecepcion: observaciones || undefined,
        detalles: itemsParaRecepcionar.map(detalle => ({
          detalleId: detalle.id,
          materialId: detalle.materialId,
          cantidad: parseFloat(detalle.cantidadRecibida) || 0,
          fechaRecepcion: fechaRecepcionGlobal,
          // Taller nunca descuenta inventario: solo es registro
          descargableInventario: isTaller ? false : (detalle.descargableInventario === true && !!detalle.materialId),
          observacion: detalle.observacion || undefined,
        })),
      };

      const updated = await recepcionarOrden(orden.id, payload);

      const inventarioCount = payload.detalles.filter(d => d.descargableInventario).length;
      if (inventarioCount > 0) {
        toast.success(`Se recibieron ${payload.detalles.length} productos y se ingresaron al inventario.`);
      } else {
        toast.success(`Se recibieron ${payload.detalles.length} productos correctamente.`);
      }

      if (updated.estado === 'recibida') {
        toast.success('Orden de compra recibida en su totalidad');
        navigate(basePath);
      } else {
        await loadOrden();
      }
    } catch (err) {
      toast.error('Error al recibir los productos: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const mapOrdenToPDFFormat = (ordenData) => {
    if (!ordenData) return null;
    return {
      id: ordenData.numero,
      fechaCreacion: fmtDate(ordenData.fecha),
      estado: ordenData.estado?.toUpperCase() || 'APROBADA',
      proyectoNombre: ordenData.concepto || 'Sin especificar',
      proyectoId: 'N/D',
      comentarios: ordenData.notas || 'Sin observaciones',
      items: (ordenData.detalles || []).map(d => ({
        sku: d.material?.codigo || d.materialId || 'N/D',
        nombre: d.descripcion,
        cantidad: d.cantidad,
        cantidadSolicitada: d.cantidad,
        unidad: 'unidad',
        precioUnitario: d.precioUnitario,
      })),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          <p className="text-slate-500 font-medium text-sm">Cargando orden de compra...</p>
        </div>
      </div>
    );
  }

  if (!orden) return null;

  const pendientes = detalles.filter(d => !d.yaRecibido);
  const recibidos = detalles.filter(d => d.yaRecibido);

  const totalSumarInventario = detalles.filter(d => !d.yaRecibido && d.descargableInventario && (parseFloat(d.cantidadRecibida) || 0) > 0).length;
  const totalProductosRecibiendo = detalles.filter(d => !d.yaRecibido && (parseFloat(d.cantidadRecibida) || 0) > 0).length;

  return (
    <div className="pb-10" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header unificado, ordenado y minimalista - Con mayor tamaño */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={() => navigate(basePath)} 
            className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700 shadow-sm bg-white"
            title="Volver"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 flex-wrap">
              Recibir productos
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {orden.numero}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-50 text-orange-700 border border-orange-100">
                {recibidos.length}/{detalles.length} recibidos
              </span>
            </h2>
            <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
              Proveedor: <strong className="text-slate-600 font-semibold">{orden.proveedor?.nombre || 'Sin proveedor'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Botón Ver OC */}
          {!isTaller && (
            <button 
              type="button" 
              onClick={() => setShowOrdenPDF(true)} 
              className="px-3.5 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm bg-white"
            >
              Ver OC original
            </button>
          )}

          {/* Selector de fecha de llegada */}
          <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm flex items-center gap-2 text-xs relative hover:border-slate-300 transition-colors">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Llegada:</span>
            <span className="font-bold text-slate-700">
              {fechaRecepcionGlobal ? fmtDate(fechaRecepcionGlobal) : 'Seleccionar'}
            </span>
            <div className="relative">
              <input 
                type="date"
                value={fechaRecepcionGlobal}
                onChange={(e) => setFechaRecepcionGlobal(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Calendar size={14} className="text-slate-400 hover:text-blue-500 cursor-pointer" />
            </div>
          </div>

          {/* Información del Usuario */}
          <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm flex items-center gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] uppercase">
              {user?.nombre ? user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('') : 'U'}
            </span>
            <div className="text-[10px]">
              <span className="font-bold text-slate-700 block leading-tight">{user?.nombre || 'Desconocido'}</span>
              <span className="text-[8px] text-slate-400 block uppercase tracking-wider leading-none mt-0.5">{user?.rol || 'Visor'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
          <span className="font-extrabold text-slate-800 text-sm">{pendientes.length} producto{pendientes.length !== 1 ? 's' : ''} por recibir</span>
          {!isTaller && (
            <button 
              type="button" 
              onClick={() => setShowOrdenPDF(true)} 
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Ver detalles de la OC
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 bg-slate-50/50 uppercase tracking-wider">
                <th className="text-left px-6 py-3.5">Producto</th>
                <th className="text-center px-6 py-3.5">Cantidad Ordenada</th>
                <th className="text-center px-6 py-3.5">Cantidad por Recibir</th>
                <th className="text-center px-6 py-3.5">Cantidad Recibida</th>
                <th className="text-center px-6 py-3.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((detalle, index) => {
                const qtyRecibidaVal = parseFloat(detalle.cantidadRecibida) || 0;
                const statusLabel = detalle.yaRecibido ? 'Completo' : (
                  qtyRecibidaVal === 0 ? 'Pendiente' : 
                  (qtyRecibidaVal < detalle.cantidadSolicitada ? 'Parcial' : 'Completo')
                );
                
                const statusBadgeStyle = (lbl) => {
                  if (lbl === 'Completo') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  if (lbl === 'Parcial') return 'bg-blue-50 text-blue-700 border-blue-100';
                  return 'bg-amber-50 text-amber-700 border-amber-100';
                };

                return (
                  <tr key={detalle.id} className={`border-b border-slate-100 transition-colors ${detalle.yaRecibido ? 'bg-slate-50/40 text-slate-400' : 'hover:bg-slate-50/30'}`}>
                    {/* Producto */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{detalle.descripcion}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">
                        SKU: {detalle.material?.codigo || detalle.materialId || 'N/D'}
                        {detalle.material && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider text-[8px] font-bold">
                            {detalle.material.categoria}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cantidad Ordenada */}
                    <td className="px-6 py-4 text-center font-semibold text-slate-600">
                      {isTaller
                        ? detalle.cantidadSolicitada
                        : `${detalle.cantidadSolicitada} ${detalle.descargableInventario ? 'rollo(s)' : (detalle.cantidadSolicitada === 1 ? 'unidad' : 'unidades')}`
                      }
                    </td>

                    {/* Cantidad por Recibir */}
                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                      {isTaller
                        ? (detalle.yaRecibido ? 0 : detalle.cantidadSolicitada)
                        : `${detalle.yaRecibido ? 0 : detalle.cantidadSolicitada} ${detalle.descargableInventario ? 'rollo(s)' : (detalle.cantidadSolicitada === 1 ? 'unidad' : 'unidades')}`
                      }
                    </td>

                    {/* Cantidad Recibida */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {detalle.yaRecibido ? (
                          <span className="font-bold text-slate-500">
                            {detalle.cantidadRecibida}
                            {!isTaller && ` ${detalle.descargableInventario ? 'm' : (detalle.material?.unidadMedida?.abreviacion || 'u')}`}
                          </span>
                        ) : isTaller ? (
                          /* Rol taller: solo cantidad recibida, sin unidad ni validación estricta */
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all max-w-[100px]">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={detalle.cantidadRecibida}
                              onChange={(e) => handleQtyChange(index, e.target.value)}
                              className="w-full text-center py-2 text-sm font-bold text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                            />
                          </div>
                        ) : detalle.descargableInventario ? (
                          /* Rol impresión — Material descargable (rollos/lonas): input en metros */
                          <div className="flex flex-col items-center gap-1">
                            <div className={`flex items-center rounded-lg overflow-hidden shadow-sm bg-white transition-all max-w-[120px] ${
                              !detalle.cantidadRecibida || parseFloat(detalle.cantidadRecibida) <= 0
                                ? 'border-2 border-red-300 focus-within:ring-2 focus-within:ring-red-400'
                                : 'border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent'
                            }`}>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={detalle.cantidadRecibida}
                                onChange={(e) => handleQtyChange(index, e.target.value)}
                                className="w-full text-center py-2 text-sm font-bold text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0.00"
                              />
                              <span className="pr-2.5 text-[11px] font-bold text-blue-500 bg-white select-none whitespace-nowrap">
                                m
                              </span>
                            </div>
                            {(!detalle.cantidadRecibida || parseFloat(detalle.cantidadRecibida) <= 0) && (
                              <span className="text-[10px] font-semibold text-red-500">Requerido</span>
                            )}
                          </div>
                        ) : (
                          /* Rol impresión — Material no rastreable (tintas, etc.): input de unidades */
                          <div className="flex flex-col items-center gap-1">
                            <div className={`flex items-center rounded-lg overflow-hidden shadow-sm bg-white transition-all max-w-[110px] ${
                              !detalle.cantidadRecibida || parseFloat(detalle.cantidadRecibida) <= 0
                                ? 'border-2 border-red-300 focus-within:ring-2 focus-within:ring-red-400'
                                : 'border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent'
                            }`}>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                max={detalle.cantidadSolicitada}
                                value={detalle.cantidadRecibida}
                                onChange={(e) => handleQtyChange(index, e.target.value)}
                                className="w-full text-center py-2 text-sm font-bold text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                              />
                              <span className="pr-2 text-[10px] font-bold text-slate-400 bg-white select-none whitespace-nowrap">
                                {detalle.material?.unidadMedida?.abreviacion || detalle.material?.unidadMedida?.nombre || 'u'}
                              </span>
                            </div>
                            {(!detalle.cantidadRecibida || parseFloat(detalle.cantidadRecibida) <= 0) && (
                              <span className="text-[10px] font-semibold text-red-500">Requerido</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusBadgeStyle(statusLabel)}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Alerta de Inventario en el footer de la tabla — solo para impresion */}
        {!isTaller && totalProductosRecibiendo > 0 && (
          <div className="px-6 py-4 bg-emerald-50/50 border-t border-slate-100 flex items-center gap-3 text-emerald-800 text-xs font-bold">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>
              Se recibirá{totalProductosRecibiendo !== 1 ? 'n' : ''} {totalProductosRecibiendo} producto{totalProductosRecibiendo !== 1 ? 's' : ''}
              {totalSumarInventario > 0 ? ` (de los cuales ${totalSumarInventario} se ingresará${totalSumarInventario !== 1 ? 'n' : ''} automáticamente al stock del inventario).` : '.'}
            </span>
          </div>
        )}
        {isTaller && totalProductosRecibiendo > 0 && (
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3 text-slate-600 text-xs font-medium">
            <CheckCircle2 size={16} className="text-slate-400 flex-shrink-0" />
            <span>Se registrará la recepción de {totalProductosRecibiendo} producto{totalProductosRecibiendo !== 1 ? 's' : ''}. No afecta el inventario.</span>
          </div>
        )}
      </div>

      {/* Notas de la Recepción - Fijo (no acordeón) */}
      {pendientes.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            Notas de la recepción
          </h3>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Agrega alguna observación o nota sobre esta recepción de mercancía (opcional)..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            rows={3}
            maxLength={250}
          />
          <div className="text-right text-[10px] text-slate-400 font-semibold mt-1">
            {observaciones.length}/250 caracteres
          </div>
        </div>
      )}

      {/* Acciones del Formulario */}
      <div className="flex items-center justify-between gap-4 mt-8">
        <button 
          type="button" 
          onClick={() => navigate(basePath)} 
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors bg-white"
        >
          {pendientes.length === 0 ? 'Volver' : 'Cancelar'}
        </button>

        {pendientes.length > 0 && (
          <button 
            type="button" 
            disabled={savingId === 'ALL'}
            onClick={handleRecepcionarTodo}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-100 flex items-center gap-2"
          >
            {savingId === 'ALL' ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : null}
            Recibir producto y agregar a inventario
          </button>
        )}
      </div>

      {showOrdenPDF && orden && (
        <PDFPreviewModal
          isOpen
          onClose={() => setShowOrdenPDF(false)}
          oc={mapOrdenToPDFFormat(orden)}
          proyecto={{
            nombre: orden?.concepto || 'Sin proyecto asignado',
            id: 'N/D',
            responsable: orden?.usuario?.nombre || 'N/D',
            cliente: {
              empresa: orden?.proveedor?.nombre || 'Sin proveedor',
              nombre: orden?.proveedor?.contacto || 'N/D',
              direccion: orden?.proveedor?.direccion || 'N/D',
            },
          }}
          title="Orden de Compra"
        />
      )}
    </div>
  );
};
