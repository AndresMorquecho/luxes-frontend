// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/components/HorasExtrasTable.jsx

import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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

const matchEmpleadoId = (a, b) => String(a) === String(b);

const ColaboradorSearchSelect = ({ employees, value, onChange, disabled = false }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [menuBox, setMenuBox] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const selected = useMemo(
    () => employees.find((emp) => matchEmpleadoId(emp.id, value)),
    [employees, value],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const sorted = [...employees].sort((a, b) =>
      (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }),
    );
    if (!term) return sorted;
    return sorted.filter(
      (emp) =>
        (emp.nombre || '').toLowerCase().includes(term) ||
        (emp.cedula || '').toLowerCase().includes(term) ||
        String(emp.id).toLowerCase().includes(term),
    );
  }, [employees, query]);

  const updateMenuBox = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxH = Math.min(208, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setMenuBox({
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      left: rect.left,
      width: rect.width,
      maxHeight: maxH,
    });
  }, []);

  useEffect(() => {
    if (!open) setQuery(selected?.nombre || '');
  }, [selected, open]);

  useLayoutEffect(() => {
    if (!open || disabled) {
      setMenuBox(null);
      return undefined;
    }
    updateMenuBox();
    const onReposition = () => updateMenuBox();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, disabled, updateMenuBox, filtered.length]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      const inInput = containerRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inInput && !inMenu) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (emp) => {
    onChange(String(emp.id));
    setQuery(emp.nombre || '');
    setOpen(false);
  };

  const menu =
    open && !disabled && menuBox
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuBox.top,
              bottom: menuBox.bottom,
              left: menuBox.left,
              width: menuBox.width,
              maxHeight: menuBox.maxHeight,
              zIndex: 10050,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500 text-center">No se encontraron colaboradores</p>
            ) : (
              filtered.map((emp) => {
                const activo = matchEmpleadoId(emp.id, value);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(emp)}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-100 last:border-0 transition-colors ${
                      activo ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className="block text-xs font-bold uppercase leading-snug">{emp.nombre}</span>
                    {emp.cedula && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">{emp.cedula}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={employees.length === 0 ? 'Sin colaboradores disponibles' : 'Buscar colaborador...'}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onChange('');
          }}
          onFocus={() => setOpen(true)}
          className="w-full h-9 sm:h-10 pl-9 pr-3 border border-slate-300 rounded-md bg-white text-xs sm:text-sm text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
          autoComplete="off"
        />
      </div>
      {menu}
    </div>
  );
};

export const HorasExtrasTable = ({
  employees,
  initialOvertime,
  pendingOvertime = [],
  loading = false,
  onSave,
  onDelete,
  onApprove,
  onReject,
  onPatchOvertime,
  fechasActuales,
  periodoLabel,
  activeView = 'planilla',
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
    if (loading) return;

    const next = (initialOvertime || [])
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
      }));

    setRecords(next);
  }, [initialOvertime, loading]);

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

  const openModal = () => {
    const today = new Date().toISOString().split('T')[0];
    let defaultFecha = today;
    if (fechasActuales) {
      if (today >= fechasActuales.fechaInicio && today <= fechasActuales.fechaFin) {
        defaultFecha = today;
      } else {
        defaultFecha = fechasActuales.fechaInicio;
      }
    }
    setModalData({
      fecha: defaultFecha,
      colaboradorId: '',
      horas: 1,
      detalleHorario: '17:30 - 18:30',
      descripcion: 'Horas extras de soporte',
      valorPorHora: 2.50,
      estado: 'DEUDOR',
    });
    setIsModalOpen(true);
  };

  const syncWithBackend = async (updatedRecords, successMessage) => {
    const entities = updatedRecords.map((r) => new HoraExtra(r));
    await onSave(entities);
    if (successMessage) toast.success(successMessage);
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
    const previous = recordsRef.current;
    const updated = previous.map((row) => {
      if (row.id === id) {
        const nextEstado = row.estado === 'PAGADO' ? 'DEUDOR' : 'PAGADO';
        return { ...row, estado: nextEstado };
      }
      return row;
    });
    setRecords(updated);
    try {
      await syncWithBackend(updated, 'Estado de pago actualizado.');
    } catch (err) {
      setRecords(previous);
      toast.error(`Error al guardar en el servidor: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirmDialog(
      'Eliminar registro',
      '¿Está seguro de eliminar este registro de horas extras?',
      { confirmLabel: 'Eliminar', type: 'danger' }
    );
    if (!ok) return;

    const previous = recordsRef.current;
    const updated = previous.filter((row) => row.id !== id);
    setRecords(updated);
    try {
      if (onDelete) {
        await onDelete(id);
        toast.success('Registro eliminado.');
      } else {
        await syncWithBackend(updated, 'Registro eliminado.');
      }
    } catch (err) {
      setRecords(previous);
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!modalData.fecha || !modalData.colaboradorId || !modalData.horas || !modalData.descripcion) {
      toast.error('Por favor, completa todos los campos obligatorios (incluido colaborador).');
      return;
    }

    const newRecord = {
      id: crypto.randomUUID(),
      fecha: modalData.fecha,
      colaboradorId: String(modalData.colaboradorId),
      horas: Number(modalData.horas),
      detalleHorario: modalData.detalleHorario,
      descripcion: modalData.descripcion,
      valorPorHora: Number(modalData.valorPorHora),
      estado: modalData.estado,
      aprobacionEstado: 'APROBADA',
      origen: 'MANUAL',
    };

    const previous = recordsRef.current;
    const updated = [...previous, newRecord];
    setRecords(updated);
    try {
      await syncWithBackend(updated, 'Horas extras registradas correctamente.');
      deferClose(() => setIsModalOpen(false));
    } catch (err) {
      setRecords(previous);
      toast.error(`Error al guardar en el servidor: ${err.message}`);
    }
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

  const summaryRows = useMemo(() => {
    const heEntities = records.map((r) => new HoraExtra(r));
    const summary = calcularHorasExtras(employees, heEntities);
    return Object.values(summary.porColaborador)
      .filter((c) => c.horas > 0)
      .sort((a, b) => b.horas - a.horas);
  }, [records, employees]);

  const totalHoras = useMemo(
    () => summaryRows.reduce((s, row) => s + Number(row.horas || 0), 0),
    [summaryRows],
  );

  const totalMonto = useMemo(
    () => summaryRows.reduce((s, row) => s + Number(row.total || 0), 0),
    [summaryRows],
  );

  const formatHoras = (h) => {
    const n = Number(h) || 0;
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  };

  const SavingDot = ({ id }) =>
    savingId === id ? (
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-1" title="Guardando..." />
    ) : null;

  return (
    <div className="space-y-3 sm:space-y-5">
      {activeView === 'planilla' && (
        <>
      {/* Pendientes de aprobación */}
      {pendingRows.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-white overflow-hidden shadow-sm">
          <div className="px-3 sm:px-5 py-3 sm:py-3.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
                Pendientes de aprobación
              </h2>
              <p className="hidden sm:block text-xs text-amber-800 mt-0.5">
                Edita y aprueba antes de sumar a la planilla. Se guarda al salir del campo.
              </p>
            </div>
            <span className="text-xs font-black bg-amber-200 text-amber-950 px-2.5 py-1 rounded-lg shrink-0">
              {pendingRows.length}
            </span>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-amber-50/70 text-[10px] font-bold text-amber-900 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Colaborador</th>
                  <th className="px-4 py-2.5 text-center w-[72px]">Horas</th>
                  <th className="px-4 py-2.5 w-[110px]">Horario</th>
                  <th className="px-4 py-2.5 text-center w-[88px]">V/Hora</th>
                  <th className="px-4 py-2.5">Descripción</th>
                  <th className="px-4 py-2.5 w-[80px]">Total</th>
                  <th className="px-4 py-2.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
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
                          || employees.find((e) => matchEmpleadoId(e.id, row.colaboradorId))?.nombre
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
                || employees.find((e) => matchEmpleadoId(e.id, row.colaboradorId))?.nombre
                || row.colaboradorId;

              return (
                <div key={row.id} className="bg-amber-50/40 border border-amber-200 rounded-xl p-3.5">
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
        </section>
      )}

      {/* Planilla principal a ancho completo */}
      <section className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden flex flex-col premium-card">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col gap-2.5 sm:flex-row sm:justify-between sm:items-center sm:gap-3">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-blue-900 uppercase tracking-wide">Planilla de Horas Extras</h2>
            <p className="hidden sm:block text-gray-500 text-xs mt-0.5">
              Aprobadas en {periodoLabel || 'el período'}. Los campos en azul claro son editables.
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl text-xs font-bold transition-all duration-200 inline-flex items-center justify-center gap-2 cursor-pointer border-none shadow-sm shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="sm:hidden">Registrar</span>
            <span className="hidden sm:inline">Registrar Horas Extras</span>
          </button>
        </div>

        {records.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600">Sin registros en esta planilla</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Usa &quot;Registrar horas&quot; para agregar una jornada o aprueba solicitudes del quiosco.
            </p>
            <button
              type="button"
              onClick={openModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold hover:bg-blue-100 cursor-pointer"
            >
              Registrar horas extras
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto max-h-[520px] sticky-scrollbar">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10 sticky-table-header">
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
                <tbody className="divide-y divide-slate-100 bg-white">
                  {records.map((row) => {
                    const emp = employees.find((e) => matchEmpleadoId(e.id, row.colaboradorId));
                    const empName = emp ? emp.nombre : 'Empleado no encontrado';
                    const calculatedTotal = row.horas * row.valorPorHora;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-4 py-2 font-medium text-slate-600 text-xs whitespace-nowrap">
                          {formatFecha(row.fecha)}
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-800 text-xs uppercase truncate max-w-[160px]">
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
                            type="button"
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
                const emp = employees.find((e) => matchEmpleadoId(e.id, row.colaboradorId));
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
      </section>
        </>
      )}

      {activeView === 'resumen' && (
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Resumen por colaborador</h2>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
              Horas acumuladas en {periodoLabel || 'el período'}
            </p>
          </div>
          <div className="text-[11px] sm:text-xs text-slate-600 font-medium tabular-nums shrink-0">
            {formatHoras(totalHoras)} h · {formatUSD(totalMonto)}
          </div>
        </div>

        {summaryRows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            Aún no hay horas aprobadas para mostrar en el resumen.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 md:px-6 py-3 w-12">#</th>
                  <th className="px-4 md:px-6 py-3">Colaborador</th>
                  <th className="px-4 md:px-6 py-3 text-right">Registros</th>
                  <th className="px-4 md:px-6 py-3 text-right">Horas</th>
                  <th className="px-4 md:px-6 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryRows.map((col, idx) => (
                  <tr key={col.empleadoId} className="hover:bg-slate-50/70">
                    <td className="px-4 md:px-6 py-3 text-xs text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-4 md:px-6 py-3">
                      <span className="text-sm font-semibold text-slate-800 uppercase">
                        {col.nombre}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-right text-sm text-slate-600 tabular-nums">
                      {col.registros?.length || 0}
                    </td>
                    <td className="px-4 md:px-6 py-3 text-right text-sm font-semibold text-slate-900 tabular-nums">
                      {formatHoras(col.horas)} h
                    </td>
                    <td className="px-4 md:px-6 py-3 text-right text-sm font-semibold text-slate-800 tabular-nums">
                      {formatUSD(col.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td className="px-4 md:px-6 py-3" colSpan={2}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total</span>
                  </td>
                  <td className="px-4 md:px-6 py-3 text-right text-sm font-semibold text-slate-700 tabular-nums">
                    {summaryRows.reduce((s, r) => s + (r.registros?.length || 0), 0)}
                  </td>
                  <td className="px-4 md:px-6 py-3 text-right text-sm font-bold text-slate-900 tabular-nums">
                    {formatHoras(totalHoras)} h
                  </td>
                  <td className="px-4 md:px-6 py-3 text-right text-sm font-bold text-slate-900 tabular-nums">
                    {formatUSD(totalMonto)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      )}

      {isModalOpen ? (
      <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onMouseDown={() => deferClose(() => setIsModalOpen(false))}
          />
          <div
            className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 max-h-[88dvh] sm:max-h-[92vh] flex flex-col animate-modal-in"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-7 pt-4 pb-3 sm:pt-6 sm:pb-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                  Registrar horas extras
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 hidden sm:block">
                  Complete los datos de la jornada laboral.
                </p>
              </div>
              <button
                type="button"
                onClick={() => deferClose(() => setIsModalOpen(false))}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0 outline-none"
                aria-label="Cerrar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-7 py-3 sm:py-5 space-y-3 sm:space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 sm:gap-4">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Fecha</label>
                    <input
                      type="date"
                      required
                      value={modalData.fecha}
                      onChange={(e) => setModalData((prev) => ({ ...prev, fecha: e.target.value }))}
                      className="w-full h-9 sm:h-10 px-2.5 sm:px-3 border border-slate-300 rounded-md bg-white text-xs sm:text-sm text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Colaborador</label>
                    <ColaboradorSearchSelect
                      employees={employees}
                      value={modalData.colaboradorId}
                      onChange={(id) => setModalData((prev) => ({ ...prev, colaboradorId: id }))}
                      disabled={employees.length === 0}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Horario</label>
                    <input
                      type="text"
                      required
                      placeholder="17:30 - 18:30"
                      value={modalData.detalleHorario}
                      onChange={(e) => setModalData((prev) => ({ ...prev, detalleHorario: e.target.value }))}
                      className="w-full h-9 sm:h-10 px-2.5 sm:px-3 border border-slate-300 rounded-md bg-white text-xs sm:text-sm text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Estado</label>
                    <select
                      value={modalData.estado}
                      onChange={(e) => setModalData((prev) => ({ ...prev, estado: e.target.value }))}
                      className="w-full h-9 sm:h-10 px-2.5 sm:px-3 border border-slate-300 rounded-md bg-white text-xs sm:text-sm text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 cursor-pointer"
                    >
                      <option value="DEUDOR">Por pagar</option>
                      <option value="PAGADO">Pagado</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Descripción</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Soporte técnico"
                      value={modalData.descripcion}
                      onChange={(e) => setModalData((prev) => ({ ...prev, descripcion: e.target.value }))}
                      className="w-full h-9 sm:h-10 px-2.5 sm:px-3 border border-slate-300 rounded-md bg-white text-xs sm:text-sm text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Horas</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      required
                      value={modalData.horas}
                      onChange={(e) => setModalData((prev) => ({ ...prev, horas: e.target.value }))}
                      className="w-full h-9 sm:h-10 px-2.5 sm:px-3 border border-slate-300 rounded-md bg-white text-xs sm:text-sm text-slate-800 text-center outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Valor/h</label>
                    <div className="relative">
                      <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs sm:text-sm select-none">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={modalData.valorPorHora}
                        onChange={(e) => setModalData((prev) => ({ ...prev, valorPorHora: e.target.value }))}
                        className="w-full h-9 sm:h-10 pl-6 sm:pl-7 pr-2.5 sm:pr-3 border border-slate-300 rounded-md bg-white text-xs sm:text-sm text-slate-800 outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-9 sm:h-10 px-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-slate-500">Total estimado</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 tabular-nums">
                    {formatUSD(
                      (Number(modalData.horas) || 0) * (Number(modalData.valorPorHora) || 0),
                    )}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex gap-2 px-4 sm:px-7 py-3 sm:py-4 border-t border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => deferClose(() => setIsModalOpen(false))}
                  className="flex-1 sm:flex-none h-9 sm:h-10 px-4 rounded-md border border-slate-300 text-slate-700 font-medium text-xs sm:text-sm hover:bg-slate-50 cursor-pointer transition-colors bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none h-9 sm:h-10 px-5 rounded-md bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 cursor-pointer transition-colors border-none"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
      ) : null}

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
