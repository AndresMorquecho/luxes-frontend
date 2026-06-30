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
  compact = false,
  kiosk = false,
  kioskColumn = false,
  embedded = false,
}) {
  const isDark = theme === 'dark';
  const slots = HORARIO_SLOTS.filter(({ key }) => esperado?.[key]);
  const horarios = showAllHorarios && horariosConfig ? getHorariosResumen(horariosConfig) : null;
  const activoKey = fechaActiva && isSabado(fechaActiva) ? 'sabado' : 'semana';

  if (kioskColumn) {
    const panelShell = embedded
      ? 'h-full flex flex-col min-h-0'
      : 'h-full w-full flex flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/90 via-slate-900/95 to-slate-950 shadow-xl shadow-black/30 backdrop-blur-md p-5 overflow-hidden';

    return (
      <div className={panelShell}>
        <div className={`shrink-0 ${embedded ? '' : 'mb-4'}`}>
          <div className={`flex items-center gap-2 ${embedded ? 'justify-center' : ''}`}>
            <div className={`w-1 rounded-full bg-sky-400 ${embedded ? 'h-3' : 'h-5'}`} />
            <p className={`font-bold uppercase text-sky-200 tracking-widest ${embedded ? 'text-[10px]' : 'text-sm'}`}>
              Horario
            </p>
          </div>
          {!embedded && (
            <p className="hidden lg:block text-[11px] text-slate-400 leading-relaxed mt-2.5 px-3 py-2 rounded-lg bg-slate-950/50 border border-white/5">
              {label}
            </p>
          )}
        </div>
        <div className={`grid grid-rows-5 gap-1 flex-1 min-h-0 ${embedded ? 'mt-1.5' : 'lg:flex lg:flex-col lg:gap-2.5 lg:justify-center'}`}>
          {slots.map(({ key, short }) => (
            <div
              key={key}
              className={`flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950/35 min-h-0 transition-colors ${
                embedded ? 'px-2 py-1.5' : 'px-4 py-3 hover:border-sky-500/20'
              }`}
            >
              <span className={`font-semibold uppercase text-sky-300/90 truncate leading-tight ${embedded ? 'text-[9px]' : 'text-xs lg:text-sm'}`}>
                {short}
              </span>
              <span className={`font-mono font-bold text-white shrink-0 tabular-nums ${embedded ? 'text-xs' : 'text-lg lg:text-xl'}`}>
                {esperado[key].label}
              </span>
            </div>
          ))}
          {embedded && slots.length < 5 && (
            <div
              className="flex items-center justify-center rounded-lg border border-dashed border-slate-700/40 bg-slate-900/15 min-h-0"
              aria-hidden
            >
              <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Extras</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (kiosk) {
    return (
      <div className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-700/70 bg-slate-800/60 min-w-0 overflow-hidden">
        <span className="text-[9px] font-bold uppercase text-blue-300 whitespace-nowrap shrink-0">
          Horario
        </span>
        <span className="text-[10px] font-medium text-slate-400 truncate min-w-0 hidden sm:inline">
          {label}
        </span>
        {slots.length > 0 && (
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {slots.map(({ key, short }) => (
              <span
                key={key}
                className="text-[8px] font-bold text-blue-200/90 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-600/80 whitespace-nowrap"
                title={short}
              >
                {esperado[key].label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

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
    <div className={`${compact ? 'mb-0 px-3 py-2 rounded-lg gap-x-2 gap-y-1' : 'mb-4 px-4 py-3 rounded-xl gap-x-3 gap-y-2'} flex flex-wrap items-center ${
      isDark
        ? 'bg-slate-800/80 border border-slate-700/80'
        : 'bg-blue-50 border border-blue-100'
    }`}>
      <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold uppercase tracking-wide shrink-0 ${
        isDark ? 'text-blue-300' : 'text-blue-800'
      }`}>
        Horario del día
      </span>
      <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium shrink-0 ${
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
