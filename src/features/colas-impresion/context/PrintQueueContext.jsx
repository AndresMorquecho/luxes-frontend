/* c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/colas-impresion/context/PrintQueueContext.jsx */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const PrintQueueContext = createContext();

// Initial Mock Data
const INITIAL_ACTIVE_JOB = {
  id: 1,
  name: "Banner_Luxes_2026_Final.pdf",
  pages: 1,
  copies: 1,
  responsible: "CristoferS", // Operator/Responsible (the active user)
  status: "Listo", // Starts as Ready to be manually started
  size: "1.2m x 2.4m",
  format: "Vinilo Lona",
  elapsedSeconds: 0,
  startTime: null,
  sentBy: "PaolaC",
  sentAt: "04/06/2026 09:30",
  sentToQueueAt: "04/06/2026 09:30",
  startedPrintingAt: null,
  fileUrl: null,
  client: "CorporaciÃ³n Luxes",
  urgency: "Media",
  finish: "Mate",
  width: 1.2,
  height: 2.4,
  notes: "Refuerzo perimetral y ojalillos cada 50cm",
  proyectoId: null,
  proyectoNombre: null
};

const INITIAL_QUEUE = [
  { id: 2, name: "Proforma_CLIENTE_Corporativo.pdf", pages: 3, copies: 2, status: "En espera", size: "Carta", format: "Papel Bond", sentBy: "Juan PÃ©rez", sentAt: "04/06/2026 11:20", sentToQueueAt: "04/06/2026 11:20", startedPrintingAt: null, fileUrl: null, client: "Distribuidora El Taller", urgency: "Alta", finish: "Normal", width: 0.216, height: 0.279, notes: "Sin acabado especial", proyectoId: null, proyectoNombre: null },
  { id: 3, name: "Flyers_DisenoPublicidad_Campana.png", pages: 1, copies: 500, status: "En espera", size: "A5", format: "Papel Couche", sentBy: "MarÃ­a LÃ³pez", sentAt: "04/06/2026 11:45", sentToQueueAt: "04/06/2026 11:45", startedPrintingAt: null, fileUrl: null, client: "Comercial Monchito", urgency: "Alta", finish: "Brillante", width: 0.148, height: 0.21, notes: "Corte al ras", proyectoId: null, proyectoNombre: null },
  { id: 4, name: "Rol_De_Pago_Mayo_2026.pdf", pages: 15, copies: 1, status: "En espera", size: "A4", format: "Papel Bond", sentBy: "jeffersond", sentAt: "04/06/2026 12:05", sentToQueueAt: "04/06/2026 12:05", startedPrintingAt: null, fileUrl: null, client: "Interno (NÃ³mina)", urgency: "Baja", finish: "Normal", width: 0.21, height: 0.297, notes: "Engrapado simple", proyectoId: null, proyectoNombre: null },
  { id: 5, name: "Adhesivos_GloboLuxes_Troquel.ai", pages: 1, copies: 100, status: "En espera", size: "Metros", format: "Vinilo Adhesivo", sentBy: "Carlos Ruiz", sentAt: "04/06/2026 12:30", sentToQueueAt: "04/06/2026 12:30", startedPrintingAt: null, fileUrl: null, client: "Globo Impresiones", urgency: "Media", finish: "Brillante", width: 1.0, height: 3.5, notes: "Troquelar contorno", proyectoId: null, proyectoNombre: null }
];

const INITIAL_COMPLETED_JOBS = [
  { id: 101, name: "Planos_Edificio_A_Arquitectura.pdf", pages: 8, copies: 3, status: "Completado", size: "A3", format: "Papel Bond", sentBy: "Juan PÃ©rez", sentAt: "03/06/2026 14:10", sentToQueueAt: "03/06/2026 14:10", startedPrintingAt: "03/06/2026 14:15", completedAt: "03/06/2026 14:25", responsible: "CristoferS", elapsedSeconds: 450, client: "Constructora Alfa", urgency: "Media", finish: "Normal", width: 0.297, height: 0.42, notes: "Imprimir en escala exacta", proyectoId: null, proyectoNombre: null },
  { id: 102, name: "Gigantografia_Promo_Junio.ai", pages: 1, copies: 1, status: "Cancelado", size: "Metros", format: "Vinilo Lona", sentBy: "MarÃ­a LÃ³pez", sentAt: "03/06/2026 15:30", sentToQueueAt: "03/06/2026 15:30", startedPrintingAt: "03/06/2026 15:35", completedAt: "03/06/2026 15:45", responsible: "CristoferS", elapsedSeconds: 120, client: "Supermercados Baratodo", urgency: "Alta", finish: "Brillante", width: 2.5, height: 4.0, notes: "Ojalillos en los bordes", cancelReason: "El cliente solicitÃ³ cambio de diseÃ±o de Ãºltimo minuto por error en los precios", proyectoId: null, proyectoNombre: null },
  { id: 103, name: "Etiquetas_Frascos_Mermelada.png", pages: 2, copies: 150, status: "Completado", size: "Carta", format: "Vinilo Adhesivo", sentBy: "Carlos Ruiz", sentAt: "04/06/2026 08:15", sentToQueueAt: "04/06/2026 08:15", startedPrintingAt: "04/06/2026 08:20", completedAt: "04/06/2026 08:40", responsible: "CristoferS", elapsedSeconds: 980, client: "Dulces Artesanales", urgency: "Baja", finish: "Brillante", width: 0.216, height: 0.279, notes: "Corte medio con troquel circular", proyectoId: null, proyectoNombre: null },
  // Pre-seed: vincular un job completado al proyecto p3 (Banderas Guayarte Plaza)
  { id: 104, name: "Banderas_Guayarte_ArteFinal.pdf", pages: 1, copies: 4, status: "Completado", size: "Metros", format: "Lona Banner", sentBy: "MORQUECHO IVETTE", sentAt: "02/06/2026 10:00", sentToQueueAt: "02/06/2026 10:00", startedPrintingAt: "02/06/2026 10:30", completedAt: "02/06/2026 11:15", responsible: "CristoferS", elapsedSeconds: 2700, client: "M. I. Municipalidad de Guayaquil", urgency: "Alta", finish: "Normal", width: 2.0, height: 5.0, notes: "Ojalillos reforzados cada 40cm", proyectoId: 'p3', proyectoNombre: 'Banderas Guayarte Plaza' },
  { id: 105, name: "Tarjetas_Presentacion_Luxes.ai", pages: 2, copies: 200, status: "Completado", size: "A4", format: "Papel Couche", sentBy: "MarÃ­a LÃ³pez", sentAt: "04/06/2026 10:10", sentToQueueAt: "04/06/2026 10:10", startedPrintingAt: "04/06/2026 10:18", completedAt: "04/06/2026 10:35", responsible: "CristoferS", elapsedSeconds: 540, client: "CorporaciÃ³n Luxes", urgency: "Baja", finish: "Mate", width: 0.21, height: 0.297, notes: "Corte individual con bordes redondeados", proyectoId: null, proyectoNombre: null },
  { id: 106, name: "Banner_Ofertas_Televisores.png", pages: 1, copies: 2, status: "Cancelado", size: "Metros", format: "Lona Banner", sentBy: "Carlos Ruiz", sentAt: "04/06/2026 11:00", sentToQueueAt: "04/06/2026 11:00", startedPrintingAt: "04/06/2026 11:05", completedAt: "04/06/2026 11:15", responsible: "CristoferS", elapsedSeconds: 80, client: "Tienda Electro", urgency: "Alta", finish: "Normal", width: 1.0, height: 2.0, notes: "Ojalillos reforzados", cancelReason: "Material atascado en cabezal de impresiÃ³n, daÃ±o en el sustrato", proyectoId: null, proyectoNombre: null }
];

export const PrintQueueProvider = ({ children }) => {
  const [activeJobs, setActiveJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [queue, setQueue] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);

  const getActiveUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return u.username || u.nombre || 'Sistema';
      }
    } catch (e) {}
    return 'Sistema';
  };

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetJob, setCancelTargetJob] = useState(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [prevStatus, setPrevStatus] = useState('Listo'); // To resume correct state if modal is closed

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  };

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/impresiones', { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        const list = data.data.activeJobs || (data.data.activeJob ? [data.data.activeJob] : []);
        setActiveJobs(list);
        setActiveJob(list[0] || null);
        setQueue(data.data.queue);
        setCompletedJobs(data.data.completedJobs);
      }
    } catch (err) {
      console.error('[PrintQueueContext] Error fetching jobs:', err);
    }
  }, []);

  const notifyUpdate = () => {
    window.dispatchEvent(new Event('print-queue-updated'));
    localStorage.setItem('luxes_print_sync_trigger', Date.now().toString());
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Sincronización de cola de impresión entre pestañas
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'luxes_print_sync_trigger') {
        fetchJobs();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('print-queue-updated', fetchJobs);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('print-queue-updated', fetchJobs);
    };
  }, [fetchJobs]);

  // Persistir elapsed cada 5s sin forzar re-render global cada segundo.
  // La UI de TV/cronómetro usa timers locales (TvElapsedTimer).
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveJobs(prevJobs => {
        if (!prevJobs || prevJobs.length === 0) return prevJobs;
        const hasPrinting = prevJobs.some(j => j.status === 'Imprimiendo');
        if (!hasPrinting) return prevJobs;

        let hasChanges = false;
        const nextJobs = prevJobs.map(job => {
          if (job.status === "Imprimiendo") {
            hasChanges = true;
            const nextSeconds = (job.elapsedSeconds || 0) + 5;
            fetch(`/api/impresiones/${job.id}`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify({ elapsedSeconds: nextSeconds }),
            }).catch(e => console.error('Error saving elapsed seconds:', e));
            return { ...job, elapsedSeconds: nextSeconds };
          }
          return job;
        });
        if (hasChanges) {
          setActiveJob(nextJobs[0] || null);
          return nextJobs;
        }
        return prevJobs;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Start printing an active job (manual trigger)
  const handleStartActiveJob = async (jobId) => {
    const targetId = jobId || activeJob?.id;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/impresiones/${targetId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Imprimiendo',
          responsible: getActiveUser(),
        }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle active job status between Imprimiendo and Pausado
  const handleTogglePause = async (jobId) => {
    const targetId = jobId || activeJob?.id;
    if (!targetId) return;
    const current = activeJobs.find(j => j.id === targetId) || activeJob;
    if (!current) return;
    const nextStatus = current.status === 'Imprimiendo' ? 'Pausado' : 'Imprimiendo';
    try {
      const res = await fetch(`/api/impresiones/${targetId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ 
          status: nextStatus,
          responsible: getActiveUser(),
        }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manually mark an active job as completed
  const handleCompleteActiveJob = async (jobId) => {
    const targetId = jobId || activeJob?.id;
    if (!targetId) return;
    try {
      const res = await fetch(`/api/impresiones/${targetId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Completado',
          responsible: getActiveUser(),
        }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open the cancellation reason modal for a specific job
  const handleOpenCancelModal = (job) => {
    const target = job || activeJob;
    if (!target) return;
    setCancelTargetJob(target);
    setPrevStatus(target.status);
    
    // Pause the active job printing while entering reason
    if (target.status === "Imprimiendo") {
      setActiveJobs(prev => prev.map(j => j.id === target.id ? { ...j, status: "Pausado" } : j));
    }
    setShowCancelModal(true);
  };

  // Confirm cancel and archive with reason
  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelTargetJob || !cancelReasonText.trim()) return;
    try {
      const res = await fetch(`/api/impresiones/${cancelTargetJob.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Cancelado',
          cancelReason: cancelReasonText,
          responsible: getActiveUser(),
        }),
      });
      if (res.ok) {
        setShowCancelModal(false);
        setCancelReasonText('');
        setCancelTargetJob(null);
        notifyUpdate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Back out of cancellation modal (resumes previous state)
  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancelReasonText('');
    if (cancelTargetJob && prevStatus === "Imprimiendo") {
      setActiveJobs(prev => prev.map(j => j.id === cancelTargetJob.id ? { ...j, status: "Imprimiendo" } : j));
    }
    setCancelTargetJob(null);
  };

  // Cancel/Remove a job from the queue table
  const handleCancelQueueJob = async (id) => {
    try {
      const res = await fetch(`/api/impresiones/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Start printing a specific job from the queue (up to 3 active jobs max)
  const handleStartQueueJob = async (id, status = 'Listo', extraData = {}) => {
    if (activeJobs.length >= 3) {
      throw new Error('Máximo 3 trabajos de impresión activos simultáneamente. Completa, cancela o devuelve a la cola uno para activar este.');
    }
    try {
      const res = await fetch(`/api/impresiones/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ 
          status, 
          responsible: getActiveUser(),
          ...extraData 
        }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // Move a job up in the queue list (Prioritize)
  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const nextQueue = [...queue];
    const temp = nextQueue[index];
    nextQueue[index] = nextQueue[index - 1];
    nextQueue[index - 1] = temp;

    try {
      const res = await fetch('/api/impresiones/reorder', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ids: nextQueue.map(j => j.id) }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Return active job back to the queue (only when status is "Listo")
  const handleReturnToQueue = async (jobId) => {
    const targetId = jobId || activeJob?.id;
    if (!targetId) return;
    const target = activeJobs.find(j => j.id === targetId) || activeJob;
    if (!target || target.status !== "Listo") return;
    try {
      const res = await fetch(`/api/impresiones/${targetId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'En espera' }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add a new job dispatched from Impresiones module
  const addJobToQueue = async (newJob) => {
    const res = await fetch('/api/impresiones', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(newJob),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error?.message || 'Error al enviar a la cola de impresión');
    }
    notifyUpdate();
    return data.data;
  };

  // Get all jobs (active + queue + completed) linked to a specific project
  // Evita crear nuevas referencias si los datos no cambiaron
  const getJobsByProyectoId = useCallback((proyectoId) => {
    if (!proyectoId) return [];
    const allJobs = [];
    activeJobs.forEach(job => {
      if (job.proyectoId === proyectoId) {
        // Solo añadir trackingStatus si no existe, evitando spread innecesario
        allJobs.push(job.trackingStatus ? job : { ...job, trackingStatus: job.status });
      }
    });
    queue.forEach(job => {
      if (job.proyectoId === proyectoId) {
        allJobs.push(job.trackingStatus === 'En espera' ? job : { ...job, trackingStatus: 'En espera' });
      }
    });
    completedJobs.forEach(job => {
      if (job.proyectoId === proyectoId) {
        allJobs.push(job.trackingStatus ? job : { ...job, trackingStatus: job.status });
      }
    });
    return allJobs;
  }, [activeJobs, queue, completedJobs]);

  // Reimprimir un trabajo cancelado (duplica el trabajo y lo pone en la cola "En espera")
  const reimprimirJob = async (job) => {
    if (!job) return;
    try {
      const res = await fetch('/api/impresiones', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name: job.name,
          copies: job.copies || 1,
          format: job.format || '',
          sentBy: getActiveUser(),
          sentAt: new Date().toISOString(),
          sentToQueueAt: new Date().toISOString(),
          fileUrl: job.fileUrl,
          client: job.client || '',
          urgency: job.urgency || 'Media',
          width: job.width || 1.0,
          height: job.height || 1.0,
          notes: job.notes || '',
          proyectoId: job.proyectoId || null,
          proyectoNombre: job.proyectoNombre || null,
          batchId: job.batchId || null,
        }),
      });
      if (res.ok) {
        notifyUpdate();
        return await res.json();
      }
    } catch (e) {
      console.error('[reimprimirJob] Error:', e);
      throw e;
    }
  };

  // Memoizar el value del context para evitar re-renders en consumidores
  // cuando el timer interno dispara pero los datos no cambiaron
  const contextValue = useMemo(() => ({
    activeJobs,
    activeJob,
    queue,
    completedJobs,
    showCancelModal,
    cancelTargetJob,
    cancelReasonText,
    setCancelReasonText,
    handleStartActiveJob,
    handleTogglePause,
    handleCompleteActiveJob,
    handleOpenCancelModal,
    handleConfirmCancel,
    handleCloseCancelModal,
    handleCancelQueueJob,
    handleStartQueueJob,
    handleMoveUp,
    handleReturnToQueue,
    addJobToQueue,
    reimprimirJob,
    getJobsByProyectoId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    activeJobs, activeJob, queue, completedJobs,
    showCancelModal, cancelTargetJob, cancelReasonText,
    getJobsByProyectoId
  ]);

  return (
    <PrintQueueContext.Provider value={contextValue}>
      {children}
    </PrintQueueContext.Provider>
  );
};

export const usePrintQueue = () => {
  const context = useContext(PrintQueueContext);
  if (!context) {
    throw new Error('usePrintQueue must be used within a PrintQueueProvider');
  }
  return context;
};

