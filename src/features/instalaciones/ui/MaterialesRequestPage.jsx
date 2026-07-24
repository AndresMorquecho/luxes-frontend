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
import {
  ComprasPageHeader,
  ComprasHeaderGhostButton,
} from '../../compras/ui/components/ComprasPageHeader';
import './MaterialesRequestPage.css';


export function MaterialesRequestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adapter, dispatch } = useProyectosContext();
  const { proyecto, updateFaseDatos } = useProyecto(id);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
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
  const materialesExistentes = datosInstalacion.materiales || [];
  const esSoloLectura = datosInstalacion.instalacionCompletada === true;
  const instalacionIniciada = isInstalacionIniciada(datosInstalacion);
  const mostrarContenidoCierre = puedeAccederCierreObra(datosInstalacion);
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
  const [activeTab, setActiveTab] = useState('equipo'); // 'equipo' | 'bodega' | 'distribucion' | 'compras' | 'cierre'

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
    if (activeTab === 'compras') {
      cargarOrdenesProyecto();
    }
  }, [activeTab, cargarOrdenesProyecto]);

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

  // Estados locales para edición y guardado explícito
  const [personalLocal, setPersonalLocal] = useState([]);
  const [materialesLocales, setMaterialesLocales] = useState([]);

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
      setActiveTab('bodega');
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
  function handleRemoveFromDraft(itemIdentifier) {
    setMaterialesLocales(prev => prev.filter(item => item.sku !== itemIdentifier && item.nombre !== itemIdentifier));
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
    const hasMaterials = materialesConStock && materialesConStock.length > 0;

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

    if (!validarResponsablesHerramientas()) return;

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
            materiales: materialesConStock
          });

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
          if (puedeEnviarEncuesta) {
            setProyectoParaEncuesta(snapshot);
            toast.success('¡Instalación completada! Envía la encuesta al cliente.');
            window.setTimeout(() => setIsSurveyModalOpen(true), 200);
          } else {
            toast.success('¡Instalación completada en sitio!');
          }
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

  const herramientasSinResponsable = getHerramientasSinResponsable(materialesConStock);
  const bloqueoPorHerramientas = herramientasSinResponsable.length > 0;

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
        <div
          className="space-y-3 sm:space-y-5 animate-slide-up pb-10 flex flex-col items-center justify-center py-20"
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <p className="text-sm text-slate-500">Proyecto no encontrado</p>
          <button
            type="button"
            onClick={() => navigate('/instalaciones')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Volver a Instalaciones
          </button>
        </div>
      </>
    );
  }

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
    const invItem = inventarioDb.find(item => item.nombre === m.nombre || (m.sku && item.sku === m.sku));
    return {
      ...m,
      stock: invItem ? invItem.stock : 0,
      tipo: invItem ? invItem.tipo : (m.tipo || 'consumible'),
      descargaStock: invItem ? invItem.descargaStock : (m.descargaStock ?? true),
    };
  });

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .hero-details-container.collapsed { display: none; }
        @media (min-width: 1024px) {
          .hero-details-container.collapsed { display: block; }
        }
        .hero-details-container.expanded { display: block; }
      `}</style>

      <ComprasPageHeader
        icon={Wrench}
        badge="Operaciones"
        title="Gestión de instalación"
        subtitle="Personal, materiales, compras y cierre de obra"
        action={(
          <ComprasHeaderGhostButton onClick={() => navigate('/instalaciones')} className="print:hidden">
            <ArrowLeft size={15} />
            Volver
          </ComprasHeaderGhostButton>
        )}
      />

      {/* Hero Banner */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center print:hidden">
        <div className="flex-1 space-y-3 min-w-0 w-full">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                <Package size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-800 truncate">{proyecto.nombre}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cliente: <strong className="text-slate-600 font-semibold">{proyecto.cliente.empresa}</strong>
                  {' · '}{proyecto.cliente.nombre}
                </p>
              </div>
              {datosInstalacion.instalacionCompletada ? (
                <span className="inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 bg-emerald-50 text-emerald-700">Completada</span>
              ) : datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion ? (
                <span className="inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 bg-orange-50 text-orange-700">En Montaje</span>
              ) : (
                <span className="inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600">En Cola</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="lg:hidden px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              {isDetailsExpanded ? 'Ocultar detalles ▲' : 'Ver detalles ▼'}
            </button>
          </div>

          <div className={`hero-details-container ${isDetailsExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-400 uppercase text-[9px] tracking-wider">Dirección</p>
                  <p className="font-medium mt-0.5 text-slate-700">{datosInstalacion.direccionInstalacion || proyecto.cliente.direccion || 'Sin dirección registrada'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-600">
                <Calendar size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-400 uppercase text-[9px] tracking-wider">
                    {datosInstalacion.instalacionCompletada ? 'Cierre en obra' : 'Programación'}
                  </p>
                  <p className="font-medium mt-0.5 text-slate-700">
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
              <div className="flex items-start gap-2 text-slate-600">
                <Wrench size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-400 uppercase text-[9px] tracking-wider">Equipo técnico</p>
                  {datosInstalacion.personalAsignado && datosInstalacion.personalAsignado.length > 0 ? (
                    <div className="flex gap-1 mt-1">
                      {datosInstalacion.personalAsignado.map((p, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[9px]"
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

            {datosInstalacion.notasInstalacion && (
              <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 flex gap-2 items-start mt-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <span><strong>Instrucciones especiales:</strong> {datosInstalacion.notasInstalacion}</span>
              </div>
            )}
          </div>
        </div>
        {!datosInstalacion.instalacionCompletada && !instalacionIniciada && (
          <button
            type="button"
            onClick={handleIniciarInstalacion}
            disabled={bloqueoPorHerramientas}
            title={
              bloqueoPorHerramientas
                ? 'Asigna un responsable a cada herramienta en Materiales de Bodega'
                : undefined
            }
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 ${
              bloqueoPorHerramientas
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            <Play size={16} fill="currentColor" />
            Iniciar instalación
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-2 print:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'bg-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              {isTabSaved(tab.id) && (
                <CheckCircle
                  size={14}
                  className={`shrink-0 ${activeTab === tab.id ? 'text-emerald-300' : 'text-emerald-500'}`}
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
          <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 animate-slide-up">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1">
                <User size={16} className="text-blue-600" />
                Asignación del equipo técnico
              </h2>
              <p className="text-xs text-slate-400 mb-4">
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
                  type="button"
                  onClick={handleGuardarEquipo}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Save size={16} />
                  Guardar equipo de trabajo
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
                <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 h-full">
                  <div>
                    <h2 className="request-card-title flex items-center gap-2">
                      <Search size={18} className="text-blue-600" />
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
                                {inventarioDb.some((item) =>
                                  !esItemSeleccionable(item) && (
                                    item.nombre.toLowerCase().includes(materialSearch.toLowerCase())
                                    || item.sku.toLowerCase().includes(materialSearch.toLowerCase())
                                  ),
                                ) ? (
                                  <>
                                    Las herramientas que coinciden ya están prestadas o en uso y no se pueden volver a seleccionar.
                                  </>
                                ) : (
                                  <>
                                    Sin resultados en inventario. ¿No hay stock?{' '}
                                    <button
                                      type="button"
                                      onClick={() => setActiveTab('compras')}
                                      className="text-blue-600 font-bold hover:underline"
                                    >
                                      Generar Orden de Compra
                                    </button>
                                  </>
                                )}
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
                      <div className="selected-item-display flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{selectedItem.nombre}</span>
                          <span className="text-xs text-slate-500">Stock: {selectedItem.stock} {selectedItem.unidad}s</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(null);
                            setQty(1);
                            setMaterialSearch('');
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar selección"
                        >
                          <X size={16} />
                        </button>
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
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
              <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 min-h-[350px] flex flex-col justify-between">
                <div>
                  <h2 className="request-card-title flex items-center gap-2">
                    <Package size={18} className="text-blue-600" />
                    Materiales y Herramientas Asignados
                  </h2>
                  <p className="text-xs text-slate-400 -mt-2">
                    Anota los materiales y herramientas que se llevarán a la obra. Asigna responsable solo para las herramientas no consumibles.
                  </p>

                  {bloqueoPorHerramientas && !esSoloLectura && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>
                        {personalLocal.length === 0
                          ? 'Hay herramientas sin responsable. Primero asigna el equipo en la pestaña "Equipo de Trabajo".'
                          : `Falta asignar responsable en: ${herramientasSinResponsable.map((m) => m.nombre).join(', ')}.`}
                      </span>
                    </div>
                  )}

                  {materialesConStock.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 italic text-sm">
                      <Package size={36} className="text-slate-300 mb-2" />
                      <span>No has asignado materiales aún. Búscar e agregar en el panel izquierdo.</span>
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-[420px] mt-4 pr-1 mobile-table-cards">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Material / Herramienta</th>
                            <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                            <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cantidad</th>
                            <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Responsable</th>
                            <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notas</th>
                            {!esSoloLectura && (
                              <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {materialesConStock.map((m, i) => (
                            <tr key={`${m.sku}-${m.nombre}`} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-5 py-4" data-label="Material">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800 text-sm">{m.nombre}</span>
                                  <span className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {m.sku}</span>
                                  <span className={`inline-flex items-center rounded-full text-[10px] font-medium px-2 py-0.5 w-max mt-1 ${m.origen === 'compra' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {m.origen === 'compra' ? 'Compra' : 'Stock'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-slate-500 font-medium text-sm" data-label="Stock">
                                {m.stock} {m.unidad}s
                              </td>
                              <td className="px-5 py-4" data-label="Cantidad">
                                {esSoloLectura ? (
                                  <span className="font-semibold text-slate-700">{m.cantidad} {m.unidad}s</span>
                                ) : (
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-gray-50 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    value={m.cantidad}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      handleLocalMaterialChange(i, 'cantidad', val);
                                    }}
                                  />
                                )}
                              </td>
                              <td className="px-5 py-4" data-label="Responsable">
                                {esSoloLectura ? (
                                  <span className="text-slate-700 font-medium text-sm">{m.responsable || 'Sin asignar'}</span>
                                ) : (
                                  m.tipo === 'herramienta' ? (
                                    <select
                                      className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 bg-white ${
                                        !(m.responsable || '').trim()
                                          ? 'border-red-300 ring-1 ring-red-200 focus:ring-red-400'
                                          : 'border-slate-200 focus:ring-blue-400'
                                      }`}
                                      value={m.responsable || ''}
                                      onChange={(e) => handleLocalMaterialChange(i, 'responsable', e.target.value)}
                                    >
                                      <option value="">
                                        {personalLocal.length === 0 ? 'Sin equipo asignado' : 'Seleccionar...'}
                                      </option>
                                      {(personalLocal || []).map((p, idx) => (
                                        <option key={idx} value={p.nombre}>{p.nombre}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Consumible</span>
                                  )
                                )}
                              </td>
                              <td className="px-5 py-4" data-label="Notas">
                                {esSoloLectura ? (
                                  <span className="text-slate-600 italic text-sm">{m.observacion || 'Sin notas'}</span>
                                ) : (
                                  <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-gray-50"
                                    placeholder="Notas..."
                                    value={m.observacion || ''}
                                    onChange={(e) => handleLocalMaterialChange(i, 'observacion', e.target.value)}
                                  />
                                )}
                              </td>
                              {!esSoloLectura && (
                                <td className="px-5 py-4 text-right" data-label="Acción">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromDraft(m.sku || m.nombre)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                                    title="Eliminar material"
                                  >
                                    <Trash2 size={16} strokeWidth={1.5} />
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
                      disabled={bloqueoPorHerramientas}
                      title={
                        bloqueoPorHerramientas
                          ? 'Asigna un responsable a cada herramienta antes de guardar'
                          : undefined
                      }
                      className={`px-6 py-2.5 font-bold text-sm rounded-xl flex items-center gap-2 transition-all ${
                        bloqueoPorHerramientas
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-100 cursor-pointer'
                      }`}
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
          <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 animate-slide-up">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1">
                  <ShoppingCart size={16} className="text-blue-600" />
                  Historial de solicitudes de compra
                </h2>
                <p className="text-xs text-slate-400">
                  Solo se muestran las órdenes vinculadas a este proyecto ({proyecto.id}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/compras/nueva?proyectoId=${proyecto.id}`)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} />
                Solicitar compra
              </button>
            </div>

            {ordenesProyecto.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Ninguna solicitud de compra registrada aún para este proyecto.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 mt-3 mobile-table-cards">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nº Orden</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Detalle</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Obs. admin</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                      <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ordenesProyecto.map((oc) => {
                      const statusClass = oc.estado.toLowerCase();
                      return (
                        <tr key={oc.id} className="hover:bg-slate-50/70 transition-colors text-slate-700">
                          <td className="px-5 py-4 font-semibold text-slate-900" data-label="Nº Orden">
                            {oc.numero || oc.id}
                          </td>
                          <td className="px-5 py-4 text-slate-500" data-label="Fecha">
                            {oc.fechaCreacion || oc.fecha}
                          </td>
                          <td className="px-5 py-4" data-label="Detalle">
                            <div className="space-y-1">
                              {(oc.items || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between max-w-xs text-xs">
                                  <span className="text-slate-700">{item.nombre}</span>
                                  <span className="font-semibold text-slate-500 ml-2">
                                    {oc.estado === 'APROBADA' || oc.estado === 'RECIBIDA'
                                      ? `${item.cantidadAprobada} / ${item.cantidadSolicitada} ud.`
                                      : `${item.cantidadSolicitada} ud.`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-400 italic" data-label="Obs. admin">
                            {oc.comentarios || '—'}
                          </td>
                          <td className="px-5 py-4" data-label="Estado">
                            <span className={`oc-history-badge ${statusClass}`}>
                              {oc.estado}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right" data-label="Acciones">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewOC(mapOrdenToPDFFormat(oc));
                                  setIsPDFOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                title="Ver PDF"
                              >
                                <Eye size={16} strokeWidth={1.5} />
                              </button>
                              {oc.estado === 'APROBADA' && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/compras/recepcion/${oc.id}`)}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                  title="Recibir"
                                >
                                  <Package size={16} strokeWidth={1.5} />
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
            
            {mostrarContenidoCierre ? (
              <div className="space-y-6">

                {!instalacionIniciada && !datosInstalacion.instalacionCompletada && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Obra aún no iniciada formalmente</p>
                      <p className="mt-1">
                        Puedes subir evidencias y cerrar la obra aquí. Al subir la primera foto o finalizar el cierre
                        se registrará automáticamente la fecha y hora de inicio en obra.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Evidencia Fotográfica en Cierre */}
                <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
                  <div>
                    <h2 className="request-card-title flex items-center gap-2">
                      <Camera size={18} className="text-blue-600" />
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
                          <UploadCloud size={36} className="text-blue-500 mb-2 animate-bounce" />
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
                <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5">
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
                      ) : encuestaFueEnviada(proyecto) ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                          Encuesta enviada — esperando respuesta del cliente.
                        </div>
                      ) : puedeEnviarEncuesta ? (
                        <div className="space-y-3">
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                            Encuesta pendiente de envío al cliente.
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsSurveyModalOpen(true)}
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                          >
                            <Star size={16} className="fill-current" />
                            Enviar encuesta de calificación
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                          Encuesta pendiente — la enviará el equipo de Taller.
                        </div>
                      )}
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
                        Marcar Instalación como Completada en Sitio
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 p-6 text-center text-slate-400 italic text-sm">
                Asigna al menos un técnico en &quot;Equipo Técnico&quot; y registra materiales en &quot;Materiales de Bodega&quot;
                antes de cargar evidencias o cerrar la obra en sitio.
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
          <>
            <div
              className="fixed inset-0 z-[1000] bg-slate-200/60 backdrop-blur-md"
              onClick={closeModal}
            />
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden pointer-events-auto">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      modalConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      modalConfig.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {modalConfig.type === 'success' && <CheckCircle size={18} strokeWidth={2.5} />}
                      {modalConfig.type === 'error' && <AlertTriangle size={18} strokeWidth={2.5} />}
                      {modalConfig.type === 'confirm' && <HelpCircle size={18} strokeWidth={2.5} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">{modalConfig.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="px-5 py-4">
                  <p className="text-slate-600 text-sm leading-relaxed">{modalConfig.message}</p>
                  <div className="flex gap-2 justify-end mt-5">
                    {modalConfig.type === 'confirm' && (
                      <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const confirm = modalConfig.onConfirm;
                        closeModal();
                        if (confirm) deferClose(async () => { await confirm(); });
                      }}
                      className="inline-flex items-center justify-center px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
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
    </div>
  );
}
