import React, { useState, useEffect } from 'react';
import { 
  Printer, PlayCircle, CheckCircle, Clock, AlertTriangle, Send, XCircle, User, 
  UploadCloud, Plus, Minus, FileText, Lock, Image as ImageIcon
} from 'lucide-react';
import { useProyecto } from '../../application/hooks/useProyecto.js';
import { usePrintQueue } from '../../../colas-impresion/context/PrintQueueContext.jsx';
import { toast } from '../../../../shared/ui/components/Toast';
import { getMateriales } from '../../../inventario/application/inventarioService.js';

export function ProduccionPanel({ proyectoId, soloLectura = false }) {
  const { proyecto } = useProyecto(proyectoId);
  const { getJobsByProyectoId, addJobToQueue } = usePrintQueue();
  const [activeSubTab, setActiveSubTab] = useState('timeline'); // 'timeline' or 'enviar'
  const [loadedProyectoId, setLoadedProyectoId] = useState(null);

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

  useEffect(() => {
    const fetchMateriales = async () => {
      try {
        const response = await getMateriales({ tipo: 'consumible', categoria: 'Impresión' });
        const list = Array.isArray(response) ? response : (response?.items || []);
        // Filtrar tintas que no son sustratos de impresión
        const sustratos = list.filter(m => 
          !m.nombre.toLowerCase().includes('tinta') &&
          !m.nombre.toLowerCase().includes('cyan') &&
          !m.nombre.toLowerCase().includes('magenta') &&
          !m.nombre.toLowerCase().includes('yellow') &&
          !m.nombre.toLowerCase().includes('black')
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

  // Get real print jobs linked to this project
  const linkedJobs = getJobsByProyectoId(proyectoId);
  const impresionEnviada = linkedJobs.some((job) => job.trackingStatus !== 'Cancelado');
  const formBloqueado = soloLectura || impresionEnviada;

  useEffect(() => {
    if (impresionEnviada) {
      setActiveSubTab('timeline');
    }
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

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

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

    const now = new Date();
    const sentAtFormatted = now.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

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
        <div className="fixed top-4 right-4 z-50 bg-white border-l-4 border-emerald-500 rounded-xl shadow-lg p-4 max-w-sm flex items-center gap-3 animate-bounce">
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
          onClick={() => !impresionEnviada && setActiveSubTab('enviar')}
          disabled={impresionEnviada}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            impresionEnviada
              ? 'text-slate-400 cursor-not-allowed opacity-60'
              : activeSubTab === 'enviar'
              ? 'bg-white text-blue-600 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-800'
          }`}
          title={impresionEnviada ? 'Ya se envió a impresión. Sigue el avance en el timeline.' : undefined}
        >
          Enviar a Impresión
        </button>
      </div>

      {activeSubTab === 'timeline' ? (
        /* Timeline de Impresiones Vinculadas */
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Printer size={18} className="text-purple-500" />
              Timeline de Impresiones
            </h3>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
              {linkedJobs.length} {linkedJobs.length === 1 ? 'trabajo' : 'trabajos'} vinculados
            </span>
          </div>

          {linkedJobs.length === 0 ? (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Clock size={22} className="text-blue-600 animate-pulse" />
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
              {linkedJobs.map((job) => {
                const config = getStatusConfig(job.trackingStatus);
                const StatusIcon = config.icon;

                return (
                  <div key={job.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {/* Job Header */}
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${config.bg} ${config.color}`}>
                          <StatusIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 truncate" title={job.name}>{job.name}</h4>
                          <p className="text-xs text-slate-500 truncate" title={`${job.copies} cop. • ${job.format} • ${job.width}m x ${job.height}m`}>{job.copies} cop. • {job.format} • {job.width}m x {job.height}m</p>
                          {(() => {
                            const files = parseJobFiles(job);
                            if (files.length > 0) {
                              const isImageFile = (name, url) => {
                                const n = (name || '').toLowerCase();
                                const u = (url || '').toLowerCase();
                                return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.gif') || n.endsWith('.webp') ||
                                       u.startsWith('data:image') || u.includes('image') || u.startsWith('blob:');
                              };

                              return (
                                <div className="flex flex-wrap gap-2 mt-2 min-w-0">
                                  {files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 pl-1.5 pr-2.5 py-1 rounded-xl shadow-sm hover:shadow-md transition-shadow max-w-full min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                                        {isImageFile(f.name, f.url) ? (
                                          <img src={f.url} alt="preview" className="w-full h-full object-cover" />
                                        ) : (
                                          <FileText size={14} className="text-slate-400" />
                                        )}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] text-slate-700 font-bold truncate max-w-[140px]" title={f.name}>
                                          {f.name}
                                        </span>
                                        <span className="text-[8px] text-slate-400">
                                          {f.sizeDisplay || 'Archivo'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md ${config.bg} ${config.color} border ${config.border} shrink-0 align-self-start sm:align-self-auto`}>
                        {job.trackingStatus}
                      </span>
                    </div>

                    {/* Timeline Events */}
                    <div className="px-5 py-4">
                      <div className="relative pl-6 space-y-4">
                        {/* Vertical line */}
                        <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-slate-200 rounded-full" />

                        {/* Event: Enviado a Cola */}
                        {job.sentToQueueAt && (
                          <div className="relative flex items-start gap-3">
                            <div className="absolute left-[-15px] top-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-sm z-10" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Send size={12} className="text-amber-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-700">Enviado a cola de impresión</span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[11px] text-slate-500">{job.sentToQueueAt}</span>
                                {job.sentBy && (
                                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <User size={10} /> {job.sentBy}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Event: Impresión Iniciada */}
                        {job.startedPrintingAt && (
                          <div className="relative flex items-start gap-3">
                            <div className="absolute left-[-15px] top-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm z-10" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <PlayCircle size={12} className="text-blue-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-700">Impresión iniciada</span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[11px] text-slate-500">{job.startedPrintingAt}</span>
                                {job.responsible && (
                                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <User size={10} /> {job.responsible}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Event: Completado / Cancelado */}
                        {job.completedAt && (
                          <div className="relative flex items-start gap-3">
                            <div 
                              className="absolute left-[-15px] top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10"
                              style={{ backgroundColor: config.dotColor }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {job.trackingStatus === 'Cancelado' ? (
                                  <XCircle size={12} className="text-red-500 shrink-0" />
                                ) : (
                                  <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                                )}
                                <span className="text-xs font-bold text-slate-700">
                                  {job.trackingStatus === 'Cancelado' ? 'Cancelado' : 'Impresión finalizada'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[11px] text-slate-500">{job.completedAt}</span>
                                {job.elapsedSeconds > 0 && (
                                  <span className="text-[11px] text-slate-400">
                                    Duración: {formatDuration(job.elapsedSeconds)}
                                  </span>
                                )}
                              </div>
                              {job.trackingStatus === 'Cancelado' && job.cancelReason && (
                                <div className="mt-1.5 px-2.5 py-1.5 bg-red-50 border-l-3 border-red-400 rounded text-[11px] text-red-600" style={{ borderLeft: '3px solid #f87171' }}>
                                  <strong>Motivo:</strong> {job.cancelReason}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Pending state for jobs still in queue or printing */}
                        {!job.completedAt && job.trackingStatus !== 'Cancelado' && (
                          <div className="relative flex items-start gap-3">
                            <div className="absolute left-[-15px] top-0.5 w-3 h-3 rounded-full bg-slate-300 border-2 border-white shadow-sm z-10 animate-pulse" />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-slate-400 italic">
                                {job.trackingStatus === 'Imprimiendo' ? 'Imprimiendo ahora...' : 'En espera de impresión...'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Enviar a Impresión Form */
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
              const archivosArte = datosD.archivosArte || (datosD.archivoArte ? [datosD.archivoArte] : []);
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
                    {archivosArte.map((art, idx) => (
                      <div
                        key={art.url || idx}
                        className="flex flex-col items-center justify-center p-3 border border-purple-200 bg-purple-50/30 rounded-xl gap-1.5 relative shadow-sm"
                        title={art.name}
                      >
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden border border-purple-100 shrink-0">
                          {art.type && art.type.includes('image') && art.url ? (
                            <img src={art.url} alt="art preview" className="w-full h-full object-cover" />
                          ) : (
                            <FileText size={16} className="text-purple-400" />
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-700 truncate w-full text-center">
                          {art.name}
                        </span>
                        <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold border border-white">
                          ✓
                        </span>
                      </div>
                    ))}
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
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {file.files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-slate-700 bg-white/60 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                          <span className="truncate max-w-[70%] font-medium" title={f.name}>{f.name}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {f.fromProject ? f.sizeDisplay || 'Diseño' : `${(f.size / 1024 / 1024).toFixed(2)} MB`}
                          </span>
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

            {/* Row 2: Sustrato / Material */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sustrato / Material</label>
              <select 
                value={format} 
                onChange={e => setFormat(e.target.value)}
                disabled={formBloqueado}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                {materialesList.length > 0 ? (
                  materialesList.map(mat => (
                    <option key={mat.id} value={mat.nombre}>
                      {mat.nombre} {mat.stockActual !== undefined ? `(Stock: ${mat.stockActual})` : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Lona traslúcida">Lona traslúcida</option>
                    <option value="Lona brillo">Lona brillo</option>
                    <option value="Lona mate">Lona mate</option>
                    <option value="Vinil brillo">Vinil brillo</option>
                    <option value="Vinil mate">Vinil mate</option>
                    <option value="Vinil laminación brillo">Vinil laminación brillo</option>
                    <option value="Vinil laminación mate">Vinil laminación mate</option>
                    <option value="Tela sintética">Tela sintética</option>
                    <option value="PVC">PVC</option>
                  </>
                )}
              </select>
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
                disabled={!file || formBloqueado}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                title={impresionEnviada ? 'Este proyecto ya fue enviado a impresión' : undefined}
              >
                <Printer size={16} />
                <span>{impresionEnviada ? 'Ya enviado a impresión' : 'Enviar a Impresión'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
