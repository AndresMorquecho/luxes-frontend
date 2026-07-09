// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/infrastructure/adapters/nominaApiAdapter.js

import { NominaRepositoryPort } from '../../domain/ports/NominaRepositoryPort';
import { Empleado } from '../../domain/entities/Empleado';
import { Nomina } from '../../domain/entities/Nomina';
import { HoraExtra } from '../../domain/entities/HoraExtra';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const serializeOvertimeRecord = (he) => {
  const src = he || {};
  const horas = Number(src.horas);
  const valorPorHora = Number(src.valorPorHora ?? 2.5);
  return {
    id: src.id,
    fecha: src.fecha,
    colaboradorId: String(src.colaboradorId),
    horas,
    detalleHorario: src.detalleHorario || '',
    descripcion: src.descripcion || '',
    valorPorHora,
    total: src.total !== undefined ? Number(src.total) : horas * valorPorHora,
    estado: src.estado || 'DEUDOR',
    aprobacionEstado: src.aprobacionEstado || 'APROBADA',
    origen: src.origen || 'MANUAL',
  };
};

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
    const response = await fetch(`${this.baseUrl}/empleados`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener colaboradores del servidor.');
    const json = await response.json();
    if (json?.success === false) {
      throw new Error(json?.error?.message || 'Error al obtener colaboradores del servidor.');
    }
    const arr = Array.isArray(json) ? json : json.data || [];
    return arr.map(emp => new Empleado(emp));
  }

  /**
   * Obtiene la nómina de un período específico (fechaInicio - fechaFin)
   * @param {string} fechaInicio - AAAA-MM-DD
   * @param {string} fechaFin - AAAA-MM-DD
   * @returns {Promise<Array<Nomina>>}
   */
  async getPayrolls(fechaInicio, fechaFin) {
    const response = await fetch(
      `${this.baseUrl}/nomina/nominas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`,
      { headers: getHeaders() }
    );
    if (!response.ok) throw new Error('Error al obtener nóminas del servidor.');
    const json = await response.json();
    const arr = Array.isArray(json) ? json : json.data || [];
    return arr.map(item => new Nomina(item));
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
    const response = await fetch(`${this.baseUrl}/nomina/nominas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(nomina),
    });
    if (!response.ok) throw new Error('Error al guardar la nómina en el servidor.');
    const json = await response.json();
    const data = json.data || json;
    return new Nomina(data);
  }

  /**
   * Obtiene la lista de horas extras registradas en un rango de fechas
   * @param {string} fechaInicio - AAAA-MM-DD
   * @param {string} fechaFin - AAAA-MM-DD
   * @returns {Promise<Array<HoraExtra>>}
   */
  async getOvertime(fechaInicio, fechaFin) {
    const response = await fetch(
      `${this.baseUrl}/nomina/horas-extras?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`,
      { headers: getHeaders() }
    );
    if (!response.ok) throw new Error('Error al obtener horas extras del servidor.');
    const json = await response.json();
    const arr = Array.isArray(json) ? json : json.data || [];
    return arr.map(he => new HoraExtra(he));
  }

  /**
   * Guarda o actualiza una lista de horas extras en el repositorio
   * @param {Array<HoraExtra>} horasExtras
   * @param {string} fechaInicio
   * @param {string} fechaFin
   * @returns {Promise<Array<HoraExtra>>}
   */
  async saveOvertime(horasExtras, fechaInicio, fechaFin) {
    const payload = (horasExtras || []).map(serializeOvertimeRecord);
    const response = await fetch(`${this.baseUrl}/nomina/horas-extras`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ horasExtras: payload, fechaInicio, fechaFin }),
    });
    if (!response.ok) {
      let detail = 'Error al guardar las horas extras en el servidor.';
      try {
        const errJson = await response.json();
        detail = errJson?.error?.message || errJson?.message || detail;
      } catch {
        // ignore parse errors
      }
      throw new Error(detail);
    }
    const json = await response.json();
    const arr = Array.isArray(json) ? json : json.data || [];
    return arr.map(he => new HoraExtra(he));
  }

  async deleteOvertime(id) {
    const response = await fetch(`${this.baseUrl}/nomina/horas-extras/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al eliminar horas extras.');
    const json = await response.json();
    return json.success || false;
  }

  /**
   * Obtiene la lista de vacaciones registradas
   * @returns {Promise<Array<object>>}
   */
  async getVacations() {
    const response = await fetch(`${this.baseUrl}/nomina/vacaciones`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener vacaciones del servidor.');
    const json = await response.json();
    return json.data || json || [];
  }

  /**
   * Guarda o actualiza un registro de vacaciones en el servidor
   * @param {string} empleadoId
   * @param {number} año
   * @param {Array<string>} diasTomados
   * @returns {Promise<object>}
   */
  async saveVacation(empleadoId, año, diasTomados) {
    const response = await fetch(`${this.baseUrl}/nomina/vacaciones`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ empleadoId, año, diasTomados }),
    });
    if (!response.ok) throw new Error('Error al guardar vacaciones en el servidor.');
    const json = await response.json();
    return json.data || json;
  }

  /**
   * Obtiene la lista de egresos detallados de un colaborador
   * @param {string} empleadoId
   * @param {string} [fechaInicio]
   * @param {string} [fechaFin]
   * @returns {Promise<Array<object>>}
   */
  async getDetailedEgresos(empleadoId, fechaInicio, fechaFin) {
    let url = `${this.baseUrl}/nomina/egresos?empleadoId=${empleadoId}`;
    if (fechaInicio && fechaFin) {
      url += `&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error al obtener egresos detallados.');
    const json = await response.json();
    return json.data || json || [];
  }

  /**
   * Crea un nuevo egreso detallado
   * @param {object} data
   * @param {string} data.empleadoId
   * @param {string} data.tipo - "ANTICIPO" | "MULTA" | "OTROS"
   * @param {number} data.monto
   * @param {string} data.fecha - AAAA-MM-DD
   * @param {string} [data.motivo]
   * @returns {Promise<object>}
   */
  async createDetailedEgreso(data) {
    const response = await fetch(`${this.baseUrl}/nomina/egresos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al crear egreso detallado.');
    const json = await response.json();
    return json.data || json;
  }

  /**
   * Elimina un egreso detallado por id
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteDetailedEgreso(id) {
    const response = await fetch(`${this.baseUrl}/nomina/egresos/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al eliminar egreso detallado.');
    const json = await response.json();
    return json.success || false;
  }

  /**
   * Obtiene la lista de ingresos detallados de un colaborador
   * @param {string} empleadoId
   * @param {string} [fechaInicio]
   * @param {string} [fechaFin]
   * @returns {Promise<Array<object>>}
   */
  async getDetailedIngresos(empleadoId, fechaInicio, fechaFin) {
    let url = `${this.baseUrl}/nomina/ingresos?empleadoId=${empleadoId}`;
    if (fechaInicio && fechaFin) {
      url += `&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error al obtener ingresos detallados.');
    const json = await response.json();
    return json.data || json || [];
  }

  /**
   * Crea un nuevo ingreso detallado
   * @param {object} data
   * @param {string} data.empleadoId
   * @param {string} data.tipo - "TRAB_EMP" | "OTROS"
   * @param {number} data.monto
   * @param {string} data.fecha - AAAA-MM-DD
   * @param {string} [data.motivo]
   * @returns {Promise<object>}
   */
  async createDetailedIngreso(data) {
    const response = await fetch(`${this.baseUrl}/nomina/ingresos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al crear ingreso detallado.');
    const json = await response.json();
    return json.data || json;
  }

  /**
   * Elimina un ingreso detallado por id
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteDetailedIngreso(id) {
    const response = await fetch(`${this.baseUrl}/nomina/ingresos/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al eliminar ingreso detallado.');
    const json = await response.json();
    return json.success || false;
  }

  async getPendingOvertime() {
    const response = await fetch(`${this.baseUrl}/nomina/horas-extras/pendientes`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener horas extras pendientes.');
    const json = await response.json();
    return json.data || json || [];
  }

  async approveOvertime(id) {
    const response = await fetch(`${this.baseUrl}/nomina/horas-extras/${id}/aprobar`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al aprobar horas extras.');
    const json = await response.json();
    return json.data || json;
  }

  async rejectOvertime(id) {
    const response = await fetch(`${this.baseUrl}/nomina/horas-extras/${id}/rechazar`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al rechazar horas extras.');
    const json = await response.json();
    return json.data || json;
  }

  async patchOvertime(id, data) {
    const response = await fetch(`${this.baseUrl}/nomina/horas-extras/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al actualizar horas extras.');
    const json = await response.json();
    return json.data || json;
  }

  /**
   * Descarga el archivo Excel con el reporte de nómina del mes
   * @param {number} year
   * @param {number} month
   * @returns {Promise<Blob>}
   */
  async exportToExcel(year, month) {
    const response = await fetch(
      `${this.baseUrl}/nomina/exportar?year=${year}&month=${month}`,
      {
        headers: {
          ...getHeaders(),
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      }
    );
    if (!response.ok) throw new Error('Error al generar el archivo Excel.');
    return await response.blob();
  }
}
