// src/features/proyectos/ui/pages/ProyectoDetallePage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, ChevronLeft, AlertTriangle,
  DollarSign, Calendar, Tag, User, Eye, X, Edit3, Info,
  Plus, Trash2, FileText, CheckCircle, CheckCircle2, Check, Ban, ShoppingCart, Clock, HelpCircle, Wrench, Package, Layers
} from 'lucide-react';
import { useProyecto, enrichValidacionConImpresion } from '../../application/hooks/useProyecto.js';
import { useAutoAvanceInstalacionAdmin } from '../../application/hooks/useAutoAvanceInstalacionAdmin.js';
import { useProyectosContext } from '../../application/context/ProyectosContext.jsx';
import { usePrintQueueStable } from '../../../colas-impresion/context/PrintQueueContext.jsx';
import { updateOrden } from '../../../compras/application/comprasService.js';
import { getMetodosPago } from '../../../gastos/application/gastosService.js';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { toast } from '../../../../shared/ui/components/Toast';

import { FaseTimeline } from '../components/FaseTimeline.jsx';
import { DynamicFaseTimeline } from '../components/DynamicFaseTimeline.jsx';
import { DynamicFasePanel } from '../components/DynamicFasePanel.jsx';
import { DynamicFaseModal } from '../components/DynamicFaseModal.jsx';
import { FaseBadge } from '../components/FaseBadge.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { InstalacionPanel } from '../components/InstalacionPanel.jsx';
import { CotizacionPanel } from '../components/CotizacionPanel.jsx';
import { DisenoPanel } from '../components/DisenoPanel.jsx';
import { ProduccionPanel } from '../components/ProduccionPanel.jsx';
import { EntregaPanel } from '../components/EntregaPanel.jsx';
import { CompletadoPanel } from '../components/CompletadoPanel.jsx';
import { AluxFasesPanel } from '../components/AluxFasesPanel.jsx';
import { AluxGastosResumenPanel } from '../components/AluxGastosResumenPanel.jsx';
import { isPreloadedDefaultAluxFases } from '../../domain/value-objects/aluxFasesTemplate.js';
import { getTodayDateISO } from '../../domain/utils/proyectoDates.js';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { ProyectoDetallesModal } from '../components/ProyectoDetallesModal.jsx';
import { ProyectoEditModal } from '../components/ProyectoEditModal.jsx';
import { PRIORIDADES_CONFIG, ESTADOS_CONFIG } from '../../domain/value-objects/EstadoProyecto.js';
import { getFaseConfig, FASES } from '../../domain/value-objects/FaseConfig.js';
import { proyectoEstaVencido } from '../../domain/proyectoDisplayUtils.js';
import { isAdminUser, isTrabajadorUser } from '../../../../shared/utils/userRoleHelpers.js';

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

const formatGastoDateTime = (gasto) => {
  if (gasto.createdAt) {
    return formatDateTime(gasto.createdAt);
  }
  if (gasto.fecha) {
    const parts = gasto.fecha.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]} 09:00`;
    return `${gasto.fecha} 09:00`;
  }
  return '—';
};

export default function ProyectoDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { reloadProyectos } = useProyectosContext();


  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = isAdminUser(user);
  const isTrabajador = isTrabajadorUser(user);
  const canAddFase = isAdmin || isTrabajador;
  const userRole = (user?.rol || '').toLowerCase();

  const refreshKey = searchParams.get('refresh');
  const { proyecto, loading, avanzar, retroceder, updateProyecto, updateFaseDatos, validacionFaseActual: validacionBase } = useProyecto(id, { refreshKey });
  const { getJobsByProyectoId } = usePrintQueueStable();
  const [printQueueTick, setPrintQueueTick] = useState(0);

  useEffect(() => {
    const handlePrintQueueChange = () => setPrintQueueTick((t) => t + 1);
    window.addEventListener('print-queue-updated', handlePrintQueueChange);
    return () => window.removeEventListener('print-queue-updated', handlePrintQueueChange);
  }, []);

  const validacionFaseActual = React.useMemo(() => {
    return proyecto?.faseActual === 'PRODUCCION'
      ? enrichValidacionConImpresion(validacionBase, getJobsByProyectoId(id))
      : validacionBase;
  }, [proyecto?.faseActual, validacionBase, getJobsByProyectoId, id, printQueueTick]);

  useAutoAvanceInstalacionAdmin({
    proyectoId: id,
    proyecto,
    isAdmin,
    avanzar,
    reloadProyectos,
    validacionFaseActual,
  });
  const [faseVista, setFaseVista] = useState(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      return tab.toUpperCase();
    }
    return null;
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setFaseVista(tab.toUpperCase());
    }
  }, [searchParams]);
  const [subTab, setSubTab] = useState('fases'); // 'fases' | 'gastos'
  const [isPendingTab, startTabTransition] = React.useTransition();
  const handleSetSubTab = (val) => {
    startTabTransition(() => setSubTab(val));
  };
  const handleSetFaseVista = (val) => {
    startTabTransition(() => setFaseVista(val));
  };

  // Fases dinámicas del proyecto (Inicia únicamente con Cotización + bolita +)
  const dynamicFases = React.useMemo(() => {
    if (proyecto?.fasesAlux && Array.isArray(proyecto.fasesAlux)) {
      if (
        proyecto.faseActual === 'COTIZACION' &&
        isPreloadedDefaultAluxFases(proyecto.fasesAlux)
      ) {
        return [];
      }
      return proyecto.fasesAlux;
    }
    return [];
  }, [proyecto?.fasesAlux, proyecto?.faseActual]);

  const cleanedPreloadedFasesRef = useRef(false);
  useEffect(() => {
    cleanedPreloadedFasesRef.current = false;
  }, [proyecto?.id]);

  useEffect(() => {
    if (!proyecto || cleanedPreloadedFasesRef.current) return;
    if (
      proyecto.faseActual === 'COTIZACION' &&
      Array.isArray(proyecto.fasesAlux) &&
      isPreloadedDefaultAluxFases(proyecto.fasesAlux)
    ) {
      cleanedPreloadedFasesRef.current = true;
      updateProyecto({ fasesAlux: [], progreso: 0 });
    }
  }, [proyecto?.id, proyecto?.faseActual, proyecto?.fasesAlux, updateProyecto]);

  const [activeFaseId, setActiveFaseId] = useState(() => {
    return isAdmin ? 'fase-cotizacion' : 'fase-pendiente';
  });

  useEffect(() => {
    setActiveFaseId(isAdmin ? 'fase-cotizacion' : 'fase-pendiente');
    setFaseVista(null);
    setSubTab('fases');
  }, [id, isAdmin]);
  const [showFaseModal, setShowFaseModal] = useState(false);
  const [faseToEdit, setFaseToEdit] = useState(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Si el trabajador no tiene fases, mantener vista de alta; si hay fases, ir a la primera pendiente
  useEffect(() => {
    if (!isAdmin) {
      if (activeFaseId === 'fase-cotizacion' || activeFaseId === 'COTIZACION') {
        if (dynamicFases.length > 0) {
          const primeraPendiente = dynamicFases.find((f) => f.estado !== 'COMPLETADA') || dynamicFases[0];
          setActiveFaseId(primeraPendiente.id);
        } else {
          setActiveFaseId('fase-pendiente');
        }
      }
    }
  }, [isAdmin, dynamicFases, activeFaseId]);

  const isFasePendienteActive = activeFaseId === 'fase-pendiente';

  const cotizacionCompletada = Boolean(
    proyecto?.fases?.COTIZACION?.completada ||
    (proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas && proyecto.fases.COTIZACION.datos.cotizacionesSeleccionadas.length > 0)
  );

  const handleUpdateFases = (newFases) => {
    const totalPasos = isAdmin ? (1 + newFases.length) : Math.max(1, newFases.length);
    let done = (isAdmin && cotizacionCompletada) ? 1 : 0;
    newFases.forEach((f) => {
      if (f.estado === 'COMPLETADA') done += 1;
    });
    const nuevoProgreso = Math.round((done / totalPasos) * 100);

    updateProyecto({
      fasesAlux: newFases,
      progreso: nuevoProgreso,
    });
  };

  const handleUpdateSingleFase = (updatedFase) => {
    const updated = dynamicFases.map((f) => (f.id === updatedFase.id ? updatedFase : f));
    handleUpdateFases(updated);
  };

  const handleSaveFaseModal = (faseData) => {
    const exists = dynamicFases.some((f) => f.id === faseData.id);
    let updated;
    if (exists) {
      updated = dynamicFases.map((f) => (f.id === faseData.id ? { ...f, ...faseData } : f));
    } else {
      updated = [...dynamicFases, faseData];
      setActiveFaseId(faseData.id);
      setShowValidationErrors(false);
    }
    handleUpdateFases(updated);
  };

  const handleDeleteFase = (faseId) => {
    const updated = dynamicFases.filter((f) => f.id !== faseId);
    handleUpdateFases(updated);
    if (activeFaseId === faseId) {
      if (updated.length > 0) {
        setActiveFaseId(updated[0].id);
      } else {
        setActiveFaseId(isAdmin ? 'fase-cotizacion' : 'fase-pendiente');
      }
      setShowValidationErrors(false);
    }
  };

  const currentFaseIndex = dynamicFases.findIndex((f) => f.id === activeFaseId);
  const isCotizacionActive = isAdmin && (activeFaseId === 'fase-cotizacion' || activeFaseId === 'COTIZACION');
  const isCompletadoActive = activeFaseId === 'fase-completado' || activeFaseId === 'COMPLETADO';
  const currentDynamicFase = dynamicFases.find((f) => f.id === activeFaseId) || (isAdmin ? null : dynamicFases[0]);

  const handleDynamicAvanzar = () => {
    if (isCotizacionActive) {
      setShowValidationErrors(false);
      if (dynamicFases.length > 0) {
        setActiveFaseId(dynamicFases[0].id);
      } else {
        setActiveFaseId('fase-completado');
      }
    } else if (currentFaseIndex >= 0) {
      const activeFaseObj = dynamicFases[currentFaseIndex];
      if (activeFaseObj) {
        const tieneEvidencias = Array.isArray(activeFaseObj.evidencias) && activeFaseObj.evidencias.length > 0;
        const tieneObservaciones = Boolean(activeFaseObj.notas?.trim() || activeFaseObj.observaciones?.trim());

        if (!tieneEvidencias || !tieneObservaciones) {
          setShowValidationErrors(true);
          if (!tieneEvidencias && !tieneObservaciones) {
            toast.error('Para marcar esta fase como completada, debes subir al menos una evidencia fotográfica y registrar las observaciones.');
          } else if (!tieneEvidencias) {
            toast.error('Debes subir al menos una fotografía de evidencia antes de completar la fase.');
          } else {
            toast.error('Debes registrar las observaciones y detalles de la fase antes de completarla.');
          }
          return;
        }
      }

      setShowValidationErrors(false);
      const updated = dynamicFases.map((f, i) =>
        i === currentFaseIndex
          ? { ...f, estado: 'COMPLETADA', fechaCompletada: new Date().toISOString() }
          : f
      );
      handleUpdateFases(updated);
      toast.success(`Fase "${activeFaseObj?.nombre || 'actual'}" completada con éxito.`);

      if (currentFaseIndex + 1 < dynamicFases.length) {
        setActiveFaseId(dynamicFases[currentFaseIndex + 1].id);
      } else {
        setActiveFaseId('fase-completado');
      }
    } else if (isCompletadoActive) {
      setShowValidationErrors(false);
      updateProyecto({ estado: 'COMPLETADO', fechaCompletado: new Date().toISOString(), progreso: 100 });
    }
  };

  const handleDynamicRetroceder = () => {
    setShowValidationErrors(false);
    if (isCompletadoActive) {
      if (dynamicFases.length > 0) {
        setActiveFaseId(dynamicFases[dynamicFases.length - 1].id);
      } else if (isAdmin) {
        setActiveFaseId('fase-cotizacion');
      }
    } else if (currentFaseIndex > 0) {
      setActiveFaseId(dynamicFases[currentFaseIndex - 1].id);
    } else if (currentFaseIndex === 0 && isAdmin) {
      setActiveFaseId('fase-cotizacion');
    }
  };

  const [confirmAvanzar, setConfirmAvanzar] = useState(false);
  const [confirmRetroceder, setConfirmRetroceder] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  useEffect(() => {
    if (isEditModalOpen && empleados.length === 0) {
      const token = localStorage.getItem('token');
      fetch('/api/empleados', {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setEmpleados(Array.isArray(data.data) ? data.data : []);
          }
        })
        .catch(err => console.error('Error al cargar empleados:', err));
    }
  }, [isEditModalOpen, empleados.length]);

  const handleSaveProjectInfoWithData = async (data) => {
    try {
      await updateProyecto({
        nombre: data.nombre,
        requiereInstalacion: data.requiereInstalacion,
        fechaEntregaEstimada: data.fechaEntregaEstimada || null,
        prioridad: data.prioridad,
        responsable: data.responsable,
        etiquetas: data.etiquetas,
        descripcion: data.descripcion,
        notas: data.notas,
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error al guardar datos del proyecto:', error);
    }
  };

  const canViewGastos = isAdmin;

  React.useEffect(() => {
    if (subTab === 'gastos' && !canViewGastos) {
      setSubTab('fases');
    }
  }, [subTab, canViewGastos]);

  React.useEffect(() => {
    if (!isDetailsModalOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isDetailsModalOpen]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Cargando proyecto...</p>
      </div>
    );
  }

  if (!proyecto) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Proyecto no encontrado</p>
        <button onClick={() => navigate('/proyectos')} className="text-blue-600 underline text-sm">
          Volver a proyectos
        </button>
      </div>
    );
  }

  const faseActiva = faseVista || proyecto.faseActual;
  const esVistaSoloLectura = faseActiva !== proyecto.faseActual;

  const faseConfig = getFaseConfig(faseActiva);
  const faseActualConfig = getFaseConfig(proyecto.faseActual);
  const prioridadConfig = PRIORIDADES_CONFIG[proyecto.prioridad] || PRIORIDADES_CONFIG.MEDIA;
  const estadoConfig = ESTADOS_CONFIG[proyecto.estado] || ESTADOS_CONFIG.ACTIVO;
  const esUltimaFase = proyecto.faseActual === 'COMPLETADO';
  const esPrimeraFase = proyecto.faseActual === 'COTIZACION';

  const estaVencido = proyectoEstaVencido(proyecto);

  const fasesCompletadas = FASES.filter(
    (f) => proyecto.fases?.[f.id]?.completada
  );

  const mostrarEstadoProyecto =
    proyecto.estado === 'PAUSADO' || proyecto.estado === 'CANCELADO';

  const handleAvanzar = () => {
    avanzar();
    setFaseVista(null);
    setConfirmAvanzar(false);
  };

  return (
    <div className="w-full pb-28 sm:pb-8 px-1 sm:px-4 animate-slide-up pd-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .pd-root, .pd-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
      `}</style>

      {/* Header del Proyecto */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-4 mb-2.5 sm:mb-4">
        <div className="w-full mx-auto space-y-2 sm:space-y-2.5">
          {/* Fila 1: navegación + título + acciones */}
          <div className="flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/proyectos')}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Volver a proyectos"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0 flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold text-slate-800 leading-snug min-w-0 truncate">
                  {proyecto.nombre}
                </h1>
                <span className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                  {proyecto.id}
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Editar información del proyecto"
                >
                  <Edit3 size={13} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Ver más detalles"
                >
                  <Eye size={13} />
                  Detalles
                </button>
              </div>
            )}
          </div>

          {/* Fila 2: metadatos a la izquierda + badges a la derecha */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-2.5 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-500 min-w-0">
              <span className="flex items-center gap-1 min-w-0" title="Cliente">
                <User size={12} className="shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="font-semibold text-slate-700">{proyecto.cliente?.empresa || proyecto.cliente?.nombre || 'Sin cliente'}</span>
                  {proyecto.cliente?.empresa && proyecto.cliente?.nombre && (
                    <span className="text-slate-400 ml-1 hidden sm:inline">({proyecto.cliente.nombre})</span>
                  )}
                </span>
              </span>

              <span
                className={`flex items-center gap-1 shrink-0 ${
                  estaVencido ? 'text-red-500 font-semibold' : 'text-slate-600'
                }`}
                title="Entrega estimada"
              >
                <Calendar size={12} className={`shrink-0 ${estaVencido ? 'text-red-500' : 'text-slate-400'}`} />
                <span>
                  {proyecto.fechaEntregaEstimada ? `Entrega: ${proyecto.fechaEntregaEstimada}` : 'Sin fecha de entrega'}
                </span>
              </span>

              {proyecto.responsable && (
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span>Resp: <strong className="text-slate-700 font-semibold">{proyecto.responsable}</strong></span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap sm:justify-end shrink-0">
              <span
                className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${
                  proyecto.prioridad === 'URGENTE'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : proyecto.prioridad === 'ALTA'
                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                    : proyecto.prioridad === 'MEDIA'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {proyecto.prioridad || 'MEDIA'}
              </span>

              {mostrarEstadoProyecto && (
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {proyecto.estado}
                </span>
              )}
              <FaseBadge faseId={proyecto.faseActual} proyecto={proyecto} size="sm" />
            </div>
          </div>
        </div>
      </div>

        <div className="space-y-2.5 sm:space-y-3.5">
          {/* Stepper Horizontal estilo Imagen 2 con bolita + */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-2.5 sm:p-4 relative">
            <DynamicFaseTimeline
              fases={dynamicFases}
              activeFaseId={activeFaseId}
              onSelectFase={(faseId) => {
                if (!isAdmin && (faseId === 'fase-cotizacion' || faseId === 'COTIZACION')) return;
                setActiveFaseId(faseId);
                setShowValidationErrors(false);
              }}
              onAddFaseClick={() => {
                setFaseToEdit(null);
                setShowFaseModal(true);
              }}
              cotizacionCompletada={cotizacionCompletada}
              proyectoCompletado={proyecto.estado === 'COMPLETADO'}
              canViewCotizacion={isAdmin}
              canAddFase={canAddFase}
            />
          </div>

          {/* Panel de la fase activa */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative">
            {isCotizacionActive ? (
              <>
                <div
                  className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50 rounded-t-2xl gap-2 sm:gap-3"
                  style={{ borderLeftColor: '#6366f1', borderLeftWidth: 4 }}
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                      Fase actual: Cotización
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Propuesta, proforma y montos aprobados del proyecto
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                    Cotización
                  </span>
                </div>
                <div className="p-3 sm:p-4">
                  <CotizacionPanel proyectoId={proyecto.id} />
                </div>
              </>
            ) : isFasePendienteActive || (!isAdmin && dynamicFases.length === 0) ? (
              <div className="p-5 sm:p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Plus size={28} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Agregar fases del proyecto
                  </h2>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto mt-0.5">
                    Este proyecto aún no tiene fases operativas. Crea la primera fase para registrar avances, evidencias y observaciones.
                  </p>
                </div>
                {canAddFase && (
                  <button
                    type="button"
                    onClick={() => {
                      setFaseToEdit(null);
                      setShowFaseModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Plus size={16} />
                    Agregar primera fase
                  </button>
                )}
              </div>
            ) : isCompletadoActive ? (
              <div className="p-5 sm:p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={28} />
                </div>
                <div className="w-full max-w-2xl mx-auto space-y-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 text-center">
                    Fase Final: Entrega y Cierre del Proyecto
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 text-center leading-relaxed px-2 sm:px-6">
                    Al finalizar todas las fases del proyecto, puedes marcar el estado general como COMPLETADO para cerrar la obra o entrega.
                  </p>
                </div>
                <div className="pt-1 flex justify-center w-full">
                  {proyecto.estado === 'COMPLETADO' ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs sm:text-sm border border-emerald-300">
                      <CheckCircle2 size={16} />
                      ¡Proyecto Oficialmente Completado!
                    </span>
                  ) : isAdmin ? (
                    <button
                      type="button"
                      onClick={() => updateProyecto({ estado: 'COMPLETADO', fechaCompletado: new Date().toISOString(), progreso: 100 })}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      ✓ Marcar Proyecto como COMPLETADO
                    </button>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-500 font-medium text-center max-w-md mx-auto px-4">
                      Solo un administrador puede cerrar el proyecto como completado.
                    </p>
                  )}
                </div>
              </div>
            ) : currentDynamicFase ? (
              <div className="p-3 sm:p-4">
                <DynamicFasePanel
                  proyecto={proyecto}
                  fase={currentDynamicFase}
                  faseIndex={currentFaseIndex >= 0 ? currentFaseIndex : 0}
                  totalFases={dynamicFases.length}
                  onUpdateFase={handleUpdateSingleFase}
                  onDeleteFase={handleDeleteFase}
                  onOpenEditModal={() => {
                    setFaseToEdit(currentDynamicFase);
                    setShowFaseModal(true);
                  }}
                  onAddGasto={(f) => navigate(`/gastos?proyectoId=${proyecto.id}&faseId=${f.id}`)}
                  gastos={proyecto?.gastos || []}
                  showValidationErrors={showValidationErrors}
                  canDeleteFase={isAdmin}
                />
              </div>
            ) : null}

            {/* Acciones de fase (Footer: Retroceder / Marcar fase como completada) */}
            <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
              <div className="flex items-center">
                {((isAdmin && !isCotizacionActive) || (!isAdmin && (currentFaseIndex > 0 || isCompletadoActive))) && (
                  <button
                    type="button"
                    onClick={handleDynamicRetroceder}
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 hover:bg-slate-200/50 rounded-xl cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                    Fase anterior
                  </button>
                )}
              </div>

              <div>
                {!isCompletadoActive && !isFasePendienteActive && dynamicFases.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDynamicAvanzar}
                    className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-sm bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-emerald-950/20 active:scale-[0.99]"
                  >
                    <CheckCircle2 size={15} />
                    {isCotizacionActive ? 'Avanzar a primera fase' : 'Marcar fase como completada'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Detalles del Proyecto */}
      <ProyectoDetallesModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        proyecto={proyecto}
        estaVencido={estaVencido}
        canViewGastos={canViewGastos}
        fasesCompletadas={fasesCompletadas}
      />

      {/* Modal de Edición de Información Inicial */}
      <ProyectoEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        proyecto={proyecto}
        empleados={empleados}
        onSave={(data) => {
          handleSaveProjectInfoWithData(data);
          setIsEditModalOpen(false);
        }}
      />

      {/* Modal de Creación / Edición de Fases Dinámicas */}
      <DynamicFaseModal
        isOpen={showFaseModal}
        onClose={() => {
          setShowFaseModal(false);
          setFaseToEdit(null);
        }}
        onSave={handleSaveFaseModal}
        faseToEdit={faseToEdit}
        faseNumero={dynamicFases.length + 1}
        currentUser={user}
      />

    </div>
  );
}
