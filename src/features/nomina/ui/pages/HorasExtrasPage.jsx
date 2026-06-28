import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NominaContext } from '../../application/context/NominaContext';
import { obtenerFechasPeriodo } from '../../application/hooks/useNomina';
import { HorasExtrasTable } from '../components/HorasExtrasTable';
import { toast } from '../../../../shared/ui/components/Toast';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const HorasExtrasPage = () => {
  const navigate = useNavigate();
  const { adapter } = useContext(NominaContext);

  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fechasMes = useMemo(
    () => obtenerFechasPeriodo(year, month, 'mensual'),
    [year, month],
  );

  const loadAll = useCallback(async () => {
    if (!adapter) return;
    setLoading(true);
    try {
      const [emps, ot, pend] = await Promise.all([
        adapter.getEmployees(),
        adapter.getOvertime(fechasMes.fechaInicio, fechasMes.fechaFin),
        adapter.getPendingOvertime(),
      ]);
      setEmployees(emps);
      setOvertime(ot);
      const pendMes = (pend || []).filter(
        (p) => p.fecha >= fechasMes.fechaInicio && p.fecha <= fechasMes.fechaFin,
      );
      setPending(pendMes);
    } catch (err) {
      toast.error(err.message || 'Error al cargar horas extras');
    } finally {
      setLoading(false);
    }
  }, [adapter, fechasMes]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSaveOvertime = async (updatedOvertime) => {
    await adapter.saveOvertime(updatedOvertime, fechasMes.fechaInicio, fechasMes.fechaFin);
    await loadAll();
  };

  const handleApprove = async (id) => {
    try {
      await adapter.approveOvertime(id);
      toast.success('Horas extras aprobadas — ya cuentan en la nómina');
      await loadAll();
    } catch (err) {
      toast.error(err.message || 'Error al aprobar');
    }
  };

  const handleReject = async (id) => {
    try {
      await adapter.rejectOvertime(id);
      toast.success('Solicitud rechazada');
      await loadAll();
    } catch (err) {
      toast.error(err.message || 'Error al rechazar');
    }
  };

  const handlePatchOvertime = async (id, data) => {
    const result = await adapter.patchOvertime(id, data);
    const merged = {
      ...data,
      total: result?.total ?? (Number(data.horas) * Number(data.valorPorHora)),
    };
    setOvertime((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...merged } : o)),
    );
    setPending((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...merged } : o)),
    );
    return result;
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
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Registro de Horas Extras</h1>
          <p className="text-sm text-slate-500">
            Valida solicitudes del quiosco y gestiona la planilla del mes.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="text-sm font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="text-sm font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => navigate('/nomina/nomina-del-mes')}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 shadow-sm shrink-0"
            style={{ backgroundColor: '#1d4ed8' }}
          >
            Volver a Nómina
          </button>
        </div>
      </div>

      <HorasExtrasTable
        employees={employees}
        initialOvertime={overtime}
        pendingOvertime={pending}
        onSave={handleSaveOvertime}
        onApprove={handleApprove}
        onReject={handleReject}
        onPatchOvertime={handlePatchOvertime}
        fechasActuales={fechasMes}
        periodoLabel={`${MESES[month - 1]} ${year}`}
      />
    </div>
  );
};
