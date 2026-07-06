// src/features/proyectos/application/hooks/useProyecto.js

import { useProyectosContext } from '../context/ProyectosContext.jsx';
import { ACTIONS } from '../store/proyectosStore.js';
import { validarCamposFase, avanzarFase as avanzarFaseUseCase, retrocederFase as retrocederFaseUseCase } from '../../domain/use-cases/avanzarFase.js';
import { getFaseConfig } from '../../domain/value-objects/FaseConfig.js';
import { getDatosInstalacionMerged } from '../../domain/instalacionRules.js';
import { usePrintQueue } from '../../../colas-impresion/context/PrintQueueContext.jsx';

/**
 * Hook para gestionar un proyecto individual: detalle, avance de fases y edición.
 * 
 * Los cambios se guardan automáticamente en el backend a través del adaptador.
 *
 * @param {string} id - ID del proyecto
 */
export function useProyecto(id) {
  const { state, dispatch, adapter } = useProyectosContext();

  const proyecto = state.proyectos.find((p) => p.id === id) ?? null;

  async function avanzar() {
    if (!proyecto) return;
    
    // Calcular el siguiente estado antes de hacer dispatch
    const proyectoActualizado = avanzarFaseUseCase(proyecto);
    
    // Actualizar localmente
    dispatch({ type: ACTIONS.AVANZAR_FASE, payload: { id } });
    
    // Persistir en backend
    try {
      await adapter.avanzarFase(id, proyectoActualizado.faseActual, proyectoActualizado.fases[proyectoActualizado.faseActual]?.datos || {});
    } catch (error) {
      console.error('Error al guardar avance de fase:', error);
    }
  }

  async function retroceder() {
    if (!proyecto) return;
    
    // Calcular el estado anterior antes de hacer dispatch
    const proyectoActualizado = retrocederFaseUseCase(proyecto);
    
    dispatch({ type: ACTIONS.RETROCEDER_FASE, payload: { id } });
    
    // Persistir en backend
    try {
      await adapter.update(id, {
        faseActual: proyectoActualizado.faseActual,
        progreso: proyectoActualizado.progreso,
      });
    } catch (error) {
      console.error('Error al guardar retroceso de fase:', error);
    }
  }

  async function updateFaseDatos(faseId, nuevosDatos) {
    if (!proyecto) return;
    
    const cambios = {
      fases: {
        ...proyecto.fases,
        [faseId]: {
          ...(proyecto.fases?.[faseId] || {}),
          datos: {
            ...(proyecto.fases?.[faseId]?.datos || {}),
            ...nuevosDatos,
          },
        },
      },
    };
    
    // Actualizar localmente
    dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios } });
    
    // Persistir en backend y sincronizar respuesta del servidor
    try {
      const datosCompletos = {
        ...(proyecto.fases?.[faseId]?.datos || {}),
        ...nuevosDatos,
      };
      const servidor = await adapter.avanzarFase(id, faseId, datosCompletos);
      if (servidor) {
        dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios: servidor } });
      }
    } catch (error) {
      console.error('Error al guardar datos de fase:', error);
      throw error;
    }
  }

  async function updateProyecto(cambios) {
    if (!proyecto) return;
    
    // Actualizar localmente
    dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios } });
    
    // Persistir en backend
    try {
      await adapter.update(id, cambios);
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
    }
  }

  const { getJobsByProyectoId } = usePrintQueue();
  const jobs = getJobsByProyectoId(id);

  let validacionFaseActual = proyecto
    ? validarCamposFase(
        getFaseConfig(proyecto.faseActual) || {},
        proyecto.faseActual === 'INSTALACION'
          ? { datos: getDatosInstalacionMerged(proyecto) }
          : (proyecto.fases?.[proyecto.faseActual] || {})
      )
    : { valido: false, faltantes: [] };

  if (proyecto && proyecto.faseActual === 'PRODUCCION') {
    const faltantes = [];
    if (jobs.length === 0) {
      faltantes.push('Impresión no iniciada (debe enviar a cola de impresión desde el módulo de impresiones)');
    } else {
      const activeJobs = jobs.filter(
        (j) => j.trackingStatus !== 'Completado' && j.trackingStatus !== 'Cancelado'
      );
      if (activeJobs.length > 0) {
        faltantes.push('Impresión en proceso (debe finalizar la impresión desde la cola de impresiones)');
      }
    }
    if (faltantes.length > 0) {
      validacionFaseActual = {
        valido: false,
        faltantes: [...validacionFaseActual.faltantes, ...faltantes],
      };
    }
  }

  return {
    proyecto,
    loading: state.loading,
    avanzar,
    retroceder,
    updateFaseDatos,
    updateProyecto,
    validacionFaseActual,
  };
}
