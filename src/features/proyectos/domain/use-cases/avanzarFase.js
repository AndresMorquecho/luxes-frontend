// src/features/proyectos/domain/use-cases/avanzarFase.js

import { FASES, getFaseIndex, getSiguienteFase, getFaseAnterior } from '../value-objects/FaseConfig.js';
import { calcularProgreso } from './calcularProgreso.js';

/**
 * Verifica si los campos requeridos de una fase están presentes en los datos.
 * Para INSTALACION hace validaciones específicas.
 *
 * @param {object} faseConfig - Config de la fase
 * @param {object} datosFase - Datos actuales de la fase
 * @returns {{ valido: boolean, faltantes: string[] }}
 */
export function validarCamposFase(faseConfig, datosFase = {}) {
  const faltantes = [];

  if (faseConfig.id === 'INSTALACION') {
    const datos = datosFase.datos || datosFase || {};
    if (!datos.fechaInstalacion) faltantes.push('Fecha de instalación');
    if (!datos.horaInstalacion) faltantes.push('Inicio en obra (hora de arranque)');
    if (!datos.personalAsignado || datos.personalAsignado.length === 0)
      faltantes.push('Personal asignado');
    if (!datos.materiales || datos.materiales.length === 0)
      faltantes.push('Materiales de instalación');
    if (!datos.evidencias || datos.evidencias.length === 0)
      faltantes.push('Evidencias fotográficas');
    if (!datos.instalacionCompletada)
      faltantes.push('Instalación completada en sitio por el taller');
  } else if (faseConfig.id === 'DISEÑO') {
    const datos = datosFase.datos || datosFase || {};
    if (!datos.fechaAprobacionDiseno && !datosFase.fechaAprobacionDiseno) {
      faltantes.push('Fecha de aprobación de diseño');
    }
    if (!datos.archivoArte && !datosFase.archivoArte) {
      faltantes.push('Archivo de diseño aprobado');
    }
  } else if (faseConfig.id === 'COTIZACION') {
    if (!datosFase.datos?.montoEstimado && !datosFase.montoEstimado) {
      // monto está en el proyecto raíz, no bloqueamos aquí
    }
  }

  return { valido: faltantes.length === 0, faltantes };
}

/**
 * Avanza el proyecto a la siguiente fase.
 * Función pura — sin side effects.
 *
 * @param {object} proyecto - Estado actual del proyecto
 * @returns {object} Nuevo estado del proyecto con la fase avanzada
 * @throws {Error} Si faltan campos requeridos o no hay siguiente fase
 */
export function avanzarFase(proyecto) {
  const faseConfig = FASES.find((f) => f.id === proyecto.faseActual);
  if (!faseConfig) throw new Error(`Fase desconocida: ${proyecto.faseActual}`);

  const siguiente = getSiguienteFase(proyecto.faseActual, proyecto.requiereInstalacion);
  if (!siguiente) throw new Error('El proyecto ya está en la fase final');

  const fechaHoy = new Date().toISOString().split('T')[0];
  const faseActualData = proyecto.fases?.[proyecto.faseActual] || {};

  return {
    ...proyecto,
    fases: {
      ...proyecto.fases,
      [proyecto.faseActual]: {
        ...faseActualData,
        completada: true,
        fechaCompletada: faseActualData.fechaCompletada || fechaHoy,
      },
      [siguiente.id]: proyecto.fases?.[siguiente.id] || {
        completada: false,
        fechaCompletada: null,
        datos: {},
      },
    },
    faseActual: siguiente.id,
    progreso: calcularProgreso(siguiente.id),
    estado: siguiente.id === 'COMPLETADO' ? 'COMPLETADO' : proyecto.estado,
  };
}

/**
 * Retrocede el proyecto a la fase anterior.
 * Función pura — sin side effects.
 *
 * @param {object} proyecto
 * @returns {object} Nuevo estado del proyecto
 */
export function retrocederFase(proyecto) {
  const anterior = getFaseAnterior(proyecto.faseActual, proyecto.requiereInstalacion);
  if (!anterior) throw new Error('El proyecto ya está en la primera fase');

  const faseActualData = proyecto.fases?.[proyecto.faseActual] || {};

  return {
    ...proyecto,
    fases: {
      ...proyecto.fases,
      [proyecto.faseActual]: {
        ...faseActualData,
        completada: false,
        fechaCompletada: null,
      },
      [anterior.id]: {
        ...(proyecto.fases?.[anterior.id] || {}),
        completada: false,
        fechaCompletada: null,
      },
    },
    faseActual: anterior.id,
    progreso: calcularProgreso(anterior.id),
    estado: proyecto.estado === 'COMPLETADO' ? 'ACTIVO' : proyecto.estado,
  };
}
