// src/features/proyectos/ui/components/AluxFasesPanel.jsx

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, Camera, Plus, Trash2, Calendar, 
  DollarSign, Image as ImageIcon, ChevronRight, AlertCircle, Edit3, X, Eye, FileText, Link, Award, ShoppingCart
} from 'lucide-react';
import { uploadEvidenciaInstalacion } from '../../application/proyectosService.js';
import { getProformas } from '../../../proformas/application/proformasService.js';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { ProformaPDF } from '../../../proformas/ui/components/ProformaPDF.jsx';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

export function AluxFasesPanel({ 
  proyecto, 
  fases = [], 
  onUpdateFases, 
  onUpdateProyecto,
  onAddGasto,
  gastos = [] 
}) {
  const [activeFaseId, setActiveFaseId] = useState(fases[0]?.id || 'fase-1');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState(null);
  
  // Modal para agregar nueva fase dinámicamente
  const [showAddFaseModal, setShowAddFaseModal] = useState(false);
  const [nuevaFaseNombre, setNuevaFaseNombre] = useState('');
  const [nuevaFaseFechaInicio, setNuevaFaseFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [nuevaFaseFechaFin, setNuevaFaseFechaFin] = useState(new Date().toISOString().split('T')[0]);

  // Modal para solicitar orden de compra por fase
  const [showOrdenCompraModal, setShowOrdenCompraModal] = useState(false);
  const [ordenConcepto, setOrdenConcepto] = useState('');
  const [ordenProveedor, setOrdenProveedor] = useState('');
  const [ordenMonto, setOrdenMonto] = useState('');

  const activeFase = fases.find((f) => f.id === activeFaseId) || fases[0];
  const isCompletadoView = activeFaseId === 'fase-completado';

  // Actualizar estado de una fase
  const handleSetFaseStatus = (faseId, newStatus) => {
    const updated = fases.map((f) => {
      if (f.id === faseId) {
        return {
          ...f,
          estado: newStatus,
          fechaCompletada: newStatus === 'COMPLETADA' ? new Date().toISOString() : f.fechaCompletada,
        };
      }
      return f;
    });
    onUpdateFases(updated);
  };

  // Subir foto de evidencia
  const handleUploadFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFoto(true);
    try {
      const res = await uploadEvidenciaInstalacion(proyecto.id, file);
      const url = res.url || res;
      
      const nuevaEvidencia = {
        id: 'evid-' + Date.now(),
        url,
        fecha: new Date().toISOString(),
        nombre: file.name,
      };

      const updated = fases.map((f) => {
        if (f.id === activeFaseId) {
          return {
            ...f,
            evidencias: [...(f.evidencias || []), nuevaEvidencia],
          };
        }
        return f;
      });

      onUpdateFases(updated);
    } catch (err) {
      alert('Error al subir imagen de evidencia: ' + err.message);
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Eliminar foto de evidencia
  const handleDeleteFoto = (evidenciaId) => {
    const updated = fases.map((f) => {
      if (f.id === activeFaseId) {
        return {
          ...f,
          evidencias: (f.evidencias || []).filter((e) => e.id !== evidenciaId),
        };
      }
      return f;
    });
    onUpdateFases(updated);
  };

  // Crear solicitud de orden de compra
  const handleSolicitarOrdenCompra = () => {
    if (!ordenConcepto.trim()) return;

    if (onAddGasto) {
      onAddGasto({
        ...activeFase,
        concepto: `[Solicitud Orden Compra] ${ordenConcepto.trim()}`,
        proveedor: ordenProveedor.trim() || 'Por definir',
        monto: parseFloat(ordenMonto) || 0,
      });
    }

    setOrdenConcepto('');
    setOrdenProveedor('');
    setOrdenMonto('');
    setShowOrdenCompraModal(false);
    alert(`Solicitud de Orden de Compra enviada para la ${activeFase.nombre}`);
  };

  // Agregar una nueva fase dinámicamente
  const handleCreateNuevaFase = () => {
    if (!nuevaFaseNombre.trim()) return;

    const nuevaFase = {
      id: 'fase-' + Date.now(),
      orden: fases.length + 1,
      nombre: nuevaFaseNombre.trim(),
      descripcion: 'Fase adicional incorporada durante la ejecución del proyecto.',
      fechaInicioPlan: nuevaFaseFechaInicio,
      fechaFinPlan: nuevaFaseFechaFin,
      estado: 'PENDIENTE',
      evidencias: [],
      notas: '',
    };

    const updated = [...fases, nuevaFase];
    onUpdateFases(updated);
    setActiveFaseId(nuevaFase.id);
    setNuevaFaseNombre('');
    setShowAddFaseModal(false);
  };

  // Gastos asignados a la fase actual
  const gastosFase = gastos.filter((g) => 
    g.faseId === activeFaseId || g.concepto?.toLowerCase().includes(activeFase?.nombre?.toLowerCase())
  );

  const fasesCompletadasCount = fases.filter((f) => f.estado === 'COMPLETADA').length;
  const progresoAlux = fases.length > 0 ? Math.round((fasesCompletadasCount / fases.length) * 100) : 0;
  const todoElProyectoCompleto = fases.length > 0 && fasesCompletadasCount === fases.length;

  return (
    <div className="space-y-6">
      {/* TIMELINE SUPERIOR PRINCIPAL DE FASES ALUX */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Fases del Proyecto (Alux Taller / Obra)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cronograma dinámico de ejecución en taller e instalación en obra
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddFaseModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            <Plus size={14} />
            + Nueva Fase
          </button>
        </div>

        {/* Barra de progreso de fases Alux */}
        <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="font-bold text-slate-700">Progreso Total del Proyecto</span>
            <span className="font-mono font-extrabold text-blue-600">{progresoAlux}% — {fasesCompletadasCount} de {fases.length} Fases Completadas</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progresoAlux}%` }}
            />
          </div>
        </div>

        {/* Lista de Fases Dinámicas + Fase de Completado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {fases.map((f, idx) => {
            const isActive = f.id === activeFaseId;
            const isDone = f.estado === 'COMPLETADA';
            const inProg = f.estado === 'EN_PROGRESO';

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFaseId(f.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : isDone
                    ? 'border-slate-200 bg-emerald-50/40 hover:border-emerald-300'
                    : inProg
                    ? 'border-blue-300 bg-white hover:border-blue-400'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold tracking-wider text-slate-600">
                    FASE {idx + 1}
                  </span>
                  {isDone ? (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  ) : inProg ? (
                    <Clock size={14} className="text-blue-600 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>

                <div className="font-bold text-xs text-slate-800 line-clamp-1">
                  {f.nombre}
                </div>

                <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                  <Calendar size={10} />
                  {f.fechaInicioPlan ? f.fechaInicioPlan.slice(5) : '—'} ➔ {f.fechaFinPlan ? f.fechaFinPlan.slice(5) : '—'}
                </div>
              </button>
            );
          })}

          {/* Tarjeta de Fase Final: COMPLETADO */}
          <button
            type="button"
            onClick={() => setActiveFaseId('fase-completado')}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
              isCompletadoView
                ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                : todoElProyectoCompleto || proyecto.estado === 'COMPLETADO'
                ? 'border-emerald-300 bg-emerald-50/60 hover:border-emerald-400'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                FASE FINAL
              </span>
              <Award size={14} className="text-emerald-600" />
            </div>
            <div className="font-extrabold text-xs text-emerald-900 line-clamp-1">
              ✓ COMPLETADO
            </div>
            <div className="text-[10px] text-emerald-700 mt-1">
              Firma y Entrega Final
            </div>
          </button>
        </div>
      </div>

      {/* VISTA FASE FINAL DE COMPLETADO */}
      {isCompletadoView ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Award size={32} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Fase Final: Entrega y Cierre del Proyecto Alux
            </h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
              Al finalizar todas las fases dinámicas del proyecto, puedes marcar el estado general como COMPLETADO para cerrar la obra.
            </p>
          </div>

          <div className="pt-2">
            {proyecto.estado === 'COMPLETADO' || todoElProyectoCompleto ? (
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-sm border border-emerald-300">
                <CheckCircle2 size={18} />
                ¡Proyecto Oficialmente Completado!
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onUpdateProyecto) {
                    onUpdateProyecto({ estado: 'COMPLETADO', fechaCompletado: new Date().toISOString() });
                  }
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
              >
                ✓ Marcar Proyecto como COMPLETADO
              </button>
            )}
          </div>
        </div>
      ) : (
        /* DETALLE DE LA FASE DINÁMICA SELECCIONADA */
        activeFase && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Header de Fase Activa */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    Fase {fases.findIndex(f => f.id === activeFase.id) + 1} de {fases.length}
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {activeFase.nombre}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {activeFase.descripcion}
                </p>
              </div>

              {/* Selector de Estado de la Fase */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetFaseStatus(activeFase.id, 'PENDIENTE')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                    activeFase.estado === 'PENDIENTE'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pendiente
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFaseStatus(activeFase.id, 'EN_PROGRESO')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                    activeFase.estado === 'EN_PROGRESO'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  En Progreso
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFaseStatus(activeFase.id, 'COMPLETADA')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                    activeFase.estado === 'COMPLETADA'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  ✓ Completada
                </button>
              </div>
            </div>

            {/* SECCIÓN 1: EVIDENCIA FOTOGRÁFICA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Evidencias Fotográficas (Taller / Obra)
                  </h3>
                </div>

                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors">
                  <Plus size={14} />
                  {subiendoFoto ? 'Subiendo...' : 'Cargar Foto Evidencia'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFoto}
                    disabled={subiendoFoto}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Galería de Fotos */}
              {activeFase.evidencias && activeFase.evidencias.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {activeFase.evidencias.map((ev) => (
                    <div key={ev.id} className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square shadow-sm">
                      <img
                        src={ev.url}
                        alt="Evidencia"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFotoModalUrl(ev.url)}
                          className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow"
                          title="Ver ampliadamente"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFoto(ev.id)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow"
                          title="Eliminar foto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50">
                  <ImageIcon size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">
                    No hay fotografías de evidencia cargadas en esta fase.
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    El personal de taller u obra puede tomar o subir fotos de rectificación, armado o instalación.
                  </p>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: GASTOS Y ÓRDENES DE COMPRA DE LA FASE */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Compras y Requerimientos de la Fase
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOrdenCompraModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors border border-blue-200"
                  >
                    <ShoppingCart size={14} />
                    Solicitar Orden de Compra
                  </button>

                  <button
                    type="button"
                    onClick={() => onAddGasto && onAddGasto(activeFase)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-colors border border-emerald-200"
                  >
                    <Plus size={14} />
                    Registrar Gasto
                  </button>
                </div>
              </div>

              {gastosFase.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {gastosFase.map((g) => (
                    <div key={g.id} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {g.concepto || g.descripcion}
                        </span>
                        <span className="text-slate-600 text-[11px]">
                          {g.proveedor ? `Proveedor: ${g.proveedor}` : 'Gasto directo'} • {g.fecha || 'Sin fecha'}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatUSD(g.monto)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">
                  No hay órdenes ni gastos registrados específicamente para esta fase.
                </p>
              )}
            </div>
          </div>
        )
      )}

      {/* MODAL SOLICITAR ORDEN DE COMPRA */}
      {showOrdenCompraModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart size={16} className="text-blue-600" />
                  Solicitar Orden de Compra ({activeFase?.nombre})
                </h3>
                <button onClick={() => setShowOrdenCompraModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Descripción / Materiales Requeridos *
                  </label>
                  <textarea
                    className="co-input w-full min-h-[70px]"
                    placeholder="Ej. 6 Perfiles de aluminio serie 25 + 2 planchas de vidrio templado 10mm + silicona negra..."
                    value={ordenConcepto}
                    onChange={(e) => setOrdenConcepto(e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Proveedor Sugerido / Taller
                  </label>
                  <input
                    type="text"
                    className="co-input w-full"
                    placeholder="Ej. Distribuidora Aluminos del Ecuador / Alumco"
                    value={ordenProveedor}
                    onChange={(e) => setOrdenProveedor(e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Monto Estimado ($)
                  </label>
                  <input
                    type="number"
                    className="co-input w-full font-mono font-bold"
                    placeholder="0.00"
                    value={ordenMonto}
                    onChange={(e) => setOrdenMonto(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowOrdenCompraModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSolicitarOrdenCompra}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Enviar Solicitud de Compra
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL AMPLIAR FOTO */}
      {fotoModalUrl && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden p-2">
              <button
                onClick={() => setFotoModalUrl(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors z-10"
              >
                <X size={20} />
              </button>
              <img
                src={fotoModalUrl}
                alt="Evidencia Ampliada"
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL CREAR NUEVA FASE DINÁMICA */}
      {showAddFaseModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Agregar Nueva Fase al Proyecto
                </h3>
                <button onClick={() => setShowAddFaseModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nombre de la Fase *
                  </label>
                  <input
                    type="text"
                    className="co-input w-full"
                    placeholder="Ej. Trabajos Extras en Fachada / Templados"
                    value={nuevaFaseNombre}
                    onChange={(e) => setNuevaFaseNombre(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Fecha Inicio Prevista
                    </label>
                    <input
                      type="date"
                      className="co-input w-full"
                      value={nuevaFaseFechaInicio}
                      onChange={(e) => setNuevaFaseFechaInicio(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Fecha Fin Prevista
                    </label>
                    <input
                      type="date"
                      className="co-input w-full"
                      value={nuevaFaseFechaFin}
                      onChange={(e) => setNuevaFaseFechaFin(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddFaseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateNuevaFase}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                >
                  Guardar Fase
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
