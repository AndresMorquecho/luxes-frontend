import React, { useState, useRef, useCallback, useMemo } from 'react';
import { UploadCloud, Image as ImageIcon, CheckCircle, File, Trash2, Calendar, ShieldCheck, X, Plus, Printer, Package, Clock, AlertCircle, Send, RotateCcw, XCircle, Sparkles, Eye, FileImage, FileText, ExternalLink } from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import { usePrintQueueStable } from '../../../colas-impresion/context/PrintQueueContext.jsx';
import { toast } from '../../../../shared/ui/components/toastStore.js';
import {
  uploadArchivoDiseno,
  createBatchDiseno,
  addArchivoToBatch,
  enviarBatchImpresion,
  deleteBatchDiseno,
  deleteEmptyBatchesDiseno,
  removeArchivoFromBatch,
} from '../../application/proyectosService.js';
import { alertDialog } from '../../../../shared/ui/components/ConfirmModal';
import { resolveMediaUrl, getArchivoMediaSrc } from '../../../../shared/utils/mediaUrl.js';
import { MediaPreviewModal } from '../../../../shared/ui/components/MediaPreviewModal.jsx';

// ── Helpers ────────────────────────────────────────────────────────────────

const ESTADO_BATCH = {
  draft:          { label: 'Borrador / Sin enviar',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  pending_print: { label: 'Enviado a impresión',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  printed:       { label: 'Enviado a impresión',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelled:     { label: 'Cancelado',              color: 'text-slate-400 bg-slate-50 border-slate-200' },
};

const isImageFile = (file) => {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  if (type.includes('image')) return true;
  const name = (file.name || '').toLowerCase();
  const url = (file.url || '').toLowerCase();
  return (
    name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') ||
    name.endsWith('.gif') || name.endsWith('.webp') ||
    url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') ||
    url.endsWith('.gif') || url.endsWith('.webp') ||
    url.startsWith('data:image')
  );
};

const ArchivoCard = React.memo(function ArchivoCard({ file, onRemove, onPreview }) {
  const isImage = isImageFile(file);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          onClick={() => onPreview?.(file)}
          className="w-10 h-10 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center shrink-0 cursor-pointer hover:bg-slate-200/70 transition-colors"
          title="Previsualizar"
        >
          {isImage ? <FileImage size={18} /> : <FileText size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <h4
            onClick={() => onPreview?.(file)}
            className="text-xs font-bold text-slate-800 truncate cursor-pointer hover:text-slate-900 transition-colors"
            title={file.name}
          >
            {file.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
            <span>{file.size || 'Archivo'}</span>
            <span>•</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle size={10} /> Listo para impresión
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isImage && (
          <button
            type="button"
            onClick={() => onPreview?.(file)}
            className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Previsualizar imagen en modal"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Ver</span>
          </button>
        )}
        <a
          href={resolveMediaUrl(file.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Descargar/Abrir original"
        >
          <ExternalLink size={14} />
        </a>
        {onRemove && (
          <button
            onClick={() => onRemove(file.url)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar archivo"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
});


// ── Sub-componente: Lote Individual ────────────────────────────────────────

const BatchCard = React.memo(function BatchCard({ batch, proyectoId, onBatchUpdated, isNew, onPreview }) {
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const estadoConfig = ESTADO_BATCH[batch.estado] || ESTADO_BATCH.draft;
  const archivos = Array.isArray(batch.archivos) ? batch.archivos : [];

  const handleFilesSelect = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fileData = await uploadArchivoDiseno(proyectoId, file);
        await addArchivoToBatch(proyectoId, batch.id, fileData);
      }
      toast.success('Archivo(s) agregado(s) al lote');
      onBatchUpdated?.();
    } catch (err) {
      console.error('Error al subir archivos al lote:', err);
      await alertDialog('Error', 'Error al subir archivos: ' + err.message, { type: 'warning' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFileFromBatch = useCallback(async (fileUrl) => {
    try {
      await removeArchivoFromBatch(proyectoId, batch.id, fileUrl);
      toast.success('Archivo eliminado del lote');
      onBatchUpdated?.();
    } catch (err) {
      toast.error(err.message);
    }
  }, [proyectoId, batch.id, onBatchUpdated]);

  const handleEnviarImpresion = async () => {
    if (archivos.length === 0) {
      await alertDialog('Sin archivos', 'Sube al menos un archivo antes de enviar a impresión.', { type: 'warning' });
      return;
    }
    setSending(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      await enviarBatchImpresion(proyectoId, batch.id, {
        sentBy: user?.nombre || user?.username || 'Diseño',
        urgency: 'Media',
      });
      toast.success('Lote enviado a la cola de impresión 🖨️', 3000);
      onBatchUpdated?.();
    } catch (err) {
      console.error('Error al enviar lote a impresión:', err);
      toast.error(err.message, 3000);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (yaEnviado) {
      const confirm = await alertDialog(
        'Eliminar Lote Enviado',
        `El lote "${batch.label}" ya fue enviado a impresión. ¿Deseas eliminarlo del proyecto de todos modos?`,
        { type: 'danger', confirmText: 'Sí, eliminar lote' }
      );
      if (!confirm) return;
    } else {
      const confirm = await alertDialog(
        'Eliminar Lote',
        `¿Deseas eliminar el lote "${batch.label}"?`,
        { type: 'warning', confirmText: 'Eliminar' }
      );
      if (!confirm) return;
    }

    setDeleting(true);
    try {
      await deleteBatchDiseno(proyectoId, batch.id);
      toast.success('Lote eliminado con éxito');
      onBatchUpdated?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Un lote enviado a impresión permanece cerrado
  const yaEnviado = Boolean(batch.enviadoImpresion || batch.jobImpresionId || batch.estado === 'printed');
  const canEdit = !yaEnviado;
  const canSend = !yaEnviado && archivos.length > 0;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${isNew && !yaEnviado ? 'border-blue-200 shadow-blue-50 shadow-md' : 'border-slate-200'}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 200px' }}>
      {/* Header del batch */}
      <div className={`px-4 py-3 flex items-center justify-between gap-3 ${isNew && !yaEnviado ? 'bg-blue-50' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Package size={15} className={isNew && !yaEnviado ? 'text-blue-500' : 'text-slate-400'} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{batch.label}</p>
            {batch.creadoEn && (
              <p className="text-[10px] text-slate-400">{batch.creadoEn}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Badge de estado */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
            yaEnviado
              ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
              : estadoConfig.color
          }`}>
            {yaEnviado ? 'Enviado a impresión' : estadoConfig.label}
          </span>

          {/* Botón eliminar lote */}
          <button
            onClick={handleDeleteBatch}
            disabled={deleting}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Eliminar lote"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Archivos del batch */}
      <div className="p-4 space-y-3">
        {archivos.length === 0 && !canEdit && (
          <p className="text-xs text-slate-400 text-center py-3">Sin archivos en este lote</p>
        )}

        {archivos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {archivos.map((file, idx) => (
              <ArchivoCard
                key={file.url || idx}
                file={file}
                onRemove={canEdit ? handleRemoveFileFromBatch : undefined}
                onPreview={onPreview}
              />
            ))}
          </div>
        )}

        {/* Zona de upload (disponible mientras el lote sea editable/borrador) */}
        {canEdit && (
          <div
            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault(); setIsDragging(false);
              if (e.dataTransfer.files?.length > 0) handleFilesSelect(Array.from(e.dataTransfer.files));
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.ai,.psd,.dxf,.dwg,.eps,.cdr,.svg,.tif,.tiff,.jpg,.jpeg,.png,.webp,.gif,.zip,.rar,.7z"
              multiple
              onChange={(e) => { if (e.target.files?.length > 0) handleFilesSelect(Array.from(e.target.files)); }}
            />
            <UploadCloud size={18} className={isDragging ? 'text-blue-500' : 'text-slate-400'} />
            <p className="text-xs font-semibold text-slate-600 mt-1.5">
              {uploading ? 'Subiendo...' : 'Arrastra o haz clic para subir imágenes/archivos a este lote'}
            </p>
            <p className="text-[10px] text-slate-400">DXF, DWG, AI, PSD, PDF, EPS, CDR, SVG, JPG, PNG, ZIP</p>
          </div>
        )}

        {/* Botón enviar a impresión */}
        {canSend && (
          <button
            onClick={handleEnviarImpresion}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
          >
            {sending ? (
              <>
                <Clock size={15} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={15} />
                Enviar lote a cola de impresión
              </>
            )}
          </button>
        )}

        {yaEnviado && (
          <div className="flex flex-col gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle size={13} className="shrink-0 text-emerald-600" />
              <span>Enviado a cola de impresión {batch.jobImpresionId ? `— Job #${batch.jobImpresionId}` : ''}</span>
            </div>
            <p className="text-[10px] text-emerald-600 ml-5">
              Este lote está cerrado. Si necesitas enviar diseños adicionales a impresión, haz clic en <strong>"+ Agregar diseño complementario"</strong> abajo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

// ── Componente Principal ───────────────────────────────────────────────────

export const DisenoPanel = React.memo(function DisenoPanel({ proyectoId, soloLectura }) {
  const { proyecto, updateFaseDatos, reloadProyecto } = useProyecto(proyectoId);
  const { getJobsByProyectoId } = usePrintQueueStable();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);
  const [cleaningEmpty, setCleaningEmpty] = useState(false);
  const [showNuevoBatch, setShowNuevoBatch] = useState(false);
  const [previewModal, setPreviewModal] = useState({ isOpen: false, files: [], index: 0 });

  const handleOpenPreview = useCallback((files, index = 0) => {
    setPreviewModal({
      isOpen: true,
      files: Array.isArray(files) ? files : [files],
      index: index >= 0 ? index : 0,
    });
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewModal({ isOpen: false, files: [], index: 0 });
  }, []);

  const jobsMap = useMemo(() => {
    const list = getJobsByProyectoId(proyectoId) || [];
    const map = {};
    for (let i = 0; i < list.length; i++) {
      const j = list[i];
      if (j && j.id != null) {
        map[String(j.id)] = j;
      }
    }
    return map;
  }, [getJobsByProyectoId, proyectoId, proyecto?.fases?.['DISEÑO']?.datos?.batches]);

  const disenoFase = proyecto?.fases?.['DISEÑO'] || {};
  const datosFase = disenoFase.datos || {};

  // Detectar si existen batches en los datos
  const batches = Array.isArray(datosFase.batches) ? datosFase.batches : null;

  // Archivos del modo legado (sin batches)
  const archivosLegado = datosFase.archivosArte ||
    (datosFase.archivoArte ? [datosFase.archivoArte] :
     disenoFase.archivoArte ? [disenoFase.archivoArte] : []);

  const fechaAprobacion = datosFase.fechaAprobacionDiseno || disenoFase.fechaAprobacionDiseno || '';

  const fileInputRef = useRef(null);

  // ── Modo batch: hay batches guardados ────────────────────────────────────
  const hasBatches = batches !== null && batches.length > 0;

  // ── Handlers legado (cuando NO hay batches) ───────────────────────────────

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) handleFilesSelect(Array.from(e.dataTransfer.files));
  };
  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) handleFilesSelect(Array.from(e.target.files));
  };

  const handleFilesSelect = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const fileData = await uploadArchivoDiseno(proyectoId, file);
        uploadedFiles.push(fileData);
      }
      const actualArchivos = datosFase.archivosArte || (datosFase.archivoArte ? [datosFase.archivoArte] : []);
      const nuevoArchivos = [...actualArchivos, ...uploadedFiles];
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      updateFaseDatos('DISEÑO', {
        archivosArte: nuevoArchivos,
        archivoArte: nuevoArchivos[0] || null,
        disenadorNombre: user?.nombre || 'Diseñador'
      });
    } catch (error) {
      console.error('Error al subir archivos:', error);
      await alertDialog('Error', 'Error al subir archivos: ' + error.message, { type: 'warning' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (fileUrl) => {
    const actualArchivos = datosFase.archivosArte || (datosFase.archivoArte ? [datosFase.archivoArte] : []);
    const nuevoArchivos = actualArchivos.filter(f => f.url !== fileUrl);
    updateFaseDatos('DISEÑO', {
      archivosArte: nuevoArchivos,
      archivoArte: nuevoArchivos[0] || null,
      ...(nuevoArchivos.length === 0 ? { fechaAprobacionDiseno: '' } : {})
    });
  };

  const handleAprobarHoy = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    try {
      await updateFaseDatos('DISEÑO', {
        fechaAprobacionDiseno: hoy,
        disenadorNombre: user?.nombre || 'Diseñador',
      });
    } catch (error) {
      await alertDialog('Error', 'No se pudo registrar la aprobación: ' + error.message, { type: 'warning' });
    }
  };

  const formatFechaAprobacion = (fecha) => {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return fecha;
  };

  // ── Agregar nuevo batch complementario ────────────────────────────────────

  const handleAgregarBatch = async () => {
    setAddingBatch(true);
    try {
      await createBatchDiseno(proyectoId, {
        label: `Ítem complementario`,
      });
      setShowNuevoBatch(true);
      toast.success('Nuevo lote de diseño creado en borrador');
      if (reloadProyecto) await reloadProyecto();
    } catch (err) {
      console.error('Error al agregar batch:', err);
      await alertDialog('Error', err.message, { type: 'warning' });
    } finally {
      setAddingBatch(false);
    }
  };

  const handleCleanEmptyBatches = async () => {
    const emptyCount = (batches || []).filter(
      (b) => (!b.archivos || b.archivos.length === 0) && !b.jobImpresionId
    ).length;

    if (emptyCount === 0) return;

    const confirm = await alertDialog(
      'Limpiar Lotes Vacíos',
      `Se eliminarán ${emptyCount} lote(s) que no contienen archivos adjuntos ni trabajos de impresión. ¿Deseas continuar?`,
      { type: 'warning', confirmText: 'Sí, limpiar lotes vacíos' }
    );
    if (!confirm) return;

    setCleaningEmpty(true);
    try {
      const result = await deleteEmptyBatchesDiseno(proyectoId);
      toast.success(`Se eliminaron ${result.eliminados} lote(s) vacíos con éxito ✨`);
      if (reloadProyecto) await reloadProyecto();
    } catch (err) {
      console.error('Error al limpiar lotes vacíos:', err);
      await alertDialog('Error', err.message, { type: 'warning' });
    } finally {
      setCleaningEmpty(false);
    }
  };

  const handleBatchUpdated = useCallback(async () => {
    if (reloadProyecto) await reloadProyecto();
  }, [reloadProyecto]);

  // ── Render ────────────────────────────────────────────────────────────────

  const mostrarBatches = soloLectura || hasBatches;
  const faseActual = proyecto?.faseActual || '';
  const fasesPostDiseno = ['PRODUCCION', 'INSTALACION', 'ENTREGA', 'COMPLETADO'];
  const puedeAgregarComplementario = fasesPostDiseno.includes(faseActual);

  if (mostrarBatches) {
    const todosLosBatches = batches || [];
    const archivosIniciales = !hasBatches ? archivosLegado : [];
    const lotesVaciosCount = todosLosBatches.filter(
      (b) => (!b.archivos || b.archivos.length === 0) && !b.jobImpresionId
    ).length;

    return (
      <div className="space-y-6">
        {/* Header informativo */}
        {puedeAgregarComplementario && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-800">Diseños complementarios</p>
              <p className="text-xs text-blue-600 mt-0.5">
                El proyecto ya avanzó más allá del diseño. Puedes agregar ítems adicionales que se enviarán a impresión de forma independiente, sin afectar el progreso del proyecto.
              </p>
            </div>
          </div>
        )}

        {/* Lotes existentes */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Package size={18} className="text-indigo-500" />
              Lotes de Diseño
            </h3>
            {lotesVaciosCount > 0 && (
              <button
                onClick={handleCleanEmptyBatches}
                disabled={cleaningEmpty}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors shrink-0 shadow-sm"
                title="Eliminar todos los lotes vacíos creados por error"
              >
                <Trash2 size={13} className="text-amber-600" />
                {cleaningEmpty ? 'Limpiando...' : `Limpiar ${lotesVaciosCount} lote(s) vacíos`}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Lote inicial legado (cuando no hay batches aún pero hay archivos) */}
            {!hasBatches && archivosIniciales.length > 0 && (
              <div className="border border-emerald-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-emerald-50">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Diseño inicial</p>
                      <p className="text-[10px] text-slate-400">Archivos del diseño aprobado</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-600 bg-emerald-50 border-emerald-200 whitespace-nowrap">
                    Enviado a impresión
                  </span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {archivosIniciales.map((file, idx) => (
                      <ArchivoCard
                        key={file.url || idx}
                        file={file}
                        onPreview={(f) => handleOpenPreview(archivosIniciales, idx)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Batches con sistema nuevo */}
            {hasBatches && todosLosBatches.map((batch, idx) => (
              <BatchCard
                key={batch.id || idx}
                batch={batch}
                proyectoId={proyectoId}
                onBatchUpdated={handleBatchUpdated}
                isNew={idx === todosLosBatches.length - 1 && batch.estado === 'draft' && showNuevoBatch}
                onPreview={(file) => handleOpenPreview(batch.archivos || [file], (batch.archivos || []).findIndex(f => f.url === file.url))}
              />
            ))}

            {/* Vacío */}
            {!hasBatches && archivosIniciales.length === 0 && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-400 text-sm">
                No se subieron archivos en esta fase.
              </div>
            )}
          </div>
        </div>

        {/* Botón agregar complementario */}
        {puedeAgregarComplementario && (
          <button
            onClick={handleAgregarBatch}
            disabled={addingBatch}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-600 font-bold text-sm rounded-2xl transition-all disabled:opacity-50"
          >
            {addingBatch ? (
              <><Clock size={16} className="animate-spin" /> Creando lote en borrador...</>
            ) : (
              <><Plus size={16} /> Agregar diseño complementario</>
            )}
          </button>
        )}

        {/* Aprobación (solo lectura) */}
        {fechaAprobacion && (
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-emerald-500" />
              Aprobación del Cliente
            </h3>
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-100/50 px-4 py-2.5 rounded-xl border border-emerald-200 w-fit">
              <CheckCircle size={16} className="shrink-0" />
              <span className="text-sm font-bold">Aprobado el {formatFechaAprobacion(fechaAprobacion)}</span>
            </div>
          </div>
        )}

        <MediaPreviewModal
          isOpen={previewModal.isOpen}
          onClose={handleClosePreview}
          files={previewModal.files}
          initialIndex={previewModal.index}
        />
      </div>
    );
  }

  // ── Vista editable original (proyecto aún en fase DISEÑO, sin batches) ──

  const archivos = archivosLegado;


  return (
    <div className="space-y-8">
      {/* 1. Subida de Archivo de Arte */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-blue-500" />
          Archivos de Arte Final
        </h3>

        {!soloLectura && (
          <div
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer mb-6 ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.ai,.psd,.dxf,.dwg,.eps,.cdr,.svg,.tif,.tiff,.jpg,.jpeg,.png,.webp,.gif,.zip,.rar,.7z"
              multiple
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-3">
              <UploadCloud size={20} className={isDragging ? 'text-blue-600' : 'text-slate-400'} />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-0.5">Arrastra y suelta los diseños aquí</p>
            <p className="text-xs text-slate-500 mb-3">Archivos soportados: DXF, DWG, AI, PSD, PDF, EPS, CDR, SVG, JPG, PNG, ZIP</p>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
              {uploading ? 'Subiendo...' : 'Seleccionar archivos'}
            </button>
          </div>
        )}

        {archivos.length === 0 ? (
          soloLectura && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-sm font-medium">
              No se subieron archivos en esta fase.
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archivos.map((file, idx) => (
              <ArchivoCard
                key={file.url || idx}
                file={file}
                onRemove={!soloLectura ? handleRemoveFile : undefined}
                onPreview={(f) => handleOpenPreview(archivos, idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. Aprobación del Cliente */}
      <div className="pt-6 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-emerald-500" />
          Aprobación del Cliente
        </h3>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">¿El cliente aprobó este arte?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Es necesario registrar la fecha de aprobación para poder avanzar el proyecto a Producción.
            </p>
          </div>

          <div className="w-full min-w-0">
            {fechaAprobacion ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-100/50 px-4 py-2.5 rounded-xl border border-emerald-200 w-full sm:w-auto">
                  <CheckCircle size={16} className="shrink-0" />
                  <span className="text-sm font-bold">Aprobado el {formatFechaAprobacion(fechaAprobacion)}</span>
                </div>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={() => updateFaseDatos('DISEÑO', { fechaAprobacionDiseno: '' })}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 self-start sm:self-center"
                    title="Deshacer aprobación"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 min-w-0 w-full">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    disabled={soloLectura || archivos.length === 0}
                    value={fechaAprobacion}
                    onChange={(e) => updateFaseDatos('DISEÑO', { fechaAprobacionDiseno: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={handleAprobarHoy}
                    disabled={archivos.length === 0}
                    className="w-full sm:w-auto sm:shrink-0 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={archivos.length === 0 ? 'Sube el archivo primero' : 'Marcar con fecha de hoy'}
                  >
                    Aprobar Hoy
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <MediaPreviewModal
        isOpen={previewModal.isOpen}
        onClose={handleClosePreview}
        files={previewModal.files}
        initialIndex={previewModal.index}
      />
    </div>
  );
});
