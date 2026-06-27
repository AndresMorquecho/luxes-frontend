// src/features/proyectos/infrastructure/adapters/proyectoApiAdapter.js
import * as proyectosService from '../../application/proyectosService.js';

/**
 * Adaptador API real que implementa el ProyectoRepository usando el servicio.
 */
export const proyectoApiAdapter = {
  async getAll(filters) {
    const response = await proyectosService.getProyectos(filters);
    return response.data; // Retorna solo la data, sin pagination
  },

  async getById(id) {
    return await proyectosService.getProyectoById(id);
  },

  async save(proyecto) {
    return await proyectosService.createProyecto(proyecto);
  },

  async update(id, cambios) {
    return await proyectosService.updateProyecto(id, cambios);
  },

  async delete(id) {
    return await proyectosService.deleteProyecto(id);
  },

  async avanzarFase(id, fase, datos) {
    return await proyectosService.avanzarFase(id, fase, datos);
  },

  async updateInstalacion(proyectoId, instalacionData) {
    return await proyectosService.updateInstalacion(proyectoId, instalacionData);
  },

  async uploadArchivoDiseno(proyectoId, file) {
    return await proyectosService.uploadArchivoDiseno(proyectoId, file);
  },

  async getEmpleados() {
    // Obtener empleados desde el API de empleados
    const token = localStorage.getItem('token');
    const res = await fetch('/api/empleados', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Error al obtener empleados');
    }
    return data.data;
  },
};
