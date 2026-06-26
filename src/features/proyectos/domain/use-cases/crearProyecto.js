// src/features/proyectos/domain/use-cases/crearProyecto.js

import { calcularProgreso } from './calcularProgreso.js';
import { getTodayDateISO } from '../utils/proyectoDates.js';

/**
 * Crea un nuevo proyecto en fase COTIZACION.
 * Función pura — sin side effects.
 *
 * @param {object} datos - Datos del formulario de nuevo proyecto
 * @returns {object} Proyecto listo para persistir
 */
export function crearProyecto(datos) {
  const {
    nombre,
    descripcion = '',
    prioridad = 'MEDIA',
    fechaEntregaEstimada,
    fechaInicio,
    responsable,
    etiquetas = [],
    cliente,
    montoEstimado = 0,
    notasCotizacion = '',
    requiereInstalacion = true,
  } = datos;

  if (!nombre || nombre.trim() === '') {
    throw new Error('El nombre del proyecto es requerido');
  }
  if (!responsable) {
    throw new Error('El responsable del proyecto es requerido');
  }

  const id = `p${Date.now()}`;
  const fechaCreacion = fechaInicio || getTodayDateISO();

  return {
    id,
    nombre: nombre.trim(),
    descripcion,
    prioridad,
    fechaEntregaEstimada: fechaEntregaEstimada || null,
    responsable,
    etiquetas,
    requiereInstalacion,
    cliente: {
      nombre: cliente?.nombre || '',
      empresa: cliente?.empresa || '',
      telefono: cliente?.telefono || '',
      email: cliente?.email || '',
    },
    montoEstimado: Number(montoEstimado),
    faseActual: 'COTIZACION',
    progreso: calcularProgreso('COTIZACION'),
    estado: 'ACTIVO',
    fechaCreacion,
    fechaInicio: fechaCreacion,
    fases: {
      COTIZACION: {
        completada: false,
        fechaCompletada: null,
        datos: notasCotizacion ? { notas: notasCotizacion } : {},
      },
    },
  };
}
