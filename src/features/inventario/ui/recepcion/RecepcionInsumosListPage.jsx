import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { getOrdenes } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal';
import './RecepcionInsumos.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// Helper para mapear orden a formato PDF
const mapOrdenToPDFFormat = (orden) => {
  if (!orden) return null;
  return {
    id: orden.numero,
    fechaCreacion: orden.fecha ? new Date(orden.fecha).toISOString().split('T')[0] : '',
    estado: (orden.estado || 'PENDIENTE').toUpperCase(),
    proyectoNombre: orden.concepto || 'Compra de Materiales',
    comentarios: orden.notas || 'Sin observaciones.',
    items: (orden.detalles || []).map(d => ({
      sku: d.materialId ? d.materialId.slice(-8).toUpperCase() : 'ESP-LIBRE',
      nombre: d.descripcion,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      unidad: 'unidad'
    }))
  };
};

export const RecepcionInsumosListPage = () => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (user?.rol || '').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const isTaller = userRole === 'TALLER';
  
  const [ordenes, setOrdenes] = useState([]);
  const [ordenPage, setOrdenPage] = useState(1);
  const [ordenTotal, setOrdenTotal] = useState(0);
  const [ordenSearch, setOrdenSearch] = useState('');
  const [ordenLoading, setOrdenLoading] = useState(true);
  const perPage = 10;

  // Estados para PDF preview
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);

  const searchTimer = useRef(null);

  const loadOrdenes = useCallback(async () => {
    setOrdenLoading(true);
    try {
      const data = await getOrdenes({
        page: ordenPage,
        limit: perPage,
        search: ordenSearch || undefined,
        estado: 'aprobada', // Solo órdenes aprobadas
        creadorRol: (isImpresion || isTaller) ? user?.rol : undefined
      });
      setOrdenes(data.items || []);
      setOrdenTotal(data.total || 0);
    } catch (err) {
      setOrdenes([]);
      setOrdenTotal(0);
      toast.error('Error al cargar las órdenes aprobadas');
    } finally {
      setOrdenLoading(false);
    }
  }, [ordenPage, ordenSearch, isImpresion, isTaller, user]);

  useEffect(() => {
    loadOrdenes();
  }, [loadOrdenes]);

  const handleOrdenSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOrdenSearch(val); setOrdenPage(1); }, 350);
  };

  const handleRecepcionar = (ordenId) => {
    navigate(`/inventario/recepcion/${ordenId}`);
  };

  const handleVerOrden = (orden) => {
    setPreviewOC(mapOrdenToPDFFormat(orden));
    setIsPDFOpen(true);
  };

  const ordenTotalPages = Math.max(1, Math.ceil(ordenTotal / perPage));

  return (
    <div className="ri-page animate-slide-up">
      {/* Header */}
      <div className="ri-card ri-header">
        <div>
          <h1 className="ri-title">Recepción de Insumos</h1>
          <p className="ri-subtitle">Registra la entrada de materiales al almacén desde órdenes de compra aprobadas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="ri-stat-badge">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>{ordenTotal} pendiente{ordenTotal !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="ri-card ri-table-card">
        <div className="ri-table-header">
          <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input 
            className="ri-search-inline" 
            placeholder="Buscar por número, proveedor o concepto…" 
            onChange={handleOrdenSearchChange} 
          />
        </div>

        {ordenLoading ? (
          <div className="ri-loader-box"><div className="ri-spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ri-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Proveedor</th>
                  <th>Solicitante</th>
                  <th>Fecha Aprobación</th>
                  <th>Concepto</th>
                  {!isTaller && <th className="text-right">Total</th>}
                  <th className="text-center">Items</th>
                  <th className="text-center w-48">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map(o => (
                  <tr key={o.id} className="ri-tr">
                    <td data-label="Orden" className="font-mono text-xs font-semibold text-slate-700">{o.numero}</td>
                    <td data-label="Proveedor" className="font-semibold text-slate-800">{o.proveedor?.nombre || '—'}</td>
                    <td data-label="Solicitante" className="text-slate-600 text-xs font-medium">{o.usuario?.nombre || '—'}</td>
                    <td data-label="Fecha" className="text-slate-500 text-xs">{fmtDate(o.fecha)}</td>
                    <td data-label="Concepto" className="text-slate-700 text-xs font-semibold max-w-[200px] truncate" title={o.concepto}>{o.concepto || '—'}</td>
                    {!isTaller && <td data-label="Total" className="text-right font-semibold text-slate-800">{fmt(o.total)}</td>}
                    <td data-label="Items" className="text-center text-slate-600 text-sm font-semibold">{o.detalles?.length || 0}</td>
                    <td data-label="Acciones">
                      <div className="flex items-center justify-center gap-2">
                        {!isTaller && (
                          <button
                            onClick={() => handleVerOrden(o)}
                            className="ri-btn-ver"
                            title="Ver Orden de Compra"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                            Ver
                          </button>
                        )}
                        <button
                          onClick={() => handleRecepcionar(o.id)}
                          className="ri-btn-recepcionar"
                          title="Recepcionar Insumos"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                          </svg>
                          Recepcionar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={isTaller ? 7 : 8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-600">No hay órdenes pendientes de recepción</p>
                          <p className="text-xs text-slate-400 mt-1">Las órdenes aprobadas aparecerán aquí</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {ordenTotalPages > 1 && (
          <div className="ri-pagination">
            <span className="text-xs font-medium text-slate-400">{ordenTotal} orden{ordenTotal !== 1 ? 'es' : ''}</span>
            <div className="flex items-center gap-1">
              <button disabled={ordenPage <= 1} onClick={() => setOrdenPage(p => p - 1)} className="ri-page-btn">‹</button>
              <span className="text-xs font-semibold text-slate-500 px-2">{ordenPage} / {ordenTotalPages}</span>
              <button disabled={ordenPage >= ordenTotalPages} onClick={() => setOrdenPage(p => p + 1)} className="ri-page-btn">›</button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        oc={previewOC}
        title="Orden de Compra"
      />
    </div>
  );
};
