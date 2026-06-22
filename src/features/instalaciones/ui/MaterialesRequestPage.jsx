// src/features/instalaciones/ui/MaterialesRequestPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProyectosContext } from '../../proyectos/application/context/ProyectosContext.jsx';
import { ACTIONS } from '../../proyectos/application/store/proyectosStore.js';
import { 
  ArrowLeft, Search, Plus, Trash2, MapPin, 
  Package, ShoppingCart, Clock, CheckCircle, AlertTriangle,
  Wrench, User, Calendar, HelpCircle, Eye, Play, Save, Camera, UploadCloud, X
} from 'lucide-react';
import { PDFPreviewModal } from '../../../shared/ui/components/PDFPreviewModal.jsx';
import { useProyecto } from '../../proyectos/application/hooks/useProyecto.js';
import { getMateriales, registrarMovimiento } from '../../inventario/application/inventarioService.js';
import { PersonalSelector } from '../../proyectos/ui/components/PersonalSelector.jsx';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import './MaterialesRequestPage.css';


export function MaterialesRequestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reloadProyectos, adapter } = useProyectosContext();
  const { proyecto, updateFaseDatos } = useProyecto(id);

  const datosInstalacion = proyecto?.fases?.INSTALACION?.datos || {};
  const materialesExistentes = datosInstalacion.materiales || [];
  const esSoloLectura = datosInstalacion.instalacionCompletada === true;

  // Pestaña Activa
  const [activeTab, setActiveTab] = useState('equipo'); // 'equipo' | 'bodega' | 'distribucion' | 'compras' | 'cierre'
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Estados locales para edición y guardado explícito
  const [personalLocal, setPersonalLocal] = useState([]);
  const [materialesLocales, setMaterialesLocales] = useState([]);

  // Estados de control de inventario local
  const [inventarioDb, setInventarioDb] = useState([]);
  const [loadingInventario, setLoadingInventario] = useState(true);
  const [materialSearch, setMaterialSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [empleados, setEmpleados] = useState([]);
  const [observacionesCierre, setObservacionesCierre] = useState('');

  // Sincronizar observaciones de cierre con el backend
  useEffect(() => {
    if (datosInstalacion.notasCierre !== undefined) {
      setObservacionesCierre(datosInstalacion.notasCierre || '');
    }
  }, [datosInstalacion.notasCierre]);

  // Sincronizar personalLocal cuando cambie el proyecto en base de datos
  useEffect(() => {
    if (datosInstalacion.personalAsignado) {
      setPersonalLocal(datosInstalacion.personalAsignado);
    } else {
      setPersonalLocal([]);
    }
  }, [datosInstalacion.personalAsignado]);

  // Sincronizar materialesLocales cuando cambien los materiales en la base de datos
  useEffect(() => {
    if (materialesExistentes) {
      setMaterialesLocales(materialesExistentes.map(m => ({
        nombre: m.nombre,
        sku: m.sku,
        cantidad: m.cantidad,
        unidad: m.unidad,
        observacion: m.observacion || '',
        origen: m.origen || 'inventario',
        cantidadLlevada: m.cantidadLlevada !== undefined ? m.cantidadLlevada : m.cantidad,
        responsable: m.responsable || '',
        tipo: m.tipo || 'consumible',
        precioUnitario: m.precioUnitario || 0
      })));
    } else {
      setMaterialesLocales([]);
    }
  }, [proyecto]);

  // Estados de modales y PDF
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'error' | 'confirm'
    onConfirm: null
  });

  // Cargar inventario desde el backend
  const fetchInventario = async () => {
    try {
      setLoadingInventario(true);
      const data = await getMateriales({ categoria: 'Taller' });
      const items = Array.isArray(data) ? data : (data.items || []);
      const mapped = items
        .filter(item => item.categoria === 'Taller')
        .map(item => ({
          id: item.id,
          nombre: item.nombre,
          sku: item.codigo || 'SIN-CODIGO',
          stock: item.stockActual || 0,
          precioUnitario: item.costoPromedioPonderado !== undefined ? item.costoPromedioPonderado : (item.precioCosto || 0),
          unidad: item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unidad',
          categoria: item.categoria || 'Taller',
          tipo: item.tipo || 'consumible'
        }));
      setInventarioDb(mapped);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    } finally {
      setLoadingInventario(false);
    }
  };

  // Cargar empleados desde el backend
  const fetchEmpleados = async () => {
    if (adapter?.getEmpleados) {
      try {
        const data = await adapter.getEmpleados();
        setEmpleados(data || []);
      } catch (err) {
        console.error('Error al cargar empleados:', err);
      }
    }
  };

  useEffect(() => {
    fetchInventario();
    fetchEmpleados();
    if (reloadProyectos) {
      reloadProyectos();
    }
  }, []);

  const showModal = (title, message, type = 'success', onConfirm = null) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  function getInitials(name = '') {
    return name
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  // Helper para mapear orden a formato PDF
  const mapOrdenToPDFFormat = (orden) => {
    if (!orden) return null;
    return {
      id: orden.numero || orden.id,
      fechaCreacion: orden.fechaCreacion || '',
      estado: (orden.estado || 'PENDIENTE').toUpperCase(),
      proyectoNombre: orden.concepto || 'Compra de Materiales',
      comentarios: orden.comentarios || 'Sin observaciones.',
      items: (orden.items || []).map(d => ({
        sku: d.sku,
        nombre: d.nombre,
        cantidad: d.cantidadAprobada || d.cantidadSolicitada,
        precioUnitario: d.precioUnitario,
        unidad: d.unidad || 'unidad'
      }))
    };
  };

  if (!proyecto) {
    return (
      <div className="request-page-container flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-slate-500">Proyecto no encontrado</p>
        <button onClick={() => navigate('/instalaciones')} className="text-blue-600 underline">
          Volver a Instalaciones
        </button>
      </div>
    );
  }

  // Filtrar artículos en inventario (limitado a los primeros 6 para mejorar UX y rendimiento)
  const matchedInventory = inventarioDb.filter(item => 
    item.nombre.toLowerCase().includes(materialSearch.toLowerCase()) || 
    item.sku.toLowerCase().includes(materialSearch.toLowerCase())
  ).slice(0, 6);

  // Filtrar órdenes de compra asociadas a este proyecto
  const ordenesProyecto = proyecto.ordenesCompra || [];

  // --- Manejadores de Guardado Explícito ---

  // Guardar Equipo Técnico (Tab 1)
  async function handleGuardarEquipo() {
    try {
      await updateFaseDatos('INSTALACION', {
        personalAsignado: personalLocal
      });
      if (reloadProyectos) {
        reloadProyectos();
      }
      toast.success('Equipo de trabajo guardado con éxito');
    } catch (err) {
      toast.error('No se pudo guardar el equipo de trabajo: ' + err.message);
    }
  }

  // Agregar item al Borrador de Consumo (Tab 2)
  function handleAddToDraft() {
    if (!selectedItem || qty <= 0) return;

    const index = materialesLocales.findIndex(item => item.sku === selectedItem.sku);
    if (index > -1) {
      const nuevaCant = materialesLocales[index].cantidad + qty;
      setMaterialesLocales(prev => prev.map((item, idx) => 
        idx === index ? { ...item, cantidad: nuevaCant, cantidadLlevada: nuevaCant } : item
      ));
    } else {
      setMaterialesLocales(prev => [
        ...prev,
        {
          nombre: selectedItem.nombre,
          sku: selectedItem.sku,
          cantidad: qty,
          unidad: selectedItem.unidad,
          observacion: 'Anotado para la Instalación',
          origen: 'inventario',
          cantidadLlevada: qty,
          responsable: '',
          tipo: selectedItem.tipo || 'consumible',
          precioUnitario: selectedItem.precioUnitario || 0
        }
      ]);
    }

    // Resetear selección
    setSelectedItem(null);
    setQty(1);
    setMaterialSearch('');
  }

  // Quitar item del Borrador (Tab 2)
  function handleRemoveFromDraft(itemSku) {
    setMaterialesLocales(prev => prev.filter(item => item.sku !== itemSku));
  }

  // Guardar Consumo de Bodega completo (Tab 2)
  async function handleConfirmarConsumo() {
    showModal(
      'Registrar Materiales para Instalación',
      `¿Estás seguro de que deseas registrar y guardar estos ${materialesLocales.length} materiales para esta instalación?`,
      'confirm',
      async () => {
        try {
          await updateFaseDatos('INSTALACION', {
            materiales: materialesLocales
          });

          // Recargar inventario local
          await fetchInventario();

          if (reloadProyectos) {
            reloadProyectos();
          }

          toast.success('Materiales y carga guardados con éxito');
        } catch (err) {
          toast.error('No se pudo registrar los materiales: ' + err.message);
        }
      }
    );
  }

  // Modificar distribución local
  const handleLocalMaterialChange = (index, field, value) => {
    setMaterialesLocales(prev => prev.map((m, idx) => {
      if (idx === index) {
        return {
          ...m,
          [field]: value,
          ...(field === 'cantidad' ? { cantidadLaveada: value } : {})
        };
      }
      return m;
    }));
  };

  // Iniciar montaje / instalación en sitio
  async function handleIniciarInstalacion() {
    const hasTeam = personalLocal && personalLocal.length > 0;
    const hasMaterials = materialesLocales && materialesLocales.length > 0;

    if (!hasTeam || !hasMaterials) {
      if (!hasTeam && !hasMaterials) {
        toast.error('No se puede iniciar la instalación: debes asignar al menos un miembro al Equipo de trabajo y agregar Materiales.');
      } else if (!hasTeam) {
        toast.error('No se puede iniciar la instalación: debes asignar al menos un miembro al Equipo de trabajo.');
      } else {
        toast.error('No se puede iniciar la instalación: debes agregar al menos un Material para la obra.');
      }
      return;
    }

    showModal(
      'Iniciar Instalación',
      '¿Estás seguro? Se notificará a la administración que empezó la instalación y se guardará el equipo y materiales seleccionados.',
      'confirm',
      async () => {
        const now = new Date();
        try {
          await updateFaseDatos('INSTALACION', {
            fechaInstalacion: now.toISOString().split('T')[0],
            horaInstalacion: now.toTimeString().slice(0, 5),
            direccionInstalacion: datosInstalacion.direccionInstalacion || proyecto.cliente?.direccion || '',
            personalAsignado: personalLocal,
            materiales: materialesLocales
          });
          
          if (reloadProyectos) {
            reloadProyectos();
          }

          toast.success('Instalación iniciada con éxito, equipo/materiales guardados y administración notificada');
        } catch (err) {
          toast.error('No se pudo iniciar la instalación: ' + err.message);
        }
      }
    );
  }

  const compressAndConvertImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => {
          reject(err);
        };
      };
      reader.onerror = (err) => {
        reject(err);
      };
    });
  };

  const handleUploadEvidencias = async (files) => {
    if (esSoloLectura) return;
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    toast.info('Procesando y comprimiendo imágenes...');
    try {
      const nuevasEvidenciasPromises = fileList.map(file => compressAndConvertImage(file));
      const nuevasEvidencias = await Promise.all(nuevasEvidenciasPromises);

      const evidenciasActuales = datosInstalacion.evidencias || [];
      const updatedEvidencias = [...evidenciasActuales, ...nuevasEvidencias];

      await updateFaseDatos('INSTALACION', {
        evidencias: updatedEvidencias
      });

      if (reloadProyectos) {
        reloadProyectos();
      }
      toast.success('Evidencia(s) cargada(s) con éxito');
    } catch (err) {
      console.error(err);
      toast.error('Error al procesar las imágenes: ' + err.message);
    }
  };

  const handleDeleteEvidencia = async (indexToDelete) => {
    if (esSoloLectura) return;
    showModal(
      'Eliminar Evidencia',
      '¿Estás seguro de que deseas eliminar esta imagen?',
      'confirm',
      async () => {
        try {
          const evidenciasActuales = datosInstalacion.evidencias || [];
          const updatedEvidencias = evidenciasActuales.filter((_, idx) => idx !== indexToDelete);

          await updateFaseDatos('INSTALACION', {
            evidencias: updatedEvidencias
          });

          if (reloadProyectos) {
            reloadProyectos();
          }
          toast.success('Evidencia eliminada con éxito');
        } catch (err) {
          toast.error('No se pudo eliminar la evidencia: ' + err.message);
        }
      }
    );
  };

  // Finalizar instalación en sitio
  const handleCompletarInstalacion = async () => {
    const evidencias = datosInstalacion.evidencias || [];
    if (evidencias.length === 0) {
      toast.error('No se puede finalizar la instalación: debes subir al menos una evidencia fotográfica en el Cierre de Obra.');
      return;
    }

    showModal(
      'Confirmar Finalización',
      '¿Estás seguro de que deseas marcar la instalación como completada en sitio? Esto notificará a la administración.',
      'confirm',
      async () => {
        try {
          await updateFaseDatos('INSTALACION', {
            instalacionCompletada: true,
            notasCierre: observacionesCierre,
            fechaFin: new Date().toISOString().split('T')[0]
          });
          if (reloadProyectos) {
            reloadProyectos();
          }
          toast.success('¡Instalación Completada! Se ha registrado el cierre.');
          navigate('/instalaciones');
        } catch (err) {
          toast.error('No se pudo completar la instalación: ' + err.message);
        }
      }
    );
  };

  // Definición de las pestañas
  const tabs = [
    { id: 'equipo', label: 'Equipo Técnico', shortLabel: 'Equipo', Icon: User },
    { id: 'bodega', label: 'Materiales de Bodega', shortLabel: 'Materiales', Icon: Package },
    { id: 'compras', label: 'Órdenes de Compra', shortLabel: 'Compras', Icon: ShoppingCart },
    { id: 'cierre', label: 'Cierre de Obra', shortLabel: 'Cierre', Icon: Wrench }
  ];

  const isTabSaved = (tabId) => {
    if (tabId === 'equipo') {
      return datosInstalacion.personalAsignado && datosInstalacion.personalAsignado.length > 0;
    }
    if (tabId === 'bodega') {
      return datosInstalacion.materiales && datosInstalacion.materiales.length > 0;
    }
    if (tabId === 'cierre') {
      return !!datosInstalacion.instalacionCompletada;
    }
    return false;
  };

  const materialesConStock = (materialesLocales || []).map(m => {
    const invItem = inventarioDb.find(item => item.sku === m.sku);
    return {
      ...m,
      stock: invItem ? invItem.stock : 0
    };
  });

  return (
    <div className="request-page-container">
      {/* Botón de Retorno */}
      <button onClick={() => navigate('/instalaciones')} className="request-back-btn print:hidden">
        <ArrowLeft size={16} />
        Volver a Panel de Instalaciones
      </button>

      {/* Título de la página */}
      <div className="inventario-header-box print:hidden">
        <h1 className="inventario-title">Gestión de Instalación y Materiales</h1>
        <p className="inventario-subtitle">
          Control del montaje, asignación de personal, distribución de insumos a llevar y registro del cierre de obra.
        </p>
      </div>

      {/* Hero Banner general (Datos Generales de la Obra) */}
      <div className="request-hero-banner bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center print:hidden">
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Package size={20} />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-800">Ficha de Instalación: {proyecto.nombre}</h2>
                <p className="text-xs text-slate-400">Cliente: <strong className="text-slate-600">{proyecto.cliente.empresa}</strong> • Contacto: {proyecto.cliente.nombre}</p>
              </div>
              <div className="flex items-center gap-1.5 ml-0 lg:ml-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Estado:</span>
                {datosInstalacion.instalacionCompletada ? (
                  <span className="oc-history-badge aprobada">Completada</span>
                ) : datosInstalacion.fechaInstalacion ? (
                  <span className="oc-history-badge pendiente">En Montaje</span>
                ) : (
                  <span className="oc-history-badge" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>En Cola</span>
                )}
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} 
              className="lg:hidden px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
            >
              {isDetailsExpanded ? 'Ocultar detalles ▲' : 'Ver detalles ▼'}
            </button>
          </div>

          <div className={`hero-details-container ${isDetailsExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
              {/* Dirección */}
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Dirección de Instalación</p>
                  <p className="font-medium mt-0.5">{datosInstalacion.direccionInstalacion || proyecto.cliente.direccion || 'Sin dirección registrada'}</p>
                </div>
              </div>

              {/* Fecha Programada */}
              <div className="flex items-start gap-2 text-slate-600">
                <Calendar size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Programación</p>
                  <p className="font-medium mt-0.5">
                    {datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion 
                      ? `${datosInstalacion.fechaInstalacion} a las ${datosInstalacion.horaInstalacion}`
                      : 'Pendiente de arranque en obra'
                    }
                  </p>
                </div>
              </div>

              {/* Equipo Resumen */}
              <div className="flex items-start gap-2 text-slate-600">
                <Wrench size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Equipo Técnico</p>
                  {datosInstalacion.personalAsignado && datosInstalacion.personalAsignado.length > 0 ? (
                    <div className="flex gap-1 mt-1">
                      {datosInstalacion.personalAsignado.map((p, idx) => (
                        <div 
                          key={idx} 
                          className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[9px]"
                          title={`${p.nombre} (${p.rol})`}
                        >
                          {getInitials(p.nombre)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-medium mt-0.5 italic text-slate-400">Sin personal asignado</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notas Especiales */}
            {datosInstalacion.notasInstalacion && (
              <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 flex gap-2 items-start mt-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <span><strong>Instrucciones Especiales:</strong> {datosInstalacion.notasInstalacion}</span>
              </div>
            )}
          </div>
        </div>
      {!datosInstalacion.instalacionCompletada && !datosInstalacion.fechaInstalacion && (
        <button
          onClick={handleIniciarInstalacion}
          className="px-5 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-md shadow-emerald-100 transition-all cursor-pointer shrink-0"
        >
          <Play size={16} fill="currentColor" />
          Iniciar Instalación
        </button>
      )}
    </div>

      {/* Barra de Navegación de Pestañas (Tabs) */}
      <div className="tabs-navigation-bar print:hidden">
        {tabs.map((tab) => {
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon size={15} />
              <span className="tab-label-desktop">{tab.label}</span>
              <span className="tab-label-mobile">{tab.shortLabel}</span>
              {isTabSaved(tab.id) && (
                <CheckCircle 
                  size={14} 
                  className="tab-saved-check text-emerald-500 shrink-0" 
                  style={{ fill: '#e6fffa', color: '#10b981' }} 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Contenedor Principal de la Pestaña Activa */}
      <div className="print:hidden">
        
        {/* --- PESTAÑA 1: EQUIPO TÉCNICO --- */}
        {activeTab === 'equipo' && (
          <div className="request-section-card glass-panel animate-slide-up">
            <div>
              <h2 className="request-card-title flex items-center gap-2">
                <User size={18} className="text-indigo-600" />
                Asignación del Equipo Técnico
              </h2>
              <p className="text-xs text-slate-400 -mt-2">
                Selecciona al personal que realizará los trabajos de instalación. Asegúrate de hacer clic en el botón de guardar.
              </p>
            </div>

            <PersonalSelector
              empleados={empleados}
              personalAsignado={personalLocal}
              onChange={(nuevasAsignaciones) => setPersonalLocal(nuevasAsignaciones)}
              soloLectura={esSoloLectura}
            />

            {!esSoloLectura && (
              <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={handleGuardarEquipo}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-100 transition-all cursor-pointer"
                >
                  <Save size={16} />
                  Guardar Equipo de Trabajo
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- PESTAÑA 2: MATERIALES DE BODEGA --- */}
        {activeTab === 'bodega' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
            
            {/* Buscador de Stock */}
            {!esSoloLectura && (
              <div className="lg:col-span-5" style={{ position: 'relative', zIndex: 20 }}>
                <div className="request-section-card glass-panel h-full">
                  <div>
                    <h2 className="request-card-title flex items-center gap-2">
                      <Search size={18} className="text-indigo-600" />
                      Consultar Inventario Central (Bodega)
                    </h2>
                    <p className="text-xs text-slate-400 -mt-2">
                      Consulta el catálogo de inventario e ingresa los insumos que vas a utilizar en la instalación.
                    </p>
                  </div>

                  <div className="material-search-section">
                    <label className="form-label">Buscar Material en Stock</label>
                    <div style={{ position: 'relative', zIndex: 10 }}>
                      <input
                        type="text"
                        className="inv-search-input"
                        style={{ background: '#ffffff' }}
                        placeholder="Escribe para buscar (ej. Acrílico, LED, Perno...)"
                        value={materialSearch}
                        onChange={(e) => {
                          setMaterialSearch(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                      {showDropdown && materialSearch.trim().length > 0 && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                          <div className="search-results-dropdown z-20">
                            {matchedInventory.length > 0 ? (
                              matchedInventory.map(item => (
                                <div 
                                  key={item.id} 
                                  className="search-result-item"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowDropdown(false);
                                    setMaterialSearch(item.nombre);
                                  }}
                                >
                                  <div className="result-item-info">
                                    <span className="result-item-name">{item.nombre}</span>
                                    <span className="result-item-meta">SKU: {item.sku} • Stock: {item.stock} {item.unidad}s</span>
                                  </div>
                                  <span className="badge-category">{item.categoria}</span>
                                </div>
                              ))
                            ) : (
                              <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                Sin resultados en inventario. ¿No hay stock?{' '}
                                <button 
                                  type="button" 
                                  onClick={() => setActiveTab('compras')}
                                  className="text-blue-600 font-bold hover:underline"
                                >
                                  Generar Orden de Compra
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selección y Cantidad */}
                  {selectedItem && (
                    <div className="item-add-control-panel mt-2 animate-slide-up">
                      <div className="selected-item-display">
                        <span className="font-bold text-slate-800">{selectedItem.nombre}</span>
                        <span className="text-xs text-slate-500">Stock: {selectedItem.stock} {selectedItem.unidad}s</span>
                      </div>

                      <div className="qty-inputs-box">
                        <span className="form-label">Cantidad a llevar:</span>
                        <input
                          type="number"
                          min="1"
                          className="qty-input-field"
                          value={qty}
                          onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <span className="font-semibold text-slate-600 text-sm">
                          {selectedItem.unidad}s
                        </span>
                      </div>

                      <button
                        onClick={handleAddToDraft}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Plus size={16} />
                        Agregar a la Lista de Obra
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel de Materiales Asignados */}
            <div className={esSoloLectura ? "lg:col-span-12" : "lg:col-span-7"} style={{ position: 'relative', zIndex: 10 }}>
              <div className="request-section-card glass-panel min-h-[350px] flex flex-col justify-between">
                <div>
                  <h2 className="request-card-title flex items-center gap-2">
                    <Package size={18} className="text-indigo-600" />
                    Materiales y Herramientas Asignados
                  </h2>
                  <p className="text-xs text-slate-400 -mt-2">
                    Anota los materiales y herramientas que se llevarán a la obra. Asigna responsable solo para las herramientas no consumibles.
                  </p>

                  {materialesConStock.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 italic text-sm">
                      <Package size={36} className="text-slate-300 mb-2" />
                      <span>No has asignado materiales aún. Búscar e agregar en el panel izquierdo.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto mt-4 mobile-table-cards">
                      <table className="materials-list-table">
                        <thead>
                          <tr>
                            <th style={{ width: '30%' }}>Material / Herramienta</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Stock</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Cantidad</th>
                            <th style={{ width: '20%' }}>Responsable</th>
                            <th style={{ width: '15%' }}>Notas</th>
                            {!esSoloLectura && <th style={{ width: '5%', textAlign: 'center' }}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {materialesConStock.map((m, i) => (
                            <tr key={m.sku}>
                              <td data-label="Material">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{m.nombre}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">SKU: {m.sku}</span>
                                  <span className={`origin-badge w-max mt-1 ${m.origen === 'compra' ? 'compra' : 'inventario'}`}>
                                    {m.origen === 'compra' ? 'Compra' : 'Stock'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }} className="text-slate-500 font-medium" data-label="Stock">
                                {m.stock} {m.unidad}s
                              </td>
                              <td style={{ textAlign: 'center' }} data-label="Cantidad">
                                {esSoloLectura ? (
                                  <span className="font-bold text-slate-700">{m.cantidad} {m.unidad}s</span>
                                ) : (
                                  <input
                                    type="number"
                                    min="1"
                                    className="qty-input-field"
                                    style={{ width: '65px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                    value={m.cantidad}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      handleLocalMaterialChange(i, 'cantidad', val);
                                    }}
                                  />
                                )}
                              </td>
                              <td data-label="Responsable">
                                {esSoloLectura ? (
                                  <span className="text-slate-700 font-medium">{m.responsable || 'Sin asignar'}</span>
                                ) : (
                                  m.tipo === 'herramienta' ? (
                                    <select
                                      className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                      value={m.responsable || ''}
                                      onChange={(e) => handleLocalMaterialChange(i, 'responsable', e.target.value)}
                                    >
                                      <option value="">Seleccionar...</option>
                                      {(personalLocal || []).map((p, idx) => (
                                        <option key={idx} value={p.nombre}>{p.nombre}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Consumible</span>
                                  )
                                )}
                              </td>
                              <td data-label="Notas">
                                {esSoloLectura ? (
                                  <span className="text-slate-600 italic">{m.observacion || 'Sin notas'}</span>
                                ) : (
                                  <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                    placeholder="Notas..."
                                    value={m.observacion || ''}
                                    onChange={(e) => handleLocalMaterialChange(i, 'observacion', e.target.value)}
                                  />
                                )}
                              </td>
                              {!esSoloLectura && (
                                <td style={{ textAlign: 'center' }} data-label="Acción">
                                  <button
                                    onClick={() => handleRemoveFromDraft(m.sku)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar material"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {!esSoloLectura && materialesConStock.length > 0 && (
                  <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleConfirmarConsumo}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-100 transition-all cursor-pointer"
                    >
                      <Save size={16} />
                      Guardar Materiales y Carga
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- PESTAÑA 4: ÓRDENES DE COMPRA --- */}
        {activeTab === 'compras' && (
          <div className="request-section-card glass-panel animate-slide-up">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="request-card-title flex items-center gap-2">
                  <ShoppingCart size={18} className="text-indigo-600" />
                  Historial de Solicitudes de Compra
                </h2>
                <p className="text-xs text-slate-400">
                  Consulta o solicita órdenes de compra para insumos que no se encuentren disponibles en bodega.
                </p>
              </div>
              <button
                onClick={() => navigate(`/compras/nueva?proyectoId=${proyecto.id}`)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} />
                Solicitar Compra
              </button>
            </div>

            {ordenesProyecto.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                Ninguna solicitud de compra registrada aún para este proyecto.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm mt-2 mobile-table-cards">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="p-3 font-bold uppercase tracking-wider" style={{ width: '120px' }}>Nº Orden</th>
                      <th className="p-3 font-bold uppercase tracking-wider" style={{ width: '100px' }}>Fecha</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Detalle de Insumos</th>
                      <th className="p-3 font-bold uppercase tracking-wider">Obs. Administración</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-center" style={{ width: '120px' }}>Estado</th>
                      <th className="p-3 font-bold uppercase tracking-wider text-right" style={{ width: '180px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenesProyecto.map((oc) => {
                      const statusClass = oc.estado.toLowerCase();
                      return (
                        <tr key={oc.id} className="border-b border-slate-100 text-slate-600 hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800" data-label="Nº Orden">
                            {oc.numero || oc.id}
                          </td>
                          <td className="p-3 text-slate-500" data-label="Fecha">
                            {oc.fechaCreacion || oc.fecha}
                          </td>
                          <td className="p-3" data-label="Detalle de Insumos">
                            <div className="space-y-1">
                              {(oc.items || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between max-w-xs text-[11px]">
                                  <span className="text-slate-700">{item.nombre}</span>
                                  <span className="font-bold text-slate-500 ml-2">
                                    {oc.estado === 'APROBADA' || oc.estado === 'RECIBIDA'
                                      ? `${item.cantidadAprobada} / ${item.cantidadSolicitada} ud.`
                                      : `${item.cantidadSolicitada} ud.`
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 italic" data-label="Obs. Administración">
                            {oc.comentarios || '—'}
                          </td>
                          <td className="p-3 text-center" data-label="Estado">
                            <span className={`oc-history-badge ${statusClass}`}>
                              {oc.estado}
                            </span>
                          </td>
                          <td className="p-3 text-right" data-label="Acciones">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setPreviewOC(mapOrdenToPDFFormat(oc));
                                  setIsPDFOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye size={12} />
                                PDF
                              </button>
                              {oc.estado === 'APROBADA' && (
                                <button
                                  onClick={() => navigate(`/inventario/recepcion/${oc.id}`)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Package size={12} />
                                  Recibir
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- PESTAÑA 5: CIERRE DE OBRA --- */}
        {activeTab === 'cierre' && (
          <div className="space-y-6 animate-slide-up">
            
            {datosInstalacion.fechaInstalacion ? (
              <div className="space-y-6">
                
                {/* Evidencia Fotográfica en Cierre */}
                <div className="request-section-card glass-panel">
                  <div>
                    <h2 className="request-card-title flex items-center gap-2">
                      <Camera size={18} className="text-indigo-600" />
                      Evidencia Fotográfica de la Instalación
                    </h2>
                    <p className="text-xs text-slate-400 -mt-2">
                      Sube fotos de la obra realizada. Se requiere al menos una foto para poder finalizar la instalación. Las imágenes se guardan automáticamente al subirse.
                    </p>
                  </div>

                  {!esSoloLectura ? (
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                      {/* Elegir de Galería o Archivos */}
                      <div 
                        className="evidencias-dropzone flex-1"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files) {
                            handleUploadEvidencias(e.dataTransfer.files);
                          }
                        }}
                      >
                        <input
                          type="file"
                          id="evidencias-input-gallery"
                          multiple
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files) {
                              handleUploadEvidencias(e.target.files);
                            }
                          }}
                        />
                        <label htmlFor="evidencias-input-gallery" className="dropzone-label cursor-pointer flex flex-col items-center justify-center">
                          <UploadCloud size={36} className="text-indigo-500 mb-2 animate-bounce" />
                          <span className="font-bold text-slate-700 text-xs sm:text-sm">Elegir de Galería</span>
                          <span className="text-[10px] text-slate-400 mt-1">Arrastra aquí o haz clic para buscar</span>
                        </label>
                      </div>

                      {/* Abrir Cámara */}
                      <div className="evidencias-dropzone flex-1">
                        <input
                          type="file"
                          id="evidencias-input-camera"
                          accept="image/*"
                          capture="environment"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            if (e.target.files) {
                              handleUploadEvidencias(e.target.files);
                            }
                          }}
                        />
                        <label htmlFor="evidencias-input-camera" className="dropzone-label cursor-pointer flex flex-col items-center justify-center">
                          <Camera size={36} className="text-emerald-500 mb-2" />
                          <span className="font-bold text-slate-700 text-xs sm:text-sm">Abrir Cámara</span>
                          <span className="text-[10px] text-slate-400 mt-1">Toma una foto directamente</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4 text-xs text-slate-500 flex items-center gap-2">
                      <Eye size={16} className="text-slate-400" />
                      <span>Modo de solo lectura: Las evidencias fotográficas no se pueden modificar.</span>
                    </div>
                  )}

                  {/* Galería de Evidencias */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                      Fotos Guardadas ({datosInstalacion.evidencias?.length || 0})
                    </h3>
                    
                    {!datosInstalacion.evidencias || datosInstalacion.evidencias.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Camera size={32} className="text-slate-300 mb-2" />
                        <span>No hay imágenes cargadas aún.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {datosInstalacion.evidencias.map((imgBase64, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setPreviewImage(imgBase64)}
                            className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm aspect-video flex items-center justify-center cursor-pointer"
                          >
                            <img 
                              src={imgBase64} 
                              alt={`Evidencia ${idx + 1}`} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            
                            {/* Botón de eliminar siempre accesible arriba a la derecha */}
                            {!esSoloLectura && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Evitar abrir el preview
                                  handleDeleteEvidencia(idx);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-600/95 hover:bg-red-600 text-white rounded-full shadow-md transition-colors cursor-pointer z-10"
                                title="Eliminar imagen"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            
                            {/* Overlay de hover para desktop */}
                            <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="px-2 py-1 bg-white/90 text-slate-800 text-[10px] font-bold rounded-lg shadow flex items-center gap-1">
                                <Eye size={12} /> Ampliar
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cierre de la Instalación */}
                <div className="request-section-card glass-panel">
                  <h2 className={`request-card-title flex items-center gap-2 ${
                    datosInstalacion.instalacionCompletada ? 'text-emerald-800' : 'text-amber-800'
                  }`}>
                    <CheckCircle size={18} className={datosInstalacion.instalacionCompletada ? 'text-emerald-600' : 'text-amber-600'} />
                    Cierre de la Instalación
                  </h2>

                  {datosInstalacion.instalacionCompletada ? (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-500">
                        Los trabajos de montaje en el sitio han sido finalizados.
                      </p>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-800">
                        <p className="font-bold">Montaje Completado</p>
                        <p className="mt-1">Finalizó el {datosInstalacion.fechaFin || 'recientemente'}.</p>
                        {datosInstalacion.notasCierre ? (
                          <p className="mt-2 pt-2 border-t border-emerald-100 italic">
                            Notas: "{datosInstalacion.notasCierre}"
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500">
                        Una vez completados todos los trabajos de instalación en obra, ingresa las observaciones finales y marca el proyecto como completado para notificar al administrador.
                      </p>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Notas y Observaciones de Cierre
                        </label>
                        <textarea
                          value={observacionesCierre}
                          onChange={(e) => setObservacionesCierre(e.target.value)}
                          placeholder="Ingresa detalles sobre los resultados de la obra, comentarios del cliente o incidentes..."
                          className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                          rows={4}
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleCompletarInstalacion}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <CheckCircle size={16} />
                        Marcar Instalación como Completada en Sitio
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="request-section-card glass-panel p-6 text-center text-slate-400 italic text-sm">
                Debes iniciar la instalación (usando el botón "Iniciar Instalación" en el encabezado) antes de poder registrar las notas de cierre o completar la obra en sitio.
              </div>
            )}
          </div>
        )}

      </div>

      {/* Visor Reutilizable de PDF */}
      <PDFPreviewModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        oc={previewOC}
        proyecto={proyecto}
        title="Vista Previa de Orden de Compra"
      />

      {/* Modal Dialog de Alertas (Reemplazo de alert nativo) */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-full ${
                modalConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                modalConfig.type === 'error' ? 'bg-red-50 text-red-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {modalConfig.type === 'success' && <CheckCircle size={22} />}
                {modalConfig.type === 'error' && <AlertTriangle size={22} />}
                {modalConfig.type === 'confirm' && <HelpCircle size={22} />}
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">{modalConfig.title}</h3>
            </div>
            
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">{modalConfig.message}</p>
            
            <div className="flex gap-2 justify-end">
              {modalConfig.type === 'confirm' && (
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  closeModal();
                  if (modalConfig.onConfirm) {
                    modalConfig.onConfirm();
                  }
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visor de Imagen */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center bg-transparent cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-white hover:text-slate-300 transition-colors bg-black/40 hover:bg-black/60 rounded-full cursor-pointer focus:outline-none z-10"
              title="Cerrar"
            >
              <X size={20} />
            </button>
            <img 
              src={previewImage} 
              alt="Evidencia Ampliada" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
