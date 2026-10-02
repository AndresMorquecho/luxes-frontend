import { useEffect, useState } from 'react';

const pending = new Map();
function requestReport(key, token) {
  const requestKey = `${key}:${token}`;
  if (!pending.has(requestKey)) {
    const request = fetch(`/api/gastos/reportes/balances?${key}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error?.message || 'Error al obtener los balances');
        return json.data;
      }).finally(() => pending.delete(requestKey));
    pending.set(requestKey, request);
  }
  return pending.get(requestKey);
}
export function useBalancesReport({ desde, hasta }, enabled = true) {
  const key = enabled ? new URLSearchParams({ desde, hasta }).toString() : '';
  const [result, setResult] = useState({ key: '', data: null, error: null });
  useEffect(() => {
    if (!key) return;
    let active = true;
    requestReport(key, localStorage.getItem('token')).then(
      data => { if (active) setResult({ key, data, error: null }); },
      error => { if (active) setResult({ key, data: null, error: error.message }); },
    );
    return () => { active = false; };
  }, [key]);
  const current = key && result.key === key;
  return { data: current ? result.data : null, error: current ? result.error : null, loading: Boolean(key && !current) };
}
