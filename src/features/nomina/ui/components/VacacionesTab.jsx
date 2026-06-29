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

function buildResumenRows(year, empleados, vacaciones) {
  return empleados.map(emp => {
    const vacEmp = vacaciones.find(v => v.empleadoId === emp.id && v.año === year);
    const tomadosAno = vacEmp?.diasTomados.length || 0;
    const pendientes = Math.max(0, DIAS_VACACIONES_POR_ANO - tomadosAno);
    return { emp, tomadosAno, pendientes };
  });
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

// ─── Sub-componente: tabla de un mes (desktop) ───────────────────────────────
const TablaVacMesDesktop = ({ year, month, empleados, vacaciones, onToggleDia }) => {
  const dias = useMemo(() => getDiasDelMes(year, month), [year, month]);

  return (
    <div className="mb-8 hidden md:block">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1.5 h-6 bg-blue-900 rounded-full" />
        <h3 className="text-sm font-extrabold text-blue-900 tracking-widest uppercase">
          {year} — {MESES_NOMBRES[month]}
        </h3>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[10px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-blue-900 text-white font-bold px-4 py-2.5 min-w-[160px] text-left uppercase tracking-wider border-r border-blue-700">
                  Nombre
                </th>
                {dias.map(({ dia }) => (
                  <th key={dia}
                    className="bg-blue-900 text-white font-bold text-center px-1.5 py-2.5 min-w-[26px] border-l border-blue-700">
                    {dia}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-10 bg-blue-800 text-blue-100 font-semibold px-4 py-1.5 text-left text-[9px] border-r border-blue-700" />
                {dias.map(({ dia, label }) => {
                  const esFinde = label === 'SA' || label === 'DO';
                  return (
                    <th key={dia}
                      className={`text-center px-1 py-1.5 text-[9px] font-semibold border-l border-blue-700 ${
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
                const vacEmp = vacaciones.find(v => v.empleadoId === emp.id);
                const diasTomados = vacEmp?.diasTomados || [];
                return (
                  <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-semibold text-gray-800 uppercase text-[10px] border-r border-gray-200 min-w-[160px]">
                      {emp.nombre}
                    </td>
                    {dias.map(({ dia, label }) => {
                      const esFinde = label === 'SA' || label === 'DO';
                      const tieneVac = esVacacion(diasTomados, year, month, dia);
                      return (
                        <td key={dia}
                          onClick={() => !esFinde && onToggleDia?.(emp.id, year, month, dia)}
                          className={`text-center py-1.5 border-l border-gray-100 ${
                            esFinde ? 'bg-gray-100/60' :
                            tieneVac ? 'bg-blue-100 cursor-pointer hover:bg-blue-200' : 'cursor-pointer hover:bg-gray-50'
                          }`}>
                          {tieneVac && (
                            <span className="font-black text-blue-800 text-[11px]">X</span>
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
        const vacEmp = vacaciones.find(v => v.empleadoId === emp.id);
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
const ResumenAñoDesktop = ({ year, empleados, vacaciones, titulo, color }) => {
  const rows = buildResumenRows(year, empleados, vacaciones);

  return (
    <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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
              <td className="px-3 py-2 font-semibold text-gray-800 uppercase text-[9px]">{emp.nombre}</td>
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

const ResumenAñoMobile = ({ year, empleados, vacaciones, titulo, color }) => {
  const rows = buildResumenRows(year, empleados, vacaciones);

  return (
    <div className="md:hidden rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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
  const [año, setAño] = useState(hoy.getFullYear());
  const [empleados, setEmpleados] = useState([]);
  const [vacaciones, setVacaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const { adapter } = useContext(NominaContext);
  const isMobile = useIsMobile();

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

  const [mesInicio, setMesInicio] = useState(hoy.getMonth());
  const mesesVisibles = isMobile ? 1 : 3;
  const pasoMeses = isMobile ? 1 : 3;

  const mesesActuales = useMemo(() => {
    const arr = [];
    for (let i = 0; i < mesesVisibles; i++) {
      const m = (mesInicio + i) % 12;
      arr.push(m);
    }
    return arr;
  }, [mesInicio, mesesVisibles]);

  const vacacionesAño = useMemo(
    () => vacaciones.filter(v => v.año === año),
    [vacaciones, año]
  );

  const handleToggleDia = async (empleadoId, year, month, dia) => {
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    const vacEmp = vacaciones.find(v => v.empleadoId === empleadoId && v.año === year);
    const diasTomadosActuales = vacEmp ? vacEmp.diasTomados : [];
    
    const esVacacionYa = diasTomadosActuales.includes(fechaStr);
    const nuevosDiasTomados = esVacacionYa
      ? diasTomadosActuales.filter(f => f !== fechaStr)
      : [...diasTomadosActuales, fechaStr];

    setVacaciones(prev => {
      let next = [...prev];
      const idx = next.findIndex(v => v.empleadoId === empleadoId && v.año === year);
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
        const idx = next.findIndex(v => v.empleadoId === empleadoId && v.año === year);
        if (idx !== -1) {
          if (diasTomadosActuales.length === 0) {
            next = next.filter(v => !(v.empleadoId === empleadoId && v.año === year));
          } else {
            next[idx] = { ...next[idx], diasTomados: diasTomadosActuales };
          }
        }
        return next;
      });
    }
  };

  const avanzarMeses = () => setMesInicio(m => (m + pasoMeses) % 12);
  const retrocederMeses = () => setMesInicio(m => (m - pasoMeses + 12) % 12);

  const rangoMesesLabel = isMobile
    ? `${MESES_NOMBRES[mesesActuales[0]]} ${año}`
    : `${MESES_NOMBRES[mesesActuales[0]]} – ${MESES_NOMBRES[mesesActuales[mesesActuales.length - 1]]} ${año}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        Cargando vacaciones...
      </div>
    );
  }

  return (
    <div className="animate-slide-up pb-6 md:pb-0">
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-bold text-slate-800">
            Vacaciones {año}
          </h1>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 sm:mt-1 leading-snug">
            <span className="sm:hidden">{DIAS_VACACIONES_POR_ANO} días por año · toca un día laboral para marcar vacación</span>
            <span className="hidden sm:inline">Registro de días de vacaciones tomados por cada colaborador. Cada año corresponden {DIAS_VACACIONES_POR_ANO} días.</span>
          </p>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAño(a => a - 1)}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-gray-50 text-slate-600 font-bold shadow-sm transition-all"
            aria-label="Año anterior"
          >
            ‹
          </button>
          <span className="text-sm font-bold text-slate-700 min-w-[52px] text-center">{año}</span>
          <button
            type="button"
            onClick={() => setAño(a => a + 1)}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-gray-50 text-slate-600 font-bold shadow-sm transition-all"
            aria-label="Año siguiente"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 items-start">
        <div className="flex-1 min-w-0 w-full order-2 xl:order-1">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <button
              type="button"
              onClick={retrocederMeses}
              className="flex items-center gap-1 px-3 py-2 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-all shrink-0"
            >
              <span className="hidden sm:inline">‹ Meses anteriores</span>
              <span className="sm:hidden">‹ Anterior</span>
            </button>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider text-center px-1">
              {rangoMesesLabel}
            </span>
            <button
              type="button"
              onClick={avanzarMeses}
              className="flex items-center gap-1 px-3 py-2 sm:py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-all shrink-0"
            >
              <span className="hidden sm:inline">Meses siguientes ›</span>
              <span className="sm:hidden">Siguiente ›</span>
            </button>
          </div>

          {mesesActuales.map(m => (
            <React.Fragment key={m}>
              <TablaVacMesDesktop
                year={año}
                month={m}
                empleados={empleados}
                vacaciones={vacacionesAño}
                onToggleDia={handleToggleDia}
              />
              <VacacionesMesMobile
                year={año}
                month={m}
                empleados={empleados}
                vacaciones={vacacionesAño}
                onToggleDia={handleToggleDia}
              />
            </React.Fragment>
          ))}
        </div>

        <div className="w-full xl:w-[320px] flex-shrink-0 space-y-3 sm:space-y-4 xl:sticky xl:top-4 order-1 xl:order-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
            Resumen por año
          </div>

          <ResumenAño
            year={año - 1}
            empleados={empleados}
            vacaciones={vacaciones}
            titulo={`Vacaciones ${año - 1}`}
            color="bg-orange-400"
          />

          <ResumenAño
            year={año}
            empleados={empleados}
            vacaciones={vacaciones}
            titulo={`Vacaciones ${año}`}
            color="bg-green-600"
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
