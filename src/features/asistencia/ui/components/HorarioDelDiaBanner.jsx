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
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
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

              {/* ── Tolerancia y Multas ─────────────────────────────────────── */}
              <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/60 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Tolerancia y Multas por Atraso</h3>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Aplica a la <strong>entrada</strong> y al <strong>regreso de almuerzo</strong>. El almuerzo se mide desde que el empleado marcó la salida + 1 hora.
                </p>

                <div className="flex items-end gap-3">
                  <label className="text-[11px] font-bold text-slate-600 flex flex-col gap-1 w-40">
                    Minutos de tolerancia
                    <input
                      id="toleranciaMinutosInput"
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      value={form.toleranciaMinutos ?? 8}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0));
                        setForm((f) => ({ ...f, toleranciaMinutos: v }));
                      }}
                      className="mt-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </label>
                  <span className="text-xs text-slate-500 mb-2">minutos sin multa antes de descontar</span>
                </div>

                {/* Preview table */}
                {(() => {
                  const tol = form.toleranciaMinutos ?? 8;
                  const entradaBase = form.semana?.entrada || '08:00';
                  const [bH, bM] = entradaBase.split(':').map(Number);
                  const addMins = (h, m, add) => {
                    const total = h * 60 + m + add;
                    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
                  };
                  const tramos = [
                    { rango: `≤ ${addMins(bH, bM, tol)}`, minLabel: `Hasta ${tol} min de tolerancia`, multa: '$0.00', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                    { rango: `${addMins(bH, bM, tol + 1)} – ${addMins(bH, bM, tol + 8)}`, minLabel: `+${tol + 1} a +${tol + 8} min`, multa: '$2.00', color: 'text-amber-700 bg-amber-50 border-amber-200' },
                    { rango: `${addMins(bH, bM, tol + 9)} – ${addMins(bH, bM, tol + 16)}`, minLabel: `+${tol + 9} a +${tol + 16} min`, multa: '$3.00', color: 'text-orange-700 bg-orange-50 border-orange-200' },
                    { rango: `≥ ${addMins(bH, bM, tol + 17)}`, minLabel: `≥ +${tol + 17} min`, multa: '$4.00', color: 'text-red-700 bg-red-50 border-red-200' },
                  ];
                  return (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                        Tabla de multas (ejemplo basado en entrada {entradaBase}):
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {tramos.map((t) => (
                          <div key={t.multa + t.rango} className={`border rounded-lg px-2.5 py-2 text-center ${t.color}`}>
                            <p className="text-[10px] font-semibold leading-tight">{t.minLabel}</p>
                            <p className="text-xs font-mono font-bold mt-0.5">{t.rango}</p>
                            <p className="text-base font-extrabold mt-1 tabular-nums">{t.multa}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">La misma lógica aplica al regreso de almuerzo (desde la hora de salida + 1 h).</p>
                    </div>
                  );
                })()}

                {/* ── Horas Extras ────────────────────────────────────────── */}
                <div className="mt-5 pt-4 border-t border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Horas Extras</h3>
                  </div>
                  <p className="text-[11px] text-blue-700 leading-relaxed mb-3">
                    Hay <strong>30 minutos de tolerancia</strong> después de la hora de salida. Durante ese margen el empleado puede marcar <em>Salida</em> normalmente sin generar horas extras. Pasado ese tiempo aparece el botón <em>Fin Horas Extras</em>.
                  </p>

                  {/* Preview de la ventana de tolerancia */}
                  {(() => {
                    const salidaStr = form.semana?.salida || '17:30';
                    const [sh, sm] = salidaStr.split(':').map(Number);
                    const pad = (n) => String(n).padStart(2, '0');
                    const addM = (h, m, add) => { const t = h * 60 + m + add; return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`; };
                    const toleranciaFin = addM(sh, sm, 30);
                    return (
                      <div className="flex items-stretch gap-0 mb-3 text-[10px] font-semibold rounded-lg overflow-hidden border border-slate-200">
                        <div className="bg-emerald-50 border-r border-slate-200 px-3 py-2 text-center text-emerald-700 flex-1">
                          <p className="font-bold">Salida normal</p>
                          <p className="font-mono mt-0.5">{salidaStr} → {toleranciaFin}</p>
                          <p className="text-[9px] mt-0.5 opacity-70">Sin horas extras</p>
                        </div>
                        <div className="bg-blue-50 px-3 py-2 text-center text-blue-700 flex-1">
                          <p className="font-bold">Fin Horas Extras</p>
                          <p className="font-mono mt-0.5">≥ {toleranciaFin}</p>
                          <p className="text-[9px] mt-0.5 opacity-70">Desde {salidaStr} hasta fin</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="text-[11px] font-bold text-slate-600 flex flex-col gap-1 flex-1">
                      Valor hora extra completa ($)
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          id="valorHoraExtraInput"
                          type="number"
                          min={0}
                          step={0.25}
                          value={form.valorHoraExtra ?? 2.50}
                          onChange={(e) => {
                            const v = Math.max(0, parseFloat(e.target.value) || 0);
                            setForm((f) => ({ ...f, valorHoraExtra: v }));
                          }}
                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                    </label>
                    <label className="text-[11px] font-bold text-slate-600 flex flex-col gap-1 flex-1">
                      Valor media hora extra ($)
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-slate-400 text-sm">$</span>
                        <input
                          id="valorMediaHoraExtraInput"
                          type="number"
                          min={0}
                          step={0.25}
                          value={form.valorMediaHoraExtra ?? 1.50}
                          onChange={(e) => {
                            const v = Math.max(0, parseFloat(e.target.value) || 0);
                            setForm((f) => ({ ...f, valorMediaHoraExtra: v }));
                          }}
                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    El administrador puede editar el total antes de aprobar. Ej: 34 min → 0.5h facturado → <strong>${(form.valorMediaHoraExtra ?? 1.50).toFixed(2)}</strong>
                  </p>
                </div>
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
