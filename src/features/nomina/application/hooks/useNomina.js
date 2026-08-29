// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/application/hooks/useNomina.js

import { useContext, useCallback, useMemo } from 'react';
import { NominaContext } from '../context/NominaContext';
import { NOMINA_ACTIONS } from '../store/nominaStore';
import { calcularNomina } from '../../domain/use-cases/calcularNomina';
import { calcularHorasExtras } from '../../domain/use-cases/calcularHorasExtras';
import { obtenerResumenNomina } from '../../domain/use-cases/obtenerResumenNomina';
import { registrarAbono } from '../../domain/use-cases/registrarAbono';
import { Nomina } from '../../domain/entities/Nomina';
import { HoraExtra } from '../../domain/entities/HoraExtra';
import { toast } from '../../../../shared/ui/components/Toast';

/**
 * Helper para obtener fechas de inicio y fin según el año, mes y tipo de período.
 */
export function obtenerFechasPeriodo(year, month, type) {
  const mesStr = String(month).padStart(2, '0');
  const ultimoDia = new Date(year, month, 0).getDate();

  if (type === '1ra_quincena') {
    return {
      fechaInicio: `${year}-${mesStr}-01`,
      fechaFin: `${year}-${mesStr}-15`,
    };
  } else if (type === '2da_quincena') {
    return {
      fechaInicio: `${year}-${mesStr}-16`,
      fechaFin: `${year}-${mesStr}-${ultimoDia}`,
    };
  } else {
    // mensual
    return {
      fechaInicio: `${year}-${mesStr}-01`,
      fechaFin: `${year}-${mesStr}-${ultimoDia}`,
    };
  }
}

/**
 * Hook de aplicación useNomina (Hexagonal).
 * Orquesta la lógica del negocio delegando cálculos a los use-cases y la persistencia al adaptador inyectado.
 */
export function useNomina() {
  const context = useContext(NominaContext);

  if (!context) {
    throw new Error('useNomina debe usarse dentro de un NominaProvider');
  }

  const { state, dispatch, adapter } = context;

  // Fechas del período actual
  const fechasActuales = useMemo(() => {
    const { year, month, type } = state.activePeriod;
    return obtenerFechasPeriodo(year, month, type);
  }, [state.activePeriod]);

  /**
   * Carga los datos del período seleccionado
   */
  const loadData = useCallback(async () => {
    if (!adapter) return;

    dispatch({ type: NOMINA_ACTIONS.START_LOADING });
    try {
      // 1. Obtener empleados
      const emps = await adapter.getEmployees();
      dispatch({ type: NOMINA_ACTIONS.SET_EMPLOYEES, payload: emps });

      // 2. Obtener nóminas del período
      const { fechaInicio, fechaFin } = fechasActuales;
      const payrolls = await adapter.getPayrolls(fechaInicio, fechaFin);
      dispatch({ type: NOMINA_ACTIONS.SET_PAYROLLS, payload: payrolls });

      // 3. Obtener horas extras del período
      const overtime = await adapter.getOvertime(fechaInicio, fechaFin);
      dispatch({ type: NOMINA_ACTIONS.SET_OVERTIME, payload: overtime });
    } catch (err) {
      dispatch({ type: NOMINA_ACTIONS.SET_ERROR, payload: err.message || 'Error al cargar datos.' });
    }
  }, [adapter, fechasActuales, dispatch]);

  /**
   * Cambia el período y recarga datos
   */
  const changePeriod = useCallback((year, month, type) => {
    dispatch({
      type: NOMINA_ACTIONS.SET_PERIOD,
      payload: { year: Number(year), month: Number(month), type },
    });
  }, [dispatch]);

  /**
   * Guarda o actualiza un registro de nómina
   */
  const savePayrollRecord = useCallback(async (nominaEntity) => {
    if (!adapter) return;
    try {
      nominaEntity.validate();
      const saved = await adapter.savePayroll(nominaEntity);
      dispatch({ type: NOMINA_ACTIONS.UPDATE_PAYROLL, payload: saved });
      return saved;
    } catch (err) {
      toast.error(`Error al guardar nómina: ${err.message}`);
      throw err;
    }
  }, [adapter, dispatch]);

  /**
   * Agrega un abono a un empleado en el período actual
   */
  const addAbono = useCallback(async (empleadoId, monto, fecha, metodoPagoId, observaciones, comprobanteUrl) => {
    const nomina = state.payrolls.find(p => p.empleadoId === empleadoId);
    if (!nomina) {
      toast.error('No se encontró el registro de nómina para este colaborador.');
      return;
    }

    try {
      const nominaActualizada = registrarAbono(nomina, { monto, fecha, metodoPagoId, observaciones, comprobanteUrl });
      await savePayrollRecord(nominaActualizada);
    } catch (err) {
      toast.error(`Error al registrar abono: ${err.message}`);
    }
  }, [state.payrolls, savePayrollRecord]);

  /**
   * Guarda/actualiza las horas extras
   */
  const saveOvertimeRecords = useCallback(async (horasExtras) => {
    if (!adapter) return;
    try {
      horasExtras.forEach(he => he.validate());
      const { fechaInicio, fechaFin } = fechasActuales;
      const saved = await adapter.saveOvertime(horasExtras, fechaInicio, fechaFin);
      
      // Volver a cargar horas extras para mantener sincronía
      const updatedOvertime = await adapter.getOvertime(fechaInicio, fechaFin);
      dispatch({ type: NOMINA_ACTIONS.SET_OVERTIME, payload: updatedOvertime });
      return saved;
    } catch (err) {
      toast.error(`Error al guardar horas extras: ${err.message}`);
      throw err;
    }
  }, [adapter, fechasActuales, dispatch]);

  /**
   * Selecciona un empleado para edición o visualización de rol
   */
  const setSelectedEmployee = useCallback((employeeId) => {
    dispatch({ type: NOMINA_ACTIONS.SET_SELECTED_EMPLOYEE, payload: employeeId });
  }, [dispatch]);

  // --- CÁLCULOS REACTIVOS USANDO CASOS DE USO ---

  // 1. Obtener resumen acumulado de horas extras por colaborador
  const overtimeSummary = useMemo(() => {
    return calcularHorasExtras(state.employees, state.overtime);
  }, [state.employees, state.overtime]);

  // 2. Calcular individualmente todas las nóminas activas
  const calculatedPayrolls = useMemo(() => {
    return state.payrolls.map(nomina => {
      const emp = state.employees.find(e => e.id === nomina.empleadoId);
      if (!emp) return null;

      // Obtener el total de horas extras acumulado para este empleado en el período actual
      const totalHE = overtimeSummary.porColaborador[emp.id]?.total || 0;

      // Inyectar el acumulado de horas extras dinámicamente en el objeto de nómina
      const nominaConHE = {
        ...nomina,
        ingresos: {
          ...nomina.ingresos,
          horasExtras: totalHE
        }
      };

      return calcularNomina(emp, nominaConHE);
    }).filter(Boolean);
  }, [state.payrolls, state.employees, overtimeSummary]);

  // 3. Obtener resumen financiero global del período
  const globalSummary = useMemo(() => {
    return obtenerResumenNomina(calculatedPayrolls);
  }, [calculatedPayrolls]);

  // Empleado actualmente seleccionado
  const selectedEmployee = useMemo(() => {
    return state.employees.find(e => e.id === state.selectedEmployeeId) || null;
  }, [state.employees, state.selectedEmployeeId]);

  // Nómina calculada del empleado seleccionado
  const selectedCalculatedPayroll = useMemo(() => {
    if (!state.selectedEmployeeId) return null;
    return calculatedPayrolls.find(p => p.empleadoId === state.selectedEmployeeId) || null;
  }, [calculatedPayrolls, state.selectedEmployeeId]);

  // Nómina cruda (sin calcular) del empleado seleccionado
  const selectedRawPayroll = useMemo(() => {
    if (!state.selectedEmployeeId) return null;
    return state.payrolls.find(p => p.empleadoId === state.selectedEmployeeId) || null;
  }, [state.payrolls, state.selectedEmployeeId]);

  return {
    employees: state.employees,
    rawPayrolls: state.payrolls,
    overtime: state.overtime,
    loading: state.loading,
    error: state.error,
    activePeriod: state.activePeriod,
    selectedEmployeeId: state.selectedEmployeeId,
    fechasActuales,
    
    // Métodos
    loadData,
    changePeriod,
    savePayrollRecord,
    addAbono,
    saveOvertimeRecords,
    setSelectedEmployee,

    // Datos Calculados reactivamente
    calculatedPayrolls,
    globalSummary,
    overtimeSummary,
    selectedEmployee,
    selectedCalculatedPayroll,
    selectedRawPayroll,
  };
}
