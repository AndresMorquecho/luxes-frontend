import React from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

export const HorasExtrasSummaryModal = ({ isOpen, summary, onClose }) => {
  if (!summary) return null;

  const colaboradores = Object.values(summary.porColaborador ?? []);

  return (
    <ModalPortal open={isOpen}>
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight uppercase">Resumen Acumulado</h3>
              <p className="text-blue-200 text-xs mt-0.5">
                Totales acumulados a pagar por colaborador en este período.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl leading-none p-1"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 px-6">
          {colaboradores.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              No hay colaboradores registrados en la planilla.
            </p>
          ) : (
            colaboradores.map((col) => (
              <div key={col.empleadoId} className="py-3 flex justify-between items-center text-sm">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="font-bold text-gray-800 uppercase text-xs truncate">{col.nombre}</span>
                  <span className="text-gray-500 text-[11px]">{col.horas} horas extras</span>
                </div>
                <span className="font-bold text-blue-700 text-xs bg-blue-50/50 border border-blue-100/60 px-2.5 py-1 rounded-lg shrink-0">
                  {formatUSD(col.total)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total General</span>
            <span className="text-gray-600 text-xs font-semibold">
              {summary.totalHorasGeneral} horas registradas
            </span>
          </div>
          <span className="font-black text-blue-900 text-lg">{formatUSD(summary.totalGeneral)}</span>
        </div>

        <div className="px-6 pb-5 pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
