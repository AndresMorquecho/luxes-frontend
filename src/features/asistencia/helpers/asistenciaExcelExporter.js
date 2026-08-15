import * as XLSX from 'xlsx';
import { getHorarioEsperado, diffMinutosVsEsperado, calcularMultaAtraso } from './horarioLaboral';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA_CORTO = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const DIAS_SEMANA_COMPLETO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Retorna todos los días del mes en formato { dateStr: 'YYYY-MM-DD', dayNum: 1..31, dayOfWeek: 0..6, dayNameShort: 'LUN', weekNum: 1..5 }
 */
export function getDiasDelMes(year, monthIndex) {
  const totalDias = new Date(year, monthIndex + 1, 0).getDate();
  const dias = [];

  for (let d = 1; d <= totalDias; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dayOfWeek = dateObj.getDay();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(monthIndex + 1)}-${pad(d)}`;
    
    // Semana del mes (1 a 5) calculada de forma natural agrupando bloques de 7 días o lunes-domingo
    const weekNum = Math.min(5, Math.ceil((d + (new Date(year, monthIndex, 1).getDay() || 7) - 1) / 7));

    dias.push({
      dayNum: d,
      dateStr,
      dateObj,
      dayOfWeek,
      dayNameShort: DIAS_SEMANA_CORTO[dayOfWeek],
      dayNameLong: DIAS_SEMANA_COMPLETO[dayOfWeek],
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6,
      weekNum,
    });
  }

  return dias;
}

/**
 * Calcula métricas y horarios de un empleado en un día específico a partir de sus marcaciones
 */
export function procesarDiaEmpleado(marcacionesDelDia = [], dateStr, horariosConfig) {
  const tienePermiso = marcacionesDelDia.some(m => m.tipo === 'PERMISO');
  const entrada = marcacionesDelDia.find(m => m.tipo === 'ENTRADA');
  const inicioAlm = marcacionesDelDia.find(m => m.tipo === 'INICIO_ALMUERZO');
  const finAlm = marcacionesDelDia.find(m => m.tipo === 'FIN_ALMUERZO');
  const salida = marcacionesDelDia.find(m => m.tipo === 'SALIDA');

  let estado = 'FALTO';
  let estadoSimbolo = '✗';
  if (tienePermiso) {
    estado = 'PERMISO';
    estadoSimbolo = 'P';
  } else if (marcacionesDelDia.length > 0) {
    estado = 'ASISTIO';
    estadoSimbolo = '✓';
  }

  // Tiempos
  const formatHour = (m) => m ? new Date(m.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
  const entradaHora = formatHour(entrada);
  const inicioAlmHora = formatHour(inicioAlm);
  const finAlmHora = formatHour(finAlm);
  const salidaHora = formatHour(salida);

  // Duración Almuerzo
  let duracionAlmMin = 0;
  let duracionAlmStr = '';
  if (inicioAlm && finAlm) {
    const diffMs = new Date(finAlm.fechaHora).getTime() - new Date(inicioAlm.fechaHora).getTime();
    duracionAlmMin = Math.max(0, Math.floor(diffMs / 60000));
    duracionAlmStr = `${duracionAlmMin} min`;
  }

  // Horas netas trabajadas
  let horasNetasMin = 0;
  let horasNetasStr = '';
  if (entrada && salida) {
    let diffMs = new Date(salida.fechaHora).getTime() - new Date(entrada.fechaHora).getTime();
    if (inicioAlm && finAlm) {
      diffMs -= (new Date(finAlm.fechaHora).getTime() - new Date(inicioAlm.fechaHora).getTime());
    }
    horasNetasMin = Math.max(0, Math.floor(diffMs / 60000));
    const h = Math.floor(horasNetasMin / 60);
    const m = horasNetasMin % 60;
    horasNetasStr = `${h}h ${String(m).padStart(2, '0')}m`;
  } else if (tienePermiso) {
    horasNetasMin = 480; // 8 horas base en día de permiso
    horasNetasStr = '8h 00m';
  }

  // Atraso y Horas Extras
  let atrasoMin = 0;
  let multaDolares = 0;
  let horasExtras = 0;

  const horarioEsp = getHorarioEsperado(dateStr, horariosConfig);
  const tol = (horariosConfig && horariosConfig.toleranciaMinutos) || 8;

  if (entrada && horarioEsp.ENTRADA) {
    const diff = diffMinutosVsEsperado(entrada.fechaHora, horarioEsp.ENTRADA);
    if (diff !== null && diff > 0) {
      atrasoMin = diff;
      multaDolares = calcularMultaAtraso(diff, tol);
    }
  }

  // Si trabajó más allá de la hora esperada de salida (ej. > 30 min extra)
  if (salida && horarioEsp.SALIDA) {
    const diffSalida = diffMinutosVsEsperado(salida.fechaHora, horarioEsp.SALIDA);
    if (diffSalida !== null && diffSalida >= 30) {
      horasExtras = Math.round((diffSalida / 60) * 10) / 10;
    }
  }

  return {
    estado,
    estadoSimbolo,
    entradaHora,
    inicioAlmHora,
    finAlmHora,
    duracionAlmStr,
    duracionAlmMin,
    salidaHora,
    horasNetasStr,
    horasNetasMin,
    atrasoMin,
    multaDolares,
    horasExtras,
  };
}

/**
 * Genera y descarga el archivo Excel con 3 hojas para el mes completo
 */
export function exportarAsistenciaMensualExcel({
  year,
  monthIndex,
  empleados = [],
  asistencias = [],
  horariosConfig,
}) {
  const mesNombre = MESES[monthIndex] || 'Mes';
  const diasMes = getDiasDelMes(year, monthIndex);
  const totalDias = diasMes.length;

  // Agrupador de marcaciones por `${empleadoId}_${dateStr}`
  const mapMarcaciones = new Map();
  asistencias.forEach((a) => {
    const dStr = (a.fecha || (a.fechaHora ? a.fechaHora.split('T')[0].split(' ')[0] : '')).slice(0, 10);
    const key = `${a.empleadoId}_${dStr}`;
    if (!mapMarcaciones.has(key)) {
      mapMarcaciones.set(key, []);
    }
    mapMarcaciones.get(key).push(a);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HOJA 1: MATRIZ MENSUAL (1 al 31)
  // ═══════════════════════════════════════════════════════════════════════════
  const matrizAOA = [];

  // Título
  matrizAOA.push([`LUXES PUBLICIDAD — CONTROL DE ASISTENCIA MENSUAL (${mesNombre.toUpperCase()} ${year})`]);
  matrizAOA.push([`Generado el: ${new Date().toLocaleString('es-EC')} | Total Colaboradores: ${empleados.length}`]);
  matrizAOA.push([]); // Espacio

  // Fila de Semanas (Header 1)
  const headerSemanas = ['DATOS DEL COLABORADOR', '', '', ''];
  diasMes.forEach((d) => {
    const wLabel = `SEMANA ${d.weekNum}`;
    headerSemanas.push(wLabel);
  });
  headerSemanas.push('RESUMEN Y TOTALES DEL MES', '', '', '', '', '');
  matrizAOA.push(headerSemanas);

  // Fila de Días (Header 2)
  const headerDias = ['#', 'COLABORADOR', 'ID / CÉDULA', 'CARGO'];
  diasMes.forEach((d) => {
    headerDias.push(`${d.dayNum} ${d.dayNameShort}`);
  });
  headerDias.push('ASISTENCIAS', 'FALTAS', 'PERMISOS', 'TOTAL HORAS', 'HORAS EXTRAS', 'ATRASO (MIN)');
  matrizAOA.push(headerDias);

  // Filas por Empleado
  const resumenEmpleados = [];

  empleados.forEach((emp, idx) => {
    const row = [
      idx + 1,
      emp.nombre,
      emp.id || emp.cedula || '—',
      emp.cargo || 'General',
    ];

    let countAsistencias = 0;
    let countFaltas = 0;
    let countPermisos = 0;
    let totalMinutosTrabajados = 0;
    let totalHorasExtras = 0;
    let totalAtrasoMin = 0;
    let totalMultasDolares = 0;

    diasMes.forEach((d) => {
      const key = `${emp.id}_${d.dateStr}`;
      const marks = mapMarcaciones.get(key) || [];
      const info = procesarDiaEmpleado(marks, d.dateStr, horariosConfig);

      if (d.isSunday && marks.length === 0) {
        row.push('—'); // Domingo libre
      } else if (info.estado === 'ASISTIO') {
        row.push('✓');
        countAsistencias++;
        totalMinutosTrabajados += info.horasNetasMin;
        totalHorasExtras += info.horasExtras;
        totalAtrasoMin += info.atrasoMin;
        totalMultasDolares += info.multaDolares;
      } else if (info.estado === 'PERMISO') {
        row.push('P');
        countPermisos++;
        totalMinutosTrabajados += info.horasNetasMin;
      } else {
        row.push('✗');
        countFaltas++;
      }
    });

    const totalHorasNetasStr = `${Math.floor(totalMinutosTrabajados / 60)}h ${String(totalMinutosTrabajados % 60).padStart(2, '0')}m`;

    row.push(
      countAsistencias,
      countFaltas,
      countPermisos,
      totalHorasNetasStr,
      totalHorasExtras > 0 ? `${totalHorasExtras}h` : '0h',
      totalAtrasoMin > 0 ? `${totalAtrasoMin} min` : '0 min'
    );

    matrizAOA.push(row);

    resumenEmpleados.push({
      num: idx + 1,
      nombre: emp.nombre,
      id: emp.id || emp.cedula || '—',
      cargo: emp.cargo || 'General',
      asistencias: countAsistencias,
      faltas: countFaltas,
      permisos: countPermisos,
      totalHorasNetasStr,
      totalHorasExtras,
      totalAtrasoMin,
      totalMultasDolares,
      porcentajeAsistencia: Math.round((countAsistencias / (totalDias || 1)) * 100),
    });
  });

  // Fila de Leyenda al pie
  matrizAOA.push([]);
  matrizAOA.push(['LEYENDA:', '✓ = Asistió / Presente', '✗ = Falta / Inasistencia', 'P = Permiso Pagado', '— = Domingo / Día Libre']);

  const wsMatriz = XLSX.utils.aoa_to_sheet(matrizAOA);

  // Ajuste de anchos para la matriz
  const colWidthsMatriz = [
    { wch: 4 },   // #
    { wch: 32 },  // Colaborador
    { wch: 14 },  // ID
    { wch: 18 },  // Cargo
  ];
  diasMes.forEach(() => colWidthsMatriz.push({ wch: 8 })); // Cada día
  colWidthsMatriz.push({ wch: 13 }, { wch: 10 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 15 });
  wsMatriz['!cols'] = colWidthsMatriz;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. HOJA 2: DETALLE DIARIO DE HORARIOS Y TIEMPOS
  // ═══════════════════════════════════════════════════════════════════════════
  const detalleAOA = [];
  detalleAOA.push([`LUXES PUBLICIDAD — DETALLE DE HORARIOS Y TIEMPOS (${mesNombre.toUpperCase()} ${year})`]);
  detalleAOA.push(['Reporte cronológico de entradas, almuerzos, salidas, horas netas y horas extras por día y colaborador.']);
  detalleAOA.push([]);

  detalleAOA.push([
    'FECHA',
    'DÍA',
    'SEMANA',
    'ID EMPLEADO',
    'COLABORADOR',
    'CARGO',
    'ESTADO',
    'ENTRADA REAL',
    'ATRASO (MIN)',
    'SAL. ALMUERZO',
    'REG. ALMUERZO',
    'TIEMPO ALMUERZO',
    'SALIDA REAL',
    'HORAS NETAS',
    'HORAS EXTRAS',
    'OBSERVACIÓN'
  ]);

  diasMes.forEach((d) => {
    empleados.forEach((emp) => {
      const key = `${emp.id}_${d.dateStr}`;
      const marks = mapMarcaciones.get(key) || [];
      const info = procesarDiaEmpleado(marks, d.dateStr, horariosConfig);

      let estadoTexto = 'Faltó';
      if (d.isSunday && marks.length === 0) {
        estadoTexto = 'Domingo / Libre';
      } else if (info.estado === 'ASISTIO') {
        estadoTexto = 'Asistió';
      } else if (info.estado === 'PERMISO') {
        estadoTexto = 'Permiso Pagado';
      }

      detalleAOA.push([
        d.dateStr,
        d.dayNameLong,
        `Semana ${d.weekNum}`,
        emp.id || emp.cedula || '—',
        emp.nombre,
        emp.cargo || 'General',
        estadoTexto,
        info.entradaHora || (info.estado === 'PERMISO' ? 'Permiso' : '—'),
        info.atrasoMin > 0 ? `+${info.atrasoMin} min` : (info.estado === 'ASISTIO' ? 'A tiempo' : '—'),
        info.inicioAlmHora || '—',
        info.finAlmHora || '—',
        info.duracionAlmStr || '—',
        info.salidaHora || (info.estado === 'PERMISO' ? 'Permiso' : '—'),
        info.horasNetasStr || (info.estado === 'PERMISO' ? '8h 00m' : '—'),
        info.horasExtras > 0 ? `+${info.horasExtras}h` : '0h',
        info.estado === 'PERMISO' ? 'Día de permiso justificado' : (d.isSunday ? 'Día no laboral' : '')
      ]);
    });
  });

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleAOA);
  wsDetalle['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 12 }, // Día
    { wch: 11 }, // Semana
    { wch: 14 }, // ID
    { wch: 30 }, // Colaborador
    { wch: 18 }, // Cargo
    { wch: 15 }, // Estado
    { wch: 14 }, // Entrada
    { wch: 14 }, // Atraso
    { wch: 14 }, // Sal Alm
    { wch: 14 }, // Reg Alm
    { wch: 16 }, // Duración Alm
    { wch: 14 }, // Salida
    { wch: 14 }, // Horas Netas
    { wch: 14 }, // Horas Extras
    { wch: 25 }, // Obs
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. HOJA 3: RESUMEN CONSOLIDADO DEL MES
  // ═══════════════════════════════════════════════════════════════════════════
  const resumenAOA = [];
  resumenAOA.push([`LUXES PUBLICIDAD — RESUMEN EJECUTIVO DE ASISTENCIA (${mesNombre.toUpperCase()} ${year})`]);
  resumenAOA.push([]);

  resumenAOA.push([
    '#',
    'COLABORADOR',
    'ID / CÉDULA',
    'CARGO',
    'DÍAS ASISTIDOS',
    'FALTAS',
    'PERMISOS PAGADOS',
    '% ASISTENCIA',
    'TOTAL HORAS LABORADAS',
    'HORAS EXTRAS TOTALES',
    'TOTAL ATRASO (MIN)',
    'MULTA ATRASOS EST. ($)'
  ]);

  resumenEmpleados.forEach((r) => {
    resumenAOA.push([
      r.num,
      r.nombre,
      r.id,
      r.cargo,
      r.asistencias,
      r.faltas,
      r.permisos,
      `${r.porcentajeAsistencia}%`,
      r.totalHorasNetasStr,
      r.totalHorasExtras > 0 ? `${r.totalHorasExtras}h` : '0h',
      r.totalAtrasoMin > 0 ? `${r.totalAtrasoMin} min` : '0 min',
      `$${r.totalMultasDolares.toFixed(2)}`
    ]);
  });

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenAOA);
  wsResumen['!cols'] = [
    { wch: 4 },
    { wch: 32 },
    { wch: 14 },
    { wch: 18 },
    { wch: 15 },
    { wch: 10 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREACIÓN DEL LIBRO Y DESCARGA
  // ═══════════════════════════════════════════════════════════════════════════
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsMatriz, 'Matriz Mensual');
  XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle Horarios');
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen Ejecutivo');

  const fileName = `Asistencia_${mesNombre}_${year}_Luxes.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Genera y descarga el archivo Excel para el reporte de un solo día
 */
export function exportarAsistenciaDiaExcel({ fechaStr, rows = [], horarioLabel = '' }) {
  const diaAOA = [];
  diaAOA.push([`LUXES PUBLICIDAD — REPORTE DIARIO DE ASISTENCIA (${fechaStr})`]);
  diaAOA.push([horarioLabel || 'Jornada Laboral Regular']);
  diaAOA.push([]);

  diaAOA.push([
    '#',
    'COLABORADOR',
    'ID / CÉDULA',
    'CARGO',
    'ESTADO',
    'HORA ENTRADA',
    'SAL. ALMUERZO',
    'REG. ALMUERZO',
    'TIEMPO ALMUERZO',
    'HORA SALIDA',
    'TOTAL HORAS TRABAJADAS'
  ]);

  rows.forEach((r, idx) => {
    const e = r.marcaciones.find(a => a.tipo === 'ENTRADA');
    const ia = r.marcaciones.find(a => a.tipo === 'INICIO_ALMUERZO');
    const fa = r.marcaciones.find(a => a.tipo === 'FIN_ALMUERZO');
    const s = r.marcaciones.find(a => a.tipo === 'SALIDA');
    
    let estadoText = 'Faltó';
    if (r.estado === 'ASISTIO') estadoText = 'Asistió';
    else if (r.estado === 'PERMISO') estadoText = 'Permiso Pagado';

    const fmtT = (m) => m ? new Date(m.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

    let lapsoAlm = '—';
    if (ia && fa) {
      const diffMs = new Date(fa.fechaHora) - new Date(ia.fechaHora);
      lapsoAlm = `${Math.floor(diffMs / 60000)} min`;
    }

    let lapsoTrabajo = '—';
    if (e && s) {
      let diffMs = new Date(s.fechaHora) - new Date(e.fechaHora);
      if (ia && fa) diffMs -= (new Date(fa.fechaHora) - new Date(ia.fechaHora));
      const totalMins = Math.floor(diffMs / 60000);
      lapsoTrabajo = `${Math.floor(totalMins / 60)}h ${String(totalMins % 60).padStart(2, '0')}m netas`;
    } else if (e) {
      let diffMs = new Date().getTime() - new Date(e.fechaHora).getTime();
      if (ia) {
        const finTime = fa ? new Date(fa.fechaHora).getTime() : new Date().getTime();
        diffMs -= (finTime - new Date(ia.fechaHora).getTime());
      }
      const totalMins = Math.floor(diffMs / 60000);
      lapsoTrabajo = `${Math.floor(totalMins / 60)}h ${String(totalMins % 60).padStart(2, '0')}m (en curso)`;
    } else if (r.estado === 'PERMISO') {
      lapsoTrabajo = '8h (Día Cobrado)';
    }

    diaAOA.push([
      idx + 1,
      r.emp.nombre,
      r.emp.id || r.emp.cedula || '—',
      r.emp.cargo || 'General',
      estadoText,
      fmtT(e),
      fmtT(ia),
      fmtT(fa),
      lapsoAlm,
      fmtT(s),
      lapsoTrabajo
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(diaAOA);
  ws['!cols'] = [
    { wch: 4 },
    { wch: 32 },
    { wch: 14 },
    { wch: 18 },
    { wch: 15 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Asistencia Diaria');
  XLSX.writeFile(workbook, `Asistencia_Diaria_${fechaStr}_Luxes.xlsx`);
}
