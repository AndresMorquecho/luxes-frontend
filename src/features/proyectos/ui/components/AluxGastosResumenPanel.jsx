// src/features/proyectos/ui/components/AluxGastosResumenPanel.jsx

import React from 'react';
import { DollarSign, Plus, FileText, Calendar } from 'lucide-react';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

export function AluxGastosResumenPanel({ proyecto, fases = [], gastos = [], onAddGasto }) {
  const totalGastos = gastos.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Encabezado Sobrio y Neutral */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Resumen General de Compras y Gastos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Total de egresos registrados a través de las fases del proyecto
          </p>
        </div>

        <div className="bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-200 text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            TOTAL GASTOS PROYECTO
          </span>
          <span className="text-xl font-extrabold text-slate-900 font-mono">
            {formatUSD(totalGastos)}
          </span>
        </div>
      </div>

      {/* Desglose por Fases */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Desglose de Gastos por Fase
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fases.map((fase, idx) => {
            const gastosFase = gastos.filter(
              (g) => g.faseId === fase.id || g.concepto?.toLowerCase().includes(fase.nombre?.toLowerCase())
            );
            const subtotalFase = gastosFase.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);

            return (
              <div
                key={fase.id}
                className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      FASE {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {formatUSD(subtotalFase)}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-xs">
                    {fase.nombre}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {fase.descripcion}
                  </p>

                  {/* Lista de gastos */}
                  <div className="mt-2 space-y-1 pt-2 border-t border-slate-100">
                    {gastosFase.length > 0 ? (
                      gastosFase.map((g) => (
                        <div key={g.id} className="p-2 bg-slate-50 border border-slate-100 rounded flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {g.concepto || g.descripcion}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {g.proveedor ? `Prov: ${g.proveedor}` : 'Directo'} • {g.fecha || 'Sin fecha'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            {formatUSD(g.monto)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Sin gastos registrados en esta fase.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddGasto && onAddGasto(fase)}
                  className="w-full mt-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded transition-colors flex items-center justify-center gap-1 border border-slate-200"
                >
                  <Plus size={13} />
                  + Registrar Gasto en Fase {idx + 1}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
