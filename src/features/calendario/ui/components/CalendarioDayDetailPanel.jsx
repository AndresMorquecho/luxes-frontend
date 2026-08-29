import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cake,
  ListChecks,
  Clock,
  Car,
  CreditCard,
  Wrench,
  Package,
  ListTodo,
  ExternalLink,
  Calendar,
  Plus,
  User,
} from 'lucide-react';

const MINIMAL_THEMES = [
  {
    dot: 'bg-indigo-600',
    border: 'border-indigo-200',
    bg: 'bg-indigo-50/50',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    dot: 'bg-emerald-600',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/50',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    dot: 'bg-sky-600',
    border: 'border-sky-200',
    bg: 'bg-sky-50/50',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  {
    dot: 'bg-amber-600',
    border: 'border-amber-200',
    bg: 'bg-amber-50/50',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    dot: 'bg-rose-600',
    border: 'border-rose-200',
    bg: 'bg-rose-50/50',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    dot: 'bg-purple-600',
    border: 'border-purple-200',
    bg: 'bg-purple-50/50',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    dot: 'bg-teal-600',
    border: 'border-teal-200',
    bg: 'bg-teal-50/50',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
  },
];

function getThemeForAssignees(emps) {
  if (!emps || emps.length === 0) return MINIMAL_THEMES[0];
  const key = emps.map((e) => e.id || e.nombre || String(e)).sort().join('-');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MINIMAL_THEMES[Math.abs(hash) % MINIMAL_THEMES.length];
}

const fmtFullDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return dt.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  return dateStr;
};

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatFullNameClean(fullName) {
  if (!fullName) return '';
  return fullName
    .trim()
    .split(/\s+/)
    .map(capitalize)
    .join(' ');
}

function getInitials(fullName) {
  if (!fullName) return '??';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getCategoryIconLarge(cat) {
  switch (cat) {
    case 'cumpleanos': return <Cake size={15} className="text-amber-600 shrink-0" />;
    case 'rutina': return <ListChecks size={15} className="text-indigo-600 shrink-0" />;
    case 'proyecto': return <Package size={15} className="text-sky-600 shrink-0" />;
    case 'instalacion': return <Wrench size={15} className="text-teal-600 shrink-0" />;
    case 'cheque': return <CreditCard size={15} className="text-emerald-600 shrink-0" />;
    case 'gasto_fijo': return <Clock size={15} className="text-rose-600 shrink-0" />;
    case 'mantenimiento': return <Car size={15} className="text-amber-600 shrink-0" />;
    default: return <ListTodo size={15} className="text-slate-600 shrink-0" />;
  }
}

function getCategoryBadgeLabel(cat) {
  switch (cat) {
    case 'cumpleanos': return 'Cumpleaños';
    case 'rutina': return 'Rutina & Turno';
    case 'proyecto': return 'Proyecto';
    case 'instalacion': return 'Instalación';
    case 'cheque': return 'Cheque Posfechado';
    case 'gasto_fijo': return 'Gasto Fijo';
    case 'mantenimiento': return 'Mantenimiento';
    default: return 'Tarea';
  }
}

export const CalendarioDayDetailPanel = ({
  selectedDateStr,
  dayEvents,
  onOpenRutinasModal,
}) => {
  const navigate = useNavigate();

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
  const isToday = selectedDateStr === todayStr;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="pb-3 mb-3 border-b border-slate-100 flex items-start justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {selectedDateStr}
            </span>
            {isToday && (
              <span className="text-[9px] font-bold uppercase text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                Hoy
              </span>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 capitalize mt-1 leading-tight">
            {fmtFullDate(selectedDateStr)}
          </h3>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
          {dayEvents.length} actividad{dayEvents.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Events List for the Selected Day */}
      <div className="space-y-2.5 overflow-y-auto max-h-[580px] pr-1">
        {dayEvents.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400">
            <Calendar size={32} className="text-slate-200 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No hay actividades programadas</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Puedes programar una rutina para este día.</p>
            <button
              type="button"
              onClick={onOpenRutinasModal}
              className="mt-3 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <Plus size={12} /> Nueva Rutina
            </button>
          </div>
        ) : (
          dayEvents.map((ev) => {
            const isRutina = ev.categoria === 'rutina';
            const emps = ev.metadata?.empleados || [];
            const theme = isRutina ? getThemeForAssignees(emps) : MINIMAL_THEMES[2];

            return (
              <div
                key={ev.id}
                className={`p-3.5 rounded-2xl border ${theme.border} ${theme.bg} shadow-2xs`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {getCategoryIconLarge(ev.categoria)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9.5px] font-bold uppercase tracking-wider font-mono px-1.5 py-0.2 rounded-md border ${theme.badge}`}>
                          {getCategoryBadgeLabel(ev.categoria)}
                        </span>
                        {ev.hora && (
                          <span className="text-[9.5px] font-semibold text-slate-600 bg-white/80 border border-slate-200/60 px-1.5 py-0.2 rounded font-mono">
                            {ev.hora}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug mt-1">
                        {ev.titulo}
                      </h4>

                      {isRutina && emps.length > 0 ? (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10.5px] font-semibold text-slate-600">Colaboradores:</span>
                          {emps.map((e) => {
                            const initials = getInitials(e.nombre);
                            const cleanName = formatFullNameClean(e.nombre);

                            return (
                              <span
                                key={e.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[10.5px] font-semibold text-slate-800 shadow-2xs"
                              >
                                <span className="w-4.5 h-4.5 rounded-full overflow-hidden flex items-center justify-center bg-slate-100 text-slate-600 text-[8px] font-bold shrink-0 border border-slate-200">
                                  {e.foto ? (
                                    <img
                                      src={e.foto}
                                      alt={cleanName}
                                      className="w-full h-full object-cover rounded-full"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(el) => {
                                        el.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <span>{initials}</span>
                                  )}
                                </span>
                                <span>{cleanName}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : ev.categoria === 'cumpleanos' ? (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-amber-100 text-amber-900 text-[9px] font-bold border border-amber-300 shadow-2xs shrink-0">
                            {ev.metadata?.foto ? (
                              <img
                                src={ev.metadata.foto}
                                alt={ev.metadata?.nombre}
                                className="w-full h-full object-cover rounded-full"
                                loading="lazy"
                                decoding="async"
                                onError={(el) => {
                                  el.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span>{getInitials(ev.metadata?.nombre)}</span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-amber-950">
                            {formatFullNameClean(ev.metadata?.nombre)}
                          </span>
                        </div>
                      ) : ev.subtitulo ? (
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-tight">
                          {ev.subtitulo}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Optional Link to Module */}
                {ev.url && (
                  <div className="flex items-center justify-end mt-2.5 pt-2 border-t border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => navigate(ev.url)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink size={11} />
                      Ver Detalle
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
