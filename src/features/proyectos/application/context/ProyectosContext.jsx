// src/features/proyectos/application/context/ProyectosContext.jsx

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { proyectosReducer, initialState, ACTIONS } from '../store/proyectosStore.js';
import { proyectoApiAdapter } from '../../infrastructure/adapters/proyectoApiAdapter.js';

// Dos contextos separados:
// 1. StableContext: dispatch, adapter, reloadProyectos (referencia NUNCA cambia)
// 2. StateContext: state (cambia solo cuando los datos cambian)
// Esto evita que componentes solo-lectura re-rendericen por despachos internos
const ProyectosStableContext = createContext(null);
const ProyectosStateContext = createContext(null);

// Mantener compat. con código existente que usa ProyectosContext
const ProyectosContext = ProyectosStateContext;

export const ProyectosProvider = ({ children, adapter = proyectoApiAdapter }) => {
  const [state, dispatch] = useReducer(proyectosReducer, initialState);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    adapter
      .getAll({ limit: 1000 })
      .then((proyectos) => {
        dispatch({ type: ACTIONS.SET_PROYECTOS, payload: proyectos });
        isInitialLoad.current = false;
      })
      .catch((err) => dispatch({ type: ACTIONS.SET_ERROR, payload: err.message }));
  }, [adapter]);

  const reloadProyectos = useCallback(() => {
    adapter
      .getAll({ limit: 1000 })
      .then((proyectos) => dispatch({ type: ACTIONS.SET_PROYECTOS, payload: proyectos }))
      .catch((err) => console.error('[ProyectosContext] Error reloading projects:', err));
  }, [adapter]);

  // stableValue: objeto con referencias estables — NO cambia nunca de identidad
  // Esto evita que los consumidores se re-rendericen por dispatch, adapter o reloadProyectos
  const stableValue = useMemo(() => ({ dispatch, adapter, reloadProyectos }), [adapter, reloadProyectos]);

  // stateValue: solo cambia cuando state cambia de verdad
  const stateValue = useMemo(() => ({ state, ...stableValue }), [state, stableValue]);

  return (
    <ProyectosStableContext.Provider value={stableValue}>
      <ProyectosStateContext.Provider value={stateValue}>
        {children}
      </ProyectosStateContext.Provider>
    </ProyectosStableContext.Provider>
  );
};

export const useProyectosContext = () => {
  const ctx = useContext(ProyectosStateContext);
  if (!ctx) throw new Error('useProyectosContext debe usarse dentro de ProyectosProvider');
  return ctx;
};

/** Hook para componentes que solo necesitan dispatch/adapter sin suscribirse a state */
export const useProyectosStable = () => {
  const ctx = useContext(ProyectosStableContext);
  if (!ctx) throw new Error('useProyectosStable debe usarse dentro de ProyectosProvider');
  return ctx;
};

export { ProyectosContext };
