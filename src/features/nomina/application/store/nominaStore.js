// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/application/store/nominaStore.js

export const initialNominaState = {
  employees: [],
  payrolls: [],
  overtime: [],
  loading: false,
  error: null,
  activePeriod: {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    type: "mensual",
  },
  selectedEmployeeId: null, // Para ver Rol de Pago o Editar
};

export const NOMINA_ACTIONS = {
  START_LOADING: "START_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_EMPLOYEES: "SET_EMPLOYEES",
  SET_PAYROLLS: "SET_PAYROLLS",
  SET_OVERTIME: "SET_OVERTIME",
  UPDATE_PAYROLL: "UPDATE_PAYROLL",
  UPDATE_OVERTIME: "UPDATE_OVERTIME",
  SET_PERIOD: "SET_PERIOD",
  SET_SELECTED_EMPLOYEE: "SET_SELECTED_EMPLOYEE",
};

export function nominaReducer(state, action) {
  switch (action.type) {
    case NOMINA_ACTIONS.START_LOADING:
      return { ...state, loading: true, error: null };
    case NOMINA_ACTIONS.SET_ERROR:
      return { ...state, loading: false, error: action.payload };
    case NOMINA_ACTIONS.SET_EMPLOYEES:
      return { ...state, employees: action.payload, loading: false };
    case NOMINA_ACTIONS.SET_PAYROLLS:
      return { ...state, payrolls: action.payload, loading: false };
    case NOMINA_ACTIONS.SET_OVERTIME:
      return { ...state, overtime: action.payload, loading: false };
    case NOMINA_ACTIONS.UPDATE_PAYROLL:
      return {
        ...state,
        payrolls: state.payrolls.map(item =>
          item.empleadoId === action.payload.empleadoId ? action.payload : item
        ),
      };
    case NOMINA_ACTIONS.UPDATE_OVERTIME:
      return {
        ...state,
        overtime: action.payload,
      };
    case NOMINA_ACTIONS.SET_PERIOD:
      return {
        ...state,
        activePeriod: { ...state.activePeriod, ...action.payload },
      };
    case NOMINA_ACTIONS.SET_SELECTED_EMPLOYEE:
      return { ...state, selectedEmployeeId: action.payload };
    default:
      return state;
  }
}
