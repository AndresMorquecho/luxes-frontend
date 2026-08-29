import React from 'react';
import { Cake, Sparkles, CheckCircle2, Clock, Car, CreditCard, Wrench, Package, ListTodo, ArrowRight } from 'lucide-react';

const fmtDate = (d) => {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length === 3) {
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return dt.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return d;
};

function getCategoryBadge(cat) {
  switch (cat) {
    case 'cumpleanos': return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Cumpleaños' };
    case 'rutina': return { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', label: 'Rutina / Turno' };
    case 'proyecto': return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'Entrega Proyecto' };
    case 'instalacion': return { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', label: 'Instalación' };
    case 'cheque': return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', label: 'Cheque Posfechado' };
    case 'gasto_fijo': return { bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-200', label: 'Gasto Fijo' };
    case 'mantenimiento': return { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', label: 'Mantenimiento' };
    default: return { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', label: 'Tarea' };
  }
}

export const CalendarioAgendaView = ({ eventos, onSelectEvent }) => {
  if (eventos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
        <p className="text-slate-400 font-medium text-sm">No hay eventos programados en este período con los filtros activos.</p>
      </div>
    );
  }

  // Group events by date
  const grouped = {};
  for (const ev of eventos) {
    if (!grouped[ev.fecha]) grouped[ev.fecha] = [];
    grouped[ev.fecha].push(ev);
  }

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-4">
      {sortedDates.map((dateStr) => {
        const dayEvents = grouped[dateStr];
        return (
          <div key={dateStr} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                {dateStr}
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-slate-700 capitalize">
                {fmtDate(dateStr)}
              </h4>
              <span className="text-xs text-slate-400 ml-auto font-medium">
                {dayEvents.length} evento{dayEvents.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {dayEvents.map((ev) => {
                const badge = getCategoryBadge(ev.categoria);
                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${badge.bg} ${badge.text} ${badge.border} shrink-0`}>
                        {badge.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {ev.titulo}
                        </p>
                        {ev.subtitulo && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {ev.subtitulo}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {ev.badge && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          {ev.badge}
                        </span>
                      )}
                      <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
