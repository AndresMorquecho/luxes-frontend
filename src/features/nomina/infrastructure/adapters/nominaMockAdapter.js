// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/infrastructure/adapters/nominaMockAdapter.js

import { NominaRepositoryPort } from '../../domain/ports/NominaRepositoryPort';
import { Empleado } from '../../domain/entities/Empleado';
import { Nomina } from '../../domain/entities/Nomina';
import { HoraExtra } from '../../domain/entities/HoraExtra';
import { empleadosMock, nominasMock, horasExtrasMock } from '../mock/nominaData';

// Cache local en memoria compartida para simular una base de datos reactiva
let dbPayrolls = [...nominasMock];
let dbOvertime = [...horasExtrasMock];
let dbEmployees = [...empleadosMock];

/**
 * Adaptador Mock en Memoria para Nómina.
 * Mantiene la persistencia en el estado actual de la sesión del navegador.
 * 
 * @implements {NominaRepositoryPort}
 */
export class NominaMockAdapter extends NominaRepositoryPort {
  /**
   * Obtiene la lista de todos los colaboradores activos
   * @returns {Promise<Array<Empleado>>}
   */
  async getEmployees() {
    // Retornamos instancias del Dominio
    return dbEmployees.map(emp => new Empleado(emp));
  }

  /**
   * Obtiene la nómina de un período específico (fechaInicio - fechaFin)
   * @param {string} fechaInicio - AAAA-MM-DD
   * @param {string} fechaFin - AAAA-MM-DD
   * @returns {Promise<Array<Nomina>>}
   */
  async getPayrolls(fechaInicio, fechaFin) {
    // Si no existen registros de nómina para este período, los inicializamos vacíos por defecto
    const filtered = dbPayrolls.filter(
      item => item.fechaInicio === fechaInicio && item.fechaFin === fechaFin
    );

    if (filtered.length === 0) {
      const fInicio = new Date(fechaInicio);
      const fFin    = new Date(fechaFin);
      const diffDias = Math.floor((fFin - fInicio) / (1000 * 60 * 60 * 24)) + 1;
      // Crear registros vacíos por defecto para todos los empleados en este período
      const newPayrolls = dbEmployees.map(emp => {
        return new Nomina({
          empleadoId: emp.id,
          fechaInicio,
          fechaFin,
          diasLaborables: diffDias,
          diasLaborados: diffDias,
          permisoHoras: 0,
          ingresos: {
            decimoCuarto: 38.33,
            decimoTercero: 0, // se calculará reactivamente
            horasExtras: 0,
            trabajosEnEmpresa: 0,
            fondosReserva: 0,
          },
          egresos: {
            iess: 0,
            extensionConyuge: 0,
            prestamoQuirografario: 0,
            anticipos: 0,
            dctoHorasNoLaboradas: 0,
            multas: 0,
            dctoFiesta: 0,
            dctoHerramientas: 0,
            dctoGenerico: 0,
          },
          abonos: [],
          estado: "PENDIENTE"
        });
      });

      dbPayrolls.push(...newPayrolls);
      return newPayrolls;
    }

    return filtered.map(item => new Nomina(item));
  }

  /**
   * Guarda o actualiza una nómina en el repositorio
   * @param {Nomina} nomina
   * @returns {Promise<Nomina>}
   */
  async savePayroll(nomina) {
    const idx = dbPayrolls.findIndex(
      item =>
        item.empleadoId === nomina.empleadoId &&
        item.fechaInicio === nomina.fechaInicio &&
        item.fechaFin === nomina.fechaFin
    );

    if (idx >= 0) {
      // Actualización
      dbPayrolls[idx] = {
        ...nomina,
        ingresos: { ...nomina.ingresos },
        egresos: { ...nomina.egresos },
        abonos: nomina.abonos.map(a => ({ ...a })),
      };
    } else {
      // Creación
      dbPayrolls.push({
        ...nomina,
        ingresos: { ...nomina.ingresos },
        egresos: { ...nomina.egresos },
        abonos: nomina.abonos.map(a => ({ ...a })),
      });
    }
    return new Nomina(nomina);
  }

  /**
   * Obtiene la lista de horas extras registradas en un rango de fechas
   * @param {string} fechaInicio - AAAA-MM-DD
   * @param {string} fechaFin - AAAA-MM-DD
   * @returns {Promise<Array<HoraExtra>>}
   */
  async getOvertime(fechaInicio, fechaFin) {
    // Retornar horas extras que caigan dentro del período
    const filtered = dbOvertime.filter(he => {
      const fecha = new Date(he.fecha);
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      return fecha >= inicio && fecha <= fin;
    });
    return filtered.map(he => new HoraExtra(he));
  }

  /**
   * Guarda o actualiza una lista de horas extras en el repositorio
   * @param {Array<HoraExtra>} horasExtras
   * @returns {Promise<Array<HoraExtra>>}
   */
  async saveOvertime(horasExtras) {
    // Reemplazamos/insertamos los registros que correspondan
    horasExtras.forEach(newHe => {
      const idx = dbOvertime.findIndex(item => item.id === newHe.id);
      if (idx >= 0) {
        dbOvertime[idx] = { ...newHe };
      } else {
        dbOvertime.push({ ...newHe });
      }
    });

    return horasExtras.map(he => new HoraExtra(he));
  }

  /**
   * Obtiene la lista de vacaciones registradas
   * @returns {Promise<Array<object>>}
   */
  async getVacations() {
    try {
      return JSON.parse(localStorage.getItem('luxes_vacaciones') || '[]');
    } catch { return []; }
  }

  /**
   * Guarda o actualiza un registro de vacaciones
   * @param {string} empleadoId
   * @param {number} año
   * @param {Array<string>} diasTomados
   * @returns {Promise<object>}
   */
  async saveVacation(empleadoId, año, diasTomados) {
    let current = [];
    try {
      current = JSON.parse(localStorage.getItem('luxes_vacaciones') || '[]');
    } catch {}

    const idx = current.findIndex(v => v.empleadoId === empleadoId && v.año === año);
    if (idx === -1) {
      current.push({ empleadoId, año, diasTomados });
    } else {
      current[idx] = { ...current[idx], diasTomados };
    }
    localStorage.setItem('luxes_vacaciones', JSON.stringify(current));
    return { empleadoId, año, diasTomados };
  }
}
