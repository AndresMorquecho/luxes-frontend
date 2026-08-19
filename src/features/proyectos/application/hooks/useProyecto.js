// src/features/proyectos/application/hooks/useProyecto.js

import { useCallback, useMemo, useEffect, useState } from 'react';
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
 * Siempre consulta GET /api/proyectos/:id al montar o cambiar de proyecto para
 * traer la información actualizada del servidor.
 *
 * @param {string} id - ID del proyecto
 * @param {{ refreshKey?: string|null }} [options] - Clave externa (ej. ?refresh=) para forzar recarga
 */
export function useProyecto(id, options = {}) {
  const { refreshKey = null } = options;
  const { state, dispatch, adapter } = useProyectosContext();
  const [fetchingProyecto, setFetchingProyecto] = useState(false);

  const proyecto = useMemo(() => {
    const found = state.proyectos.find((p) => p.id === id);
    return found?.id === id ? found : null;
  }, [state.proyectos, id]);

  const fetchProyecto = useCallback(async () => {
    if (!id) return null;
    const actualizado = await adapter.getById(id);
    if (actualizado) {
      dispatch({
        type: ACTIONS.UPDATE_PROYECTO,
        payload: { id, cambios: actualizado },
      });
    }
    return actualizado;
  }, [id, adapter, dispatch]);

  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;
    setFetchingProyecto(true);

    fetchProyecto()
      .catch((error) => {
        if (!cancelled) {
          console.error('[useProyecto] Error al cargar proyecto:', error);
        }
      })
      .finally(() => {
        if (!cancelled) setFetchingProyecto(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey, fetchProyecto]);

  const avanzar = useCallback(async () => {
    if (!proyecto) return;
    const proyectoActualizado = avanzarFaseUseCase(proyecto);
    dispatch({ type: ACTIONS.AVANZAR_FASE, payload: { id } });
    try {
      const servidor = await adapter.avanzarFase(id, proyectoActualizado.faseActual, proyectoActualizado.fases[proyectoActualizado.faseActual]?.datos || {});
      if (servidor) {
        dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id, cambios: servidor } });
      }
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
    setFetchingProyecto(true);
    try {
      return await fetchProyecto();
    } catch (error) {
      console.error('[useProyecto] Error al recargar proyecto:', error);
      return null;
    } finally {
      setFetchingProyecto(false);
    }
  }, [fetchProyecto]);

  const loading = fetchingProyecto || (state.loading && !proyecto);

  return {
    proyecto,
    loading,
    avanzar,
    retroceder,
    updateFaseDatos,
    updateProyecto,
    reloadProyecto,
    validacionFaseActual,
  };
}
