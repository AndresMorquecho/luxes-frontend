import React, { useState, useRef, useEffect } from 'react';

export const DateRangePicker = ({ value, onChange, placeholder = 'Seleccionar fechas', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(value?.start || '');
  const [endDate, setEndDate] = useState(value?.end || '');
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value?.end) return new Date(value.end + 'T12:00:00');
    if (value?.start) return new Date(value.start + 'T12:00:00');
    return new Date();
  });
  const containerRef = useRef(null);

  // Sincronizar estado interno cuando el picker se abre o cuando el value externo cambia
  useEffect(() => {
    if (isOpen) {
      setStartDate(value?.start || '');
      setEndDate(value?.end || '');
      if (value?.end) {
        setCurrentMonth(new Date(value.end + 'T12:00:00'));
      } else if (value?.start) {
        setCurrentMonth(new Date(value.start + 'T12:00:00'));
      }
    }
  }, [isOpen]);

  // Sincronizar cuando el value cambia desde afuera (ej: Limpiar externo)
  useEffect(() => {
    if (!isOpen) {
      setStartDate(value?.start || '');
      setEndDate(value?.end || '');
    }
  }, [value?.start, value?.end]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Formatear fecha para mostrar
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year.slice(2)}`;
  };

  const displayText = startDate && endDate 
    ? `${formatDate(startDate)} - ${formatDate(endDate)}`
    : startDate 
    ? formatDate(startDate)
    : placeholder;

  // Obtener días del mes
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const handleDayClick = (day) => {
    const selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (!startDate || (startDate && endDate)) {
      // Primera selección o reset
      setStartDate(selectedDate);
      setEndDate('');
    } else {
      // Segunda selección
      if (new Date(selectedDate) < new Date(startDate)) {
        setEndDate(startDate);
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const handleAplicar = () => {
    if (startDate && endDate) {
      onChange({ start: startDate, end: endDate });
      setIsOpen(false);
    }
  };

  const handleLimpiar = () => {
    setStartDate('');
    setEndDate('');
    onChange({ start: '', end: '' });
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const isDateInRange = (day) => {
    if (!startDate) return false;
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (startDate && !endDate) return date === startDate;
    if (startDate && endDate) {
      return date >= startDate && date <= endDate;
    }
    return false;
  };

  const isStartDate = (day) => {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return date === startDate;
  };

  const isEndDate = (day) => {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return date === endDate;
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between shadow-2xs cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span className={startDate && endDate ? 'text-slate-800 font-mono font-bold text-xs' : 'text-slate-400 text-xs'}>{displayText}</span>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div 
          className="absolute top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-[9999] p-3.5"
          style={{ left: '50%', transform: 'translateX(-50%)', width: '290px' }}
        >
          {/* Header con navegación */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {monthNames[month]} {year}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Nombres de días */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {dayNames.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {/* Días del mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const inRange = isDateInRange(day);
              const isStart = isStartDate(day);
              const isEnd = isEndDate(day);
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`
                    h-7 w-full rounded-lg text-xs font-semibold transition-colors cursor-pointer
                    ${inRange && !isStart && !isEnd ? 'bg-blue-50 text-[#0b2d64] font-bold' : ''}
                    ${isStart || isEnd ? 'bg-[#0b2d64] text-white font-bold shadow-xs' : ''}
                    ${!inRange ? 'text-slate-700 hover:bg-slate-100' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLimpiar}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleAplicar}
              disabled={!startDate || !endDate}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0b2d64] hover:bg-[#071f45] active:scale-[0.99] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer border-none"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
