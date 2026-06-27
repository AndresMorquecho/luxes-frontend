// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/infrastructure/adapters/nominaApiAdapter.js

import { NominaRepositoryPort } from '../../domain/ports/NominaRepositoryPort';
import { Empleado } from '../../domain/entities/Empleado';
import { Nomina } from '../../domain/entities/Nomina';
import { HoraExtra } from '../../domain/entities/HoraExtra';

/**
 * Adaptador de API HTTP para Nómina (Hexagonal).
 * Implementa la interfaz/puerto NominaRepositoryPort conectándose al backend mediante REST API.
 * 
 * @implements {NominaRepositoryPort}
 */
export class NominaApiAdapter extends NominaRepositoryPort {
  constructor(baseUrl = '/api') {
    super();
    this.baseUrl = baseUrl;
  }

  /**
   * Obtiene la lista de todos los colaboradores activos
   * @returns {Promise<Array<Empleado>>}
   */
  async getEmployees() {
    // TODO: Conectar con el endpoint real de colaboradores (ej: GET /colaboradores)
    /*
    const response = await fetch(`${this.baseUrl}/employees`);
    if (!response.ok) throw new Error('Error al obtener empleados del servidor.');
    const data = await response.json();
    return data.map(emp => new Empleado(emp));
    */
    console.warn("NominaApiAdapter: getEmployees() está usando mock temporalmente.");
    return [];
  }

  /**
   * Obtiene la nómina de un período específico (fechaInicio - fechaFin)
   * @param {string} fechaInicio - AAAA-MM-DD
   * @param {string} fechaFin - AAAA-MM-DD
   * @returns {Promise<Array<Nomina>>}
   */
  async getPayrolls(fechaInicio, fechaFin) {
    // TODO: Conectar con el endpoint real de nóminas (ej: GET /nominas?fechaInicio=...&fechaFin=...)
    /*
    const response = await fetch(`${this.baseUrl}/payrolls?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
    if (!response.ok) throw new Error('Error al obtener nóminas del servidor.');
    const data = await response.json();
    return data.map(item => new Nomina(item));
    */
    console.warn("NominaApiAdapter: getPayrolls() está usando mock temporalmente.");
    return [];
  }

  async getPeriodoConfig(fechaInicio, fechaFin) {
    const response = await fetch(
      `${this.baseUrl}/nomina/periodo-config?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`,
      { headers: getHeaders() },
    );
    if (!response.ok) throw new Error('Error al obtener configuración del período.');
    const json = await response.json();
    return json.data || json;
  }

  async savePeriodoConfig(fechaInicio, fechaFin, feriados) {
    const response = await fetch(`${this.baseUrl}/nomina/periodo-config`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ fechaInicio, fechaFin, feriados }),
    });
    if (!response.ok) throw new Error('Error al guardar feriados del período.');
    const json = await response.json();
    return json.data || json;
  }

  /**
   * Guarda o actualiza una nómina en el repositorio
   * @param {Nomina} nomina
   * @returns {Promise<Nomina>}
   */
  async savePayroll(nomina) {
    // TODO: Conectar con el endpoint para guardar nómina (ej: POST o PUT /nominas)
    /*
    const response = await fetch(`${this.baseUrl}/payrolls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nomina)
    });
    if (!response.ok) throw new Error('Error al guardar la nómina en el servidor.');
    const data = await response.json();
    return new Nomina(data);
    */
    console.warn("NominaApiAdapter: savePayroll() está usando mock temporalmente.");
    return nomina;
  }

  /**
   * Obtiene la lista de horas extras registradas en un rango de fechas
   * @param {string} fechaInicio - AAAA-MM-DD
   * @param {string} fechaFin - AAAA-MM-DD
   * @returns {Promise<Array<HoraExtra>>}
   */
  async getOvertime(fechaInicio, fechaFin) {
    // TODO: Conectar con el endpoint de horas extras (ej: GET /horas-extras?fechaInicio=...&fechaFin=...)
    /*
    const response = await fetch(`${this.baseUrl}/overtime?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
    if (!response.ok) throw new Error('Error al obtener horas extras del servidor.');
    const data = await response.json();
    return data.map(he => new HoraExtra(he));
    */
    console.warn("NominaApiAdapter: getOvertime() está usando mock temporalmente.");
    return [];
  }

  /**
   * Guarda o actualiza una lista de horas extras en el repositorio
   * @param {Array<HoraExtra>} horasExtras
   * @returns {Promise<Array<HoraExtra>>}
   */
  async saveOvertime(horasExtras) {
    // TODO: Conectar con el endpoint para guardar horas extras masivamente (ej: POST /horas-extras)
    /*
    const response = await fetch(`${this.baseUrl}/overtime/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(horasExtras)
    });
    if (!response.ok) throw new Error('Error al guardar las horas extras en el servidor.');
    const data = await response.json();
    return data.map(he => new HoraExtra(he));
    */
    console.warn("NominaApiAdapter: saveOvertime() está usando mock temporalmente.");
    return horasExtras;
  }
}
