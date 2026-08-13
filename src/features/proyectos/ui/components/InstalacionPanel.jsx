// src/features/proyectos/ui/components/InstalacionPanel.jsx

import React, { useState, useEffect } from 'react';
import { 
  MapPin, Calendar, Users, Package, StickyNote, CheckCircle, 
  PlayCircle, AlertTriangle, FileText, CheckCircle2, X, Printer,
  HelpCircle, Eye, Wrench, Camera
} from 'lucide-react';
import { PersonalSelector } from './PersonalSelector.jsx';
import { useInstalacion } from '../../application/hooks/useInstalacion.js';
import { useProyectosContext } from '../../application/context/ProyectosContext.jsx';
import { ACTIONS } from '../../application/store/proyectosStore.js';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { getEncuestaSatisfaccion, encuestaFueEnviada } from '../../domain/encuestaUtils.js';
import { EncuestaResultadosView } from './EncuestaResultadosView.jsx';
import { getInstalacionCompletionBlockers, formatFechaHoraObra, resolveFechaHoraFin } from '../../domain/instalacionRules.js';
import { ProjectMediaImage } from '../../../../shared/ui/components/ProjectMediaImage.jsx';
import { resolveEvidenciaSrc } from '../../../../shared/utils/mediaUrl.js';

const SECCIONES = ['datos', 'personal', 'materiales', 'estado'];

/**
 * Panel completo de la fase de Instalación.
 * Divide la gestión en 4 secciones: datos, personal, materiales y estado.
 *
 * @param {{ proyectoId: string }} props
 */
export const InstalacionPanel = React.memo(function InstalacionPanel({ proyectoId }) {
  const {
    proyecto,
    datosInstalacion,
    empleados,
    personalAsignado,
    materiales,
    setPersonal,
    setMateriales,
    actualizarDatos,
  } = useInstalacion(proyectoId);

  const [seccionActiva, setSeccionActiva] = useState('datos');
  const [insumosOpen, setInsumosOpen] = useState(false);
  const [detallesMobileOpen, setDetallesMobileOpen] = useState(false);
  const { state, dispatch, adapter } = useProyectosContext();
  const [aprobaciones, setAprobaciones] = useState({}); // { [sku]: cantidad }
  const [comentarioOC, setComentarioOC] = useState('');
  const [printableOC, setPrintableOC] = useState(null); // OC a imprimir
  const [previewEvidencia, setPreviewEvidencia] = useState(null);

  useEffect(() => {
    if (!proyectoId || !adapter?.getById) return;
    adapter
      .getById(proyectoId)
      .then((proyectoFresh) => {
        if (proyectoFresh) {
          dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id: proyectoId, cambios: proyectoFresh } });
        }
      })
      .catch((err) => console.error('Error al cargar instalación:', err));
  }, [proyectoId, adapter, dispatch]);

  const ordenesProyecto = (state.ordenesCompra || []).filter(oc => oc.proyectoId === proyectoId);
  const evidencias = datosInstalacion.evidencias || [];

  // Custom Modal dialog state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'error' | 'confirm'
    onConfirm: null
  });

  const showModal = (title, message, type = 'success', onConfirm = null) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  const closeModal = () => {
    deferClose(() => setModalConfig(prev => ({ ...prev, isOpen: false })));
  };

  function handleRechazarOC(oc) {
    showModal(
      'Confirmar Rechazo',
      `¿Estás seguro de que deseas rechazar la solicitud de orden de compra ${oc.id}?`,
      'confirm',
      () => {
        dispatch({
          type: ACTIONS.RECHAZAR_ORDEN_COMPRA,
          payload: { id: oc.id }
        });

        // Guardar en localStorage
        const stored = localStorage.getItem('luxes_ordenes_compra');
        if (stored) {
          try {
            const list = JSON.parse(stored);
            const updated = list.map(o => o.id === oc.id ? { ...o, estado: 'RECHAZADA', comentarios: comentarioOC } : o);
            localStorage.setItem('luxes_ordenes_compra', JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
        }

        setComentarioOC('');
        setAprobaciones({});
        showModal('Rechazo Exitoso', `La orden de compra ${oc.id} ha sido rechazada.`, 'success');
      }
    );
  }

  function handleAprobarOC(oc) {
    let costoTotal = 0;
    const itemsActualizados = oc.items.map(item => {
      const qtyAprobada = aprobaciones[item.sku] !== undefined ? aprobaciones[item.sku] : item.cantidadSolicitada;
      costoTotal += qtyAprobada * item.precioUnitario;
      return {
        ...item,
        cantidadAprobada: qtyAprobada
      };
    });

    const materialesAprobados = itemsActualizados
      .filter(item => item.cantidadAprobada > 0)
      .map(item => ({
        nombre: item.nombre,
        sku: item.sku,
        cantidad: item.cantidadAprobada,
        unidad: item.unidad,
        precioUnitario: item.precioUnitario || 0,
        observacion: `Aprobado Compra (${oc.id})`,
        origen: 'compra'
      }));

    const nuevosMateriales = [...(proyecto?.fases?.INSTALACION?.datos?.materiales || []), ...materialesAprobados];

    // Actualizar proyecto en el store (sin agregar el total de la OC como gasto directo, se calcula por consumo)
    dispatch({
      type: ACTIONS.UPDATE_PROYECTO,
      payload: {
        id: proyecto.id,
        cambios: {
          fases: {
            ...proyecto.fases,
            INSTALACION: {
              ...proyecto.fases?.INSTALACION,
              datos: {
                ...proyecto.fases?.INSTALACION?.datos,
                materiales: nuevosMateriales
              }
            }
          }
        }
      }
    });

    // Actualizar orden de compra en el store
    dispatch({
      type: ACTIONS.APROBAR_ORDEN_COMPRA,
      payload: {
        id: oc.id,
        items: itemsActualizados
      }
    });

    // Guardar en localStorage con los comentarios actualizados
    const stored = localStorage.getItem('luxes_ordenes_compra');
    if (stored) {
      try {
        const list = JSON.parse(stored);
        const updated = list.map(o => o.id === oc.id ? { ...o, estado: 'APROBADA', items: itemsActualizados, comentarios: comentarioOC } : o);
        localStorage.setItem('luxes_ordenes_compra', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }

    setComentarioOC('');
    setAprobaciones({});
    showModal(
      'Compra Aprobada', 
      `Orden de compra ${oc.id} aprobada con éxito. Los materiales han sido registrados en el inventario.`, 
      'success'
    );
  }

  function handleDatos(e) {
    const { name, value } = e.target;
    actualizarDatos({ [name]: value });
  }

  const bloqueosCierre = getInstalacionCompletionBlockers(datosInstalacion, { ordenesCompra: ordenesProyecto });
  const faseInstalacionMeta = proyecto?.fases?.INSTALACION || {};
  const { fechaFin: fechaFinObra, horaFin: horaFinObra } = resolveFechaHoraFin(
    datosInstalacion,
    faseInstalacionMeta,
  );
  const requisitosValidacion = [
    { ok: Boolean(datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion), label: 'Instalación iniciada en obra' },
    { ok: (datosInstalacion.personalAsignado?.length || 0) > 0, label: 'Equipo técnico asignado' },
    { ok: (datosInstalacion.evidencias?.length || 0) > 0, label: 'Evidencias fotográficas cargadas' },
    { ok: datosInstalacion.instalacionCompletada === true, label: 'Instalación cerrada en obra' },
  ];

  const metCount = requisitosValidacion.filter(r => r.ok).length;
  const totalCount = requisitosValidacion.length;
  const isFinalizado = datosInstalacion.instalacionCompletada;

  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
      
      {/* Header Resumido: Dirección + Estado + Badge de Avance */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50">
            <MapPin size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dirección de Instalación</span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              {datosInstalacion.direccionInstalacion || proyecto?.cliente?.direccion || 'Sin dirección registrada'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
            isFinalizado ? 'bg-emerald-50 text-emerald-700' :
            (datosInstalacion.fechaInstalacion ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')
          }`}>
            {isFinalizado ? 'Finalizada' : (datosInstalacion.fechaInstalacion ? 'En Montaje' : 'Por Iniciar')}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold text-slate-600 bg-slate-100">
            {metCount}/{totalCount} Requisitos
          </span>
        </div>
      </div>

      {/* Arriba: 2 Cajas lado a lado (Requisitos | Equipo Técnico) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Caja 1: Checklist de Requisitos */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-emerald-500" />
            Requisitos de Cierre
          </h4>

          <div className="space-y-2">
            {requisitosValidacion.map((req) => (
              <div
                key={req.label}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                  req.ok 
                    ? 'bg-emerald-50/50 text-emerald-900 font-semibold' 
                    : 'bg-slate-50 text-slate-500 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {req.ok ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                  )}
                  <span>{req.label}</span>
                </div>
                {req.ok && <span className="text-[10px] font-bold text-emerald-600 uppercase">OK</span>}
              </div>
            ))}
          </div>

          {datosInstalacion.notas && (
            <div className="p-3 bg-amber-50/50 rounded-xl text-xs text-amber-900 italic">
              <strong>Nota:</strong> {datosInstalacion.notas}
            </div>
          )}

          {datosInstalacion.notasCierre && (
            <div className="p-3 bg-emerald-50/50 rounded-xl text-xs text-emerald-900 italic">
              <strong>Informe Cierre:</strong> &quot;{datosInstalacion.notasCierre}&quot;
            </div>
          )}
        </div>

        {/* Caja 2: Equipo Técnico */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={15} className="text-violet-500" />
            Equipo Técnico ({personalAsignado.length})
          </h4>

          {personalAsignado.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-400 italic">
              No hay técnicos asignados a la obra.
            </div>
          ) : (
            <div className="space-y-2">
              {personalAsignado.map((p) => (
                <div key={p.empleadoId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 font-bold text-[10px] flex items-center justify-center">
                      {p.nombre.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-slate-800">{p.nombre}</span>
                  </div>
                  <span className="text-[9px] font-bold text-violet-600 bg-violet-100/60 px-2 py-0.5 rounded uppercase">
                    {p.rol || 'Taller'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Abajo: 1 Sola Caja Ancho Total (Evidencias Fotográficas) */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Camera size={15} className="text-slate-400" />
            Evidencias Fotográficas ({evidencias.length})
          </h4>
        </div>

        {evidencias.length === 0 ? (
          <div className="py-4 text-center bg-slate-50/50 rounded-xl">
            <p className="text-xs text-slate-400 italic">No se han subido evidencias fotográficas todavía.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {evidencias.map((evidencia, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPreviewEvidencia(resolveEvidenciaSrc(evidencia))}
                className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 cursor-pointer"
              >
                <ProjectMediaImage
                  evidencia={evidencia}
                  alt={`Evidencia ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visor Reutilizable de PDF */}
      <PDFPreviewModal
        isOpen={!!printableOC}
        onClose={() => setPrintableOC(null)}
        oc={printableOC}
        proyecto={proyecto}
        title="Orden de Compra"
      />

      {previewEvidencia && (
        <ModalPortal open>
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80"
            onClick={() => setPreviewEvidencia(null)}
          >
            <img
              src={previewEvidencia}
              alt="Evidencia ampliada"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </ModalPortal>
      )}

      {/* Modal Dialog de Alertas (Reemplazo de alert nativo) */}
      {modalConfig.isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-full ${
                modalConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                modalConfig.type === 'error' ? 'bg-red-50 text-red-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {modalConfig.type === 'success' && <CheckCircle2 size={22} />}
                {modalConfig.type === 'error' && <AlertTriangle size={22} />}
                {modalConfig.type === 'confirm' && <HelpCircle size={22} />}
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">{modalConfig.title}</h3>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">{modalConfig.message}</p>
            
            <div className="flex gap-2 justify-end">
              {modalConfig.type === 'confirm' && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const confirm = modalConfig.onConfirm;
                  closeModal();
                  if (confirm) deferClose(() => confirm());
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
});
