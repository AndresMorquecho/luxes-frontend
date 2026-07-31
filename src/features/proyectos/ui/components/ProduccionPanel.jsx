import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Printer, PlayCircle, CheckCircle, Clock, AlertTriangle, Send, XCircle, User, 
  UploadCloud, Plus, Minus, FileText, Lock, Image as ImageIcon, Eye, FileImage
} from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import { usePrintQueueStable } from '../../../colas-impresion/context/PrintQueueContext.jsx';
import { toast } from '../../../../shared/ui/components/Toast';
import { getMateriales } from '../../../inventario/application/inventarioService.js';
import { ProjectMediaImage } from '../../../../shared/ui/components/ProjectMediaImage.jsx';
import { resolveMediaUrl, getArchivoMediaSrc } from '../../../../shared/utils/mediaUrl.js';
import { MediaPreviewModal } from '../../../../shared/ui/components/MediaPreviewModal.jsx';

// ── Funciones puras (fuera del componente para no recrear en cada render) ─────

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
};

const parseJobFiles = (job) => {
  if (!job || !job.fileUrl) return [];
  const trimmed = job.fileUrl.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error parsing job files JSON:', e);
    }
  }
  return [{ name: job.name, url: job.fileUrl }];
};

const isImageFile = (name, url) => {
  const n = (name || '').toLowerCase();
  const u = (url || '').toLowerCase();
  return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') ||
    n.endsWith('.gif') || n.endsWith('.webp') ||
    u.startsWith('data:image') || u.includes('image') || u.startsWith('blob:');
};

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const getStatusConfig = (estado) => {
  switch(estado) {
    case 'Completado': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle, bar: 'bg-emerald-500', dotColor: '#10b981' };
    case 'Imprimiendo': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: PlayCircle, bar: 'bg-blue-500', dotColor: '#3b82f6' };
    case 'En espera': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock, bar: 'bg-slate-200', dotColor: '#f59e0b' };
    case 'Pausado': return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: Clock, bar: 'bg-slate-200', dotColor: '#64748b' };
    case 'Cancelado': return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, bar: 'bg-red-400', dotColor: '#ef4444' };
    default: return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: AlertTriangle, bar: 'bg-slate-200', dotColor: '#94a3b8' };
  }
};

const PrintJobCard = React.memo(function PrintJobCard({ group, onPreviewFiles }) {
  const [showTimeline, setShowTimeline] = useState(false);
  const latestJob = group.latestJob || group.allAttempts[0];
  const config = getStatusConfig(latestJob.trackingStatus);
  const StatusIcon = config.icon;
  const files = parseJobFiles(latestJob);
  const cancelledCount = group.cancelledCount || 0;

  // Ordenar intentos cronológicamente (más antiguo primero -> más reciente al final)
  const sortedAttempts = [...group.allAttempts].sort((a, b) => {
    const timeA = new Date(a.sentToQueueAt || a.sentAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.sentToQueueAt || b.sentAt || b.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return Number(a.id || 0) - Number(b.id || 0);
  });

  const isMultiAttempt = sortedAttempts.length > 1;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 120px' }}>
      {/* Job Header (Siempre visible con el estado actual) */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg shrink-0 ${config.bg} ${config.color}`}>
            <StatusIcon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-800 truncate" title={latestJob.name}>{latestJob.name}</h4>
              {cancelledCount > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  Cancelado / Re-intentado: {cancelledCount} {cancelledCount === 1 ? 'vez' : 'veces'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5" title={`${latestJob.copies} cop. • ${latestJob.format} • ${latestJob.width}m x ${latestJob.height}m`}>
              {latestJob.copies} cop. • {latestJob.format} • {latestJob.width}m x {latestJob.height}m
            </p>
            {files.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap min-w-0">
                <div className="flex flex-wrap gap-1.5 items-center min-w-0">
                  {files.slice(0, 4).map((f, i) => (
                    <span
                      key={i}
                      onClick={() => onPreviewFiles?.(files, i)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer max-w-[200px] truncate"
                      title={`Previsualizar ${f.name}`}
                    >
                      <FileImage size={13} className="text-slate-500 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </span>
                  ))}
                  {files.length > 4 && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
                      +{files.length - 4} más
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onPreviewFiles?.(files, 0)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                >
                  <Eye size={13} />
                  <span>Ver {files.length} {files.length === 1 ? 'imagen' : 'imágenes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md ${config.bg} ${config.color} border ${config.border}`}>
            {latestJob.trackingStatus}
          </span>
          <button
            type="button"
            onClick={() => setShowTimeline(prev => !prev)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Ver línea de tiempo detallada"
          >
            <Clock size={14} />
            <span>{showTimeline ? 'Ocultar línea de tiempo' : 'Ver línea de tiempo'}</span>
          </button>
        </div>
      </div>

      {/* Timeline Events desplegable */}
      {showTimeline && (
        <div className="px-5 py-4 border-t border-slate-100 animate-fadeIn">
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-slate-200 rounded-full" />

            {sortedAttempts.map((att, attIdx) => {
              const attConfig = getStatusConfig(att.trackingStatus);

              return (
                <React.Fragment key={att.id || attIdx}>
                  {isMultiAttempt && (
                    <div className="relative flex items-center gap-2 pt-2 first:pt-0">
                      <div className="absolute left-[-15px] top-3 w-3 h-3 rounded-full bg-slate-600 border-2 border-white shadow-sm z-10" />
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 uppercase tracking-wider">
                        Intento #{attIdx + 1} {att.trackingStatus === 'Cancelado' ? '(Cancelado)' : ''}
                      </span>
                    </div>
                  )}

                  {att.sentToQueueAt && (
                    <div className="relative flex items-start gap-3">
                      <div className="absolute left-[-15px] top-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-sm z-10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Send size={12} className="text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700">
                            {attIdx > 0 ? 'Re-enviado a cola de impresión' : 'Enviado a cola de impresión'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-slate-500">{formatDateTime(att.sentToQueueAt)}</span>
                          {att.sentBy && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1"><User size={10} /> {att.sentBy}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {att.startedPrintingAt && (
                    <div className="relative flex items-start gap-3">
                      <div className="absolute left-[-15px] top-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm z-10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <PlayCircle size={12} className="text-blue-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700">Impresión iniciada</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-slate-500">{formatDateTime(att.startedPrintingAt)}</span>
                          {att.responsible && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1"><User size={10} /> {att.responsible}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {att.completedAt && (
                    <div className="relative flex items-start gap-3">
                      <div className="absolute left-[-15px] top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10" style={{ backgroundColor: attConfig.dotColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {att.trackingStatus === 'Cancelado'
                            ? <XCircle size={12} className="text-red-500 shrink-0" />
                            : <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                          }
                          <span className="text-xs font-bold text-slate-700">
                            {att.trackingStatus === 'Cancelado' ? `Cancelado (Intento #${attIdx + 1})` : 'Impresión finalizada'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-slate-500">{formatDateTime(att.completedAt)}</span>
                          {att.elapsedSeconds > 0 && (
                            <span className="text-[11px] text-slate-400">Duración: {formatDuration(att.elapsedSeconds)}</span>
                          )}
                        </div>
                        {att.trackingStatus === 'Cancelado' && att.cancelReason && (
                          <div className="mt-1.5 px-2.5 py-1.5 bg-red-50 border-l-3 rounded text-[11px] text-red-600" style={{ borderLeft: '3px solid #f87171' }}>
                            <strong>Motivo de cancelación:</strong> {att.cancelReason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!att.completedAt && att.trackingStatus !== 'Cancelado' && (
                    <div className="relative flex items-start gap-3">
                      <div className="absolute left-[-15px] top-0.5 w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow-sm z-10" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-slate-400 italic">
                          {att.trackingStatus === 'Imprimiendo' ? 'Imprimiendo ahora...' : 'En espera de impresión...'}
                        </span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export const ProduccionPanel = React.memo(function ProduccionPanel({ proyectoId, soloLectura = false }) {
  const { proyecto } = useProyecto(proyectoId);
  const { getJobsByProyectoId, addJobToQueue } = usePrintQueueStable();
  const [activeSubTab, setActiveSubTab] = useState('timeline'); // 'timeline' or 'enviar'
  const [showAllArtFiles, setShowAllArtFiles] = useState(false);
  const MAX_VISIBLE_ART_FILES = 4;
  const [loadedProyectoId, setLoadedProyectoId] = useState(null);
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

  const parseJobFiles = (job) => {
    if (!job || !job.fileUrl) return [];
    const trimmed = job.fileUrl.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing job files JSON:', e);
      }
    }
    return [{
      name: job.name,
      url: job.fileUrl
    }];
  };

  // Form States
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('Lona brillo'); // Material/Sustrato
  const [client, setClient] = useState(''); // Client Name
  const [urgency, setUrgency] = useState('Media'); // Urgency: Alta, Media, Baja
  const [copies, setCopies] = useState(1);
  const [sentBy] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'));
      return u?.username || u?.nombre || 'Sistema';
    } catch {
      return 'Sistema';
    }
  });
  const [width, setWidth] = useState('1.0'); // Width in meters
  const [height, setHeight] = useState('1.0'); // Height in meters
  const [notes, setNotes] = useState(''); // Special instructions/notes
  const [fileFromProject, setFileFromProject] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successJobName, setSuccessJobName] = useState('');
  const [materialesList, setMaterialesList] = useState([]);
  // Combobox de sustrato
  const [matSearch, setMatSearch] = useState('');
  const [matOpen, setMatOpen] = useState(false);
  const matComboRef = useRef(null);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (matComboRef.current && !matComboRef.current.contains(e.target)) {
        setMatOpen(false);
        setMatSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const materialesFiltrados = matSearch.trim()
    ? materialesList.filter(m => m.nombre.toLowerCase().includes(matSearch.toLowerCase()))
    : materialesList;

  useEffect(() => {
    const fetchMateriales = async () => {
      try {
        const response = await getMateriales({ tipo: 'consumible', categoria: 'Impresión', incluirDerivados: true });
        const list = Array.isArray(response) ? response : (response?.items || []);
        // Filtrar tintas + materiales sin stock
        const sustratos = list.filter(m =>
          !m.nombre.toLowerCase().includes('tinta') &&
          !m.nombre.toLowerCase().includes('cyan') &&
          !m.nombre.toLowerCase().includes('magenta') &&
          !m.nombre.toLowerCase().includes('yellow') &&
          !m.nombre.toLowerCase().includes('black') &&
          (m.stockActual ?? 0) > 0  // solo materiales con stock disponible
        );
        setMaterialesList(sustratos);
        if (sustratos.length > 0) {
          setFormat(sustratos[0].nombre);
        }
      } catch (err) {
        console.error('Error fetching print materials:', err);
      }
    };
    fetchMateriales();
  }, []);

  // Agrupar trabajos vinculados por lote (batchId o nombre) para mantener 1 sola tarjeta por lote
  const groupedJobs = useMemo(() => {
    const list = getJobsByProyectoId(proyectoId) || [];
    if (list.length === 0) return [];

    const map = new Map();
    list.forEach((job) => {
      const key = job.batchId ? `batch-${job.batchId}` : (job.name || `job-${job.id}`);
      if (!map.has(key)) {
        map.set(key, {
          key,
          batchId: job.batchId || null,
          name: job.name,
          latestJob: job,
          allAttempts: [job],
          cancelledCount: job.trackingStatus === 'Cancelado' ? 1 : 0,
        });
      } else {
        const grp = map.get(key);
        grp.allAttempts.push(job);
        if (job.trackingStatus === 'Cancelado') {
          grp.cancelledCount += 1;
        }

        const currActive = job.trackingStatus === 'Imprimiendo' || job.trackingStatus === 'En espera' || job.trackingStatus === 'Completado';
        const prevActive = grp.latestJob.trackingStatus === 'Imprimiendo' || grp.latestJob.trackingStatus === 'En espera' || grp.latestJob.trackingStatus === 'Completado';

        if (currActive && !prevActive) {
          grp.latestJob = job;
        } else if (Number(job.id) > Number(grp.latestJob.id)) {
          grp.latestJob = job;
        }
      }
    });

    return Array.from(map.values());
  }, [getJobsByProyectoId, proyectoId]);

  const impresionEnviada = groupedJobs.some(grp => grp.latestJob && grp.latestJob.trackingStatus !== 'Cancelado');
  const formBloqueado = soloLectura || impresionEnviada;

  useEffect(() => {
    // Set initial tab when switching projects
    setActiveSubTab(impresionEnviada ? 'timeline' : 'enviar');
  }, [proyectoId, impresionEnviada]);

  // Initialize and pre-fill form data when project changes
  useEffect(() => {
    if (proyecto && proyecto.id !== loadedProyectoId) {
      setLoadedProyectoId(proyecto.id);
      setClient(proyecto.cliente?.empresa || proyecto.cliente?.nombre || proyecto.clienteNombre || '');
      
      // Auto-load design files if they exist in DISEÑO phase
      const disenoFase = proyecto.fases?.['DISEÑO'] || proyecto.fases?.DISEÑO;
      const datos = disenoFase?.datos || {};
      const archivosArte = datos.archivosArte || (datos.archivoArte ? [datos.archivoArte] : []);
      if (archivosArte.length > 0) {
        if (archivosArte.length === 1) {
          setFile({
            name: archivosArte[0].name,
            sizeDisplay: archivosArte[0].size,
            type: archivosArte[0].type || 'application/pdf',
            url: archivosArte[0].url,
            fromProject: true
          });
        } else {
          setFile({
            name: `${archivosArte.length} archivos de diseño`,
            isMultiple: true,
            files: archivosArte.map(art => ({
              name: art.name,
              sizeDisplay: art.size,
              type: art.type || 'application/pdf',
              url: art.url,
              fromProject: true
            })),
            fromProject: true
          });
        }
        setFileFromProject(true);
      } else {
        setFile(null);
        setFileFromProject(false);
      }
    }
  }, [proyecto, loadedProyectoId]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length === 1) {
        setFile(filesArray[0]);
      } else {
        setFile({
          name: `${filesArray.length} archivos locales`,
          isMultiple: true,
          files: filesArray.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type,
            rawFile: f
          })),
          fromProject: false
        });
      }
      setFileFromProject(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!fileFromProject) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (fileFromProject) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      if (filesArray.length === 1) {
        setFile(filesArray[0]);
      } else {
        setFile({
          name: `${filesArray.length} archivos locales`,
          isMultiple: true,
          files: filesArray.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type,
            rawFile: f
          })),
          fromProject: false
        });
      }
    }
  };

  const adjustCopies = (amount) => {
    setCopies(prev => Math.max(1, prev + amount));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || formBloqueado) return;

    if (impresionEnviada) {
      toast.error('Este proyecto ya fue enviado a impresión. Revisa el timeline o la cola de impresión.');
      return;
    }

    const filesToSubmit = file.isMultiple ? file.files : [file];
    let fileUrl = '';
    let jobName = '';

    if (filesToSubmit.length === 1) {
      const currentFile = filesToSubmit[0];
      fileUrl = currentFile.fromProject 
        ? currentFile.url 
        : URL.createObjectURL(currentFile.rawFile || currentFile);
      jobName = currentFile.name;
    } else {
      const filesJson = filesToSubmit.map(f => ({
        name: f.name,
        url: f.fromProject ? f.url : URL.createObjectURL(f.rawFile || f),
        sizeDisplay: f.sizeDisplay || (f.size ? `${(f.size / 1024 / 1024).toFixed(2)} MB` : 'Archivo')
      }));
      fileUrl = JSON.stringify(filesJson);
      jobName = filesToSubmit.length === 1 ? filesToSubmit[0].name : `${filesToSubmit.length} archivos de diseño`;
    }

    const sentAtFormatted = new Date().toISOString();

    const newJob = {
      name: jobName,
      copies: copies,
      format: format,
      sentBy: sentBy || 'ISAM',
      sentAt: sentAtFormatted,
      sentToQueueAt: sentAtFormatted,
      fileUrl: fileUrl,
      client: client,
      urgency: urgency,
      width: parseFloat(width) || 1.0,
      height: parseFloat(height) || 1.0,
      notes: notes.trim(),
      proyectoId: proyecto.id,
      proyectoNombre: proyecto.nombre
    };

    try {
      await addJobToQueue(newJob);

      // Show Toast
      setSuccessJobName(file.name);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 4000);

      // Reset form controls except client name and file From design
      if (materialesList.length > 0) {
        setFormat(materialesList[0].nombre);
      } else {
        setFormat('Lona brillo');
      }
      setUrgency('Media');
      setCopies(1);
      setWidth('1.0');
      setHeight('1.0');
      setNotes('');

      // Auto switch back to Timeline tab
      setActiveSubTab('timeline');
    } catch (err) {
      console.error('[ProduccionPanel] Error submitting job:', err);
      toast.error(err.message || 'No se pudo enviar a impresión');
    }
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-white border-l-4 border-emerald-500 rounded-xl shadow-lg p-4 max-w-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">¡Documento Encolado!</h4>
            <p className="text-xs text-slate-500 mt-0.5">"{successJobName}" fue enviado a la cola con éxito.</p>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('timeline')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'timeline'
              ? 'bg-white text-blue-600 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Timeline de Impresión
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('enviar')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'enviar'
              ? 'bg-white text-blue-600 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Enviar a Impresión
        </button>
      </div>

      <div style={{ display: activeSubTab === 'timeline' ? 'block' : 'none' }}>
        {/* Timeline de Impresiones Vinculadas */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Printer size={18} className="text-purple-500" />
              Timeline de Impresiones
            </h3>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
              {groupedJobs.length} {groupedJobs.length === 1 ? 'lote de impresión' : 'lotes de impresión'}
            </span>
          </div>

          {groupedJobs.length === 0 ? (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Clock size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Diseño aprobado, esperando producción</p>
                <p className="text-xs text-slate-500 mt-1">
                  Envía un trabajo de impresión para este proyecto desde la pestaña de <strong>Enviar a Impresión</strong> para comenzar la producción.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Usar PrintJobCard memoizado con tarjeta única por lote */}
              {groupedJobs.map((group) => (
                <PrintJobCard key={group.key} group={group} onPreviewFiles={handleOpenPreview} />
              ))}
            </div>
          )}

        </div>
      </div>
      <div style={{ display: activeSubTab === 'enviar' ? 'block' : 'none' }}>
        {/* Enviar a Impresión Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800">Enviar Trabajo a Impresión</h3>
              <p className="text-xs text-slate-500 mt-1">Configura las especificaciones del archivo y encola el trabajo directamente en el taller.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-xs font-bold shrink-0">
              <Lock size={14} />
              <span className="truncate max-w-[140px]" title={proyecto?.id}>Proyecto: {proyecto?.id}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {impresionEnviada && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Envío único completado</p>
                  <p className="text-xs text-amber-800 mt-1">
                    Este proyecto ya fue enviado a la cola de impresión. No se permiten reenvíos.
                    Sigue el progreso en <strong>Timeline de Impresión</strong> o en el módulo de cola del taller.
                  </p>
                </div>
              </div>
            )}
            {/* Select Design from Project if available */}
            {proyecto && (() => {
              const disenoFase = proyecto.fases?.['DISEÑO'] || proyecto.fases?.DISEÑO;
              const datosD = disenoFase?.datos || {};
              const rawArte = datosD.archivosArte || (datosD.archivoArte ? [datosD.archivoArte] : []);
              const archivosArte = rawArte.map(f => {
                if (typeof f === 'string') {
                  const cleanName = f.split('?')[0].split('#')[0].split('/').pop() || 'Archivo de Diseño';
                  return { name: cleanName, url: f };
                }
                return f;
              });

              if (archivosArte.length === 0) return null;

              return (
                <div className="flex flex-col gap-1.5 mb-2 animate-slide-up">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                      <ImageIcon size={14} className="text-purple-500 shrink-0" />
                      <span className="truncate">Archivos de Diseño Vinculados ({archivosArte.length})</span>
                    </label>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 shrink-0 self-start sm:self-auto">
                      Se enviarán todos automáticamente
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-1">
                    {(showAllArtFiles ? archivosArte : archivosArte.slice(0, MAX_VISIBLE_ART_FILES)).map((art, idx) => (
                      <div
                        key={art.url || idx}
                        onClick={() => handleOpenPreview(archivosArte, idx)}
                        className="flex flex-col items-center justify-center p-3 border border-purple-200 bg-purple-50/40 hover:bg-purple-100/60 rounded-xl gap-1.5 relative shadow-sm cursor-pointer transition-all hover:scale-[1.02]"
                        title={`Previsualizar ${art.name}`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border border-purple-200 text-purple-600 shrink-0 shadow-xs">
                          <FileImage size={18} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-700 truncate w-full text-center">
                          {art.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenPreview(archivosArte, idx); }}
                          className="text-[9px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                        >
                          <Eye size={10} /> Ver
                        </button>
                        <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold border border-white">
                          ✓
                        </span>
                      </div>
                    ))}
                    {!showAllArtFiles && archivosArte.length > MAX_VISIBLE_ART_FILES && (
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(archivosArte, MAX_VISIBLE_ART_FILES)}
                        className="flex flex-col items-center justify-center p-3 border border-dashed border-purple-300 bg-purple-50/50 rounded-xl gap-1 text-purple-600 hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        <span className="text-base font-bold">+{archivosArte.length - MAX_VISIBLE_ART_FILES}</span>
                        <span className="text-[10px] font-semibold flex items-center gap-1">
                          <Eye size={11} /> Ver todos
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* File Dropzone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documento a Imprimir</label>
              {!file ? (
                formBloqueado ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 flex flex-col items-center justify-center gap-2 opacity-50 cursor-not-allowed select-none">
                    <Lock size={28} className="text-slate-300" />
                    <span className="text-sm font-semibold text-slate-400">
                      {impresionEnviada ? 'Ya enviado a impresión — no se permiten reenvíos' : 'Solo lectura — proyecto concluido'}
                    </span>
                  </div>
                ) : (
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-100/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById(`embedded-file-input-${proyectoId}`).click()}
                >
                  <input 
                    type="file" 
                    id={`embedded-file-input-${proyectoId}`} 
                    onChange={handleFileChange} 
                    accept=".pdf,.png,.jpg,.jpeg,.ai,.eps" 
                    multiple
                    style={{ display: 'none' }}
                  />
                  <UploadCloud size={32} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">Arrastra tus archivos o haz clic para buscar</span>
                  <span className="text-xs text-slate-500">PDF, AI, PNG, JPG, EPS (Cualquier tamaño)</span>
                </div>
                )
              ) : (
                <div className="flex flex-col bg-blue-50 border border-blue-200 p-4 rounded-xl gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-100 pb-2 gap-2 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-bold text-blue-800 truncate" title={file.name}>{file.name}</span>
                        <span className="text-xs text-slate-500 truncate">
                          {file.isMultiple ? 'Múltiples archivos listos para enviar' : (fileFromProject ? file.sizeDisplay || 'Archivo de diseño aprobado' : `${(file.size / 1024 / 1024).toFixed(2)} MB`)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 justify-end sm:justify-start">
                      {fileFromProject && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0">
                          Diseño
                        </span>
                      )}
                      {/* Only allow removing file if it is NOT from design phase and project is NOT read-only */}
                      {!fileFromProject && !formBloqueado && (
                        <button 
                          type="button" 
                          onClick={() => { setFile(null); setFileFromProject(false); }} 
                          className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                          title="Remover archivos"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* If multiple, display the list of files */}
                  {(file.isMultiple || file.files) && (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {file.files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-slate-700 bg-white/80 px-3 py-1.5 rounded-lg border border-slate-100 shadow-xs hover:border-slate-200 transition-all">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileImage size={14} className="text-purple-500 shrink-0" />
                            <span className="truncate font-medium text-slate-800 cursor-pointer hover:text-purple-700" onClick={() => handleOpenPreview(file.files, idx)} title={f.name}>{f.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-500">
                              {f.fromProject ? f.sizeDisplay || 'Diseño' : `${(f.size / 1024 / 1024).toFixed(2)} MB`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenPreview(file.files, idx)}
                              className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                              title="Previsualizar imagen"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 1: Cliente + Prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</label>
                <input 
                  type="text" 
                  value={client} 
                  onChange={e => setClient(e.target.value)}
                  placeholder="Nombre del cliente"
                  disabled={formBloqueado}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridad</label>
                <select 
                  value={urgency} 
                  onChange={e => setUrgency(e.target.value)}
                  disabled={formBloqueado}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>

            {/* Row 2: Sustrato / Material — Combobox buscador */}
            <div className="flex flex-col gap-1.5" ref={matComboRef}>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sustrato / Material</label>
              <div className="relative">
                {/* Input visible */}
                <div
                  className={`w-full flex items-center px-3 py-2 rounded-lg border text-sm bg-white text-slate-800 transition-all cursor-pointer
                    ${formBloqueado ? 'bg-slate-100 cursor-not-allowed border-slate-300' : 'border-slate-300 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'}`}
                  onClick={() => !formBloqueado && setMatOpen(v => !v)}
                >
                  {matOpen ? (
                    <input
                      autoFocus
                      value={matSearch}
                      onChange={e => setMatSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Buscar material..."
                      className="flex-1 outline-none bg-transparent text-sm text-slate-800 placeholder-slate-400"
                      disabled={formBloqueado}
                    />
                  ) : (
                    <span className={`flex-1 truncate ${!format ? 'text-slate-400' : 'text-slate-800'}`}>
                      {format
                        ? (() => {
                            const mat = materialesList.find(m => m.nombre === format);
                            const unidad = mat?.unidadMedida?.abreviacion || mat?.unidadMedida?.nombre || 'm';
                            const stock = mat?.stockActual ?? 0;
                            return mat ? `${mat.nombre} — Stock: ${stock} ${unidad}` : format;
                          })()
                        : 'Seleccionar material...'}
                    </span>
                  )}
                  <svg className={`ml-2 w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${matOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>

                {/* Dropdown */}
                {matOpen && !formBloqueado && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {materialesFiltrados.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400 text-center">Sin resultados</div>
                    ) : (
                      <ul className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                        {materialesFiltrados.map(mat => {
                          const unidad = mat.unidadMedida?.abreviacion || mat.unidadMedida?.nombre || 'm';
                          const stock = mat.stockActual ?? 0;
                          const isRollo = /^\[R\d+\]/.test(mat.nombre);
                          const isSelected = format === mat.nombre;
                          return (
                            <li
                              key={mat.id}
                              onClick={() => { setFormat(mat.nombre); setMatOpen(false); setMatSearch(''); }}
                              className={`px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 text-sm transition-colors
                                ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-800'}`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {isRollo && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 flex-shrink-0">
                                    {mat.nombre.match(/^\[R(\d+)\]/)?.[1] || 'R'}
                                  </span>
                                )}
                                <span className="truncate font-medium">{isRollo ? mat.nombre.replace(/^\[R\d+\]\s*/, '') : mat.nombre}</span>
                              </span>
                              <span className={`text-xs font-semibold flex-shrink-0 ${stock < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {stock} {unidad}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Copias + Ancho + Alto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Copias</label>
                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                  <button type="button" onClick={() => adjustCopies(-1)} disabled={formBloqueado} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border-r border-slate-300 disabled:opacity-50">-</button>
                  <input 
                    type="number" 
                    value={copies} 
                    onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={formBloqueado}
                    className="w-full text-center text-sm font-semibold text-slate-800 outline-none disabled:bg-slate-100"
                    min="1"
                  />
                  <button type="button" onClick={() => adjustCopies(1)} disabled={formBloqueado} className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border-l border-slate-300 disabled:opacity-50">+</button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ancho (m)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.05"
                  value={width} 
                  onChange={e => setWidth(e.target.value)}
                  placeholder="1.0"
                  disabled={formBloqueado}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alto (m)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.05"
                  value={height} 
                  onChange={e => setHeight(e.target.value)}
                  placeholder="1.0"
                  disabled={formBloqueado}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            {/* Notes / Special Instructions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instrucciones Especiales / Notas</label>
              <textarea 
                rows="3"
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="Añadir notas del acabado, troquelado, refuerzos perimetrales u ojalillos..."
                disabled={formBloqueado}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-3">
              <button 
                type="submit" 
                disabled={!file || impresionEnviada || soloLectura}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                title={impresionEnviada ? 'Este proyecto ya fue enviado a impresión. No se permiten reenvíos.' : undefined}
              >
                <Printer size={16} />
                <span>{impresionEnviada ? 'Ya enviado a impresión' : 'Enviar a Impresión'}</span>
              </button>
            </div>
          </form>
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
