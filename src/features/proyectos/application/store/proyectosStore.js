// src/features/proyectos/application/store/proyectosStore.js

import { avanzarFase, retrocederFase } from '../../domain/use-cases/avanzarFase.js';
import { calcularProgreso } from '../../domain/use-cases/calcularProgreso.js';

// ─── Tipos de acción ─────────────────────────────────────────────────────────
export const ACTIONS = {
  SET_PROYECTOS: 'SET_PROYECTOS',
  UPDATE_PROYECTO: 'UPDATE_PROYECTO',
  DELETE_PROYECTO: 'DELETE_PROYECTO',
  AVANZAR_FASE: 'AVANZAR_FASE',
  RETROCEDER_FASE: 'RETROCEDER_FASE',
  ADD_PROYECTO: 'ADD_PROYECTO',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_INVENTARIO: 'SET_INVENTARIO',
  SET_ORDENES_COMPRA: 'SET_ORDENES_COMPRA',
  UPDATE_INVENTARIO_ITEM: 'UPDATE_INVENTARIO_ITEM',
  CREAR_ORDEN_COMPRA: 'CREAR_ORDEN_COMPRA',
  APROBAR_ORDEN_COMPRA: 'APROBAR_ORDEN_COMPRA',
  RECHAZAR_ORDEN_COMPRA: 'RECHAZAR_ORDEN_COMPRA',
};

// ─── Estado inicial ───────────────────────────────────────────────────────────
export const initialState = {
  proyectos: [],
  inventario: [],
  ordenesCompra: [],
  loading: false,
  error: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
export function proyectosReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_PROYECTOS:
      return { ...state, proyectos: action.payload, loading: false, error: null };

    case ACTIONS.SET_INVENTARIO:
      return { ...state, inventario: action.payload };

    case ACTIONS.SET_ORDENES_COMPRA:
      return { ...state, ordenesCompra: action.payload };

    case ACTIONS.ADD_PROYECTO:
      return {
        ...state,
        proyectos: [...state.proyectos, action.payload],
      };

    case ACTIONS.UPDATE_PROYECTO:
      return {
        ...state,
        proyectos: state.proyectos.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.cambios } : p
        ),
      };

    case ACTIONS.DELETE_PROYECTO:
      return {
        ...state,
        proyectos: state.proyectos.filter((p) => p.id !== action.payload.id),
      };

    case ACTIONS.UPDATE_INVENTARIO_ITEM:
      return {
        ...state,
        inventario: state.inventario.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload.cambios } : item
        ),
      };

    case ACTIONS.CREAR_ORDEN_COMPRA:
      return {
        ...state,
        ordenesCompra: [...state.ordenesCompra, action.payload],
      };

    case ACTIONS.APROBAR_ORDEN_COMPRA:
      return {
        ...state,
        ordenesCompra: state.ordenesCompra.map((oc) =>
          oc.id === action.payload.id ? { ...oc, estado: 'APROBADA', items: action.payload.items || oc.items } : oc
        ),
      };

    case ACTIONS.RECHAZAR_ORDEN_COMPRA:
      return {
        ...state,
        ordenesCompra: state.ordenesCompra.map((oc) =>
          oc.id === action.payload.id ? { ...oc, estado: 'RECHAZADA' } : oc
        ),
      };

    case ACTIONS.AVANZAR_FASE: {
      const proyecto = state.proyectos.find((p) => p.id === action.payload.id);
      if (!proyecto) return state;
      const actualizado = avanzarFase(proyecto);
      return {
        ...state,
        proyectos: state.proyectos.map((p) =>
          p.id === action.payload.id ? actualizado : p
        ),
      };
    }

    case ACTIONS.RETROCEDER_FASE: {
      const proyecto = state.proyectos.find((p) => p.id === action.payload.id);
      if (!proyecto) return state;
      const actualizado = retrocederFase(proyecto);
      return {
        ...state,
        proyectos: state.proyectos.map((p) =>
          p.id === action.payload.id ? actualizado : p
        ),
      };
    }

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    default:
      return state;
  }
}
