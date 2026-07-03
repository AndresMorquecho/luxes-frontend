// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/components/HorasExtrasTable.jsx

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { HoraExtra } from '../../domain/entities/HoraExtra';
import { calcularHorasExtras } from '../../domain/use-cases/calcularHorasExtras';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';

const formatUSD = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const parts = fechaStr.split('T')[0].split('-');
  if (parts.length !== 3) return fechaStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const EDITABLE_CELL =
  'w-full min-w-0 bg-sky-50 border border-sky-100 hover:bg-sky-100 hover:border-sky-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-400 rounded-md py-1 px-1.5 text-xs font-semibold text-slate-800 transition-all outline-none cursor-text';

const EDITABLE_WRAP =
  'inline-flex items-center gap-0.5 bg-sky-50 border border-sky-100 rounded-md px-1.5 py-0.5 hover:bg-sky-100 hover:border-sky-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-400 transition-all cursor-text';

const EDITABLE_CELL_IN_WRAP =
  'w-full min-w-0 bg-transparent border-none outline-none py-0.5 px-0 text-xs font-semibold text-slate-800 cursor-text focus:ring-0';

const blurOnEnter = (e) => {
  if (e.key === 'Enter') e.currentTarget.blur();
};

const CellNumber = ({ value, onChange, onBlur, min = 0, step = 0.5, className = '' }) => (
  <input
    type="number"
    min={min}
    step={step}
    value={value === 0 || value === '' ? '' : value}
    placeholder="0"
    onChange={(e) => onChange(e.target.value)}
    onFocus={(e) => e.target.select()}
    onBlur={onBlur}
    onKeyDown={blurOnEnter}
    title="Clic para editar"
    className={`${EDITABLE_CELL} text-center ${className}`}
  />
);

const CellMoney = ({ value, onChange, onBlur }) => {
  const [text, setText] = useState('');
  const editing = useRef(false);

  const formatFromProp = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) return '';
    return String(v);
  };

  useEffect(() => {
    if (!editing.current) setText(formatFromProp(value));
  }, [value]);

  const emitNumber = (raw) => {
    if (raw === '' || raw === '.') {
      onChange(0);
      return;
    }
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onChange(n);
  };

  return (
    <div className={`${EDITABLE_WRAP} justify-center`} title="Clic para editar">
      <span className="text-sky-500 text-xs font-bold shrink-0 select-none">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder="0.00"
        onFocus={(e) => {
          editing.current = true;
          e.target.select();
        }}
        onChange={(e) => {
          const v = e.target.value.replace(',', '.');
          if (v === '' || /^\d*\.?\d*$/.test(v)) {
            setText(v);
            emitNumber(v);
          }
        }}
        onBlur={(e) => {
          editing.current = false;
          const n = parseNum(text, Number(value) || 0);
          setText(n === 0 ? '' : String(n));
          onChange(n);
          onBlur?.(e);
        }}
        onKeyDown={blurOnEnter}
        className={`${EDITABLE_CELL_IN_WRAP} text-right max-w-[76px]`}
      />
    </div>
  );
};

const CellText = ({ value, onChange, onBlur, placeholder = '', className = '' }) => (
  <input
    type="text"
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    onFocus={(e) => e.target.select()}
    onBlur={onBlur}
    onKeyDown={blurOnEnter}
    title="Clic para editar"
    className={`${EDITABLE_CELL} ${className}`}
  />
);

const parseNum = (raw, fallback = 0) => {
  if (raw === '' || raw === null || raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
};

export const HorasExtrasTable = ({
  employees,
  initialOvertime,
  pendingOvertime = [],
  onSave,
  onApprove,
  onReject,
  onPatchOvertime,
  fechasActuales,
  periodoLabel,
}) => {
  const [records, setRecords] = useState([]);
  const [pendingDrafts, setPendingDrafts] = useState({});
  const [actingId, setActingId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const recordsRef = useRef(records);
  const pendingRef = useRef(pendingDrafts);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    fecha: '',
    colaboradorId: '',
    horas: 1,
    detalleHorario: '',
    descripcion: '',
    valorPorHora: 2.50,
    estado: 'DEUDOR',
  });

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    pendingRef.current = pendingDrafts;
  }, [pendingDrafts]);

  useEffect(() => {
    setRecords(
      initialOvertime
        .filter((he) => he.aprobacionEstado === 'APROBADA' || !he.aprobacionEstado)
        .map((he) => ({
          id: he.id,
          fecha: he.fecha,
          colaboradorId: he.colaboradorId,
          horas: Number(he.horas),
          detalleHorario: he.detalleHorario || '',
          descripcion: he.descripcion || '',
          valorPorHora: Number(he.valorPorHora),
          estado: he.estado || 'DEUDOR',
          aprobacionEstado: he.aprobacionEstado || 'APROBADA',
          origen: he.origen,
        })),
    );
  }, [initialOvertime]);

  useEffect(() => {
    const map = {};
    pendingOvertime.forEach((p) => {
      map[p.id] = {
        horas: Number(p.horas),
        valorPorHora: Number(p.valorPorHora) || 2.5,
        descripcion: p.descripcion || '',
        detalleHorario: p.detalleHorario || '',
      };
    });
    setPendingDrafts(map);
  }, [pendingOvertime]);

  useEffect(() => {
    if (isModalOpen) {
      const today = new Date().toISOString().split('T')[0];
      let defaultFecha = today;
      if (fechasActuales) {
        if (today >= fechasActuales.fechaInicio && today <= fechasActuales.fechaFin) {
          defaultFecha = today;
        } else {
          defaultFecha = fechasActuales.fechaInicio;
        }
      }
      const firstEmpId = employees.length > 0 ? employees[0].id : '';
      setModalData({
        fecha: defaultFecha,
        colaboradorId: firstEmpId,
        horas: 1,
        detalleHorario: '17:30 - 18:30',
        descripcion: 'Horas extras de soporte',
        valorPorHora: 2.50,
        estado: 'DEUDOR',
      });
    }
  }, [isModalOpen, employees, fechasActuales]);

  const summary = useMemo(() => {
    const heEntities = records.map((r) => new HoraExtra(r));
    return calcularHorasExtras(employees, heEntities);
  }, [records, employees]);

  const syncWithBackend = async (updatedRecords, successMessage) => {
    try {
      const entities = updatedRecords.map((r) => new HoraExtra(r));
      await onSave(entities);
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      toast.error(`Error al guardar en el servidor: ${err.message}`);
    }
  };

  const buildPatchPayload = (row) => ({
    horas: row.horas,
    valorPorHora: row.valorPorHora,
    descripcion: row.descripcion,
    detalleHorario: row.detalleHorario,
  });

  const persistPatch = useCallback(
    async (id, row, silent = false) => {
      if (!onPatchOvertime) return;
      setSavingId(id);
      try {
        await onPatchOvertime(id, buildPatchPayload(row));
        if (!silent) toast.success('Cambios guardados.');
      } catch (err) {
        toast.error(err.message || 'Error al guardar');
        throw err;
      } finally {
        setSavingId(null);
      }
    },
    [onPatchOvertime],
  );

  const updateApprovedField = (id, field, rawValue) => {
    setRecords((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'horas') return { ...row, horas: parseNum(rawValue, row.horas) };
        if (field === 'valorPorHora') return { ...row, valorPorHora: parseNum(rawValue, row.valorPorHora) };
        return { ...row, [field]: rawValue };
      }),
    );
  };

  const handleApprovedBlur = async (id) => {
    const row = recordsRef.current.find((r) => r.id === id);
    if (!row || !onPatchOvertime) return;
    await persistPatch(id, row, true);
  };

  const updatePendingField = (id, field, rawValue) => {
    setPendingDrafts((prev) => {
      const cur = prev[id] || {};
      let nextVal = rawValue;
      if (field === 'horas' || field === 'valorPorHora') {
        nextVal = parseNum(rawValue, cur[field] ?? 0);
      }
      return { ...prev, [id]: { ...cur, [field]: nextVal } };
    });
  };

  const handlePendingBlur = async (row) => {
    const draft = pendingRef.current[row.id];
    if (!draft || !onPatchOvertime) return;
    const merged = {
      horas: draft.horas ?? row.horas,
      valorPorHora: draft.valorPorHora ?? row.valorPorHora,
      descripcion: draft.descripcion ?? row.descripcion,
      detalleHorario: draft.detalleHorario ?? row.detalleHorario,
    };
    await persistPatch(row.id, merged, true);
  };

  const handleToggleEstado = async (id) => {
    const updated = records.map((row) => {
      if (row.id === id) {
        const nextEstado = row.estado === 'PAGADO' ? 'DEUDOR' : 'PAGADO';
        return { ...row, estado: nextEstado };
      }
      return row;
    });
    setRecords(updated);
    await syncWithBackend(updated, 'Estado de pago actualizado.');
  };

  const handleDelete = async (id) => {
    confirmDialog(
      '¿Está seguro de eliminar este registro de horas extras?',
      async () => {
        const updated = records.filter((row) => row.id !== id);
        setRecords(updated);
        await syncWithBackend(updated, 'Registro eliminado.');
      }
    );
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!modalData.fecha || !modalData.colaboradorId || !modalData.horas || !modalData.descripcion) {
      toast.error('Por favor, completa todos los campos obligatorios.');
      return;
    }

    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      fecha: modalData.fecha,
      colaboradorId: Number(modalData.colaboradorId)
        ? Number(modalData.colaboradorId)
        : String(modalData.colaboradorId),
      horas: Number(modalData.horas),
      detalleHorario: modalData.detalleHorario,
      descripcion: modalData.descripcion,
      valorPorHora: Number(modalData.valorPorHora),
      estado: modalData.estado,
    };

    const updated = [...records, newRecord];
    setRecords(updated);
    deferClose(() => setIsModalOpen(false));
    await syncWithBackend(updated, 'Horas extras registradas correctamente.');
  };

  const handleApprove = async (id) => {
    if (!onApprove) return;
    setActingId(id);
    try {
      await onApprove(id);
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!onReject) return;
    setActingId(id);
    try {
      await onReject(id);
    } finally {
      setActingId(null);
    }
  };

  const pendingRows = pendingOvertime.filter((p) => p.aprobacionEstado === 'PENDIENTE');

  const summaryRows = useMemo(
    () => Object.values(summary.porColaborador).filter((c) => c.horas > 0),
    [summary],
  );

  const SavingDot = ({ id }) =>
    savingId === id ? (
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-1" title="Guardando..." />
    ) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-slide-up">

      {pendingRows.length > 0 && (
        <div className="lg:col-span-12 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                Pendientes de aprobación — {periodoLabel}
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">
                Los campos en azul claro son editables. Los cambios se guardan al salir del campo.
              </p>
            </div>
            <span className="text-xs font-black bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">
              {pendingRows.length}
            </span>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-amber-100/60 text-[10px] font-bold text-amber-900 uppercase">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Colaborador</th>
                  <th className="px-4 py-2 text-center w-[72px]">Horas</th>
                  <th className="px-4 py-2 w-[110px]">Horario</th>
                  <th className="px-4 py-2 text-center w-[88px]">V/Hora</th>
                  <th className="px-4 py-2">Descripción</th>
                  <th className="px-4 py-2 w-[80px]">Total</th>
                  <th className="px-4 py-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 bg-white/70">
                {pendingRows.map((row) => {
                  const draft = pendingDrafts[row.id] || {};
                  const horas = draft.horas ?? row.horas;
                  const vph = draft.valorPorHora ?? row.valorPorHora;
                  const descripcion = draft.descripcion ?? row.descripcion ?? '';
                  const detalleHorario = draft.detalleHorario ?? row.detalleHorario ?? '';
                  const totalCalc = horas * Number(vph);

                  return (
                    <tr key={row.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap">{formatFecha(row.fecha)}</td>
                      <td className="px-4 py-2.5 text-xs font-bold uppercase">
                        {row.colaboradorNombre
                          || employees.find((e) => e.id === row.colaboradorId)?.nombre
                          || row.colaboradorId}
                        <SavingDot id={row.id} />
                      </td>
                      <td className="px-2 py-2">
                        <CellNumber
                          value={horas}
                          step="0.5"
                          min="0.5"
                          onChange={(v) => updatePendingField(row.id, 'horas', v)}
                          onBlur={() => handlePendingBlur(row)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CellText
                          value={detalleHorario}
                          placeholder="17:30 - 18:30"
                          onChange={(v) => updatePendingField(row.id, 'detalleHorario', v)}
                          onBlur={() => handlePendingBlur(row)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CellMoney
                          value={vph}
                          onChange={(v) => updatePendingField(row.id, 'valorPorHora', v)}
                          onBlur={() => handlePendingBlur(row)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CellText
                          value={descripcion}
                          placeholder="Descripción del trabajo"
                          onChange={(v) => updatePendingField(row.id, 'descripcion', v)}
                          onBlur={() => handlePendingBlur(row)}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-amber-900 whitespace-nowrap">
                        {formatUSD(totalCalc)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            disabled={actingId === row.id}
                            onClick={() => handleApprove(row.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 disabled:opacity-50 cursor-pointer border-none"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={actingId === row.id}
                            onClick={() => handleReject(row.id)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-[10px] font-bold uppercase hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-3 space-y-3">
            {pendingRows.map((row) => {
              const draft = pendingDrafts[row.id] || {};
              const horas = draft.horas ?? row.horas;
              const vph = draft.valorPorHora ?? row.valorPorHora;
              const descripcion = draft.descripcion ?? row.descripcion ?? '';
              const detalleHorario = draft.detalleHorario ?? row.detalleHorario ?? '';
              const totalCalc = horas * Number(vph);
              const empName = row.colaboradorNombre
                || employees.find((e) => e.id === row.colaboradorId)?.nombre
                || row.colaboradorId;

              return (
                <div key={row.id} className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-sm">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <p className="text-xs text-amber-800 font-medium">{formatFecha(row.fecha)}</p>
                      <p className="text-sm font-bold text-slate-800 uppercase">{empName}</p>
                      <SavingDot id={row.id} />
                    </div>
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-1 rounded-lg">
                      {formatUSD(totalCalc)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500 font-semibold block mb-1">Horas</span>
                      <CellNumber
                        value={horas}
                        step="0.5"
                        min="0.5"
                        onChange={(v) => updatePendingField(row.id, 'horas', v)}
                        onBlur={() => handlePendingBlur(row)}
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block mb-1">V/Hora</span>
                      <CellMoney
                        value={vph}
                        onChange={(v) => updatePendingField(row.id, 'valorPorHora', v)}
                        onBlur={() => handlePendingBlur(row)}
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-semibold block mb-1">Horario</span>
                      <CellText
                        value={detalleHorario}
                        placeholder="17:30 - 18:30"
                        onChange={(v) => updatePendingField(row.id, 'detalleHorario', v)}
                        onBlur={() => handlePendingBlur(row)}
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-semibold block mb-1">Descripción</span>
                      <CellText
                        value={descripcion}
                        placeholder="Descripción del trabajo"
                        onChange={(v) => updatePendingField(row.id, 'descripcion', v)}
                        onBlur={() => handlePendingBlur(row)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      disabled={actingId === row.id}
                      onClick={() => handleApprove(row.id)}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={actingId === row.id}
                      onClick={() => handleReject(row.id)}
                      className="flex-1 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-[10px] font-bold uppercase disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="lg:col-span-9 bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden flex flex-col p-4 md:p-6 space-y-4 premium-card">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-3 border-b border-gray-200">
          <div>
            <h2 className="text-base font-extrabold text-blue-900 uppercase tracking-wide">Planilla de Horas Extras</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Aprobadas en {periodoLabel || 'el período'}. Los campos en azul claro son editables.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
          >
            <span>➕</span> Registrar Horas Extras
          </button>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No hay registros de horas extras en esta planilla. Haz clic en &quot;Registrar Horas Extras&quot; para ingresar una nueva jornada.
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto max-h-[480px] sticky-scrollbar">
            <table className="min-w-full divide-y divide-gray-250 text-left text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0 z-10 sticky-table-header">
                <tr>
                  <th className="px-4 py-3.5 w-[100px]">Fecha</th>
                  <th className="px-4 py-3.5 w-[160px]">Colaborador</th>
                  <th className="px-4 py-3.5 w-[72px] text-center">Horas</th>
                  <th className="px-4 py-3.5 w-[120px]">Horario</th>
                  <th className="px-4 py-3.5">Descripción</th>
                  <th className="px-4 py-3.5 w-[88px] text-center">V/Hora</th>
                  <th className="px-4 py-3.5 w-[80px]">Total</th>
                  <th className="px-4 py-3.5 w-[95px] text-center">Estado</th>
                  <th className="px-4 py-3.5 w-[45px] text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {records.map((row) => {
                  const emp = employees.find((e) => e.id === row.colaboradorId);
                  const empName = emp ? emp.nombre : 'Empleado no encontrado';
                  const calculatedTotal = row.horas * row.valorPorHora;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-2 font-medium text-gray-600 text-xs whitespace-nowrap">
                        {formatFecha(row.fecha)}
                      </td>
                      <td className="px-4 py-2 font-bold text-gray-800 text-xs uppercase truncate max-w-[160px]">
                        {empName}
                        <SavingDot id={row.id} />
                      </td>
                      <td className="px-2 py-2">
                        <CellNumber
                          value={row.horas}
                          step="0.5"
                          min="0.5"
                          onChange={(v) => updateApprovedField(row.id, 'horas', v)}
                          onBlur={() => handleApprovedBlur(row.id)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CellText
                          value={row.detalleHorario}
                          placeholder="17:30 - 18:30"
                          onChange={(v) => updateApprovedField(row.id, 'detalleHorario', v)}
                          onBlur={() => handleApprovedBlur(row.id)}
                          className="whitespace-nowrap"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CellText
                          value={row.descripcion}
                          placeholder="Descripción"
                          onChange={(v) => updateApprovedField(row.id, 'descripcion', v)}
                          onBlur={() => handleApprovedBlur(row.id)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CellMoney
                          value={row.valorPorHora}
                          onChange={(v) => updateApprovedField(row.id, 'valorPorHora', v)}
                          onBlur={() => handleApprovedBlur(row.id)}
                        />
                      </td>
                      <td className="px-4 py-2 font-extrabold text-blue-900 text-xs whitespace-nowrap">
                        {formatUSD(calculatedTotal)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(row.id)}
                          className={`px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-wider cursor-pointer transition-all border border-solid ${
                            row.estado === 'PAGADO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200/60 hover:bg-red-100'
                          }`}
                        >
                          {row.estado === 'PAGADO' ? 'Pagado' : 'Por Pagar'}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer border-none bg-transparent opacity-60 group-hover:opacity-100"
                          title="Eliminar registro"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-3 space-y-3 max-h-[60vh] overflow-y-auto">
            {records.map((row) => {
              const emp = employees.find((e) => e.id === row.colaboradorId);
              const empName = emp ? emp.nombre : 'Empleado no encontrado';
              const calculatedTotal = row.horas * row.valorPorHora;

              return (
                <div key={row.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{formatFecha(row.fecha)}</p>
                      <p className="text-sm font-bold text-slate-800 uppercase truncate">{empName}</p>
                      <SavingDot id={row.id} />
                    </div>
                    <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-lg shrink-0">
                      {formatUSD(calculatedTotal)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500 font-semibold block mb-1">Horas</span>
                      <CellNumber
                        value={row.horas}
                        step="0.5"
                        min="0.5"
                        onChange={(v) => updateApprovedField(row.id, 'horas', v)}
                        onBlur={() => handleApprovedBlur(row.id)}
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block mb-1">V/Hora</span>
                      <CellMoney
                        value={row.valorPorHora}
                        onChange={(v) => updateApprovedField(row.id, 'valorPorHora', v)}
                        onBlur={() => handleApprovedBlur(row.id)}
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-semibold block mb-1">Horario</span>
                      <CellText
                        value={row.detalleHorario}
                        placeholder="17:30 - 18:30"
                        onChange={(v) => updateApprovedField(row.id, 'detalleHorario', v)}
                        onBlur={() => handleApprovedBlur(row.id)}
                      />
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-semibold block mb-1">Descripción</span>
                      <CellText
                        value={row.descripcion}
                        placeholder="Descripción"
                        onChange={(v) => updateApprovedField(row.id, 'descripcion', v)}
                        onBlur={() => handleApprovedBlur(row.id)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleToggleEstado(row.id)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border ${
                        row.estado === 'PAGADO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {row.estado === 'PAGADO' ? 'Pagado' : 'Por Pagar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-[10px] font-bold"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6 space-y-4 premium-card border-t-4 border-t-blue-700">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Resumen Acumulado</h3>
            <p className="text-gray-500 text-xs mt-0.5">Totales acumulados a pagar por colaborador en este período.</p>
          </div>

          <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto sticky-scrollbar">
            {summaryRows.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">Sin horas extras aprobadas en este mes.</p>
            ) : (
              summaryRows.map((col) => (
                <div key={col.empleadoId} className="py-3 flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 uppercase text-xs">{col.nombre}</span>
                    <span className="text-gray-500 text-[10px]">{col.horas} horas extras</span>
                  </div>
                  <span className="font-bold text-blue-700 text-xs bg-blue-50/50 border border-blue-100/60 px-2.5 py-1 rounded-lg">
                    {formatUSD(col.total)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex justify-between items-center pt-3 mt-4 border-t border-gray-200">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total General</span>
              <span className="text-gray-600 text-xs font-semibold">{summary.totalHorasGeneral} horas</span>
            </div>
            <span className="font-black text-blue-900 text-base">
              {formatUSD(summary.totalGeneral)}
            </span>
          </div>
        </div>
      </div>

      <ModalPortal open={isModalOpen}>
        {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" onClick={() => deferClose(() => setIsModalOpen(false))} />
          <div className="relative w-full max-w-[95vw] md:max-w-2xl lg:max-w-3xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100 max-h-[92vh] overflow-y-auto flex flex-col space-y-5 animate-modal-in">

            <button
              onClick={() => deferClose(() => setIsModalOpen(false))}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-450 hover:text-gray-600 cursor-pointer border-none"
            >
              ✕
            </button>

            <div className="text-center md:text-left space-y-1 pb-2 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-gray-900">Registrar Horas Extras</h3>
              <p className="text-[11px] text-gray-400 font-medium">Ingresa los detalles para la nueva jornada laboral</p>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Fecha</label>
                    <input
                      type="date"
                      required
                      value={modalData.fecha}
                      onChange={(e) => setModalData((prev) => ({ ...prev, fecha: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Colaborador</label>
                    <select
                      required
                      value={modalData.colaboradorId}
                      onChange={(e) => setModalData((prev) => ({ ...prev, colaboradorId: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Nro. Horas</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        required
                        value={modalData.horas}
                        onChange={(e) => setModalData((prev) => ({ ...prev, horas: e.target.value }))}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-bold text-gray-700 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Valor p/ Hora</label>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={modalData.valorPorHora}
                          onChange={(e) => setModalData((prev) => ({ ...prev, valorPorHora: e.target.value }))}
                          className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-bold text-gray-700 text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Detalle Horario</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 17:30 - 19:30"
                      value={modalData.detalleHorario}
                      onChange={(e) => setModalData((prev) => ({ ...prev, detalleHorario: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Descripción del Trabajo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Mantenimiento preventivo..."
                      value={modalData.descripcion}
                      onChange={(e) => setModalData((prev) => ({ ...prev, descripcion: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Estado Inicial</label>
                    <select
                      value={modalData.estado}
                      onChange={(e) => setModalData((prev) => ({ ...prev, estado: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      <option value="DEUDOR">Por Pagar</option>
                      <option value="PAGADO">Pagado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => deferClose(() => setIsModalOpen(false))}
                  className="w-full sm:w-auto px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer transition-all bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-md cursor-pointer transition-all border-none"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
      </ModalPortal>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modal-in {
          from { transform: scale(0.95) translateY(8px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-in { animation: modal-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}} />
    </div>
  );
};
