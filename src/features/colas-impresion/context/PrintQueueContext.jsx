/* c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/colas-impresion/context/PrintQueueContext.jsx */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PrintQueueContext = createContext();

// Initial Mock Data
const INITIAL_ACTIVE_JOB = {
  id: 1,
  name: "Banner_Luxes_2026_Final.pdf",
  pages: 1,
  copies: 1,
  responsible: "ISAM", // Operator/Responsible (the active user)
  status: "Listo", // Starts as Ready to be manually started
  size: "1.2m x 2.4m",
  format: "Vinilo Lona",
  elapsedSeconds: 0,
  startTime: null,
  sentBy: "ISAM",
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
  { id: 4, name: "Rol_De_Pago_Mayo_2026.pdf", pages: 15, copies: 1, status: "En espera", size: "A4", format: "Papel Bond", sentBy: "ISAM", sentAt: "04/06/2026 12:05", sentToQueueAt: "04/06/2026 12:05", startedPrintingAt: null, fileUrl: null, client: "Interno (NÃ³mina)", urgency: "Baja", finish: "Normal", width: 0.21, height: 0.297, notes: "Engrapado simple", proyectoId: null, proyectoNombre: null },
  { id: 5, name: "Adhesivos_GloboLuxes_Troquel.ai", pages: 1, copies: 100, status: "En espera", size: "Metros", format: "Vinilo Adhesivo", sentBy: "Carlos Ruiz", sentAt: "04/06/2026 12:30", sentToQueueAt: "04/06/2026 12:30", startedPrintingAt: null, fileUrl: null, client: "Globo Impresiones", urgency: "Media", finish: "Brillante", width: 1.0, height: 3.5, notes: "Troquelar contorno", proyectoId: null, proyectoNombre: null }
];

const INITIAL_COMPLETED_JOBS = [
  { id: 101, name: "Planos_Edificio_A_Arquitectura.pdf", pages: 8, copies: 3, status: "Completado", size: "A3", format: "Papel Bond", sentBy: "Juan PÃ©rez", sentAt: "03/06/2026 14:10", sentToQueueAt: "03/06/2026 14:10", startedPrintingAt: "03/06/2026 14:15", completedAt: "03/06/2026 14:25", responsible: "ISAM", elapsedSeconds: 450, client: "Constructora Alfa", urgency: "Media", finish: "Normal", width: 0.297, height: 0.42, notes: "Imprimir en escala exacta", proyectoId: null, proyectoNombre: null },
  { id: 102, name: "Gigantografia_Promo_Junio.ai", pages: 1, copies: 1, status: "Cancelado", size: "Metros", format: "Vinilo Lona", sentBy: "MarÃ­a LÃ³pez", sentAt: "03/06/2026 15:30", sentToQueueAt: "03/06/2026 15:30", startedPrintingAt: "03/06/2026 15:35", completedAt: "03/06/2026 15:45", responsible: "ISAM", elapsedSeconds: 120, client: "Supermercados Baratodo", urgency: "Alta", finish: "Brillante", width: 2.5, height: 4.0, notes: "Ojalillos en los bordes", cancelReason: "El cliente solicitÃ³ cambio de diseÃ±o de Ãºltimo minuto por error en los precios", proyectoId: null, proyectoNombre: null },
  { id: 103, name: "Etiquetas_Frascos_Mermelada.png", pages: 2, copies: 150, status: "Completado", size: "Carta", format: "Vinilo Adhesivo", sentBy: "Carlos Ruiz", sentAt: "04/06/2026 08:15", sentToQueueAt: "04/06/2026 08:15", startedPrintingAt: "04/06/2026 08:20", completedAt: "04/06/2026 08:40", responsible: "ISAM", elapsedSeconds: 980, client: "Dulces Artesanales", urgency: "Baja", finish: "Brillante", width: 0.216, height: 0.279, notes: "Corte medio con troquel circular", proyectoId: null, proyectoNombre: null },
  // Pre-seed: vincular un job completado al proyecto p3 (Banderas Guayarte Plaza)
  { id: 104, name: "Banderas_Guayarte_ArteFinal.pdf", pages: 1, copies: 4, status: "Completado", size: "Metros", format: "Lona Banner", sentBy: "MORQUECHO IVETTE", sentAt: "02/06/2026 10:00", sentToQueueAt: "02/06/2026 10:00", startedPrintingAt: "02/06/2026 10:30", completedAt: "02/06/2026 11:15", responsible: "ISAM", elapsedSeconds: 2700, client: "M. I. Municipalidad de Guayaquil", urgency: "Alta", finish: "Normal", width: 2.0, height: 5.0, notes: "Ojalillos reforzados cada 40cm", proyectoId: 'p3', proyectoNombre: 'Banderas Guayarte Plaza' },
  { id: 105, name: "Tarjetas_Presentacion_Luxes.ai", pages: 2, copies: 200, status: "Completado", size: "A4", format: "Papel Couche", sentBy: "MarÃ­a LÃ³pez", sentAt: "04/06/2026 10:10", sentToQueueAt: "04/06/2026 10:10", startedPrintingAt: "04/06/2026 10:18", completedAt: "04/06/2026 10:35", responsible: "ISAM", elapsedSeconds: 540, client: "CorporaciÃ³n Luxes", urgency: "Baja", finish: "Mate", width: 0.21, height: 0.297, notes: "Corte individual con bordes redondeados", proyectoId: null, proyectoNombre: null },
  { id: 106, name: "Banner_Ofertas_Televisores.png", pages: 1, copies: 2, status: "Cancelado", size: "Metros", format: "Lona Banner", sentBy: "Carlos Ruiz", sentAt: "04/06/2026 11:00", sentToQueueAt: "04/06/2026 11:00", startedPrintingAt: "04/06/2026 11:05", completedAt: "04/06/2026 11:15", responsible: "ISAM", elapsedSeconds: 80, client: "Tienda Electro", urgency: "Alta", finish: "Normal", width: 1.0, height: 2.0, notes: "Ojalillos reforzados", cancelReason: "Material atascado en cabezal de impresiÃ³n, daÃ±o en el sustrato", proyectoId: null, proyectoNombre: null }
];

export const PrintQueueProvider = ({ children }) => {
  const [activeJob, setActiveJob] = useState(null);
  const [queue, setQueue] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
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
        setActiveJob(data.data.activeJob);
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

  // Timer simulation (counts up elapsed seconds only when status is "Imprimiendo")
  useEffect(() => {
    const timer = setInterval(async () => {
      if (activeJob && activeJob.status === "Imprimiendo") {
        const nextSeconds = activeJob.elapsedSeconds + 1;
        setActiveJob(prev => ({
          ...prev,
          elapsedSeconds: nextSeconds
        }));

        if (nextSeconds % 5 === 0) {
          try {
            await fetch(`/api/impresiones/${activeJob.id}`, {
              method: 'PUT',
              headers: getHeaders(),
              body: JSON.stringify({ elapsedSeconds: nextSeconds }),
            });
          } catch (e) {
            console.error('Error saving elapsed seconds:', e);
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeJob]);

  // Start printing the active job (manual trigger)
  const handleStartActiveJob = async () => {
    if (!activeJob) return;
    try {
      const res = await fetch(`/api/impresiones/${activeJob.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Imprimiendo',
          responsible: localStorage.getItem('userName') || 'ISAM',
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
  const handleTogglePause = async () => {
    if (!activeJob) return;
    const nextStatus = activeJob.status === 'Imprimiendo' ? 'Pausado' : 'Imprimiendo';
    try {
      const res = await fetch(`/api/impresiones/${activeJob.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Manually mark the active job as completed
  const handleCompleteActiveJob = async () => {
    if (!activeJob) return;
    try {
      const res = await fetch(`/api/impresiones/${activeJob.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Completado',
          responsible: localStorage.getItem('userName') || 'ISAM',
        }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open the cancellation reason modal
  const handleOpenCancelModal = () => {
    if (!activeJob) return;
    setPrevStatus(activeJob.status);
    
    // Pause the active job printing while entering reason
    if (activeJob.status === "Imprimiendo") {
      setActiveJob(prev => ({ ...prev, status: "Pausado" }));
    }
    setShowCancelModal(true);
  };

  // Confirm cancel and archive with reason
  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!activeJob || !cancelReasonText.trim()) return;
    try {
      const res = await fetch(`/api/impresiones/${activeJob.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Cancelado',
          cancelReason: cancelReasonText,
          responsible: localStorage.getItem('userName') || 'ISAM',
        }),
      });
      if (res.ok) {
        setShowCancelModal(false);
        setCancelReasonText('');
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
    if (activeJob && prevStatus === "Imprimiendo") {
      setActiveJob(prev => ({ ...prev, status: "Imprimiendo" }));
    }
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

  // Start printing a specific job from the queue immediately (promotes select job, sends active back to queue)
  const handleStartQueueJob = async (id, status = 'Listo', extraData = {}) => {
    try {
      if (activeJob) {
        await fetch(`/api/impresiones/${activeJob.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ status: 'En espera' }),
        });
      }
      
      const res = await fetch(`/api/impresiones/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ 
          status, 
          responsible: localStorage.getItem('userName') || 'ISAM',
          ...extraData 
        }),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
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

  // Return active job back to the top of the queue (only when status is "Listo")
  const handleReturnToQueue = async () => {
    if (!activeJob || activeJob.status !== "Listo") return;
    try {
      const res = await fetch(`/api/impresiones/${activeJob.id}`, {
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
    try {
      const res = await fetch('/api/impresiones', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newJob),
      });
      if (res.ok) {
        notifyUpdate();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Get all jobs (active + queue + completed) linked to a specific project
  const getJobsByProyectoId = useCallback((proyectoId) => {
    if (!proyectoId) return [];
    const allJobs = [];
    if (activeJob && activeJob.proyectoId === proyectoId) {
      allJobs.push({ ...activeJob, trackingStatus: activeJob.status });
    }
    queue.forEach(job => {
      if (job.proyectoId === proyectoId) {
        allJobs.push({ ...job, trackingStatus: 'En espera' });
      }
    });
    completedJobs.forEach(job => {
      if (job.proyectoId === proyectoId) {
        allJobs.push({ ...job, trackingStatus: job.status });
      }
    });
    return allJobs;
  }, [activeJob, queue, completedJobs]);

  return (
    <PrintQueueContext.Provider value={{
      activeJob,
      queue,
      completedJobs,
      showCancelModal,
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
      getJobsByProyectoId
    }}>
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

