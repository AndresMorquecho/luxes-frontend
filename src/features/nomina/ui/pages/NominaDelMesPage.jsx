import React, { useEffect, useState, useCallback } from 'react';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { getPagosPorMes, marcarPagado, marcarPendiente, calcularSalarioMensual } from '../../application/nominaMesService';
import { getPersonInitials } from '../../../../shared/utils/personInitials.js';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const fmt = (n) => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const NominaDelMesPage = () => {
  const ahora = new Date();
  const [mes, setMes] = useState(ahora.getMonth());
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [empleados, setEmpleados] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const emps = await getEmpleados();
      setEmpleados(emps);
      const pagosData = await getPagosPorMes(mes + 1, anio);
      setPagos(pagosData);
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { load(); }, [load]);

  const handleTogglePago = async (emp) => {
    const yaPagado = pagos.find(p => p.empleadoId === emp.id);
    setPagando(emp.id);
    try {
      if (yaPagado) {
        await marcarPendiente(emp.id, mes + 1, anio);
        setPagos(prev => prev.filter(p => p.empleadoId !== emp.id));
      } else {
        const monto = calcularSalarioMensual(emp.sueldoDiario);
        await marcarPagado(emp.id, mes + 1, anio, monto);
        setPagos(prev => [...prev, { empleadoId: emp.id, monto, fechaPago: new Date().toISOString().split('T')[0], estado: 'pagado' }]);
      }
    } finally {
      setPagando(null);
    }
  };

  const rows = empleados.map(emp => {
    const salario = calcularSalarioMensual(emp.sueldoDiario);
    const pago = pagos.find(p => p.empleadoId === emp.id);
    return { ...emp, salario, pago };
  });

  const totalNomina = rows.reduce((s, r) => s + r.salario, 0);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const pendientes = rows.filter(r => !r.pago).length;

  return (
    <div className="p-6 xl:p-8 w-full animate-slide-up">

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Nómina del Mes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de pagos mensuales a colaboradores</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            {[anio - 1, anio, anio + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 border-t-2 border-t-blue-600 px-4 py-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colaboradores</p>
          <p className="text-lg font-bold text-blue-600 mt-1 tabular-nums">{empleados.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 border-t-2 border-t-blue-700 px-4 py-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total nómina</p>
          <p className="text-lg font-bold text-blue-700 mt-1 tabular-nums">{fmt(totalNomina)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 border-t-2 border-t-emerald-500 px-4 py-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pagado</p>
          <p className="text-lg font-bold text-emerald-600 mt-1 tabular-nums">{fmt(totalPagado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 border-t-2 border-t-amber-500 px-4 py-4" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes</p>
          <p className="text-lg font-bold text-amber-600 mt-1 tabular-nums">{pendientes}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-slate-700">{MESES[mes]} {anio}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400">{pagos.length} de {empleados.length} pagados</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Empleado</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Cargo</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Sueldo Diario</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Salario Mensual</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase w-28">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden normal-case leading-none"
                          style={{ backgroundColor: 'rgba(29,78,216,0.08)', color: '#1d4ed8' }}>
                          <span className="normal-case">{getPersonInitials(r.nombre)}</span>
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800 normal-case">{r.nombre}</div>
                          <div className="text-xs text-slate-400">{r.departamento}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{r.cargo}</td>
                    <td className="px-5 py-4 text-right font-mono text-slate-500">${r.sueldoDiario.toFixed(2)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800">{fmt(r.salario)}</td>
                    <td className="px-5 py-4 text-center">
                      {r.pago ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#16a34a' }} />
                          Pagado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: 'rgba(234,179,8,0.08)', color: '#eab308' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => handleTogglePago(r)}
                        disabled={pagando === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: r.pago ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.1)',
                          color: r.pago ? '#ef4444' : '#16a34a',
                        }}>
                        {pagando === r.id ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent" />
                        ) : r.pago ? 'Anular Pago' : 'Pagar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-16 text-slate-400 text-sm">No hay colaboradores registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/30">
            <span className="text-sm text-slate-500 font-medium">{empleados.length} colaboradores</span>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span>Total: {fmt(totalNomina)}</span>
              <span className="text-slate-300">|</span>
              <span style={{ color: '#16a34a' }}>Pagado: {fmt(totalPagado)}</span>
              {pendientes > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span style={{ color: '#eab308' }}>Pendiente: {fmt(totalNomina - totalPagado)}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
