// src/features/proyectos/ui/components/InstalacionPanel.jsx

import React, { useState } from 'react';
import { 
  MapPin, Calendar, Users, Package, StickyNote, CheckCircle, 
  PlayCircle, AlertTriangle, FileText, CheckCircle2, X, Printer,
  HelpCircle, Eye, Wrench
} from 'lucide-react';
import { PersonalSelector } from './PersonalSelector.jsx';
import { MaterialesForm } from './MaterialesForm.jsx';
import { useInstalacion } from '../../application/hooks/useInstalacion.js';
import { useProyectosContext } from '../../application/context/ProyectosContext.jsx';
import { ACTIONS } from '../../application/store/proyectosStore.js';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { getEncuestaSatisfaccion, encuestaFueEnviada } from '../../domain/encuestaUtils.js';
import { EncuestaResultadosView } from './EncuestaResultadosView.jsx';
import { getInstalacionCompletionBlockers } from '../../domain/instalacionRules.js';

const SECCIONES = ['datos', 'personal', 'materiales', 'estado'];

/**
 * Panel completo de la fase de Instalación.
 * Divide la gestión en 4 secciones: datos, personal, materiales y estado.
 *
 * @param {{ proyectoId: string }} props
 */
export function InstalacionPanel({ proyectoId }) {
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
  const { state, dispatch } = useProyectosContext();
  const [aprobaciones, setAprobaciones] = useState({}); // { [sku]: cantidad }
  const [comentarioOC, setComentarioOC] = useState('');
  const [printableOC, setPrintableOC] = useState(null); // OC a imprimir
  const ordenesProyecto = (state.ordenesCompra || []).filter(oc => oc.proyectoId === proyectoId);

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
  const requisitosValidacion = [
    { ok: Boolean(datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion), label: 'Instalación iniciada en obra' },
    { ok: (datosInstalacion.personalAsignado?.length || 0) > 0, label: 'Equipo técnico asignado' },
    { ok: (datosInstalacion.materiales?.length || 0) > 0, label: 'Materiales registrados' },
    { ok: (datosInstalacion.evidencias?.length || 0) > 0, label: 'Evidencias fotográficas cargadas' },
    { ok: !datosInstalacion.instalacionCompletada, label: 'Instalación pendiente de cierre' },
  ];

  const metCount = requisitosValidacion.filter(r => r.ok).length;
  const totalCount = requisitosValidacion.length;
  const isFinalizado = datosInstalacion.instalacionCompletada;

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
            isFinalizado ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
            (datosInstalacion.fechaInstalacion ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100')
          }`}>
            <Wrench size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Obra</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
              {isFinalizado ? 'Finalizada' : (datosInstalacion.fechaInstalacion ? 'En Montaje' : 'Por Iniciar')}
            </span>
          </div>
        </div>

        {/* Start Date Card */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 border-slate-200/40 flex items-center justify-center shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inicio en Obra</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
              {datosInstalacion.fechaInstalacion ? `${datosInstalacion.fechaInstalacion} ${datosInstalacion.horaInstalacion || ''}` : 'No iniciado'}
            </span>
          </div>
        </div>

        {/* Team Card */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 border-slate-200/40 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Equipo Técnico</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
              {personalAsignado.length > 0 ? `${personalAsignado.length} Técnico${personalAsignado.length > 1 ? 's' : ''}` : 'Sin asignar'}
            </span>
          </div>
        </div>

        {/* Validation Check Card */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
            metCount === totalCount ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200/40'
          }`}>
            <CheckCircle size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requisitos</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
              {metCount} de {totalCount} cumplidos
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Details & Resources (col-span-2) */}
        <div className="lg:col-span-2 border border-slate-200/80 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          
          {/* Top Section: Obra & Dirección */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Detalles de la Obra</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dirección de Instalación</span>
                <p className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">
                  {datosInstalacion.direccionInstalacion || proyecto?.cliente?.direccion || 'Sin dirección registrada'}
                </p>
              </div>
              {datosInstalacion.fechaFin && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha Fin</span>
                  <p className="text-sm font-semibold text-slate-700 mt-1">
                    {datosInstalacion.fechaFin}
                  </p>
                </div>
              )}
            </div>

            {datosInstalacion.notas && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Notas del Proyecto</span>
                <p className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-lg border border-slate-100 whitespace-pre-line leading-relaxed">
                  {datosInstalacion.notas}
                </p>
              </div>
            )}

            {datosInstalacion.notasCierre && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Informe de Cierre (Taller)</span>
                <p className="text-xs text-slate-650 bg-emerald-50/20 p-3 rounded-lg border border-emerald-100/30 whitespace-pre-line italic leading-relaxed">
                  &quot;{datosInstalacion.notasCierre}&quot;
                </p>
              </div>
            )}
          </div>

          {/* Bottom Section: Insumos Retirados — Accordion Cards */}
          <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex-1 flex flex-col">
            {(() => {
              const insumosRetirados = materiales.filter(m => m.cantidadLlevada > 0);
              return (
                <>
                  {/* Accordion Header */}
                  <button
                    type="button"
                    onClick={() => setInsumosOpen(p => !p)}
                    className="w-full flex items-center justify-between gap-2 text-left mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <Package size={15} className="text-slate-400 shrink-0" />
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Insumos Retirados</h4>
                      {insumosRetirados.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                          {insumosRetirados.length}
                        </span>
                      )}
                    </div>
                    <span className={`text-slate-400 transition-transform duration-200 ${insumosOpen ? 'rotate-180' : ''}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                    </span>
                  </button>

                  {/* Accordion Body */}
                  {insumosRetirados.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No hay registro de materiales retirados.
                    </p>
                  ) : insumosOpen ? (
                    <div className="space-y-2 animate-slide-up">
                      {insumosRetirados.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm"
                        >
                          {/* Icon + Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                              <Package size={13} className="text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{m.nombre}</p>
                              {m.responsable && (
                                <p className="text-[10px] text-slate-400 truncate">{m.responsable}</p>
                              )}
                            </div>
                          </div>
                          {/* Quantity badge */}
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                            {m.cantidadLlevada}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">{m.unidad}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    insumosRetirados.length > 0 && (
                      <p className="text-xs text-slate-500 italic">
                        {insumosRetirados.length} insumo{insumosRetirados.length > 1 ? 's' : ''} retirado{insumosRetirados.length > 1 ? 's' : ''}. Toca para expandir.
                      </p>
                    )
                  )}
                </>
              );
            })()}
          </div>

        </div>

        {/* Right Side: Checklist & Assigned Team (col-span-1) */}
        <div className="border border-slate-200/80 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Validación de Requisitos</h3>
            </div>
            <div className="p-6 bg-slate-50/20">
              <div className="space-y-4">
                {requisitosValidacion.map((req) => (
                  <div
                    key={req.label}
                    className="flex items-start gap-3 text-xs"
                  >
                    {req.ok ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0 mt-0.5" />
                    )}
                    <span className={req.ok ? 'text-slate-400 line-through' : 'font-medium text-slate-650'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assigned Technicians Stacked Vertically */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-2 mb-3">
              <Users size={15} className="text-slate-400" />
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Técnicos Designados</h4>
            </div>
            {personalAsignado.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">
                No se ha asignado personal técnico a la obra.
              </p>
            ) : (
              <div className="space-y-3">
                {personalAsignado.map((p) => (
                  <div key={p.empleadoId} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-[10px] flex items-center justify-center border border-indigo-100/40">
                        {p.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-750 block leading-none">{p.nombre}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5 leading-none">{p.cargo || 'Técnico'}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/30 uppercase tracking-wider">
                      {p.rol || 'Taller'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Visor Reutilizable de PDF */}
      <PDFPreviewModal
        isOpen={!!printableOC}
        onClose={() => setPrintableOC(null)}
        oc={printableOC}
        proyecto={proyecto}
        title="Orden de Compra"
      />

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
}
