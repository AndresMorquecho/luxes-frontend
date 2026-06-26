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
        observacion: `Aprobado Compra (${oc.id})`,
        origen: 'compra'
      }));

    const nuevosMateriales = [...(proyecto?.fases?.INSTALACION?.datos?.materiales || []), ...materialesAprobados];

    const gastosExistentes = proyecto?.gastos || [];
    const nuevoGasto = {
      id: `G-${Date.now()}`,
      concepto: `Materiales de Instalación - ${oc.id}`,
      monto: costoTotal,
      fecha: new Date().toISOString().split('T')[0]
    };
    const nuevosGastos = [...gastosExistentes, nuevoGasto];

    // Actualizar proyecto en el store
    dispatch({
      type: ACTIONS.UPDATE_PROYECTO,
      payload: {
        id: proyecto.id,
        cambios: {
          gastos: nuevosGastos,
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
      `Orden de compra ${oc.id} aprobada con éxito. Se registró un gasto de $${costoTotal.toFixed(2)} en el proyecto.`, 
      'success'
    );
  }

  function handleDatos(e) {
    const { name, value } = e.target;
    actualizarDatos({ [name]: value });
  }

  const tabs = [
    { id: 'datos', label: 'Datos', Icon: MapPin },
    { id: 'personal', label: 'Personal', Icon: Users },
    { id: 'materiales', label: 'Materiales', Icon: Package },
    { id: 'validacion', label: 'Validación', Icon: AlertTriangle },
    { id: 'estado', label: 'Estado', Icon: CheckCircle },
  ];

  const bloqueosCierre = getInstalacionCompletionBlockers(datosInstalacion, { ordenesCompra: ordenesProyecto });
  const requisitosValidacion = [
    { ok: Boolean(datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion), label: 'Instalación iniciada en obra' },
    { ok: (datosInstalacion.personalAsignado?.length || 0) > 0, label: 'Equipo técnico asignado' },
    { ok: (datosInstalacion.materiales?.length || 0) > 0, label: 'Materiales registrados' },
    {
      ok: ordenesProyecto.filter((oc) => (oc.estado || '').toUpperCase() === 'APROBADA').length === 0,
      label: 'Órdenes de compra aprobadas recibidas',
    },
    { ok: (datosInstalacion.evidencias?.length || 0) > 0, label: 'Evidencias fotográficas cargadas' },
    { ok: !datosInstalacion.instalacionCompletada, label: 'Instalación pendiente de cierre' },
  ];

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl">
      {/* Tabs internas */}
      <div className="flex border-b border-indigo-200 bg-white">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSeccionActiva(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2
              ${seccionActiva === id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ── Sección 1: Datos ── */}
        {seccionActiva === 'datos' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                <PlayCircle size={18} className="text-indigo-500" />
                Arranque de Instalación
              </h3>
              
              {datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion ? (
                <div className="flex items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <CheckCircle size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Instalación en marcha</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Inició el {datosInstalacion.fechaInstalacion} a las {datosInstalacion.horaInstalacion}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  La instalación aún no ha iniciado en el sitio.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Dirección de Instalación
              </label>
              <p className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                {datosInstalacion.direccionInstalacion || proyecto?.cliente?.direccion || 'Sin dirección registrada'}
              </p>
            </div>

            {datosInstalacion.notas && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                  Notas / Instrucciones Iniciales
                </label>
                <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3 shadow-sm whitespace-pre-line">
                  {datosInstalacion.notas}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Sección 2: Personal ── */}
        {seccionActiva === 'personal' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Personal técnico asignado por el taller para realizar este montaje.
            </p>
            {personalAsignado.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Sin personal asignado aún por el taller.
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="p-3 font-bold uppercase tracking-wider">Nombre / Cargo</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Rol de Instalación</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalAsignado.map((p) => (
                      <tr key={p.empleadoId} className="border-b border-slate-100 text-slate-600 hover:bg-slate-50/30">
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{p.nombre}</div>
                          <div className="text-[10px] text-slate-400">{p.cargo || 'Personal'}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            {p.rol || 'Técnico'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 italic">
                          {p.notas || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Sección 3: Materiales ── */}
        {seccionActiva === 'materiales' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Package size={16} className="text-indigo-500" />
                Materiales Llevados para la Instalación
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Detalle de materiales asignados y transportados por el equipo de montaje, junto con el responsable designado.
              </p>

              {materiales.filter(m => m.cantidadLlevada > 0).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Ningún material marcado para llevar aún por el taller.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="p-2.5 font-bold uppercase tracking-wider">Material</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider text-center">Cant. Llevada</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider text-center">Unidad</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider">Responsable</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materiales
                        .filter(m => m.cantidadLlevada > 0)
                        .map((m, idx) => (
                          <tr key={idx} className="border-b border-slate-100 text-slate-600">
                            <td className="p-2.5 font-semibold text-slate-700">{m.nombre}</td>
                            <td className="p-2.5 text-center font-extrabold text-indigo-600">{m.cantidadLlevada}</td>
                            <td className="p-2.5 text-center text-slate-500">{m.unidad}</td>
                            <td className="p-2.5">
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">
                                {m.responsable || 'Sin responsable designado'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 italic">{m.observacion || '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Sección 4: Validación (admin) ── */}
        {seccionActiva === 'validacion' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Requisitos que el taller debe cumplir antes de cerrar la obra en sitio.
            </p>
            <ul className="space-y-2">
              {requisitosValidacion.map((req) => (
                <li
                  key={req.label}
                  className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 border ${
                    req.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                  }`}
                >
                  {req.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {req.label}
                </li>
              ))}
            </ul>
            {bloqueosCierre.length > 0 && !datosInstalacion.instalacionCompletada ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
                <p className="font-bold mb-2">Pendiente para cierre:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {bloqueosCierre.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ) : datosInstalacion.instalacionCompletada ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 font-semibold">
                Todos los requisitos de cierre fueron cumplidos.
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 font-semibold">
                El taller puede cerrar la instalación en obra.
              </div>
            )}
          </div>
        )}

        {/* ── Sección 5: Estado ── */}
        {seccionActiva === 'estado' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              datosInstalacion.instalacionCompletada 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <CheckCircle size={24} className={datosInstalacion.instalacionCompletada ? 'text-emerald-600' : 'text-amber-500'} />
              <div>
                <p className="text-sm font-bold">
                  {datosInstalacion.instalacionCompletada ? 'Instalación Finalizada' : 'Instalación en Progreso'}
                </p>
                <p className="text-xs mt-0.5 opacity-90">
                  {datosInstalacion.instalacionCompletada 
                    ? `Completada en obra el ${datosInstalacion.fechaFin || 'recientemente'}`
                    : 'El equipo de taller aún se encuentra realizando las labores o preparando materiales.'}
                </p>
              </div>
            </div>

            {datosInstalacion.notasCierre && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notas de Cierre (Taller)</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line italic">
                  &quot;{datosInstalacion.notasCierre}&quot;
                </p>
              </div>
            )}

            {(() => {
              const encuesta = getEncuestaSatisfaccion(proyecto);
              if (encuesta?.completada) {
                return (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Calificaciones del Cliente
                    </h4>
                    <EncuestaResultadosView encuesta={encuesta} />
                  </div>
                );
              }
              if (datosInstalacion.instalacionCompletada && encuestaFueEnviada(proyecto)) {
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
                    Encuesta enviada — esperando respuesta del cliente.
                  </div>
                );
              }
              if (datosInstalacion.instalacionCompletada) {
                return (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                    La encuesta de satisfacción aún no ha sido enviada al cliente.
                  </div>
                );
              }
              return null;
            })()}
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
