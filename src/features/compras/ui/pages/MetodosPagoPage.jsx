import React, { useEffect, useState, useCallback } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import {
  getMetodosPago, createMetodoPago, updateMetodoPago, deleteMetodoPago
} from '../../application/comprasService';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { ComprasPageHeader, ComprasHeaderButton } from '../components/ComprasPageHeader';
import './ComprasPage.css';

const getInitialRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  
  // Last day of current month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  return { start, end };
};

const formatUSD = (val) => {
  if (val === undefined || val === null) return '$0,00';
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(val);
};

export const MetodosPagoPage = () => {
  const [metodos, setMetodos] = useState([]);
  const [metodosLoading, setMetodosLoading] = useState(true);
  const [metodoFormOpen, setMetodoFormOpen] = useState(false);
  const [editingMetodo, setEditingMetodo] = useState(null);
  const [dateRange, setDateRange] = useState(getInitialRange());
  const [metodoForm, setMetodoForm] = useState({ nombre: '', descripcion: '', tipo: 'EFECTIVO' });
  const [metodoSaving, setMetodoSaving] = useState(false);

  const loadMetodos = useCallback(async () => {
    setMetodosLoading(true);
    try {
      const m = await getMetodosPago(dateRange.start, dateRange.end);
      setMetodos(m);
    } catch {
      setMetodos([]);
    } finally {
      setMetodosLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    loadMetodos();
  }, [loadMetodos]);

  const openNewMetodo = () => {
    setEditingMetodo(null);
    setMetodoForm({ nombre: '', descripcion: '', tipo: 'EFECTIVO' });
    setMetodoFormOpen(true);
  };

  const openEditMetodo = (m) => {
    setEditingMetodo(m);
    setMetodoForm({ nombre: m.nombre, descripcion: m.descripcion || '', tipo: m.tipo || 'EFECTIVO' });
    setMetodoFormOpen(true);
  };

  const handleMetodoSave = async (e) => {
    e.preventDefault();
    setMetodoSaving(true);
    try {
      if (editingMetodo) {
        await updateMetodoPago(editingMetodo.id, metodoForm);
      } else {
        await createMetodoPago(metodoForm);
      }
      setMetodoFormOpen(false);
      loadMetodos();
    } catch (err) {
      alert(err.message);
    } finally {
      setMetodoSaving(false);
    }
  };

  const handleMetodoDelete = async (id) => {
    if (!window.confirm('¿Eliminar este método de pago?')) return;
    try {
      await deleteMetodoPago(id);
      loadMetodos();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMetodoToggle = async (m) => {
    try {
      await updateMetodoPago(m.id, { activo: !m.activo });
      loadMetodos();
    } catch (err) {
      alert(err.message);
    }
  };

  // Cumulative Calculations (Active only)
  const totalEfectivo = metodos
    .filter(m => m.activo && m.tipo === 'EFECTIVO')
    .reduce((sum, m) => sum + (m.saldoActual || 0), 0);

  const totalBanco = metodos
    .filter(m => m.activo && m.tipo === 'BANCO')
    .reduce((sum, m) => sum + (m.saldoActual || 0), 0);

  const totalGeneral = totalEfectivo + totalBanco;

  // Period Calculations (Active only)
  const ingresosPeriodo = metodos
    .filter(m => m.activo)
    .reduce((sum, m) => sum + (m.ingresosPeriod || 0), 0);

  const egresosPeriodo = metodos
    .filter(m => m.activo)
    .reduce((sum, m) => sum + (m.egresosPeriod || 0), 0);

  const balancePeriodo = ingresosPeriodo - egresosPeriodo;

  return (
    <div className="co-page animate-slide-up">
      <ComprasPageHeader
        title="Métodos de Pago"
        subtitle="Administración de canales de cobro y pago (Caja Chica, Banco, etc.)"
        action={(
          <ComprasHeaderButton onClick={openNewMetodo} id="btn-nuevo-metodo">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Nuevo Método
          </ComprasHeaderButton>
        )}
      />

      {/* KPI Cards (Acumulados) */}
      <div className="co-kpi-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Total Efectivo */}
        <div className="co-card co-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="co-kpi-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <div className="co-kpi-label">Total Efectivo</div>
            <div className="co-kpi-value text-emerald-600" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatUSD(totalEfectivo)}</div>
          </div>
        </div>

        {/* Total Banco */}
        <div className="co-card co-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="co-kpi-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <div className="co-kpi-label">Total Banco</div>
            <div className="co-kpi-value text-blue-600" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatUSD(totalBanco)}</div>
          </div>
        </div>

        {/* Total General */}
        <div className="co-card co-kpi-card" style={{ borderLeft: '4px solid #64748b' }}>
          <div className="co-kpi-icon" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <div className="co-kpi-label">Total General</div>
            <div className="co-kpi-value text-slate-800" style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatUSD(totalGeneral)}</div>
          </div>
        </div>
      </div>

      {/* Filter and Period Stats Bar */}
      <div className="co-card flex items-center justify-between p-4 mb-6 gap-4 flex-wrap bg-white" style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="co-label" style={{ marginBottom: '4px' }}>Rango de Fechas</div>
            <DateRangePicker 
              value={dateRange} 
              onChange={setDateRange} 
              className="w-64"
            />
          </div>
          <div className="text-slate-400 max-w-[200px]" style={{ fontSize: '10px', fontWeight: 600, lineHeight: '1.3', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Filtra movimientos por rango de fechas para ver ingresos/egresos del periodo
          </div>
        </div>

        <div className="flex items-center gap-8 flex-wrap">
          <div className="text-right">
            <div className="co-label" style={{ marginBottom: '2px', color: '#10b981' }}>Ingresos Periodo</div>
            <div className="text-emerald-600 font-bold text-lg">
              {ingresosPeriodo > 0 ? `+${formatUSD(ingresosPeriodo)}` : formatUSD(ingresosPeriodo)}
            </div>
          </div>
          <div className="text-right">
            <div className="co-label" style={{ marginBottom: '2px', color: '#ef4444' }}>Egresos Periodo</div>
            <div className="text-red-500 font-bold text-lg">
              {egresosPeriodo > 0 ? `-${formatUSD(egresosPeriodo)}` : formatUSD(egresosPeriodo)}
            </div>
          </div>
          <div className="text-right" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '2rem' }}>
            <div className="co-label" style={{ marginBottom: '2px', color: '#1e293b' }}>Balance Periodo</div>
            <div className="text-slate-800 font-extrabold text-lg">
              {formatUSD(balancePeriodo)}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="co-card co-table-card">
        <div className="co-table-header">
          <h2 className="text-sm font-bold text-slate-800 flex-1">Detalle de Cuentas</h2>
        </div>
        {metodosLoading ? (
          <div className="co-loader-box"><div className="co-spinner" /></div>
        ) : (
          <>
            <style>{`
              @media (min-width: 768px) {
                .mp-desktop-table { display: block; }
                .mp-mobile-cards { display: none; }
              }
              @media (max-width: 767px) {
                .mp-desktop-table { display: none; }
                .mp-mobile-cards { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
                .mp-mobile-card {
                  background: #ffffff;
                  border: 1px solid #f1f5f9;
                  border-radius: 14px;
                  padding: 16px;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                }
              }
            `}</style>

            <div className="overflow-x-auto mp-desktop-table">
              <table className="co-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Saldo Actual</th>
                    <th className="text-emerald-600">Ingresos (P)</th>
                    <th className="text-red-500">Egresos (P)</th>
                    <th>Neto (P)</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {metodos.map(m => {
                    const isEfectivo = m.tipo === 'EFECTIVO';
                    return (
                      <tr key={m.id} className="co-tr">
                        <td className="font-semibold text-slate-800">{m.nombre}</td>
                        <td>
                          <span className={`co-badge-pill ${isEfectivo ? 'co-badge-pill-emerald' : 'co-badge-pill-blue'}`}>
                            {m.tipo || 'EFECTIVO'}
                          </span>
                        </td>
                        <td className="font-medium text-slate-800">{formatUSD(m.saldoActual)}</td>
                        <td className="text-emerald-600 font-semibold">
                          {m.ingresosPeriod > 0 ? `+${formatUSD(m.ingresosPeriod)}` : '—'}
                        </td>
                        <td className="text-red-500 font-semibold">
                          {m.egresosPeriod > 0 ? `-${formatUSD(m.egresosPeriod)}` : '—'}
                        </td>
                        <td className="font-bold text-slate-700">{formatUSD(m.netoPeriod)}</td>
                        <td className="text-center">
                          <button
                            onClick={() => handleMetodoToggle(m)}
                            className={`co-toggle ${m.activo ? 'co-toggle-active' : ''}`}
                            title={m.activo ? 'Desactivar' : 'Activar'}
                          >
                            <span className="co-toggle-dot" />
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditMetodo(m)} className="co-action-btn co-action-blue" title="Editar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button onClick={() => handleMetodoDelete(m.id)} className="co-action-btn co-action-red" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {metodos.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm font-medium">No hay métodos de pago registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mp-mobile-cards">
              {metodos.map(m => {
                const isEfectivo = m.tipo === 'EFECTIVO';
                return (
                  <div key={m.id} className="mp-mobile-card">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">{m.nombre}</span>
                      <span className={`co-badge-pill ${isEfectivo ? 'co-badge-pill-emerald' : 'co-badge-pill-blue'}`}>
                        {m.tipo || 'EFECTIVO'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Saldo Actual</span>
                        <span className="font-semibold text-slate-800">{formatUSD(m.saldoActual)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Neto Periodo</span>
                        <span className="font-bold text-slate-700">{formatUSD(m.netoPeriod)}</span>
                      </div>
                      <div className="text-emerald-600">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">Ingresos (P)</span>
                        <span className="font-semibold">{m.ingresosPeriod > 0 ? `+${formatUSD(m.ingresosPeriod)}` : '—'}</span>
                      </div>
                      <div className="text-red-500">
                        <span className="text-[10px] text-red-400 font-bold uppercase block">Egresos (P)</span>
                        <span className="font-semibold">{m.egresosPeriod > 0 ? `-${formatUSD(m.egresosPeriod)}` : '—'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Estado:</span>
                        <button
                          onClick={() => handleMetodoToggle(m)}
                          className={`co-toggle ${m.activo ? 'co-toggle-active' : ''}`}
                          title={m.activo ? 'Desactivar' : 'Activar'}
                        >
                          <span className="co-toggle-dot" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditMetodo(m)} className="co-action-btn co-action-blue p-1.5" title="Editar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button onClick={() => handleMetodoDelete(m.id)} className="co-action-btn co-action-red p-1.5" title="Eliminar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {metodos.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm font-medium">No hay métodos de pago registrados</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* New/Edit Modal */}
      {metodoFormOpen && (
        <ModalPortal>
        <>
          <div className="co-overlay" onClick={() => setMetodoFormOpen(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal animate-co-modal-in" style={{ maxWidth: '420px' }}>
              <div className="co-modal-header">
                <h2 className="text-lg font-bold text-slate-800">{editingMetodo ? 'Editar Método' : 'Nuevo Método de Pago'}</h2>
                <button type="button" onClick={() => setMetodoFormOpen(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="co-modal-body">
                <form onSubmit={handleMetodoSave} className="space-y-4">
                  <div>
                    <label className="co-label">Nombre</label>
                    <input className="co-input" value={metodoForm.nombre} placeholder="Ej: Caja Chica, Diego Guayaquil 6357, Transferencia…"
                      onChange={e => setMetodoForm(p => ({ ...p, nombre: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="co-label">Tipo de Cuenta</label>
                    <select className="co-input" value={metodoForm.tipo}
                      onChange={e => setMetodoForm(p => ({ ...p, tipo: e.target.value }))}>
                      <option value="EFECTIVO">EFECTIVO (Caja Principal, Caja Chica, etc.)</option>
                      <option value="BANCO">BANCO (Cuentas bancarias, Transferencia, etc.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="co-label">Descripción</label>
                    <input className="co-input" value={metodoForm.descripcion} placeholder="Opcional"
                      onChange={e => setMetodoForm(p => ({ ...p, descripcion: e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setMetodoFormOpen(false)} className="co-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={metodoSaving} className="co-btn-primary">
                      {metodoSaving && <div className="co-spinner-sm" />}
                      {editingMetodo ? 'Guardar' : 'Crear Método'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
        </ModalPortal>
      )}
    </div>
  );
};
