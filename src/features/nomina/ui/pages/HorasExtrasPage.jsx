import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  const [vista, setVista] = useState('planilla'); // planilla | resumen
  const loadSeqRef = useRef(0);

  const fechasMes = useMemo(
    () => obtenerFechasPeriodo(year, month, 'mensual'),
    [year, month],
  );

  const normalizeOvertimeRecord = (he) => ({
    id: he.id,
    fecha: he.fecha,
    colaboradorId: String(he.colaboradorId),
    horas: Number(he.horas),
    detalleHorario: he.detalleHorario || '',
    descripcion: he.descripcion || '',
    valorPorHora: Number(he.valorPorHora ?? 2.5),
    total: he.total !== undefined ? Number(he.total) : Number(he.horas) * Number(he.valorPorHora ?? 2.5),
    estado: he.estado || 'DEUDOR',
    aprobacionEstado: he.aprobacionEstado || 'APROBADA',
    origen: he.origen || 'MANUAL',
  });

  const loadAll = useCallback(async () => {
    if (!adapter) return;
    const seq = ++loadSeqRef.current;
    setLoading(true);

    try {
      const emps = await adapter.getEmployees();
      if (seq !== loadSeqRef.current) return;
      setEmployees(Array.isArray(emps) ? emps : []);
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      console.error('[HorasExtrasPage] colaboradores:', err);
      setEmployees([]);
      toast.error(err.message || 'Error al cargar colaboradores');
    }

    try {
      const [ot, pend] = await Promise.all([
        adapter.getOvertime(fechasMes.fechaInicio, fechasMes.fechaFin),
        adapter.getPendingOvertime(),
      ]);
      if (seq !== loadSeqRef.current) return;
      setOvertime(Array.isArray(ot) ? ot : []);
      const pendMes = (pend || []).filter(
        (p) => p.fecha >= fechasMes.fechaInicio && p.fecha <= fechasMes.fechaFin,
      );
      setPending(pendMes);
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      console.error('[HorasExtrasPage] horas extras:', err);
      toast.error(err.message || 'Error al cargar horas extras');
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }, [adapter, fechasMes]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refreshOvertime = useCallback(async () => {
    const [ot, pend] = await Promise.all([
      adapter.getOvertime(fechasMes.fechaInicio, fechasMes.fechaFin),
      adapter.getPendingOvertime(),
    ]);
    setOvertime(Array.isArray(ot) ? ot : []);
    const pendMes = (pend || []).filter(
      (p) => p.fecha >= fechasMes.fechaInicio && p.fecha <= fechasMes.fechaFin,
    );
    setPending(pendMes);
    return ot;
  }, [adapter, fechasMes]);

  const handleSaveOvertime = async (updatedOvertime) => {
    const existing = await adapter.getOvertime(fechasMes.fechaInicio, fechasMes.fechaFin);
    const approvedExisting = (existing || []).filter(
      (he) => he.aprobacionEstado === 'APROBADA' || !he.aprobacionEstado,
    );
    const byId = new Map();
    approvedExisting.forEach((he) => byId.set(String(he.id), normalizeOvertimeRecord(he)));
    (updatedOvertime || []).forEach((he) => byId.set(String(he.id), normalizeOvertimeRecord(he)));
    const merged = Array.from(byId.values());
    await adapter.saveOvertime(merged, fechasMes.fechaInicio, fechasMes.fechaFin);
    await refreshOvertime();
  };

  const handleDeleteOvertime = async (id) => {
    try {
      await adapter.deleteOvertime(id);
    } finally {
      await loadAll();
    }
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

  const approvedOvertime = useMemo(
    () =>
      (overtime || []).filter(
        (he) => he.aprobacionEstado === 'APROBADA' || !he.aprobacionEstado,
      ),
    [overtime],
  );

  const resumenColaboradoresCount = useMemo(() => {
    const ids = new Set(
      approvedOvertime.map((he) => String(he.colaboradorId)).filter(Boolean),
    );
    return ids.size;
  }, [approvedOvertime]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        Cargando planilla de horas extras...
      </div>
    );
  }

  const periodoLabel = `${MESES[month - 1]} ${year}`;

  return (
    <div className="space-y-3 sm:space-y-5 animate-slide-up horas-extras-page" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .horas-extras-page, .horas-extras-page * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Top row: back + icon + title + period selectors */}
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Horas Extras</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  {vista === 'resumen' ? 'Por colaborador' : 'Registros'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {vista === 'resumen'
                  ? `Totales de horas extras por persona en ${periodoLabel}`
                  : 'Registra jornadas y valida solicitudes del quiosco'}
              </p>
            </div>
          </div>

          {/* Period selectors — right side */}
          <div className="flex w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0">
            <label className="sr-only" htmlFor="he-mes">Mes</label>
            <select
              id="he-mes"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex-1 sm:flex-none h-10 pl-3 pr-2 text-sm font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <div className="w-px h-5 bg-slate-200 self-center" />
            <label className="sr-only" htmlFor="he-anio">Año</label>
            <select
              id="he-anio"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 h-10 pl-2 pr-3 text-sm font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab bar — same style as EmpleadosPage */}
        <div className="px-4 sm:px-5 pb-4 flex gap-1 border-t border-slate-100 pt-3 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setVista('planilla')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              vista === 'planilla'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v3.75" />
            </svg>
            Registros
            {approvedOvertime.length > 0 && (
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">{approvedOvertime.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setVista('resumen')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              vista === 'resumen'
                ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
            </svg>
            Por colaborador
            {resumenColaboradoresCount > 0 && (
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">{resumenColaboradoresCount}</span>
            )}
          </button>
        </div>
      </div>

      <HorasExtrasTable
        employees={employees}
        initialOvertime={overtime}
        pendingOvertime={pending}
        loading={loading}
        onSave={handleSaveOvertime}
        onDelete={handleDeleteOvertime}
        onApprove={handleApprove}
        onReject={handleReject}
        onPatchOvertime={handlePatchOvertime}
        fechasActuales={fechasMes}
        periodoLabel={periodoLabel}
        activeView={vista}
      />
    </div>
  );
};
