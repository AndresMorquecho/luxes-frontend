// src/features/proyectos/application/hooks/useInstalacion.js

import { useState, useEffect, useMemo } from 'react';
import { getDatosInstalacionMerged, resolveFechaHoraFin } from '../../domain/instalacionRules.js';
import { useProyectosContext } from '../context/ProyectosContext.jsx';
import { ACTIONS } from '../store/proyectosStore.js';
import { filterEmpleadosParaInstalacion } from '../../../../shared/utils/userRoleHelpers.js';

/**
 * Hook especializado para la fase de INSTALACION.
 * Maneja personal, materiales y datos de la instalación.
 *
 * @param {string} proyectoId
 */
export function useInstalacion(proyectoId) {
  const { state, dispatch, adapter } = useProyectosContext();
  const proyecto = state.proyectos.find((p) => p.id === proyectoId) ?? null;
  const faseInstalacionMeta = proyecto?.fases?.INSTALACION || {};
  const datosInstalacionBase = getDatosInstalacionMerged(proyecto);
  const { fechaFin, horaFin } = resolveFechaHoraFin(datosInstalacionBase, faseInstalacionMeta);
  const datosInstalacion = {
    ...datosInstalacionBase,
    fechaFin: fechaFin || datosInstalacionBase.fechaFin,
    horaFin: horaFin || datosInstalacionBase.horaFin,
  };

  const [empleadosRaw, setEmpleadosRaw] = useState([]);
  const currentUser = useMemo(
    () => JSON.parse(localStorage.getItem('user') || 'null'),
    [],
  );
  const empleados = useMemo(
    () => filterEmpleadosParaInstalacion(empleadosRaw, currentUser),
    [empleadosRaw, currentUser],
  );

  useEffect(() => {
    if (adapter.getEmpleados) {
      adapter.getEmpleados().then(setEmpleadosRaw).catch(console.error);
    }
  }, [adapter]);

  function actualizarDatos(nuevosDatos) {
    if (!proyecto) return;
    const cambios = {
      fases: {
        ...proyecto.fases,
        INSTALACION: {
          ...(proyecto.fases?.INSTALACION || {}),
          datos: {
            ...datosInstalacion,
            ...nuevosDatos,
          },
        },
      },
    };
    dispatch({ type: ACTIONS.UPDATE_PROYECTO, payload: { id: proyectoId, cambios } });
  }

  function setPersonal(personal) {
    actualizarDatos({ personalAsignado: personal });
  }

  function setMateriales(materiales) {
    actualizarDatos({ materiales });
  }

  function agregarMaterial(material) {
    const actuales = datosInstalacion.materiales || [];
    setMateriales([...actuales, material]);
  }

  function eliminarMaterial(indice) {
    const actuales = datosInstalacion.materiales || [];
    setMateriales(actuales.filter((_, i) => i !== indice));
  }

  function updateMaterial(indice, cambios) {
    const actuales = datosInstalacion.materiales || [];
    setMateriales(actuales.map((m, i) => (i === indice ? { ...m, ...cambios } : m)));
  }

  return {
    proyecto,
    datosInstalacion,
    empleados,
    personalAsignado: datosInstalacion.personalAsignado || [],
    materiales: datosInstalacion.materiales || [],
    setPersonal,
    setMateriales,
    agregarMaterial,
    eliminarMaterial,
    updateMaterial,
    actualizarDatos,
  };
}
