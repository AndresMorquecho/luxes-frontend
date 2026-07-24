// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/pages/NominaPage.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNomina } from '../../application/hooks/useNomina';
import { PeriodSelector } from '../components/PeriodSelector';
import { PayrollTable } from '../components/PayrollTable';
import { NominaForm } from '../components/NominaForm';

const formatUSD = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export const NominaPage = () => {
  const navigate = useNavigate();
  const {
    employees,
    calculatedPayrolls,
    globalSummary,
    activePeriod,
    loadData,
    changePeriod,
    savePayrollRecord,
    selectedEmployee,
    selectedRawPayroll,
    setSelectedEmployee,
  } = useNomina();

  const [isEditing, setIsEditing] = useState(false);

  // Cargar datos al montar y al cambiar de período
  useEffect(() => {
    loadData();
  }, [loadData, activePeriod]);

  const handleEdit = (empleadoId) => {
    setSelectedEmployee(empleadoId);
    setIsEditing(true);
  };

  const handleViewRol = (empleadoId) => {
    setSelectedEmployee(empleadoId);
    navigate(`rol/${empleadoId}`);
  };

  const handleSaveNomina = async (updatedNomina) => {
    await savePayrollRecord(updatedNomina);
    setIsEditing(false);
    setSelectedEmployee(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="space-y-6 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`.shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }`}</style>
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200/60">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight bg-gradient-to-r from-blue-900 to-indigo-950 bg-clip-text text-transparent">
            Gestión de Nómina
          </h1>
          <p className="text-gray-500 text-sm mt-1">Calcula salarios, ingresos adicionales, retenciones de IESS y abonos quincenales.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('horas-extras')}
            className="px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-600 hover:text-blue-700 text-gray-700 font-bold rounded-xl text-xs shadow-xs transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <span>⏰</span> Planilla Horas Extras
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-blue-600 px-4 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo nómina</p>
          <p className="text-lg font-bold text-blue-700 mt-1 tabular-nums">{formatUSD(globalSummary.netoTotal)}</p>
        </div>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-emerald-500 px-4 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Abonado / anticipos</p>
          <p className="text-lg font-bold text-emerald-600 mt-1 tabular-nums">{formatUSD(globalSummary.abonadoTotal)}</p>
        </div>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-red-500 px-4 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo pendiente</p>
          <p className="text-lg font-bold text-red-500 mt-1 tabular-nums">{formatUSD(globalSummary.pendienteTotal)}</p>
        </div>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-slate-400 px-4 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Colaboradores</p>
          <p className="text-lg font-bold text-slate-700 mt-1 tabular-nums">{globalSummary.totalColaboradores}</p>
        </div>
      </div>

      {/* Selector de Período */}
      <PeriodSelector activePeriod={activePeriod} onChange={changePeriod} />

      {/* Tabla Principal */}
      <PayrollTable
        calculatedPayrolls={calculatedPayrolls}
        globalSummary={globalSummary}
        onEdit={handleEdit}
        onViewRol={handleViewRol}
      />

      {/* Modal Formulario de Edición */}
      {isEditing && selectedEmployee && selectedRawPayroll && (
        <NominaForm
          empleado={selectedEmployee}
          rawNomina={selectedRawPayroll}
          onSave={handleSaveNomina}
          onCancel={handleCancelEdit}
        />
      )}

    </div>
  );
};
