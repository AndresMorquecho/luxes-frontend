/* c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/colas-impresion/ui/ColasImpresionPage.jsx */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrl.js';
import { ProjectMediaImage } from '../../../shared/ui/components/ProjectMediaImage.jsx';
import './ColasImpresionPage.css';
import { usePrintQueue } from '../context/PrintQueueContext';
import { getMateriales, registrarMovimiento, buildMaterialesQuery } from '../../inventario/application/inventarioService';
import { createOrden } from '../../compras/application/comprasService';
import { toast } from '../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../shared/ui/components/ConfirmModal';
import { isAdminUser } from '../../../shared/utils/userRoleHelpers.js';
import { User, Folder, Package, Crop, FileText, Clock, List, Printer, Monitor, Play, Pause, ArrowUp, Download, Trash2, XCircle, Tag, Check } from 'lucide-react';

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
      verticalAlign: 'middle'
    }}>
      {icon}
      <span>{urgency}</span>
    </span>
  );
};

function TvClock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = time.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const [hhmm, ampm] = timeStr.split(' ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em' }}>
        {dateStr}
      </span>
      <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1' }} />
      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', display: 'inline-flex', alignItems: 'baseline', gap: '0.2rem' }}>
        {hhmm} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>{ampm}</span>
      </span>
    </div>
  );
}

function TvElapsedTimer({ activeJob }) {
  const [elapsedStr, setElapsedStr] = React.useState('00:00:00');

  React.useEffect(() => {
    if (!activeJob || (activeJob.status !== 'Imprimiendo' && activeJob.status !== 'Pausado')) {
      setElapsedStr('00:00:00');
      return;
    }

    const pad = (num) => String(num).padStart(2, '0');

    if (activeJob.status === 'Pausado') {
      const totalSecs = activeJob.elapsedSeconds || 0;
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setElapsedStr(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      return;
    }

    // Active printing session timer
    const baseSeconds = activeJob.elapsedSeconds || 0;
    const sessionStart = Date.now();

    const updateTimer = () => {
      const elapsedSessionSecs = Math.floor((Date.now() - sessionStart) / 1000);
      const totalSecs = baseSeconds + elapsedSessionSecs;
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setElapsedStr(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeJob]);

  return (
    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: 1 }}>
      {elapsedStr}
    </span>
  );
}

const parseJobFiles = (job) => {
  if (!job || !job.fileUrl) return [];
  const trimmed = job.fileUrl.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((f) => ({
          ...f,
          url: resolveMediaUrl(f.url),
        }));
      }
    } catch (e) {
      console.error('Error parsing job files JSON:', e);
    }
  }
  return [{
    name: job.name,
    url: resolveMediaUrl(job.fileUrl)
  }];
};

const isImageFile = (name, url) => {
  const n = (name || '').toLowerCase();
  const u = (url || '').toLowerCase();
  return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.gif') || n.endsWith('.webp') ||
         u.startsWith('data:image') || u.includes('image') || u.startsWith('blob:');
};

const formatLocalDateTime = (dateStr) => {
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

const formatLocalTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  } catch {
    return dateStr;
  }
};

export const ColasImpresionPage = () => {
  const navigate = useNavigate();
  const {
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
    handleReturnToQueue
  } = usePrintQueue();

  const [activeTab, setActiveTab] = useState('cola'); // 'cola' or 'historial'

  // Filters for History
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  // Pagination for History
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Pagination for Queue
  const [queuePage, setQueuePage] = useState(1);
  const queueItemsPerPage = 25;

  // Selected Job Details Modal
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [downloadJob, setDownloadJob] = useState(null);

  // Preparar Impresión Modal States
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [prepJob, setPrepJob] = useState(null);
  const [materialesImpresion, setMaterialesImpresion] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [requiredQty, setRequiredQty] = useState(1.0);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);
  
  // Shopping Cart state
  const [cartItems, setCartItems] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = isAdminUser(user);

  const userRole = (user?.rol || '').toUpperCase();
  const isVentas = userRole === 'VENTAS' || userRole === 'VENTAS / DISEÑADOR' || userRole === 'VENTAS / DISENADOR';
  const isDisenador = userRole === 'DISEÑADOR' || userRole === 'DISENADOR' || userRole === 'VENTAS / DISEÑADOR' || userRole === 'VENTAS / DISENADOR';
  const isVentasOrDisenador = isVentas || isDisenador;

  const [isTvMode, setIsTvMode] = useState(isAdmin || isVentasOrDisenador);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isAdmin && !isVentasOrDisenador) {
        setIsTvMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, isVentasOrDisenador]);

  // Smart calculations for roll width consumption
  const calculateSuggestedQuantity = (material, width, height, copies) => {
    if (!material) return 1.0;
    
    // Check if it's ink (tinta / litros)
    const isInk = material.unidadMedida?.nombre === 'litros' || material.nombre?.toLowerCase().includes('tinta');
    if (isInk) {
      return 1.0;
    }

    // Check if it's PVC (planchas / unidades)
    const isPVC = material.unidadMedida?.nombre === 'planchas' || material.unidadMedida?.nombre === 'unidades' || material.nombre?.toLowerCase().includes('pvc');
    if (isPVC) {
      return Number(copies);
    }

    // Rolls (metros)
    if (material.ancho) {
      const rollWidth = material.ancho;
      const jobW = Number(width) || 1.0;
      const jobH = Number(height) || 1.0;
      const cop = Number(copies) || 1;

      const fitsNormal = jobW <= rollWidth;
      const fitsRotated = jobH <= rollWidth;

      if (fitsNormal && fitsRotated) {
        // Fits both ways. Suggest the one that consumes less length.
        const normalLen = jobH * cop;
        const rotatedLen = jobW * cop;
        return Number(Math.min(normalLen, rotatedLen).toFixed(2));
      } else if (fitsNormal) {
        return Number((jobH * cop).toFixed(2));
      } else if (fitsRotated) {
        return Number((jobW * cop).toFixed(2));
      } else {
        // Doesn't fit, suggest normal anyway
        return Number((jobH * cop).toFixed(2));
      }
    }

    return Number(copies);
  };

  const getOrientationDetails = (material, job) => {
    if (!material || !material.ancho || !job) return null;
    const rollWidth = material.ancho;
    const jobW = Number(job.width) || 1.0;
    const jobH = Number(job.height) || 1.0;
    const cop = Number(job.copies) || 1;

    const fitsNormal = jobW <= rollWidth;
    const fitsRotated = jobH <= rollWidth;

    if (!fitsNormal && !fitsRotated) {
      return {
        warning: `⚠️ El diseño (${jobW}m x ${jobH}m) es más grande que el ancho del rollo (${rollWidth}m).`,
        orientation: 'No cabe',
        consumption: `${jobH}m por copia`,
      };
    }

    if (fitsNormal && fitsRotated) {
      const normalLen = jobH * cop;
      const rotatedLen = jobW * cop;
      if (normalLen <= rotatedLen) {
        return {
          info: `Ajuste óptimo: Orientación Normal (Diseño de ${jobW}m de ancho cabe en el rollo de ${rollWidth}m).`,
          orientation: 'Normal',
          consumption: `${jobH}m x ${cop} copias = ${normalLen}m`,
        };
      } else {
        return {
          info: `Ajuste óptimo: Orientación Rotada (Diseño rotado de ${jobH}m cabe en el rollo de ${rollWidth}m).`,
          orientation: 'Rotada (90°)',
          consumption: `${jobW}m x ${cop} copias = ${rotatedLen}m`,
        };
      }
    }

    if (fitsNormal) {
      return {
        info: `Orientación Normal: El diseño de ${jobW}m de ancho cabe en el rollo de ${rollWidth}m.`,
        orientation: 'Normal',
        consumption: `${jobH}m x ${cop} copias = ${(jobH * cop).toFixed(2)}m`,
      };
    }

    return {
      info: `Orientación Rotada: El diseño de ${jobH}m rotado cabe en el rollo de ${rollWidth}m.`,
      orientation: 'Rotada (90°)',
      consumption: `${jobW}m x ${cop} copias = ${(jobW * cop).toFixed(2)}m`,
    };
  };

  const handleMaterialSelectChange = (materialId) => {
    setSelectedMaterialId(materialId);
    if (!materialId) {
      setRequiredQty(1.0);
      return;
    }
    const material = materialesImpresion.find(m => m.id === materialId);
    if (material && prepJob) {
      const suggested = calculateSuggestedQuantity(material, prepJob.width, prepJob.height, prepJob.copies);
      setRequiredQty(suggested);
    }
  };

  const handleAddToCart = () => {
    if (!selectedMaterialId) {
      toast.warning('Por favor selecciona un material.');
      return;
    }
    const material = materialesImpresion.find(m => m.id === selectedMaterialId);
    if (!material) return;

    if (requiredQty <= 0) {
      toast.warning('La cantidad debe ser mayor a 0.');
      return;
    }

    const isInk = material.unidadMedida?.nombre === 'litros' || material.nombre?.toLowerCase().includes('tinta');
    
    // Check if already in cart
    const existingIndex = cartItems.findIndex(item => item.materialId === material.id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity = Number((updated[existingIndex].quantity + Number(requiredQty)).toFixed(2));
      setCartItems(updated);
      toast.success(`Se actualizó la cantidad asignada de ${material.nombre}.`);
    } else {
      const newItem = {
        materialId: material.id,
        nombre: material.nombre,
        codigo: material.codigo || 'S/C',
        ancho: material.ancho,
        quantity: Number(Number(requiredQty).toFixed(2)),
        unidad: material.unidadMedida?.abreviacion || material.unidadMedida?.nombre || 'm',
        stockActual: material.stockActual,
        precioCosto: material.precioCosto || 0,
        isInformative: isInk
      };
      setCartItems([...cartItems, newItem]);
      toast.success(`${material.nombre} asignado al trabajo.`);
    }

    // Reset selection
    setSelectedMaterialId('');
    setRequiredQty(1.0);
  };

  const handleRemoveFromCart = (index) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    setCartItems(updated);
  };

  const handleOpenPrepModal = async (job) => {
    setPrepJob(job);
    setSelectedMaterialId('');
    setCartItems([]);
    setRequiredQty(1.0);
    setShowPrepModal(true);
    setLoadingMaterials(true);
    try {
      const data = await getMateriales(buildMaterialesQuery({ categoria: 'Impresión', incluirDerivados: true }));
      const items = data.items || data || [];
      setMaterialesImpresion(items);
      // Cart starts empty — operator adds insumos manually
    } catch (err) {
      toast.error('Error al obtener stock de materiales: ' + err.message);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleConfirmStartPrint = async () => {
    if (!prepJob) return;
    
    // Check if cart is empty of deductable materials
    const deductables = cartItems.filter(item => !item.isInformative);
    if (deductables.length === 0) {
      await confirmDialog(
        'Material Requerido',
        'Debes asignar al menos un material descontable (Rollo o PVC) a la impresión para poder iniciarla.',
        { confirmLabel: 'Entendido', showCancel: false, type: 'warning' }
      );
      return;
    }

    // Check if there is any deficit in the cart
    const hasDeficit = deductables.some(item => item.quantity > item.stockActual);
    if (hasDeficit) {
      await confirmDialog(
        'Insumos Insuficientes',
        'No puedes iniciar la impresión si hay insumos con stock insuficiente en el taller. Por favor, solicita una orden de compra o ajusta la cantidad asignada.',
        { confirmLabel: 'Entendido', showCancel: false, type: 'danger' }
      );
      return;
    }

    const confirmStart = await confirmDialog(
      '¿Confirmar Inicio de Impresión?',
      <div>
        <p>¿Estás seguro de iniciar la impresión de <strong>{prepJob.name}</strong>?</p>
        <p style={{ marginTop: '0.5rem' }}>Al confirmar:</p>
        <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <li>Se enviará una notificación al usuario Administrador.</li>
          <li>Los insumos asignados se descontarán permanentemente del inventario.</li>
          <li>El trabajo pasará inmediatamente al estado de <strong>Imprimiendo</strong>.</li>
        </ul>
      </div>,
      { confirmLabel: 'Sí, Iniciar Impresión', cancelLabel: 'Cancelar', type: 'info' }
    );
    if (!confirmStart) return;

    setSubmittingAction(true);
    try {
      // Register inventory exit movements in parallel for all deductable items
      await Promise.all(deductables.map(item => 
        registrarMovimiento(item.materialId, {
          tipo: 'salida',
          cantidad: Number(item.quantity),
          motivo: `Consumo por Impresión - Trabajo: ${prepJob.name}`,
        })
      ));

      toast.success(`Insumos descontados del inventario exitosamente.`);

      // Prepare detailed string of materials consumed
      const consumoDetalle = deductables.map(item => `${item.nombre} (${item.quantity} ${item.unidad})`).join(', ');

      // Start the print job directly in 'Imprimiendo' status
      await handleStartQueueJob(prepJob.id, 'Imprimiendo', { consumoDetalle });
      toast.success('Trabajo de impresión cargado e iniciado.');
      setShowPrepModal(false);
      setPrepJob(null);
      setCartItems([]);
    } catch (err) {
      toast.error('Error al procesar el inicio de impresión: ' + err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCreateQuickPO = () => {
    if (!prepJob) return;
    
    const deficitItems = cartItems.filter(item => !item.isInformative && item.quantity > item.stockActual);
    if (deficitItems.length === 0) {
      confirmDialog(
        'Insumos Suficientes',
        'No hay materiales con stock insuficiente en los insumos asignados. Todos los insumos tienen stock disponible.',
        { confirmLabel: 'Entendido', showCancel: false, type: 'info' }
      );
      return;
    }

    // Guardar los materiales faltantes en localStorage para que la pantalla de orden de compra los precargue
    const preloadedData = {
      concepto: `Reposición de insumos para impresión - Trabajo: ${prepJob.name}`,
      proyectoId: prepJob.proyectoId || '',
      detalles: deficitItems.map(item => ({
        descripcion: `Material: ${item.nombre} (Falta stock para impresión)`,
        cantidad: Number((item.quantity - item.stockActual).toFixed(2)),
        materialId: item.materialId,
        isCustom: false
      }))
    };
    
    localStorage.setItem('preloaded_po_items', JSON.stringify(preloadedData));
    
    // Cerrar el modal actual
    setShowPrepModal(false);
    setPrepJob(null);
    setCartItems([]);
    
    // Redirigir a la pantalla de creación de orden de compra
    navigate('/compras/nueva');
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterUser, filterStatus]);

  // Reset queue page when queue length changes
  useEffect(() => {
    setQueuePage(prev => {
      const maxPage = Math.max(1, Math.ceil(queue.length / queueItemsPerPage));
      return prev > maxPage ? maxPage : prev;
    });
  }, [queue.length]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Helper to generate a download URL for a print job
  const getDownloadUrl = (job) => {
    if (!job) return '#';
    return job.fileUrl || `data:text/plain;charset=utf-8,Este%20es%20el%20documento%20de%20prueba%20${encodeURIComponent(job.name)}%20en%20cola.`;
  };

  // Filter history jobs
  const filteredHistory = completedJobs.filter(job => {
    let matchesDate = true;
    if (filterDate) {
      const [y, m, d] = filterDate.split('-');
      const formattedFilterDate = `${d}/${m}/${y}`;
      const isoFilterDate = `${y}-${m}-${d}`;
      const checkMatch = (dateStr) => {
        if (!dateStr) return false;
        if (dateStr.includes(formattedFilterDate)) return true;
        if (dateStr.includes(isoFilterDate)) return true;
        try {
          const dt = new Date(dateStr);
          if (!isNaN(dt.getTime())) {
            const lY = dt.getFullYear();
            const lM = String(dt.getMonth() + 1).padStart(2, '0');
            const lD = String(dt.getDate()).padStart(2, '0');
            return `${lY}-${lM}-${lD}` === isoFilterDate;
          }
        } catch {}
        return false;
      };
      matchesDate = checkMatch(job.sentAt) || checkMatch(job.completedAt);
    }

    const matchesUser = filterUser ? (job.sentBy && job.sentBy.toLowerCase().includes(filterUser.toLowerCase())) : true;
    const matchesStatus = filterStatus === 'Todos' ? true : job.status === filterStatus;

    return matchesDate && matchesUser && matchesStatus;
  });

  // Paginate history jobs
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Paginate queue jobs
  const queueTotalPages = Math.ceil(queue.length / queueItemsPerPage);
  const paginatedQueue = queue.slice((queuePage - 1) * queueItemsPerPage, queuePage * queueItemsPerPage);

  return (
    <div className="colas-impresion-container space-y-3 sm:space-y-5 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>
      {!isAdmin && !isTvMode && (
        <>
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
                  <Printer className="w-5 h-5 text-blue-600" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-800">Colas de impresión</h1>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                      Taller
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Supervisión y administración de trabajos en cola
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTvMode(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm"
                >
                  <Monitor size={15} /> Vista TV
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'cola' ? 'historial' : 'cola')}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <Clock size={15} /> {activeTab === 'cola' ? 'Historial' : 'Ver cola'}
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'cola' ? (
            <>
              {/* Active Job (Full Width) */}
              <div className="active-job-section-full" style={{ marginBottom: '1.25rem' }}>
                {activeJob ? (
                  <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>
                          Trabajo en proceso
                        </span>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{activeJob.name}</h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button 
                          type="button" 
                          onClick={() => setIsTvMode(true)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                          <Monitor size={14} /> Modo TV
                        </button>
                        {renderPriorityBadge(activeJob.urgency || 'Media')}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', border: '1px solid rgba(29, 78, 216, 0.2)', backgroundColor: 'rgba(239, 246, 255, 0.9)', color: '#1e40af' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1d4ed8', display: 'inline-block' }}></span>
                          <span>{activeJob.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Body contents */}
                    <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
                      {/* Left side: Preview Image */}
                      <div style={{ width: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(() => {
                          const files = parseJobFiles(activeJob);
                          const firstImage = files.find(f => isImageFile(f.name, f.url));
                          if (firstImage) {
                            return (
                              <ProjectMediaImage 
                                archivo={firstImage} 
                                alt={activeJob.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '4/3' }} 
                              />
                            );
                          }
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.5rem', padding: '2rem 0' }}>
                              <Package size={48} strokeWidth={1.5} />
                              <span style={{ fontSize: '0.85rem' }}>Sin vista previa</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Center side: Details Grid */}
                      <div style={{ flex: 1, minWidth: '300px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignContent: 'space-between' }}>
                        {/* Column 1 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.45rem', borderRadius: '8px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                              <User size={15} strokeWidth={2.2} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>{activeJob.client || 'Sin cliente'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.45rem', borderRadius: '8px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                              <Folder size={15} strokeWidth={2.2} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proyecto</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>{activeJob.proyectoNombre || (activeJob.createdAt ? new Date(activeJob.createdAt).toLocaleDateString('es-EC') : '—')}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.45rem', borderRadius: '8px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                              <Package size={15} strokeWidth={2.2} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Material</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>{activeJob.format || 'Sin material'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.45rem', borderRadius: '8px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                              <Crop size={15} strokeWidth={2.2} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medidas</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>{activeJob.width || 1.0}m x {activeJob.height || 1.0}m</span>
                            </div>
                          </div>
                        </div>

                        {/* Column 2 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.45rem', borderRadius: '8px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                              <FileText size={15} strokeWidth={2.2} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>{activeJob.copies} {activeJob.copies === 1 ? 'copia' : 'copias'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.45rem', borderRadius: '8px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                              <Crop size={15} strokeWidth={2.2} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Área</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>{((Number(activeJob.width) || 1.0) * (Number(activeJob.height) || 1.0)).toFixed(2)}m²</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Operator Card Block */}
                      <div style={{ width: '280px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(activeJob.responsible || 'OP').substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>OPERADOR</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>{activeJob.responsible || 'Sin asignar'}</span>
                          </div>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>HORA DE INICIO</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginTop: '0.15rem' }}>{activeJob.startedPrintingAt ? formatLocalTime(activeJob.startedPrintingAt) : (activeJob.startTime || 'Sin iniciar')}</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>TIEMPO TRANSCURRIDO</span>
                          <TvElapsedTimer activeJob={activeJob} />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Specs and Download block */}
                    <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                      {/* Archivo del Trabajo */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 300px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Archivo del Trabajo</span>
                        {parseJobFiles(activeJob).map((f, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {isImageFile(f.name, f.url) ? (
                                  <ProjectMediaImage archivo={f} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: '10px' }}>📄</span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</span>
                            </div>
                            <a href={f.url || '#'} download={f.name} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>
                              <Download size={12} /> Descargar
                            </a>
                          </div>
                        ))}
                      </div>

                      {/* Especificaciones de Impresión */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 300px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Especificaciones de Impresión</span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                            <Tag size={12} /> {activeJob.format}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                            <Crop size={12} /> {activeJob.width || 1.0}m x {activeJob.height || 1.0}m
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                            <FileText size={12} /> {activeJob.copies} {activeJob.copies === 1 ? 'copia' : 'copias'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {activeJob.status === "Listo" ? (
                          <>
                            <button 
                              type="button" 
                              onClick={handleStartActiveJob}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #1d4ed8', color: '#1d4ed8', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                              <Play size={14} /> Iniciar Impresión
                            </button>

                            <button
                              type="button"
                              onClick={handleReturnToQueue}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                              Devolver a Cola
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              type="button" 
                              onClick={handleTogglePause}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #1d4ed8', color: '#1d4ed8', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                              {activeJob.status === "Imprimiendo" ? (
                                <>
                                  <Pause size={14} /> Pausar Impresión
                                </>
                              ) : (
                                <>
                                  <Play size={14} /> Reanudar Impresión
                                </>
                              )}
                            </button>

                            <button 
                              type="button" 
                              onClick={handleCompleteActiveJob}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                              <Check size={14} /> Marcar como Completado
                            </button>
                          </>
                        )}
                      </div>

                      <button 
                        type="button" 
                        onClick={handleOpenCancelModal}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#fecaca'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      >
                        <XCircle size={14} /> Cancelar Impresión
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="active-job-empty-placeholder" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <FileText size={20} />
                    </div>
                    <span className="active-job-empty-title" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Sin trabajo activo</span>
                    <p className="active-job-empty-desc" style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '420px', margin: 0 }}>
                      Selecciona un documento de la cola para iniciar el proceso de impresión.
                    </p>
                  </div>
                )}
              </div>

              {/* Queue Table Card */}
              <div className="queue-section-card" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)' }}>
                <div className="queue-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Documentos en cola</h3>
                  <span className="queue-count-badge" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{queue.length} en espera</span>
                </div>

                <div className="queue-table-wrapper">
                  {queue.length > 0 ? (
                    <>
                      <div className="colas-desktop-only">
                        <table className="queue-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ width: '36px', padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pos</th>
                              <th style={{ width: '18%', padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Documento</th>
                              <th style={{ width: '15%', padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cliente</th>
                              <th style={{ width: '90px', padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Urgencia</th>
                              <th style={{ width: '90px', padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Copias</th>
                              <th style={{ width: '22%', padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sustrato / Medidas</th>
                              <th style={{ width: '12%', padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Enviado por</th>
                              <th style={{ width: '130px', padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fecha Envío</th>
                              <th style={{ width: '130px', padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedQueue.map((job, index) => {
                              const files = parseJobFiles(job);
                              const posIndex = (queuePage - 1) * queueItemsPerPage + index + 1;
                              return (
                                <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '1rem 0.75rem', fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{posIndex}</td>
                                  <td style={{ padding: '1rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                      <span>{job.name}</span>
                                      {files.map((f, i) => (
                                        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '6px', width: 'max-content', maxWidth: '220px' }}>
                                          <div style={{ width: '20px', height: '20px', borderRadius: '3px', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {isImageFile(f.name, f.url) ? (
                                              <ProjectMediaImage archivo={f} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                              <span style={{ fontSize: '9px' }}>📄</span>
                                            )}
                                          </div>
                                          <span style={{ fontSize: '0.7rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{f.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td style={{ padding: '1rem 0.75rem', color: '#334155', fontWeight: 500 }}>
                                    <div>{job.client || 'Sin cliente'}</div>
                                    {job.proyectoNombre && (
                                      <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700, marginTop: '0.15rem' }}>
                                        {job.proyectoNombre}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '1rem 0.75rem' }}>{renderPriorityBadge(job.urgency)}</td>
                                  <td style={{ padding: '1rem 0.75rem', color: '#334155', fontWeight: 600 }}>{job.copies} {job.copies === 1 ? 'copia' : 'copias'}</td>
                                  <td style={{ padding: '1rem 0.75rem', color: '#334155' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                      <span style={{ fontWeight: 600 }}>{job.format}</span>
                                      <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>Medidas: {job.width || 1.0}m x {job.height || 1.0}m</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '1rem 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>{job.sentBy || 'Usuario'}</td>
                                  <td style={{ padding: '1rem 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>{formatLocalDateTime(job.sentAt)}</td>
                                  <td style={{ padding: '1rem 0.75rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                      <button onClick={() => handleOpenPrepModal(job)} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cargar e Imprimir">
                                        <Play size={14} />
                                      </button>
                                      <button onClick={() => handleMoveUp(posIndex - 1)} disabled={posIndex - 1 === 0} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#475569', cursor: posIndex - 1 === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: posIndex - 1 === 0 ? 0.4 : 1 }} title="Subir prioridad">
                                        <ArrowUp size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards View */}
                      <div className="colas-mobile-only">
                        <div className="colas-mobile-cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem' }}>
                          {paginatedQueue.map((job, index) => {
                            const files = parseJobFiles(job);
                            const realIndex = (queuePage - 1) * queueItemsPerPage + index;
                            return (
                              <div key={job.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ca8a04' }}>POSICIÓN #{realIndex + 1}</span>
                                  {renderPriorityBadge(job.urgency)}
                                </div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{job.name}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                                  <div>Cliente: <strong style={{ color: '#0f172a' }}>{job.client || 'Sin cliente'}</strong></div>
                                  {job.proyectoNombre && <div>Proyecto: <strong style={{ color: '#0f172a' }}>{job.proyectoNombre}</strong></div>}
                                  <div>Material: <strong>{job.format}</strong></div>
                                  <div>Medidas: <strong style={{ color: '#1d4ed8' }}>{job.width || 1.0}m x {job.height || 1.0}m</strong></div>
                                  <div>Copias: <strong>{job.copies}</strong></div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                                  <button onClick={() => handleOpenPrepModal(job)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                                    <Play size={12} /> Cargar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-queue-msg" style={{ padding: '4rem 0', textAlign: 'center' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '48px', height: '48px', color: '#94a3b8', margin: '0 auto 1rem auto' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                      </svg>
                      <p style={{ fontWeight: 600, color: '#475569' }}>La cola está vacía</p>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No hay más trabajos en espera.</p>
                    </div>
                  )}
                </div>

                {/* Queue Pagination */}
                {queueTotalPages > 1 && (
                  <div className="history-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setQueuePage(prev => Math.max(1, prev - 1))}
                      disabled={queuePage === 1}
                      style={{ padding: '0.45rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#334155', cursor: queuePage === 1 ? 'not-allowed' : 'pointer', opacity: queuePage === 1 ? 0.5 : 1, fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Anterior
                    </button>
                    <span className="page-info" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Página {queuePage} de {queueTotalPages}</span>
                    <button
                      type="button"
                      onClick={() => setQueuePage(prev => Math.min(queueTotalPages, prev + 1))}
                      disabled={queuePage >= queueTotalPages}
                      style={{ padding: '0.45rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', color: '#334155', cursor: queuePage >= queueTotalPages ? 'not-allowed' : 'pointer', opacity: queuePage >= queueTotalPages ? 0.5 : 1, fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* History of Completed Jobs Tab (Full Width Table) */
        <div className="queue-section-card">
          <div className="queue-header">
            <h3>Historial de Impresión</h3>
            <span className="queue-count-badge">{filteredHistory.length} filtrados / {completedJobs.length} total</span>
          </div>

          {/* Filters Bar */}
          <div className="history-filters-bar">
            <div className="filter-group">
              <label className="filter-label">Filtrar por Fecha</label>
              <input 
                type="date" 
                value={filterDate} 
                onChange={e => setFilterDate(e.target.value)} 
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">Usuario Remitente</label>
              <input 
                type="text" 
                value={filterUser} 
                onChange={e => setFilterUser(e.target.value)} 
                placeholder="Ej: Juan Pérez..."
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">Estado</label>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)} 
                className="filter-select"
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Completado">Completado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            {(filterDate || filterUser || filterStatus !== 'Todos') && (
              <button 
                type="button" 
                className="btn-clear-filters"
                onClick={() => {
                  setFilterDate('');
                  setFilterUser('');
                  setFilterStatus('Todos');
                }}
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="queue-table-wrapper">
            {paginatedHistory.length > 0 ? (
              <>
                <div className="colas-desktop-only">
                  <table className="queue-table history-table-clickable">
                    <thead>
                      <tr>
                        <th style={{ width: '90px' }}>Finalización</th>
                        <th style={{ width: '16%' }}>Documento</th>
                        <th style={{ width: '11%' }}>Cliente</th>
                        <th style={{ width: '70px' }}>Urgencia</th>
                        <th style={{ width: '80px' }}>Copias</th>
                        <th style={{ width: '14%' }}>Sustrato / Medidas</th>
                        <th style={{ width: '9%' }}>Enviado por</th>
                        <th style={{ width: '10%' }}>Responsable</th>
                        <th style={{ width: '70px' }}>Duración</th>
                        <th style={{ width: '80px' }}>Estado</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>Ver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.map((job) => (
                        <tr 
                          key={job.id} 
                          onClick={() => { setSelectedJobDetails(job); setShowDetailsModal(true); }}
                          style={{ cursor: 'pointer' }}
                          title="Haz clic para ver la ficha técnica detallada"
                        >
                          <td style={{ fontWeight: 600, color: '#64748b' }}>{job.completedAt}</td>
                          <td style={{ fontWeight: 600, color: '#1e293b' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span>{job.name}</span>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setDownloadJob(job); }} // Stop row click event from bubbling to tr
                                style={{ color: 'var(--color-primary-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                title="Descargar archivo"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '12px', height: '12px' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Descargar
                              </button>
                            </div>
                          </td>
                          <td style={{ fontWeight: 500, color: '#475569' }}>
                            <div>{job.client || 'Sin cliente'}</div>
                            {job.proyectoNombre && (
                              <div style={{ fontSize: '0.725rem', color: '#7c3aed', fontWeight: 700, marginTop: '0.15rem' }}>
                                {job.proyectoNombre}
                              </div>
                            )}
                          </td>
                          <td>{renderPriorityBadge(job.urgency)}</td>
                          <td>{job.copies} {job.copies === 1 ? 'copia' : 'copias'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontWeight: 600 }}>{job.format}</span>
                              <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 500 }}>Medidas: {job.width || 1.0}m x {job.height || 1.0}m</span>
                              {job.notes && (
                                <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', backgroundColor: '#f1f5f9', padding: '0.1rem 0.25rem', borderRadius: '4px', display: 'inline-block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.notes}>
                                  Obs: {job.notes}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{job.sentBy || 'Usuario'}</td>
                          <td>{job.responsible || 'Sin asignar'}</td>
                          <td>{formatTime(job.elapsedSeconds)}</td>
                          <td>
                            <span className={`queue-status-badge ${job.status === 'Completado' ? 'status-completed' : 'status-canceled'}`}>
                              {job.status === 'Completado' ? 'Completado' : 'Cancelado'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              className="btn-action" 
                              title="Ver Ficha Técnica"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJobDetails(job);
                                setShowDetailsModal(true);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="colas-mobile-only">
                  <div className="colas-mobile-cards-grid">
                    {paginatedHistory.map((job) => (
                      <div 
                        key={job.id} 
                        className="colas-mobile-card history-card"
                        onClick={() => { setSelectedJobDetails(job); setShowDetailsModal(true); }}
                      >
                        <div className="colas-card-header">
                          <span className="colas-card-date">{job.completedAt}</span>
                          <div className="colas-card-title-group">
                            <span className="colas-card-title">{job.name}</span>
                            <span className="colas-card-client">{job.client || 'Sin cliente'}</span>
                            {job.proyectoNombre && (
                              <span className="colas-card-project">{job.proyectoNombre}</span>
                            )}
                          </div>
                          <span className={`queue-status-badge ${job.status === 'Completado' ? 'status-completed' : 'status-canceled'}`}>
                            {job.status === 'Completado' ? 'Completado' : 'Cancelado'}
                          </span>
                        </div>
                        <div className="colas-card-body">
                          <div className="colas-card-row">
                            <span className="colas-card-label">Sustrato / Formato:</span>
                            <span className="colas-card-value font-bold">{job.format}</span>
                          </div>
                          <div className="colas-card-row">
                            <span className="colas-card-label">Medidas:</span>
                            <span className="colas-card-value text-blue-600">{job.width || 1.0}m x {job.height || 1.0}m</span>
                          </div>
                          <div className="colas-card-row">
                            <span className="colas-card-label">Copias:</span>
                            <span className="colas-card-value">{job.copies}</span>
                          </div>
                          <div className="colas-card-row">
                            <span className="colas-card-label">Urgencia:</span>
                            <span className="colas-card-value">{renderPriorityBadge(job.urgency)}</span>
                          </div>
                          <div className="colas-card-row">
                            <span className="colas-card-label">Enviado por:</span>
                            <span className="colas-card-value">{job.sentBy || 'Usuario'}</span>
                          </div>
                          <div className="colas-card-row">
                            <span className="colas-card-label">Responsable:</span>
                            <span className="colas-card-value">{job.responsible || 'Sin asignar'}</span>
                          </div>
                          <div className="colas-card-row">
                            <span className="colas-card-label">Duración:</span>
                            <span className="colas-card-value">{formatTime(job.elapsedSeconds)}</span>
                          </div>
                        </div>
                        <div className="colas-card-actions">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDownloadJob(job); }}
                            className="btn-action-mobile btn-download" 
                            title="Descargar archivo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            <span>Descargar</span>
                          </button>
                          <button 
                            type="button" 
                            className="btn-action-mobile btn-details" 
                            title="Ver Ficha Técnica"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJobDetails(job);
                              setShowDetailsModal(true);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>Detalle</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-queue-msg" style={{ padding: '4rem 0' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="empty-queue-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p style={{ fontWeight: 600, color: '#475569' }}>No se encontraron resultados</p>
                <p style={{ fontSize: '0.85rem' }}>Prueba modificando los filtros de búsqueda.</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="history-pagination">
              <button 
                type="button" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-page"
              >
                Anterior
              </button>
              <span className="page-info">Página {currentPage} de {totalPages}</span>
              <button 
                type="button" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn-page"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {showCancelModal && (
        <div className="colas-modal-overlay">
          <div className="colas-modal-card">
            <span className="colas-modal-title">Cancelar Trabajo de Impresión</span>
            <p className="colas-modal-desc">
              Por favor, especifica el motivo por el cual estás cancelando la impresión de <strong>{activeJob ? activeJob.name : ""}</strong>. Esta información quedará registrada en el historial del trabajo.
            </p>
            <form onSubmit={handleConfirmCancel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <textarea 
                className="colas-modal-textarea" 
                placeholder="Escribe aquí el motivo (ej: Papel atascado, error de sustrato, archivo incorrecto...)"
                value={cancelReasonText}
                onChange={e => setCancelReasonText(e.target.value)}
                required
              />
              <div className="colas-modal-actions">
                <button type="button" onClick={handleCloseCancelModal} className="btn-modal-back">
                  Volver
                </button>
                <button type="submit" className="btn-modal-cancel">
                  Confirmar Cancelación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <span className={`queue-status-badge ${selectedJobDetails.status === 'Completado' ? 'status-completed' : 'status-canceled'}`}>
                    {selectedJobDetails.status}
                  </span>
                  {renderPriorityBadge(selectedJobDetails.urgency)}
                </div>
              </div>
              
              {/* List of files in the job */}
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Archivos del Trabajo ({parseJobFiles(selectedJobDetails).length})</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {parseJobFiles(selectedJobDetails).map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', backgroundColor: '#ede9fe', overflow: 'hidden', flexShrink: 0, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justify: 'center' }}>
                          {isImageFile(f.name, f.url) ? (
                            <ProjectMediaImage archivo={f} alt="mini preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '14px', height: '14px', color: '#7c3aed' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</span>
                      </div>
                      <a 
                        href={f.url || '#'} 
                        download={f.name}
                        onClick={e => e.stopPropagation()}
                        style={{ color: 'var(--color-primary-blue)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}
                        title="Descargar este archivo"
                      >
                        Descargar
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="details-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Cliente</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.client || 'Sin cliente'}</span>
                </div>
                {selectedJobDetails.proyectoNombre && (
                  <div className="detail-item">
                    <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Proyecto Vinculado</span>
                    <span className="detail-item-value" style={{ fontWeight: 600, color: '#7c3aed' }}>{selectedJobDetails.proyectoNombre}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Material / Sustrato</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.format}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Medidas Físicas</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#0369a1' }}>{selectedJobDetails.width || 1.0}m x {selectedJobDetails.height || 1.0}m</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Copias</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.copies} cop.</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Enviado por</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.sentBy || 'Usuario'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Responsable (Operador)</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.responsible || 'Sin asignar'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Duración de Impresión</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{formatTime(selectedJobDetails.elapsedSeconds)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Fecha de Envío</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{formatLocalDateTime(selectedJobDetails.sentAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Hora de Finalización</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{formatLocalDateTime(selectedJobDetails.completedAt)}</span>
                </div>
              </div>

              {selectedJobDetails.notes && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderLeft: '4px solid var(--color-primary-blue)', borderRadius: '6px' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Indicaciones Especiales</span>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.45 }}>{selectedJobDetails.notes}</p>
                </div>
              )}

              {selectedJobDetails.status === "Cancelado" && selectedJobDetails.cancelReason && (
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

      {/* Preparar Impresión Modal */}
      {showPrepModal && prepJob && (
        <div className="colas-modal-overlay" onClick={() => { if (!submittingAction) { setShowPrepModal(false); setPrepJob(null); setMaterialSearch(''); setMaterialDropdownOpen(false); } }}>
          <div className="prep-modal-card" onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="prep-modal-header">
              <div className="prep-modal-header-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div>
                <h2 className="prep-modal-title">Preparar Impresión e Insumos</h2>
                <p className="prep-modal-subtitle">Revisa la información de impresión y asigna los materiales necesarios.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowPrepModal(false); setPrepJob(null); setMaterialSearch(''); setMaterialDropdownOpen(false); }}
                className="prep-modal-close-btn"
                disabled={submittingAction}
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Content Grid ── */}
            <div className="prep-modal-content-grid">

              {/* ── Left Column ── */}
              <div className="prep-left-section">

                {/* Job Info Card */}
                <div className="prep-info-card">
                  <div className="prep-info-card-header">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'16px',height:'16px'}}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Información de impresión
                  </div>

                  <div className="prep-info-card-body">
                    {/* thumbnail + title */}
                    {(() => {
                      const files = parseJobFiles(prepJob);
                      const firstImg = files.find(f => isImageFile(f.name, f.url));
                      return (
                        <div className="prep-job-title-row">
                          {firstImg ? (
                            <div className="prep-thumb">
                              <ProjectMediaImage archivo={firstImg} alt="thumb" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                            </div>
                          ) : (
                            <div className="prep-thumb prep-thumb-placeholder">
                              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{width:'28px',height:'28px',color:'#94a3b8'}}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                          )}
                          <h4 className="prep-job-name">{prepJob.name}</h4>
                        </div>
                      );
                    })()}

                    <div className="prep-meta-grid">
                      <div className="prep-meta-item">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'13px',height:'13px',color:'#94a3b8',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        <span className="prep-meta-label">Cliente:</span>
                        <span className="prep-meta-value">{prepJob.client || 'Sin cliente'}</span>
                      </div>
                      {prepJob.proyectoNombre && (
                        <div className="prep-meta-item">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'13px',height:'13px',color:'#94a3b8',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                          <span className="prep-meta-label">Proyecto:</span>
                          <span className="prep-meta-value">{prepJob.proyectoNombre}</span>
                        </div>
                      )}
                      <div className="prep-meta-item">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'13px',height:'13px',color:'#94a3b8',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                        <span className="prep-meta-label">Medidas:</span>
                        <span className="prep-meta-value">{prepJob.width || 1.0}m × {prepJob.height || 1.0}m</span>
                      </div>
                      <div className="prep-meta-item">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'13px',height:'13px',color:'#94a3b8',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
                        <span className="prep-meta-label">Copias:</span>
                        <span className="prep-meta-value">{prepJob.copies} cop.</span>
                      </div>
                      <div className="prep-meta-item" style={{gridColumn:'span 2'}}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'13px',height:'13px',color:'#6366f1',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" /></svg>
                        <span className="prep-meta-label">Sustrato requerido:</span>
                        <span className="prep-meta-value" style={{color:'#6366f1',fontWeight:700}}>{prepJob.format}</span>
                      </div>
                    </div>

                    {prepJob.notes && (
                      <div className="prep-notes-box">
                        <strong>Obs:</strong> {prepJob.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Files to download */}
                <div className="prep-files-card">
                  <div className="prep-info-card-header">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'16px',height:'16px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Archivo a descargar ({parseJobFiles(prepJob).length})
                  </div>
                  <div className="prep-files-list">
                    {parseJobFiles(prepJob).map((f, idx) => (
                      <div key={idx} className="prep-file-row">
                        <div className="prep-file-icon">
                          {isImageFile(f.name, f.url) ? (
                            <ProjectMediaImage archivo={f} alt="mini" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          ) : (
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'14px',height:'14px',color:'#6366f1'}}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                          )}
                        </div>
                        <div className="prep-file-info">
                          <span className="prep-file-name" title={f.name}>{f.name}</span>
                          {f.size && <span className="prep-file-size">{f.type?.toUpperCase?.() || 'FILE'} • {(f.size / 1024 / 1024).toFixed(1)} MB</span>}
                        </div>
                        <a href={f.url || '#'} download={f.name} className="prep-download-btn">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'13px',height:'13px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                          Descargar
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Searchable Material Selector ── */}
                <div className="prep-selector-section">
                  <div className="prep-info-card-header">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'16px',height:'16px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
                    Elegir Rollo o Material del Inventario (Categoría Impresión)
                  </div>

                  {loadingMaterials ? (
                    <div className="prep-loading">
                      <div className="nt-spinner" style={{width:'18px',height:'18px',border:'2px solid #e2e8f0',borderTopColor:'#6366f1'}} />
                      Cargando materiales disponibles...
                    </div>
                  ) : (
                    <div className="prep-search-dropdown" style={{position:'relative'}}>
                      {/* Trigger / Search Input */}
                      <div
                        className={`prep-search-trigger ${materialDropdownOpen ? 'open' : ''}`}
                        onClick={() => setMaterialDropdownOpen(o => !o)}
                      >
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'15px',height:'15px',color:'#94a3b8',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                        <input
                          type="text"
                          className="prep-search-input"
                          placeholder={selectedMaterialId
                            ? materialesImpresion.find(m => m.id === selectedMaterialId)?.nombre || 'Selecciona un material...'
                            : 'Selecciona un material para asignar...'}
                          value={materialSearch}
                          onChange={e => { setMaterialSearch(e.target.value); setMaterialDropdownOpen(true); }}
                          onClick={e => { e.stopPropagation(); setMaterialDropdownOpen(true); }}
                        />
                        {selectedMaterialId && (
                          <button
                            type="button"
                            className="prep-search-clear"
                            onClick={e => { e.stopPropagation(); setSelectedMaterialId(''); setMaterialSearch(''); setRequiredQty(1.0); }}
                            title="Limpiar selección"
                          >
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{width:'12px',height:'12px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'14px',height:'14px',color:'#94a3b8',flexShrink:0,transition:'transform 0.2s',transform:materialDropdownOpen?'rotate(180deg)':'rotate(0deg)'}}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </div>

                      {/* Dropdown List */}
                      {materialDropdownOpen && (
                        <div className="prep-dropdown-list">
                          {/* First option: placeholder */}
                          <div
                            className={`prep-dropdown-item prep-dropdown-item--placeholder ${!selectedMaterialId ? 'selected' : ''}`}
                            onClick={() => { setSelectedMaterialId(''); setMaterialSearch(''); setRequiredQty(1.0); setMaterialDropdownOpen(false); }}
                          >
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'14px',height:'14px',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Selecciona un material para asignar...
                          </div>
                          {(() => {
                            const query = materialSearch.toLowerCase();
                            const filtered = materialesImpresion.filter(m =>
                              !query ||
                              m.nombre.toLowerCase().includes(query) ||
                              (m.codigo && m.codigo.toLowerCase().includes(query))
                            );
                            if (filtered.length === 0) {
                              return (
                                <div className="prep-dropdown-empty">
                                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{width:'20px',height:'20px',color:'#cbd5e1'}}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                                  Sin resultados para "{materialSearch}"
                                </div>
                              );
                            }
                            return filtered.map(m => {
                              const unidad = m.unidadMedida?.abreviacion || m.unidadMedida?.nombre || 'm';
                              const stock = m.stockActual ?? 0;
                              const stockOk = stock > 0;
                              const isTinta = m.nombre.toLowerCase().includes('tinta') || m.unidadMedida?.nombre === 'litros';
                              const isRollo = /^\[R\d+\]/.test(m.nombre);
                              const rolloNum = isRollo ? m.nombre.match(/^\[R(\d+)\]/)?.[1] : null;
                              const nombreLimpio = isRollo ? m.nombre.replace(/^\[R\d+\]\s*/, '') : m.nombre;
                              return (
                                <div
                                  key={m.id}
                                  className={`prep-dropdown-item ${selectedMaterialId === m.id ? 'selected' : ''}`}
                                  onClick={() => { handleMaterialSelectChange(m.id); setMaterialSearch(''); setMaterialDropdownOpen(false); }}
                                >
                                  <div className="prep-dropdown-item-icon">
                                    {isTinta ? (
                                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'14px',height:'14px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>
                                    ) : (
                                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'14px',height:'14px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
                                    )}
                                  </div>
                                  <span className="prep-dropdown-item-name" style={{display:'flex',alignItems:'center',gap:'6px',minWidth:0}}>
                                    {isRollo && (
                                      <span style={{display:'inline-flex',alignItems:'center',padding:'1px 6px',borderRadius:'4px',fontSize:'9px',fontWeight:800,background:'#ede9fe',color:'#7c3aed',flexShrink:0,letterSpacing:'0.02em'}}>
                                        R{rolloNum}
                                      </span>
                                    )}
                                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{nombreLimpio}</span>
                                  </span>
                                  <span className={`prep-dropdown-item-stock ${stockOk ? 'ok' : 'empty'}`}>
                                    Disp: {stock} {unidad}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Material Calculation Panel */}
                {selectedMaterialId && (() => {
                  const mat = materialesImpresion.find(m => m.id === selectedMaterialId);
                  if (!mat) return null;
                  const isInk = mat.unidadMedida?.nombre === 'litros' || mat.nombre?.toLowerCase().includes('tinta');
                  const isPVC = mat.unidadMedida?.nombre === 'planchas' || mat.unidadMedida?.nombre === 'unidades' || mat.nombre?.toLowerCase().includes('pvc');
                  const orientationDetails = getOrientationDetails(mat, prepJob);
                  const unidad = mat.unidadMedida?.abreviacion || mat.unidadMedida?.nombre || 'm';

                  return (
                    <div className="prep-calc-panel">
                      <div className="prep-calc-panel-header">
                        <h5 className="prep-calc-panel-title">Cálculo de Consumo Sugerido</h5>
                        <span className="prep-calc-stock-badge">
                          Disponible: {mat.stockActual} {unidad}
                        </span>
                      </div>

                      <div className="prep-calc-info">
                        {isInk ? (
                          <p>Las tintas se registran de forma informativa y no descuentan stock automáticamente.</p>
                        ) : isPVC ? (
                          <p>El PVC se descuenta por unidades físicas. Consumo sugerido: <strong>{prepJob.copies} planchas/unidades</strong> (1 por copia).</p>
                        ) : mat.ancho ? (
                          <div style={{display:'flex',flexDirection:'column',gap:'0.2rem'}}>
                            {orientationDetails?.warning && <p style={{color:'#b91c1c',fontWeight:600,margin:0}}>{orientationDetails.warning}</p>}
                            {orientationDetails?.info && <p style={{margin:0}}>{orientationDetails.info}</p>}
                            {orientationDetails?.consumption && <p style={{margin:0}}>Consumo calculado: <strong>{orientationDetails.consumption}</strong></p>}
                          </div>
                        ) : (
                          <p>Consumo sugerido: <strong>{prepJob.copies} {unidad}</strong>.</p>
                        )}
                      </div>

                      <div className="prep-calc-actions">
                        <div className="prep-qty-row">
                          <span className="prep-qty-label">Cantidad:</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={requiredQty}
                            onKeyDown={e => {
                              const allowed = ['0','1','2','3','4','5','6','7','8','9','.', ',','Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter'];
                              if (!allowed.includes(e.key)) e.preventDefault();
                            }}
                            onChange={e => {
                              const raw = e.target.value.replace(',', '.');
                              setRequiredQty(raw);
                            }}
                            onBlur={e => {
                              const parsed = parseFloat(e.target.value.replace(',', '.'));
                              setRequiredQty(isNaN(parsed) || parsed <= 0 ? 0.01 : parsed);
                            }}
                            className="prep-qty-input"
                          />
                          <span className="prep-qty-unit">{unidad}</span>
                        </div>
                        <button type="button" onClick={handleAddToCart} className="prep-assign-btn">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'14px',height:'14px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          Asignar Insumo
                        </button>
                      </div>
                    </div>
                  );
                })()}

              </div>{/* end prep-left-section */}

              {/* ── Right Column: Insumos List ── */}
              <div className="prep-right-section">
                <div className="prep-info-card-header">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'16px',height:'16px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                  Lista de insumos a descontar
                  {cartItems.length > 0 && (
                    <span className="prep-cart-badge">{cartItems.length}</span>
                  )}
                </div>

                <div style={{flexGrow:1,overflow:'auto',borderRadius:'10px',border:'1px solid #e2e8f0'}}>
                  {cartItems.length > 0 ? (
                    <table className="cart-table">
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th style={{width:'80px',textAlign:'right'}}>Cant.</th>
                          <th style={{width:'80px',textAlign:'right'}}>Disp.</th>
                          <th style={{width:'70px',textAlign:'center'}}>Estado</th>
                          <th style={{width:'36px'}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item, index) => {
                          const hasSufficient = item.stockActual >= item.quantity;
                          const deficit = Number((item.quantity - item.stockActual).toFixed(2));
                          return (
                            <tr key={index}>
                              <td>
                                <div style={{fontWeight:600,color:'#1e293b',fontSize:'0.82rem'}}>{item.nombre}</div>
                                <div style={{fontSize:'0.72rem',color:'#94a3b8'}}>Código: {item.codigo}{item.ancho ? ` | Ancho: ${item.ancho}m` : ''}</div>
                              </td>
                              <td style={{textAlign:'right',fontWeight:700,color:'#334155',fontSize:'0.82rem'}}>{item.quantity} {item.unidad}</td>
                              <td style={{textAlign:'right',color:'#64748b',fontSize:'0.82rem'}}>{item.isInformative ? '—' : `${item.stockActual} ${item.unidad}`}</td>
                              <td style={{textAlign:'center'}}>
                                {item.isInformative ? (
                                  <span className="cart-item-info">Info</span>
                                ) : hasSufficient ? (
                                  <span className="cart-item-ok">OK</span>
                                ) : (
                                  <span className="cart-item-warning" title={`Faltan ${deficit} ${item.unidad}`}>−{deficit}</span>
                                )}
                              </td>
                              <td style={{textAlign:'center'}}>
                                <button type="button" onClick={() => handleRemoveFromCart(index)} className="btn-remove-item" title="Quitar">
                                  <svg style={{width:'14px',height:'14px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="cart-empty-state">
                      <svg style={{width:'44px',height:'44px',color:'#cbd5e1',marginBottom:'0.75rem'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125z" /></svg>
                      <p style={{margin:0,fontSize:'0.85rem',fontWeight:700,color:'#475569'}}>No hay insumos asignados</p>
                      <p style={{margin:'0.3rem 0 0',fontSize:'0.75rem',color:'#94a3b8'}}>Selecciona y asigna materiales desde el selector de la izquierda.</p>
                    </div>
                  )}
                </div>

                {/* Footer status */}
                {cartItems.length > 0 && (() => {
                  const deductables = cartItems.filter(item => !item.isInformative);
                  const deficitItems = deductables.filter(item => item.quantity > item.stockActual);
                  const hasDeficit = deficitItems.length > 0;
                  const hasDeductables = deductables.length > 0;
                  if (hasDeficit) return (
                    <div className="prep-status-banner prep-status-banner--error">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'16px',height:'16px',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                      <div>
                        <strong>Insumos en Déficit</strong>
                        <p style={{margin:'0.15rem 0 0',fontSize:'0.75rem'}}>Hay {deficitItems.length} materiales sin stock suficiente. Genera la orden de compra urgente para continuar.</p>
                      </div>
                    </div>
                  );
                  if (hasDeductables) return (
                    <div className="prep-status-banner prep-status-banner--ok">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'16px',height:'16px',flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <div>
                        <strong>Insumos Asignados Listos</strong>
                        <p style={{margin:'0.15rem 0 0',fontSize:'0.75rem'}}>Todos los insumos asignados están listos y disponibles. Puedes iniciar la impresión.</p>
                      </div>
                    </div>
                  );
                  return null;
                })()}
              </div>
            </div>

            {/* ── Modal Actions ── */}
            <div className="prep-modal-footer">
              <button
                type="button"
                onClick={() => { setShowPrepModal(false); setPrepJob(null); setCartItems([]); setMaterialSearch(''); setMaterialDropdownOpen(false); }}
                className="prep-footer-btn prep-footer-btn--secondary"
                disabled={submittingAction}
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'14px',height:'14px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                Volver
              </button>

              {(() => {
                const deductables = cartItems.filter(item => !item.isInformative);
                const hasDeficit = deductables.some(item => item.quantity > item.stockActual);
                const hasDeductables = deductables.length > 0;
                return (
                  <div style={{display:'flex',gap:'0.5rem'}}>
                    {hasDeficit && (
                      <button
                        type="button"
                        onClick={handleCreateQuickPO}
                        className="prep-footer-btn prep-footer-btn--orange"
                        disabled={submittingAction}
                      >
                        {submittingAction ? 'Procesando...' : 'Solicitar Orden de Compra'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleConfirmStartPrint}
                      className="prep-footer-btn prep-footer-btn--primary"
                      disabled={hasDeficit || !hasDeductables || submittingAction}
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:'14px',height:'14px'}}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
                      {submittingAction ? 'Procesando...' : 'Iniciar Impresión'}
                    </button>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* Modal de Descarga de Archivos */}
      {downloadJob && (
        <div className="colas-modal-overlay" onClick={() => setDownloadJob(null)}>
          <div className="colas-modal-card" style={{ maxWidth: '480px', width: '92%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <span className="colas-modal-title" style={{ fontSize: '1.2rem', color: 'var(--color-primary-blue)' }}>Archivos a Descargar</span>
              <button 
                type="button" 
                onClick={() => setDownloadJob(null)} 
                style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer' }}
                title="Cerrar"
              >
                &times;
              </button>
            </div>
            
            <p className="colas-modal-desc" style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
              Este trabajo de impresión contiene <strong>{parseJobFiles(downloadJob).length}</strong> archivo(s) de diseño. Haz clic en "Descargar" en el archivo que requieras.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {parseJobFiles(downloadJob).map((f, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#ede9fe', overflow: 'hidden', flexShrink: 0, border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isImageFile(f.name, f.url) ? (
                        <ProjectMediaImage archivo={f} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#7c3aed' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontWeight: 600, color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={f.name}>{f.name}</span>
                  </div>
                  <a 
                    href={f.url || '#'} 
                    download={f.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-download-link"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      padding: '0.3rem 0.6rem', 
                      fontSize: '0.75rem', 
                      margin: 0, 
                      textDecoration: 'none', 
                      flexShrink: 0, 
                      backgroundColor: 'var(--color-primary-blue)', 
                      color: 'white', 
                      borderRadius: '6px',
                      fontWeight: 600,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    Descargar
                  </a>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setDownloadJob(null)} 
                className="btn-modal-back"
                style={{ margin: 0 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* TV / Fullscreen Mode Overlay */}
      {isTvMode && (
        <div 
          className={`colas-tv-overlay ${(isAdmin || isVentasOrDisenador) ? 'tv-admin' : ''}`}
          style={{
            position: (isAdmin || isVentasOrDisenador) ? 'relative' : 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#fafafa',
            color: '#0f172a',
            zIndex: (isAdmin || isVentasOrDisenador) ? 1 : 99999,
            display: 'flex',
            flexDirection: 'column',
            padding: (isAdmin || isVentasOrDisenador) ? '1rem' : '2.5rem 3rem',
            boxSizing: 'border-box',
            height: (isAdmin || isVentasOrDisenador) ? '100%' : '100vh',
            width: (isAdmin || isVentasOrDisenador) ? '100%' : '100vw',
            overflow: 'hidden',
            fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif'
          }}
        >
          <style>{`
            .colas-tv-overlay {
              box-sizing: border-box;
            }
            .colas-tv-overlay.tv-admin {
              height: calc(100vh - 120px) !important;
              max-height: calc(100vh - 120px) !important;
            }
            .tv-grid-workspace {
              display: flex;
              gap: 2.5rem;
              flex: 1;
              min-height: 0;
              overflow: hidden;
            }
            .tv-col-1 {
              flex: 1.3 1 0px;
              display: flex;
              flex-direction: column;
              min-height: 0;
              box-sizing: border-box;
            }
            .tv-col-2 {
              flex: 0.85 1 0px;
              display: flex;
              flex-direction: column;
              min-height: 0;
              box-sizing: border-box;
            }
            .tv-active-details {
              display: flex;
              gap: 2.5rem;
              flex: 1;
              min-height: 0;
              align-items: stretch;
            }
            .tv-active-preview {
              width: 48%;
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid #f1f5f9;
              background-color: #f8fafc;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .tv-active-info {
              width: 52%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              gap: 0.75rem;
            }
            @media (max-width: 1024px) {
              .colas-tv-overlay {
                padding: 1.5rem !important;
                overflow-y: auto !important;
              }
              .colas-tv-overlay.tv-admin {
                height: auto !important;
                max-height: none !important;
              }
              .tv-header-row {
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 1rem !important;
                margin-bottom: 1.5rem !important;
              }
              .tv-grid-workspace {
                flex-direction: column !important;
                overflow: visible !important;
                height: auto !important;
                gap: 1.5rem !important;
              }
              .tv-col-1, .tv-col-2 {
                flex: none !important;
                width: 100% !important;
                height: auto !important;
              }
              .tv-active-details {
                flex-direction: column !important;
                gap: 1.5rem !important;
                height: auto !important;
              }
              .tv-active-preview {
                width: 100% !important;
                height: 250px !important;
                aspect-ratio: auto !important;
              }
              .tv-active-info {
                width: 100% !important;
                gap: 1rem !important;
              }
              .tv-footer-row {
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 1rem !important;
              }
              .tv-footer-elapsed {
                align-items: flex-start !important;
              }
              .tv-clock-divider {
                display: none !important;
              }
            }
          `}</style>

          {/* Top Header Bar */}
          <div className="tv-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                <Printer size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Colas de impresión</h1>
                  <span
                    onClick={() => {
                      if (!isVentasOrDisenador) {
                        setIsTvMode(false);
                      }
                    }}
                    style={{
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      cursor: (!isVentasOrDisenador) ? 'pointer' : 'default',
                      userSelect: 'none'
                    }}
                    title={isVentasOrDisenador ? 'Vista TV permanente' : 'Click para salir del Modo TV'}
                  >
                    Vista TV
                  </span>
                </div>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Monitoreo de trabajos activos y en cola
                </p>
              </div>
            </div>
            <TvClock />
          </div>

          {/* Main Grid Workspace */}
          <div className="tv-grid-workspace">
            
            {/* Column 1: Active Job */}
            <div className="tv-col-1" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)' }}>
              {activeJob ? (
                <>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem' }}>
                    Trabajo actual
                  </span>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={activeJob.name}>
                    {activeJob.name}
                  </h2>

                  <div className="tv-active-details">
                    {/* Left part: Preview Image */}
                    <div className="tv-active-preview">
                      {(() => {
                        const files = parseJobFiles(activeJob);
                        const firstImage = files.find(f => isImageFile(f.name, f.url));
                        if (firstImage) {
                          return (
                            <ProjectMediaImage 
                              archivo={firstImage} 
                              alt={activeJob.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          );
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.5rem' }}>
                            <Package size={48} strokeWidth={1.5} />
                            <span style={{ fontSize: '0.9rem' }}>Sin vista previa</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right part: Details List */}
                    <div className="tv-active-info">
                      {(() => {
                        const details = [
                          { label: 'Cliente', value: activeJob.client || 'Sin cliente', Icon: User },
                          { label: 'Proyecto', value: activeJob.proyectoNombre || (activeJob.createdAt ? new Date(activeJob.createdAt).toLocaleDateString('es-EC') : '—'), Icon: Folder },
                          { label: 'Material', value: activeJob.format || 'Sin material', Icon: Package },
                          { label: 'Medidas', value: `${activeJob.width || 1.0}m x ${activeJob.height || 1.0}m`, Icon: Crop },
                          { label: 'Cantidad', value: `${activeJob.copies} ${activeJob.copies === 1 ? 'copia' : 'copias'}`, Icon: FileText },
                        ];
                        return details.map((d, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '8px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                              <d.Icon size={16} strokeWidth={2.2} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.label}</span>
                              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '0.1rem' }}>{d.value}</span>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '1.5rem 0 1.25rem 0' }} />

                  <div className="tv-footer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    {/* Operator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(activeJob.responsible || 'OP').substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>OPERADOR</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{activeJob.responsible || 'Sin asignar'}</span>
                      </div>
                    </div>

                    {/* Time elapsed */}
                    <div className="tv-footer-elapsed" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>TIEMPO TRANSCURRIDO</span>
                      <TvElapsedTimer activeJob={activeJob} />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', textAlign: 'center', gap: '1rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '64px', height: '64px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.82l-.24 2.24H4.5a2.25 2.25 0 00-2.25 2.25v2.25c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-2.25a2.25 2.25 0 00-2.25-2.25h-1.98l-.24-2.24m-11.28 0H18.72m-12 0h12m-12 0l1.24-11.13A2.25 2.25 0 018.21 2.25h7.58a2.25 2.25 0 012.23 1.99L19.28 13.82m-12 0h12" />
                  </svg>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#334155', margin: 0 }}>Sin trabajo activo</h2>
                    <p style={{ fontSize: '1rem', marginTop: '0.25rem' }}>Esperando a que el operador inicie una impresión...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: Siguientes en Cola */}
            <div className="tv-col-2" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '1rem', display: 'block' }}>
                Siguientes en cola
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
                {queue.slice(0, 6).map((qJob, idx) => (
                  <div 
                    key={qJob.id || idx}
                    style={{ 
                      backgroundColor: '#fafafa', 
                      border: '1px solid #f1f5f9', 
                      borderRadius: '12px', 
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      minWidth: 0
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {idx + 2}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={qJob.name}>
                        {qJob.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {qJob.format} &bull; {qJob.width || 1.0}m x {qJob.height || 1.0}m
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>
                      {qJob.copies} {qJob.copies === 1 ? 'copia' : 'copias'}
                    </div>
                  </div>
                ))}
                {queue.length === 0 && (
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.5rem' }}>
                    <List size={32} strokeWidth={1.5} />
                    <span style={{ fontSize: '0.85rem' }}>No hay más trabajos en cola</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end', color: '#64748b', fontSize: '0.85rem', marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', flexShrink: 0 }}>
                <List size={16} />
                <span>{queue.length} trabajos en cola</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
