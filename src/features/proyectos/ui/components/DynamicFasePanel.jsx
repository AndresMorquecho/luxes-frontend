// src/features/proyectos/ui/components/DynamicFasePanel.jsx

import React, { useState } from 'react';
import { 
  Camera, Plus, Trash2, Calendar, Image as ImageIcon, FileImage,
  Edit3, Eye, X, CheckCircle2, Clock, User, AlertCircle, ArrowRight
} from 'lucide-react';
import { uploadEvidenciaInstalacion } from '../../application/proyectosService.js';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { MediaPreviewModal } from '../../../../shared/ui/components/MediaPreviewModal.jsx';
import { PhotoCaptureModal } from './PhotoCaptureModal.jsx';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

const formatFechaCompletada = (val) => {
  if (!val) return 'Completada';
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const parts = String(val).split('T');
      const fecha = parts[0];
      const hora = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${fecha} (${hora})`;
    }
  } catch {}
  return String(val);
};

export function DynamicFasePanel({
  proyecto,
  fase,
  faseIndex = 0,
  totalFases = 1,
  onUpdateFase,
  onDeleteFase,
  onOpenEditModal,
  onAddGasto,
  gastos = [],
  showValidationErrors = false,
  canDeleteFase = true,
}) {
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, index: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Estado para editar "Observaciones o detalles"
  const [isEditingObservaciones, setIsEditingObservaciones] = useState(false);
  const [observacionesInput, setObservacionesInput] = useState(fase?.notas || fase?.observaciones || '');

  // Subir foto de evidencia fotográfica (desde modal de captura/archivo)
  const handleUploadFoto = async (file) => {
    if (!file) return;

    setSubiendoFoto(true);
    try {
      const res = await uploadEvidenciaInstalacion(proyecto.id, file);
      const url = res?.url || res?.evidencia?.url || (typeof res === 'string' ? res : '');

      const user = JSON.parse(localStorage.getItem('user') || 'null');
      const userName = user?.nombre || user?.usuario || 'Usuario';
      const nowISO = new Date().toISOString();

      const nuevaEvidencia = {
        id: 'evid-' + Date.now(),
        url,
        fecha: nowISO,
        fechaHora: nowISO,
        nombre: file.name || `evidencia_${Date.now()}.jpg`,
        name: file.name || `evidencia_${Date.now()}.jpg`,
        subidoPor: userName,
        subidoPorId: user?.id || null,
      };

      const evidenciasActuales = fase.evidencias || [];

      onUpdateFase({
        ...fase,
        evidencias: [...evidenciasActuales, nuevaEvidencia],
        ultimaEdicionPor: userName,
        ultimaEdicionEn: nowISO,
      });
    } catch (err) {
      alert('Error al subir evidencia: ' + err.message);
      throw err;
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Eliminar foto de evidencia
  const handleDeleteFoto = (evidenciaId) => {
    const evidenciasActuales = fase.evidencias || [];
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userName = user?.nombre || user?.usuario || 'Usuario';

    onUpdateFase({
      ...fase,
      evidencias: evidenciasActuales.filter((e) => e.id !== evidenciaId),
      ultimaEdicionPor: userName,
      ultimaEdicionEn: new Date().toISOString(),
    });
  };

  // Guardar "Observaciones o detalles"
  const handleSaveObservaciones = () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userName = user?.nombre || user?.usuario || 'Usuario';

    onUpdateFase({
      ...fase,
      notas: observacionesInput.trim(),
      observaciones: observacionesInput.trim(),
      ultimaEdicionPor: userName,
      ultimaEdicionEn: new Date().toISOString(),
    });
    setIsEditingObservaciones(false);
  };

  const descripcionTexto = fase.descripcion || fase.queSeHizo || '';

  return (
    <div className="space-y-4">
      {/* HEADER ULTRA-COMPACTO DE LA FASE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Lado Izquierdo: Badge + Título + Lápiz + Descripción */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-2xs">
              Fase {faseIndex + 1} de {totalFases}
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate" title={fase.nombre}>
              {fase.nombre}
            </h2>
            <button
              type="button"
              onClick={onOpenEditModal}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
              title="Editar nombre, descripción y fechas"
            >
              <Edit3 size={14} />
            </button>

            {fase.estado === 'COMPLETADA' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                <CheckCircle2 size={12} className="text-emerald-600" />
                Completada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Pendiente
              </span>
            )}
          </div>

          {/* Descripción inline compacta */}
          <p className="text-xs text-slate-500 font-medium line-clamp-1" title={descripcionTexto}>
            {descripcionTexto || <span className="italic text-slate-400">Sin descripción registrada para esta fase.</span>}
          </p>
        </div>

        {/* Lado Derecho: Fechas Destacadas (Inicio, Estimada, Completada) + Papelera */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Fecha Inicio */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/90 text-xs shadow-2xs">
            <Calendar size={12} className="text-blue-600 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">Inicio</span>
              <span className="font-extrabold text-slate-700 text-[11px] leading-tight">
                {fase.fechaInicio || fase.fechaInicioPlan || 'Hoy'}
              </span>
            </div>
          </div>

          <div className="text-slate-300 hidden sm:block">
            <ArrowRight size={11} />
          </div>

          {/* Fecha Estimada */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/90 text-xs shadow-2xs">
            <Clock size={12} className="text-amber-600 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">Estimada</span>
              <span className="font-extrabold text-slate-700 text-[11px] leading-tight">
                {fase.fechaFinEstimada || fase.fechaFinPlan || 'Sin definir'}
              </span>
            </div>
          </div>

          {/* Fecha Completada */}
          {(fase.estado === 'COMPLETADA' || fase.fechaCompletada) && (
            <>
              <div className="text-slate-300 hidden sm:block">
                <ArrowRight size={11} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs shadow-2xs">
                <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-emerald-700 leading-none">Completada</span>
                  <span className="font-extrabold text-emerald-900 text-[11px] leading-tight">
                    {formatFechaCompletada(fase.fechaCompletada || fase.fechaFinReal)}
                  </span>
                </div>
              </div>
            </>
          )}

          {canDeleteFase && onDeleteFase && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100 ml-1"
              title="Eliminar esta fase"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* WORKSPACE DE LA FASE: 2 COLUMNAS COMPACTAS Y EQUILIBRADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5 items-stretch">
        
        {/* COLUMNA IZQUIERDA: EVIDENCIAS FOTOGRÁFICAS */}
        <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col justify-between space-y-2">
          {/* Header de Evidencias */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Camera size={15} className="text-blue-600 shrink-0" />
              <h3 className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider">
                Evidencias Fotográficas
              </h3>
              {fase.evidencias?.length > 0 && (
                <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-full">
                  {fase.evidencias.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors active:scale-95 shrink-0"
            >
              <Plus size={13} />
              {subiendoFoto ? 'Subiendo...' : 'Cargar Foto'}
            </button>
          </div>

          {/* Contenido / Lista de Chips con scroll horizontal en móvil */}
          <div className="flex-1 flex flex-col justify-center min-h-[65px] sm:min-h-[75px]">
            {fase.evidencias && fase.evidencias.length > 0 ? (
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible scrollbar-thin">
                {fase.evidencias.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    onClick={() => setPreviewModal({ isOpen: true, index: idx })}
                    className="group inline-flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs shrink-0 max-w-[130px] sm:max-w-[170px]"
                    title={`Clic para ver ${ev.nombre || ev.name || 'Evidencia'}`}
                  >
                    <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileImage size={11} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] sm:text-xs font-bold text-slate-800 truncate group-hover:text-blue-700 leading-tight">
                        {ev.nombre || ev.name || `Foto ${idx + 1}`}
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-slate-400 truncate leading-none">
                        {ev.subidoPor || 'Usuario'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFoto(ev.id);
                      }}
                      className="p-0.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      title="Eliminar evidencia"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setPreviewModal({ isOpen: true, index: 0 })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-[11px] sm:text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <Eye size={12} />
                  Ver todas ({fase.evidencias.length})
                </button>
              </div>
            ) : (
              <div
                onClick={() => setShowPhotoModal(true)}
                className="p-2.5 sm:p-3 border-2 border-dashed border-slate-200 hover:border-blue-300 bg-white/70 hover:bg-white rounded-xl text-center cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <ImageIcon size={15} className="text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-600">
                  Sin fotos. <strong className="text-blue-600 font-bold hover:underline">Toca aquí para agregar</strong>
                </span>
              </div>
            )}
          </div>

          {showValidationErrors && (!fase.evidencias || fase.evidencias.length === 0) && (
            <p className="text-[10px] sm:text-[11px] font-bold text-red-500 flex items-center gap-1 pt-0.5">
              <AlertCircle size={12} className="shrink-0" />
              * Se requiere al menos 1 fotografía para completar la fase.
            </p>
          )}
        </div>

        {/* COLUMNA DERECHA: OBSERVACIONES Y DETALLES */}
        <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between space-y-2.5">
          {/* Header de Observaciones */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Edit3 size={15} className="text-blue-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Observaciones y Detalles
              </h3>
            </div>

            {!isEditingObservaciones ? (
              <button
                type="button"
                onClick={() => {
                  setObservacionesInput(fase.notas || fase.observaciones || '');
                  setIsEditingObservaciones(true);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Edit3 size={12} />
                Editar notas
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditingObservaciones(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveObservaciones}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Guardar
                </button>
              </div>
            )}
          </div>

          {/* Contenido / Textarea o Vista de Observaciones */}
          <div className="flex-1 flex flex-col justify-center min-h-[80px]">
            {isEditingObservaciones ? (
              <textarea
                className="w-full bg-white border border-blue-400 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-2.5 text-xs sm:text-sm focus:outline-none transition-all resize-none min-h-[80px] max-h-[130px] text-slate-700"
                placeholder="Ingrese observaciones, novedades técnicas o instrucciones para esta fase..."
                value={observacionesInput}
                onChange={(e) => setObservacionesInput(e.target.value)}
                autoFocus
              />
            ) : (
              <div
                onClick={() => {
                  setObservacionesInput(fase.notas || fase.observaciones || '');
                  setIsEditingObservaciones(true);
                }}
                className="bg-white border border-slate-200/80 hover:border-blue-200 rounded-xl p-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed min-h-[75px] max-h-[130px] overflow-y-auto whitespace-pre-wrap shadow-2xs cursor-pointer transition-colors"
                title="Haz clic para editar observaciones"
              >
                {fase.notas || fase.observaciones ? (
                  fase.notas || fase.observaciones
                ) : (
                  <span className="text-slate-400 italic text-xs">
                    Sin observaciones registradas. Haz clic aquí o en "Editar notas" para registrar novedades de la fase.
                  </span>
                )}
              </div>
            )}
          </div>

          {showValidationErrors && (!fase.notas?.trim() && !fase.observaciones?.trim()) && (
            <p className="text-[11px] font-bold text-red-500 flex items-center gap-1 pt-0.5">
              <AlertCircle size={13} className="shrink-0" />
              * Se requiere registrar observaciones para completar la fase.
            </p>
          )}
        </div>

      </div>

      {/* MODAL VISUALIZADOR OPTIMIZADO DE EVIDENCIAS (CARGA BAJO DEMANDA) */}
      <MediaPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, index: 0 })}
        files={fase.evidencias || []}
        initialIndex={previewModal.index}
      />

      {/* MODAL CONFIRMACIÓN DE ELIMINAR FASE */}
      {showDeleteConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle size={24} className="shrink-0" />
                <h3 className="text-base font-bold text-slate-800">
                  ¿Eliminar esta fase?
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Se eliminará permanentemente la fase <strong className="text-slate-800">"{fase.nombre}"</strong> y sus evidencias asociadas.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDeleteFase(fase.id);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Sí, eliminar fase
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL PARA TOMAR FOTO CON CÁMARA O SUBIR ARCHIVO */}
      <PhotoCaptureModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onUploadPhoto={handleUploadFoto}
        currentUser={JSON.parse(localStorage.getItem('user') || 'null')}
      />
    </div>
  );
}
