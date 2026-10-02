export function monthRange(year, monthIndex) {
  const start = new Date(Date.UTC(Number(year), monthIndex, 1));
  const end = new Date(Date.UTC(Number(year), monthIndex + 1, 0));
  return { desde: start.toISOString().slice(0, 10), hasta: end.toISOString().slice(0, 10) };
}
export const yearRange = year => ({ desde: `${year}-01-01`, hasta: `${year}-12-31` });
// Annual series feed comparison charts; headline totals use one selected month.
export function totalsForMonth(series, month) {
  return Object.fromEntries(Object.entries(series).map(([name, values]) => [name, Number(values?.[month]) || 0]));
}
export const percentageChange = (current, previous) => previous === 0 ? null : (current - previous) / Math.abs(previous) * 100;
export const formatBalanceMoney = value => Number(value || 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function surveyPresentation(stats = {}) {
  const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const satVal = count(stats.satisfechos), neuVal = count(stats.neutros), incVal = count(stats.inconformes);
  const totalVal = satVal + neuVal + incVal;
  const pct = value => totalVal ? Math.round(value / totalVal * 1000) / 10 : 0;
  return { totalVal, satVal, neuVal, incVal, displaySatPct: pct(satVal), displayNeuPct: pct(neuVal), displayIncPct: pct(incVal),
    message: totalVal === 0 ? 'Sin encuestas respondidas en este período.' : satVal > totalVal / 2 ? 'La mayoría de las respuestas recibidas son favorables.' : 'Resultados calculados únicamente con las encuestas respondidas en este período.' };
}
