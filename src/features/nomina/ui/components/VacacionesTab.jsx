import React, { useState, useMemo, useEffect } from 'react';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { getVacaciones, saveVacacion } from '../../application/vacacionesService';
import { DIAS_VACACIONES_POR_ANO } from '../../infrastructure/mock/vacacionesData';

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

function toggleFecha(dias, fechaStr) {
  return dias.includes(fechaStr) ? dias.filter(f => f !== fechaStr) : [...dias, fechaStr];
}

// ─── Sub-componente: tabla de un mes ─────────────────────────────────────────
const TablaVacMes = ({ year, month, empleados, vacaciones, onToggleDia }) => {
  const dias = useMemo(() => getDiasDelMes(year, month), [year, month]);

  return (
    <div className="mb-8">
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

// ─── Sub-componente: panel resumen por año ───────────────────────────────────
const ResumenAño = ({ year, empleados, vacaciones, titulo, color }) => {
  const rows = empleados.map(emp => {
    const vacEmp = vacaciones.find(v => v.empleadoId === emp.id && v.año === year);
    const tomadosAno = vacEmp?.diasTomados.length || 0;
    // días tomados en el mes actual seleccionado (filtramos por mes visible) — simplificado: todos los del año
    const tomadosMes = 0; // Panel lateral muestra totales anuales
    const pendientes = Math.max(0, DIAS_VACACIONES_POR_ANO - tomadosAno);
    return { emp, tomadosAno, pendientes };
  });

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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

// ─── Componente Principal ─────────────────────────────────────────────────────
export const VacacionesTab = () => {
  const hoy = new Date();
  const [año, setAño] = useState(hoy.getFullYear());
  const [empleados, setEmpleados] = useState([]);
  const [vacaciones, setVacaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [emps, vacs] = await Promise.all([getEmpleados(), getVacaciones(año)]);
        setEmpleados(emps);
        setVacaciones(vacs);
      } catch {
        setEmpleados([]);
        setVacaciones([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [año]);

  const [mesInicio, setMesInicio] = useState(0);
  const mesesVisibles = 3;

  const mesesActuales = useMemo(() => {
    const arr = [];
    for (let i = 0; i < mesesVisibles; i++) {
      const m = (mesInicio + i) % 12;
      arr.push(m);
    }
    return arr;
  }, [mesInicio]);

  const vacacionesAño = useMemo(
    () => vacaciones.filter(v => v.año === año),
    [vacaciones, año]
  );

  const vacacionesAñoAnterior = useMemo(
    () => vacaciones.filter(v => v.año === año - 1),
    [vacaciones, año]
  );

  const handleToggleDia = async (empleadoId, year, month, dia) => {
    const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const current = vacaciones.find((v) => v.empleadoId === empleadoId && v.año === year);
    const diasTomados = toggleFecha(current?.diasTomados ?? [], fechaStr);

    try {
      const saved = await saveVacacion({ empleadoId, año: year, diasTomados });
      setVacaciones((prev) => {
        const idx = prev.findIndex((v) => v.empleadoId === empleadoId && v.año === year);
        if (idx === -1) return [...prev, saved];
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const avanzarMeses = () => setMesInicio(m => (m + mesesVisibles) % 12);
  const retrocederMeses = () => setMesInicio(m => (m - mesesVisibles + 12) % 12);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        Cargando vacaciones...
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Vacaciones</h1>
            <p className="text-sm text-slate-500">
              Registro de días tomados por colaborador · {DIAS_VACACIONES_POR_ANO} días por año
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAño(a => a - 1)}
            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-gray-50 text-slate-600 font-bold shadow-sm transition-all"
          >
            ‹
          </button>
          <span className="text-sm font-bold text-slate-700 min-w-[60px] text-center">{año}</span>
          <button
            type="button"
            onClick={() => setAño(a => a + 1)}
            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-gray-50 text-slate-600 font-bold shadow-sm transition-all"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <button onClick={retrocederMeses}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-all">
              ‹ Meses anteriores
            </button>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {MESES_NOMBRES[mesesActuales[0]]} – {MESES_NOMBRES[mesesActuales[mesesActuales.length - 1]]} {año}
            </span>
            <button onClick={avanzarMeses}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-all">
              Meses siguientes ›
            </button>
          </div>

          {mesesActuales.map(m => (
            <TablaVacMes
              key={m}
              year={año}
              month={m}
              empleados={empleados}
              vacaciones={vacacionesAño}
              onToggleDia={handleToggleDia}
            />
          ))}
        </div>

        <div className="w-full xl:w-[320px] flex-shrink-0 space-y-4 xl:sticky xl:top-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-1">
            PERTENE AL AÑO
          </div>

          <ResumenAño
            year={año - 1}
            empleados={empleados}
            vacaciones={vacaciones}
            titulo={`VACACIONES CORRESPONDIENTE AL AÑO ${año - 1}`}
            color="bg-orange-400"
          />

          <ResumenAño
            year={año}
            empleados={empleados}
            vacaciones={vacaciones}
            titulo={`VACACIONES CORRESPONDIENTE AL AÑO ${año}`}
            color="bg-green-600"
          />

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Leyenda</p>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-800 font-black rounded text-[10px]">X</span>
              <span>Día de vacación tomado</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <span className="inline-block w-5 h-5 bg-gray-100/60 border border-gray-200 rounded" />
              <span>Fin de semana</span>
            </div>
            <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-[10px] text-blue-700 font-bold">
                Vacaciones por año: <span className="text-lg font-black">{DIAS_VACACIONES_POR_ANO}</span> días
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
