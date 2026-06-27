// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/pages/HorasExtrasPage.jsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNomina } from '../../application/hooks/useNomina';
import { HorasExtrasTable } from '../components/HorasExtrasTable';
import { toast } from '../../../../shared/ui/components/Toast';

export const HorasExtrasPage = () => {
  const navigate = useNavigate();
  const { employees, overtime, loading, loadData, saveOvertimeRecords, fechasActuales } = useNomina();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveOvertime = async (updatedOvertime) => {
    await saveOvertimeRecords(updatedOvertime);
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        Cargando planilla de horas extras...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Registro de Horas Extras</h1>
          <p className="text-sm text-slate-500">Planilla diaria de horas extras laboradas por colaborador.</p>
        </div>
        <button
          onClick={() => navigate('/nomina')}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 shadow-sm shrink-0"
          style={{ backgroundColor: '#1d4ed8' }}
        >
          Volver a Nómina
        </button>
      </div>

      {/* Tabla y Resumen */}
      <HorasExtrasTable
        employees={employees}
        initialOvertime={overtime}
        onSave={handleSaveOvertime}
        fechasActuales={fechasActuales}
      />

    </div>
  );
};
