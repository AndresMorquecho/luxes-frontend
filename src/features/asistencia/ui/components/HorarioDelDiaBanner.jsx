import React, { useEffect, useState } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { toast } from '../../../../shared/ui/components/Toast';
import { normalizeHorariosConfig, getHorariosResumen, isSabado } from '../../helpers/horarioLaboral';

const HorarioDiaForm = ({ title, value, onChange }) => {
  const set = (field, val) => onChange({ ...value, [field]: val });
  const inputCls = 'mt-1 w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm';

  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2.5 h-full">
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-semibold text-slate-500 col-span-2">
          Título
          <input
            type="text"
            value={value.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-[11px] font-semibold text-slate-500">
          Entrada
          <input type="time" value={value.entrada} onChange={(e) => set('entrada', e.target.value)} className={inputCls} />
        </label>
        <label className="text-[11px] font-semibold text-slate-500">
          Salida
          <input type="time" value={value.salida} onChange={(e) => set('salida', e.target.value)} className={inputCls} />
        </label>
        {!value.almuerzoOpcional && (
          <>
            <label className="text-[11px] font-semibold text-slate-500">
              Sal. almuerzo
              <input type="time" value={value.inicioAlmuerzo || ''} onChange={(e) => set('inicioAlmuerzo', e.target.value)} className={inputCls} />
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              Reg. almuerzo
              <input type="time" value={value.finAlmuerzo || ''} onChange={(e) => set('finAlmuerzo', e.target.value)} className={inputCls} />
            </label>
          </>
        )}
        <label className="text-[11px] font-semibold text-slate-500 col-span-2">
          Nota
          <input type="text" value={value.nota || ''} onChange={(e) => set('nota', e.target.value)}
            placeholder="Opcional"
            className={inputCls} />
        </label>
        <label className="text-[11px] font-medium text-slate-600 flex items-center gap-2 col-span-2 cursor-pointer">
          <input
            type="checkbox"
            className="shrink-0"
            checked={value.almuerzoOpcional}
            onChange={(e) => set('almuerzoOpcional', e.target.checked)}
          />
          Almuerzo opcional
        </label>
      </div>
    </div>
  );
};

export function HorarioEditModal({ open, initialConfig, onClose, onSave, saving }) {
  const [form, setForm] = useState(normalizeHorariosConfig(initialConfig));

  useEffect(() => {
    if (open) setForm(normalizeHorariosConfig(initialConfig));
  }, [open, initialConfig]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave(form);
      toast.success('Horarios guardados correctamente');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al guardar horarios');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="shrink-0 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Editar horarios laborales</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Se muestran al marcar asistencia y en el control diario</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer bg-transparent border-none">×</button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <HorarioDiaForm
                  title="Lunes a viernes"
                  value={form.semana}
                  onChange={(semana) => setForm((f) => ({ ...f, semana }))}
                />
                <HorarioDiaForm
                  title="Sábado"
                  value={form.sabado}
                  onChange={(sabado) => setForm((f) => ({ ...f, sabado }))}
                />
              </div>
            </div>
            <div className="shrink-0 flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/80">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer bg-white">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-50 cursor-pointer border-none">
                {saving ? 'Guardando…' : 'Guardar horarios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

const HORARIO_SLOTS = [
  { key: 'ENTRADA', short: 'Entrada' },
  { key: 'INICIO_ALMUERZO', short: 'Sal. alm.' },
  { key: 'FIN_ALMUERZO', short: 'Reg. alm.' },
  { key: 'SALIDA', short: 'Salida' },
];

function HorarioSlotCard({ short, slot, isDark }) {
  if (!slot) return null;

  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 text-center min-w-[4.25rem] shrink-0 ${
        isDark
          ? 'border-blue-500/30 bg-slate-900/50'
          : 'border-blue-200/80 bg-white/80 shadow-sm'
      }`}
    >
      <p className={`text-[9px] font-bold uppercase tracking-wide ${
        isDark ? 'text-blue-300/80' : 'text-blue-600/90'
      }`}>
        {short}
      </p>
      <p className={`text-xs font-mono font-bold mt-0.5 ${
        isDark ? 'text-slate-100' : 'text-blue-900'
      }`}>
        {slot.label}
      </p>
    </div>
  );
}

function HorarioBloque({ titulo, label, esperado, isDark, active }) {
  const slots = HORARIO_SLOTS.filter(({ key }) => esperado?.[key]);

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 flex-1 min-w-[220px] ${
        active
          ? isDark
            ? 'border-blue-400/50 bg-blue-950/30 ring-1 ring-blue-400/30'
            : 'border-blue-300 bg-white ring-1 ring-blue-200 shadow-sm'
          : isDark
            ? 'border-slate-700/80 bg-slate-900/30'
            : 'border-blue-100/80 bg-white/60'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
        <span className={`text-[11px] font-bold uppercase tracking-wide ${
          active
            ? isDark ? 'text-blue-300' : 'text-blue-700'
            : isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {titulo}
        </span>
        {active && (
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
            isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
          }`}>
            Aplica
          </span>
        )}
        <span className={`text-[11px] font-medium ${
          isDark ? 'text-slate-300' : 'text-slate-600'
        }`}>
          {label.replace(`${titulo} · `, '')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {slots.map(({ key, short }) => (
          <HorarioSlotCard key={key} short={short} slot={esperado[key]} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}

export function HorarioDelDiaBanner({
  label,
  esperado,
  theme = 'light',
  editable,
  onEdit,
  horariosConfig,
  fechaActiva,
  showAllHorarios = false,
}) {
  const isDark = theme === 'dark';
  const slots = HORARIO_SLOTS.filter(({ key }) => esperado?.[key]);
  const horarios = showAllHorarios && horariosConfig ? getHorariosResumen(horariosConfig) : null;
  const activoKey = fechaActiva && isSabado(fechaActiva) ? 'sabado' : 'semana';

  if (horarios) {
    return (
      <div className={`mb-4 px-4 py-3 rounded-xl ${
        isDark
          ? 'bg-slate-800/80 border border-slate-700/80'
          : 'bg-blue-50 border border-blue-100'
      }`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
          <span className={`text-xs font-bold uppercase tracking-wide shrink-0 ${
            isDark ? 'text-blue-300' : 'text-blue-800'
          }`}>
            Horarios laborales
          </span>
          {fechaActiva && (
            <span className={`text-[11px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Día consultado: {horarios.find((h) => h.key === activoKey)?.label}
            </span>
          )}
          {editable && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="ml-auto shrink-0 px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
            >
              Editar horarios
            </button>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2.5">
          {horarios.map((h) => (
            <HorarioBloque
              key={h.key}
              titulo={h.titulo}
              label={h.label}
              esperado={h.esperado}
              isDark={isDark}
              active={h.key === activoKey}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-4 px-4 py-3 rounded-xl flex flex-wrap items-center gap-x-3 gap-y-2 ${
      isDark
        ? 'bg-slate-800/80 border border-slate-700/80'
        : 'bg-blue-50 border border-blue-100'
    }`}>
      <span className={`text-xs font-bold uppercase tracking-wide shrink-0 ${
        isDark ? 'text-blue-300' : 'text-blue-800'
      }`}>
        Horario del día
      </span>
      <span className={`text-sm font-medium shrink-0 ${
        isDark ? 'text-slate-100' : 'text-blue-900'
      }`}>
        {label}
      </span>
      {slots.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {slots.map(({ key, short }) => (
            <HorarioSlotCard key={key} short={short} slot={esperado[key]} isDark={isDark} />
          ))}
        </div>
      )}
      {editable && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto shrink-0 px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
        >
          Editar horarios
        </button>
      )}
    </div>
  );
}
