import React, { useState, useEffect } from 'react';
import { getCierres, deleteCierre } from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { ClipboardCheck, ArrowLeft, Trash2, X, Eye, User, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { CierrePDFPreviewModal } from '../components/CierrePDFPreviewModal';

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
    <div className="space-y-3 sm:space-y-5 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/cierre-caja"
              className="w-11 h-11 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Historial de cierres</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Arqueo
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Registro histórico de arqueos y cuadres de caja
              </p>
            </div>
          </div>

          <DateRangePicker
            value={{ start: dateRange.desde, end: dateRange.hasta }}
            onChange={val => setDateRange({ desde: val.start, hasta: val.end })}
            placeholder="Seleccionar rango"
          />
        </div>
      </div>

      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        {loadingCierreHistory ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-200 border-t-blue-500" />
            <span className="text-xs text-slate-400">Cargando historial...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Rango de operación</th>
                  <th className="px-4 py-3">Fecha de cierre</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3 text-right">Ingresos</th>
                  <th className="px-4 py-3 text-right">Egresos</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Cuadre físico</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
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
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {c.fechaInicio.split('T')[0]} <span className="text-slate-400 font-normal">al</span> {c.fechaFin.split('T')[0]}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(c.fecha).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600">
                        {c.usuario?.nombre || 'Administrador'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmt(c.totalIngresos)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-600 tabular-nums">{fmt(c.totalEgresos)}</td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${c.balance >= 0 ? 'text-slate-800' : 'text-amber-700'}`}>
                        {fmt(c.balance)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          cuadra
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : (diff < 0
                              ? 'bg-rose-50 text-rose-700 border-rose-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100')
                        }`}>
                          {diferenciaText}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPdfCierre(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            <Eye size={12} /> Ver
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCierre(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

      {selectedCierreDetail && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelectedCierreDetail(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl border border-blue-100 bg-blue-50 flex items-center justify-center shrink-0">
                  <ClipboardCheck size={18} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800">Cierre de caja</h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {selectedCierreDetail.fechaInicio.split('T')[0]} al {selectedCierreDetail.fechaFin.split('T')[0]}
                    <span className="mx-1.5 text-slate-300">·</span>
                    {selectedCierreDetail.usuario?.nombre || 'Administrador'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCierre(selectedCierreDetail)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 border border-rose-100 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedCierreDetail(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-5 bg-slate-50/40">
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
                const diffEfectivo = Number(parsed.diferenciaEfectivo || 0);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-xs text-slate-500 font-medium">Registrado</p>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{new Date(selectedCierreDetail.fecha).toLocaleString()}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-xs text-slate-500 font-medium">Ingresos</p>
                        <p className="text-base font-bold text-slate-800 mt-1 tabular-nums">{fmt(Number(selectedCierreDetail.totalIngresos))}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-xs text-slate-500 font-medium">Egresos</p>
                        <p className="text-base font-bold text-slate-800 mt-1 tabular-nums">{fmt(Number(selectedCierreDetail.totalEgresos))}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <p className="text-xs text-slate-500 font-medium">Balance</p>
                        <p className={`text-base font-bold mt-1 tabular-nums ${Number(selectedCierreDetail.balance) >= 0 ? 'text-slate-800' : 'text-amber-700'}`}>
                          {fmt(Number(selectedCierreDetail.balance))}
                        </p>
                      </div>
                    </div>

                    {hasGlobalCash && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-wrap justify-between items-center gap-3">
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-xs text-slate-500 font-medium block">Esperado en sistema</span>
                            <span className="text-sm font-bold tabular-nums text-slate-800">{fmt(totalEfectivoEsperado)}</span>
                          </div>
                          <div className="w-px h-8 bg-slate-200" />
                          <div>
                            <span className="text-xs text-slate-500 font-medium block">Físico contado</span>
                            <span className="text-sm font-bold tabular-nums text-slate-800">{fmt(Number(parsed.efectivoFisicoContado))}</span>
                          </div>
                        </div>
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          diffEfectivo === 0
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : (diffEfectivo < 0
                              ? 'bg-rose-50 border-rose-100 text-rose-700'
                              : 'bg-amber-50 border-amber-100 text-amber-700')
                        }`}>
                          {diffEfectivo === 0
                            ? 'Caja cuadrada'
                            : (diffEfectivo < 0
                              ? `Faltante: ${fmt(Math.abs(diffEfectivo))}`
                              : `Sobrante: ${fmt(diffEfectivo)}`)}
                        </span>
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <h4 className="text-sm font-semibold text-slate-800">Resumen por métodos de pago</h4>
                      </div>
                      <div className="overflow-x-auto px-4">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="py-2.5 pr-3">Método</th>
                              <th className="py-2.5 pr-3">Tipo</th>
                              <th className="py-2.5 pr-3 text-right">Ingresos</th>
                              <th className="py-2.5 pr-3 text-right">Egresos</th>
                              <th className="py-2.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {metodosArr.map((m) => {
                              const esEfectivo = esMetodoEfectivo(m.nombre);
                              return (
                                <tr key={m.metodoPagoId}>
                                  <td className="py-3 pr-3 font-semibold text-slate-700">{m.nombre}</td>
                                  <td className="py-3 pr-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                      esEfectivo
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                      {esEfectivo ? 'Efectivo / Caja' : 'Banco / Digital'}
                                    </span>
                                  </td>
                                  <td className="py-3 pr-3 text-right text-emerald-700 font-semibold tabular-nums">{fmt(Number(m.ingresos))}</td>
                                  <td className="py-3 pr-3 text-right text-rose-600 font-semibold tabular-nums">{fmt(Number(m.egresos))}</td>
                                  <td className={`py-3 text-right font-bold tabular-nums ${Number(m.balance) >= 0 ? 'text-slate-800' : 'text-amber-700'}`}>
                                    {fmt(Number(m.balance))}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h4 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                          <BarChart3 size={13} className="text-slate-400" /> Ingresos
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Abonos iniciales</span>
                            <span className="font-semibold text-slate-800 tabular-nums">{fmt(parsed.seccionIngresos?.abonosIniciales || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Abonos posteriores</span>
                            <span className="font-semibold text-slate-800 tabular-nums">{fmt(parsed.seccionIngresos?.abonosPosteriores || 0)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h4 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                          <BarChart3 size={13} className="text-slate-400" /> Egresos
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Gastos generales</span>
                            <span className="font-semibold text-slate-800 tabular-nums">{fmt(parsed.seccionEgresos?.gastosGenerales || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Gastos por auto</span>
                            <span className="font-semibold text-slate-800 tabular-nums">{fmt(parsed.seccionEgresos?.gastosAuto || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Órdenes de compra</span>
                            <span className="font-semibold text-slate-800 tabular-nums">{fmt(parsed.seccionEgresos?.gastosCompras || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Pagos personal</span>
                            <span className="font-semibold text-slate-800 tabular-nums">{fmt(parsed.seccionEgresos?.gastosPagos || 0)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h4 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" /> Por usuario
                        </h4>
                        <div className="space-y-2 text-xs">
                          {(parsed.usuariosDetalle || []).map((u) => (
                            <div key={u.id} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                              <span className="font-medium text-slate-700 truncate max-w-[100px]">{u.nombre}</span>
                              <div className="flex items-center gap-3 tabular-nums text-[11px]">
                                <span className="text-emerald-700 font-semibold">{fmt(Number(u.ingresos))}</span>
                                <span className="text-rose-600 font-semibold">{fmt(Number(u.egresos))}</span>
                              </div>
                            </div>
                          ))}
                          {(parsed.usuariosDetalle || []).length === 0 && (
                            <p className="text-slate-400 text-center py-2">Sin desglose</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedCierreDetail.observaciones && (
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h4 className="text-xs font-semibold text-slate-800 mb-2">Observaciones</h4>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedCierreDetail.observaciones}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <CierrePDFPreviewModal isOpen={!!pdfCierre} onClose={() => setPdfCierre(null)} cierre={pdfCierre} />
    </div>
  );
};
