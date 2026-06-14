import React, { useEffect, useState, useMemo } from 'react';
import { getAsistencias } from '../../application/asistenciaService';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { ScannerModal } from '../components/ScannerModal';

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const DIAS_LABEL = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const DIAS_NOMBRE = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getWeekRange(date) {
  const d = new Date(date);
  const dia = d.getDay();
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
  lunes.setHours(0, 0, 0, 0);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);
  return { lunes, domingo };
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatFecha(fecha) {
  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

const AVATAR_PALETTES = [
  { bg: '#dbeafe', text: '#2563eb' },
  { bg: '#d1fae5', text: '#059669' },
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#ffedd5', text: '#ea580c' },
  { bg: '#fce7f3', text: '#db2777' },
];

const getAvatarStyle = (seed = '') => {
  const idx = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
};

const getEstadoTipo = (completados) => {
  if (completados === 4) return 'completo';
  if (completados > 0) return 'parcial';
  return 'pendiente';
};

const ESTADO_STYLES = {
  pendiente: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    label: 'Pendiente',
  },
  parcial: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    label: null,
  },
  completo: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Completo',
  },
};

const MARCACION_COLORS = {
  ENTRADA: { activo: 'text-blue-700', inactivo: 'text-slate-300' },
  INICIO_ALMUERZO: { activo: 'text-amber-700', inactivo: 'text-slate-300' },
  FIN_ALMUERZO: { activo: 'text-orange-700', inactivo: 'text-slate-300' },
  SALIDA: { activo: 'text-indigo-700', inactivo: 'text-slate-300' },
};

const MarcacionCell = ({ time, activo, tipo }) => {
  const colors = MARCACION_COLORS[tipo] || { activo: 'text-slate-800', inactivo: 'text-slate-300' };
  return (
    <span className={`text-sm font-mono font-semibold ${activo ? colors.activo : colors.inactivo}`}>
      {formatTime(time)}
    </span>
  );
};

const EstadoBadge = ({ completados, total, size = 'md' }) => {
  const tipo = getEstadoTipo(completados);
  const style = ESTADO_STYLES[tipo];
  const label = tipo === 'parcial' ? `${completados}/4` : style.label;
  const sizeClass = size === 'sm'
    ? 'px-2 py-0.5 text-[9px] font-bold rounded-md'
    : 'px-2.5 py-1 text-xs font-semibold rounded-full';

  return (
    <div className="inline-flex flex-col items-start">
      <span className={`inline-flex items-center gap-1 border ${style.bg} ${style.text} ${style.border} ${sizeClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        {tipo === 'completo' && size !== 'sm' && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
        {label}
      </span>
      {total && size !== 'sm' && (
        <p className="text-xs font-medium text-emerald-600 mt-1">{total}</p>
      )}
    </div>
  );
};

const calcTotalHours = (marks) => {
  const e = marks.find(a=>a.tipo==='ENTRADA'); const s = marks.find(a=>a.tipo==='SALIDA');
  const ia = marks.find(a=>a.tipo==='INICIO_ALMUERZO'); const fa = marks.find(a=>a.tipo==='FIN_ALMUERZO');
  if (!e||!s) return null;
  let ms = 0;
  if (ia&&fa) { ms+=new Date(ia.fechaHora)-new Date(e.fechaHora); ms+=new Date(s.fechaHora)-new Date(fa.fechaHora); }
  else ms+=new Date(s.fechaHora)-new Date(e.fechaHora);
  return `${Math.floor(ms/3600000)}h ${String(Math.floor((ms%3600000)/60000)).padStart(2,'0')}m`;
};

/* ─── Componente ────────────────────────────────────────────────────────────── */
export const RegistrosPage = () => {
  const today = new Date();
  const [asistencias, setAsistencias] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [vista, setVista] = useState('dia'); // dia | semana | mes
  const [offset, setOffset] = useState(0);
  const [diaIndex, setDiaIndex] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const descargarReporte = () => {
    const periodo = vista === 'dia'
      ? `${diasSemana[diaIndex]?.toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric'})}`
      : vista === 'semana'
      ? `${formatFecha(lunes)} al ${formatFecha(domingo)}`
      : `${MESES[mesActual.getMonth()]} ${mesActual.getFullYear()}`;

    const title = vista === 'dia' ? 'REPORTE DIARIO DE ASISTENCIA'
      : vista === 'semana' ? 'REPORTE SEMANAL DE ASISTENCIA'
      : 'REPORTE MENSUAL DE ASISTENCIA';

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Asistencia</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
td{mso-number-format:"\\@";padding:4px 8px;font-size:10pt;font-family:Calibri;border:1px solid #d1d5db;}
th{background:#d6e4f0;font-weight:bold;padding:4px 8px;font-size:10pt;font-family:Calibri;border:1px solid #a0b8cc;text-align:center;}
.title{background:#1e3a5f;color:#fff;font-size:14pt;font-weight:bold;text-align:center;}
.sub{color:#6b7280;font-size:9pt;text-align:center;border:none;}
.completo{color:#10b981;font-weight:bold;text-align:center;}
.parcial{color:#f59e0b;font-weight:bold;text-align:center;}
.vacio{color:#d1d5db;text-align:center;}
.nombre{font-weight:bold;}
</style>
</head><body><table>`;

    const cell = (content, cls = '') => `<td${cls?' class="'+cls+'"':''}>${String(content ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`;

    html += `<tr><td colspan="8" class="title">${title} - ${periodo}</td></tr>`;
    html += '<tr><td colspan="8" style="height:6px;border:none"></td></tr>';

    if (vista === 'dia') {
      html += '<tr><th>Colaborador</th><th>ID</th><th>Entrada</th><th>Inicio Almuerzo</th><th>Fin Almuerzo</th><th>Salida</th><th>Marc.</th><th>Horas</th></tr>';
      empleadosFiltrados.forEach(emp => {
        const marks = asistenciasFiltradas.filter(a => a.empleadoId === emp.id);
        const e = marks.find(a=>a.tipo==='ENTRADA'); const ia = marks.find(a=>a.tipo==='INICIO_ALMUERZO');
        const fa = marks.find(a=>a.tipo==='FIN_ALMUERZO'); const s = marks.find(a=>a.tipo==='SALIDA');
        const total = calcTotalHours(marks) || '';
        const cls = marks.length === 4 ? 'completo' : marks.length > 0 ? 'parcial' : 'vacio';
        html += `<tr>${cell(emp.nombre,'nombre')}${cell(emp.id)}${cell(e?formatTime(e.fechaHora):'')}${cell(ia?formatTime(ia.fechaHora):'')}${cell(fa?formatTime(fa.fechaHora):'')}${cell(s?formatTime(s.fechaHora):'')}${cell(marks.length+'/4',cls)}${cell(total)}</tr>`;
      });
    } else if (vista === 'semana') {
      html += '<tr><th>Colaborador</th><th>ID</th>';
      diasSemana.forEach((d,i) => { html += `<th>${DIAS_LABEL[i]}<br><span style="font-weight:normal;font-size:8pt">${d.getDate()}</span></th>`; });
      html += '</tr>';
      empleadosFiltrados.forEach(emp => {
        let r = `<tr>${cell(emp.nombre,'nombre')}${cell(emp.id)}`;
        diasSemana.forEach(d => {
          const marks = asistenciasFiltradas.filter(a => a.empleadoId === emp.id && toISODate(new Date(a.fechaHora)) === toISODate(d));
          const count = marks.length;
          const cls = count === 4 ? 'completo' : count > 0 ? 'parcial' : 'vacio';
          r += cell(count === 0 ? '-' : count+'/4', cls);
        });
        html += r + '</tr>';
      });
    } else {
      html += '<tr><th>Colaborador</th><th>ID</th>';
      diasMes.forEach(d => { html += `<th style="font-size:8pt">${d.getDate()}</th>`; });
      html += '</tr>';
      empleadosFiltrados.forEach(emp => {
        let r = `<tr>${cell(emp.nombre,'nombre')}${cell(emp.id)}`;
        diasMes.forEach(d => {
          const marks = asistenciasFiltradas.filter(a => a.empleadoId === emp.id && toISODate(new Date(a.fechaHora)) === toISODate(d));
          const count = marks.length;
          const cls = count === 4 ? 'completo' : count > 0 ? 'parcial' : 'vacio';
          r += cell(count === 0 ? '-' : count+'/4', cls);
        });
        html += r + '</tr>';
      });
    }

    const ts = new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
    html += `<tr><td colspan="8" class="sub">Generado el ${ts} &mdash; LUXES - Sistema de Gesti&oacute;n de Asistencia</td></tr>`;
    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    const sufijo = vista==='dia'?diasSemana[diaIndex]?.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}):vista==='semana'?`${formatFecha(lunes)}-${formatFecha(domingo)}`:`${MESES[mesActual.getMonth()]}-${mesActual.getFullYear()}`;
    a.download = `asistencia-${sufijo}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [data, emps] = await Promise.all([getAsistencias(), getEmpleados()]);
        data.sort((a,b) => new Date(b.fechaHora)-new Date(a.fechaHora));
        setAsistencias(data); setEmpleados(emps);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const semanaActual = useMemo(() => {
    const base = new Date(today); base.setDate(base.getDate()+offset*7); return getWeekRange(base);
  }, [offset]);

  const { lunes, domingo } = semanaActual;
  const fechaInicio = toISODate(lunes);
  const fechaFin = toISODate(domingo);

  const diasSemana = useMemo(() => {
    const d = [];
    for (let i=0;i<7;i++) { const x=new Date(lunes); x.setDate(lunes.getDate()+i); d.push(x); }
    return d;
  }, [lunes]);

  const statusDia = (d) => { const h=new Date(); h.setHours(0,0,0,0); const x=new Date(d); x.setHours(0,0,0,0); if (x<h) return 'pasado'; if (+x===+h) return 'hoy'; return 'futuro'; };

  const esSemanaFutura = useMemo(() => {
    const h=new Date(); h.setHours(0,0,0,0); return lunes>h;
  }, [lunes]);

  const diaHoyIndex = diasSemana.findIndex(d => toISODate(d) === toISODate(today));

  const empleadosFiltrados = useMemo(() => {
    if (!busqueda) return empleados;
    const q = busqueda.toLowerCase();
    return empleados.filter(e => e.nombre.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.cargo?.toLowerCase().includes(q));
  }, [empleados, busqueda]);

  useEffect(() => {
    if (vista === 'dia' && diaIndex === null) {
      if (diaHoyIndex>=0) setDiaIndex(diaHoyIndex);
      else { for (let i=6;i>=0;i--) { if (diasSemana[i]<today) { setDiaIndex(i); return; } } setDiaIndex(0); }
    }
  }, [vista, diaIndex, diaHoyIndex, diasSemana]);

  // ─── Mes view ───
  const mesOffset = useMemo(()=>Math.floor(offset/4), [offset]);
  const mesActual = useMemo(() => {
    const m = new Date(); m.setMonth(m.getMonth()+mesOffset); return m;
  }, [mesOffset]);

  const diasMes = useMemo(() => {
    const m = mesActual.getMonth(); const y = mesActual.getFullYear();
    const total = new Date(y, m+1, 0).getDate();
    const d = []; for (let i=1;i<=total;i++) d.push(new Date(y,m,i)); return d;
  }, [mesActual]);

  const asistenciasFiltradas = useMemo(() => {
    if (vista==='dia') {
      const d = diaIndex!==null ? diasSemana[diaIndex] : null;
      return d ? asistencias.filter(a => toISODate(new Date(a.fechaHora))===toISODate(d)) : [];
    }
    if (vista==='semana') return asistencias.filter(a => { const f=toISODate(new Date(a.fechaHora)); return f>=fechaInicio&&f<=fechaFin; });
    // mes
    const m=mesActual.getMonth(); const y=mesActual.getFullYear();
    return asistencias.filter(a => { const d=new Date(a.fechaHora); return d.getMonth()===m&&d.getFullYear()===y; });
  }, [asistencias, vista, diaIndex, diasSemana, fechaInicio, fechaFin, mesActual]);

  // ─── Row template ───
  const MapaBoton = ({ ubicacion }) => ubicacion ? (
    <a href={`https://www.google.com/maps/search/?api=1&query=${ubicacion.lat},${ubicacion.lng}`} target="_blank" rel="noreferrer"
      className="text-xs font-medium text-blue-500 hover:text-blue-700 inline-flex items-center gap-1">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      Mapa
    </a>
  ) : <span className="text-sm text-slate-400">—</span>;

  const renderFilaTabla = (emp, marcaciones) => {
    const entrada = marcaciones.find(a => a.tipo === 'ENTRADA');
    const salida = marcaciones.find(a => a.tipo === 'SALIDA');
    const inicioAlm = marcaciones.find(a => a.tipo === 'INICIO_ALMUERZO');
    const finAlm = marcaciones.find(a => a.tipo === 'FIN_ALMUERZO');
    const completados = marcaciones.length;
    const total = calcTotalHours(marcaciones);
    const ubicacion = entrada?.ubicacion || inicioAlm?.ubicacion || finAlm?.ubicacion || salida?.ubicacion || null;
    const avatar = getAvatarStyle(emp.id || emp.nombre);

    return (
      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
              style={{ backgroundColor: avatar.bg, color: avatar.text }}
            >
              {emp.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{emp.nombre}</p>
              <p className="text-xs text-slate-400 mt-0.5">{emp.id}{emp.cargo ? ` · ${emp.cargo}` : ''}</p>
            </div>
          </div>
        </td>
        <td className="px-5 py-4 text-center">
          <MarcacionCell time={entrada?.fechaHora} activo={!!entrada} tipo="ENTRADA" />
        </td>
        <td className="px-5 py-4 text-center">
          <MarcacionCell time={inicioAlm?.fechaHora} activo={!!inicioAlm} tipo="INICIO_ALMUERZO" />
        </td>
        <td className="px-5 py-4 text-center">
          <MarcacionCell time={finAlm?.fechaHora} activo={!!finAlm} tipo="FIN_ALMUERZO" />
        </td>
        <td className="px-5 py-4 text-center">
          <MarcacionCell time={salida?.fechaHora} activo={!!salida} tipo="SALIDA" />
        </td>
        <td className="px-5 py-4">
          <EstadoBadge completados={completados} total={total} />
        </td>
        <td className="px-5 py-4 text-right">
          <MapaBoton ubicacion={ubicacion} />
        </td>
      </tr>
    );
  };

  const renderVistaDia = () => {
    const diaFecha = diaIndex!==null ? diasSemana[diaIndex] : null;
    const esFuturo = diaFecha ? statusDia(diaFecha)==='futuro' : true;
    const rows = diaFecha ? empleadosFiltrados.map(emp => ({ emp, marcaciones: asistenciasFiltradas.filter(a=>a.empleadoId===emp.id) })) : [];
    const fechaLabel = diaFecha
      ? diaFecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';

    return (
      <div className={`bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden ${esFuturo?'opacity-60':''}`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Asistencia del día</h2>
            <span className="text-xs font-medium text-gray-400">{empleadosFiltrados.length} colaborador{empleadosFiltrados.length!==1?'es':''}</span>
            {fechaLabel && <span className="hidden sm:inline text-xs text-slate-400">· {fechaLabel}</span>}
          </div>
        </div>

        <div className="flex justify-start md:justify-center gap-1.5 px-5 py-4 border-b border-gray-100 overflow-x-auto scroll-smooth no-scrollbar">
          {diasSemana.map((d,i) => {
            const st = statusDia(d); const sel = diaIndex===i;
            const esHoy = st==='hoy';
            return (
              <button key={i} onClick={()=>esHoy?setDiaIndex(i):null}
                disabled={!esHoy}
                className={`flex flex-col items-center px-4 py-2 rounded-xl text-[10px] font-bold transition-all min-w-[56px] shrink-0 ${
                  sel ? 'bg-blue-900 text-white shadow-md ring-2 ring-blue-300' :
                  esHoy ? 'bg-blue-50 border border-blue-200 text-blue-700 cursor-pointer hover:bg-blue-100' :
                  'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}>
                <span>{DIAS_LABEL[i]}</span>
                <span className={`text-[13px] font-black ${sel?'text-white':'text-gray-800'}`}>{d.getDate()}</span>
                {esHoy && <span className={`text-[8px] font-semibold ${sel?'text-blue-200':'text-blue-500'}`}>HOY</span>}
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm asistencia-table">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="text-center px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Entrada</th>
                <th className="text-center px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inicio Almuerzo</th>
                <th className="text-center px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fin Almuerzo</th>
                <th className="text-center px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Salida</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => renderFilaTabla(r.emp, r.marcaciones))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-slate-400">
                    {busqueda ? 'No se encontraron colaboradores' : 'No hay colaboradores registrados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs font-medium text-gray-400">{empleadosFiltrados.length} colaborador{empleadosFiltrados.length !== 1 ? 'es' : ''}</span>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Pendiente
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Parcial
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completo
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderVistaSemana = () => {
    const rows = empleadosFiltrados.map(emp => {
      const fechas = {};
      diasSemana.forEach(d => { fechas[toISODate(d)] = asistenciasFiltradas.filter(a=>a.empleadoId===emp.id&&toISODate(new Date(a.fechaHora))===toISODate(d)); });
      return { emp, fechas };
    });
    const puedeAvanzar = (()=>{ const h=getWeekRange(new Date()); const s=getWeekRange(new Date(today.getTime()+(offset+1)*7*86400000)); return s.lunes<=h.lunes; })();
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={()=>setOffset(o=>o-1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-gray-50 text-slate-600 font-bold shadow-sm transition-all">‹</button>
            <button onClick={()=>{setOffset(0);setDiaIndex(null);}} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 shadow-sm transition-all">Hoy</button>
            <button onClick={()=>{const h=new Date();const s=getWeekRange(new Date(today.getTime()+(offset+1)*7*86400000));if(s.lunes<=h)setOffset(o=>o+1);}}
              disabled={!puedeAvanzar}
              className={`w-8 h-8 flex items-center justify-center border rounded-lg font-bold shadow-sm transition-all ${puedeAvanzar?'bg-white border-slate-200 hover:bg-gray-50 text-slate-600':'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'}`}>›</button>
          </div>
          <span className="text-sm font-bold text-slate-700">{formatFecha(lunes)} — {formatFecha(domingo)}</span>
        </div>
        <div className={`bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden ${esSemanaFutura?'opacity-60':''} relative`}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Asistencia Semanal</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-blue-900 text-white font-bold px-4 py-2.5 min-w-[160px] text-left uppercase tracking-wider border-r border-blue-700">Colaborador</th>
                  {diasSemana.map((d,i) => {
                    const st=statusDia(d);
                    return (<th key={i}
                      className={`text-center px-1.5 py-2 min-w-[110px] border-l border-blue-700 ${st==='hoy'?'bg-blue-600 text-white':st==='futuro'?'bg-blue-700 text-blue-200':'bg-blue-800 text-blue-100'}`}>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider">{DIAS_LABEL[i]}</div>
                      <div className="text-[9px] mt-0.5 font-medium opacity-70">{d.getDate()} {d.toLocaleDateString('es-ES',{month:'short'})}</div>
                      {st==='futuro'&&<svg className="w-3 h-3 mx-auto text-blue-300 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}
                    </th>);
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({emp,fechas},idx) => (
                  <tr key={emp.id} className={idx%2===0?'bg-white':'bg-gray-50/60'}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-semibold text-gray-800 uppercase text-[10px] border-r border-gray-200 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center font-bold text-[9px] text-gray-500 shrink-0">{emp.nombre.charAt(0).toUpperCase()}</div>
                        <span className="truncate">{emp.nombre}</span>
                      </div>
                    </td>
                    {diasSemana.map((d,i) => {
                      const st=statusDia(d); const marc=fechas[toISODate(d)]||[];
                      const estadoTipo = getEstadoTipo(marc.length);
                      const cellTint = marc.length === 0
                        ? (st === 'futuro' ? '' : 'bg-rose-50/40')
                        : estadoTipo === 'completo' ? 'bg-emerald-50/50' : 'bg-amber-50/50';
                      return (<td key={i} className={`text-center border-l border-gray-100 ${st==='futuro'?'bg-gray-50/40':st==='hoy'?'bg-blue-50/40':''} ${cellTint}`}>
                        {marc.length===0 ? (
                          st==='futuro'
                            ? <svg className="w-3.5 h-3.5 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                            : <div className="flex justify-center py-1"><EstadoBadge completados={0} size="sm" /></div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 py-1">
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${marc.find(a=>a.tipo==='ENTRADA')?'bg-blue-500':'bg-gray-200'}`} />
                              <span className={`w-1.5 h-1.5 rounded-full ${marc.find(a=>a.tipo==='INICIO_ALMUERZO')?'bg-amber-500':'bg-gray-200'}`} />
                              <span className={`w-1.5 h-1.5 rounded-full ${marc.find(a=>a.tipo==='FIN_ALMUERZO')?'bg-orange-500':'bg-gray-200'}`} />
                              <span className={`w-1.5 h-1.5 rounded-full ${marc.find(a=>a.tipo==='SALIDA')?'bg-indigo-500':'bg-gray-200'}`} />
                            </div>
                            <EstadoBadge completados={marc.length} size="sm" />
                          </div>
                        )}
                      </td>);
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {esSemanaFutura&&<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-6 flex flex-col items-center shadow-xl border border-gray-200">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                <p className="text-sm font-bold text-gray-500">Semana bloqueada</p>
                <p className="text-[11px] text-gray-400 mt-1">Los registros estarán disponibles cuando llegue esta semana</p>
              </div>
            </div>}
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs font-medium text-gray-400">{empleadosFiltrados.length} colaboradores</span>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-500" /> Pendiente</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500" /> Parcial</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completo</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderVistaMes = () => {
    const rows = empleadosFiltrados.map(emp => {
      const fechas = {};
      diasMes.forEach(d => { const iso=toISODate(d); fechas[iso] = asistenciasFiltradas.filter(a=>a.empleadoId===emp.id&&toISODate(new Date(a.fechaHora))===iso); });
      return { emp, fechas };
    });
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={()=>setOffset(o=>o-4)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-gray-50 text-slate-600 font-bold shadow-sm transition-all">‹</button>
            <button onClick={()=>setOffset(0)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 shadow-sm transition-all">Hoy</button>
            <button onClick={()=>setOffset(o=>o+4)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-gray-50 text-slate-600 font-bold shadow-sm transition-all">›</button>
          </div>
          <span className="text-sm font-bold text-slate-700">{MESES[mesActual.getMonth()]} {mesActual.getFullYear()}</span>
        </div>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Asistencia Mensual</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-blue-900 text-white font-bold px-4 py-2.5 min-w-[160px] text-left uppercase tracking-wider border-r border-blue-700">Colaborador</th>
                  {diasMes.map((d,i) => {
                    const st=statusDia(d);
                    const esFinde=d.getDay()===0||d.getDay()===6;
                    return (<th key={i}
                      className={`text-center px-1 py-2 min-w-[32px] border-l border-blue-700 ${
                        esFinde?'bg-blue-700 text-blue-200':st==='hoy'?'bg-blue-600 text-white':st==='futuro'?'bg-blue-700 text-blue-200':'bg-blue-800 text-blue-100'
                      }`}>
                      <div className="text-[9px] font-bold">{d.getDate()}</div>
                      <div className={`text-[7px] mt-0.5 font-medium ${esFinde?'opacity-100':'opacity-60'}`}>{DIAS_LABEL[d.getDay()]}</div>
                    </th>);
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({emp,fechas},idx) => (
                  <tr key={emp.id} className={idx%2===0?'bg-white':'bg-gray-50/60'}>
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-semibold text-gray-800 uppercase text-[10px] border-r border-gray-200 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center font-bold text-[9px] text-gray-500 shrink-0">{emp.nombre.charAt(0).toUpperCase()}</div>
                        <span className="truncate">{emp.nombre}</span>
                      </div>
                    </td>
                    {diasMes.map((d,i) => {
                      const st=statusDia(d); const esFinde=d.getDay()===0||d.getDay()===6;
                      const marc=fechas[toISODate(d)]||[];
                      const estadoTipo = getEstadoTipo(marc.length);
                      const cellTint = marc.length === 0
                        ? (st === 'futuro' ? '' : 'bg-rose-50/50')
                        : estadoTipo === 'completo' ? 'bg-emerald-50/60' : 'bg-amber-50/60';
                      return (<td key={i} className={`text-center border-l border-gray-100 ${esFinde?'bg-gray-100/40':st==='hoy'?'bg-blue-50/50':''} ${cellTint}`}>
                        {marc.length===0 ? (
                          st === 'futuro'
                            ? <span className="text-[8px] text-gray-200">—</span>
                            : <span className="inline-block w-2 h-2 rounded-full bg-rose-400 mx-auto my-1" title="Pendiente" />
                        ) : (
                          <div className="flex justify-center gap-0.5 py-1" title={`${marc.length}/4`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${marc.find(a=>a.tipo==='ENTRADA')?'bg-blue-500':'bg-gray-200'}`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${marc.find(a=>a.tipo==='INICIO_ALMUERZO')?'bg-amber-500':'bg-gray-200'}`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${marc.find(a=>a.tipo==='FIN_ALMUERZO')?'bg-orange-500':'bg-gray-200'}`} />
                            <span className={`w-1.5 h-1.5 rounded-full ${marc.find(a=>a.tipo==='SALIDA')?'bg-indigo-500':'bg-gray-200'}`} />
                          </div>
                        )}
                      </td>);
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs font-medium text-gray-400">{empleadosFiltrados.length} colaboradores · {diasMes.length} días</span>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500" /> Entrada</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500" /> Almuerzo</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Salida</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-500" /> Pendiente</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completo</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="p-6 md:p-8 w-full animate-slide-up">
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Asistencia</h1>
            <p className="text-sm text-slate-500">Registro y control de marcaciones del personal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={descargarReporte}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-gray-50 transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Descargar Reporte
          </button>
          <button onClick={() => setScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 shadow-sm"
            style={{ backgroundColor: '#1d4ed8' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
            </svg>
            Escanear QR
          </button>
        </div>
      </div>

      {/* ── Buscador + vista ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px] max-w-xl">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" placeholder="Buscar colaborador por nombre, ID o cargo..."
            value={busqueda} onChange={e=>setBusqueda(e.target.value)}
            className="w-full border border-gray-200 bg-white rounded-xl pl-9 pr-10 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400 shadow-sm" />
          {busqueda && (
            <button type="button" onClick={()=>setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { key:'dia', label:'Día' },
            { key:'semana', label:'Semana' },
            { key:'mes', label:'Mes' },
          ].map(t => (
            <button key={t.key} type="button" onClick={()=>{setVista(t.key);setDiaIndex(null);}}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                vista===t.key ? 'bg-blue-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ── Loading ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            <span className="text-xs font-medium text-gray-400">Cargando registros...</span>
          </div>
        </div>
      ) : vista==='dia' ? renderVistaDia() : vista==='semana' ? renderVistaSemana() : renderVistaMes()}

      <ScannerModal isOpen={scannerOpen} onClose={()=>setScannerOpen(false)}
        onSuccess={()=>{const f=async()=>{setLoading(true);try{const[d,e]=await Promise.all([getAsistencias(),getEmpleados()]);d.sort((a,b)=>new Date(b.fechaHora)-new Date(a.fechaHora));setAsistencias(d);setEmpleados(e);}catch(err){console.error(err)}finally{setLoading(false)}};f()}} />
    </div>
  );
};
