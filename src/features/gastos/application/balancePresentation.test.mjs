import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthRange, surveyPresentation, percentageChange, totalsForMonth } from './balancePresentation.js';

test('monthly summary excludes prior and later months from annual comparison series',()=>{
  const series={ingresos:{ENE:10000,AGO:20000,SEP:150,OCT:90000},egresos:{AGO:1000,SEP:50}};
  assert.deepEqual(totalsForMonth(series,'SEP'),{ingresos:150,egresos:50});
  assert.deepEqual(totalsForMonth(series,'AGO'),{ingresos:20000,egresos:1000});
  assert.deepEqual(totalsForMonth(series,'FEB'),{ingresos:0,egresos:0});
  assert.deepEqual(totalsForMonth({ventas:{AGO:900,SEP:115},gastos:{ENE:999,SEP:30}},'SEP'),{ventas:115,gastos:30});
});

test('growth has no invented percentage without a baseline and handles negative results',()=>{
  assert.equal(percentageChange(100,0),null);
  assert.equal(percentageChange(0,0),null);
  assert.equal(percentageChange(120,100),20);
  assert.equal(percentageChange(-50,-100),50);
});
test('month selection respects year transitions and leap years',()=>{
  assert.deepEqual(monthRange(2026,8),{desde:'2026-09-01',hasta:'2026-09-30'});
  assert.deepEqual(monthRange(2026,-1),{desde:'2025-12-01',hasta:'2025-12-31'});
  assert.equal(monthRange(2024,1).hasta,'2024-02-29');
  assert.equal(monthRange(2025,1).hasta,'2025-02-28');
});
test('no surveys means three empty bars even when clients exist',()=>{
  const view=surveyPresentation({totalClientes:70});
  assert.equal(view.totalVal,0);
  assert.deepEqual([view.displaySatPct,view.displayNeuPct,view.displayIncPct],[0,0,0]);
  assert.match(view.message,/Sin encuestas/);
});
test('percentages use real response counts, never missing customers as dissatisfied',()=>{
  const view=surveyPresentation({totalClientes:70,satisfechos:1,neutros:1,inconformes:2});
  assert.equal(view.totalVal,4);
  assert.deepEqual([view.displaySatPct,view.displayNeuPct,view.displayIncPct],[25,25,50]);
  assert.doesNotMatch(view.message,/mayoría/);
});
