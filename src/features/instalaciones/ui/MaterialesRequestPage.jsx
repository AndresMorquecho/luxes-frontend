// src/features/instalaciones/ui/MaterialesRequestPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProyectosContext } from '../../proyectos/application/context/ProyectosContext.jsx';
import { ACTIONS } from '../../proyectos/application/store/proyectosStore.js';
import { 
  ArrowLeft, Search, Plus, Trash2, MapPin, 
  Package, ShoppingCart, Clock, CheckCircle, AlertTriangle,
  Wrench, User, Calendar, HelpCircle, Eye, Play, Save
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

  // Pestaña Activa
  const [activeTab, setActiveTab] = useState('equipo'); // 'equipo' | 'bodega' | 'distribucion' | 'compras' | 'cierre'

  // Estados locales para edición y guardado explícito
  const [personalLocal, setPersonalLocal] = useState([]);
  const [materialesTemporalesStock, setMaterialesTemporalesStock] = useState([]);
  const [materialesDistribucion, setMaterialesDistribucion] = useState([]);

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

  // Sincronizar materialesDistribucion cuando cambien los materiales en la base de datos
  useEffect(() => {
    if (materialesExistentes) {
      setMaterialesDistribucion(materialesExistentes.map(m => ({
        nombre: m.nombre,
        sku: m.sku,
        cantidad: m.cantidad,
        unidad: m.unidad,
        observacion: m.observacion || '',
        origen: m.origen || 'inventario',
        cantidadLlevada: m.cantidadLlevada !== undefined ? m.cantidadLlevada : m.cantidad,
        responsable: m.responsable || ''
      })));
    } else {
      setMaterialesDistribucion([]);
    }
  }, [proyecto]);

  // Estados de modales y PDF
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);
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
      const data = await getMateriales();
      const items = Array.isArray(data) ? data : (data.items || []);
      const mapped = items.map(item => ({
        id: item.id,
        nombre: item.nombre,
        sku: item.codigo || 'SIN-CODIGO',
        stock: item.stockActual || 0,
        precioUnitario: item.precioCosto || 0,
        unidad: item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unidad',
        categoria: item.categoria || 'Taller'
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

  // Filtrar artículos en inventario
  const matchedInventory = inventarioDb.filter(item => 
    item.nombre.toLowerCase().includes(materialSearch.toLowerCase()) || 
    item.sku.toLowerCase().includes(materialSearch.toLowerCase())
  );

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

    const index = materialesTemporalesStock.findIndex(item => item.id === selectedItem.id);
    if (index > -1) {
      const nuevaCant = materialesTemporalesStock[index].cantidad + qty;
      setMaterialesTemporalesStock(prev => prev.map((item, idx) => 
        idx === index ? { ...item, cantidad: nuevaCant } : item
      ));
    } else {
      setMaterialesTemporalesStock(prev => [
        ...prev,
        {
          id: selectedItem.id,
          nombre: selectedItem.nombre,
          sku: selectedItem.sku,
          cantidad: qty,
          unidad: selectedItem.unidad,
          stock: selectedItem.stock,
          precioUnitario: selectedItem.precioUnitario
        }
      ]);
    }

    // Resetear selección
    setSelectedItem(null);
    setQty(1);
    setMaterialSearch('');
  }

  // Quitar item del Borrador (Tab 2)
  function handleRemoveFromDraft(itemId) {
    setMaterialesTemporalesStock(prev => prev.filter(item => item.id !== itemId));
  }

  // Guardar Consumo de Bodega completo (Tab 2)
  async function handleConfirmarConsumo() {
    if (materialesTemporalesStock.length === 0) return;

    showModal(
      'Registrar Materiales para Instalación',
      `¿Estás seguro de que deseas registrar estos ${materialesTemporalesStock.length} materiales para esta instalación?`,
      'confirm',
      async () => {
        try {
          // 1. Mapear y añadir al proyecto
          const nuevosMaterialesMapeados = materialesTemporalesStock.map(item => ({
            nombre: item.nombre,
            sku: item.sku,
            cantidad: item.cantidad,
            unidad: item.unidad,
            observacion: 'Anotado para la Instalación',
            origen: 'inventario',
            cantidadLlevada: item.cantidad, // por defecto se asume que se lleva todo lo tomado
            responsable: ''
          }));

          const nuevosMateriales = [...materialesExistentes, ...nuevosMaterialesMapeados];

          await updateFaseDatos('INSTALACION', {
            materiales: nuevosMateriales
          });

          // 2. Recargar inventario local y limpiar borrador
          await fetchInventario();
          setMaterialesTemporalesStock([]);

          if (reloadProyectos) {
            reloadProyectos();
          }

          toast.success('Materiales registrados para la instalación con éxito');
        } catch (err) {
          toast.error('No se pudo registrar los materiales: ' + err.message);
        }
      }
    );
  }

  // Guardar Distribución y Carga (Tab 3)
  async function handleGuardarDistribucion() {
    try {
      await updateFaseDatos('INSTALACION', {
        materiales: materialesDistribucion
      });
      if (reloadProyectos) {
        reloadProyectos();
      }
      toast.success('Distribución de materiales guardada con éxito');
    } catch (err) {
      toast.error('No se pudo guardar la distribución de materiales: ' + err.message);
    }
  }

  // Modificar distribución local
  const handleLocalCarryChange = (index, field, value) => {
    setMaterialesDistribucion(prev => prev.map((m, idx) => {
      if (idx === index) {
        return {
          ...m,
          [field]: value
        };
      }
      return m;
    }));
  };

  // Iniciar montaje / instalación en sitio
  async function handleIniciarInstalacion() {
    showModal(
      'Iniciar Instalación',
      '¿Estás seguro? Se notificará a la administración que empezó la instalación.',
      'confirm',
      async () => {
        const now = new Date();
        try {
          await updateFaseDatos('INSTALACION', {
            fechaInstalacion: now.toISOString().split('T')[0],
            horaInstalacion: now.toTimeString().slice(0, 5),
            direccionInstalacion: datosInstalacion.direccionInstalacion || proyecto.cliente?.direccion || ''
          });
          
          if (reloadProyectos) {
            reloadProyectos();
          }

          toast.success('Instalación iniciada con éxito y administración notificada');
        } catch (err) {
          toast.error('No se pudo iniciar la instalación: ' + err.message);
        }
      }
    );
  }

  // Finalizar instalación en sitio
  const handleCompletarInstalacion = async () => {
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
        } catch (err) {
          toast.error('No se pudo completar la instalación: ' + err.message);
        }
      }
    );
  };

  // Definición de las pestañas
  const tabs = [
    { id: 'equipo', label: 'Equipo Técnico', Icon: User },
    { id: 'bodega', label: 'Consumo de Bodega', Icon: Package },
    { id: 'distribucion', label: 'Distribución de Carga', Icon: CheckCircle },
    { id: 'compras', label: 'Órdenes de Compra', Icon: ShoppingCart },
    { id: 'cierre', label: 'Cierre de Obra', Icon: Wrench }
  ];

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
              {tab.label}
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
            />

            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={handleGuardarEquipo}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-100 transition-all cursor-pointer"
              >
                <Save size={16} />
                Guardar Equipo de Trabajo
              </button>
            </div>
          </div>
        )}

        {/* --- PESTAÑA 2: CONSUMO DE BODEGA --- */}
        {activeTab === 'bodega' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
            
            {/* Buscador de Stock */}
            <div className="lg:col-span-5">
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
                  <div style={{ position: 'relative' }}>
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
                        max={selectedItem.stock}
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
                      Agregar a la Lista Temporal
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Borrador Temporal */}
            <div className="lg:col-span-7">
              <div className="request-section-card glass-panel min-h-[350px] flex flex-col justify-between">
                <div>
                  <h2 className="request-card-title flex items-center gap-2">
                    <Package size={18} className="text-indigo-600" />
                    Borrador de Consumo (Lista Temporal)
                  </h2>
                  <p className="text-xs text-slate-400 -mt-2">
                    Estos materiales se guardarán y descontarán del inventario central una vez que confirmes con el botón "Guardar Consumo de Bodega".
                  </p>

                  {materialesTemporalesStock.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 italic text-sm">
                      <Package size={36} className="text-slate-300 mb-2" />
                      <span>No has agregado materiales a la lista temporal aún.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto mt-4">
                      <table className="materials-list-table">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th style={{ textAlign: 'center' }}>Cantidad</th>
                            <th style={{ textAlign: 'center' }}>Stock Disponible</th>
                            <th style={{ textAlign: 'center', width: '80px' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materialesTemporalesStock.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{item.nombre}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }} className="font-extrabold text-indigo-600">
                                {item.cantidad} {item.unidad}s
                              </td>
                              <td style={{ textAlign: 'center' }} className="text-slate-500 font-medium">
                                {item.stock} {item.unidad}s
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => handleRemoveFromDraft(item.id)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar de la lista"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {materialesTemporalesStock.length > 0 && (
                  <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleConfirmarConsumo}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-100 transition-all cursor-pointer"
                    >
                      <Save size={16} />
                      Guardar Consumo de Bodega
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- PESTAÑA 3: DISTRIBUCIÓN DE CARGA --- */}
        {activeTab === 'distribucion' && (
          <div className="request-section-card glass-panel animate-slide-up">
            <div>
              <h2 className="request-card-title flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-500" />
                Distribución de Materiales a Llevar
              </h2>
              <p className="text-xs text-slate-400 -mt-2">
                Especifica la cantidad que se llevará de cada material a obra y selecciona el responsable de su traslado. Haz clic en guardar para confirmar en base de datos.
              </p>
            </div>

            {materialesDistribucion.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                Aún no hay materiales registrados en esta instalación. Consume del stock de bodega (Pestaña 2) o solicita compras externas (Pestaña 4).
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="materials-list-table">
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>Material</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Disponible</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>Cant. a Llevar</th>
                        <th style={{ width: '20%' }}>Responsable</th>
                        <th style={{ width: '20%' }}>Observaciones / Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialesDistribucion.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '700' }}>
                            <div className="flex flex-col">
                              <span>{m.nombre}</span>
                              <span className="text-[10px] text-slate-400 font-mono">SKU: {m.sku || 'N/D'}</span>
                              <span className={`origin-badge w-max mt-1 ${m.origen === 'compra' ? 'compra' : 'inventario'}`}>
                                {m.origen === 'compra' ? 'Compra' : 'Stock'}
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }} className="font-bold text-slate-500">
                            {m.cantidad} {m.unidad}s
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max={m.cantidad}
                              className="qty-input-field"
                              style={{ width: '70px', padding: '0.35rem' }}
                              value={m.cantidadLlevada}
                              onChange={(e) => {
                                const val = Math.min(m.cantidad, Math.max(0, parseInt(e.target.value) || 0));
                                handleLocalCarryChange(i, 'cantidadLlevada', val);
                              }}
                            />
                          </td>
                          <td>
                            <select
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                              value={m.responsable || ''}
                              onChange={(e) => handleLocalCarryChange(i, 'responsable', e.target.value)}
                            >
                              <option value="">Seleccionar responsable...</option>
                              {(personalLocal || []).map((p, idx) => (
                                <option key={idx} value={p.nombre}>{p.nombre} ({p.rol})</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                              placeholder="Notas (ej. Caja 1)..."
                              value={m.observacion || ''}
                              onChange={(e) => handleLocalCarryChange(i, 'observacion', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleGuardarDistribucion}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-100 transition-all cursor-pointer"
                  >
                    <Save size={16} />
                    Guardar Distribución y Carga
                  </button>
                </div>
              </>
            )}
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
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm mt-2">
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
                          <td className="p-3 font-bold text-slate-800">
                            {oc.numero || oc.id}
                          </td>
                          <td className="p-3 text-slate-500">
                            {oc.fechaCreacion || oc.fecha}
                          </td>
                          <td className="p-3">
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
                          <td className="p-3 text-slate-400 italic">
                            {oc.comentarios || '—'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`oc-history-badge ${statusClass}`}>
                              {oc.estado}
                            </span>
                          </td>
                          <td className="p-3 text-right">
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
    </div>
  );
}
