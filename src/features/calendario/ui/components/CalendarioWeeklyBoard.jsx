import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListChecks,
  CheckCircle2,
  Package,
  Wrench,
  Cake,
  CreditCard,
  Clock,
  Car,
  ListTodo,
  ExternalLink,
  Plus,
  Clock3,
} from 'lucide-react';
import { toggleRutinaCompletada } from '../../application/calendarioService';
import { toast } from '../../../../shared/ui/components/Toast';

const AVATAR_PALETTE = [
  'bg-[#2b41b8] text-white',
  'bg-amber-500 text-slate-900',
  'bg-emerald-600 text-white',
  'bg-rose-500 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
  'bg-cyan-600 text-white',
];

function getInitials(fullName) {
  if (!fullName) return '??';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatShortName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) {
    return parts.map(capitalize).join(' ');
  }
  const firstName = capitalize(parts[0]);
  const firstSurname = capitalize(parts.length === 4 ? parts[2] : parts[parts.length - 1]);
  return `${firstName} ${firstSurname}`;
}

function getCategoryCardStyle(cat, completado) {
  if (completado) {
    return {
      bg: 'bg-emerald-50/70 hover:bg-emerald-50',
      border: 'border-emerald-200/90',
      tagBg: 'bg-emerald-100/90 text-emerald-900',
      iconBg: 'bg-emerald-200/80 text-emerald-800',
      accent: 'text-emerald-700',
    };
  }

  switch (cat) {
    case 'rutina':
      return {
        bg: 'bg-[#f4f7ff] hover:bg-[#eef3ff]',
        border: 'border-[#d6e2ff]',
        tagBg: 'bg-blue-100/80 text-[#0b2d64]',
        iconBg: 'bg-[#0b2d64] text-white',
        accent: 'text-[#2b41b8]',
      };
    case 'proyecto':
      return {
        bg: 'bg-[#eff6ff] hover:bg-[#e0f2fe]',
        border: 'border-blue-200',
        tagBg: 'bg-blue-100 text-blue-800',
        iconBg: 'bg-blue-600 text-white',
        accent: 'text-blue-700',
      };
    case 'instalacion':
      return {
        bg: 'bg-[#f8fafc] hover:bg-[#f1f5f9]',
        border: 'border-slate-300',
        tagBg: 'bg-slate-200 text-slate-800',
        iconBg: 'bg-slate-700 text-white',
        accent: 'text-slate-700',
      };
    case 'cumpleanos':
      return {
        bg: 'bg-[#fffbeb] hover:bg-[#fef3c7]',
        border: 'border-amber-200',
        tagBg: 'bg-amber-100 text-amber-900',
        iconBg: 'bg-amber-500 text-white',
        accent: 'text-amber-700',
      };
    case 'cheque':
      return {
        bg: 'bg-[#ecfdf5] hover:bg-[#d1fae5]',
        border: 'border-emerald-200',
        tagBg: 'bg-emerald-100 text-emerald-900',
        iconBg: 'bg-emerald-600 text-white',
        accent: 'text-emerald-700',
      };
    case 'gasto_fijo':
      return {
        bg: 'bg-[#fff1f2] hover:bg-[#ffe4e6]',
        border: 'border-rose-200',
        tagBg: 'bg-rose-100 text-rose-900',
        iconBg: 'bg-rose-600 text-white',
        accent: 'text-rose-700',
      };
    case 'mantenimiento':
      return {
        bg: 'bg-[#fff7ed] hover:bg-[#ffedd5]',
        border: 'border-orange-200',
        tagBg: 'bg-orange-100 text-orange-900',
        iconBg: 'bg-orange-500 text-white',
        accent: 'text-orange-700',
      };
    default:
      return {
        bg: 'bg-slate-50 hover:bg-slate-100/80',
        border: 'border-slate-200',
        tagBg: 'bg-slate-200 text-slate-800',
        iconBg: 'bg-slate-600 text-white',
        accent: 'text-slate-700',
      };
  }
}

function getCategoryIcon(cat, completado) {
  if (completado) return <CheckCircle2 size={13} />;
  switch (cat) {
    case 'cumpleanos': return <Cake size={13} />;
    case 'rutina': return <ListChecks size={13} />;
    case 'proyecto': return <Package size={13} />;
    case 'instalacion': return <Wrench size={13} />;
    case 'cheque': return <CreditCard size={13} />;
    case 'gasto_fijo': return <Clock size={13} />;
    case 'mantenimiento': return <Car size={13} />;
    default: return <ListTodo size={13} />;
  }
}

function getCategoryLabel(cat) {
  switch (cat) {
    case 'cumpleanos': return 'Cumpleaños';
    case 'rutina': return 'Rutina / Turno';
    case 'proyecto': return 'Proyecto';
    case 'instalacion': return 'Instalación';
    case 'cheque': return 'Cheque';
    case 'gasto_fijo': return 'Gasto Fijo';
    case 'mantenimiento': return 'Mantenimiento';
    default: return 'Actividad';
  }
}

export const CalendarioWeeklyBoard = ({
  currentWeekDays,
  eventos,
  onEventUpdated,
  onOpenRutinasModal,
}) => {
  const navigate = useNavigate();
  const [togglingId, setTogglingId] = useState(null);

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  // Map events by date
  const eventsByDate = {};
  for (const ev of eventos) {
    if (!eventsByDate[ev.fecha]) eventsByDate[ev.fecha] = [];
    eventsByDate[ev.fecha].push(ev);
  }

  const handleToggleRutina = async (ev, dateStr) => {
    const rutinaId = ev.metadata?.rutinaId;
    if (!rutinaId) return;

    setTogglingId(ev.id);
    try {
      const res = await toggleRutinaCompletada(rutinaId, dateStr);
      toast.success(res.completada ? 'Rutina completada' : 'Rutina marcada como pendiente');
      if (onEventUpdated) onEventUpdated();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar estado');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5 items-start">
      {currentWeekDays.map((day) => {
        const dayEvents = eventsByDate[day.dateStr] || [];
        const isToday = day.dateStr === todayStr;

        return (
          <div
            key={day.dateStr}
            className={`rounded-2xl flex flex-col transition-all min-h-[380px] ${
              isToday
                ? 'bg-blue-50/30 border-2 border-[#2b41b8]/40 shadow-xs'
                : 'bg-slate-50/60 border border-slate-200/80'
            } p-2.5`}
          >
            {/* Column Day Header Pill (Inspired by Reference) */}
            <div className="mb-3">
              <div
                className={`px-3 py-2 rounded-xl flex items-center justify-between transition-all ${
                  isToday
                    ? 'bg-[#0b2d64] text-white shadow-md'
                    : 'bg-white text-slate-800 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider block leading-tight ${
                      isToday ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {day.weekdayName}
                  </span>
                  <span className="text-sm font-black font-mono leading-none mt-0.5 block">
                    {day.dayAndMonth}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-extrabold font-mono px-2 py-0.5 rounded-full ${
                    isToday
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {dayEvents.length}
                </span>
              </div>
            </div>

            {/* Stacked Activity Cards */}
            <div className="space-y-2.5 flex-1">
              {dayEvents.length === 0 ? (
                <div className="h-32 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-3 text-center">
                  <span className="text-slate-300 text-xs font-semibold">Sin actividades</span>
                  <button
                    type="button"
                    onClick={onOpenRutinasModal}
                    className="mt-1.5 text-[11px] font-bold text-[#2b41b8] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus size={12} /> Añadir Turno
                  </button>
                </div>
              ) : (
                dayEvents.map((ev) => {
                  const isRutina = ev.categoria === 'rutina';
                  const style = getCategoryCardStyle(ev.categoria, ev.completado);
                  const isToggling = togglingId === ev.id;
                  const emps = ev.metadata?.empleados || [];

                  return (
                    <div
                      key={ev.id}
                      className={`rounded-2xl border p-3.5 transition-all relative overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${style.bg} ${style.border}`}
                    >
                      {/* Top Bar: Round Category Icon + Tag + Time */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${style.iconBg}`}
                          >
                            {getCategoryIcon(ev.categoria, ev.completado)}
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider truncate ${style.tagBg}`}
                          >
                            {getCategoryLabel(ev.categoria)}
                          </span>
                        </div>

                        {ev.hora && (
                          <span className="text-[10px] font-bold font-mono text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/50 flex items-center gap-1 shrink-0">
                            <Clock3 size={10} />
                            {ev.hora}
                          </span>
                        )}
                      </div>

                      {/* Card Title */}
                      <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 leading-snug mb-1">
                        {ev.titulo}
                      </h4>

                      {/* Subtitle / Description */}
                      {ev.subtitulo && !isRutina && (
                        <p className="text-[11px] text-slate-600 font-medium leading-tight mb-2.5 line-clamp-2">
                          {ev.subtitulo}
                        </p>
                      )}

                      {/* Participants / Circular Avatars Group (Inspired by Reference) */}
                      {isRutina && emps.length > 0 && (
                        <div className="my-2.5 pt-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                            Colaboradores en Turno
                          </span>
                          <div className="flex items-center">
                            <div className="flex -space-x-2 overflow-hidden items-center">
                              {emps.slice(0, 4).map((emp, i) => {
                                const initials = getInitials(emp.nombre);
                                const avatarBg = getAvatarColor(emp.nombre);
                                const shortName = formatShortName(emp.nombre);

                                return (
                                  <div
                                    key={emp.id || i}
                                    title={shortName}
                                    className={`relative inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black ring-2 ring-white shadow-xs cursor-pointer hover:scale-110 hover:z-10 transition-transform ${avatarBg}`}
                                  >
                                    {emp.foto ? (
                                      <img
                                        src={emp.foto}
                                        alt={shortName}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      initials
                                    )}
                                  </div>
                                );
                              })}

                              {emps.length > 4 && (
                                <div className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black bg-slate-800 text-white ring-2 ring-white shadow-xs">
                                  +{emps.length - 4}
                                </div>
                              )}
                            </div>

                            <span className="text-[10.5px] font-bold text-slate-700 ml-2 truncate">
                              {emps.map((e) => formatShortName(e.nombre)).join(', ')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Single Avatar for Birthday */}
                      {ev.categoria === 'cumpleanos' && (
                        <div className="my-2 flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-slate-900 bg-amber-400 ring-2 ring-white shadow-2xs`}
                          >
                            {getInitials(ev.metadata?.nombre)}
                          </div>
                          <span className="text-xs font-bold text-amber-900">
                            {ev.metadata?.nombre}
                          </span>
                        </div>
                      )}

                      {/* Bottom Actions */}
                      <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between gap-1.5">
                        {isRutina ? (
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleRutina(ev, day.dateStr)}
                            className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                              ev.completado
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-[#0b2d64] hover:bg-[#1e3a8a] text-white'
                            }`}
                          >
                            <CheckCircle2 size={13} />
                            {ev.completado ? 'Completada' : 'Marcar Completada'}
                          </button>
                        ) : ev.url ? (
                          <button
                            type="button"
                            onClick={() => navigate(ev.url)}
                            className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white/90 hover:bg-white border border-slate-200 shadow-2xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <ExternalLink size={12} />
                            Ver Detalle
                          </button>
                        ) : (
                          <span className="text-[10.5px] font-bold text-slate-400">Programado</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
