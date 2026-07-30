import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, CheckCircle, File, Trash2, Calendar, ShieldCheck, X, Plus, Printer, Package, Clock, AlertCircle, Send, RotateCcw, XCircle } from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import { usePrintQueue } from '../../../colas-impresion/context/PrintQueueContext.jsx';
import { toast } from '../../../../shared/ui/components/toastStore.js';
import {
  uploadArchivoDiseno,
  createBatchDiseno,
  addArchivoToBatch,
  enviarBatchImpresion,
} from '../../application/proyectosService.js';
import { alertDialog } from '../../../../shared/ui/components/ConfirmModal';
import { ProjectMediaImage } from '../../../../shared/ui/components/ProjectMediaImage.jsx';

// ── Helpers ────────────────────────────────────────────────────────────────

const ESTADO_BATCH = {
  pending_print: { label: 'Pendiente de impresión', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  printed:       { label: 'Enviado a impresión',    color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelled:     { label: 'Cancelado',              color: 'text-slate-400 bg-slate-50 border-slate-200' },
};

const ArchivoCard = React.memo(function ArchivoCard({ file, onRemove }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-1 overflow-hidden"
      style={{ contain: 'content' }}
    >
      <div className="flex gap-4 p-4">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden shrink-0 relative group"
          style={{ minWidth: '80px', minHeight: '80px' }}
        >
          {file.type && file.type.includes('image') ? (
            <ProjectMediaImage
              archivo={file}
              alt="Preview"
              className="w-full h-full object-cover"
              width={80}
              height={80}
            />
          ) : (
            <File size={28} className="text-slate-400" />
          )}
          {/* Sin backdrop-blur: creaba capas de compositing por cada tarjeta */}
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-[10px] font-bold bg-slate-800/80 px-2 py-1 rounded">Ver</span>
          </div>
        </a>
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-800 truncate" title={file.name}>{file.name}</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">{file.size} • {file.type?.split('/')[1]?.toUpperCase() || 'Archivo'}</p>
            </div>
            {onRemove && (
              <button
                onClick={() => onRemove(file.url)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                title="Eliminar archivo"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit mt-2">
            <CheckCircle size={12} /> Listo para impresión
          </div>
        </div>
      </div>
    </div>
  );
});


// ── Sub-componente: Lote Individual ────────────────────────────────────────

// React.memo: solo re-renderiza si sus propios datos cambiaron
// jobsDelProyecto viene del padre (una sola llamada a getJobsByProyectoId)
const BatchCard = React.memo(function BatchCard({ batch, proyectoId, onBatchUpdated, isNew, jobsDelProyecto }) {
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Buscar si el job asociado existe y cuál es su estado en la cola
  const associatedJob = batch.jobImpresionId 
    ? (jobsDelProyecto || []).find(j => String(j.id) === String(batch.jobImpresionId))
    : null;

  const jobCancelado = associatedJob?.trackingStatus === 'Cancelado';

  const estadoConfig = ESTADO_BATCH[batch.estado] || ESTADO_BATCH.pending_print;
  const archivos = Array.isArray(batch.archivos) ? batch.archivos : [];

  const handleFilesSelect = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        // 1. Subir al endpoint genérico de diseño (guarda en disco)
        const fileData = await uploadArchivoDiseno(proyectoId, file);
        // 2. Asociar el archivo al batch
        await addArchivoToBatch(proyectoId, batch.id, fileData);
      }
      onBatchUpdated?.();
    } catch (err) {
      console.error('Error al subir archivos al lote:', err);
      await alertDialog('Error', 'Error al subir archivos: ' + err.message, { type: 'warning' });
    } finally {
      setUploading(false);
    }
  };

  const handleEnviarImpresion = async () => {
    if (archivos.length === 0) {
      await alertDialog('Sin archivos', 'Sube al menos un archivo antes de enviar a impresión.', { type: 'warning' });
      return;
    }
    setSending(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      await enviarBatchImpresion(proyectoId, batch.id, {
        sentBy: user?.nombre || 'Diseño',
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

  // Un lote se considera "cerrado" si tiene un job activo o completado (NO cancelado)
  const yaEnviado = (!!batch.jobImpresionId || batch.estado === 'printed' || batch.estado === 'pending_print') && !jobCancelado;
  // Solo se puede editar/subir si el lote NO está enviado activo
  const canEdit = !yaEnviado;
  // Solo se puede enviar si hay archivos y no está enviado activo
  const canSend = !yaEnviado && archivos.length > 0;

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all ${isNew && !yaEnviado ? 'border-blue-200 shadow-blue-50 shadow-md' : jobCancelado ? 'border-red-200' : 'border-slate-200'}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 260px' }}
    >
      {/* Header del batch */}
      <div className={`px-4 py-3 flex items-center justify-between gap-3 ${isNew && !yaEnviado ? 'bg-blue-50' : jobCancelado ? 'bg-red-50' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Package size={15} className={isNew && !yaEnviado ? 'text-blue-500' : jobCancelado ? 'text-red-500' : 'text-slate-400'} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{batch.label}</p>
            {batch.creadoEn && (
              <p className="text-[10px] text-slate-400">{batch.creadoEn}</p>
            )}
          </div>
        </div>
        {/* Badge de estado */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
          jobCancelado
            ? 'text-red-600 bg-red-100 border-red-200'
            : yaEnviado
              ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
              : estadoConfig.color
        }`}>
          {jobCancelado ? 'Impresión Cancelada' : yaEnviado ? 'Enviado a impresión' : estadoConfig.label}
        </span>
      </div>

      {/* Archivos del batch */}
      <div className="p-4 space-y-3">
        {archivos.length === 0 && !canEdit && (
          <p className="text-xs text-slate-400 text-center py-3">Sin archivos en este lote</p>
        )}

        {archivos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {archivos.map((file, idx) => (
              <ArchivoCard key={file.url || idx} file={file} onRemove={canEdit ? undefined : undefined} />
            ))}
          </div>
        )}

        {/* Zona de upload (solo si el lote aún no fue enviado) */}
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
              accept=".pdf,.ai,.psd,.jpg,.png"
              multiple
              onChange={(e) => { if (e.target.files?.length > 0) handleFilesSelect(Array.from(e.target.files)); }}
            />
            <UploadCloud size={18} className={isDragging ? 'text-blue-500' : 'text-slate-400'} />
            <p className="text-xs font-semibold text-slate-600 mt-1.5">
              {uploading ? 'Subiendo...' : 'Arrastra o haz clic para subir'}
            </p>
            <p className="text-[10px] text-slate-400">PDF, AI, PSD, JPG, PNG</p>
          </div>
        )}

        {jobCancelado && (
          <div className="flex flex-col gap-1 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-1.5 font-bold">
              <XCircle size={14} className="text-red-500 shrink-0" />
              <span>Impresión Anterior Cancelada (Job #{batch.jobImpresionId})</span>
            </div>
            {associatedJob?.cancelReason && (
              <p className="text-[11px] text-red-600 ml-5 font-medium">Motivo: {associatedJob.cancelReason}</p>
            )}
            <p className="text-[10px] text-slate-500 ml-5 mt-0.5">Puedes agregar/modificar archivos si lo deseas y presionar "Enviar lote a cola de impresión" para re-intentar.</p>
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
                {jobCancelado ? <RotateCcw size={15} /> : <Send size={15} />}
                {jobCancelado ? 'Re-enviar lote a cola de impresión' : 'Enviar lote a cola de impresión'}
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
  // Una sola llamada para todos los BatchCards (en vez de N llamadas, una por card)
  const { getJobsByProyectoId } = usePrintQueue();
  const jobsDelProyecto = getJobsByProyectoId(proyectoId);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);
  const [showNuevoBatch, setShowNuevoBatch] = useState(false);

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
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      await createBatchDiseno(proyectoId, {
        label: `Ítem complementario`,
      });
      setShowNuevoBatch(true);
      // Recargar datos del proyecto para obtener el nuevo batch
      if (reloadProyecto) await reloadProyecto();
    } catch (err) {
      console.error('Error al agregar batch:', err);
      await alertDialog('Error', err.message, { type: 'warning' });
    } finally {
      setAddingBatch(false);
    }
  };

  const handleBatchUpdated = async () => {
    if (reloadProyecto) await reloadProyecto();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Si el proyecto ya pasó la fase de diseño (soloLectura=true) y hay batches
  // O si soloLectura y queremos ofrecer agregar ítems complementarios
  const mostrarBatches = soloLectura || hasBatches;

  // Determinar si la sección de "agregar complementario" debe estar disponible
  // (disponible cuando el proyecto ya no está en DISEÑO como fase actual)
  const faseActual = proyecto?.faseActual || '';
  const fasesPostDiseno = ['PRODUCCION', 'INSTALACION', 'ENTREGA', 'COMPLETADO'];
  const puedeAgregarComplementario = fasesPostDiseno.includes(faseActual);

  if (mostrarBatches) {
    // ── Vista con batches (proyecto ya avanzó o ya tiene batches) ─────────
    const todosLosBatches = batches || [];
    const archivosIniciales = !hasBatches ? archivosLegado : [];

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
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Package size={18} className="text-indigo-500" />
            Lotes de Diseño
          </h3>

          <div className="space-y-4" style={{ contain: 'content' }}>
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
                      <ArchivoCard key={file.url || idx} file={file} />
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
                isNew={idx === todosLosBatches.length - 1 && batch.estado === 'pending_print' && showNuevoBatch}
                jobsDelProyecto={jobsDelProyecto}
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
              <><Clock size={16} className="animate-spin" /> Creando lote...</>
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
              accept=".pdf,.ai,.psd,.jpg,.png"
              multiple
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-3">
              <UploadCloud size={20} className={isDragging ? 'text-blue-600' : 'text-slate-400'} />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-0.5">Arrastra y suelta los diseños aquí</p>
            <p className="text-xs text-slate-500 mb-3">Archivos soportados: PDF, AI, PSD, JPG, PNG</p>
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
    </div>
  );
});
