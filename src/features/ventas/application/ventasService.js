import { getProformas, registrarAbonoProforma } from '../../proformas/application/proformasService';

export const getVentas = async (filters = {}) => {
  return getProformas({
    ...filters,
    estado: 'Aprobada,Pagada'
  });
};

export const registrarCobro = async (id, { monto, metodoPagoId, referencia }) => {
  return registrarAbonoProforma(id, { monto, metodoPagoId, referencia });
};
