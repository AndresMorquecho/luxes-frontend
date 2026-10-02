import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthRange, surveyPresentation, percentageChange } from './balancePresentation.js';

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
