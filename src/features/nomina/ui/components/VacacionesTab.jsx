import React, { useState, useMemo, useEffect, useContext } from 'react';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { DIAS_VACACIONES_POR_ANO } from '../../infrastructure/mock/vacacionesData';
import { NominaContext } from '../../application/context/NominaContext';
import { toast } from '../../../../shared/ui/components/Toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MESES_NOMBRES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'
];
const MESES_TITULO = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const DIAS_ABREV = ['DO','LU','MA','MI','JU','VI','SA'];

/** Retorna los días del mes (1-based). Cada elemento: { dia: number, label: string } */
function getDiasDelMes(year, month) {
  const totalDias = new Date(year, month + 1, 0).getDate();
  const dias = [];
  for (let d = 1; d <= totalDias; d++) {
    const fecha = new Date(year, month, d);
    dias.push({ dia: d, label: DIAS_ABREV[fecha.getDay()] });
  }
  return dias;
}

/** Determina si una fecha ISO (YYYY-MM-DD) corresponde al año/mes/dia dados */
function esVacacion(diasTomados, year, month, dia) {
  const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  return diasTomados.includes(fechaStr);
}

function contarDiasTomadosEnAno(empleadoId, year, vacaciones) {
  const prefijo = `${year}-`;
  const registro = vacaciones.find(
    (v) => String(v.empleadoId) === String(empleadoId) && Number(v.año) === year
  );
  if (registro?.diasTomados?.length) {
    return registro.diasTomados.filter((fecha) => fecha.startsWith(prefijo)).length;
  }
  return vacaciones
    .filter((v) => String(v.empleadoId) === String(empleadoId))
    .flatMap((v) => v.diasTomados || [])
    .filter((fecha) => fecha.startsWith(prefijo)).length;
}

function buildResumenRows(year, empleados, vacaciones) {
  return empleados.map((emp) => {
    const tomadosAno = contarDiasTomadosEnAno(emp.id, year, vacaciones);
    const pendientes = Math.max(0, DIAS_VACACIONES_POR_ANO - tomadosAno);
    return { emp, tomadosAno, pendientes };
  });
}

const COLORES_RESUMEN_AÑO = ['bg-green-600', 'bg-orange-400'];
const AÑO_MAXIMO_VACACIONES = 2026;
const AÑOS_HISTORICO = 10;

// ─── Sub-componente: tabla de un mes (desktop) ───────────────────────────────
const TablaVacMesDesktop = ({ year, month, empleados, vacaciones, onToggleDia }) => {
  const dias = useMemo(() => getDiasDelMes(year, month), [year, month]);

  return (
    <div className="mb-8 hidden md:block">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1.5 h-7 bg-blue-900 rounded-full" />
        <h3 className="text-base font-extrabold text-blue-900 tracking-widest uppercase">
          {year} — {MESES_NOMBRES[month]}
        </h3>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse table-fixed">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-blue-900 text-white font-bold px-4 py-4 w-[240px] text-left uppercase tracking-wider border-r border-blue-700 text-sm">
                  Nombre
                </th>
                {dias.map(({ dia }) => (
                  <th key={dia}
                    className="bg-blue-900 text-white font-bold text-center px-1 py-4 border-l border-blue-700 text-sm">
                    {dia}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-20 bg-blue-800 text-blue-100 font-semibold px-4 py-2.5 w-[240px] text-left text-xs border-r border-blue-700" />
                {dias.map(({ dia, label }) => {
                  const esFinde = label === 'SA' || label === 'DO';
                  return (
                    <th key={dia}
                      className={`text-center px-1 py-2.5 text-[11px] font-semibold border-l border-blue-700 ${
                        esFinde ? 'bg-blue-700 text-blue-200' : 'bg-blue-800 text-blue-100'
                      }`}>
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map((emp, idx) => {
                const vacEmp = vacaciones.find(
                  (v) => String(v.empleadoId) === String(emp.id)
                );
                const diasTomados = vacEmp?.diasTomados || [];
                const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                return (
                  <tr key={emp.id} className={rowBg}>
                    <td className={`sticky left-0 z-10 ${rowBg} px-4 py-4 w-[240px] border-r border-gray-200`}>
                      <span
                        className="block font-semibold text-gray-800 text-xs leading-snug truncate normal-case"
                        title={emp.nombre}
                      >
                        {emp.nombre}
                      </span>
                    </td>
                    {dias.map(({ dia, label }) => {
                      const esFinde = label === 'SA' || label === 'DO';
                      const tieneVac = esVacacion(diasTomados, year, month, dia);
                      return (
                        <td key={dia}
                          onClick={() => !esFinde && onToggleDia?.(emp.id, year, month, dia)}
                          className={`text-center py-4 border-l border-gray-100 ${
                            esFinde ? 'bg-gray-100/60' :
                            tieneVac ? 'bg-blue-100 cursor-pointer hover:bg-blue-200' : 'cursor-pointer hover:bg-gray-50'
                          }`}>
                          {tieneVac && (
                            <span className="font-black text-blue-800 text-sm">X</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-componente: calendario móvil por colaborador ────────────────────────
const CalendarioEmpleadoMobile = ({ emp, year, month, diasTomados, onToggleDia }) => {
  const dias = useMemo(() => getDiasDelMes(year, month), [year, month]);
  const offsetInicio = new Date(year, month, 1).getDay();
  const tomadosMes = dias.filter(({ dia, label }) => {
    const esFinde = label === 'SA' || label === 'DO';
    return !esFinde && esVacacion(diasTomados, year, month, dia);
  }).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-snug normal-case truncate">{emp.nombre}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{emp.id}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg">
          {tomadosMes} día{tomadosMes !== 1 ? 's' : ''} en mes
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_ABREV.map((label) => (
          <div
            key={label}
            className={`text-center text-[9px] font-bold py-0.5 ${
              label === 'SA' || label === 'DO' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offsetInicio }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}
        {dias.map(({ dia, label }) => {
          const esFinde = label === 'SA' || label === 'DO';
          const tieneVac = esVacacion(diasTomados, year, month, dia);
          return (
            <button
              key={dia}
              type="button"
              disabled={esFinde}
              onClick={() => !esFinde && onToggleDia?.(emp.id, year, month, dia)}
              className={`aspect-square rounded-lg text-[11px] font-semibold flex items-center justify-center transition-colors border ${
                esFinde
                  ? 'bg-slate-100/80 text-slate-300 border-transparent cursor-default'
                  : tieneVac
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:bg-blue-50'
              }`}
              aria-label={`${emp.nombre}, día ${dia}${tieneVac ? ', vacación' : ''}`}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const VacacionesMesMobile = ({ year, month, empleados, vacaciones, onToggleDia }) => (
  <div className="md:hidden mb-6">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 bg-blue-900 rounded-full" />
      <h3 className="text-xs font-extrabold text-blue-900 tracking-wider uppercase">
        {year} — {MESES_NOMBRES[month]}
      </h3>
    </div>
    <div className="space-y-3">
      {empleados.map((emp) => {
        const vacEmp = vacaciones.find(
          (v) => String(v.empleadoId) === String(emp.id)
        );
        const diasTomados = vacEmp?.diasTomados || [];
        return (
          <CalendarioEmpleadoMobile
            key={emp.id}
            emp={emp}
            year={year}
            month={month}
            diasTomados={diasTomados}
            onToggleDia={onToggleDia}
          />
        );
      })}
    </div>
  </div>
);

// ─── Sub-componente: panel resumen por año ───────────────────────────────────
const ResumenAñoDesktop = ({ year, empleados, vacaciones, titulo, color, embedded = false, highlight = false }) => {
  const rows = buildResumenRows(year, empleados, vacaciones);

  return (
    <div className={`hidden md:block border overflow-hidden shadow-sm transition-all ${embedded ? 'rounded-b-xl border-t-0' : 'rounded-xl'} ${highlight ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      <div className={`${color} text-white text-center py-2 text-[10px] font-extrabold uppercase tracking-widest px-3`}>
        {titulo}
      </div>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase text-[9px]">Nombre</th>
            <th className="px-2 py-2 text-center font-bold text-gray-600 uppercase text-[9px] leading-tight">Días<br/>Tomados<br/>en el año</th>
            <th className="px-2 py-2 text-center font-bold text-gray-600 uppercase text-[9px] leading-tight">Días<br/>Pendientes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ emp, tomadosAno, pendientes }, idx) => (
            <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              <td className="px-3 py-2 font-semibold text-gray-800 text-[9px]">
                <span className="block truncate normal-case leading-snug" title={emp.nombre}>{emp.nombre}</span>
              </td>
              <td className="px-2 py-2 text-center font-bold text-blue-700">{tomadosAno}</td>
              <td className={`px-2 py-2 text-center font-bold ${pendientes > 0 ? 'text-red-600' : 'text-green-700'}`}>
                {pendientes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ResumenAñoMobile = ({ year, empleados, vacaciones, titulo, color, embedded = false, highlight = false }) => {
  const rows = buildResumenRows(year, empleados, vacaciones);

  return (
    <div className={`md:hidden border overflow-hidden shadow-sm transition-all ${embedded ? 'rounded-b-xl border-t-0' : 'rounded-xl'} ${highlight ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      <div className={`${color} text-white text-center py-2 text-[10px] font-extrabold uppercase tracking-wider px-3`}>
        {titulo}
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(({ emp, tomadosAno, pendientes }) => (
          <div key={emp.id} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white">
            <p className="text-xs font-semibold text-slate-800 normal-case leading-snug min-w-0 flex-1 truncate">
              {emp.nombre}
            </p>
            <div className="flex items-center gap-3 shrink-0 text-center">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Tomados</p>
                <p className="text-sm font-bold text-blue-700">{tomadosAno}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Pend.</p>
                <p className={`text-sm font-bold ${pendientes > 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {pendientes}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResumenAño = (props) => (
  <>
    <ResumenAñoDesktop {...props} />
    <ResumenAñoMobile {...props} />
  </>
);

// ─── Componente Principal ─────────────────────────────────────────────────────
export const VacacionesTab = () => {
  const hoy = new Date();
  const [añoFiltro, setAñoFiltro] = useState(hoy.getFullYear());
  const [mesFiltro, setMesFiltro] = useState(hoy.getMonth());
  const [empleados, setEmpleados] = useState([]);
  const [vacaciones, setVacaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const { adapter } = useContext(NominaContext);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getEmpleados();
        setEmpleados(data);
        if (adapter) {
          const vacs = await adapter.getVacations();
          setVacaciones(vacs);
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
        toast.error("Error al cargar vacaciones del servidor.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adapter]);

  const vacacionesAño = useMemo(
    () => vacaciones.filter((v) => Number(v.año) === añoFiltro),
    [vacaciones, añoFiltro]
  );

  const esAñoActual = añoFiltro === hoy.getFullYear();

  const esMesActual = añoFiltro === hoy.getFullYear() && mesFiltro === hoy.getMonth();

  const añoActual = hoy.getFullYear();
  const añoMaxFiltro = Math.min(añoActual + 1, AÑO_MAXIMO_VACACIONES);
  const añoMinFiltro = añoMaxFiltro - AÑOS_HISTORICO;
  const añosDisponibles = Array.from(
    { length: AÑOS_HISTORICO + 1 },
    (_, i) => añoMinFiltro + i
  );

  useEffect(() => {
    if (añoFiltro > añoMaxFiltro) setAñoFiltro(añoMaxFiltro);
    else if (añoFiltro < añoMinFiltro) setAñoFiltro(añoMinFiltro);
  }, [añoFiltro, añoMaxFiltro, añoMinFiltro]);

  const irHoy = () => {
    setAñoFiltro(hoy.getFullYear());
    setMesFiltro(hoy.getMonth());
  };

  const handleAñoChange = (e) => {
    setAñoFiltro(Number(e.target.value));
  };

  const handleMesChange = (e) => {
    setMesFiltro(Number(e.target.value));
  };

  const handleToggleDia = async (empleadoId, year, month, dia) => {
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    const vacEmp = vacaciones.find(
      (v) => String(v.empleadoId) === String(empleadoId) && Number(v.año) === year
    );
    const diasTomadosActuales = vacEmp ? vacEmp.diasTomados : [];
    
    const esVacacionYa = diasTomadosActuales.includes(fechaStr);
    const nuevosDiasTomados = esVacacionYa
      ? diasTomadosActuales.filter(f => f !== fechaStr)
      : [...diasTomadosActuales, fechaStr];

    setVacaciones(prev => {
      let next = [...prev];
      const idx = next.findIndex(
        (v) => String(v.empleadoId) === String(empleadoId) && Number(v.año) === year
      );
      if (idx === -1) {
        next.push({ empleadoId, año: year, diasTomados: nuevosDiasTomados });
      } else {
        next[idx] = { ...next[idx], diasTomados: nuevosDiasTomados };
      }
      return next;
    });

    try {
      if (adapter) {
        await adapter.saveVacation(empleadoId, year, nuevosDiasTomados);
        if (esVacacionYa) {
          toast.success("Fecha de vacación eliminada.");
        } else {
          toast.success("Fecha de vacación registrada.");
        }
      }
    } catch (error) {
      console.error("Error al guardar vacación en el servidor:", error);
      toast.error(`Error al guardar: ${error.message}`);
      
      setVacaciones(prev => {
        let next = [...prev];
        const idx = next.findIndex(
        (v) => String(v.empleadoId) === String(empleadoId) && Number(v.año) === year
      );
        if (idx !== -1) {
          if (diasTomadosActuales.length === 0) {
            next = next.filter(
              (v) => !(String(v.empleadoId) === String(empleadoId) && Number(v.año) === year)
            );
          } else {
            next[idx] = { ...next[idx], diasTomados: diasTomadosActuales };
          }
        }
        return next;
      });
    }
  };

  const renderMesActual = () => (
    <>
      <TablaVacMesDesktop
        year={añoFiltro}
        month={mesFiltro}
        empleados={empleados}
        vacaciones={vacacionesAño}
        onToggleDia={handleToggleDia}
      />
      <VacacionesMesMobile
        year={añoFiltro}
        month={mesFiltro}
        empleados={empleados}
        vacaciones={vacacionesAño}
        onToggleDia={handleToggleDia}
      />
    </>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        Cargando vacaciones...
      </div>
    );
  }

  return (
    <div className="animate-slide-up pb-6 md:pb-0">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 sm:mb-6">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">Vacaciones</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                {MESES_NOMBRES[mesFiltro]} {añoFiltro}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Registro de días tomados · {DIAS_VACACIONES_POR_ANO} días por colaborador al año
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500 shrink-0">Filtrar período</p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 sm:justify-end" translate="no">
              <label className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">
                  Año
                </span>
                <select
                  id="vacaciones-filtro-anio"
                  value={añoFiltro}
                  onChange={handleAñoChange}
                  className="h-9 w-[92px] px-2.5 pr-7 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer shadow-sm"
                  aria-label="Filtrar por año"
                >
                  {añosDisponibles.map((año) => (
                    <option key={año} value={año}>{año}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">
                  Mes
                </span>
                <select
                  id="vacaciones-filtro-mes"
                  value={mesFiltro}
                  onChange={handleMesChange}
                  className="h-9 w-[132px] max-w-full px-2.5 pr-7 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 bg-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 cursor-pointer shadow-sm"
                  aria-label="Filtrar por mes"
                >
                  {MESES_TITULO.map((nombre, idx) => (
                    <option key={nombre} value={idx}>{nombre}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={irHoy}
                disabled={esMesActual}
                className="h-9 px-4 whitespace-nowrap bg-blue-600 border border-blue-700 rounded-lg text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:border-slate-200 disabled:text-slate-500"
              >
                Hoy
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 items-start">
        <div className="flex-1 min-w-0 w-full">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
            {renderMesActual()}
          </div>
        </div>

        <div className="w-full xl:w-[300px] flex-shrink-0 space-y-3 sm:space-y-4 xl:sticky xl:top-4">
          <ResumenAño
            key={`resumen-${añoFiltro}`}
            year={añoFiltro}
            empleados={empleados}
            vacaciones={vacaciones}
            titulo={`Vacaciones ${añoFiltro}`}
            color={esAñoActual ? COLORES_RESUMEN_AÑO[0] : COLORES_RESUMEN_AÑO[1]}
            highlight
          />

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 sm:mb-3">Leyenda</p>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <span className="inline-flex items-center justify-center w-6 h-6 sm:w-5 sm:h-5 bg-blue-600 text-white font-bold rounded text-[10px]">12</span>
              <span>Día de vacación tomado (móvil) / <strong className="font-black text-blue-800">X</strong> en escritorio</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <span className="inline-block w-6 h-6 sm:w-5 sm:h-5 bg-slate-100/80 border border-slate-200 rounded" />
              <span>Fin de semana (no editable)</span>
            </div>
            <div className="mt-2 sm:mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-[10px] text-blue-700 font-bold">
                Vacaciones por año: <span className="text-base sm:text-lg font-black">{DIAS_VACACIONES_POR_ANO}</span> días
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
