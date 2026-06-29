// src/features/proyectos/application/hooks/useProyectos.js

import { useMemo, useState } from 'react';
import { useProyectosContext } from '../context/ProyectosContext.jsx';
import { ACTIONS } from '../store/proyectosStore.js';
import { crearProyecto } from '../../domain/use-cases/crearProyecto.js';

/**
 * Hook principal para la lista de proyectos con filtros y acciones CRUD.
 */
export function useProyectos() {
  const { state, dispatch, adapter } = useProyectosContext();
  const { proyectos, loading, error } = state;

  const [filtros, setFiltros] = useState({
    busqueda: '',
    fase: 'TODAS',
    responsable: 'TODOS',
    prioridad: 'TODAS',
    estado: 'TODOS',
  });

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter((p) => {
      const matchBusqueda =
        !filtros.busqueda ||
        p.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        p.cliente.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        p.cliente.empresa.toLowerCase().includes(filtros.busqueda.toLowerCase());

      const matchFase = filtros.fase === 'TODAS' || p.faseActual === filtros.fase;
      const matchResponsable =
        filtros.responsable === 'TODOS' || p.responsable === filtros.responsable;
      const matchPrioridad =
        filtros.prioridad === 'TODAS' || p.prioridad === filtros.prioridad;
      const matchEstado =
        filtros.estado === 'TODOS' || p.estado === filtros.estado;

      return matchBusqueda && matchFase && matchResponsable && matchPrioridad && matchEstado;
    });
  }, [proyectos, filtros]);

  const estadisticas = useMemo(() => ({
    total: proyectos.length,
    enProduccion: proyectos.filter((p) => p.faseActual === 'PRODUCCION').length,
    enInstalacion: proyectos.filter((p) => p.faseActual === 'INSTALACION').length,
    completadosMes: proyectos.filter((p) => {
      if (p.estado !== 'COMPLETADO') return false;
      const fase = p.fases?.COMPLETADO;
      if (!fase?.fechaCompletada) return false;
      const fecha = new Date(fase.fechaCompletada);
      const hoy = new Date();
      return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    }).length,
  }), [proyectos]);

  const responsablesUnicos = useMemo(() => {
    return [...new Set(proyectos.map((p) => p.responsable))].sort();
  }, [proyectos]);

  async function addProyecto(datos) {
    try {
      // Guardar en el backend primero
      const nuevoProyecto = await adapter.save(datos);
      
      // Luego actualizar el estado local con el proyecto que retornó el backend
      dispatch({ type: ACTIONS.ADD_PROYECTO, payload: nuevoProyecto });
      
      return nuevoProyecto;
    } catch (error) {
      console.error('Error al crear proyecto:', error);
      throw error;
    }
  }

  async function updateProyecto(id, cambios) {
    try {
      // Actualizar en backend
      const proyectoActualizado = await adapter.update(id, cambios);
      
      // Actualizar estado local
      dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios } });
      
      return proyectoActualizado;
    } catch (error) {
      console.error('Error al actualizar proyecto:', error);
      throw error;
    }
  }

  function avanzarFaseProyecto(id) {
    dispatch({ type: ACTIONS.AVANZAR_FASE, payload: { id } });
  }

  function retrocederFaseProyecto(id) {
    dispatch({ type: ACTIONS.RETROCEDER_FASE, payload: { id } });
  }

  async function deleteProyecto(id) {
    try {
      // Eliminar en backend
      await adapter.delete(id);
      
      // Actualizar estado local
      dispatch({ type: ACTIONS.DELETE_PROYECTO, payload: { id } });

      // Notificar a la cola de impresión que se actualice para limpiar la caché en memoria del frontend
      window.dispatchEvent(new Event('print-queue-updated'));
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      throw error;
    }
  }

  return {
    proyectos: proyectosFiltrados,
    todosLosProyectos: proyectos,
    loading,
    error,
    filtros,
    setFiltros,
    estadisticas,
    responsablesUnicos,
    addProyecto,
    updateProyecto,
    deleteProyecto,
    avanzarFaseProyecto,
    retrocederFaseProyecto,
  };
}
