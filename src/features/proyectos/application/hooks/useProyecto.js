// src/features/proyectos/application/hooks/useProyecto.js

import { useRef, useCallback, useMemo } from 'react';
import { useProyectosContext } from '../context/ProyectosContext.jsx';
import { ACTIONS } from '../store/proyectosStore.js';
import { validarCamposFase, avanzarFase as avanzarFaseUseCase, retrocederFase as retrocederFaseUseCase } from '../../domain/use-cases/avanzarFase.js';
import { getFaseConfig } from '../../domain/value-objects/FaseConfig.js';
import { getDatosInstalacionMerged } from '../../domain/instalacionRules.js';

/**
 * Enriquece la validación de PRODUCCION con el estado de la cola de impresión.
 * Se usa desde páginas que ya consumen usePrintQueue (evita re-renders 1Hz en todo el árbol).
 */
export function enrichValidacionConImpresion(validacion, jobs = []) {
  const base = validacion || { valido: false, faltantes: [] };
  const faltantes = [];
  if (!jobs || jobs.length === 0) {
    faltantes.push('Impresión no iniciada (debe enviar a cola de impresión desde el módulo de impresiones)');
  } else {
    const activeJobs = jobs.filter(
      (j) => j.trackingStatus !== 'Completado' && j.trackingStatus !== 'Cancelado'
    );
    if (activeJobs.length > 0) {
      faltantes.push('Impresión en proceso (debe finalizar la impresión desde la cola de impresiones)');
    }
  }
  if (faltantes.length === 0) return base;
  return {
    valido: false,
    faltantes: [...base.faltantes, ...faltantes],
  };
}

/**
 * Hook para gestionar un proyecto individual: detalle, avance de fases y edición.
 *
 * Los cambios se guardan automáticamente en el backend a través del adaptador.
 *
 * @param {string} id - ID del proyecto
 */
export function useProyecto(id) {
  const { state, dispatch, adapter } = useProyectosContext();

  // Referencia estable: solo devuelve un nuevo objeto si los datos del proyecto cambiaron
  // Esto evita re-renders en DisenoPanel/ProduccionPanel cuando otros proyectos cambian
  const proyectoFromState = state.proyectos.find((p) => p.id === id) ?? null;
  const lastProyectoRef = useRef(proyectoFromState);
  if (proyectoFromState !== lastProyectoRef.current) {
    lastProyectoRef.current = proyectoFromState;
  }
  const proyecto = lastProyectoRef.current;

  const avanzar = useCallback(async () => {
    if (!proyecto) return;
    const proyectoActualizado = avanzarFaseUseCase(proyecto);
    dispatch({ type: ACTIONS.AVANZAR_FASE, payload: { id } });
    try {
      await adapter.avanzarFase(id, proyectoActualizado.faseActual, proyectoActualizado.fases[proyectoActualizado.faseActual]?.datos || {});
    } catch (error) {
      console.error('Error al guardar avance de fase:', error);
    }
  }, [proyecto, id, dispatch, adapter]);

  const retroceder = useCallback(async () => {
    if (!proyecto) return;
    const proyectoActualizado = retrocederFaseUseCase(proyecto);
    dispatch({ type: ACTIONS.RETROCEDER_FASE, payload: { id } });
    try {
      await adapter.update(id, {
        faseActual: proyectoActualizado.faseActual,
        progreso: proyectoActualizado.progreso,
      });
    } catch (error) {
      console.error('Error al guardar retroceso de fase:', error);
    }
  }, [proyecto, id, dispatch, adapter]);

  const updateFaseDatos = useCallback(async (faseId, nuevosDatos) => {
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
    dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios } });
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
  }, [proyecto, id, dispatch, adapter]);

  const updateProyecto = useCallback(async (cambios) => {
    if (!proyecto) return;
    dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios } });
    try {
      await adapter.update(id, cambios);
    } catch (error) {
      console.error('Error al guardar proyecto:', error);
    }
  }, [proyecto, id, dispatch, adapter]);

  const validacionFaseActual = useMemo(() => proyecto
    ? validarCamposFase(
        getFaseConfig(proyecto.faseActual) || {},
        proyecto.faseActual === 'INSTALACION'
          ? { datos: getDatosInstalacionMerged(proyecto) }
          : (proyecto.fases?.[proyecto.faseActual] || {})
      )
    : { valido: false, faltantes: [] },
  [proyecto]);

  const reloadProyecto = useCallback(async () => {
    try {
      const actualizado = await adapter.getById(id);
      if (actualizado) {
        dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios: actualizado } });
      }
    } catch (error) {
      console.error('[useProyecto] Error al recargar proyecto:', error);
    }
  }, [id, adapter, dispatch]);

  return {
    proyecto,
    loading: state.loading,
    avanzar,
    retroceder,
    updateFaseDatos,
    updateProyecto,
    reloadProyecto,
    validacionFaseActual,
  };
}
