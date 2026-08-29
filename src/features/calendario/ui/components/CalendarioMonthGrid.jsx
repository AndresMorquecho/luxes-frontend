import React from 'react';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Minimalist Color Schemes (Dot + Soft Tint Capsule)
const MINIMAL_THEMES = [
  {
    // 0: Indigo
    dot: 'bg-indigo-600',
    bg: 'bg-indigo-50/70 hover:bg-indigo-100/70 border-indigo-200/60 text-indigo-950',
    avatarBg: 'bg-white text-indigo-700 border-indigo-200',
  },
  {
    // 1: Emerald
    dot: 'bg-emerald-600',
    bg: 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200/60 text-emerald-950',
    avatarBg: 'bg-white text-emerald-700 border-emerald-200',
  },
  {
    // 2: Sky Blue
    dot: 'bg-sky-600',
    bg: 'bg-sky-50/70 hover:bg-sky-100/70 border-sky-200/60 text-sky-950',
    avatarBg: 'bg-white text-sky-700 border-sky-200',
  },
  {
    // 3: Warm Amber
    dot: 'bg-amber-600',
    bg: 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200/60 text-amber-950',
    avatarBg: 'bg-white text-amber-700 border-amber-200',
  },
  {
    // 4: Rose
    dot: 'bg-rose-600',
    bg: 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-200/60 text-rose-950',
    avatarBg: 'bg-white text-rose-700 border-rose-200',
  },
  {
    // 5: Purple
    dot: 'bg-purple-600',
    bg: 'bg-purple-50/70 hover:bg-purple-100/70 border-purple-200/60 text-purple-950',
    avatarBg: 'bg-white text-purple-700 border-purple-200',
  },
  {
    // 6: Teal
    dot: 'bg-teal-600',
    bg: 'bg-teal-50/70 hover:bg-teal-100/70 border-teal-200/60 text-teal-950',
    avatarBg: 'bg-white text-teal-700 border-teal-200',
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

function getInitials(fullName) {
  if (!fullName) return '??';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

function getEventStyle(ev) {
  const cat = ev.categoria;

  if (cat === 'rutina') {
    const emps = ev.metadata?.empleados || [];
    return getThemeForAssignees(emps);
  }

  switch (cat) {
    case 'proyecto':
      return MINIMAL_THEMES[2]; // Sky Blue
    case 'cumpleanos':
      return MINIMAL_THEMES[3]; // Amber
    case 'cheque':
      return MINIMAL_THEMES[1]; // Emerald
    case 'gasto_fijo':
      return MINIMAL_THEMES[4]; // Rose
    case 'mantenimiento':
      return MINIMAL_THEMES[3]; // Amber
    case 'instalacion':
      return MINIMAL_THEMES[6]; // Teal
    default:
      return MINIMAL_THEMES[0];
  }
}

export const CalendarioMonthGrid = ({
  currentMonthDate,
  eventos,
  selectedDateStr,
  onSelectDate,
}) => {
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let firstDayWeekIndex = firstDayOfMonth.getDay();
  if (firstDayWeekIndex === 0) firstDayWeekIndex = 7;

  const totalDays = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevDaysCount = firstDayWeekIndex - 1;

  const cells = [];

  // Previous month padding
  for (let i = prevDaysCount - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const dateStr = prevMonthDate.toISOString().split('T')[0];
    cells.push({ dateStr, dayNum: d, isOtherMonth: true });
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const monthPadded = String(month + 1).padStart(2, '0');
    const dayPadded = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthPadded}-${dayPadded}`;

    cells.push({
      dateStr,
      dayNum: d,
      isOtherMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Next month padding to reach 35 or 42 cells
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    const dateStr = nextDate.toISOString().split('T')[0];
    cells.push({ dateStr, dayNum: i, isOtherMonth: true });
  }

  if (cells.length === 35) {
    const lastDayAdded = cells[cells.length - 1].dayNum;
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(year, month + 1, lastDayAdded + i);
      const dateStr = nextDate.toISOString().split('T')[0];
      cells.push({ dateStr, dayNum: lastDayAdded + i, isOtherMonth: true });
    }
  }

  // Group events by date
  const eventsByDate = {};
  for (const ev of eventos) {
    if (!eventsByDate[ev.fecha]) eventsByDate[ev.fecha] = [];
    eventsByDate[ev.fecha].push(ev);
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col">
      {/* Weekday column headers */}
      <div className="grid grid-cols-7 border-b-2 border-slate-300 bg-slate-100">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="cal-grid-header-cell py-2.5 text-center text-xs font-black text-slate-700 uppercase tracking-wider">
            {wd}
          </div>
        ))}
      </div>

      {/* 7-Column Month Days Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-300">
        {cells.map((cell, idx) => {
          const dayEvents = eventsByDate[cell.dateStr] || [];
          const isSelected = selectedDateStr === cell.dateStr;

          return (
            <div
              key={cell.dateStr + '-' + idx}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`cal-month-cell p-1.5 min-h-[105px] flex flex-col justify-between transition-all cursor-pointer ${
                cell.isOtherMonth
                  ? 'bg-slate-100/80'
                  : 'bg-white hover:bg-slate-50'
              } ${cell.isToday ? 'bg-blue-50/40' : ''} ${
                isSelected ? 'ring-2 ring-inset ring-[#0b2d64] bg-blue-50/50 z-10' : ''
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-1 shrink-0">
                <span
                  className={`text-xs font-black font-mono inline-flex items-center justify-center transition-transform ${
                    cell.isToday
                      ? 'w-5.5 h-5.5 rounded-full bg-[#0b2d64] text-white shadow-xs text-[10.5px]'
                      : isSelected
                      ? 'text-[#0b2d64] font-black scale-105'
                      : cell.isOtherMonth
                      ? 'text-slate-400'
                      : 'text-slate-800'
                  }`}
                >
                  {cell.dayNum}
                </span>
              </div>

              {/* Minimalist Slim Event Capsules */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 4).map((ev) => {
                  const isRutina = ev.categoria === 'rutina';
                  const style = getEventStyle(ev);
                  const emps = ev.metadata?.empleados || [];

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(cell.dateStr);
                      }}
                      className={`rounded-md border px-1.5 py-1 text-xs transition-all flex items-center justify-between gap-1 ${style.bg}`}
                    >
                      {/* Left: Color Dot + Title */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                        <span className="text-[11px] font-semibold truncate leading-none text-slate-900">
                          {ev.titulo}
                        </span>
                      </div>

                      {/* Right: Circular Photo Avatars Stack or Initials */}
                      {isRutina && emps.length > 0 ? (
                        <div className="flex -space-x-1.5 shrink-0 overflow-hidden items-center">
                          {emps.slice(0, 2).map((emp, i) => {
                            const initials = getInitials(emp.nombre);
                            const shortName = formatShortName(emp.nombre);

                            return (
                              <div
                                key={emp.id || i}
                                title={shortName}
                                className={`inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-[7.5px] font-bold border ring-1 ring-white shadow-2xs overflow-hidden shrink-0 ${style.avatarBg}`}
                              >
                                {emp.foto ? (
                                  <img
                                    src={emp.foto}
                                    alt={shortName}
                                    className="w-full h-full object-cover rounded-full"
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span>{initials}</span>
                                )}
                              </div>
                            );
                          })}
                          {emps.length > 2 && (
                            <div className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-[7px] font-bold bg-slate-800 text-white ring-1 ring-white shrink-0">
                              +{emps.length - 2}
                            </div>
                          )}
                        </div>
                      ) : ev.categoria === 'cumpleanos' ? (
                        <div
                          title={ev.metadata?.nombre}
                          className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[7.5px] font-bold text-amber-900 bg-white border border-amber-200 shadow-2xs shrink-0 overflow-hidden"
                        >
                          {ev.metadata?.foto ? (
                            <img
                              src={ev.metadata.foto}
                              alt={ev.metadata?.nombre}
                              className="w-full h-full object-cover rounded-full"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{getInitials(ev.metadata?.nombre)}</span>
                          )}
                        </div>
                      ) : ev.hora ? (
                        <span className="text-[8px] font-semibold font-mono text-slate-500 shrink-0">
                          {ev.hora}
                        </span>
                      ) : null}
                    </div>
                  );
                })}

                {dayEvents.length > 4 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(cell.dateStr);
                    }}
                    className="w-full text-center py-0.5 text-[9px] font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                  >
                    +{dayEvents.length - 4} más...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
