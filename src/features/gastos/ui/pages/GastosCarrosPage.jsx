import React from 'react';
import { GastosCarrosTab } from '../components/GastosCarrosTab';
import { MODAL_FORM_STYLES } from '../shared/gastosUi';

export const GastosCarrosPage = () => (
  <div className="p-6 xl:p-8 w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
    <style dangerouslySetInnerHTML={{ __html: MODAL_FORM_STYLES }} />

    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Gastos de Carros</h1>
        <p className="text-sm text-slate-500">Flota vehicular, mantenimientos y alertas de vencimiento</p>
      </div>
    </div>

    <GastosCarrosTab />
  </div>
);
