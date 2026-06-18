// src/features/proyectos/application/context/ProyectosContext.jsx

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { proyectosReducer, initialState, ACTIONS } from '../store/proyectosStore.js';
import { proyectoApiAdapter } from '../../infrastructure/adapters/proyectoApiAdapter.js';

const ProyectosContext = createContext(null);

/**
 * Proveedor del contexto de Proyectos.
 * Usa el adaptador API real para conectar con el backend.
 */
export const ProyectosProvider = ({ children, adapter = proyectoApiAdapter }) => {
  const [state, dispatch] = useReducer(proyectosReducer, initialState);
  const isInitialLoad = useRef(true);

  // Carga inicial de proyectos desde el backend
  useEffect(() => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    adapter
      .getAll()
      .then((proyectos) => {
        dispatch({ type: ACTIONS.SET_PROYECTOS, payload: proyectos });
        isInitialLoad.current = false;
      })
      .catch((err) => dispatch({ type: ACTIONS.SET_ERROR, payload: err.message }));
  }, [adapter]);

  // Función reutilizable para recargar proyectos desde el adaptador
  const reloadProyectos = useCallback(() => {
    adapter
      .getAll()
      .then((proyectos) => dispatch({ type: ACTIONS.SET_PROYECTOS, payload: proyectos }))
      .catch((err) => console.error('[ProyectosContext] Error reloading projects:', err));
  }, [adapter]);

  return (
    <ProyectosContext.Provider value={{ state, dispatch, adapter, reloadProyectos }}>
      {children}
    </ProyectosContext.Provider>
  );
};

/**
 * Hook para consumir el contexto de Proyectos.
 * Lanza error si se usa fuera del Provider.
 */
export const useProyectosContext = () => {
  const ctx = useContext(ProyectosContext);
  if (!ctx) throw new Error('useProyectosContext debe usarse dentro de ProyectosProvider');
  return ctx;
};
