import React, { useState, useEffect } from 'react';
import { getCierres, deleteCierre } from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { Clock, User, ClipboardCheck, BarChart3, ArrowLeft, Trash2, X, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { CierrePDFPreviewModal } from '../components/CierrePDFPreviewModal';
import { ExcelCierreSheet } from '../components/ExcelCierreSheet';

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
  const [pdfCierre, setPdfCierre] = useState(null);
  const [dateRange, setDateRange] = useState({ desde: '', hasta: '' });

  // Determine if admin
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const userRole = (storedUser?.rol || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';

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

  const handleDeleteCierre = async (cierre) => {
    const confirmed = await confirmDialog(
      'Eliminar Cierre de Caja',
      `¿Está seguro de eliminar el cierre del período ${cierre.fechaInicio.split('T')[0]} al ${cierre.fechaFin.split('T')[0]}? Esto desbloqueará todas las operaciones financieras de ese período.`
    );
    if (!confirmed) return;
    try {
      await deleteCierre(cierre.id);
      toast.success('Cierre de caja eliminado. Las operaciones del período han sido desbloqueadas.');
      setSelectedCierreDetail(null);
      loadCierreHistory();
    } catch (err) {
      toast.error(err.message);
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

        <div className="flex items-center">
          <DateRangePicker
            value={{ start: dateRange.desde, end: dateRange.hasta }}
            onChange={val => setDateRange({ desde: val.start, hasta: val.end })}
            placeholder="Seleccionar rango"
          />
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
                  } catch (e) { }

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {c.fechaInicio.split('T')[0]} <span className="text-slate-400 font-normal">al</span> {c.fechaFin.split('T')[0]}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {new Date(c.fecha).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[9px]">
                            {(c.usuario?.nombre || 'AD').substring(0, 2).toUpperCase()}
                          </div>
                          {c.usuario?.nombre || 'Administrador'}
                        </div>
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPdfCierre(c)}
                            className="text-blue-600 hover:text-white font-bold bg-blue-50 hover:bg-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg transition-all text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1"
                          >
                            <Eye size={12} /> Ver
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteCierre(c)}
                              className="text-red-500 hover:text-white font-bold bg-red-50 hover:bg-red-500 border border-red-100 p-1.5 rounded-lg transition-all shadow-sm"
                              title="Eliminar cierre"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
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

      {/* MODAL DE DETALLES — Rediseñado */}
      {selectedCierreDetail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedCierreDetail(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up border border-slate-200/60">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <ClipboardCheck size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">
                    Cierre de Caja
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {selectedCierreDetail.fechaInicio.split('T')[0]} al {selectedCierreDetail.fechaFin.split('T')[0]}
                    <span className="mx-2 text-slate-300">•</span>
                    {selectedCierreDetail.usuario?.nombre || 'Administrador'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteCierre(selectedCierreDetail)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-100 hover:border-red-500 text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                )}
                <button
                  onClick={() => setSelectedCierreDetail(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6 bg-slate-50/30">
              {(() => {
                let parsed = { metodos: [], efectivoFisicoContado: 0, diferenciaEfectivo: 0, seccionIngresos: {}, seccionEgresos: {}, usuariosDetalle: [] };
                try {
                  parsed = JSON.parse(selectedCierreDetail.metodosDetalle || '{}');
                  if (Array.isArray(parsed)) {
                    parsed = { metodos: parsed, efectivoFisicoContado: 0, diferenciaEfectivo: 0, seccionIngresos: {}, seccionEgresos: {}, usuariosDetalle: [] };
                  }
                } catch (e) { }

                const metodosArr = parsed.metodos || [];
                const totalEfectivoEsperado = metodosArr.filter(m => esMetodoEfectivo(m.nombre)).reduce((acc, m) => acc + Number(m.balance), 0);
                const hasGlobalCash = parsed.efectivoFisicoContado !== undefined;
                const diffEfectivo = Number(parsed.diferenciaEfectivo || 0);

                return (
                  <div className="space-y-5">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registrado</div>
                        <div className="text-xs font-bold text-slate-700 mt-1">{new Date(selectedCierreDetail.fecha).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm border-l-4 border-l-emerald-500">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ingresos</div>
                        <div className="text-base font-extrabold text-emerald-600 mt-1 font-mono">{fmt(Number(selectedCierreDetail.totalIngresos))}</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm border-l-4 border-l-red-500">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Egresos</div>
                        <div className="text-base font-extrabold text-red-500 mt-1 font-mono">{fmt(Number(selectedCierreDetail.totalEgresos))}</div>
                      </div>
                      <div className={`bg-white rounded-xl p-4 border shadow-sm border-l-4 ${Number(selectedCierreDetail.balance) >= 0 ? 'border-blue-100 border-l-blue-500' : 'border-amber-100 border-l-amber-500'}`}>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Balance</div>
                        <div className={`text-base font-extrabold mt-1 font-mono ${Number(selectedCierreDetail.balance) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(Number(selectedCierreDetail.balance))}</div>
                      </div>
                    </div>

                    {/* Arqueo de Efectivo */}
                    {hasGlobalCash && (
                      <div className={`rounded-xl p-4 border flex flex-wrap justify-between items-center gap-3 ${diffEfectivo === 0 ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-rose-50/50 border-rose-200/60'}`}>
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Esperado en Sistema</span>
                            <span className="text-sm font-extrabold font-mono text-slate-800">{fmt(totalEfectivoEsperado)}</span>
                          </div>
                          <div className="w-px h-8 bg-slate-200" />
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Físico Contado</span>
                            <span className="text-sm font-extrabold font-mono text-slate-800">{fmt(Number(parsed.efectivoFisicoContado))}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${diffEfectivo === 0 ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : (diffEfectivo < 0 ? 'bg-red-100 border-red-200 text-red-700' : 'bg-amber-100 border-amber-200 text-amber-700')}`}>
                            {diffEfectivo === 0 ? '✓ Caja Cuadrada' : (diffEfectivo < 0 ? `Faltante: ${fmt(Math.abs(diffEfectivo))}` : `Sobrante: ${fmt(diffEfectivo)}`)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Métodos de Pago */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Resumen por Métodos de Pago</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <th className="px-5 py-2.5">Método</th>
                              <th className="px-5 py-2.5">Tipo</th>
                              <th className="px-5 py-2.5 text-right">Ingresos</th>
                              <th className="px-5 py-2.5 text-right">Egresos</th>
                              <th className="px-5 py-2.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {metodosArr.map((m) => {
                              const esEfectivo = esMetodoEfectivo(m.nombre);
                              return (
                                <tr key={m.metodoPagoId} className="hover:bg-slate-50/50">
                                  <td className="px-5 py-3 font-semibold text-slate-700">{m.nombre}</td>
                                  <td className="px-5 py-3">
                                    {esEfectivo ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">Efectivo / Caja</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">Banco / Digital</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-right text-emerald-600 font-mono font-semibold">{fmt(Number(m.ingresos))}</td>
                                  <td className="px-5 py-3 text-right text-red-500 font-mono font-semibold">{fmt(Number(m.egresos))}</td>
                                  <td className={`px-5 py-3 text-right font-mono font-bold ${Number(m.balance) >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(Number(m.balance))}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Secciones + Usuarios Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Ingresos por Sección */}
                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <BarChart3 size={13} className="text-emerald-500" /> Ingresos
                        </h4>
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Abonos Iniciales</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionIngresos?.abonosIniciales || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Abonos Posteriores</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionIngresos?.abonosPosteriores || 0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Egresos por Sección */}
                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <BarChart3 size={13} className="text-red-500" /> Egresos
                        </h4>
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Gastos Generales</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos?.gastosGenerales || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Gastos por Auto</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos?.gastosAuto || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Órdenes de Compra</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos?.gastosCompras || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Pagos Personal</span>
                            <span className="font-bold text-slate-700 font-mono">{fmt(parsed.seccionEgresos?.gastosPagos || 0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Usuarios */}
                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <User size={13} className="text-blue-500" /> Por Usuario
                        </h4>
                        <div className="space-y-2 text-xs">
                          {(parsed.usuariosDetalle || []).map((u) => (
                            <div key={u.id} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                              <span className="font-semibold text-slate-700 truncate max-w-[100px]">{u.nombre}</span>
                              <div className="flex items-center gap-3 font-mono text-[10px]">
                                <span className="text-emerald-600 font-bold">{fmt(Number(u.ingresos))}</span>
                                <span className="text-red-500 font-bold">{fmt(Number(u.egresos))}</span>
                              </div>
                            </div>
                          ))}
                          {(parsed.usuariosDetalle || []).length === 0 && (
                            <p className="text-slate-400 text-center py-2">Sin desglose</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Observaciones */}
                    {selectedCierreDetail.observaciones && (
                      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">Observaciones</h4>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">"{selectedCierreDetail.observaciones}"</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW PDF CIERRE */}
      <CierrePDFPreviewModal isOpen={!!pdfCierre} onClose={() => setPdfCierre(null)} cierre={pdfCierre} />
    </div>
  );
};
