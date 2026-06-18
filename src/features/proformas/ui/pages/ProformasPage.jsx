import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getProformas, deleteProforma, updateProformaEstado } from '../../application/proformasService';
import { ProformaPDF } from '../components/ProformaPDF';
import { getConfiguracion } from '../../../configuracion/application/configuracionService';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';
import { getMetodosPago } from '../../../gastos/application/gastosService';

const ESTADOS = ['Pendiente', 'Aprobada', 'Rechazada', 'Pagada'];

export const ProformasPage = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [configuracion, setConfiguracion] = useState(null);
  
  // Métodos de Pago
  const [metodosPago, setMetodosPago] = useState([]);
  const [paymentMethodModal, setPaymentMethodModal] = useState(null);
  const [selectedMetodoId, setSelectedMetodoId] = useState('');
  
  // Filtros
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Paginación
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    getMetodosPago()
      .then(data => {
        setMetodosPago(data || []);
        if (data && data.length > 0) {
          setSelectedMetodoId(data[0].id);
        }
      })
      .catch(err => console.error('Error cargando métodos de pago:', err));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        page,
        limit: 20,
        search: search.trim(),
        estado: estado,
        fechaDesde: dateRange.start,
        fechaHasta: dateRange.end,
      };

      const [response, config] = await Promise.all([
        getProformas(filters),
        getConfiguracion().catch(() => null)
      ]);
      
      setProformas(response.data || []);
      setPagination(response.pagination || { total: 0, totalPages: 1 });
      setConfiguracion(config);
    } catch (e) {
      console.error(e);
      setProformas([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, estado, dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [search, estado, dateRange]);

  const openNew = () => {
    navigate('/proformas/nueva');
  };

  const openEdit = (p) => {
    navigate(`/proformas/editar/${p.id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta proforma?')) return;
    try {
      await deleteProforma(id);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEstado = async (id, nuevoEstado) => {
    if (nuevoEstado === 'Aprobada' || nuevoEstado === 'Pagada') {
      setPaymentMethodModal({ id, nuevoEstado });
      if (metodosPago.length > 0) {
        setSelectedMetodoId(metodosPago[0].id);
      }
    } else {
      try {
        await updateProformaEstado(id, nuevoEstado);
        load();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const confirmEstadoWithMethod = async (e) => {
    e.preventDefault();
    if (!paymentMethodModal) return;
    try {
      await updateProformaEstado(paymentMethodModal.id, paymentMethodModal.nuevoEstado, selectedMetodoId);
      setPaymentMethodModal(null);
      load();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado: ' + err.message);
    }
  };

  const calcularTotal = (items, iva) => {
    const sub = items.reduce((s, i) => s + (i.cantidad || 0) * (i.precioUnitario || 0), 0);
    return sub + sub * iva;
  };

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const badgeStyle = (estado) => {
    switch (estado) {
      case 'Aprobada': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rechazada': return 'bg-red-50 text-red-700 border-red-200';
      case 'Pagada': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const limpiarFiltros = () => {
    setSearch('');
    setEstado('');
    setDateRange({ start: '', end: '' });
    setPage(1);
  };

  const hayFiltrosActivos = search || estado || dateRange.start || dateRange.end;

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Proformas</h1>
          <p className="text-sm text-slate-500">Cotizaciones y proformas para clientes</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva Proforma
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Búsqueda */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Buscar</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder="Cliente, N° proforma, teléfono..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estado</label>
            <select 
              value={estado} 
              onChange={e => setEstado(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos (sin rechazadas)</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Rango de Fechas */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rango de fechas</label>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Seleccionar rango"
            />
          </div>

          {/* Botón limpiar filtros */}
          {hayFiltrosActivos && (
            <div className="md:col-span-3 flex justify-end">
              <button 
                onClick={limpiarFiltros}
                className="text-xs font-semibold text-slate-600 hover:text-slate-800 underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-600">
            {pagination.total} proforma{pagination.total !== 1 ? 's' : ''}
          </span>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed"
              >
                ‹ Anterior
              </button>
              <span className="text-xs font-medium text-slate-500 px-2">
                Página {page} de {pagination.totalPages}
              </span>
              <button 
                disabled={page >= pagination.totalPages} 
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed"
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-600 bg-slate-50">
                  <th className="text-left px-5 py-3">N° Proforma</th>
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-left px-5 py-3">Teléfono</th>
                  <th className="text-left px-5 py-3">Fecha</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="text-center px-5 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proformas.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{p.id}</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{p.cliente}</p>
                      {p.email && <span className="text-xs text-slate-400">{p.email}</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.telefono}</td>
                    <td className="px-5 py-3 text-slate-600">{p.fecha}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">{formatUSD(calcularTotal(p.items, p.iva))}</td>
                    <td className="px-5 py-3 text-center">
                      <select 
                        value={p.estado} 
                        onChange={e => handleEstado(p.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1 rounded-full border cursor-pointer outline-none ${badgeStyle(p.estado)}`}
                      >
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setPreview(p)} 
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" 
                          title="Ver PDF"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => openEdit(p)} 
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" 
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" 
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {proformas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-slate-400">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm font-medium">
                        {hayFiltrosActivos ? 'No se encontraron proformas con los filtros aplicados' : 'No hay proformas registradas'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && !loading && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Mostrando {proformas.length} de {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-white transition-colors disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <span className="text-xs font-medium text-slate-600 px-2">
                {page} / {pagination.totalPages}
              </span>
              <button 
                disabled={page >= pagination.totalPages} 
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-white transition-colors disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <ProformaPDF
          proforma={preview}
          configuracion={configuracion}
          onClose={() => setPreview(null)}
        />
      )}

      {paymentMethodModal && createPortal(
        <>
          <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setPaymentMethodModal(null)} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100 animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base">Registrar Transacción</h3>
                <button type="button" onClick={() => setPaymentMethodModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
              </div>
              <form onSubmit={confirmEstadoWithMethod} className="p-5 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Para cambiar el estado de la proforma a <strong className="text-slate-700">{paymentMethodModal.nuevoEstado}</strong>, debes seleccionar el método de pago por el cual ingresa el dinero.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Método de Pago</label>
                  <select 
                    value={selectedMetodoId} 
                    onChange={e => setSelectedMetodoId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccione un método...</option>
                    {metodosPago.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setPaymentMethodModal(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-blue-200">
                    Confirmar Cambio
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
