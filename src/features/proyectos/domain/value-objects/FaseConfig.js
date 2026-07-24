// src/features/proyectos/domain/value-objects/FaseConfig.js

/**
 * Configuración canónica de todas las fases del ciclo de vida de un proyecto.
 * Es la única fuente de verdad para colores, orden, iconos y validaciones.
 * No importa nada de fuera del dominio.
 */
export const FASES = [
  {
    id: 'COTIZACION',
    label: 'Cotización',
    color: '#2563eb',
    bgColor: '#eff6ff',
    icon: 'FileText',
    descripcion: 'Propuesta y aprobación del cliente',
    camposRequeridos: ['montoEstimado', 'descripcionTrabajo'],
  },
  {
    id: 'DISEÑO',
    label: 'Diseño',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    icon: 'Pen',
    descripcion: 'Elaboración de artes y aprobación',
    camposRequeridos: ['archivoArte', 'fechaAprobacionDiseno'],
  },
  {
    id: 'PRODUCCION',
    label: 'Producción',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    icon: 'Printer',
    descripcion: 'Impresión y fabricación de materiales',
    camposRequeridos: ['materialesProduccion', 'fechaInicioProduccion'],
  },
  {
    id: 'INSTALACION',
    label: 'Instalación',
    color: '#f97316',
    bgColor: '#fff7ed',
    icon: 'Wrench',
    descripcion: 'Instalación en sitio',
    camposRequeridos: [
      'personalInstalacion',
      'materialesInstalacion',
      'fechaInstalacion',
    ],
    esInstalacion: true,
  },
  {
    id: 'ENTREGA',
    label: 'Entrega',
    color: '#10b981',
    bgColor: '#ecfdf5',
    icon: 'CheckCircle',
    descripcion: 'Entrega formal y firma del cliente',
    camposRequeridos: ['fotoEntrega', 'firmaCliente'],
  },
  {
    id: 'COMPLETADO',
    label: 'Completado',
    color: '#059669',
    bgColor: '#d1fae5',
    icon: 'CheckCircle',
    descripcion: 'Proyecto cerrado',
    camposRequeridos: [],
  },
];

/** Devuelve la config de una fase por su id */
export const getFaseConfig = (faseId) =>
  FASES.find((f) => f.id === faseId) ?? null;

/** Índice de una fase en el flujo */
export const getFaseIndex = (faseId) =>
  FASES.findIndex((f) => f.id === faseId);

/** Siguiente fase en el flujo, o null si es la última */
export const getSiguienteFase = (faseId, requiereInstalacion = true) => {
  const idx = getFaseIndex(faseId);
  if (idx === -1 || idx >= FASES.length - 1) return null;
  const siguiente = FASES[idx + 1];
  if (siguiente.id === 'INSTALACION' && !requiereInstalacion) {
    return getSiguienteFase(siguiente.id, requiereInstalacion);
  }
  if (siguiente.id === 'ENTREGA' && requiereInstalacion) {
    return getSiguienteFase(siguiente.id, requiereInstalacion);
  }
  return siguiente;
};

/** Fase anterior en el flujo, o null si es la primera */
export const getFaseAnterior = (faseId, requiereInstalacion = true) => {
  const idx = getFaseIndex(faseId);
  if (idx <= 0) return null;
  const anterior = FASES[idx - 1];
  if (anterior.id === 'INSTALACION' && !requiereInstalacion) {
    return getFaseAnterior(anterior.id, requiereInstalacion);
  }
  if (anterior.id === 'ENTREGA' && requiereInstalacion) {
    return getFaseAnterior(anterior.id, requiereInstalacion);
  }
  return anterior;
};

/** Progreso porcentual de cada fase */
export const PROGRESO_POR_FASE = {
  COTIZACION: 0,
  DISEÑO: 20,
  PRODUCCION: 40,
  INSTALACION: 70,
  ENTREGA: 90,
  COMPLETADO: 100,
};
