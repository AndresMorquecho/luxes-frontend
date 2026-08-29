import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { getEventosCalendario } from '../../application/calendarioService';
import { CalendarioMonthGrid } from '../components/CalendarioMonthGrid.jsx';
import { CalendarioDayDetailPanel } from '../components/CalendarioDayDetailPanel.jsx';
import { RutinasManagerModal } from '../components/RutinasManagerModal.jsx';
import { toast } from '../../../../shared/ui/components/Toast';
import './CalendarioPage.css';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CATEGORIAS = [
  { id: 'todos', label: 'Todas las categorías' },
  { id: 'rutina', label: 'Rutinas & Turnos' },
  { id: 'proyecto', label: 'Proyectos & Entregas' },
  { id: 'instalacion', label: 'Instalaciones' },
  { id: 'cumpleanos', label: 'Cumpleaños' },
  { id: 'cheque', label: 'Cheques Posfechados' },
  { id: 'gasto_fijo', label: 'Gastos Fijos' },
  { id: 'mantenimiento', label: 'Mantenimientos' },
];

export const CalendarioPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventos, setEventos] = useState([]);
  const [resumen, setResumen] = useState({});
  const [loading, setLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [isRutinasModalOpen, setIsRutinasModalOpen] = useState(false);

  const todayStr = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }),
    []
  );
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const mesParam = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, [currentDate]);

  const loadEventos = async () => {
    setLoading(true);
    try {
      const data = await getEventosCalendario(mesParam);
      setEventos(data.eventos || []);
      setResumen(data.resumen || {});
    } catch (e) {
      toast.error('Error al cargar eventos del calendario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventos();
  }, [mesParam]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(todayStr);
  };

  // Filtered Events
  const filteredEventos = useMemo(() => {
    if (categoriaFiltro === 'todos') return eventos;
    return eventos.filter((e) => e.categoria === categoriaFiltro);
  }, [eventos, categoriaFiltro]);

  const dayEvents = useMemo(() => {
    return filteredEventos.filter((e) => e.fecha === selectedDateStr);
  }, [filteredEventos, selectedDateStr]);

  return (
    <div className="cal-page-container space-y-4">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Calendario Operativo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Eventos empresariales, entregas de proyectos, cumpleaños y turnos
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="h-9 pl-3 pr-7 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer appearance-none transition-colors"
            >
              {CATEGORIAS.map((cat) => {
                const count = cat.id === 'todos' ? resumen.total || 0 : resumen[cat.id] || 0;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({count})
                  </option>
                );
              })}
            </select>
            <Filter size={12} className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Mes Anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="font-bold text-xs sm:text-sm text-slate-800 px-3 min-w-[130px] text-center">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Mes Siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Today Button */}
          <button
            type="button"
            onClick={handleToday}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            Hoy
          </button>

          {/* New Routine Button */}
          <button
            type="button"
            onClick={() => setIsRutinasModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-[#0b2d64] hover:bg-[#1e3a8a] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Rutinas & Turnos</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Section (Month Grid on Left, Day Detail on Right with Natural Vertical Scroll) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Full Month 7-Column Grid */}
        <div className="xl:col-span-8">
          <CalendarioMonthGrid
            currentMonthDate={currentDate}
            eventos={filteredEventos}
            selectedDateStr={selectedDateStr}
            onSelectDate={(date) => setSelectedDateStr(date)}
          />
        </div>

        {/* Day Detail Panel */}
        <div className="xl:col-span-4 sticky top-4">
          <CalendarioDayDetailPanel
            selectedDateStr={selectedDateStr}
            dayEvents={dayEvents}
            onEventUpdated={loadEventos}
            onOpenRutinasModal={() => setIsRutinasModalOpen(true)}
          />
        </div>
      </div>

      {/* Rutinas & Turnos Manager Modal */}
      <RutinasManagerModal
        isOpen={isRutinasModalOpen}
        onClose={() => setIsRutinasModalOpen(false)}
        onUpdated={loadEventos}
      />
    </div>
  );
};
