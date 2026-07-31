import React from 'react';
import { Eye, X, User, DollarSign, Calendar, AlertTriangle, Info, Tag } from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { getFaseConfig } from '../../domain/value-objects/FaseConfig.js';

export const ProyectoDetallesModal = React.memo(function ProyectoDetallesModal({
  isOpen,
  onClose,
  proyecto,
  estaVencido,
  canViewGastos,
  fasesCompletadas = [],
}) {
  if (!isOpen || !proyecto) return null;

  const cotizacionesSeleccionadas = proyecto?.fases?.COTIZACION?.datos?.cotizacionesSeleccionadas || [];
  const tieneProformas = cotizacionesSeleccionadas.length > 0;
  const ingresoVenta = tieneProformas
    ? cotizacionesSeleccionadas.reduce((sum, c) => sum + (Number(c.total) || 0), 0)
    : (Number(proyecto?.montoEstimado) || 0);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[200] flex flex-col sm:items-center sm:justify-center sm:p-4 bg-slate-900/60"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="bg-white w-full flex flex-col overflow-hidden shadow-xl
            h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[min(90vh,900px)] sm:max-w-4xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="proyecto-detalles-titulo"
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <h2
              id="proyecto-detalles-titulo"
              className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 min-w-0"
            >
              <Eye size={18} className="text-blue-600 shrink-0" />
              <span className="truncate">Detalles del Proyecto</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
              aria-label="Cerrar detalles"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Datos generales */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Información General</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Cliente</p>
                      <p className="text-sm font-semibold text-slate-700">{proyecto.cliente?.nombre}</p>
                      <p className="text-xs text-slate-500">{proyecto.cliente?.empresa}</p>
                      {proyecto.cliente?.telefono && <p className="text-xs text-slate-500">{proyecto.cliente.telefono}</p>}
                      {proyecto.cliente?.email && <p className="text-xs text-blue-600">{proyecto.cliente.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                        {ingresoVenta > 0 && tieneProformas ? 'Ingreso por venta (Proformas)' : 'Monto estimado'}
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        ${ingresoVenta.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Entrega estimada</p>
                      <p className={`text-sm font-medium ${estaVencido ? 'text-red-500' : 'text-slate-700'}`}>
                        {estaVencido && <AlertTriangle size={12} className="inline mr-1" />}
                        {proyecto.fechaEntregaEstimada || 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                  {proyecto.etiquetas?.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Tag size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Etiquetas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {proyecto.etiquetas.map((tag) => (
                            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {proyecto.descripcion && (
                    <div className="pt-3 border-t border-slate-100 text-sm text-slate-600">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Descripción del trabajo</p>
                      {proyecto.descripcion}
                    </div>
                  )}

                  {/* Gastos del Proyecto */}
                  {canViewGastos && (
                    <div className="pt-3 border-t border-slate-100 text-sm">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Gastos Registrados</p>
                      {proyecto.gastos && proyecto.gastos.length > 0 ? (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                          {proyecto.gastos.map((gasto) => (
                            <div key={gasto.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg">
                              <div>
                                <p className="font-semibold text-slate-700">{gasto.concepto}</p>
                                <p className="text-[10px] text-slate-400">{gasto.fecha}</p>
                              </div>
                              <span className="font-bold text-red-600">-${(gasto.monto || 0).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-xs font-bold text-slate-700">
                            <span>Total Gastos:</span>
                            <span className="text-red-700">
                              -${proyecto.gastos.reduce((sum, g) => sum + (g.monto || 0), 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No hay gastos registrados aún en este proyecto.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Historial de fases */}
              <div>
                <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Historial de Fases</h3>
                {fasesCompletadas.length === 0 ? (
                  <p className="text-sm text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">Sin fases completadas aún.</p>
                ) : (
                  <div className="space-y-3">
                    {fasesCompletadas.map((fase) => {
                      const config = getFaseConfig(fase.id);
                      const datos = proyecto.fases?.[fase.id];
                      return (
                        <div key={fase.id} className="flex items-start gap-3">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 mt-1.5 shadow-sm ring-2 ring-white"
                            style={{ backgroundColor: config?.color }}
                          />
                          <div className="flex-1 min-w-0 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-sm font-bold text-slate-700">{config?.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{datos?.fechaCompletada || 'Sin fecha registrada'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
});
