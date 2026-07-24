import React, { useState, useRef, useEffect } from 'react';

export const DateRangePicker = ({ value, onChange, placeholder = 'Seleccionar fechas', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(value?.start || '');
  const [endDate, setEndDate] = useState(value?.end || '');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef(null);

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
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:bg-slate-50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span className={startDate && endDate ? 'text-slate-800 font-medium' : 'text-slate-400'}>{displayText}</span>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-[9999] p-3 w-[285px]"
        >
          {/* Header con navegación */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="text-sm font-bold text-slate-800">
              {monthNames[month]} {year}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Nombres de días */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-1">
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
                    h-8 w-full rounded-lg text-sm font-medium transition-colors
                    ${inRange && !isStart && !isEnd ? 'bg-blue-50 text-blue-700' : ''}
                    ${isStart || isEnd ? 'bg-blue-600 text-white font-bold' : ''}
                    ${!inRange ? 'text-slate-700 hover:bg-slate-100' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLimpiar}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={handleAplicar}
              disabled={!startDate || !endDate}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
