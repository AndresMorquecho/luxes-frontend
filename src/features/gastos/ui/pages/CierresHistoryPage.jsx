import React, { useState, useEffect } from 'react';
import { getCierres } from '../../application/gastosService';
import { toast } from 'react-hot-toast';
import { Clock, User, ClipboardCheck, BarChart3, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = (num) => {
  return Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const esMetodoEfectivo = (nombre) => {
  if (!nombre) return false;
  const n = nombre.toLowerCase();
  return n.includes('efectivo') || n.includes('caja') || n.includes('cash');
};

export const CierresHistoryPage = () => {
  const [cierreHistory, setCierreHistory] = useState([]);
  const [loadingCierreHistory, setLoadingCierreHistory] = useState(false);
  const [selectedCierreDetail, setSelectedCierreDetail] = useState(null);

  const [dateRange, setDateRange] = useState({ desde: '', hasta: '' });
  
  useEffect(() => {
    loadCierreHistory();
  }, []);

  const loadCierreHistory = async () => {
    setLoadingCierreHistory(true);
    try {
      const data = await getCierres();
      setCierreHistory(data || []);
    } catch (err) {
      toast.error('Error al cargar historial de cierres: ' + err.message);
    } finally {
      setLoadingCierreHistory(false);
    }
  };

  // Filter closures locally if date filter applied
  const filteredCierres = cierreHistory.filter(c => {
    if (!dateRange.desde && !dateRange.hasta) return true;
    const cDate = new Date(c.fecha);
    let start = true, end = true;
    if (dateRange.desde) {
      start = cDate >= new Date(dateRange.desde + 'T00:00:00');
    }
    if (dateRange.hasta) {
      end = cDate <= new Date(dateRange.hasta + 'T23:59:59');
    }
    return start && end;
  });

  return (
    <div className="p-6 xl:p-8 w-full animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/cierre-caja" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Historial de Cierres de Caja</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Registro histórico de todos los arqueos y cuadres de caja del sistema.
            </p>
          </div>
        </div>
        
        {/* Simple Date Filter */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Desde</span>
            <input 
              type="date" 
              value={dateRange.desde}
              onChange={(e) => setDateRange(prev => ({...prev, desde: e.target.value}))}
              className="text-xs font-semibold px-2 py-1 outline-none text-slate-700 bg-transparent"
            />
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Hasta</span>
            <input 
              type="date" 
              value={dateRange.hasta}
              onChange={(e) => setDateRange(prev => ({...prev, hasta: e.target.value}))}
              className="text-xs font-semibold px-2 py-1 outline-none text-slate-700 bg-transparent"
            />
          </div>
          {(dateRange.desde || dateRange.hasta) && (
            <button 
              onClick={() => setDateRange({ desde: '', hasta: '' })}
              className="ml-2 text-xs text-rose-500 font-bold hover:bg-rose-50 px-2 py-1 rounded-lg"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl overflow-hidden">
        {loadingCierreHistory ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 bg-slate-50/50 text-left font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Rango de Operación</th>
                  <th className="px-6 py-4">Fecha de Cierre</th>
                  <th className="px-6 py-4">Responsable</th>
                  <th className="px-6 py-4 text-right">Ingresos</th>
                  <th className="px-6 py-4 text-right">Egresos</th>
                  <th className="px-6 py-4 text-right">Balance Sistema</th>
                  <th className="px-6 py-4 text-center">Cuadre Físico</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {filteredCierres.map((c) => {
                  let cuadra = true;
                  let diferenciaText = 'Cuadró';
                  let diff = 0;
                  try {
                    const parsed = JSON.parse(c.metodosDetalle || '{}');
                    if (parsed.diferenciaEfectivo !== undefined) {
                      diff = Number(parsed.diferenciaEfectivo);
                      if (diff !== 0) {
                        cuadra = false;
                        diferenciaText = diff < 0 ? `Faltante: ${fmt(Math.abs(diff))}` : `Sobrante: ${fmt(diff)}`;
                      }
                    }
                  } catch (e) {}

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {c.fechaInicio.split('T')[0]} <span className="text-slate-400 font-normal">al</span> {c.fechaFin.split('T')[0]}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {new Date(c.fecha).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[9px]">
                          {(c.usuario?.nombre || 'AD').substring(0, 2).toUpperCase()}
                        </div>
                        {c.usuario?.nombre || 'Administrador'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 font-mono">{fmt(c.totalIngresos)}</td>
                      <td className="px-6 py-4 text-right font-bold text-red-500 font-mono">{fmt(c.totalEgresos)}</td>
                      <td className={`px-6 py-4 text-right font-black font-mono ${c.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {fmt(c.balance)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${cuadra ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : (diff < 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100')}`}>
                          {diferenciaText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedCierreDetail(c)}
                          className="text-blue-600 hover:text-white font-bold bg-blue-50 hover:bg-blue-600 border border-blue-100 px-4 py-1.5 rounded-lg transition-all text-[10px] uppercase tracking-wider shadow-sm"
                        >
                          Detalles
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredCierres.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 font-medium">
                      No se han encontrado cierres de caja con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLES */}
      {selectedCierreDetail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedCierreDetail(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <ClipboardCheck size={20} className="text-blue-600" />
                  Detalle del Cierre de Caja
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {selectedCierreDetail.fechaInicio.split('T')[0]} al {selectedCierreDetail.fechaFin.split('T')[0]}
                </p>
              </div>
              <button
                onClick={() => setSelectedCierreDetail(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 bg-white">
              {(() => {
                let parsed = { metodos: [], efectivoFisicoContado: 0, diferenciaEfectivo: 0, seccionIngresos: {}, seccionEgresos: {}, usuariosDetalle: [] };
                try {
                  parsed = JSON.parse(selectedCierreDetail.metodosDetalle || '{}');
                  if (Array.isArray(parsed)) {
                    parsed = { metodos: parsed, efectivoFisicoContado: 0, diferenciaEfectivo: 0, seccionIngresos: {}, seccionEgresos: {}, usuariosDetalle: [] };
                  }
                } catch (e) {}

                const metodosArr = parsed.metodos || [];
                const totalEfectivoEsperado = metodosArr.filter(m => esMetodoEfectivo(m.nombre)).reduce((acc, m) => acc + Number(m.balance), 0);
                const hasGlobalCash = parsed.efectivoFisicoContado !== undefined;

                return (
                  <div className="space-y-6">
                    {/* Info Header */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl text-[11px] md:text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold uppercase block text-[9px]">Registrado el</span>
                        <span className="font-bold text-slate-700">{new Date(selectedCierreDetail.fecha).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold uppercase block text-[9px]">Usuario</span>
                        <span className="font-bold text-slate-700">{selectedCierreDetail.usuario?.nombre || 'Administrador'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold uppercase block text-[9px]">Ingresos / Egresos</span>
                        <span className="font-bold text-slate-700 font-mono">{fmt(Number(selectedCierreDetail.totalIngresos))} / {fmt(Number(selectedCierreDetail.totalEgresos))}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold uppercase block text-[9px]">Balance Neto</span>
                        <span className={`font-bold font-mono ${Number(selectedCierreDetail.balance) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(Number(selectedCierreDetail.balance))}</span>
                      </div>
                    </div>

                    {/* Arqueo de Efectivo Físico Global */}
                    {hasGlobalCash && (
                      <div className="bg-violet-50/40 border border-violet-100 p-4 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="text-violet-600 font-bold uppercase tracking-wider block text-[9px]">Arqueo de Efectivo Físico</span>
                          <div className="flex gap-4 mt-1 font-semibold text-slate-700">
                            <span>Esperado: <strong className="font-mono text-slate-800">{fmt(totalEfectivoEsperado)}</strong></span>
                            <span>Físico Contado: <strong className="font-mono text-slate-800">{fmt(Number(parsed.efectivoFisicoContado))}</strong></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 font-semibold block text-[9px] uppercase">Diferencia</span>
                          <span className={`font-mono font-extrabold text-sm ${Number(parsed.diferenciaEfectivo) === 0 ? 'text-emerald-600' : Number(parsed.diferenciaEfectivo) < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                            {Number(parsed.diferenciaEfectivo) === 0 ? 'Cuadra' : (Number(parsed.diferenciaEfectivo) < 0 ? `Faltante: ${fmt(Math.abs(Number(parsed.diferenciaEfectivo)))}` : `Sobrante: ${fmt(Number(parsed.diferenciaEfectivo))}`)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Payment methods list with discrepancy */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Resumen por Métodos de Pago</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="py-2">Método</th>
                              <th className="py-2">Tipo</th>
                              <th className="py-2 text-right">Ingresos</th>
                              <th className="py-2 text-right">Egresos</th>
                              <th className="py-2 text-right">Monto Esperado</th>
                              <th className="py-2 text-right">Dinero Físico</th>
                              <th className="py-2 text-right">Diferencia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {metodosArr.map((m) => {
                              const esEfectivo = esMetodoEfectivo(m.nombre);
                              const hasFisico = m.montoFisico !== undefined;
                              const physical = hasFisico ? Number(m.montoFisico) : Number(m.balance);
                              const diff = hasFisico ? Number(m.diferencia) : 0;
                              return (
                                <tr key={m.metodoPagoId}>
                                  <td className="py-2.5 font-semibold text-slate-700">{m.nombre}</td>
                                  <td className="py-2.5">
                                    {esEfectivo ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                        Efectivo
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                                        Banco
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-right text-emerald-600 font-mono font-semibold">{fmt(Number(m.ingresos))}</td>
                                  <td className="py-2.5 text-right text-red-500 font-mono font-semibold">{fmt(Number(m.egresos))}</td>
                                  <td className="py-2.5 text-right font-mono font-bold text-slate-700">{fmt(Number(m.balance))}</td>
                                  <td className="py-2.5 text-right font-mono font-semibold text-slate-600">
                                    {esEfectivo ? (hasGlobalCash ? '—' : fmt(physical)) : fmt(Number(m.balance))}
                                  </td>
                                  <td className={`py-2.5 text-right font-mono font-bold ${esEfectivo && hasGlobalCash ? 'text-slate-400' : diff === 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                    {esEfectivo ? (hasGlobalCash ? 'Arqueo Global' : (diff === 0 ? 'Cuadra' : (diff < 0 ? `Faltante: ${fmt(Math.abs(diff))}` : `Sobrante: ${fmt(diff)}`))) : 'Cuadra'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section summaries */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-slate-100 p-4 rounded-xl">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1 flex items-center gap-2"><BarChart3 size={14} className="text-blue-500"/> Ingresos por Sección</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Abonos Iniciales:</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionIngresos?.abonosIniciales || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Abonos Posteriores:</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionIngresos?.abonosPosteriores || 0)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-100 p-4 rounded-xl">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1 flex items-center gap-2"><BarChart3 size={14} className="text-red-500"/> Egresos por Sección</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Gastos Generales:</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos?.gastosGenerales || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Gastos por Auto:</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos?.gastosAuto || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Órdenes de Compra:</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos?.gastosCompras || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-medium">Pagos (Nómina/Personal):</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos?.gastosPagos || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Users breakdown */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1 flex items-center gap-2"><User size={14} className="text-blue-500"/> Movimientos por Usuario</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="py-1.5">Usuario</th>
                              <th className="py-1.5 text-right">Ingresos</th>
                              <th className="py-1.5 text-right">Egresos</th>
                              <th className="py-1.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {(parsed.usuariosDetalle || []).map((u) => (
                              <tr key={u.id}>
                                <td className="py-2 font-semibold text-slate-700">{u.nombre}</td>
                                <td className="py-2 text-right text-emerald-600 font-mono font-bold">{fmt(Number(u.ingresos))}</td>
                                <td className="py-2 text-right text-red-500 font-mono font-bold">{fmt(Number(u.egresos))}</td>
                                <td className={`py-2 text-right font-mono font-bold ${Number(u.balance) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(Number(u.balance))}</td>
                              </tr>
                            ))}
                            {(parsed.usuariosDetalle || []).length === 0 && (
                              <tr>
                                <td colSpan={4} className="text-center py-2 text-slate-400">No se guardó desglose por usuarios para este periodo.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Observations */}
                    {selectedCierreDetail.observaciones && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observaciones / Notas</h4>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap font-medium">"{selectedCierreDetail.observaciones}"</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
