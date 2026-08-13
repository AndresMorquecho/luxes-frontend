// src/features/instalaciones/ui/MaterialesRequestPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProyectosContext } from '../../proyectos/application/context/ProyectosContext.jsx';
import { ACTIONS } from '../../proyectos/application/store/proyectosStore.js';
import { 
  ArrowLeft, Search, Plus, Trash2, MapPin, 
  Package, ShoppingCart, Clock, CheckCircle, AlertTriangle,
  Wrench, User, Calendar, HelpCircle, Eye, Play, Save, Camera, UploadCloud, X, Star
} from 'lucide-react';
import { PDFPreviewModal } from '../../../shared/ui/components/PDFPreviewModal.jsx';
import { useProyecto } from '../../proyectos/application/hooks/useProyecto.js';
import { getMateriales, getPrestamos, registrarMovimiento, buildMaterialesQuery } from '../../inventario/application/inventarioService.js';
import { getOrdenes } from '../../compras/application/comprasService.js';
import {
  filterOrdenesPorProyecto,
  mapOrdenCompraParaInstalacion,
} from '../../compras/helpers/ordenCompraHelpers.js';
import { PersonalSelector } from '../../proyectos/ui/components/PersonalSelector.jsx';
import { SendSurveyModal } from '../../proyectos/ui/components/SendSurveyModal.jsx';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import { deferClose, ModalPortal } from '../../../shared/ui/components/ModalPortal.jsx';
import {
  isInstalacionIniciada,
  getInstalacionCompletionBlockers,
  canCompletarInstalacion,
  getHerramientasSinResponsable,
  formatFechaCierre,
  puedeAccederCierreObra,
  buildInicioObraSiFalta,
  nowCierreObra,
  resolveFechaHoraFin,
} from '../../proyectos/domain/instalacionRules.js';
import { getEncuestaSatisfaccion, encuestaFueEnviada } from '../../proyectos/domain/encuestaUtils.js';
import { EncuestaResultadosView } from '../../proyectos/ui/components/EncuestaResultadosView.jsx';
import { isTallerUser, filterEmpleadosParaInstalacion } from '../../../shared/utils/userRoleHelpers.js';
import { uploadEvidenciaInstalacion } from '../../proyectos/application/proyectosService.js';
import { CameraCaptureModal } from './components/CameraCaptureModal.jsx';
import { ProjectMediaImage } from '../../../shared/ui/components/ProjectMediaImage.jsx';
import { resolveEvidenciaSrc } from '../../../shared/utils/mediaUrl.js';
import './MaterialesRequestPage.css';


export function MaterialesRequestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adapter, dispatch } = useProyectosContext();
  const { proyecto, updateFaseDatos } = useProyecto(id);
  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const puedeEnviarEncuesta = isTallerUser(user);

  const faseInstalacionMeta = proyecto?.fases?.INSTALACION || {};
  const faseInstalacion = faseInstalacionMeta.datos || {};
  const instalacionRow = proyecto?.instalacion || {};
  const datosInstalacionBase = {
    ...instalacionRow,
    ...faseInstalacion,
    personalAsignado: faseInstalacion.personalAsignado?.length
      ? faseInstalacion.personalAsignado
      : instalacionRow.personalAsignado,
    materiales: faseInstalacion.materiales?.length
      ? faseInstalacion.materiales
      : instalacionRow.materiales,
    evidencias: faseInstalacion.evidencias ?? instalacionRow.evidencias,
    instalacionCompletada:
      faseInstalacion.instalacionCompletada === true || instalacionRow.instalacionCompletada === true,
  };
  const { fechaFin: fechaFinResuelta, horaFin: horaFinResuelta } = resolveFechaHoraFin(
    datosInstalacionBase,
    faseInstalacionMeta,
  );
  const datosInstalacion = {
    ...datosInstalacionBase,
    fechaFin: fechaFinResuelta || datosInstalacionBase.fechaFin,
    horaFin: horaFinResuelta || datosInstalacionBase.horaFin,
  };
  const [personalLocal, setPersonalLocal] = useState([]);
  const [materialesLocales, setMaterialesLocales] = useState([]);

  const materialesExistentes = datosInstalacion.materiales || [];
  const esSoloLectura = datosInstalacion.instalacionCompletada === true;
  const instalacionIniciada = isInstalacionIniciada(datosInstalacion);
  const mostrarContenidoCierre = puedeAccederCierreObra({
    ...datosInstalacion,
    personalAsignado: personalLocal.length ? personalLocal : datosInstalacion.personalAsignado,
  });
  const encuestaCliente = getEncuestaSatisfaccion(proyecto);

  // Cargar proyecto completo al entrar (evidencias y cierre viven en fases.INSTALACION.datos)
  useEffect(() => {
    if (!id || !adapter?.getById) return;
    adapter
      .getById(id)
      .then((proyectoFresh) => {
        if (proyectoFresh) {
          dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios: proyectoFresh } });
        }
      })
      .catch((err) => console.error('Error al cargar proyecto:', err));
  }, [id, adapter, dispatch]);

  const [ordenesCompraProyecto, setOrdenesCompraProyecto] = useState([]);
  const [activeTab, setActiveTab] = useState('equipo'); // 'equipo' | 'bodega' | 'cierre'
  const [isComprasModalOpen, setIsComprasModalOpen] = useState(false);

  const cargarOrdenesProyecto = useCallback(async () => {
    if (!id) {
      setOrdenesCompraProyecto([]);
      return;
    }
    try {
      const queryParams = { proyectoId: id, limit: 100 };
      if (isTallerUser(user)) {
        queryParams.creadorRol = 'taller';
      }
      const data = await getOrdenes(queryParams);
      const items = (data?.items || []).map(mapOrdenCompraParaInstalacion).filter(Boolean);
      setOrdenesCompraProyecto(items);
    } catch (err) {
      console.error('Error al cargar órdenes del proyecto:', err);
      const fallback = filterOrdenesPorProyecto(proyecto?.ordenesCompra || [], id)
        .map(mapOrdenCompraParaInstalacion)
        .filter(Boolean);
      setOrdenesCompraProyecto(fallback);
    }
  }, [id, proyecto?.ordenesCompra, user]);

  useEffect(() => {
    cargarOrdenesProyecto();
  }, [cargarOrdenesProyecto]);

  useEffect(() => {
    if (activeTab === 'compras' || isComprasModalOpen) {
      cargarOrdenesProyecto();
    }
  }, [activeTab, isComprasModalOpen, cargarOrdenesProyecto]);

  const ordenesProyectoRaw = filterOrdenesPorProyecto(
    ordenesCompraProyecto.length > 0
      ? ordenesCompraProyecto
      : (proyecto?.ordenesCompra || []).map(mapOrdenCompraParaInstalacion).filter(Boolean),
    id,
  );

  const ordenesProyecto = useMemo(() => {
    if (isTallerUser(user)) {
      return ordenesProyectoRaw.filter(oc => {
        const creatorRol = oc.usuario?.rol?.toLowerCase() || '';
        return creatorRol === 'taller';
      });
    }
    return ordenesProyectoRaw;
  }, [ordenesProyectoRaw, user]);
  const bloqueosCierre = getInstalacionCompletionBlockers(datosInstalacion, {
    ordenesCompra: ordenesProyecto,
  });
  const puedeCompletar = canCompletarInstalacion(datosInstalacion, {
    ordenesCompra: ordenesProyecto,
  });

  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  // Estados de control de inventario local
  const [inventarioDb, setInventarioDb] = useState([]);
  const [prestamosActivos, setPrestamosActivos] = useState([]);
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
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [proyectoParaEncuesta, setProyectoParaEncuesta] = useState(null);
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
      const [data, prestamosData] = await Promise.all([
        getMateriales(buildMaterialesQuery({ categoria: 'Taller' })),
        getPrestamos({ estado: 'prestado', page: 1, limit: 500 }),
      ]);
      const prestamosItems = Array.isArray(prestamosData) ? prestamosData : (prestamosData.items || []);
      setPrestamosActivos(prestamosItems);

      const items = Array.isArray(data) ? data : (data.items || []);
      const mapped = items
        .filter(item => item.categoria === 'Taller')
        .map(item => ({
          id: item.id,
          nombre: item.nombre,
          sku: item.codigo || 'SIN-CODIGO',
          stock: item.stockActual || 0,
          estadoUso: item.estadoUso || 'BODEGA',
          precioUnitario: item.costoPromedioPonderado !== undefined ? item.costoPromedioPonderado : (item.precioCosto || 0),
          unidad: item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unidad',
          categoria: item.categoria || 'Taller',
          tipo: item.subtipo === 'herramienta' || item.esPrestable
            ? 'herramienta'
            : (item.tipo || 'consumible'),
          descargaStock: item.descargaStock !== undefined ? item.descargaStock : true,
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
    deferClose(() => setModalConfig(prev => ({ ...prev, isOpen: false })));
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

  const empleadosParaInstalacion = useMemo(
    () => filterEmpleadosParaInstalacion(empleados, user),
    [empleados, user],
  );

  const materialIdsPrestados = useMemo(
    () => new Set(prestamosActivos.map((p) => p.materialId).filter(Boolean)),
    [prestamosActivos],
  );

  const esItemSeleccionable = useCallback((item) => {
    // Si descarga stock (consumible normal), requiere stock > 0
    if ((item.descargaStock ?? true) && (item.stock ?? 0) <= 0) {
      return false;
    }
    // Si es herramienta, debe estar en bodega y no estar prestada
    if (item.tipo === 'herramienta') {
      const estado = String(item.estadoUso || 'BODEGA').toUpperCase();
      if (estado !== 'BODEGA') return false;
      if (materialIdsPrestados.has(item.id)) return false;
    }
    return true;
  }, [materialIdsPrestados]);

  // Filtrar artículos en inventario (limitado a los primeros 6 para mejorar UX y rendimiento)
  const matchedInventory = inventarioDb.filter(item =>
    esItemSeleccionable(item) && (
      item.nombre.toLowerCase().includes(materialSearch.toLowerCase())
      || item.sku.toLowerCase().includes(materialSearch.toLowerCase())
    ),
  ).slice(0, 6);

  // --- Manejadores de Guardado Explícito ---

  // Guardar Equipo Técnico (Tab 1)
  async function handleGuardarEquipo() {
    try {
      await updateFaseDatos('INSTALACION', {
        personalAsignado: personalLocal
      });
      toast.success('Equipo de trabajo guardado con éxito');
      setActiveTab('cierre');
    } catch (err) {
      toast.error('No se pudo guardar el equipo de trabajo: ' + err.message);
    }
  }

  // Agregar item al Borrador de Consumo (Tab 2)
  function handleAddToDraft() {
    if (!selectedItem || qty <= 0) return;
    if (!esItemSeleccionable(selectedItem)) {
      toast.error('Esta herramienta ya está prestada o en uso; no puede agregarse de nuevo.');
      return;
    }

    const index = materialesLocales.findIndex(item => item.nombre === selectedItem.nombre);
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
  function handleRemoveFromDraft(index) {
    setMaterialesLocales(prev => prev.filter((_, i) => i !== index));
  }

  // Guardar Consumo de Bodega completo (Tab 2)
  async function handleConfirmarConsumo() {
    if (!validarResponsablesHerramientas()) return;

    showModal(
      'Registrar Materiales para Instalación',
      `¿Estás seguro de que deseas registrar y guardar estos ${materialesConStock.length} materiales para esta instalación?`,
      'confirm',
      async () => {
        try {
          await updateFaseDatos('INSTALACION', {
            materiales: materialesConStock
          });

          // Recargar inventario local
          await fetchInventario();

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

    if (!hasTeam) {
      toast.error('No se puede iniciar la instalación: debes asignar al menos un miembro al Equipo de trabajo.');
      return;
    }

    showModal(
      'Iniciar Instalación',
      '¿Estás seguro de que deseas iniciar la instalación en sitio? Se registrará la fecha y hora de arranque.',
      'confirm',
      async () => {
        const now = new Date();
        try {
          await updateFaseDatos('INSTALACION', {
            fechaInstalacion: now.toISOString().split('T')[0],
            horaInstalacion: now.toTimeString().slice(0, 5),
            direccionInstalacion: datosInstalacion.direccionInstalacion || proyecto.cliente?.direccion || '',
            personalAsignado: personalLocal,
          });

          toast.success('¡Instalación iniciada en sitio!');
          setActiveTab('cierre');
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

  const handleOpenCamera = () => {
    if (esSoloLectura) return;
    if (!mostrarContenidoCierre) {
      toast.error('Asigna equipo y materiales antes de subir evidencias.');
      return;
    }
    setIsCameraOpen(true);
  };

  const handleUploadEvidencias = async (files) => {
    if (esSoloLectura) return;
    if (!mostrarContenidoCierre) {
      toast.error('Asigna equipo y materiales antes de subir evidencias.');
      return;
    }
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    toast.info('Subiendo evidencias...');
    try {
      let ultimoProyecto = null;
      for (const file of fileList) {
        let fileToUpload = file;
        if (file.type?.startsWith('image/')) {
          try {
            const compressed = await compressAndConvertImage(file);
            if (compressed.startsWith('data:')) {
              const res = await fetch(compressed);
              const blob = await res.blob();
              fileToUpload = new File([blob], file.name.replace(/\.\w+$/, '.jpg') || 'evidencia.jpg', {
                type: 'image/jpeg',
              });
            }
          } catch {
            fileToUpload = file;
          }
        }
        const result = await uploadEvidenciaInstalacion(id, fileToUpload);
        if (result?.proyecto) {
          ultimoProyecto = result.proyecto;
        }
      }

      if (ultimoProyecto) {
        dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios: ultimoProyecto } });
      } else if (!instalacionIniciada) {
        const now = new Date();
        await updateFaseDatos('INSTALACION', {
          ...buildInicioObraSiFalta(datosInstalacion, now),
          personalAsignado: personalLocal.length ? personalLocal : datosInstalacion.personalAsignado,
          materiales: materialesConStock.length ? materialesConStock : datosInstalacion.materiales,
        });
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

          toast.success('Evidencia eliminada con éxito');
        } catch (err) {
          toast.error('No se pudo eliminar la evidencia: ' + err.message);
        }
      }
    );
  };

  // Finalizar instalación en sitio
  const handleCompletarInstalacion = async () => {
    if (!puedeCompletar) {
      toast.error(bloqueosCierre[0] || 'Aún no se cumplen los requisitos para finalizar la instalación.');
      return;
    }

    showModal(
      'Confirmar Finalización',
      '¿Estás seguro de que deseas marcar la instalación como completada en sitio? Esto notificará a la administración.',
      'confirm',
      async () => {
        const now = new Date();
        const { fechaFin, horaFin } = nowCierreObra(now);
        const snapshot = {
          ...proyecto,
          fases: {
            ...proyecto.fases,
            INSTALACION: {
              ...(proyecto.fases?.INSTALACION || {}),
              datos: {
                ...(proyecto.fases?.INSTALACION?.datos || {}),
                instalacionCompletada: true,
                notasCierre: observacionesCierre,
                fechaFin,
                horaFin,
              },
            },
          },
        };
        try {
          await updateFaseDatos('INSTALACION', {
            ...buildInicioObraSiFalta(datosInstalacion, now),
            personalAsignado: personalLocal.length ? personalLocal : datosInstalacion.personalAsignado,
            materiales: materialesConStock.length ? materialesConStock : datosInstalacion.materiales,
            instalacionCompletada: true,
            notasCierre: observacionesCierre,
            fechaFin,
            horaFin,
          });
          setActiveTab('cierre');
          toast.success('¡Instalación completada en sitio! Notificado a Administración y Ventas.');
        } catch (err) {
          toast.error('No se pudo completar la instalación: ' + err.message);
        }
      }
    );
  };

  const handleCerrarEncuesta = () => {
    setIsSurveyModalOpen(false);
    setProyectoParaEncuesta(null);
    deferClose(() => {
      setActiveTab('cierre');
    });
  };

  const marcarEncuestaEnviada = async () => {
    await updateFaseDatos('INSTALACION', {
      encuestaEnviada: true,
      fechaEncuestaEnviada: new Date().toISOString().split('T')[0],
    });
  };

  const proyectoEncuesta = proyectoParaEncuesta || proyecto;

  function validarResponsablesHerramientas() {
    if (!bloqueoPorHerramientas) return true;
    const nombres = herramientasSinResponsable.map((m) => m.nombre).join(', ');
    if (!personalLocal?.length) {
      toast.error(
        `Asigna primero el equipo en la pestaña "Equipo de Trabajo" y luego un responsable para cada herramienta: ${nombres}`,
      );
    } else {
      toast.error(`Debes asignar un responsable a cada herramienta antes de continuar: ${nombres}`);
    }
    return false;
  }

  const surveyModalEl = puedeEnviarEncuesta ? (
    <SendSurveyModal
      isOpen={isSurveyModalOpen && !!proyectoEncuesta}
      onClose={handleCerrarEncuesta}
      proyecto={proyectoEncuesta}
      variant="instalacion"
      onSend={marcarEncuestaEnviada}
      onConfirm={handleCerrarEncuesta}
    />
  ) : null;

  if (!proyecto) {
    return (
      <>
        {surveyModalEl}
        <div className="request-page-container flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-slate-500">Proyecto no encontrado</p>
          <button onClick={() => navigate('/instalaciones')} className="text-blue-600 underline">
            Volver a Instalaciones
          </button>
        </div>
      </>
    );
  }

  // Definición de las pestañas principales (Compras es una acción opcional en la cabecera)
  const tabs = [
    { id: 'equipo', label: '1. Equipo Técnico', shortLabel: 'Equipo', Icon: User },
    { id: 'cierre', label: '2. Cierre y Evidencias', shortLabel: 'Cierre y Fotos', Icon: Wrench }
  ];

  const isTabSaved = (tabId) => {
    if (tabId === 'equipo') {
      return datosInstalacion.personalAsignado && datosInstalacion.personalAsignado.length > 0;
    }
    if (tabId === 'cierre') {
      return !!datosInstalacion.instalacionCompletada;
    }
    return false;
  };

  const materialesConStock = (materialesLocales || []).map(m => {
    const invItem = inventarioDb.find(item => item.nombre === m.nombre || (m.sku && m.sku !== 'SIN-CODIGO' && item.sku === m.sku));
    // Determine tipo: prefer live DB data, then trust the stored tipo, finally default
    const resolvedTipo = invItem
      ? (invItem.tipo === 'herramienta' || invItem.esPrestable ? 'herramienta' : invItem.tipo)
      : (m.tipo && m.tipo !== 'consumible' ? m.tipo : (m.tipo || 'consumible'));
    return {
      ...m,
      stock: invItem ? invItem.stock : (m.stock ?? 0),
      tipo: resolvedTipo,
      descargaStock: invItem ? invItem.descargaStock : (m.descargaStock ?? true),
    };
  });

  const bloqueoPorHerramientas = false;

  return (
    <div className="request-page-container">
      {/* Botón de Retorno */}
      <button onClick={() => navigate('/instalaciones')} className="request-back-btn print:hidden">
        <ArrowLeft size={16} />
        Volver a Panel de Instalaciones
      </button>

      {/* Título de la página */}
      <div className="inventario-header-box print:hidden">
        <h1 className="inventario-title">Gestión de Instalación</h1>
        <p className="inventario-subtitle">
          Control del montaje, asignación de equipo técnico, carga de evidencias fotográficas y registro del cierre de obra.
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
                ) : datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion ? (
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

              {/* Fecha Programada / Cierre */}
              <div className="flex items-start gap-2 text-slate-600">
                <Calendar size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">
                    {datosInstalacion.instalacionCompletada ? 'Cierre en obra' : 'Programación'}
                  </p>
                  <p className="font-medium mt-0.5">
                    {datosInstalacion.instalacionCompletada ? (
                      formatFechaCierre(
                        datosInstalacion.fechaFin,
                        datosInstalacion.horaFin,
                        faseInstalacionMeta,
                      ) || 'Completada'
                    ) : datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion ? (
                      `${datosInstalacion.fechaInstalacion} a las ${datosInstalacion.horaInstalacion}`
                    ) : (
                      'Pendiente de arranque en obra'
                    )}
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
        <div className="grid grid-cols-2 gap-3 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsComprasModalOpen(true)}
            className="w-full py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-100 transition-all cursor-pointer text-center"
            title="Solicitar o ver compras vinculadas al proyecto (Opcional)"
          >
            <ShoppingCart size={16} className="shrink-0" />
            <span className="truncate">Solicitar Compra</span>
            {ordenesProyecto.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-700/60 rounded-full text-white shrink-0">
                {ordenesProyecto.length}
              </span>
            )}
          </button>

          {!datosInstalacion.instalacionCompletada && (
            !instalacionIniciada ? (
              <button
                onClick={handleIniciarInstalacion}
                className="w-full py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 transition-all cursor-pointer text-center"
              >
                <Play size={16} fill="currentColor" className="shrink-0" />
                <span className="truncate">Iniciar Instalación</span>
              </button>
            ) : (
              <button
                onClick={handleCompletarInstalacion}
                disabled={!puedeCompletar}
                className="w-full py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-center"
              >
                <CheckCircle size={16} className="shrink-0" />
                <span className="truncate">Finalizar Instalación</span>
              </button>
            )
          )}
        </div>
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
                  className="tab-saved-icon" 
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
                {isTallerUser(user)
                  ? 'Selecciona personal del equipo de Taller que realizará la instalación. Guarda los cambios al terminar.'
                  : 'Selecciona al personal que realizará los trabajos de instalación. Asegúrate de hacer clic en el botón de guardar.'}
              </p>
            </div>

            <PersonalSelector
              empleados={empleadosParaInstalacion}
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





        {/* --- PESTAÑA: CIERRE Y FOTOS --- */}
        {activeTab === 'cierre' && (
          <div className="space-y-6 animate-slide-up">
            {!instalacionIniciada && !datosInstalacion.instalacionCompletada ? (
              <div className="request-section-card glass-panel p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Play size={24} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Toca &quot;Iniciar Instalación&quot; arriba</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Al presionar el botón verde de arriba se registrará la hora de arranque en obra y se habilitará la subida de evidencias.
                  </p>
                </div>
              </div>
            ) : mostrarContenidoCierre ? (
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
                      <button
                        type="button"
                        onClick={handleOpenCamera}
                        className="evidencias-dropzone flex-1 border-0 bg-transparent p-0 cursor-pointer"
                      >
                        <span className="dropzone-label cursor-pointer flex flex-col items-center justify-center w-full h-full">
                          <Camera size={36} className="text-emerald-500 mb-2" />
                          <span className="font-bold text-slate-700 text-xs sm:text-sm">Abrir Cámara</span>
                          <span className="text-[10px] text-slate-400 mt-1">Toma una foto directamente</span>
                        </span>
                      </button>
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
                        {datosInstalacion.evidencias.map((evidencia, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setPreviewImage(resolveEvidenciaSrc(evidencia))}
                            className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm aspect-video flex items-center justify-center cursor-pointer"
                          >
                            <ProjectMediaImage
                              evidencia={evidencia}
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
                        <p className="mt-1">
                          Finalizó el{' '}
                          {formatFechaCierre(
                            datosInstalacion.fechaFin,
                            datosInstalacion.horaFin,
                            faseInstalacionMeta,
                          ) || 'recientemente'}
                          .
                        </p>
                        {datosInstalacion.notasCierre ? (
                          <p className="mt-2 pt-2 border-t border-emerald-100 italic">
                            Notas: &quot;{datosInstalacion.notasCierre}&quot;
                          </p>
                        ) : null}
                      </div>

                      {encuestaCliente?.completada ? (
                        <div className="pt-2">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            Calificaciones del cliente
                          </p>
                          <EncuestaResultadosView encuesta={encuestaCliente} />
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                          {encuestaFueEnviada(proyecto)
                            ? 'Encuesta enviada — esperando respuesta del cliente.'
                            : 'Montaje completado — Notificado a Administración y Ventas para el envío de la encuesta.'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500">
                        Una vez completados todos los trabajos de instalación en obra, ingresa las observaciones finales (opcional) y finaliza la instalación.
                      </p>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Notas y Observaciones de Cierre (Opcional)
                        </label>
                        <textarea
                          value={observacionesCierre}
                          onChange={(e) => setObservacionesCierre(e.target.value)}
                          placeholder="Notas o comentarios opcionales..."
                          className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                          rows={3}
                        />
                      </div>

                      {bloqueosCierre.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                          <p className="font-bold mb-1.5 flex items-center gap-1.5">
                            <AlertTriangle size={14} />
                            Requisitos pendientes para finalizar:
                          </p>
                          <ul className="space-y-1 ml-1">
                            {bloqueosCierre.map((msg) => (
                              <li key={msg} className="flex items-start gap-1.5">
                                <span className="text-amber-500 mt-0.5">•</span>
                                <span>{msg}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={handleCompletarInstalacion}
                        disabled={!puedeCompletar}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                      >
                        <CheckCircle size={16} />
                        Finalizar Instalaciones en Sitio
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="request-section-card glass-panel p-6 text-center text-slate-400 italic text-sm">
                Asigna al menos un técnico en la pestaña &quot;Equipo Técnico&quot; antes de cargar evidencias o cerrar la obra en sitio.
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

      {surveyModalEl}

      {/* Modal Dialog de Alertas (Reemplazo de alert nativo) */}
      {modalConfig.isOpen && (
        <ModalPortal>
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
                onClick={async () => {
                  const confirm = modalConfig.onConfirm;
                  closeModal();
                  if (confirm) deferClose(async () => { await confirm(); });
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal Visor de Imagen */}
      {previewImage && (
        <ModalPortal>
        <div 
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => deferClose(() => setPreviewImage(null))}
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
        </ModalPortal>
      )}

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => handleUploadEvidencias([file])}
      />

      {/* Modal Flotante de Órdenes de Compra (Opcionales) */}
      {isComprasModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
              {/* Header del Modal */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Solicitudes de Compra de Obra</h3>
                    <p className="text-xs text-slate-400">
                      Órdenes de compra vinculadas al proyecto <strong className="text-slate-600">{proyecto.nombre}</strong> (Opcional)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComprasModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body del Modal */}
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-3 bg-amber-50/60 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    <span>Las solicitudes de compra son <strong>opcionales</strong> y se utilizan si requieres insumos adicionales para la obra.</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsComprasModalOpen(false);
                      navigate(`/compras/nueva?proyectoId=${proyecto.id}`);
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    Solicitar Nueva Compra
                  </button>
                </div>

                {ordenesProyecto.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic text-xs border border-dashed border-slate-200 rounded-xl">
                    No hay solicitudes de compra registradas aún para este proyecto.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <th className="p-3 font-bold uppercase tracking-wider" style={{ width: '120px' }}>Nº Orden</th>
                          <th className="p-3 font-bold uppercase tracking-wider" style={{ width: '100px' }}>Fecha</th>
                          <th className="p-3 font-bold uppercase tracking-wider">Detalle de Insumos</th>
                          <th className="p-3 font-bold uppercase tracking-wider">Obs. Administración</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-center" style={{ width: '120px' }}>Estado</th>
                          <th className="p-3 font-bold uppercase tracking-wider text-right" style={{ width: '150px' }}>Acciones</th>
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
                                          : `${item.cantidadSolicitada} ud.`}
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
                                    className="px-2 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye size={12} />
                                    PDF
                                  </button>
                                  {oc.estado === 'APROBADA' && (
                                    <button
                                      onClick={() => {
                                        setIsComprasModalOpen(false);
                                        navigate(`/compras/recepcion/${oc.id}`);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
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

              {/* Footer del Modal */}
              <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
                <button
                  onClick={() => setIsComprasModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
