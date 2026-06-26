import React from 'react';
import { getPersonInitials } from '../../../../shared/utils/personInitials.js';

const SCHEDULED_START = { hour: 8, minute: 0 };

const formatTime = (isoString) =>
  isoString ? new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

const isLate = (isoString) => {
  if (!isoString) return false;
  const d = new Date(isoString);
  return d.getHours() > SCHEDULED_START.hour || (d.getHours() === SCHEDULED_START.hour && d.getMinutes() > SCHEDULED_START.minute);
};

const calcTotalHours = (row) => {
  if (!row.entrada || !row.salida) return null;
  let totalMs = 0;
  if (row.inicioAlmuerzo && row.finAlmuerzo) {
    totalMs += new Date(row.inicioAlmuerzo.fechaHora) - new Date(row.entrada.fechaHora);
    totalMs += new Date(row.salida.fechaHora) - new Date(row.finAlmuerzo.fechaHora);
  } else {
    totalMs += new Date(row.salida.fechaHora) - new Date(row.entrada.fechaHora);
  }
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const MapaBoton = ({ row }) => {
  const conUbicacion =
    row.entrada?.ubicacion       ? row.entrada       :
    row.inicioAlmuerzo?.ubicacion ? row.inicioAlmuerzo :
    row.finAlmuerzo?.ubicacion    ? row.finAlmuerzo    :
    row.salida?.ubicacion         ? row.salida         :
    null;
  if (!conUbicacion) return null;
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${conUbicacion.ubicacion.lat},${conUbicacion.ubicacion.lng}`}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] font-medium text-blue-500 hover:text-blue-700 inline-flex items-center gap-1"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      Mapa
    </a>
  );
};

export const RegistroRow = ({ row }) => {
  const completados = [row.entrada, row.inicioAlmuerzo, row.finAlmuerzo, row.salida].filter(Boolean).length;
  const tarde = isLate(row.entrada?.fechaHora);
  const total = calcTotalHours(row);

  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-gray-50/60 transition-colors">
      {/* Empleado */}
      <div className="col-span-3 flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center font-semibold text-[10px] text-gray-600 shrink-0 overflow-hidden normal-case leading-none">
          <span className="normal-case">{getPersonInitials(row.nombreEmpleado)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate normal-case">{row.nombreEmpleado}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-medium text-gray-400">{row.empleadoId}</span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-[10px] text-gray-400">{row.fechaTexto}</span>
          </div>
        </div>
      </div>

      {/* Marcaciones — formato compacto */}
      <div className="col-span-5 flex items-center gap-0">
        <div className={`flex flex-col items-center flex-1 ${row.entrada ? '' : 'opacity-30'}`}>
          <span className="text-[10px] font-medium text-gray-400 mb-0.5">Entrada</span>
          <span className={`text-xs font-mono font-semibold ${tarde ? 'text-red-500' : row.entrada ? 'text-gray-800' : 'text-gray-300'}`}>
            {formatTime(row.entrada?.fechaHora)}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
          </svg>
        </div>
        <div className={`flex flex-col items-center flex-1 ${row.inicioAlmuerzo ? '' : 'opacity-30'}`}>
          <span className="text-[10px] font-medium text-gray-400 mb-0.5">Inicio Alm.</span>
          <span className={`text-xs font-mono font-semibold ${row.inicioAlmuerzo ? 'text-gray-800' : 'text-gray-300'}`}>
            {formatTime(row.inicioAlmuerzo?.fechaHora)}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
          </svg>
        </div>
        <div className={`flex flex-col items-center flex-1 ${row.finAlmuerzo ? '' : 'opacity-30'}`}>
          <span className="text-[10px] font-medium text-gray-400 mb-0.5">Fin Alm.</span>
          <span className={`text-xs font-mono font-semibold ${row.finAlmuerzo ? 'text-gray-800' : 'text-gray-300'}`}>
            {formatTime(row.finAlmuerzo?.fechaHora)}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
          </svg>
        </div>
        <div className={`flex flex-col items-center flex-1 ${row.salida ? '' : 'opacity-30'}`}>
          <span className="text-[10px] font-medium text-gray-400 mb-0.5">Salida</span>
          <span className={`text-xs font-mono font-semibold ${row.salida ? 'text-gray-800' : 'text-gray-300'}`}>
            {formatTime(row.salida?.fechaHora)}
          </span>
        </div>
      </div>

      {/* Estado + Total horas + Mapa */}
      <div className="col-span-4 flex items-center justify-end gap-3">
        {tarde && row.entrada ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 whitespace-nowrap">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Atrasado {formatTime(row.entrada.fechaHora)}
          </span>
        ) : completados === 4 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Completo
          </span>
        ) : completados > 0 ? (
          <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            {completados}/4
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
            Pendiente
          </span>
        )}

        {total && (
          <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200 whitespace-nowrap">
            {total}
          </span>
        )}

        <MapaBoton row={row} />
      </div>
    </div>
  );
};
