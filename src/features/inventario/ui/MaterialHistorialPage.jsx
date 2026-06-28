// src/features/inventario/ui/MaterialHistorialPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, ShoppingCart, Package, 
  History, Calendar, DollarSign, Activity, CheckCircle2
} from 'lucide-react';
import { getMaterialHistorial } from '../application/inventarioService.js';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import './MaterialHistorialPage.css';

export function MaterialHistorialPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('compras'); // 'compras' | 'usos' | 'movimientos'

  const loadHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMaterialHistorial(id);
      setData(result);
    } catch (e) {
      toast.error('Error al cargar historial: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  if (loading) {
    return (
      <div className="hist-loading-container">
        <div className="hist-spinner" />
        <span>Cargando historial del material...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="hist-error-container">
        <Package size={48} className="text-slate-400 mb-4" />
        <p className="text-slate-600 font-semibold mb-4">No se encontró la información del material.</p>
        <button onClick={() => navigate('/inventario')} className="hist-back-btn">
          <ArrowLeft size={16} /> Volver a Inventario
        </button>
      </div>
    );
  }

  const { material, compras = [], usos = [], movimientos = [] } = data;

  const totalComprado = compras.reduce((sum, c) => sum + (c.cantidadRecibida || c.cantidad || 0), 0);
  const totalUsado = usos.reduce((sum, u) => sum + (u.cantidad || 0), 0);
  const isTaller = material.categoria?.toLowerCase() === 'taller' || material.categoria?.toLowerCase() === 'oficina';

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('es-EC', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch {
      return d;
    }
  };

  const fmtCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  return (
    <div className="hist-page">
      {/* Header */}
      <div className="hist-header">
        <button className="hist-back" onClick={() => navigate('/inventario')}>
          <ArrowLeft size={16}/> Volver a Inventario
        </button>
        <div className="hist-header-main">
          <div>
            <div className="hist-category-tag">{material.categoria || 'Sin Categoría'}</div>
            <h1 className="hist-title">{material.nombre}</h1>
            <p className="hist-subtitle">
              SKU: <strong className="text-slate-700">{material.codigo || 'N/A'}</strong> • Tipo: <span className="capitalize">{material.tipo}</span>
            </p>
          </div>
          <div className="hist-badge-control">
            {isTaller ? (
              <span className="hist-logistics-badge">Artículo Logístico (Sin stock mínimo)</span>
            ) : (
              <span className="hist-tracked-badge font-semibold">Stock Controlado</span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="hist-kpi-grid">
        <div className="hist-kpi-card">
          <div className="hist-kpi-icon purchases"><ShoppingCart size={20} /></div>
          <div className="hist-kpi-info">
            <span className="hist-kpi-val">{totalComprado} {material.unidadMedida?.abreviacion || 'unid'}</span>
            <span className="hist-kpi-lbl">Total Adquirido</span>
          </div>
        </div>
        <div className="hist-kpi-card">
          <div className="hist-kpi-icon usage"><History size={20} /></div>
          <div className="hist-kpi-info">
            <span className="hist-kpi-val">{totalUsado} {material.unidadMedida?.abreviacion || 'unid'}</span>
            <span className="hist-kpi-lbl">Consumo en Proyectos</span>
          </div>
        </div>
        <div className="hist-kpi-card">
          <div className="hist-kpi-icon stock"><Package size={20} /></div>
          <div className="hist-kpi-info">
            <span className="hist-kpi-val">
              {isTaller ? 'N/A' : `${material.stockActual} ${material.unidadMedida?.abreviacion || 'unid'}`}
            </span>
            <span className="hist-kpi-lbl">{isTaller ? 'Stock Físico' : 'Stock Disponible'}</span>
          </div>
        </div>
        <div className="hist-kpi-card">
          <div className="hist-kpi-icon cpp"><DollarSign size={20} /></div>
          <div className="hist-kpi-info">
            <span className="hist-kpi-val">
              {fmtCurrency(material.costoPromedioPonderado || material.precioCosto)}
            </span>
            <span className="hist-kpi-lbl">CPP (Costo Promedio)</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="hist-tabs">
        <button 
          className={`hist-tab-btn ${activeTab === 'compras' ? 'active' : ''}`}
          onClick={() => setActiveTab('compras')}
        >
          <ShoppingCart size={15} />
          Historial de Compras ({compras.length})
        </button>
        <button 
          className={`hist-tab-btn ${activeTab === 'usos' ? 'active' : ''}`}
          onClick={() => setActiveTab('usos')}
        >
          <History size={15} />
          Usos en Proyectos ({usos.length})
        </button>
        <button 
          className={`hist-tab-btn ${activeTab === 'movimientos' ? 'active' : ''}`}
          onClick={() => setActiveTab('movimientos')}
        >
          <Activity size={15} />
          Ajustes de Inventario ({movimientos.length})
        </button>
      </div>

      {/* Tab Panel */}
      <div className="hist-panel-card">
        {activeTab === 'compras' && (
          <>
            <div className="hist-desktop-only">
              <div className="overflow-x-auto">
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>No. Orden</th>
                      <th>Fecha Compra</th>
                      <th>Proveedor</th>
                      <th className="text-center">Cant. Solicitada</th>
                      <th className="text-center">Cant. Recibida</th>
                      <th className="text-right">Precio Unit.</th>
                      <th className="text-right">Total</th>
                      <th>Estado OC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="hist-empty-cell">
                          No hay compras registradas para este material.
                        </td>
                      </tr>
                    ) : (
                      compras.map((compra) => (
                        <tr key={compra.id}>
                          <td className="font-bold text-indigo-600">{compra.numero}</td>
                          <td>{fmtDate(compra.fecha)}</td>
                          <td className="font-semibold text-slate-700">{compra.proveedor}</td>
                          <td className="text-center">{compra.cantidad}</td>
                          <td className="text-center font-bold text-emerald-600">
                            {compra.cantidadRecibida !== null ? compra.cantidadRecibida : '—'}
                          </td>
                          <td className="text-right">{fmtCurrency(compra.precioUnitario)}</td>
                          <td className="text-right font-extrabold text-slate-800">
                            {fmtCurrency(compra.subtotal)}
                          </td>
                          <td>
                            <span className={`hist-status-badge ${compra.estado?.toLowerCase()}`}>
                              {compra.estado}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards for Compras */}
            <div className="hist-mobile-only">
              <div className="hist-mobile-cards-grid">
                {compras.length === 0 ? (
                  <div className="hist-empty-mobile">
                    No hay compras registradas para este material.
                  </div>
                ) : (
                  compras.map((compra) => (
                    <div key={compra.id} className="hist-mobile-card">
                      <div className="hist-card-header">
                        <span className="hist-card-title text-indigo-600 font-bold">Orden: {compra.numero}</span>
                        <span className={`hist-status-badge ${compra.estado?.toLowerCase()}`}>{compra.estado}</span>
                      </div>
                      <div className="hist-card-body">
                        <div className="hist-card-row">
                          <span className="hist-card-label">Fecha Compra:</span>
                          <span className="hist-card-value">{fmtDate(compra.fecha)}</span>
                        </div>
                        <div className="hist-card-row">
                          <span className="hist-card-label">Proveedor:</span>
                          <span className="hist-card-value font-semibold text-slate-700">{compra.proveedor}</span>
                        </div>
                        <div className="hist-card-row">
                          <span className="hist-card-label">Cant. Solicitada:</span>
                          <span className="hist-card-value">{compra.cantidad}</span>
                        </div>
                        <div className="hist-card-row">
                          <span className="hist-card-label">Cant. Recibida:</span>
                          <span className="hist-card-value text-emerald-600 font-bold">
                            {compra.cantidadRecibida !== null ? compra.cantidadRecibida : '—'}
                          </span>
                        </div>
                        <div className="hist-card-row">
                          <span className="hist-card-label">Precio Unitario:</span>
                          <span className="hist-card-value">{fmtCurrency(compra.precioUnitario)}</span>
                        </div>
                        <div className="hist-card-row">
                          <span className="hist-card-label">Total:</span>
                          <span className="hist-card-value font-extrabold text-slate-800">{fmtCurrency(compra.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'usos' && (
          <>
            <div className="hist-desktop-only">
              <div className="overflow-x-auto">
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>Proyecto</th>
                      <th>Cliente</th>
                      <th>Fecha de Uso</th>
                      <th className="text-center">Cantidad</th>
                      <th>Responsable</th>
                      <th>Notas / Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="hist-empty-cell">
                          No se registran retiros ni consumos de este material en proyectos.
                        </td>
                      </tr>
                    ) : (
                      usos.map((uso, idx) => (
                        <tr key={idx}>
                          <td className="font-bold text-slate-800">{uso.proyectoNombre}</td>
                          <td className="font-medium text-slate-600">{uso.cliente}</td>
                          <td>{fmtDate(uso.fecha)}</td>
                          <td className="text-center font-black text-indigo-600">
                            {uso.cantidad} {uso.unidad}
                          </td>
                          <td>
                            <span className="hist-user-chip">{uso.responsable}</span>
                          </td>
                          <td className="text-slate-500 italic">{uso.observacion || 'Sin observaciones'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards for Usos */}
            <div className="hist-mobile-only">
              <div className="hist-mobile-cards-grid">
                {usos.length === 0 ? (
                  <div className="hist-empty-mobile">
                    No se registran retiros ni consumos de este material en proyectos.
                  </div>
                ) : (
                  usos.map((uso, idx) => (
                    <div key={idx} className="hist-mobile-card">
                      <div className="hist-card-header">
                        <span className="hist-card-title text-slate-800 font-bold">{uso.proyectoNombre}</span>
                        <span className="hist-user-chip">{uso.responsable}</span>
                      </div>
                      <div className="hist-card-body">
                        <div className="hist-card-row">
                          <span className="hist-card-label">Cliente:</span>
                          <span className="hist-card-value font-medium text-slate-600">{uso.cliente}</span>
                        </div>
                        <div className="hist-card-row">
                          <span className="hist-card-label">Fecha de Uso:</span>
                          <span className="hist-card-value">{fmtDate(uso.fecha)}</span>
                        </div>
                        <div className="hist-card-row">
                          <span className="hist-card-label">Cantidad:</span>
                          <span className="hist-card-value text-indigo-600 font-black">{uso.cantidad} {uso.unidad}</span>
                        </div>
                        <div className="hist-card-notes-block">
                          <span className="hist-card-label">Notas / Observaciones:</span>
                          <p className="hist-card-notes">{uso.observacion || 'Sin observaciones'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'movimientos' && (
          <>
            <div className="hist-desktop-only">
              <div className="overflow-x-auto">
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>Fecha / Hora</th>
                      <th>Tipo</th>
                      <th className="text-center">Cantidad</th>
                      <th>Motivo / Evento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="hist-empty-cell">
                          No hay registros de movimientos manuales de inventario.
                        </td>
                      </tr>
                    ) : (
                      movimientos.map((mov) => (
                        <tr key={mov.id}>
                          <td>{new Date(mov.fecha).toLocaleString('es-EC')}</td>
                          <td>
                            <span className={`hist-mov-badge ${mov.tipo}`}>
                              {mov.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                            </span>
                          </td>
                          <td className="text-center font-extrabold">
                            {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}
                          </td>
                          <td className="text-slate-650 font-medium">{mov.motivo}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards for Movimientos */}
            <div className="hist-mobile-only">
              <div className="hist-mobile-cards-grid">
                {movimientos.length === 0 ? (
                  <div className="hist-empty-mobile">
                    No hay registros de movimientos manuales de inventario.
                  </div>
                ) : (
                  movimientos.map((mov) => (
                    <div key={mov.id} className="hist-mobile-card">
                      <div className="hist-card-header">
                        <span className="hist-card-date">{new Date(mov.fecha).toLocaleString('es-EC')}</span>
                        <span className={`hist-mov-badge ${mov.tipo}`}>{mov.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
                      </div>
                      <div className="hist-card-body">
                        <div className="hist-card-row">
                          <span className="hist-card-label">Cantidad:</span>
                          <span className="hist-card-value font-extrabold">{mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}</span>
                        </div>
                        <div className="hist-card-notes-block">
                          <span className="hist-card-label">Motivo / Evento:</span>
                          <p className="hist-card-notes">{mov.motivo}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
