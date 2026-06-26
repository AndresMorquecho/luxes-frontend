/* c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/impresiones/ui/ImpresionesPage.jsx */

import React, { useState, useEffect } from 'react';
import './ImpresionesPage.css';
import { usePrintQueue } from '../../colas-impresion/context/PrintQueueContext';
import { useProyectosContext } from '../../proyectos/application/context/ProyectosContext.jsx';

const renderPriorityBadge = (urgency) => {
  let bgColor = '#f1f5f9';
  let textColor = '#475569';
  let borderColor = '#cbd5e1';
  let icon = null;

  if (urgency === 'Alta') {
    bgColor = '#fee2e2';
    textColor = '#dc2626';
    borderColor = '#fca5a5';
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px', display: 'inline-block', verticalAlign: 'middle' }}>
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.753-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
    );
  } else if (urgency === 'Media') {
    bgColor = '#fef3c7';
    textColor = '#d97706';
    borderColor = '#fde68a';
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px', display: 'inline-block', verticalAlign: 'middle' }}>
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
      </svg>
    );
  } else {
    bgColor = '#eff6ff';
    textColor = '#1e3a8a';
    borderColor = '#bfdbfe';
    icon = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px', display: 'inline-block', verticalAlign: 'middle' }}>
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-.53 14.03a.75.75 0 001.06 0l3-3a.75.75 0 10-1.06-1.06l-1.72 1.72V8.25a.75.75 0 00-1.5 0v5.69l-1.72-1.72a.75.75 0 00-1.06 1.06l3 3z" clipRule="evenodd" />
      </svg>
    );
  }

  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      padding: '0.15rem 0.4rem',
      borderRadius: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      backgroundColor: bgColor,
      color: textColor,
      border: `1px solid ${borderColor}`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.2rem',
      marginLeft: '0.35rem'
    }}>
      {icon}
      <span>{urgency}</span>
    </span>
  );
};

const isImageFile = (name, url) => {
  const n = (name || '').toLowerCase();
  const u = (url || '').toLowerCase();
  return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.gif') || n.endsWith('.webp') ||
         u.startsWith('data:image') || u.includes('image') || u.startsWith('blob:');
};

export const ImpresionesPage = () => {
  const { activeJob, queue, completedJobs, addJobToQueue } = usePrintQueue();
  const { state: proyectosState } = useProyectosContext();

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

  // Project selector states
  const [selectedProyectoId, setSelectedProyectoId] = useState('');
  const [proyectoSearch, setProyectoSearch] = useState('');
  const [proyectoDropdownOpen, setProyectoDropdownOpen] = useState(false);
  const [fileFromProject, setFileFromProject] = useState(false); // true when file auto-loaded from project
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [selectedNotifProyecto, setSelectedNotifProyecto] = useState(null);

  // Form States
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('Papel Bond'); // Material/Sustrato
  const [size, setSize] = useState('A4'); // Format/Size
  const [client, setClient] = useState(''); // Client Name
  const [urgency, setUrgency] = useState('Media'); // Urgency: Alta, Media, Baja
  const [finish, setFinish] = useState('Normal'); // Finish: Normal, Brillante, Mate, Traslucido
  const [copies, setCopies] = useState(1);
  const [pages, setPages] = useState(1);
  const [sentBy, setSentBy] = useState('ISAM'); // Default active user
  const [width, setWidth] = useState('1.0'); // Width in meters
  const [height, setHeight] = useState('1.0'); // Height in meters
  const [notes, setNotes] = useState(''); // Special instructions/notes

  // UI States
  const [showSuccess, setShowSuccess] = useState(false);
  const [successJobName, setSuccessJobName] = useState('');

  // Filters & Pagination States
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  // Selected Job Details Modal
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Get projects eligible for print (PRODUCCION phase or later, excluding COMPLETADO)
  const proyectosEligibles = (proyectosState?.proyectos || []).filter(p => {
    const fasesProduccion = ['PRODUCCION', 'INSTALACION', 'ENTREGA'];
    return fasesProduccion.includes(p.faseActual) && p.estado === 'ACTIVO';
  });

  // Get projects with approved designs (always stored in datos)
  const proyectosConDisenoAprobado = (proyectosState?.proyectos || []).filter(p => {
    const disenoFase = p.fases?.['DISEÑO'] || p.fases?.DISEÑO;
    const datos = disenoFase?.datos || {};
    const archivoArte = datos.archivoArte;
    const fechaAprobacion = datos.fechaAprobacionDiseno;
    
    // Must have both file and date approved
    return !!archivoArte && !!fechaAprobacion;
  });

  // Project IDs already in print queue
  const queueJobProjectIds = [
    ...(activeJob && activeJob.proyectoId ? [activeJob.proyectoId] : []),
    ...queue.filter(j => j.proyectoId).map(j => j.proyectoId),
    ...completedJobs.filter(j => j.proyectoId).map(j => j.proyectoId)
  ];

  // Filter out projects already sent to print
  const pendingNotifications = proyectosConDisenoAprobado.filter(p => !queueJobProjectIds.includes(p.id));

  // Handle project selection
  const handleSelectProyecto = (proyecto) => {
    setSelectedProyectoId(proyecto.id);
    setProyectoSearch(proyecto.nombre);
    setProyectoDropdownOpen(false);

    // Auto-fill client
    setClient(proyecto.cliente?.empresa || proyecto.cliente?.nombre || '');

    // Auto-load design files
    const disenoFase = proyecto.fases?.['DISEÑO'] || proyecto.fases?.DISEÑO;
    const datos = disenoFase?.datos || {};
    const archivosArte = datos.archivosArte || (datos.archivoArte ? [datos.archivoArte] : []);
    if (archivosArte.length > 0) {
      if (archivosArte.length === 1) {
        setFile({
          name: archivosArte[0].name,
          size: 0,
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
            size: 0,
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
  };

  // Handle clearing project selection
  const handleClearProyecto = () => {
    setSelectedProyectoId('');
    setProyectoSearch('');
    if (fileFromProject) {
      setFile(null);
      setFileFromProject(false);
    }
    setClient('');
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterUser, filterStatus]);

  // Handle file select
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

  // Drag and drop handlers
  const [isDragOver, setIsDragOver] = useState(false);
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
    if (fileFromProject) return; // Don't allow drop when file is from project
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

  // Steppers
  const adjustCopies = (amount) => {
    setCopies(prev => Math.max(1, prev + amount));
  };
  const adjustPages = (amount) => {
    setPages(prev => Math.max(1, prev + amount));
  };

  // Submit print job
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const selectedProyecto = (proyectosState?.proyectos || []).find(p => p.id === selectedProyectoId);
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

    try {
      const newJob = {
        id: Date.now(), // Single unique ID
        name: jobName,
        pages: pages,
        copies: copies,
        status: "En espera",
        size: size,
        format: format, // Sustrato
        sentBy: sentBy || 'ISAM',
        sentAt: sentAtFormatted,
        sentToQueueAt: sentAtFormatted,
        startedPrintingAt: null,
        fileUrl: fileUrl,
        client: client,
        urgency: urgency,
        finish: finish,
        width: parseFloat(width) || 1.0,
        height: parseFloat(height) || 1.0,
        notes: notes.trim(),
        proyectoId: selectedProyecto?.id || null,
        proyectoNombre: selectedProyecto?.nombre || null
      };

      // Add to global context queue
      await addJobToQueue(newJob);

      // Show toast
      setSuccessJobName(file.name);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 4000);

      // Reset Form
      setFile(null);
      setFileFromProject(false);
      setSelectedProyectoId('');
      setProyectoSearch('');
      setFormat('Papel Bond');
      setSize('A4');
      setClient('');
      setUrgency('Media');
      setFinish('Normal');
      setCopies(1);
      setPages(1);
      setWidth('1.0');
      setHeight('1.0');
      setNotes('');
    } catch (err) {
      console.error('[ImpresionesPage] Error submitting job:', err);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Compile list of all jobs for status tracking
  const getTrackingJobs = () => {
    const jobsList = [];
    if (activeJob) {
      jobsList.push({ ...activeJob, trackingStatus: activeJob.status });
    }
    queue.forEach(job => {
      jobsList.push({ ...job, trackingStatus: 'En espera' });
    });
    completedJobs.forEach(job => {
      jobsList.push({ ...job, trackingStatus: job.status });
    });
    return jobsList;
  };

  const trackingJobs = getTrackingJobs();

  // Filter jobs
  const filteredTracking = trackingJobs.filter(job => {
    let matchesDate = true;
    if (filterDate) {
      const [y, m, d] = filterDate.split('-');
      const formattedFilterDate = `${d}/${m}/${y}`;
      matchesDate = job.sentAt && job.sentAt.includes(formattedFilterDate);
    }
    const matchesUser = filterUser ? (job.sentBy && job.sentBy.toLowerCase().includes(filterUser.toLowerCase())) : true;
    const matchesStatus = filterStatus === 'Todos' || !filterStatus ? true : job.trackingStatus === filterStatus;

    return matchesDate && matchesUser && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTracking.length / itemsPerPage);
  const paginatedTracking = filteredTracking.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatTime = (totalSeconds) => {
    if (totalSeconds === undefined || totalSeconds === null) return '0m 0s';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="impresiones-container">
      {/* Card Style Header */}
      <div className="impresiones-header-card">
        <div className="impresiones-header-left">
          <div className="impresiones-header-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" className="impresiones-header-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>
          <div className="impresiones-title-group">
            <h1>Envío de Impresiones</h1>
            <p>Formulario de especificaciones y carga de archivos para encolar trabajos.</p>
          </div>
        </div>

        {/* Notifications Icon (Right Section) */}
        <div className="impresiones-header-right" style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="notifications-bell-btn" 
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            style={{
              position: 'relative',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '50%',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            title="Diseños Aprobados"
          >
            {/* Bell Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            
            {pendingNotifications.length > 0 && (
              <span className="notifications-badge" style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {pendingNotifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifDropdownOpen && (
            <>
              <div 
                className="notif-dropdown-overlay" 
                onClick={() => setNotifDropdownOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99
                }}
              />
              <div 
                className="notif-dropdown" 
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: '320px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 100,
                  maxHeight: '400px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid #f1f5f9',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  borderTopLeftRadius: '11px',
                  borderTopRightRadius: '11px'
                }}>
                  <span>Diseños Aprobados ({pendingNotifications.length})</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>Listos para cola</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {pendingNotifications.length === 0 ? (
                    <div style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '0.8rem'
                    }}>
                      No hay nuevos diseños aprobados
                    </div>
                  ) : (
                    pendingNotifications.map(p => {
                      const disenoF = p.fases?.['DISEÑO'] || p.fases?.DISEÑO;
                      const datosD = disenoF?.datos || {};
                      const fAprob = datosD.fechaAprobacionDiseno;
                      const archD = datosD.archivoArte;
                      
                      return (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setSelectedNotifProyecto(p);
                            setNotifDropdownOpen(false);
                          }}
                          style={{
                            padding: '0.85rem 1rem',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            textAlign: 'left'
                          }}
                          className="notif-dropdown-item"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                              {p.nombre}
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: '700',
                              color: '#7c3aed',
                              backgroundColor: '#f5f3ff',
                              border: '1px solid #ddd6fe',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              {datosD.archivosArte && Array.isArray(datosD.archivosArte)
                                ? `${datosD.archivosArte.length} Archivo${datosD.archivosArte.length === 1 ? '' : 's'}`
                                : (archD ? '1 Archivo' : '0 Archivos')}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.7rem', color: '#64748b' }}>
                            <span><strong>Cliente:</strong> {p.cliente?.empresa || p.cliente?.nombre || 'Sin cliente'}</span>
                            <span><strong>Aprobado:</strong> {fAprob}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="impresiones-success-toast">
          <div className="toast-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div className="toast-text-box">
            <span className="toast-title">¡Documento Encolado!</span>
            <span className="toast-desc">"{successJobName}" fue enviado a la cola con éxito.</span>
          </div>
        </div>
      )}

      {/* Main Section */}
      <div className="impresiones-main-grid">
        {/* Form Card */}
        <div className="impresiones-form-card">
          <span className="form-card-title">Especificaciones del Trabajo</span>
          <form onSubmit={handleSubmit} className="impresiones-form">

            {/* Project Selector */}
            <div className="form-field form-field-proyecto">
              <label className="field-label">Proyecto Vinculado <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>(Opcional)</span></label>
              <div className="proyecto-selector-container">
                <div 
                  className={`proyecto-selector-input ${proyectoDropdownOpen ? 'active' : ''} ${selectedProyectoId ? 'has-value' : ''}`}
                  onClick={() => setProyectoDropdownOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px', color: '#94a3b8', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar proyecto en producción..."
                    className="proyecto-search-input"
                    value={proyectoSearch}
                    onChange={(e) => {
                      setProyectoSearch(e.target.value);
                      setProyectoDropdownOpen(true);
                      if (selectedProyectoId) {
                        handleClearProyecto();
                      }
                    }}
                    onFocus={() => setProyectoDropdownOpen(true)}
                  />
                  {selectedProyectoId ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleClearProyecto(); }} className="proyecto-clear-btn" title="Desvincular proyecto">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', color: '#94a3b8', flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  )}
                </div>

                {proyectoDropdownOpen && (
                  <>
                    <div className="proyecto-dropdown-overlay" onClick={() => setProyectoDropdownOpen(false)} />
                    <div className="proyecto-dropdown">
                      {proyectosEligibles.filter(p => p.nombre.toLowerCase().includes(proyectoSearch.toLowerCase()) || p.cliente?.empresa?.toLowerCase().includes(proyectoSearch.toLowerCase())).length > 0 ? (
                        proyectosEligibles.filter(p => p.nombre.toLowerCase().includes(proyectoSearch.toLowerCase()) || p.cliente?.empresa?.toLowerCase().includes(proyectoSearch.toLowerCase())).map(p => (
                          <div
                            key={p.id}
                            className={`proyecto-dropdown-item ${selectedProyectoId === p.id ? 'selected' : ''}`}
                            onClick={() => handleSelectProyecto(p)}
                          >
                            <div className="proyecto-dropdown-item-info">
                              <span className="proyecto-dropdown-item-name">{p.nombre}</span>
                              <span className="proyecto-dropdown-item-client">{p.cliente?.empresa} • {p.faseActual}</span>
                            </div>
                            {p.fases?.['DISEÑO']?.datos?.archivoArte && (
                              <span className="proyecto-dropdown-item-badge">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '10px', height: '10px' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                Arte
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="proyecto-dropdown-empty">
                          {proyectosEligibles.length === 0 
                            ? 'No hay proyectos en fase de producción'
                            : 'Sin resultados para la búsqueda'}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Select Design from Project if selected */}
            {selectedProyecto && (() => {
              const disenoFase = selectedProyecto.fases?.['DISEÑO'] || selectedProyecto.fases?.DISEÑO;
              const datosD = disenoFase?.datos || {};
              const archivosArte = datosD.archivosArte || (datosD.archivoArte ? [datosD.archivoArte] : []);
              if (archivosArte.length === 0) return null;

              return (
                <div className="form-field" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '14px', height: '14px', color: '#7c3aed' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a4.125 4.125 0 015.83 0l5.661 5.66m4.75-8.25l-5.159 5.159a4.125 4.125 0 01-5.83 0L2.25 9.75M3.75 20.25h16.5A1.5 1.5 0 0022 18.75V5.25A1.5 1.5 0 0020.25 3.75H3.75A1.5 1.5 0 002.25 5.25v13.5A1.5 1.5 0 003.75 20.25z" />
                      </svg>
                      <span style={{ fontWeight: 700 }}>Archivos de Diseño Vinculados ({archivosArte.length})</span>
                    </label>
                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#7c3aed', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      Se enviarán todos automáticamente
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.35rem' }}>
                    {archivosArte.map((art, idx) => (
                      <div
                        key={art.url || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.5rem',
                          border: '1.5px solid #ddd6fe',
                          borderRadius: '8px',
                          backgroundColor: '#f5f3ff',
                          gap: '0.25rem',
                          position: 'relative',
                          textAlign: 'center'
                        }}
                        title={art.name}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justify: 'center', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                          {art.type && art.type.includes('image') && art.url ? (
                            <img src={art.url} alt="art preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#7c3aed' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#7c3aed', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                          {art.name}
                        </span>
                        <span style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          backgroundColor: '#7c3aed',
                          color: 'white',
                          borderRadius: '50%',
                          width: '14px',
                          height: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          border: '1.5px solid white'
                        }}>✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* File Dropzone */}
            <div className="form-field form-field-dropzone">
              <label className="field-label">Documento a Imprimir</label>
              {!file ? (
                <div 
                  className={`file-dropzone ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <input 
                    type="file" 
                    id="file-input" 
                    onChange={handleFileChange} 
                    accept=".pdf,.png,.jpg,.jpeg,.ai,.eps" 
                    multiple
                    style={{ display: 'none' }}
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="dropzone-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="dropzone-text-primary">Arrastra tus archivos o haz clic para buscar</span>
                  <span className="dropzone-text-secondary">PDF, AI, PNG, JPG, EPS (Cualquier tamaño)</span>
                </div>
              ) : (
                <div className={`selected-file-box ${fileFromProject ? 'from-project' : ''}`} style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                    <div className="file-info-left" style={{ overflow: 'hidden' }}>
                      <div className="file-icon-badge">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '22px', height: '22px', color: fileFromProject ? '#7c3aed' : '#1e3a8a' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="file-meta" style={{ overflow: 'hidden' }}>
                        <span className="file-name" title={file.name} style={{ fontWeight: 'bold' }}>{file.name}</span>
                        <span className="file-size">
                          {file.isMultiple ? (
                            <>Múltiples archivos listos para enviar</>
                          ) : (
                            fileFromProject ? <>{file.sizeDisplay || 'Archivo del proyecto'}</> : formatFileSize(file.size)
                          )}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {fileFromProject && (
                        <span className="file-from-project-badge">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '12px', height: '12px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.868-1.124a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 8.1" />
                          </svg>
                          Desde Diseño
                        </span>
                      )}
                      <button type="button" onClick={() => { setFile(null); setFileFromProject(false); }} className="btn-remove-file" title="Remover archivos">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* If multiple, display the list of files */}
                  {(file.isMultiple || file.files) && (
                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.5rem' }}>
                      {file.files.map((f, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.6rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 500, color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '70%' }} title={f.name}>{f.name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {f.fromProject ? f.sizeDisplay || 'Diseño' : formatFileSize(f.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 1: Cliente + Prioridad + Acabado (proportional) */}
            <div className="form-row-cliente">
              <div className="form-field">
                <label className="field-label">Cliente</label>
                <input 
                  type="text" 
                  value={client} 
                  onChange={e => setClient(e.target.value)}
                  placeholder="Nombre completo del cliente o proyecto"
                  className="form-text-input"
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label">Prioridad</label>
                <select 
                  className="form-select" 
                  value={urgency} 
                  onChange={e => setUrgency(e.target.value)}
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className="form-field">
                <label className="field-label">Acabado</label>
                <select 
                  className="form-select" 
                  value={finish} 
                  onChange={e => setFinish(e.target.value)}
                >
                  <option value="Normal">Normal</option>
                  <option value="Brillante">Brillante</option>
                  <option value="Mate">Mate</option>
                  <option value="Traslúcido">Traslúcido / Backlight</option>
                </select>
              </div>
            </div>

            {/* Row 2: Sustrato + Formato/Tamaño */}
            <div className="form-row-2col">
              <div className="form-field">
                <label className="field-label">Sustrato / Material</label>
                <select 
                  className="form-select" 
                  value={format} 
                  onChange={e => setFormat(e.target.value)}
                >
                  <option value="Papel Bond">Papel Bond</option>
                  <option value="Papel Couche">Papel Couché</option>
                  <option value="Vinilo Adhesivo">Vinilo Adhesivo</option>
                  <option value="Vinilo Lona">Vinilo Lona</option>
                  <option value="Vinilo Microperforado">Vinilo Microperforado</option>
                  <option value="Lona Banner">Lona Banner</option>
                </select>
              </div>
              <div className="form-field">
                <label className="field-label">Formato / Tamaño</label>
                <select 
                  className="form-select" 
                  value={size} 
                  onChange={e => setSize(e.target.value)}
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Carta">Carta</option>
                  <option value="Oficio">Oficio</option>
                  <option value="A3">A3</option>
                  <option value="1.2m x 2.4m">1.2m x 2.4m (Medio)</option>
                  <option value="Metros">Metros (Largo libre)</option>
                </select>
              </div>
            </div>

            {/* Row 3: Copias + Páginas + Ancho + Alto */}
            <div className="form-row-4col">
              <div className="form-field">
                <label className="field-label">Copias</label>
                <div className="stepper-input-container">
                  <button type="button" onClick={() => adjustCopies(-1)} className="btn-stepper">-</button>
                  <input 
                    type="number" 
                    value={copies} 
                    onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="stepper-value-input"
                    min="1"
                  />
                  <button type="button" onClick={() => adjustCopies(1)} className="btn-stepper">+</button>
                </div>
              </div>
              <div className="form-field">
                <label className="field-label">Páginas</label>
                <div className="stepper-input-container">
                  <button type="button" onClick={() => adjustPages(-1)} className="btn-stepper">-</button>
                  <input 
                    type="number" 
                    value={pages} 
                    onChange={e => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                    className="stepper-value-input"
                    min="1"
                  />
                  <button type="button" onClick={() => adjustPages(1)} className="btn-stepper">+</button>
                </div>
              </div>
              <div className="form-field">
                <label className="field-label">Ancho (m)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.05"
                  value={width} 
                  onChange={e => setWidth(e.target.value)}
                  placeholder="1.20"
                  className="form-text-input"
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label">Alto (m)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.05"
                  value={height} 
                  onChange={e => setHeight(e.target.value)}
                  placeholder="2.40"
                  className="form-text-input"
                  required
                />
              </div>
            </div>

            {/* Row 4: Notas + Submit */}
            <div className="form-row-notes-submit">
              <div className="form-field" style={{ flex: 1 }}>
                <label className="field-label">Indicaciones / Notas</label>
                <input 
                  type="text" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Instrucciones de corte, ojalillos, costura, etc."
                  className="form-text-input"
                />
              </div>
              <button 
                type="submit" 
                className="btn-submit-print" 
                disabled={!file}
                style={!file ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Enviar a Cola
              </button>
            </div>

          </form>
        </div>

        {/* Info/Stats Column */}
        <div className="impresiones-sidebar-column">
          <div className="impresiones-info-card">
            {/* Compact Header with Queue Count */}
            <div className="sidebar-top-header">
              <div className="sidebar-queue-count">
                <span className="sidebar-queue-number">{queue.length}</span>
                <div>
                  <span className="sidebar-queue-label">En Cola</span>
                  <span className="sidebar-queue-sub">Documentos pendientes</span>
                </div>
              </div>
            </div>

            {/* Always-Visible Filters */}
            <div className="sidebar-filters-bar">
              <input 
                type="text" 
                placeholder="Buscar remitente..." 
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                className="sidebar-filter-input"
              />
              <input 
                type="date" 
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="sidebar-filter-input sidebar-filter-date"
              />
              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="sidebar-filter-select"
              >
                <option value="Todos">Todos</option>
                <option value="En espera">En cola</option>
                <option value="Completado">Finalizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            {/* Tracking Cards */}
            <div className="tracking-jobs-list">
              {paginatedTracking.length > 0 ? (
                paginatedTracking.map(job => {
                  const statusColor = 
                    job.trackingStatus === 'Cancelado' ? '#ef4444' :
                    job.trackingStatus === 'Completado' ? '#10b981' :
                    job.trackingStatus === 'Imprimiendo' ? '#3b82f6' :
                    job.trackingStatus === 'Pausado' ? '#64748b' : '#f59e0b';

                  return (
                    <div 
                      key={job.id} 
                      className="tracking-card-v2"
                      onClick={() => {
                        setSelectedJobDetails(job);
                        setShowDetailsModal(true);
                      }}
                      style={{ borderLeftColor: statusColor }}
                    >
                      <div className="tracking-card-top">
                        <span className="tracking-card-name" title={job.name}>{job.name}</span>
                        <span className={`tracking-status-badge tracking-status-${job.trackingStatus.toLowerCase().replace(' ', '-')}`}>
                          {job.trackingStatus}
                        </span>
                      </div>
                      <div className="tracking-card-details">
                        <span>{job.client || 'Sin cliente'}</span>
                        {job.proyectoNombre && (
                          <span style={{ color: '#7c3aed', fontWeight: 600 }}> • {job.proyectoNombre}</span>
                        )}
                        <span className="tracking-card-sep">{renderPriorityBadge(job.urgency)}</span>
                        <span className="tracking-card-material">{job.format}</span>
                      </div>
                      {(() => {
                        const files = parseJobFiles(job);
                        if (files.length > 0) {
                          return (
                            <div className="tracking-card-files" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.4rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.35rem' }}>
                              {files.map((f, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '4px', maxWidth: '140px' }} title={f.name}>
                                  <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {isImageFile(f.name, f.url) ? (
                                      <img src={f.url} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span style={{ fontSize: '7px' }}>📄</span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.6rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                    {f.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {job.trackingStatus === "Cancelado" && job.cancelReason && (
                        <div className="tracking-card-cancel">
                          <strong>Motivo:</strong> {job.cancelReason}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="empty-tracking-msg">
                  No hay trabajos que coincidan con los filtros.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="tracking-pagination">
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Pág. <strong>{currentPage}</strong> de {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(1, prev - 1)); }}
                    className="btn-pagination-small"
                  >
                    Ant.
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPages, prev + 1)); }}
                    className="btn-pagination-small"
                  >
                    Sig.
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Job Info Modal */}
      {showDetailsModal && selectedJobDetails && (
        <div className="colas-modal-overlay" onClick={() => { setShowDetailsModal(false); setSelectedJobDetails(null); }}>
          <div className="colas-modal-card details-modal-card" onClick={e => e.stopPropagation()}>
            <div className="details-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              <span className="colas-modal-title" style={{ fontSize: '1.2rem', color: 'var(--color-primary-blue)' }}>Ficha Técnica del Trabajo</span>
              <button 
                type="button" 
                onClick={() => { setShowDetailsModal(false); setSelectedJobDetails(null); }} 
                style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer' }}
                title="Cerrar modal"
              >
                &times;
              </button>
            </div>
            
            <div className="details-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>{selectedJobDetails.name}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <span className={`tracking-status-badge tracking-status-${selectedJobDetails.trackingStatus.toLowerCase().replace(' ', '-')}`}>
                    {selectedJobDetails.trackingStatus}
                  </span>
                  {renderPriorityBadge(selectedJobDetails.urgency)}
                </div>
              </div>

              <div className="details-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Cliente</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.client || 'Sin cliente'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Material / Sustrato</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.format}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Acabado / Tipo de Lona</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.finish || 'Normal'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Medidas Físicas</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#0369a1' }}>{selectedJobDetails.width || 1.0}m x {selectedJobDetails.height || 1.0}m</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Copias / Páginas</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.copies} cop. ({selectedJobDetails.pages} pág.)</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Enviado por</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.sentBy || 'Usuario'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Operador (Responsable)</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.responsible || 'ISAM'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Duración de Impresión</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{formatTime(selectedJobDetails.elapsedSeconds)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Fecha de Envío</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.sentAt || 'Sin fecha'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Hora de Finalización</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.completedAt || 'Sin registrar'}</span>
                </div>
              </div>

              {(() => {
                const files = parseJobFiles(selectedJobDetails);
                if (files.length === 0) return null;
                return (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Archivos del Trabajo ({files.length})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                      {files.map((f, idx) => (
                        <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justify: 'center', border: '1px solid #ddd6fe', flexShrink: 0 }}>
                            {isImageFile(f.name, f.url) ? (
                              <img src={f.url} alt="Mini Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#7c3aed' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            )}
                          </div>
                          <div style={{ overflow: 'hidden', flex: 1 }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{f.name}</span>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b' }}>{f.sizeDisplay || 'Archivo'}</span>
                          </div>
                          <a href={f.url} download={f.name} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 'bold', textDecoration: 'none' }}>
                            Descargar
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {selectedJobDetails.notes && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderLeft: '4px solid var(--color-primary-blue)', borderRadius: '6px' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Indicaciones Especiales</span>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.45 }}>{selectedJobDetails.notes}</p>
                </div>
              )}

              {selectedJobDetails.trackingStatus === "Cancelado" && selectedJobDetails.cancelReason && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '6px' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Motivo de Cancelación</span>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#b91c1c', fontWeight: 600, lineHeight: 1.45 }}>{selectedJobDetails.cancelReason}</p>
                </div>
              )}
            </div>
            
            <div className="colas-modal-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => { setShowDetailsModal(false); setSelectedJobDetails(null); }} 
                className="btn-modal-back"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Design Notification Details Modal */}
      {selectedNotifProyecto && (() => {
        const disenoFase = selectedNotifProyecto.fases?.['DISEÑO'] || selectedNotifProyecto.fases?.DISEÑO;
        const datosDiseno = disenoFase?.datos || {};
        const archivoArte = datosDiseno.archivoArte;
        const fechaAprobacion = datosDiseno.fechaAprobacionDiseno;

        return (
          <div className="colas-modal-overlay" onClick={() => setSelectedNotifProyecto(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
            <div className="colas-modal-card details-modal-card" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'white', borderRadius: '16px', width: '480px', maxWidth: '90vw', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diseño Aprobado</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '2px 0 0 0' }}>Detalle de Notificación</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedNotifProyecto(null)} 
                  style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  &times;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Proyecto</span>
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{selectedNotifProyecto.nombre}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Cliente</span>
                    <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>{selectedNotifProyecto.cliente?.empresa || 'Sin empresa'}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>{selectedNotifProyecto.cliente?.nombre}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Fecha de Aprobación</span>
                    <span style={{ fontWeight: 600, color: '#059669', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {fechaAprobacion}
                    </span>
                  </div>
                </div>

                {(() => {
                  const items = datosDiseno.archivosArte || (archivoArte ? [archivoArte] : []);
                  if (items.length === 0) return null;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Archivos de Arte ({items.length})</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {items.map((art, idx) => (
                          <div key={art.url || idx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', backgroundColor: '#f8fafc', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justify: 'center', border: '1px solid #ddd6fe', flexShrink: 0 }}>
                              {art.type && art.type.includes('image') && art.url ? (
                                <img src={art.url} alt="Mini Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#7c3aed' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                              )}
                            </div>
                            <div style={{ overflow: 'hidden', flex: 1 }}>
                              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{art.name}</span>
                              <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b' }}>{art.size || 'Tamaño no especificado'}</span>
                            </div>
                            <a href={art.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 'bold', textDecoration: 'none' }}>
                              Ver
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedNotifProyecto(null)} 
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    handleSelectProyecto(selectedNotifProyecto);
                    setSelectedNotifProyecto(null);
                  }}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.2)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '14px', height: '14px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Enviar a Impresión
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
