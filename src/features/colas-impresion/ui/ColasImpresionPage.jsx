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
  
  // Shopping Cart state
  const [cartItems, setCartItems] = useState([]);

  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsTvMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      const data = await getMateriales(buildMaterialesQuery({ categoria: 'Impresión' }));
      const items = data.items || data || [];
      setMaterialesImpresion(items);

      // Auto-populate cart with suggested material if it matches job format
      if (job.format) {
        const match = items.find(m => 
          m.nombre.toLowerCase().includes(job.format.toLowerCase()) ||
          (m.codigo && m.codigo.toLowerCase().includes(job.format.toLowerCase()))
        );
        if (match) {
          const isInk = match.unidadMedida?.nombre === 'litros' || match.nombre?.toLowerCase().includes('tinta');
          const suggested = calculateSuggestedQuantity(match, job.width, job.height, job.copies);
          
          const defaultItem = {
            materialId: match.id,
            nombre: match.nombre,
            codigo: match.codigo || 'S/C',
            ancho: match.ancho,
            quantity: Number(suggested.toFixed(2)),
            unidad: match.unidadMedida?.abreviacion || match.unidadMedida?.nombre || 'm',
            stockActual: match.stockActual,
            precioCosto: match.precioCosto || 0,
            isInformative: isInk
          };
          setCartItems([defaultItem]);
        }
      }
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
      matchesDate = (job.sentAt && job.sentAt.includes(formattedFilterDate)) || 
                    (job.completedAt && job.completedAt.includes(formattedFilterDate));
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
    <div className="colas-impresion-container">
      {/* Header section */}
      <div className="colas-header-row">
        <div className="colas-header-left">
          <div className="colas-header-icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" className="colas-header-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.82l-.24 2.24H4.5a2.25 2.25 0 00-2.25 2.25v2.25c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-2.25a2.25 2.25 0 00-2.25-2.25h-1.98l-.24-2.24m-11.28 0H18.72m-12 0h12m-12 0l1.24-11.13A2.25 2.25 0 018.21 2.25h7.58a2.25 2.25 0 012.23 1.99L19.28 13.82m-12 0h12" />
            </svg>
          </div>
          <div className="colas-title-group">
            <h1>Colas de Impresión</h1>
            <p>Supervisión informativa y administración del estado de los trabajos en cola.</p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="colas-header-navigation">
          <button 
            type="button" 
            className={`colas-header-nav-btn ${activeTab === 'cola' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('cola')}
          >
            Cola de Impresión
          </button>
          <button 
            type="button" 
            className={`colas-header-nav-btn ${activeTab === 'historial' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('historial')}
          >
            Historial de Impresión
          </button>
        </div>
      </div>

      {activeTab === 'cola' ? (
        <>
          {/* KPI Cards section */}
          <div className="colas-kpi-grid">
            <div className="colas-kpi-card">
              <span className="colas-kpi-title">Trabajo Seleccionado</span>
              <span className="colas-kpi-value" style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-primary-blue)' }}>
                {activeJob ? activeJob.name : "Ninguno"}
              </span>
              <span className="colas-kpi-desc">
                {activeJob ? `Cliente: ${activeJob.client || 'Sin cliente'} (${activeJob.status})` : "Elige un nuevo documento"}
              </span>
            </div>

            <div className="colas-kpi-card">
              <span className="colas-kpi-title">Documentos en Espera</span>
              <span className="colas-kpi-value">{queue.length}</span>
              <span className="colas-kpi-desc">Pendientes en cola</span>
            </div>

            <div className="colas-kpi-card">
              <span className="colas-kpi-title">Trabajos Procesados</span>
              <span className="colas-kpi-value" style={{ color: '#0d9488' }}>
                {completedJobs.length}
              </span>
              <span className="colas-kpi-desc">Completados / Cancelados</span>
            </div>
          </div>

          {/* Active Job (Full Width) */}
          <div className="active-job-section-full">
            {activeJob ? (
              <div className={`active-job-card status-${activeJob.status.toLowerCase()}`}>
                <div className="active-job-header">
                  <div className="active-job-header-title">
                    <span className="active-job-eyebrow">Trabajo en Proceso</span>
                    <h3 className="active-job-file-name">{activeJob.name}</h3>
                  </div>

                  <div className="active-job-header-badges" style={{ gap: '0.75rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsTvMode(true)}
                      className="btn-control-premium"
                      style={{ 
                        padding: '0.2rem 0.5rem', 
                        fontSize: '0.7rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        backgroundColor: '#fff', 
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      title="Pantalla Completa / Modo TV"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: '12px', height: '12px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v6.5m0-6.5h6.5m-6.5 0L9 9M3.75 20.25v-6.5m0 6.5h6.5m-6.5 0L9 15M20.25 3.75v6.5m0-6.5h-6.5m6.5 0L15 9m5.25 11.25v-6.5m0 6.5h-6.5m6.5 0L15 15" />
                      </svg>
                      Modo TV
                    </button>
                    {renderPriorityBadge(activeJob.urgency || 'Media')}
                    <div className="status-badge-container">
                      {activeJob.status === "Listo" ? (
                        <div className="active-badge-ready">
                          <span className="ready-dot"></span>
                          <span>Listo para Iniciar</span>
                        </div>
                      ) : activeJob.status === "Imprimiendo" ? (
                        <div className="active-badge-pulse">
                          <span className="pulse-dot"></span>
                          <span>Imprimiendo</span>
                        </div>
                      ) : activeJob.status === "Pausado" ? (
                        <div className="active-badge-paused">
                          <span className="pause-dot"></span>
                          <span>Pausado</span>
                        </div>
                      ) : (
                        <div className="active-badge-completed">
                          <span>{activeJob.status}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="active-job-body">
                  <div className="active-job-grid">
                    
                    {/* Panel Izquierdo: Identidad de Archivo y Specs */}
                    <div className="active-job-left-panel">
                      
                      {/* Document Meta Row */}
                      {/* Document Meta Row */}
                      <div className="active-job-file-details" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="file-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="file-pdf-icon">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                          </div>
                          <div className="file-info-text">
                            <span className="client-label" style={{ display: 'block' }}>Cliente: <strong>{activeJob.client || 'Corporación Luxes'}</strong></span>
                            {activeJob.proyectoNombre && (
                              <span className="project-label" style={{ fontSize: '0.825rem', color: '#7c3aed', fontWeight: 700, display: 'block', margin: '0.1rem 0' }}>
                                Proyecto: <strong>{activeJob.proyectoNombre}</strong>
                              </span>
                            )}                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Área: {(activeJob.width * activeJob.height).toFixed(2)}m²</span>
                          </div>
                        </div>

                        {/* List of files with download links */}
                        <div className="active-job-files-list" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span className="section-mini-label" style={{ margin: 0 }}>Archivos del Trabajo ({parseJobFiles(activeJob).length})</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '120px', overflowY: 'auto' }}>
                            {parseJobFiles(activeJob).map((f, idx) => (
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
                                  className="file-download-link"
                                  style={{ margin: 0, padding: '0.2rem 0.4rem', border: '1px solid var(--color-primary-blue)', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}
                                  title="Descargar este archivo"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '12px', height: '12px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                  </svg>
                                  <span className="active-job-download-text">Descargar</span>
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="active-job-specs-section">
                        <span className="section-mini-label">Especificaciones de Impresión</span>
                        <div className="specs-pills-container">
                          <div className="spec-pill" title="Material">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.125 1.125 0 001.59 0l7.317-7.317a1.125 1.125 0 000-1.59L11.16 3.659A2.25 2.25 0 009.568 3z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h.008v.008H6V7.5z" />
                            </svg>
                            <span>{activeJob.format}</span>
                          </div>

                          <div className="spec-pill" title="Medidas">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5m16.5-16.5v16.5M12 3.75v16.5m-9-8.25h18" />
                            </svg>
                            <span>{activeJob.width || 1.0}m x {activeJob.height || 1.0}m</span>
                          </div>

                          <div className="spec-pill" title="Copias">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6v10.5A2.25 2.25 0 003.75 18.75h10.5A2.25 2.25 0 0016.5 16.5v-2.25m-1.5-6L12 9.75m0 0L9 6.75m3 3V15" />
                            </svg>
                            <span>{activeJob.copies} {activeJob.copies === 1 ? 'copia' : 'copias'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Panel Derecho: Progreso de Impresión y Operador */}
                    <div className="active-job-right-panel">
                      
                      {/* Operator info with avatar */}
                      <div className="operator-info-container">
                        <div className="operator-avatar" title="Operador responsable">
                          {(activeJob.responsible || 'Sin asignar').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="operator-details">
                          <span className="operator-label">Operador</span>
                          <span className="operator-name">{activeJob.responsible || 'Sin asignar'}</span>
                        </div>
                        
                        <div className="start-time-container">
                          <span className="operator-label">Hora de Inicio</span>
                          <span className="start-time-value">{activeJob.startTime || "Sin iniciar"}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Special Notes Alert Banner */}
                  {activeJob.notes && (
                    <div className="special-notes-alert-card">
                      <div className="notes-icon-box">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </div>
                      <div className="notes-content">
                        <span className="notes-title">Indicaciones Especiales del Cliente:</span>
                        <p className="notes-text">{activeJob.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="active-actions-row">
                    <div className="active-actions-left">
                      {activeJob.status === "Listo" ? (
                        <>
                          <button 
                            type="button" 
                            onClick={handleStartActiveJob}
                            className="btn-control-premium btn-start"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                            </svg>
                            Iniciar Impresión
                          </button>

                          <button
                            type="button"
                            onClick={handleReturnToQueue}
                            className="btn-control-premium btn-return"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                            </svg>
                            Devolver a Cola
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            type="button" 
                            onClick={handleTogglePause}
                            className={`btn-control-premium ${activeJob.status === "Imprimiendo" ? 'btn-pause' : 'btn-resume'}`}
                          >
                            {activeJob.status === "Imprimiendo" ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                                </svg>
                                Pausar Impresión
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                </svg>
                                Reanudar Impresión
                              </>
                            )}
                          </button>

                          <button 
                            type="button" 
                            onClick={handleCompleteActiveJob}
                            className="btn-control-premium btn-complete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Marcar como Completado
                          </button>
                        </>
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={handleOpenCancelModal}
                      className="btn-control-premium btn-cancel"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                      </svg>
                      Cancelar Impresión
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="active-job-empty-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="active-job-empty-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="active-job-empty-title">Elige un nuevo documento</span>
                <p className="active-job-empty-desc">
                  No hay ningún trabajo de impresión activo en este momento. Por favor, selecciona un documento de la cola de impresión que se encuentra a continuación para iniciar el proceso.
                </p>
              </div>
            )}
          </div>

          {/* Queue Table Card */}
          <div className="queue-section-card">
            <div className="queue-header">
              <h3>Documentos en Cola</h3>
              <span className="queue-count-badge">{queue.length} en espera</span>
            </div>

            <div className="queue-table-wrapper">
              {queue.length > 0 ? (
                <>
                  <div className="colas-desktop-only">
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th style={{ width: '36px' }}>Pos</th>
                          <th style={{ width: '18%' }}>Documento</th>
                          <th style={{ width: '12%' }}>Cliente</th>
                          <th style={{ width: '70px' }}>Urgencia</th>
                          <th style={{ width: '90px' }}>Copias</th>
                          <th style={{ width: '16%' }}>Sustrato / Medidas</th>
                          <th style={{ width: '10%' }}>Enviado por</th>
                          <th style={{ width: '110px' }}>Fecha Envío</th>
                          <th style={{ width: '80px' }}>Estado</th>
                          <th style={{ width: '130px', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedQueue.map((job, index) => (
                          <tr key={job.id}>
                            <td>
                              <span className="queue-position-badge">{(queuePage - 1) * queueItemsPerPage + index + 1}</span>
                            </td>

                             <td style={{ fontWeight: 600, color: '#1e293b', verticalAlign: 'middle' }}>
                               {(() => {
                                 const files = parseJobFiles(job);
                                 return (
                                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                     <span style={{ color: '#0f172a', display: 'block' }}>{job.name}</span>
                                     {files.length > 0 && (
                                       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                                         {files.map((f, i) => (
                                           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.15rem 0.35rem', borderRadius: '6px', maxWidth: '200px' }} title={f.name}>
                                             <div style={{ width: '20px', height: '20px', borderRadius: '3px', backgroundColor: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                               {isImageFile(f.name, f.url) ? (
                                                 <ProjectMediaImage archivo={f} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                               ) : (
                                                 <span style={{ fontSize: '9px' }}>📄</span>
                                               )}
                                             </div>
                                             <span style={{ fontSize: '0.65rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                               {f.name}
                                             </span>
                                           </div>
                                         ))}
                                       </div>
                                     )}
                                   </div>
                                 );
                               })()}
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
                            <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{job.sentAt || 'Sin fecha'}</td>
                            <td>
                              <span className="queue-status-badge status-waiting">
                                {job.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-group" style={{ justifyContent: 'center' }}>
                                <button 
                                  type="button" 
                                  onClick={() => handleOpenPrepModal(job)}
                                  className="btn-action btn-action-play" 
                                  title="Cargar e Imprimir"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="action-icon">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                  </svg>
                                </button>
                                
                                <button 
                                  type="button" 
                                  onClick={() => handleMoveUp((queuePage - 1) * queueItemsPerPage + index)}
                                  className="btn-action btn-action-up" 
                                  title="Subir prioridad"
                                  disabled={(queuePage - 1) * queueItemsPerPage + index === 0}
                                  style={(queuePage - 1) * queueItemsPerPage + index === 0 ? { opacity: 0.35, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="action-icon">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                  </svg>
                                </button>

                                <button 
                                  type="button"
                                  onClick={() => setDownloadJob(job)}
                                  className="btn-action btn-action-download" 
                                  title="Descargar archivo"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="action-icon">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                  </svg>
                                </button>

                                <button 
                                  type="button" 
                                  onClick={() => handleCancelQueueJob(job.id)}
                                  className="btn-action btn-action-cancel" 
                                  title="Cancelar trabajo"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="action-icon">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="colas-mobile-only">
                    <div className="colas-mobile-cards-grid">
                      {paginatedQueue.map((job, index) => {
                        const files = parseJobFiles(job);
                        const realIndex = (queuePage - 1) * queueItemsPerPage + index;
                        return (
                          <div key={job.id} className="colas-mobile-card">
                            <div className="colas-card-header">
                              <span className="colas-card-pos">#{realIndex + 1}</span>
                              <div className="colas-card-title-group">
                                <span className="colas-card-title">{job.name}</span>
                                <span className="colas-card-client">{job.client || 'Sin cliente'}</span>
                                {job.proyectoNombre && (
                                  <span className="colas-card-project">{job.proyectoNombre}</span>
                                )}
                              </div>
                              {renderPriorityBadge(job.urgency)}
                            </div>
                            <div className="colas-card-body">
                              {files.length > 0 && (
                                <div className="colas-card-files">
                                  {files.map((f, i) => (
                                    <div key={i} className="colas-card-file-chip" title={f.name}>
                                      <div className="colas-card-file-preview">
                                        {isImageFile(f.name, f.url) ? (
                                          <ProjectMediaImage archivo={f} alt="thumb" />
                                        ) : (
                                          <span>📄</span>
                                        )}
                                      </div>
                                      <span className="colas-card-file-name">{f.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                                <span className="colas-card-label">Enviado por:</span>
                                <span className="colas-card-value">{job.sentBy || 'Usuario'}</span>
                              </div>
                              <div className="colas-card-row">
                                <span className="colas-card-label">Fecha Envío:</span>
                                <span className="colas-card-value date">{job.sentAt || 'Sin fecha'}</span>
                              </div>
                              {job.notes && (
                                <div className="colas-card-notes">
                                  <strong>Notas:</strong> {job.notes}
                                </div>
                              )}
                            </div>
                            <div className="colas-card-actions">
                              <button 
                                type="button" 
                                onClick={() => handleOpenPrepModal(job)}
                                className="btn-action-mobile btn-play" 
                                title="Cargar e Imprimir"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                </svg>
                                <span>Imprimir</span>
                              </button>
                              
                              <button 
                                type="button" 
                                onClick={() => handleMoveUp(realIndex)}
                                className="btn-action-mobile btn-up" 
                                title="Subir prioridad"
                                disabled={realIndex === 0}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                </svg>
                                <span>Priorizar</span>
                              </button>

                              <button 
                                type="button"
                                onClick={() => setDownloadJob(job)}
                                className="btn-action-mobile btn-download" 
                                title="Descargar archivo"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                <span>Bajar</span>
                              </button>

                              <button 
                                type="button" 
                                onClick={() => handleCancelQueueJob(job.id)}
                                className="btn-action-mobile btn-cancel" 
                                title="Cancelar trabajo"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                <span>Cancelar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-queue-msg" style={{ padding: '4rem 0' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="empty-queue-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                  <p style={{ fontWeight: 600, color: '#475569' }}>La cola está vacía</p>
                  <p style={{ fontSize: '0.85rem' }}>No hay más trabajos en espera.</p>
                </div>
              )}
            </div>

            {/* Queue Pagination */}
            {queueTotalPages > 1 && (
              <div className="history-pagination">
                <button
                  type="button"
                  onClick={() => setQueuePage(prev => Math.max(1, prev - 1))}
                  disabled={queuePage === 1}
                  className="btn-page"
                >
                  Anterior
                </button>
                <span className="page-info">Página {queuePage} de {queueTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setQueuePage(prev => Math.min(queueTotalPages, prev + 1))}
                  disabled={queuePage >= queueTotalPages}
                  className="btn-page"
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
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.sentAt || 'Sin fecha'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-item-label" style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Hora de Finalización</span>
                  <span className="detail-item-value" style={{ fontWeight: 600, color: '#334155' }}>{selectedJobDetails.completedAt || 'Sin registrar'}</span>
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
        <div className="colas-modal-overlay" onClick={() => { if (!submittingAction) { setShowPrepModal(false); setPrepJob(null); } }}>
          <div className="prep-modal-card" onClick={e => e.stopPropagation()}>
            <div className="details-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              <span className="colas-modal-title" style={{ fontSize: '1.2rem', color: 'var(--color-primary-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg style={{ width: '20px', height: '20px', color: '#6366f1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
                Preparar Impresión e Insumos
              </span>
              <button 
                type="button" 
                onClick={() => { setShowPrepModal(false); setPrepJob(null); }} 
                style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer' }}
                title="Cerrar modal"
                disabled={submittingAction}
              >
                &times;
              </button>
            </div>

            <div className="prep-modal-content-grid">
              
              {/* Left Column: Job Info & Add Insumo */}
              <div className="prep-left-section">
                
                {/* Job Info Card */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span className="section-mini-label" style={{ color: 'var(--color-primary-blue)', fontWeight: 700 }}>Información de Impresión</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{prepJob.name}</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div><strong>Cliente:</strong> {prepJob.client || 'Sin cliente'}</div>
                    {prepJob.proyectoNombre && <div><strong>Proyecto:</strong> {prepJob.proyectoNombre}</div>}
                    <div><strong>Medidas:</strong> {prepJob.width || 1.0}m x {prepJob.height || 1.0}m</div>
                    <div><strong>Copias:</strong> {prepJob.copies} cop.</div>
                    <div style={{ gridColumn: 'span 2' }}><strong>Sustrato requerido:</strong> <span style={{ color: '#6366f1', fontWeight: 'bold' }}>{prepJob.format}</span></div>
                  </div>

                  {prepJob.notes && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', backgroundColor: '#f1f5f9', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                      <strong>Observación:</strong> {prepJob.notes}
                    </div>
                  )}

                  {/* Download artwork */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                    <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Archivos a Descargar ({parseJobFiles(prepJob).length})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '110px', overflowY: 'auto' }}>
                      {parseJobFiles(prepJob).map((f, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
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
                            className="file-download-link"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.4rem', fontSize: '0.75rem', margin: 0, textDecoration: 'none', flexShrink: 0 }}
                          >
                            Descargar
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Material Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Elegir Rollo o Material del Inventario (Categoría Impresión):
                  </label>
                  {loadingMaterials ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <div className="nt-spinner" style={{ width: '16px', height: '16px', border: '2px solid #cbd5e1', borderTopColor: '#3b82f6' }} />
                      Cargando materiales disponibles...
                    </div>
                  ) : (
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => handleMaterialSelectChange(e.target.value)}
                      className="filter-select"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#1e293b' }}
                    >
                      <option value="">-- Seleccionar material para asignar --</option>
                      {materialesImpresion.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} {m.codigo ? `[${m.codigo}]` : ''} {m.ancho ? `(${m.ancho}m ancho)` : ''} [Disp: {m.stockActual} {m.unidadMedida?.abreviacion || m.unidadMedida?.nombre || 'm'}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Selected Material Details and Calculations */}
                {selectedMaterialId && (() => {
                  const mat = materialesImpresion.find(m => m.id === selectedMaterialId);
                  if (!mat) return null;

                  const isInk = mat.unidadMedida?.nombre === 'litros' || mat.nombre?.toLowerCase().includes('tinta');
                  const isPVC = mat.unidadMedida?.nombre === 'planchas' || mat.unidadMedida?.nombre === 'unidades' || mat.nombre?.toLowerCase().includes('pvc');
                  const orientationDetails = getOrientationDetails(mat, prepJob);

                  return (
                    <div style={{ padding: '0.75rem', backgroundColor: '#f0fdfa', borderRadius: '8px', border: '1px solid #99f6e4', fontSize: '0.85rem' }}>
                      <h5 style={{ fontWeight: 700, color: '#0d9488', marginBottom: '0.25rem' }}>Cálculo de Consumo Sugerido:</h5>
                      
                      {isInk ? (
                        <p style={{ margin: 0, color: '#0f766e' }}>
                          Las tintas se registran de forma informativa y no descuentan stock automáticamente.
                        </p>
                      ) : isPVC ? (
                        <p style={{ margin: 0, color: '#0f766e' }}>
                          El PVC se descuenta por unidades físicas. Consumo sugerido: <strong>{prepJob.copies} planchas/unidades</strong> (1 por copia).
                        </p>
                      ) : mat.ancho ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#0f766e' }}>
                          {orientationDetails?.warning && (
                            <p style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{orientationDetails.warning}</p>
                          )}
                          {orientationDetails?.info && (
                            <p style={{ margin: 0 }}>{orientationDetails.info}</p>
                          )}
                          {orientationDetails?.consumption && (
                            <p style={{ margin: 0 }}>Consumo calculado: <strong>{orientationDetails.consumption}</strong></p>
                          )}
                        </div>
                      ) : (
                        <p style={{ margin: 0 }}>Consumo sugerido: <strong>{prepJob.copies} {mat.unidadMedida?.abreviacion || 'uds'}</strong>.</p>
                      )}

                      {/* Quantity Input and Add Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>Cantidad:</span>
                          <input 
                            type="number" 
                            step="0.01"
                            min="0.01"
                            value={requiredQty}
                            onChange={(e) => setRequiredQty(Math.max(0.01, Number(e.target.value)))}
                            style={{ width: '90px', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                          />
                          <span style={{ fontWeight: 600, color: '#475569' }}>{mat.unidadMedida?.abreviacion || mat.unidadMedida?.nombre || 'm'}</span>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddToCart}
                          style={{ marginLeft: 'auto', padding: '0.35rem 1rem', backgroundColor: '#0d9488', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Asignar Insumo
                        </button>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Right Column: Insumos List */}
              <div className="prep-right-section">
                <span className="section-mini-label" style={{ color: 'var(--color-primary-blue)', fontWeight: 700 }}>Lista de Insumos a Descontar</span>
                
                <div style={{ flexGrow: 1, overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  {cartItems.length > 0 ? (
                    <table className="cart-table">
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Cant.</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Disp.</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Estado</th>
                          <th style={{ width: '40px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map((item, index) => {
                          const hasSufficient = item.stockActual >= item.quantity;
                          const deficit = Number((item.quantity - item.stockActual).toFixed(2));
                          
                          return (
                            <tr key={index}>
                              <td>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.nombre}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  Código: {item.codigo} {item.ancho ? `| Ancho: ${item.ancho}m` : ''}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                                {item.quantity} {item.unidad}
                              </td>
                              <td style={{ textAlign: 'right', color: '#475569' }}>
                                {item.isInformative ? '—' : `${item.stockActual} ${item.unidad}`}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {item.isInformative ? (
                                  <span className="cart-item-info">Info</span>
                                ) : hasSufficient ? (
                                  <span className="cart-item-ok">OK</span>
                                ) : (
                                  <span className="cart-item-warning" title={`Faltan ${deficit} ${item.unidad}`}>Faltan {deficit}</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromCart(index)}
                                  className="btn-remove-item"
                                  title="Quitar de la lista"
                                >
                                  <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="cart-empty-state">
                      <svg style={{ width: '32px', height: '32px', color: '#94a3b8', marginBottom: '0.5rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" />
                      </svg>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No hay insumos asignados</p>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem' }}>Selecciona y asigna materiales a la izquierda.</p>
                    </div>
                  )}
                </div>

                {/* Stock warning/info footer inside right column */}
                {cartItems.length > 0 && (() => {
                  const deductables = cartItems.filter(item => !item.isInformative);
                  const deficitItems = deductables.filter(item => item.quantity > item.stockActual);
                  const hasDeficit = deficitItems.length > 0;
                  const hasDeductables = deductables.length > 0;

                  if (hasDeficit) {
                    return (
                      <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.8rem', color: '#b91c1c' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
                          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          Insumos en Déficit
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0' }}>
                          Hay {deficitItems.length} materiales sin stock suficiente. Genera la orden de compra urgente para poder continuar.
                        </p>
                      </div>
                    );
                  } else if (hasDeductables) {
                    return (
                      <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#15803d' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
                          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Insumos Asignados Listos
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0' }}>
                          Todos los insumos asignados están listos y disponibles. Puedes iniciar la impresión.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

              </div>

            </div>

            {/* Modal Actions */}
            <div className="colas-modal-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={() => { setShowPrepModal(false); setPrepJob(null); setCartItems([]); }} 
                className="btn-modal-back"
                disabled={submittingAction}
              >
                Volver
              </button>

              {(() => {
                const deductables = cartItems.filter(item => !item.isInformative);
                const hasDeficit = deductables.some(item => item.quantity > item.stockActual);
                const hasDeductables = deductables.length > 0;

                return (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {hasDeficit && (
                      <button
                        type="button"
                        onClick={handleCreateQuickPO}
                        className="btn-modal-cancel"
                        style={{ backgroundColor: '#f97316', color: '#fff', border: 'none' }}
                        disabled={submittingAction}
                      >
                        {submittingAction ? 'Procesando...' : 'Solicitar Orden de Compra'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleConfirmStartPrint}
                      className="btn-modal-cancel"
                      style={{ 
                        backgroundColor: 'var(--color-primary-blue)', 
                        color: '#fff', 
                        border: 'none', 
                        opacity: (hasDeficit || !hasDeductables || submittingAction) ? 0.6 : 1, 
                        cursor: (hasDeficit || !hasDeductables || submittingAction) ? 'not-allowed' : 'pointer' 
                      }}
                      disabled={hasDeficit || !hasDeductables || submittingAction}
                    >
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

      {/* TV / Fullscreen Mode Overlay */}
      {isTvMode && activeJob && (
        <div 
          className="colas-tv-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#f1f5f9',
            color: '#0f172a',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            boxSizing: 'border-box',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <style>{`
            @keyframes tv-pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.15); opacity: 0.6; }
              100% { transform: scale(1); opacity: 1; }
            }
            .tv-pulse-dot {
              animation: tv-pulse 2s infinite ease-in-out;
            }
          `}</style>
          
          {/* Top Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '8vh', borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div 
                className="tv-pulse-dot"
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: activeJob.status === 'Imprimiendo' ? '#10b981' : '#f59e0b',
                  boxShadow: activeJob.status === 'Imprimiendo' ? '0 0 10px rgba(16,185,129,0.4)' : '0 0 10px rgba(245,158,11,0.4)',
                }} 
              />
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em', color: '#0f172a' }}>
                MONITOREO DE PRODUCCIÓN - TALLER
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <span style={{ fontSize: '0.95rem', color: '#64748b' }}>
                Presiona <strong style={{ color: '#0f172a', backgroundColor: '#e2e8f0', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>ESC</strong> para salir
              </span>
              <button 
                type="button" 
                onClick={() => setIsTvMode(false)}
                style={{
                  padding: '0.45rem 1rem',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#ef4444'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                Salir
              </button>
            </div>
          </div>

          {/* Main Grid Workspace */}
          <div style={{ display: 'flex', flex: 1, gap: '2rem', marginTop: '1.5rem', minHeight: 0, overflow: 'hidden' }}>
            
            {/* Column 1: Active Job */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1.2, justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', minWidth: 0, height: '100%', boxSizing: 'border-box' }}>
              
              {/* Header Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-blue)' }}>
                    TRABAJO ACTIVO
                  </span>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', backgroundColor: activeJob.status === 'Imprimiendo' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: activeJob.status === 'Imprimiendo' ? '#0f766e' : '#b45309', border: activeJob.status === 'Imprimiendo' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(245,158,11,0.2)' }}>
                    {activeJob.status}
                  </span>
                </div>

                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.15, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={activeJob.name}>
                  {activeJob.name}
                </h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '1.35rem', color: '#334155' }}>
                    Cliente: <strong style={{ color: '#0f172a' }}>{activeJob.client || 'Sin cliente'}</strong>
                  </div>
                  {activeJob.proyectoNombre && (
                    <div style={{ fontSize: '1.15rem', color: '#64748b' }}>
                      Proyecto: <strong style={{ color: '#334155' }}>{activeJob.proyectoNombre}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Specs Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>Especificaciones</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Material</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', display: 'block', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activeJob.format}>{activeJob.format}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Medidas</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', display: 'block', marginTop: '0.25rem' }}>{activeJob.width || 1.0}m x {activeJob.height || 1.0}m</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Cantidad</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', display: 'block', marginTop: '0.25rem' }}>{activeJob.copies} {activeJob.copies === 1 ? 'copia' : 'copias'}</span>
                  </div>

                </div>
              </div>

              {/* Operator and Timing */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(activeJob.responsible || 'OP').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Operador</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a' }}>{activeJob.responsible || 'Sin asignar'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Hora de Inicio</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f766e' }}>{activeJob.startTime || 'Sin iniciar'}</span>
                </div>
              </div>

            </div>

            {/* Column 2: Siguientes en Cola */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 0.8, backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', minWidth: 0, height: '100%', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-blue)', marginBottom: '1.25rem', display: 'block' }}>
                SIGUIENTES EN COLA
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflow: 'hidden' }}>
                {queue.slice(0, 4).map((qJob, idx) => (
                  <div 
                    key={qJob.id || idx}
                    style={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '10px', 
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      minWidth: 0
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={qJob.name}>
                        {qJob.name}
                      </span>
                      <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', backgroundColor: qJob.urgency === 'Alta' ? '#fee2e2' : '#fef3c7', color: qJob.urgency === 'Alta' ? '#b91c1c' : '#b45309' }}>
                        {qJob.urgency || 'Media'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>Cliente: <strong style={{ color: '#334155' }}>{qJob.client || 'Sin cliente'}</strong></span>
                      <span>{qJob.format}</span>
                    </div>
                  </div>
                ))}
                {queue.length === 0 && (
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.5rem' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '28px', height: '28px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span style={{ fontSize: '0.85rem' }}>No hay más trabajos en cola</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Vista Previa */}
            {(() => {
              const files = parseJobFiles(activeJob);
              const firstImage = files.find(f => isImageFile(f.name, f.url));
              
              if (firstImage) {
                return (
                  <div style={{ display: 'flex', flex: 0.9, flexDirection: 'column', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', minWidth: 0, height: '100%', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-blue)', marginBottom: '1.25rem', display: 'block' }}>
                      VISTA PREVIA DEL ARTE
                    </span>
                    <div style={{ display: 'flex', flex: 1, width: '100%', minHeight: 0, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <img 
                        src={firstImage.url} 
                        alt="TV preview" 
                        style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} 
                      />
                    </div>
                  </div>
                );
              }
              return null;
            })()}

          </div>
        </div>
      )}
    </div>
  );
};
