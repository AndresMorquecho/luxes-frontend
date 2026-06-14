// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/pages/HorasExtrasPage.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { useNomina } from '../../application/hooks/useNomina';
import { HorasExtrasTable } from '../components/HorasExtrasTable';
import { HorasExtrasSummaryModal } from '../components/HorasExtrasSummaryModal';
import { alertDialog } from '../../../../shared/ui/components/ConfirmModal';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

export const HorasExtrasPage = () => {
  const { employees, overtime, loading, loadData, saveOvertimeRecords } = useNomina();
  const [summary, setSummary] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const showAlert = useCallback((title, message, type = 'info') => {
    void alertDialog(title, message, { type });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSummaryChange = useCallback((value) => {
    setSummary(value);
  }, []);

  const handleSaveOvertime = useCallback(async (updatedOvertime) => {
    try {
      await saveOvertimeRecords(updatedOvertime);
      showAlert(
        'Planilla guardada',
        'Planilla de horas extras guardada correctamente.',
        'success'
      );
    } catch (err) {
      showAlert(
        'Error al guardar',
        err.message || 'No se pudo guardar la planilla de horas extras.',
        'error'
      );
    }
  }, [saveOvertimeRecords, showAlert]);

  if (loading && employees.length === 0) {
    return (
      <div className="p-6 md:p-8 w-full flex items-center justify-center py-20 text-gray-500 text-sm">
        Cargando planilla de horas extras...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full animate-slide-up">
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Horas Extras</h1>
            <p className="text-sm text-slate-500">Planilla diaria de horas extras laboradas por colaborador</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            Ver Resumen
            {summary && (
              <span className="text-[11px] font-bold bg-white/80 px-1.5 py-0.5 rounded-md border border-blue-200">
                {formatUSD(summary.totalGeneral)}
              </span>
            )}
          </button>
        </div>
      </div>

      <HorasExtrasTable
        employees={employees}
        initialOvertime={overtime}
        onSave={handleSaveOvertime}
        onSummaryChange={handleSummaryChange}
        onAlert={showAlert}
      />

      <HorasExtrasSummaryModal
        isOpen={showSummaryModal}
        summary={summary}
        onClose={() => setShowSummaryModal(false)}
      />
    </div>
  );
};
