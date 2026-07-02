// src/features/proyectos/ui/pages/ProyectoDetallePage.jsx

import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, ChevronLeft, AlertTriangle,
  DollarSign, Calendar, Tag, User, Eye, X,
  Plus, Trash2, FileText, CheckCircle, CheckCircle2, Check, Ban, ShoppingCart, Clock, HelpCircle, Wrench, Package
} from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import { useProyectosContext } from '../../application/context/ProyectosContext.jsx';
import { updateOrden } from '../../../compras/application/comprasService.js';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { FaseTimeline } from '../components/FaseTimeline.jsx';
import { FaseBadge } from '../components/FaseBadge.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { InstalacionPanel } from '../components/InstalacionPanel.jsx';
import { CotizacionPanel } from '../components/CotizacionPanel.jsx';
import { DisenoPanel } from '../components/DisenoPanel.jsx';
import { ProduccionPanel } from '../components/ProduccionPanel.jsx';
import { EntregaPanel } from '../components/EntregaPanel.jsx';
import { CompletadoPanel } from '../components/CompletadoPanel.jsx';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { PRIORIDADES_CONFIG, ESTADOS_CONFIG } from '../../domain/value-objects/EstadoProyecto.js';
import { getFaseConfig, FASES } from '../../domain/value-objects/FaseConfig.js';
import { proyectoEstaVencido } from '../../domain/proyectoDisplayUtils.js';

export default function ProyectoDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { reloadProyectos } = useProyectosContext();

  React.useEffect(() => {
    if (reloadProyectos) {
      reloadProyectos();
    }
  }, [location.pathname, location.search, reloadProyectos]);

  const { proyecto, loading, avanzar, retroceder, updateProyecto, updateFaseDatos, validacionFaseActual } = useProyecto(id);
  const [faseVista, setFaseVista] = useState(() => {
    const tab = searchParams.get('tab');
    if (tab && tab.toUpperCase() === 'PRODUCCION') {
      return 'PRODUCCION';
    }
    return null;
  });
  const [subTab, setSubTab] = useState('fases'); // 'fases' | 'gastos'
  const [confirmAvanzar, setConfirmAvanzar] = useState(false);
  const [confirmRetroceder, setConfirmRetroceder] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userRole = (user?.rol || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrador';
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
    setConfirmAvanzar(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-6 sm:pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-20 shadow-sm">
        <div className="w-full mx-auto space-y-3">
          {/* Fila 1: navegación + título */}
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate('/proyectos')}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shrink-0 -ml-1 sm:ml-0"
              aria-label="Volver a proyectos"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-snug min-w-0">
                {proyecto.nombre}
              </h1>
              <button
                onClick={() => setIsDetailsModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                title="Ver más detalles"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>

          {/* Fila 2: metadatos + badges */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-col gap-1.5 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1 min-w-0">
              <span className="flex items-center gap-1.5 min-w-0" title="Cliente">
                <User size={12} className="shrink-0 text-slate-400" />
                <span className="min-w-0 truncate">
                  <span className="font-medium text-slate-600">{proyecto.cliente.empresa}</span>
                  <span className="mx-1.5 text-slate-300 hidden sm:inline">•</span>
                  <span className="text-slate-500 sm:inline block sm:mt-0 mt-0.5">{proyecto.cliente.nombre}</span>
                </span>
              </span>

              <span
                className={`flex items-center gap-1.5 shrink-0 ${
                  estaVencido ? 'text-red-500' : 'text-slate-600'
                }`}
                title="Entrega estimada"
              >
                <Calendar size={12} className={`shrink-0 ${estaVencido ? 'text-red-500' : 'text-slate-400'}`} />
                <span className={`whitespace-nowrap ${estaVencido ? 'font-semibold' : 'font-medium'}`}>
                  {proyecto.fechaEntregaEstimada ? `Entrega: ${proyecto.fechaEntregaEstimada}` : 'Sin fecha de entrega'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap sm:justify-end sm:shrink-0">
              <span
                className="text-[11px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full"
                style={{ backgroundColor: prioridadConfig.bgColor, color: prioridadConfig.textColor }}
              >
                {prioridadConfig.label}
              </span>
              {mostrarEstadoProyecto && (
                <span
                  className="text-[11px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full"
                  style={{ backgroundColor: estadoConfig.bgColor, color: estadoConfig.textColor }}
                >
                  {estadoConfig.label}
                </span>
              )}
              <FaseBadge faseId={proyecto.faseActual} size="sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6">

        {/* Selector de sub-pestañas principales */}
        <div className="flex gap-1 sm:gap-2 border-b border-slate-200 pb-px overflow-x-auto">
          <button
            onClick={() => setSubTab('fases')}
            className={`px-3 sm:px-5 py-2.5 sm:py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0
              ${subTab === 'fases'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Flujo de Trabajo
          </button>
          {canViewGastos && (
            <button
              onClick={() => setSubTab('gastos')}
              className={`px-3 sm:px-5 py-2.5 sm:py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0
                ${subTab === 'gastos'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Gastos y Compras
            </button>
          )}
        </div>

        {subTab === 'fases' ? (
          <>
            {/* Timeline + Progreso */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-6 relative">
              <FaseTimeline 
                faseActual={proyecto.faseActual} 
                fases={proyecto.fases} 
                faseVista={faseActiva}
                onFaseClick={(fId) => setFaseVista(fId)}
                requiereInstalacion={proyecto.requiereInstalacion}
              />
          <div className="mt-3 sm:mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Progreso del proyecto</span>
              <span className="text-sm font-bold" style={{ color: faseConfig?.color }}>
                {proyecto.progreso}% — {faseConfig?.label}
              </span>
            </div>
            <ProgressBar progreso={proyecto.progreso} faseActual={proyecto.faseActual} height="h-4" />
          </div>
        </div>

        {/* Panel de fase actual / vista */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative">
          <div
            className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50 rounded-t-2xl gap-2 sm:gap-3"
            style={{ borderLeftColor: faseConfig?.color, borderLeftWidth: 4 }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="font-bold text-slate-800 text-sm sm:text-base truncate">
                  {esVistaSoloLectura ? `Historial: ${faseConfig?.label}` : `Fase actual: ${faseConfig?.label}`}
                </h2>
                {esVistaSoloLectura && (
                  <button 
                    onClick={() => setFaseVista(proyecto.faseActual)}
                    className="text-[10px] font-bold bg-white text-slate-500 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors uppercase tracking-wider shrink-0"
                  >
                    Ver actual
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{faseConfig?.descripcion}</p>
            </div>
            <FaseBadge faseId={faseActiva} />
          </div>

          <div className="p-3 sm:p-6">
            {faseActiva === 'INSTALACION' ? (
              <InstalacionPanel proyectoId={proyecto.id} soloLectura={esVistaSoloLectura} />
            ) : faseActiva === 'COTIZACION' ? (
              <CotizacionPanel proyectoId={proyecto.id} soloLectura={esVistaSoloLectura} />
            ) : faseActiva === 'DISEÑO' ? (
              <DisenoPanel proyectoId={proyecto.id} soloLectura={esVistaSoloLectura} />
            ) : faseActiva === 'PRODUCCION' ? (
              <ProduccionPanel proyectoId={proyecto.id} soloLectura={esVistaSoloLectura} />
            ) : faseActiva === 'ENTREGA' ? (
              <EntregaPanel proyectoId={proyecto.id} soloLectura={esVistaSoloLectura} />
            ) : faseActiva === 'COMPLETADO' ? (
              <CompletadoPanel proyectoId={proyecto.id} soloLectura={esVistaSoloLectura} />
            ) : (
              <div
                className="rounded-xl p-4 text-sm"
                style={{ backgroundColor: faseConfig?.bgColor, color: faseConfig?.color }}
              >
                {faseConfig?.descripcion}
                {faseConfig?.camposRequeridos?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-slate-600">
                    {faseConfig.camposRequeridos.map((campo) => (
                      <li key={campo} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border-2 border-current inline-block" />
                        {campo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Acciones de fase (Footer como en EditarFasePage) */}
          {!esVistaSoloLectura && (
            <div className="px-4 py-3 sm:px-6 sm:py-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 sm:gap-4 rounded-b-2xl">
              
              {/* Botón Retroceder (Izquierda) */}
              <div className="flex items-center">
              {!esPrimeraFase && (
                confirmRetroceder ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">¿Retroceder fase?</span>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmRetroceder(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors font-semibold">No</button>
                      <button onClick={() => { retroceder(); setConfirmRetroceder(false); }} className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm hover:bg-slate-800 transition-colors shadow-sm font-bold">Sí, retroceder</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRetroceder(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors px-4 py-2 hover:bg-slate-200/50 rounded-xl"
                  >
                    <ChevronLeft size={16} />
                    Retroceder a la fase anterior
                  </button>
                )
              )}
            </div>

            {/* Botón Avanzar (Derecha) */}
            {!esUltimaFase && (
              <div className="flex flex-col items-end gap-2 relative group">
                {confirmAvanzar ? (
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-600 font-medium hidden sm:block">¿Confirmas avanzar?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmAvanzar(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors font-semibold">No</button>
                      <button
                        onClick={handleAvanzar}
                        className="px-6 py-2.5 rounded-xl text-sm text-white font-bold transition-colors shadow-sm"
                        style={{ backgroundColor: faseConfig?.color }}
                      >
                        Sí, confirmar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmAvanzar(true)}
                      disabled={!validacionFaseActual.valido}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: faseConfig?.color }}
                    >
                      Avanzar a siguiente fase
                      <ChevronRight size={16} />
                    </button>
                    
                    {/* Tooltip con campos faltantes */}
                    {!validacionFaseActual.valido && validacionFaseActual.faltantes.length > 0 && (
                      <div className="absolute bottom-full right-0 mb-3 hidden group-hover:block z-20">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-lg min-w-[200px]">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <p className="text-xs font-bold text-amber-700">Faltan campos para avanzar:</p>
                          </div>
                          <ul className="text-[10px] text-amber-600 space-y-0.5 ml-1">
                            {validacionFaseActual.faltantes.map((f) => (
                              <li key={f} className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-amber-500"></span> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </>
      ) : (
        <GastosComprasTab 
          proyecto={proyecto} 
          isAdmin={isAdmin} 
          updateProyecto={updateProyecto} 
          reloadProyectos={reloadProyectos} 
        />
      )}
      </div>

      {/* Modal de Detalles del Proyecto */}
      {isDetailsModalOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[200] flex flex-col sm:items-center sm:justify-center sm:p-4 bg-slate-900/55 backdrop-blur-sm"
            onClick={() => setIsDetailsModalOpen(false)}
            role="presentation"
          >
            <div
              className="bg-white w-full flex flex-col overflow-hidden shadow-xl
                h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[min(90vh,900px)] sm:max-w-4xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="proyecto-detalles-titulo"
            >
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <h2
                  id="proyecto-detalles-titulo"
                  className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 min-w-0"
                >
                  <Eye size={18} className="text-blue-600 shrink-0" />
                  <span className="truncate">Detalles del Proyecto</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
                  aria-label="Cerrar detalles"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Datos generales */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Información General</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Cliente</p>
                      <p className="text-sm font-semibold text-slate-700">{proyecto.cliente.nombre}</p>
                      <p className="text-xs text-slate-500">{proyecto.cliente.empresa}</p>
                      {proyecto.cliente.telefono && <p className="text-xs text-slate-500">{proyecto.cliente.telefono}</p>}
                      {proyecto.cliente.email && <p className="text-xs text-blue-600">{proyecto.cliente.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                        {(() => {
                            const cotizacionesSeleccionadas = proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas || [];
                            const ingresoVenta = cotizacionesSeleccionadas.length > 0
                                ? cotizacionesSeleccionadas.reduce((sum, c) => sum + (Number(c.total) || 0), 0)
                                : (Number(proyecto?.montoEstimado) || 0);
                            return ingresoVenta;
                        })() > 0 && (proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas?.length > 0) ? 'Ingreso por venta (Proformas)' : 'Monto estimado'}
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        ${(() => {
                            const cotizacionesSeleccionadas = proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas || [];
                            const ingresoVenta = cotizacionesSeleccionadas.length > 0
                                ? cotizacionesSeleccionadas.reduce((sum, c) => sum + (Number(c.total) || 0), 0)
                                : (Number(proyecto?.montoEstimado) || 0);
                            return ingresoVenta.toLocaleString('es-EC', { minimumFractionDigits: 2 });
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Entrega estimada</p>
                      <p className={`text-sm font-medium ${estaVencido ? 'text-red-500' : 'text-slate-700'}`}>
                        {estaVencido && <AlertTriangle size={12} className="inline mr-1" />}
                        {proyecto.fechaEntregaEstimada || 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                  {proyecto.etiquetas?.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Tag size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Etiquetas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {proyecto.etiquetas.map((tag) => (
                            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {proyecto.descripcion && (
                    <div className="pt-3 border-t border-slate-100 text-sm text-slate-600">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Descripción del trabajo</p>
                      {proyecto.descripcion}
                    </div>
                  )}

                  {/* Gastos del Proyecto — solo roles con acceso financiero */}
                  {canViewGastos && (
                  <div className="pt-3 border-t border-slate-100 text-sm">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Gastos Registrados</p>
                    {proyecto.gastos && proyecto.gastos.length > 0 ? (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {proyecto.gastos.map((gasto) => (
                          <div key={gasto.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg">
                            <div>
                              <p className="font-semibold text-slate-700">{gasto.concepto}</p>
                              <p className="text-[10px] text-slate-400">{gasto.fecha}</p>
                            </div>
                            <span className="font-bold text-red-600">-${gasto.monto.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-xs font-bold text-slate-700">
                          <span>Total Gastos:</span>
                          <span className="text-red-700">
                            -${proyecto.gastos.reduce((sum, g) => sum + g.monto, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No hay gastos registrados aún en este proyecto.</p>
                    )}
                  </div>
                  )}
                </div>
              </div>

              {/* Historial de fases */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Historial de Fases</h3>
                {fasesCompletadas.length === 0 ? (
                  <p className="text-sm text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">Sin fases completadas aún.</p>
                ) : (
                  <div className="space-y-3">
                    {fasesCompletadas.map((fase) => {
                      const config = getFaseConfig(fase.id);
                      const datos = proyecto.fases[fase.id];
                      return (
                        <div key={fase.id} className="flex items-start gap-3">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 mt-1.5 shadow-sm ring-2 ring-white"
                            style={{ backgroundColor: config?.color }}
                          />
                          <div className="flex-1 min-w-0 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-sm font-bold text-slate-700">{config?.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{datos.fechaCompletada || 'Sin fecha registrada'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}

// ── Componente de Gastos y Compras del Proyecto ──────────────────────────────
function GastosComprasTab({ proyecto, isAdmin, updateProyecto, reloadProyectos }) {
  const [showForm, setShowForm] = useState(false);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');

  // Estados de aprobación de OC
  const [aprobaciones, setAprobaciones] = useState({});
  const [comentarioOC, setComentarioOC] = useState('');
  const [printableOC, setPrintableOC] = useState(null);
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [openGastos, setOpenGastos] = useState(false);
  const [openCompras, setOpenCompras] = useState(false);
  const [openBodega, setOpenBodega] = useState(false);

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

  // Consumo Estimado de Bodega (10% de desgaste para herramientas, 100% para consumibles)
  const materialesBodega = proyecto?.fases?.INSTALACION?.datos?.materiales || [];
  const costoMaterialesBodega = materialesBodega.reduce((sum, m) => {
    const cant = Number(m.cantidadLlevada !== undefined ? m.cantidadLlevada : (m.cantidad || 0));
    const price = Number(m.precioUnitario || 0);
    const isHerramienta = m.tipo === 'herramienta';
    const sub = isHerramienta ? (cant * price * 0.10) : (cant * price);
    return sum + sub;
  }, 0);

  const totalGastos = (proyecto.gastos || []).reduce((sum, g) => sum + Number(g.monto), 0) + costoMaterialesBodega;
  const balance = totalEstimado - totalGastos;
  const porcentajeGastado = totalEstimado > 0 ? Math.min(100, (totalGastos / totalEstimado) * 100) : 0;

  const ingresoVenta = totalEstimado;
  const utilidadReal = ingresoVenta - totalGastos;
  const margenRentabilidad = ingresoVenta > 0 ? (utilidadReal / ingresoVenta) * 100 : 0;

  // Desglose de Gastos por Categoría
  const totalGastosManuales = (proyecto.gastos || [])
    .filter(g => !g.id || !g.id.startsWith('G-OC-'))
    .reduce((sum, g) => sum + Number(g.monto), 0);

  const totalGastosOC = (proyecto.gastos || [])
    .filter(g => g.id && g.id.startsWith('G-OC-'))
    .reduce((sum, g) => sum + Number(g.monto), 0);

  const totalBodega = costoMaterialesBodega;

  // Registrar gasto manual
  const handleAddManualGasto = async (e) => {
    e.preventDefault();
    if (!concepto.trim() || !monto || parseFloat(monto) <= 0) return;

    const nuevoGasto = {
      id: `G-MAN-${Date.now()}`,
      concepto: concepto.trim(),
      monto: parseFloat(monto),
      fecha,
      proveedor: proveedor.trim() || 'Varios',
      notas: notas.trim()
    };

    const nuevosGastos = [...(proyecto.gastos || []), nuevoGasto];
    
    try {
      await updateProyecto({ gastos: nuevosGastos });
      setConcepto('');
      setMonto('');
      setProveedor('');
      setNotas('');
      setShowForm(false);
      showModal('Gasto Registrado', 'El gasto se ha guardado exitosamente en el proyecto.', 'success');
    } catch (err) {
      showModal('Error', 'No se pudo registrar el gasto: ' + err.message, 'error');
    }
  };

  // Eliminar gasto manual
  const handleDeleteGasto = (gasto) => {
    showModal(
      'Confirmar Eliminación',
      `¿Estás seguro de que deseas eliminar el gasto "${gasto.concepto}" por $${gasto.monto.toFixed(2)}?`,
      'confirm',
      async () => {
        const nuevosGastos = (proyecto.gastos || []).filter(g => g.id !== gasto.id);
        try {
          await updateProyecto({ gastos: nuevosGastos });
          showModal('Gasto Eliminado', 'El gasto ha sido eliminado con éxito.', 'success');
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

  return (
    <div className="space-y-6 animate-slide-up">
      {/* 1. Tarjetas KPI de Rentabilidad y Utilidad Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos por Venta */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Ingresos por Venta</p>
            <h3 className="text-xl font-black text-slate-800 mt-1">${ingresoVenta.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Gastos Totales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Gastos Totales</p>
            <h3 className="text-xl font-black text-red-600 mt-1">${totalGastos.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Utilidad Real (Ganancia) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Utilidad Real (Ganancia)</p>
            <h3 className={`text-xl font-black mt-1 ${utilidadReal >= 0 ? 'text-emerald-650' : 'text-red-700'}`}>
              ${utilidadReal.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className={`p-3 rounded-xl ${utilidadReal >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-700'}`}>
            <DollarSign size={20} />
          </div>
        </div>

        {/* Margen de Rentabilidad */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Rentabilidad Neta</p>
            <h3 className={`text-xl font-black mt-1 ${utilidadReal >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
              {margenRentabilidad.toFixed(1)}%
            </h3>
          </div>
          <div className={`p-3 rounded-xl ${utilidadReal >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
            {utilidadReal >= 0 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          </div>
        </div>
      </div>

      {/* Barra de progreso y Desglose de Gastos en una sola Card Minimalista */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
            <span>Margen de Utilidad sobre la Venta</span>
            <span className={utilidadReal >= 0 ? 'text-indigo-600 font-extrabold' : 'text-red-600 font-extrabold'}>
              {utilidadReal >= 0 ? `Ganancia: ${margenRentabilidad.toFixed(1)}%` : `Pérdida: ${margenRentabilidad.toFixed(1)}%`}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                utilidadReal < 0 ? 'bg-red-600' :
                margenRentabilidad < 30 ? 'bg-amber-500' :
                'bg-emerald-600'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, margenRentabilidad))}%` }}
            />
          </div>
        </div>

        {/* Desglose de Gastos Minimalista */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500/20 border border-indigo-500"></span>
            <span className="text-slate-400">Gastos Directos:</span>
            <span className="text-slate-700">${totalGastosManuales.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500"></span>
            <span className="text-slate-400">Compras (OC)::</span>
            <span className="text-slate-700">${totalGastosOC.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500/20 border border-amber-500"></span>
            <span className="text-slate-400">Consumo de Bodega:</span>
            <span className="text-slate-700">${totalBodega.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Acordeones en una sola fila (Vertical Layout) */}
      <div className="space-y-4">

        {/* 1. Acordeón de Gastos Directos y Compras */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div 
            onClick={() => setOpenGastos(!openGastos)}
            className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight size={18} className={`text-slate-500 transition-transform duration-200 ${openGastos ? 'rotate-90' : ''}`} />
              <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  Gastos Directos y Compras (Caja / Facturas)
                  <span className="text-[10px] font-black bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full border border-red-100">
                    Total: ${(totalGastosManuales + totalGastosOC).toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Egresos operativos manuales y compras facturadas de proveedores</p>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {isAdmin && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  {showForm ? 'Cancelar' : 'Registrar Gasto'}
                </button>
              )}
            </div>
          </div>

          {openGastos && (
            <div className="p-6 space-y-4 animate-in fade-in duration-150">
              {showForm && isAdmin && (
                <form onSubmit={handleAddManualGasto} className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nuevo Gasto Manual</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Notas Adicionales</label>
                      <input
                        type="text"
                        placeholder="Comentarios adicionales del egreso..."
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        value={notas}
                        onChange={e => setNotas(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                      + Guardar Gasto
                    </button>
                  </div>
                </form>
              )}

              {(!proyecto.gastos || proyecto.gastos.length === 0) ? (
                <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No hay gastos operativos o compras registradas en esta sección.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="p-3 font-bold uppercase tracking-wider">Concepto</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Proveedor</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Fecha</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-right">Monto</th>
                        {isAdmin && <th className="p-3 w-16 text-center">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {proyecto.gastos && proyecto.gastos.map((gasto, idx) => (
                        <tr key={gasto.id || idx} className="border-b border-slate-100 text-slate-650 hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-700">
                            <div className="flex items-center gap-2">
                              <span>{gasto.concepto}</span>
                              {gasto.id && gasto.id.startsWith('G-OC-') && (
                                <>
                                  {proyecto.ordenesCompra?.find(oc => oc.id === gasto.notas) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const matchingOC = proyecto.ordenesCompra.find(oc => oc.id === gasto.notas);
                                        setPrintableOC(mapOrdenToPDFFormat(matchingOC));
                                        setIsPDFOpen(true);
                                      }}
                                      className="text-indigo-600 hover:text-indigo-800 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-[9px]"
                                      title="Ver Orden de Compra"
                                    >
                                      <FileText size={10} />
                                      OC
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-3">{gasto.proveedor || '—'}</td>
                          <td className="p-3 text-slate-400">{gasto.fecha}</td>
                          <td className="p-3 text-right font-extrabold text-red-655">${gasto.monto.toFixed(2)}</td>
                          {isAdmin && (
                            <td className="p-3 text-center">
                              {gasto.id && gasto.id.startsWith('G-OC-') ? (
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded cursor-help" title="Gasto automático de OC aprobada. No se puede eliminar directamente.">OC</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGasto(gasto)}
                                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Eliminar Gasto"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-bold text-slate-800 border-t border-slate-200">
                        <td colSpan="3" className="p-3 text-right uppercase tracking-wider text-[10px]">Total Directos y Compras:</td>
                        <td className="p-3 text-right text-sm font-extrabold text-red-700">
                          ${(totalGastosManuales + totalGastosOC).toFixed(2)}
                        </td>
                        {isAdmin && <td className="p-3"></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Acordeón de Órdenes de Compra */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div 
            onClick={() => setOpenCompras(!openCompras)}
            className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChevronRight size={18} className={`text-slate-500 transition-transform duration-200 ${openCompras ? 'rotate-90' : ''}`} />
              <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  Órdenes de Compra del Proyecto
                  {(() => {
                    const count = (proyecto.ordenesCompra || []).filter(oc => oc.estado === 'PENDIENTE').length;
                    if (count > 0) {
                      return (
                        <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-100">
                          {count} pendiente{count > 1 ? 's' : ''}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Historial completo de solicitudes de compra para este proyecto</p>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => navigate(`/compras/nueva?proyectoId=${proyecto.id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <ShoppingCart size={14} />
                Solicitar Compra
              </button>
            </div>
          </div>

          {openCompras && (
            <div className="p-6 space-y-6 animate-in fade-in duration-150">
              {(() => {
                const ordenesCompraFiltradas = proyecto.ordenesCompra || [];
                if (ordenesCompraFiltradas.length === 0) {
                  return (
                    <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No hay órdenes de compra registradas en este proyecto.
                    </p>
                  );
                }
                return (
                  <div className="space-y-6">
                    {ordenesCompraFiltradas.map((oc) => {
                      const isPendiente = oc.estado === 'PENDIENTE';
                      const isAprobada = oc.estado === 'APROBADA';
                      const isRecibida = oc.estado === 'RECIBIDA';
                      
                      const totalOC = oc.items?.reduce(
                        (sum, item) => sum + ((isPendiente ? item.cantidadSolicitada : (item.cantidadAprobada || 0)) * item.precioUnitario),
                        0
                      ) || 0;

                      return (
                        <div key={oc.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-slate-800">{oc.numero}</span>
                              <span className="text-xs text-slate-400">• Solicitado: {oc.fechaCreacion}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                isPendiente ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                isAprobada ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                isRecibida ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {oc.estado}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintableOC(mapOrdenToPDFFormat(oc));
                                  setIsPDFOpen(true);
                                }}
                                className="px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-xs font-bold border border-slate-200 shadow-sm bg-white cursor-pointer"
                                title="Vista Previa / Imprimir PDF"
                              >
                                <Eye size={14} />
                                Ver / Imprimir OC
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
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
                                    <tr key={idx} className="border-b border-slate-100 text-slate-600">
                                      <td className="p-2.5 font-mono text-[10px]">{item.sku}</td>
                                      <td className="p-2.5 font-semibold text-slate-700">{item.nombre}</td>
                                      <td className="p-2.5 text-center font-medium">{item.cantidadSolicitada} {item.unidad}s</td>
                                      <td className="p-2.5 text-center">
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
                                            className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                          />
                                        ) : (
                                          <span className="font-bold text-slate-800">
                                            {(!isPendiente) ? `${item.cantidadAprobada} ${item.unidad}s` : `${item.cantidadSolicitada} ${item.unidad}s`}
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-right">${item.precioUnitario.toFixed(2)}</td>
                                      <td className="p-2.5 text-right font-bold text-slate-700">${subtotal.toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="font-bold text-slate-800 bg-slate-50/50">
                                  <td colSpan="5" className="p-2.5 text-right uppercase tracking-wider text-[10px]">Costo Total:</td>
                                  <td className="p-2.5 text-right text-sm font-extrabold text-indigo-900">
                                    ${totalOC.toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Mensaje Informativo para OCs Aprobadas o Recibidas */}
                          {(!isPendiente && (isAprobada || isRecibida)) && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed mt-2">
                              <strong>Destino de Costo:</strong> Esta compra abastece el inventario físico de bodega. El costo de estos materiales **no se carga de forma directa al proyecto** para evitar duplicidades. Se registrará la imputación real del costo cuando la instalación registre el uso de los mismos en la sección de <strong>Consumo de Bodega</strong>.
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
                                  onClick={() => handleRechazarOC(oc)}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg border border-red-200 shadow-sm transition-colors cursor-pointer"
                                >
                                  Rechazar Solicitud
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAprobarOC(oc)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                  Aprobar y Registrar Gasto
                                </button>
                              </div>
                            </div>
                          )}

                          {oc.comentarios && (
                            <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded-r-lg text-xs text-slate-650">
                              <strong>Comentarios:</strong> {oc.comentarios}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* 3. Acordeón de Consumo de Bodega */}
        {costoMaterialesBodega > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div 
              onClick={() => setOpenBodega(!openBodega)}
              className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChevronRight size={18} className={`text-slate-500 transition-transform duration-200 ${openBodega ? 'rotate-90' : ''}`} />
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    Consumo de Bodega (Insumos y Depreciación de Herramientas)
                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-750 px-2.5 py-0.5 rounded-full border border-indigo-100">
                      Total: ${costoMaterialesBodega.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Materiales e insumos utilizados en obra con 10% de desgaste en herramientas</p>
                </div>
              </div>
            </div>

            {openBodega && (
              <div className="p-6 space-y-4 animate-in fade-in duration-150">
                <div className="overflow-x-auto border border-slate-150 rounded-xl bg-slate-50/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-500 border-b border-slate-200">
                        <th className="p-3 font-bold uppercase tracking-wider">Nombre del Insumo / Herramienta</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-center">Tipo</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-center">Cantidad Llevada</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-right">CPP (Costo Promedio)</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-right">Costo Imputado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialesBodega.map((m, idx) => {
                        const cant = Number(m.cantidadLlevada !== undefined ? m.cantidadLlevada : (m.cantidad || 0));
                        const price = Number(m.precioUnitario || 0);
                        const isHerramienta = m.tipo === 'herramienta';
                        const sub = isHerramienta ? (cant * price * 0.10) : (cant * price);
                        if (cant <= 0) return null;

                        return (
                          <tr key={idx} className="border-b border-slate-150 text-slate-650 hover:bg-slate-50/70">
                            <td className="p-3 font-semibold text-slate-700">{m.nombre}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                isHerramienta ? 'bg-amber-50 text-amber-700 border-amber-250' : 'bg-slate-100 text-slate-650 border-slate-200'
                              }`}>
                                {isHerramienta ? 'Herramienta' : 'Consumible'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-medium">{cant} {m.unidad || 'unid'}</td>
                            <td className="p-3 text-right">${price.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-slate-800">
                              {isHerramienta ? (
                                <div className="flex flex-col items-end">
                                  <span>${sub.toFixed(2)}</span>
                                  <span className="text-[8px] text-amber-600 font-normal mt-0.5">Amortizado al 10% por desgaste</span>
                                </div>
                              ) : (
                                `$${sub.toFixed(2)}`
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/50 font-bold text-slate-800 border-t border-slate-200">
                        <td colSpan="4" className="p-3 text-right uppercase tracking-wider text-[10px]">Total Estimado Consumo:</td>
                        <td className="p-3 text-right text-sm font-extrabold text-indigo-700">
                          ${costoMaterialesBodega.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

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
      )}
    </div>
  );
}
