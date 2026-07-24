// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/use-cases/registrarAbono.js

import { Abono } from '../entities/Abono';

/**
 * Caso de uso: Registrar Abono.
 * Agrega un nuevo abono/anticipo a una nómina específica. Valida que no exceda el límite de 3 abonos.
 * 
 * @param {import('../entities/Nomina').Nomina} nomina - Nómina a la cual agregar el abono
 * @param {Object} dataAbono
 * @param {number} dataAbono.monto - Monto del abono
 * @param {string} dataAbono.fecha - Fecha del abono
 * @returns {import('../entities/Nomina').Nomina} Nómina actualizada con el abono registrado
 * @throws {Error} Si ya hay 3 abonos registrados o si el abono es inválido
 */
export function registrarAbono(nomina, dataAbono) {
  if (!nomina) throw new Error("La nómina es requerida para registrar un abono.");
  
  // Instanciar y validar el abono como objeto de valor/entidad
  const nuevoAbono = new Abono(dataAbono);
  nuevoAbono.validate();

  if (nomina.abonos.length >= 3) {
    throw new Error("Límite de abonos alcanzado. Un período de nómina no puede registrar más de 3 abonos.");
  }

  // Crear una nueva instancia de la nómina con el nuevo abono agregado
  const abonosActualizados = [
    ...nomina.abonos,
    {
      id: nuevoAbono.id || `GTO-temp-${Date.now()}`,
      monto: nuevoAbono.monto,
      fecha: nuevoAbono.fecha,
      metodoPagoId: nuevoAbono.metodoPagoId,
      metodoPagoNombre: nuevoAbono.metodoPagoNombre,
      usuarioNombre: nuevoAbono.usuarioNombre,
      fechaHora: nuevoAbono.fechaHora,
      comprobanteUrl: nuevoAbono.comprobanteUrl || null,
    }
  ];

  return new nomina.constructor({
    ...nomina,
    abonos: abonosActualizados,
  });
}
