// src/features/proyectos/domain/entities/Proyecto.js

import { calcularDiasDesde, getTodayDateISO } from '../utils/proyectoDates.js';
/**
 * Entidad principal del dominio Proyectos.
 * No importa nada de fuera del dominio.
 */
export class Proyecto {
  constructor({
    id,
    nombre,
    cliente,
    responsable,
    faseActual = 'COTIZACION',
    fases = {},
    fechaCreacion = getTodayDateISO(),
    fechaInicio,
    fechaEntregaEstimada,
    montoEstimado = 0,
    descripcion = '',
    estado = 'ACTIVO',
    progreso = 0,
    etiquetas = [],
    prioridad = 'MEDIA',
  }) {
    this.id = id;
    this.nombre = nombre;
    this.cliente = cliente;
    this.responsable = responsable;
    this.faseActual = faseActual;
    this.fases = fases;
    this.fechaCreacion = fechaCreacion;
    this.fechaInicio = fechaInicio || fechaCreacion;
    this.fechaEntregaEstimada = fechaEntregaEstimada;
    this.montoEstimado = montoEstimado;
    this.descripcion = descripcion;
    this.estado = estado;
    this.progreso = progreso;
    this.etiquetas = etiquetas;
    this.prioridad = prioridad;
  }

  /** Devuelve true si la fecha de entrega ya pasó y el proyecto no está completado */
  estaVencido() {
    if (!this.fechaEntregaEstimada) return false;
    if (this.estado === 'COMPLETADO') return false;
    return new Date(this.fechaEntregaEstimada) < new Date();
  }

  /** Días transcurridos desde la fecha de inicio */
  diasTranscurridos() {
    return calcularDiasDesde(this.fechaInicio || this.fechaCreacion);
  }
}
