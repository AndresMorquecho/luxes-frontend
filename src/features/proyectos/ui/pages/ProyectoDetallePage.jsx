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
import { AluxCotizacionTab } from '../components/AluxCotizacionTab.jsx';
import { generateAluxFasesWithDates } from '../../domain/value-objects/aluxFasesTemplate.js';
import { getTodayDateISO } from '../../domain/utils/proyectoDates.js';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { ProyectoDetallesModal } from '../components/ProyectoDetallesModal.jsx';
import { ProyectoEditModal } from '../components/ProyectoEditModal.jsx';
import { PRIORIDADES_CONFIG, ESTADOS_CONFIG } from '../../domain/value-objects/EstadoProyecto.js';
import { getFaseConfig, FASES } from '../../domain/value-objects/FaseConfig.js';
import { proyectoEstaVencido } from '../../domain/proyectoDisplayUtils.js';
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
  const userRole = (user?.rol || '').toLowerCase();

  const { proyecto, loading, avanzar, retroceder, updateProyecto, updateFaseDatos, validacionFaseActual: validacionBase } = useProyecto(id);
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
      return proyecto.fasesAlux;
    }
    return [];
  }, [proyecto?.fasesAlux]);

  const [activeFaseId, setActiveFaseId] = useState('fase-cotizacion');
  const [showFaseModal, setShowFaseModal] = useState(false);
  const [faseToEdit, setFaseToEdit] = useState(null);

  const cotizacionCompletada = Boolean(
    proyecto?.fases?.COTIZACION?.completada ||
    (proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas && proyecto.fases.COTIZACION.datos.cotizacionesSeleccionadas.length > 0)
  );

  const handleUpdateFases = (newFases) => {
    const totalPasos = 1 + newFases.length;
    let done = cotizacionCompletada ? 1 : 0;
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
    }
    handleUpdateFases(updated);
  };

  const handleDeleteFase = (faseId) => {
    const updated = dynamicFases.filter((f) => f.id !== faseId);
    handleUpdateFases(updated);
    if (activeFaseId === faseId) {
      setActiveFaseId('fase-cotizacion');
    }
  };

  const currentFaseIndex = dynamicFases.findIndex((f) => f.id === activeFaseId);
  const isCotizacionActive = activeFaseId === 'fase-cotizacion' || activeFaseId === 'COTIZACION';
  const isCompletadoActive = activeFaseId === 'fase-completado' || activeFaseId === 'COMPLETADO';
  const currentDynamicFase = dynamicFases.find((f) => f.id === activeFaseId) || dynamicFases[0];

  const handleDynamicAvanzar = () => {
    if (isCotizacionActive) {
      if (dynamicFases.length > 0) {
        setActiveFaseId(dynamicFases[0].id);
      } else {
        setActiveFaseId('fase-completado');
      }
    } else if (currentFaseIndex >= 0) {
      const updated = dynamicFases.map((f, i) =>
        i === currentFaseIndex
          ? { ...f, estado: 'COMPLETADA', fechaCompletada: new Date().toISOString() }
          : f
      );
      handleUpdateFases(updated);

      if (currentFaseIndex + 1 < dynamicFases.length) {
        setActiveFaseId(dynamicFases[currentFaseIndex + 1].id);
      } else {
        setActiveFaseId('fase-completado');
      }
    } else if (isCompletadoActive) {
      updateProyecto({ estado: 'COMPLETADO', fechaCompletado: new Date().toISOString(), progreso: 100 });
    }
  };

  const handleDynamicRetroceder = () => {
    if (isCompletadoActive) {
      if (dynamicFases.length > 0) {
        setActiveFaseId(dynamicFases[dynamicFases.length - 1].id);
      } else {
        setActiveFaseId('fase-cotizacion');
      }
    } else if (currentFaseIndex > 0) {
      setActiveFaseId(dynamicFases[currentFaseIndex - 1].id);
    } else if (currentFaseIndex === 0) {
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

  const isVentasODisenador = userRole === 'ventas' || userRole === 'diseñador' || userRole === 'disenador' || userRole === 'ventas / diseñador' || userRole === 'ventas / disenador';
  const canViewGastos = !isVentasODisenador;

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
    <div className="w-full pb-20 md:pb-6 animate-slide-up pd-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .pd-root, .pd-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
      `}</style>

      {/* Header del Proyecto */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 mb-4 sm:mb-6">
        <div className="w-full mx-auto space-y-3">
          {/* Fila 1: navegación + título + acciones */}
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/proyectos')}
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Volver a proyectos"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug min-w-0 truncate">
                  {proyecto.nombre}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                  {proyecto.id}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Editar información del proyecto"
              >
                <Edit3 size={14} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Ver más detalles"
              >
                <Eye size={14} />
                Detalles
              </button>
            </div>
          </div>

          {/* Fila 2: metadatos a la izquierda + badges a la derecha */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 min-w-0">
              <span className="flex items-center gap-1.5 min-w-0" title="Cliente">
                <User size={13} className="shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="font-semibold text-slate-700">{proyecto.cliente?.empresa || proyecto.cliente?.nombre || 'Sin cliente'}</span>
                  {proyecto.cliente?.empresa && proyecto.cliente?.nombre && (
                    <span className="text-slate-400 ml-1">({proyecto.cliente.nombre})</span>
                  )}
                </span>
              </span>

              <span
                className={`flex items-center gap-1.5 shrink-0 ${
                  estaVencido ? 'text-red-500 font-semibold' : 'text-slate-600'
                }`}
                title="Entrega estimada"
              >
                <Calendar size={13} className={`shrink-0 ${estaVencido ? 'text-red-500' : 'text-slate-400'}`} />
                <span>
                  {proyecto.fechaEntregaEstimada ? `Entrega: ${proyecto.fechaEntregaEstimada}` : 'Sin fecha de entrega'}
                </span>
              </span>

              {proyecto.responsable && (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  <span>Resp: <strong className="text-slate-700 font-semibold">{proyecto.responsable}</strong></span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:justify-end shrink-0">
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: prioridadConfig.bgColor, color: prioridadConfig.textColor }}
              >
                {prioridadConfig.label}
              </span>
              {mostrarEstadoProyecto && (
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: estadoConfig.bgColor, color: estadoConfig.textColor }}
                >
                  {estadoConfig.label}
                </span>
              )}
              <FaseBadge faseId={proyecto.faseActual} proyecto={proyecto} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleSetSubTab('fases')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            subTab === 'fases'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers size={16} />
          Flujo de Trabajo
        </button>

        <button
          type="button"
          onClick={() => handleSetSubTab('cotizacion')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            subTab === 'cotizacion'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={16} />
          Cotización
        </button>

        {canViewGastos && (
          <button
            type="button"
            onClick={() => handleSetSubTab('gastos')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'gastos'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingCart size={16} />
            Gastos y Compras
          </button>
        )}
      </div>

        <div className={subTab === 'fases' ? 'block space-y-6' : 'hidden'}>
          {/* Stepper Horizontal estilo Imagen 2 con bolita + */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 relative">
            <DynamicFaseTimeline
              fases={dynamicFases}
              activeFaseId={activeFaseId}
              onSelectFase={(faseId) => setActiveFaseId(faseId)}
              onAddFaseClick={() => {
                setFaseToEdit(null);
                setShowFaseModal(true);
              }}
              cotizacionCompletada={cotizacionCompletada}
              proyectoCompletado={proyecto.estado === 'COMPLETADO'}
            />
          </div>

          {/* Panel de la fase activa */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative">
            {isCotizacionActive ? (
              <>
                <div
                  className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50 rounded-t-2xl gap-2 sm:gap-3"
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
                <div className="p-3 sm:p-6">
                  <CotizacionPanel proyectoId={proyecto.id} />
                </div>
              </>
            ) : isCompletadoActive ? (
              <div className="p-6 sm:p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Fase Final: Entrega y Cierre del Proyecto
                  </h2>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
                    Al finalizar todas las fases del proyecto, puedes marcar el estado general como COMPLETADO para cerrar la obra o entrega.
                  </p>
                </div>
                <div className="pt-2">
                  {proyecto.estado === 'COMPLETADO' ? (
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-sm border border-emerald-300">
                      <CheckCircle2 size={18} />
                      ¡Proyecto Oficialmente Completado!
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateProyecto({ estado: 'COMPLETADO', fechaCompletado: new Date().toISOString(), progreso: 100 })}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      ✓ Marcar Proyecto como COMPLETADO
                    </button>
                  )}
                </div>
              </div>
            ) : currentDynamicFase ? (
              <div className="p-3 sm:p-6">
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
                />
              </div>
            ) : null}

            {/* Acciones de fase (Footer: Retroceder / Avanzar) */}
            <div className="px-4 py-3 sm:px-6 sm:py-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-2xl">
              <div className="flex items-center">
                {!isCotizacionActive && (
                  <button
                    type="button"
                    onClick={handleDynamicRetroceder}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors px-4 py-2 hover:bg-slate-200/50 rounded-xl cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                    Retroceder a la fase anterior
                  </button>
                )}
              </div>

              <div>
                {!isCompletadoActive && (
                  <button
                    type="button"
                    onClick={handleDynamicAvanzar}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-sm bg-[#0b2d64] hover:bg-[#071f45] cursor-pointer shadow-blue-950/20 active:scale-[0.99]"
                  >
                    Avanzar a siguiente fase
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      {subTab === 'cotizacion' && (
        <div className="w-full mx-auto px-4 sm:px-6 py-3 sm:py-6">
          <AluxCotizacionTab proyecto={proyecto} onUpdateProyecto={updateProyecto} />
        </div>
      )}

      {canViewGastos && subTab === 'gastos' && (
        <div className="w-full mx-auto px-4 sm:px-6 py-3 sm:py-6">
          {proyecto?.medio === 'ALUX' || proyecto?.fasesAlux ? (
            <AluxGastosResumenPanel
              proyecto={proyecto}
              fases={proyecto.fasesAlux || generateAluxFasesWithDates(proyecto.fechaCreacion || proyecto.fechaInicio)}
              gastos={proyecto?.gastos || []}
              onAddGasto={(fase) => {
                navigate(`/gastos?proyectoId=${proyecto.id}&faseId=${fase.id}`);
              }}
            />
          ) : (
            <GastosComprasTab 
              proyecto={proyecto} 
              isAdmin={isAdmin} 
              updateProyecto={updateProyecto} 
              reloadProyectos={reloadProyectos} 
            />
          )}
        </div>
      )}

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

// ── Componente de Gastos y Compras del Proyecto ──────────────────────────────
const GastosComprasTab = React.memo(function GastosComprasTab({ proyecto, isAdmin, updateProyecto, reloadProyectos }) {
  const [showForm, setShowForm] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const [metodosPago, setMetodosPago] = useState([]);
  const [metodoPagoId, setMetodoPagoId] = useState('');

  useEffect(() => {
    getMetodosPago()
      .then(data => {
        setMetodosPago(data || []);
        if (data && data.length > 0) {
          setMetodoPagoId(data[0].id);
        }
      })
      .catch(err => console.error('Error cargando métodos de pago:', err));
  }, []);

  // Estados de aprobación de OC
  const [aprobaciones, setAprobaciones] = useState({});
  const [comentarioOC, setComentarioOC] = useState('');
  const [printableOC, setPrintableOC] = useState(null);
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [isGastosModalOpen, setIsGastosModalOpen] = useState(false);
  const [selectedOCForDetail, setSelectedOCForDetail] = useState(null);
  const [isAddGastoModalOpen, setIsAddGastoModalOpen] = useState(false);

  // Modal de confirmación
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
    onConfirm: null
  });

  const showModal = (title, message, type = 'success', onConfirm = null) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Totales (Ingreso por venta de proformas si existen, de lo contrario fallback al presupuesto estimado del proyecto)
  const cotizacionesSeleccionadas = proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas || [];
  const totalEstimado = cotizacionesSeleccionadas.length > 0
    ? cotizacionesSeleccionadas.reduce((sum, c) => sum + (Number(c.total) || 0), 0)
    : (Number(proyecto.montoEstimado) || 0);

  const totalGastos = (proyecto.gastos || []).reduce((sum, g) => sum + Number(g.monto), 0);
  const balance = totalEstimado - totalGastos;
  const porcentajeGastado = totalEstimado > 0 ? Math.min(100, (totalGastos / totalEstimado) * 100) : 0;

  const ingresoVenta = totalEstimado;
  const utilidadReal = ingresoVenta - totalGastos;
  const margenRentabilidad = ingresoVenta > 0 ? (utilidadReal / ingresoVenta) * 100 : 0;

  // Desglose de Gastos por Categoría
  const manualExpenses = (proyecto.gastos || []).filter(g => !g.id || !g.id.startsWith('G-OC-'));
  
  const totalGastosManuales = manualExpenses.reduce((sum, g) => sum + Number(g.monto), 0);

  const totalGastosOC = (proyecto.gastos || [])
    .filter(g => g.id && g.id.startsWith('G-OC-'))
    .reduce((sum, g) => sum + Number(g.monto), 0);

  // Registrar gasto manual
  const handleAddManualGasto = (e) => {
    e.preventDefault();
    if (!concepto.trim() || !monto || parseFloat(monto) <= 0 || !metodoPagoId) {
      showModal('Error', 'Por favor, complete todos los campos requeridos.', 'error');
      return;
    }

    const selectedMPName = metodosPago.find(m => m.id === metodoPagoId)?.nombre || '';

    showModal(
      'Confirmar Registro de Gasto',
      `¿Estás seguro de que deseas registrar el gasto "${concepto.trim()}" por $${parseFloat(monto).toFixed(2)} pagado con "${selectedMPName}"?`,
      'confirm',
      async () => {
        const nuevoGasto = {
          id: `G-MAN-${Date.now()}`,
          concepto: concepto.trim(),
          monto: parseFloat(monto),
          fecha,
          proveedor: proveedor.trim() || 'Varios',
          notas: notas.trim(),
          metodoPagoId,
          registradoPorUserId: JSON.parse(localStorage.getItem('user') || '{}').id || null
        };

        const nuevosGastos = [...(proyecto.gastos || []), nuevoGasto];
        
        try {
          await updateProyecto({ gastos: nuevosGastos });
          setConcepto('');
          setMonto('');
          setProveedor('');
          setNotas('');
          setShowForm(false);
          if (reloadProyectos) reloadProyectos();
          showModal('Gasto Registrado', 'El gasto se ha guardado exitosamente en el proyecto.', 'success');
        } catch (err) {
          showModal('Error', 'No se pudo registrar el gasto: ' + err.message, 'error');
        }
      }
    );
  };

  // Eliminar gasto manual
  const handleDeleteGasto = (gasto) => {
    showModal(
      'Confirmar Eliminación',
      `¿Estás seguro de que deseas eliminar el gasto "${gasto.concepto}" por $${gasto.monto.toFixed(2)}? El dinero será devuelto a la cuenta "${gasto.metodoPago?.nombre || 'correspondiente'}".`,
      'confirm',
      async () => {
        const nuevosGastos = (proyecto.gastos || []).filter(g => g.id !== gasto.id);
        try {
          await updateProyecto({ gastos: nuevosGastos });
          if (reloadProyectos) reloadProyectos();
          showModal('Gasto Eliminado', 'El gasto ha sido eliminado y el monto fue devuelto a la cuenta de pago.', 'success');
        } catch (err) {
          showModal('Error', 'No se pudo eliminar el gasto: ' + err.message, 'error');
        }
      }
    );
  };

  // Aprobar OC
  const handleAprobarOC = async (oc) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) return;

    showModal(
      'Aprobar Orden de Compra',
      `¿Confirmas la aprobación de la orden de compra ${oc.numero}? Esto ingresará los materiales al inventario para su posterior consumo.`,
      'confirm',
      async () => {
        try {
          // Construir items aprobados
          let totalAprobado = 0;
          const detallesAprobados = oc.items.map(item => {
            const qtyAprob = aprobaciones[item.sku] !== undefined ? aprobaciones[item.sku] : item.cantidadSolicitada;
            totalAprobado += qtyAprob * item.precioUnitario;
            return {
              descripcion: item.nombre,
              cantidad: qtyAprob,
              precioUnitario: item.precioUnitario,
              materialId: item.materialId || null
            };
          });

          // Actualizar en el backend
          await updateOrden(oc.id, {
            estado: 'aprobada',
            detalles: detallesAprobados,
            aprobadoPorId: user.id,
            notas: comentarioOC.trim() || undefined
          });

          // Limpiar estados
          setAprobaciones({});
          setComentarioOC('');
          
          // Recargar proyectos para refrescar la lista y el total
          reloadProyectos();

          showModal(
            'Orden Aprobada', 
            `La orden ${oc.numero} ha sido aprobada con éxito. Los materiales han sido registrados en el inventario.`, 
            'success'
          );
        } catch (err) {
          showModal('Error', 'No se pudo aprobar la orden: ' + err.message, 'error');
        }
      }
    );
  };

  // Rechazar OC
  const handleRechazarOC = async (oc) => {
    showModal(
      'Rechazar Orden de Compra',
      `¿Estás seguro de que deseas rechazar la orden de compra ${oc.numero}?`,
      'confirm',
      async () => {
        try {
          await updateOrden(oc.id, {
            estado: 'rechazada',
            notas: comentarioOC.trim() || undefined
          });

          setComentarioOC('');
          reloadProyectos();

          showModal('Orden Rechazada', `La orden de compra ${oc.numero} ha sido rechazada.`, 'success');
        } catch (err) {
          showModal('Error', 'No se pudo rechazar la orden: ' + err.message, 'error');
        }
      }
    );
  };

  // Helper para mapear orden a formato PDF
  const mapOrdenToPDFFormat = (orden) => {
    if (!orden) return null;
    return {
      id: orden.numero,
      fechaCreacion: orden.fechaCreacion || '',
      estado: (orden.estado || 'PENDIENTE').toUpperCase(),
      proyectoNombre: orden.concepto || 'Compra de Materiales',
      comentarios: orden.notas || 'Sin observaciones.',
      items: (orden.items || []).map(d => ({
        sku: d.sku,
        nombre: d.nombre,
        cantidad: d.cantidadAprobada || d.cantidadSolicitada,
        precioUnitario: d.precioUnitario,
        unidad: d.unidad || 'unidad'
      }))
    };
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    const headers = ['Concepto', 'Proveedor', 'Caja/Cuenta', 'Registrado Por', 'Fecha/Hora', 'Monto'];
    const rows = (proyecto.gastos || []).map(g => [
      g.concepto,
      g.proveedor || '—',
      g.metodoPago?.nombre || 'No especificado',
      g.registradoPor?.nombre || 'General / Sistema',
      formatGastoDateTime(g),
      g.monto.toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gastos_proyecto_${proyecto.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Barra de Filtros y Acciones */}
      <div className="flex flex-wrap items-center gap-2.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer bg-white"
        >
          <FileText size={14} className="text-slate-400" />
          Exportar
        </button>

        {isAdmin && (
          <button
            onClick={() => setIsAddGastoModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Registrar Gasto
          </button>
        )}
      </div>

      {/* 1. Tarjetas KPI de Rentabilidad y Utilidad Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Ingresos por Venta</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">${ingresoVenta.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">Total presupuestado</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Gastos Totales</p>
            <h3 className="text-xl font-black text-red-650 mt-1">${totalGastos.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">Total ejecutado</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Utilidad Real (Ganancia)</p>
            <h3 className={`text-xl font-black mt-1 ${utilidadReal >= 0 ? 'text-emerald-600' : 'text-red-700'}`}>
              ${utilidadReal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">Resultado actual</p>
          </div>
          <div className={`p-3 rounded-xl ${utilidadReal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-700'}`}>
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Rentabilidad Neta</p>
            <h3 className={`text-xl font-black mt-1 ${utilidadReal >= 0 ? 'text-indigo-650' : 'text-red-600'}`}>
              {margenRentabilidad.toFixed(1)}%
            </h3>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">% sobre ingresos</p>
          </div>
          <div className={`p-3 rounded-xl ${utilidadReal >= 0 ? 'bg-indigo-50 text-indigo-650' : 'bg-red-50 text-red-600'}`}>
            {utilidadReal >= 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          </div>
        </div>
      </div>

      {/* 2. Listado Modular de Egresos y Compras */}
      <div className="space-y-6">
        
        {/* PANEL 1: GASTOS DIRECTOS */}
        {filtroTipo !== 'oc' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-in fade-in duration-200">
            <div className="lg:col-span-4 bg-slate-50/50 p-6 flex flex-col justify-between border-r border-slate-200">
              <div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm w-max mb-4 text-indigo-600">
                  <DollarSign size={20} />
                </div>
                <h2 className="font-extrabold text-slate-800 text-sm tracking-tight">Gastos Directos y Compras (Caja / Facturas)</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Egresos operativos manuales y compras facturadas de proveedores.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total ejecutado</span>
                <span className="text-xl font-black text-indigo-600 mt-1 block">${totalGastosManuales.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="lg:col-span-8 p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Registros recientes</h4>
                  <button
                    onClick={() => setIsGastosModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    Ver detalle
                  </button>
                </div>

                {(!proyecto.gastos || proyecto.gastos.length === 0) ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No hay gastos directos manuales registrados en este proyecto.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {proyecto.gastos.slice(-3).map((g, idx) => (
                      <div key={g.id || idx} className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-slate-400">
                            <FileText size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-700 text-xs block">{g.concepto}</span>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Registrado por {g.registradoPor?.nombre || 'General / Sistema'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-xs text-red-600 block">-${Number(g.monto).toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 block font-mono font-medium">{formatGastoDateTime(g)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: ÓRDENES DE COMPRA */}
        {filtroTipo !== 'manual' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-in fade-in duration-200">
            <div className="lg:col-span-4 bg-slate-50/50 p-6 flex flex-col justify-between border-r border-slate-200">
              <div>
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm w-max mb-4 text-emerald-600">
                  <ShoppingCart size={20} />
                </div>
                <h2 className="font-extrabold text-slate-800 text-sm tracking-tight">Órdenes de Compra del Proyecto</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Historial completo de solicitudes de compra para este proyecto.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total ejecutado</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">${totalGastosOC.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="lg:col-span-8 p-6 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Órdenes registradas</h4>
                </div>

                {(!proyecto.ordenesCompra || proyecto.ordenesCompra.length === 0) ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No hay solicitudes de orden de compra asociadas a este proyecto.
                  </div>
                ) : (
                  <div className="space-y-3 overflow-auto max-h-[350px] pr-1 thin-scrollbar">
                    {(proyecto.ordenesCompra || []).map((oc, idx) => {
                      const isPendiente = oc.estado === 'PENDIENTE';
                      const isAprobada = oc.estado === 'APROBADA';
                      const isRecibida = oc.estado === 'RECIBIDA';
                      return (
                        <div key={oc.id || idx} className="flex flex-wrap lg:flex-nowrap justify-between items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100 transition-colors">
                          <div className="min-w-[120px]">
                            <span className="font-bold text-slate-800 text-xs block">{oc.numero}</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isAprobada || isRecibida ? 'bg-emerald-500' :
                                isPendiente ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                              <span className={
                                isAprobada || isRecibida ? 'text-emerald-700' :
                                isPendiente ? 'text-amber-700' : 'text-red-700'
                              }>
                                Estado: {oc.estado}
                              </span>
                            </div>
                          </div>
                          
                          <div className="min-w-[100px]">
                            <span className="font-bold text-slate-700 text-xs block truncate max-w-[120px]" title={oc.proveedor?.nombre || '—'}>
                              {oc.proveedor?.nombre || '—'}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase font-black">Proveedor</span>
                          </div>

                          <div className="min-w-[100px]">
                            <span className="font-bold text-slate-700 text-xs block">
                              {oc.usuario?.nombre || 'General'}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase font-black">Solicitado por</span>
                          </div>

                          <div>
                            <span className="font-mono text-[10px] text-slate-400">{oc.fechaCreacion || oc.fecha}</span>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-xs text-slate-850">${oc.total.toFixed(2)}</span>
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              onClick={() => {
                                setPrintableOC(mapOrdenToPDFFormat(oc));
                                setIsPDFOpen(true);
                              }}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              title="Ver PDF"
                            >
                              <FileText size={12} />
                              Ver PDF
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: AGREGAR GASTO MANUAL --- */}
      {isAddGastoModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Plus size={18} className="text-indigo-600" />
                  Nuevo Gasto Manual
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddGastoModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <form 
                onSubmit={(e) => {
                  handleAddManualGasto(e);
                  setIsAddGastoModalOpen(false);
                }} 
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Concepto / Detalle</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Combustible montaje, Almuerzos equipo..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={concepto}
                      onChange={e => setConcepto(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Monto ($)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={monto}
                      onChange={e => setMonto(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Fecha</label>
                    <input
                      type="date"
                      required
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={fecha}
                      onChange={e => setFecha(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Proveedor / Beneficiario</label>
                    <input
                      type="text"
                      placeholder="Ej. Gasolinera Primax, Imprenta..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={proveedor}
                      onChange={e => setProveedor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Caja / Cuenta de Pago *</label>
                    <select
                      required
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      value={metodoPagoId}
                      onChange={e => setMetodoPagoId(e.target.value)}
                    >
                      <option value="">Seleccione una cuenta...</option>
                      {metodosPago.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({formatUSD(m.saldoActual || 0)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Notas Adicionales</label>
                  <input
                    type="text"
                    placeholder="Comentarios adicionales del egreso..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddGastoModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    + Guardar Gasto
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --- MODAL: DETALLE DE GASTOS DIRECTOS --- */}
      {isGastosModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-5xl w-full overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Detalle de Gastos Directos</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Listado completo de egresos manuales registrados en este proyecto</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGastosModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="overflow-auto max-h-[450px] border border-slate-100 rounded-xl pr-1 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="p-3 font-bold uppercase tracking-wider">Concepto</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Proveedor</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Caja / Cuenta</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Registrado Por</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Fecha / Hora</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-right">Monto</th>
                      {isAdmin && <th className="p-3 w-16 text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {manualExpenses.map((gasto, idx) => (
                      <tr key={gasto.id || idx} className="border-b border-slate-100 text-slate-650 hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-700">{gasto.concepto}</td>
                        <td className="p-3 text-slate-600">{gasto.proveedor || '—'}</td>
                        <td className="p-3 font-semibold text-slate-700">{gasto.metodoPago?.nombre || '—'}</td>
                        <td className="p-3 text-slate-600 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <User size={10} className="text-slate-400" />
                            {gasto.registradoPor?.nombre || 'General / Sistema'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[10px] whitespace-nowrap">{formatGastoDateTime(gasto)}</td>
                        <td className="p-3 text-right font-extrabold text-red-650">${gasto.monto.toFixed(2)}</td>
                        {isAdmin && (
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setIsGastosModalOpen(false);
                                handleDeleteGasto(gasto);
                              }}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Eliminar Gasto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                      <td colSpan="5" className="p-3 text-right uppercase tracking-wider text-[10px]">Total Gastos Directos:</td>
                      <td className="p-3 text-right text-sm font-extrabold text-red-700">${totalGastosManuales.toFixed(2)}</td>
                      {isAdmin && <td className="p-3"></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsGastosModalOpen(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* --- MODAL: DETALLE Y GESTIÓN DE ORDEN DE COMPRA --- */}
      {selectedOCForDetail && (() => {
        const oc = selectedOCForDetail;
        const isPendiente = oc.estado === 'PENDIENTE';
        const isAprobada = oc.estado === 'APROBADA';
        const isRecibida = oc.estado === 'RECIBIDA';
        const totalOC = (oc.items || []).reduce((sum, item) => {
          const qtyAprob = aprobaciones[item.sku] !== undefined ? aprobaciones[item.sku] : item.cantidadSolicitada;
          const currentQty = isPendiente ? qtyAprob : (item.cantidadAprobada || 0);
          return sum + (currentQty * item.precioUnitario);
        }, 0);
        
        return (
          <ModalPortal>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-150">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Detalle de Orden de Compra: {oc.numero}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Visualización de ítems solicitados y opciones de aprobación</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOCForDetail(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[500px] overflow-auto pr-1 thin-scrollbar">
                  <div className="overflow-x-auto border border-slate-100 rounded-xl pr-1 bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <th className="p-2.5 font-bold uppercase tracking-wider">SKU</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider">Material</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider text-center">Cant. Solicitada</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider text-center">Cant. Aprobar</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider text-right">Precio Unit.</th>
                          <th className="p-2.5 font-bold uppercase tracking-wider text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(oc.items || []).map((item, idx) => {
                          const qtyAprob = aprobaciones[item.sku] !== undefined ? aprobaciones[item.sku] : item.cantidadSolicitada;
                          const currentQty = isPendiente ? qtyAprob : (item.cantidadAprobada || 0);
                          const subtotal = currentQty * item.precioUnitario;
                          
                          return (
                            <tr key={idx} className="border-b border-slate-100 text-slate-650 hover:bg-slate-50/50">
                              <td className="p-2.5 font-mono text-[10px]">{item.sku}</td>
                              <td className="p-2.5 font-semibold text-slate-700">{item.nombre}</td>
                              <td className="p-2.5 text-center font-medium">{item.cantidadSolicitada} {item.unidad || 'ud'}s</td>
                              <td className="p-2.5 text-center font-bold text-slate-800">
                                {isPendiente && isAdmin ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.cantidadSolicitada}
                                    value={qtyAprob}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setAprobaciones(prev => ({ ...prev, [item.sku]: val }));
                                    }}
                                    className="w-16 border border-slate-250 rounded-lg px-2 py-1 text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                  />
                                ) : (
                                  <span>
                                    {(!isPendiente) ? `${item.cantidadAprobada} ${item.unidad || 'ud'}s` : `${item.cantidadSolicitada} ${item.unidad || 'ud'}s`}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-medium">${item.precioUnitario.toFixed(2)}</td>
                              <td className="p-2.5 text-right font-bold text-slate-800">${subtotal.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-bold text-slate-800 bg-slate-50/50 border-t border-slate-200">
                          <td colSpan="5" className="p-2.5 text-right uppercase tracking-wider text-[10px]">Costo Total:</td>
                          <td className="p-2.5 text-right text-sm font-extrabold text-indigo-900">${totalOC.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {oc.comentarios && (
                    <div className="bg-slate-50 border-l-4 border-slate-350 p-3 rounded-r-lg text-xs text-slate-650">
                      <strong>Comentarios de Solicitud:</strong> {oc.comentarios}
                    </div>
                  )}
                  
                  {isPendiente && isAdmin && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Comentarios / Observaciones de la Aprobación
                        </label>
                        <textarea
                          value={comentarioOC}
                          onChange={(e) => setComentarioOC(e.target.value)}
                          placeholder="Escribe el motivo de la aprobación, modificaciones en cantidades o comentarios..."
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={async () => {
                            await handleRechazarOC(oc);
                            setSelectedOCForDetail(null);
                          }}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg border border-red-200 shadow-sm transition-colors cursor-pointer"
                        >
                          Rechazar Solicitud
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleAprobarOC(oc);
                            setSelectedOCForDetail(null);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                        >
                          Aprobar y Registrar Gasto
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {(!isPendiente && (isAprobada || isRecibida)) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed">
                      <strong>Destino de Costo:</strong> Esta compra abastece el inventario físico de bodega. El costo de estos materiales **no se carga de forma directa al proyecto** para evitar duplicidades. Se registrará la imputación real del costo cuando la instalación registre el uso de los mismos en la sección de <strong>Consumo de Bodega</strong>.
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedOCForDetail(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

      {/* Visor Reutilizable de PDF */}
      <PDFPreviewModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        oc={printableOC}
        proyecto={proyecto}
        title="Vista Previa de Orden de Compra"
      />

      {/* Modal Dialog de Alertas */}
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
                    onClick={closeModal}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => {
                    closeModal();
                    if (modalConfig.onConfirm) {
                      modalConfig.onConfirm();
                    }
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
