import { diasEnPeriodo } from './nominaPeriodoHelpers.js';
import { DIAS_SUELDO_MES } from './sueldoHelpers.js';

export const SBU_DEFAULT_ECUADOR = 470;

const roundMoney = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function ingresosGravadosPeriodo(sueldoBruto, horasExtras = 0, trabajosEmpresa = 0) {
  return roundMoney(Number(sueldoBruto) + Number(horasExtras) + Number(trabajosEmpresa));
}

export function provisionDecimoTerceroPeriodo(ingresosGravados) {
  if (ingresosGravados <= 0) return 0;
  return roundMoney(ingresosGravados / 12);
}

export function provisionDecimoCuartoPeriodo(sbuVigente, fechaInicio, fechaFin) {
  const sbu = Number(sbuVigente) || SBU_DEFAULT_ECUADOR;
  const dias = diasEnPeriodo(fechaInicio, fechaFin);
  return roundMoney((sbu / 12) * (dias / DIAS_SUELDO_MES));
}

export function enVentanaPagoDecimoTercero(fechaRef) {
  const d = typeof fechaRef === 'string' ? new Date(`${fechaRef.slice(0, 10)}T12:00:00`) : fechaRef;
  return d.getMonth() === 11 && d.getDate() <= 24;
}

export function enVentanaPagoDecimoCuarto(fechaRef, region) {
  const d = typeof fechaRef === 'string' ? new Date(`${fechaRef.slice(0, 10)}T12:00:00`) : fechaRef;
  if (region === 'sierra') {
    return d.getMonth() === 7 && d.getDate() <= 15;
  }
  return d.getMonth() === 2 && d.getDate() <= 15;
}

function readProvision(ing, key3, legacy3) {
  if (!ing) return 0;
  const v = ing[key3] ?? ing[legacy3];
  return Number(v) || 0;
}

export function calcAcumuladosDecimos(nominasPrevias, provisionD3, provisionD4, pagoD3, pagoD4) {
  let acumuladoDecimo3 = 0;
  let acumuladoDecimo4 = 0;

  for (const n of nominasPrevias) {
    const ing = n.ingresos || {};
    acumuladoDecimo3 += readProvision(ing, 'provisionDecimo3', 'decimoTercero');
    acumuladoDecimo4 += readProvision(ing, 'provisionDecimo4', 'decimoCuarto');
    acumuladoDecimo3 -= Number(ing.pagoDecimo3 ?? 0);
    acumuladoDecimo4 -= Number(ing.pagoDecimo4 ?? 0);
  }

  acumuladoDecimo3 += provisionD3 - pagoD3;
  acumuladoDecimo4 += provisionD4 - pagoD4;

  return {
    acumuladoDecimo3: roundMoney(Math.max(0, acumuladoDecimo3)),
    acumuladoDecimo4: roundMoney(Math.max(0, acumuladoDecimo4)),
  };
}

export function computeDecimosProvisions(input) {
  const {
    gravado,
    sbuVigente,
    fechaInicio,
    fechaFin,
    tieneContrato,
    decimoTerceroMensualizado,
    decimoCuartoMensualizado,
    region,
    nominasPreviasAnio,
  } = input;

  if (!tieneContrato) {
    return {
      provisionDecimo3: 0,
      provisionDecimo4: 0,
      acumuladoDecimo3: 0,
      acumuladoDecimo4: 0,
      pagoDecimo3: 0,
      pagoDecimo4: 0,
      decimoTercero: 0,
      decimoCuarto: 0,
      enVentanaPagoDecimo3: false,
      enVentanaPagoDecimo4: false,
    };
  }

  const provisionDecimo3 = provisionDecimoTerceroPeriodo(gravado);
  const provisionDecimo4 = provisionDecimoCuartoPeriodo(sbuVigente, fechaInicio, fechaFin);
  const pagoDecimo3 = decimoTerceroMensualizado ? provisionDecimo3 : 0;
  const pagoDecimo4 = decimoCuartoMensualizado ? provisionDecimo4 : 0;

  const { acumuladoDecimo3, acumuladoDecimo4 } = calcAcumuladosDecimos(
    nominasPreviasAnio,
    provisionDecimo3,
    provisionDecimo4,
    pagoDecimo3,
    pagoDecimo4,
  );

  return {
    provisionDecimo3,
    provisionDecimo4,
    acumuladoDecimo3,
    acumuladoDecimo4,
    pagoDecimo3,
    pagoDecimo4,
    decimoTercero: 0,
    decimoCuarto: 0,
    enVentanaPagoDecimo3: enVentanaPagoDecimoTercero(fechaFin),
    enVentanaPagoDecimo4: enVentanaPagoDecimoCuarto(fechaFin, region),
  };
}
