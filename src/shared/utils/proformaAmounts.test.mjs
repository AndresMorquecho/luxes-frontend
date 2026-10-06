import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateProformaAmounts } from './proformaAmounts.js';

test('detail, list, PDF and project amounts preserve area quote and $170 balance', () => {
  const quote = { iva: 0, descuento: 0, items: [
    { cantidad: 1, precioUnitario: 102.05, valor: 60.00539999999999 },
    { cantidad: 1, precioUnitario: 101.52, valor: 169.99524 },
  ], abonos: [{ monto: 60 }] };
  assert.equal(calculateProformaAmounts(quote).total, 230);
  assert.equal(calculateProformaAmounts(quote).saldoPendiente, 170);
});
test('quoted values override dimensions, and discount plus VAT agree with backend contract', () => {
  const quote = { items: [{ valor: 200, cantidad: 1, precioUnitario: 1, ancho: 1, alto: 1 }], descuento: 20, iva: 0.15 };
  assert.equal(calculateProformaAmounts(quote).total, 207);
  assert.equal(calculateProformaAmounts({ ...quote, iva: 0 }).total, 180);
});
test('legacy dimensional and unit quotes, with rounded cents for remaining balance', () => {
  assert.equal(calculateProformaAmounts({ items: [{ cantidad: 2, ancho: 2, alto: 3, precioUnitario: 10 }] }).total, 120);
  assert.equal(calculateProformaAmounts({ items: [{ cantidad: 2, precioUnitario: 10 }], abonos: [{ monto: 19.99 }] }).saldoPendiente, 0.01);
});
