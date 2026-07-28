import { getProformas, registrarAbonoProforma } from '../../proformas/application/proformasService';

export const getVentas = async (filters = {}) => {
  return getProformas({
    ...filters,
    estado: 'Aprobada,Pagada',
    conAbonos: 'true'
  });
};

export const registrarCobro = async (id, { monto, metodoPagoId, referencia, comprobanteUrl }) => {
  return registrarAbonoProforma(id, { monto, metodoPagoId, referencia, comprobanteUrl });
};
