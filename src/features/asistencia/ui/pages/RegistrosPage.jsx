import React, { useEffect, useState, useMemo } from 'react';
import { getAsistencias, registrarAsistencia, getTodayMarcaciones, getProximaMarcacion, registrarPermiso } from '../../application/asistenciaService';
import { isDiaLaboralCompleto, parseEmpleadoIdFromQr } from '../../helpers/asistenciaHelpers';
import { MarcacionesTimeline } from '../components/MarcacionesTimeline';
import { KioskMarcadoresPanel } from '../components/KioskMarcadoresPanel';
import { QrScannerViewport } from '../components/QrScannerViewport';
import { ScannerModal } from '../components/ScannerModal';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';


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

function getWeekDaysForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(lunes);
    x.setDate(lunes.getDate() + i);
    days.push(x);
  }
  return days;
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatFecha(fecha) {
  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';



const calcTotalHours = (marks) => {
  const e = marks.find(a=>a.tipo==='ENTRADA'); const s = marks.find(a=>a.tipo==='SALIDA');
  const ia = marks.find(a=>a.tipo==='INICIO_ALMUERZO'); const fa = marks.find(a=>a.tipo==='FIN_ALMUERZO');
  if (!e||!s) return null;
  let ms = 0;
  if (ia&&fa) { ms+=new Date(ia.fechaHora)-new Date(e.fechaHora); ms+=new Date(s.fechaHora)-new Date(fa.fechaHora); }
  else ms+=new Date(s.fechaHora)-new Date(e.fechaHora);
  return `${Math.floor(ms/3600000)}h ${String(Math.floor((ms%3600000)/60000)).padStart(2,'0')}m`;
};

const calculateLapses = (marcaciones) => {
  const entrada = marcaciones.find(m => m.tipo === 'ENTRADA');
  const inicioAlm = marcaciones.find(m => m.tipo === 'INICIO_ALMUERZO');
  const finAlm = marcaciones.find(m => m.tipo === 'FIN_ALMUERZO');
  const salida = marcaciones.find(m => m.tipo === 'SALIDA');

  let almuerzoLapso = '';
  let trabajoLapso = '';

  if (inicioAlm && finAlm) {
    const diffMs = new Date(finAlm.fechaHora).getTime() - new Date(inicioAlm.fechaHora).getTime();
    const mins = Math.floor(diffMs / 60000);
    almuerzoLapso = `${mins} minutos`;
  }

  if (entrada && salida) {
    let diffMs = new Date(salida.fechaHora).getTime() - new Date(entrada.fechaHora).getTime();
    if (inicioAlm && finAlm) {
      diffMs -= (new Date(finAlm.fechaHora).getTime() - new Date(inicioAlm.fechaHora).getTime());
    }
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const remainingMins = totalMins % 60;
    trabajoLapso = `${hrs}h ${remainingMins}m netas`;
  } else if (entrada) {
    let diffMs = new Date().getTime() - new Date(entrada.fechaHora).getTime();
    if (inicioAlm) {
      const finTime = finAlm ? new Date(finAlm.fechaHora).getTime() : new Date().getTime();
      diffMs -= (finTime - new Date(inicioAlm.fechaHora).getTime());
    }
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const remainingMins = totalMins % 60;
    trabajoLapso = `${hrs}h ${remainingMins}m (en curso)`;
  }

  return {
    almuerzo: almuerzoLapso || '—',
    trabajo: trabajoLapso || '—',
  };
};


/* ─── Seed mock data ────────────────────────────────────────────────────────── */
function seedMockData() {
  localStorage.removeItem('asistencias_mock');
  const hoy = new Date();
  const empleados = JSON.parse(localStorage.getItem('luxes_empleados') || '[]');
  if (!empleados.length) return;
  const data = [];
  const pushMarcacion = (empId, empName, tipo, fecha, hora, min) => {
    const d = new Date(fecha); d.setHours(hora, min, 0, 0);
    data.push({ id: crypto.randomUUID(), empleadoId: empId, nombreEmpleado: empName, tipo, label: tipo, fechaHora: d.toISOString(), ubicacion: {lat:-2.19616,lng:-79.88621} });
  };
  for (let d = -14; d <= 0; d++) {
    const dia = new Date(hoy); dia.setDate(dia.getDate() + d);
    if (dia.getDay() === 0 || dia.getDay() === 6) continue; // skip weekends
    const fechaStr = toISODate(dia);
    empleados.forEach((emp, idx) => {
      const skip = idx === 2 && d === -3; // EMP-003 misses a day
      const partial = idx === 4 && (d === -5 || d === -2); // EMP-005 partial days
      pushMarcacion(emp.id, emp.nombre, 'ENTRADA', fechaStr, d === 0 ? 8 : 7 + Math.floor(Math.random()*2), Math.floor(Math.random()*30));
      if (!partial) pushMarcacion(emp.id, emp.nombre, 'INICIO_ALMUERZO', fechaStr, 12, Math.floor(Math.random()*15));
      if (!partial) pushMarcacion(emp.id, emp.nombre, 'FIN_ALMUERZO', fechaStr, 13, Math.floor(Math.random()*10));
      if (!skip && !partial) pushMarcacion(emp.id, emp.nombre, 'SALIDA', fechaStr, 17, Math.floor(Math.random()*30));
    });
  }
  localStorage.setItem('asistencias_mock', JSON.stringify(data));
}

/* ─── Helpers Quiosco ───────────────────────────────────────────────────────── */
const getMarcacionToastDetails = (tipo) => {
  switch (tipo) {
    case 'ENTRADA':
      return {
        label: 'Entrada',
        bg: 'bg-emerald-950/90 border-emerald-500',
        text: 'text-emerald-400',
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-950/50 border-emerald-500/30'
      };
    case 'INICIO_ALMUERZO':
      return {
        label: 'Salida Almuerzo',
        bg: 'bg-amber-950/90 border-amber-500',
        text: 'text-amber-400',
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-950/50 border-amber-500/30'
      };
    case 'FIN_ALMUERZO':
      return {
        label: 'Regreso Almuerzo',
        bg: 'bg-sky-950/90 border-sky-500',
        text: 'text-sky-400',
        iconColor: 'text-sky-500',
        iconBg: 'bg-sky-950/50 border-sky-500/30'
      };
    case 'SALIDA':
      return {
        label: 'Salida Trabajo',
        bg: 'bg-indigo-950/90 border-indigo-500',
        text: 'text-indigo-400',
        iconColor: 'text-indigo-500',
        iconBg: 'bg-indigo-950/50 border-indigo-500/30'
      };
    default:
      return {
        label: 'Marcación',
        bg: 'bg-slate-950/90 border-slate-500',
        text: 'text-slate-400',
        iconColor: 'text-slate-500',
        iconBg: 'bg-slate-950/50 border-slate-500/30'
      };
  }
};

const KioskView = () => {
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [pendingScan, setPendingScan] = useState(null);
  const [kioskSession, setKioskSession] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [ubicacion, setUbicacion] = useState(null);
  const [ubicacionError, setUbicacionError] = useState(null);

  // Reloj digital para Quiosco
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Solicitar ubicación al montar
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => { 
          console.warn('Sin ubicación', err); 
          setUbicacionError('Permiso de ubicación denegado.'); 
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUbicacionError('La geolocalización no es soportada.');
    }
  }, []);

  const resolveUbicacion = async () => {
    let ubicacionFinal = ubicacion;
    if (!ubicacionFinal && navigator.geolocation) {
      ubicacionFinal = await new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 3000 }
        )
      );
    }
    return ubicacionFinal || { lat: -2.19616, lng: -79.88621 };
  };

  const ejecutarRegistroKiosk = async (empleadoId, omitirAlmuerzo = false) => {
    setIsProcessingScan(true);
    setScanError(null);
    setPendingScan(null);

    try {
      const ubicacionFinal = await resolveUbicacion();
      const registro = await registrarAsistencia({
        empleadoId: empleadoId.trim(),
        ubicacion: ubicacionFinal,
        omitirAlmuerzo,
      });

      const marcaciones = await getTodayMarcaciones(empleadoId.trim());
      const lapsos = calculateLapses(marcaciones);

      setLastScan({
        empleadoId: empleadoId.trim(),
        nombreEmpleado: registro.nombreEmpleado || empleadoId,
        tipo: registro.tipo,
        label: registro.label,
        fechaHora: registro.fechaHora,
        marcaciones,
        lapsos,
      });

      setKioskSession({
        empleadoId: empleadoId.trim(),
        nombreEmpleado: registro.nombreEmpleado || empleadoId,
        marcaciones,
      });

      setTimeout(() => setLastScan(null), 8000);
    } catch (err) {
      console.error(err);
      setScanError(err.message || 'Error al procesar el código QR.');
      setTimeout(() => setScanError(null), 5000);
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleKioskScan = async (result) => {
    if (!result || result.length === 0 || isProcessingScan || pendingScan) return;
    const empleadoId = parseEmpleadoIdFromQr(result[0].rawValue);
    if (!empleadoId) {
      setScanError('Código QR no válido. Usa la credencial impresa del colaborador.');
      setTimeout(() => setScanError(null), 4000);
      return;
    }
    setIsProcessingScan(true);
    setScanError(null);

    try {
      const [marcaciones, proxima] = await Promise.all([
        getTodayMarcaciones(empleadoId),
        getProximaMarcacion(empleadoId),
      ]);

      setKioskSession({
        empleadoId,
        nombreEmpleado: marcaciones[0]?.nombreEmpleado || empleadoId,
        marcaciones,
      });

      if (proxima.completado || isDiaLaboralCompleto(marcaciones)) {
        throw new Error('El colaborador ya completó las marcaciones del día.');
      }

      if (proxima.permiteOmitirAlmuerzo) {
        const hora = new Date().getHours();
        if (hora >= 14) {
          await ejecutarRegistroKiosk(empleadoId, false);
          return;
        }
        setPendingScan({ empleadoId, marcaciones, proxima });
        setIsProcessingScan(false);
        return;
      }

      await ejecutarRegistroKiosk(empleadoId, false);
    } catch (err) {
      console.error(err);
      setScanError(err.message || 'Error al procesar el código QR.');
      setTimeout(() => setScanError(null), 5000);
      setIsProcessingScan(false);
    }
  };

  const toastDetails = lastScan ? getMarcacionToastDetails(lastScan.tipo) : null;

  return (
    <div className="min-h-[calc(100vh-70px)] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 sm:p-6 w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Columna principal: escáner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="text-center lg:text-left">
            <h2 className="text-lg sm:text-xl font-black text-white">Escanea tu credencial</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto lg:mx-0 leading-relaxed">
              Coloca el código QR impreso en el carnet dentro del marco verde. La cámara está siempre activa en este terminal.
            </p>
          </div>

          <QrScannerViewport
            onScan={handleKioskScan}
            onError={(err) => console.error('Error en Scanner Kiosco', err)}
            processing={isProcessingScan}
            paused={!!pendingScan}
            variant="dark"
            className="mx-auto w-full max-w-[420px]"
          />

          {scanError && (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-center animate-fade-in">
              <p className="text-sm font-bold text-red-400">Error de registro</p>
              <p className="text-xs text-slate-400 mt-1">{scanError}</p>
            </div>
          )}

          {pendingScan && (
            <div className="rounded-2xl border border-blue-500/30 bg-slate-950/80 p-4 space-y-3 animate-fade-in">
              <div className="text-center">
                <h3 className="text-base font-black text-white">¿Qué deseas registrar?</h3>
                <p className="text-xs text-slate-400 mt-1">ID: {pendingScan.empleadoId}</p>
              </div>
              <MarcacionesTimeline marcaciones={pendingScan.marcaciones} compact />
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isProcessingScan}
                  onClick={() => ejecutarRegistroKiosk(pendingScan.empleadoId, false)}
                  className="w-full py-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-extrabold text-sm hover:bg-amber-950/80 transition-colors"
                >
                  Inicio almuerzo
                </button>
                <button
                  type="button"
                  disabled={isProcessingScan}
                  onClick={() => ejecutarRegistroKiosk(pendingScan.empleadoId, true)}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-extrabold text-sm hover:bg-indigo-500 transition-colors"
                >
                  Salida sin almuerzo / horas extras
                </button>
                <button
                  type="button"
                  onClick={() => setPendingScan(null)}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-300"
                >
                  Cancelar y volver a escanear
                </button>
              </div>
            </div>
          )}

          {lastScan && toastDetails && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3 animate-fade-in">
              <div className="text-center">
                <h3 className="text-lg font-black text-white">¡Hola, {lastScan.nombreEmpleado}!</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">ID: {lastScan.empleadoId}</p>
              </div>
              <div className="py-2 px-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <p className={`text-sm font-extrabold uppercase tracking-wider ${toastDetails.text}`}>
                  {toastDetails.label} registrada
                </p>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  {new Date(lastScan.fechaHora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              <MarcacionesTimeline marcaciones={lastScan.marcaciones} highlightTipo={lastScan.tipo} compact />
            </div>
          )}
        </div>

        {/* Columna lateral: reloj + marcaciones */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="text-center">
            <p className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
              {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest leading-relaxed">
              {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            {ubicacionError ? (
              <span className="mt-3 px-2.5 py-1 text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/25 rounded-full inline-flex items-center gap-1">
                Sin GPS: {ubicacionError}
              </span>
            ) : ubicacion ? (
              <span className="mt-3 px-2.5 py-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/25 rounded-full inline-flex items-center gap-1">
                GPS activo
              </span>
            ) : (
              <span className="mt-3 px-2.5 py-1 text-[9px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-full inline-flex items-center gap-1">
                Buscando GPS…
              </span>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <KioskMarcadoresPanel
              marcaciones={kioskSession?.marcaciones ?? []}
              empleadoNombre={kioskSession?.nombreEmpleado}
              empleadoId={kioskSession?.empleadoId}
              highlightTipo={lastScan?.tipo}
            />
          </div>
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export const RegistrosPage = () => {
  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const isKioskMode = userObj?.rol === 'asistencia';

  if (isKioskMode) {
    return <KioskView />;
  }

  return <AdminView />;
};

const AdminView = () => {
  const [fechaFiltro, setFechaFiltro] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [asistencias, setAsistencias] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS'); // TODOS | ASISTIO | FALTO | PERMISO
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, emps] = await Promise.all([
        getAsistencias(fechaFiltro, fechaFiltro),
        getEmpleados()
      ]);
      setAsistencias(data);
      setEmpleados(emps);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar los datos de asistencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fechaFiltro]);

  const handleConcederPermiso = async (empleadoId) => {
    try {
      await registrarPermiso({ empleadoId, fecha: fechaFiltro });
      toast.success('Permiso pagado registrado con éxito');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al registrar el permiso');
    }
  };

  const weekDays = useMemo(() => {
    return getWeekDaysForDate(fechaFiltro);
  }, [fechaFiltro]);

  const handlePrevWeek = () => {
    const d = new Date(fechaFiltro + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setFechaFiltro(toISODate(d));
  };

  const handleNextWeek = () => {
    const d = new Date(fechaFiltro + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setFechaFiltro(toISODate(d));
  };

  const rows = useMemo(() => {
    return empleados.map(emp => {
      const marcaciones = asistencias.filter(a => a.empleadoId === emp.id);
      
      let estado = 'FALTO'; 
      const tienePermiso = marcaciones.some(m => m.tipo === 'PERMISO');
      if (tienePermiso) {
        estado = 'PERMISO';
      } else if (marcaciones.length > 0) {
        estado = 'ASISTIO';
      }

      return {
        emp,
        marcaciones,
        estado
      };
    });
  }, [empleados, asistencias]);

  const rowsFiltrados = useMemo(() => {
    return rows.filter(r => {
      const matchBusqueda = busqueda.trim() === '' || 
        r.emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.emp.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.emp.cargo && r.emp.cargo.toLowerCase().includes(busqueda.toLowerCase()));
      
      const matchEstado = filtroEstado === 'TODOS' || r.estado === filtroEstado;
      
      return matchBusqueda && matchEstado;
    });
  }, [rows, busqueda, filtroEstado]);

  const kpis = useMemo(() => {
    const total = empleados.length;
    const asistieron = rows.filter(r => r.estado === 'ASISTIO').length;
    const faltaron = rows.filter(r => r.estado === 'FALTO').length;
    const permisos = rows.filter(r => r.estado === 'PERMISO').length;
    return { total, asistieron, faltaron, permisos };
  }, [empleados, rows]);

  const descargarExcel = () => {
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
td{mso-number-format:"\\@";padding:4px 8px;font-size:10pt;font-family:Calibri;border:1px solid #d1d5db;}
th{background:#d6e4f0;font-weight:bold;padding:4px 8px;font-size:10pt;font-family:Calibri;border:1px solid #a0b8cc;text-align:center;}
.title{background:#1e3a5f;color:#fff;font-size:14pt;font-weight:bold;text-align:center;}
.asistio{color:#10b981;font-weight:bold;text-align:center;}
.falta{color:#ef4444;font-weight:bold;text-align:center;}
.permiso{color:#3b82f6;font-weight:bold;text-align:center;}
.nombre{font-weight:bold;}
</style>
</head><body><table>`;

    const cell = (content, cls = '') => `<td${cls?' class="'+cls+'"':''}>${String(content ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`;

    html += `<tr><td colspan="7" class="title">REPORTE DIARIO DE ASISTENCIA - ${fechaFiltro}</td></tr>`;
    html += '<tr><td colspan="7" style="height:6px;border:none"></td></tr>';
    html += '<tr><th>Empleado</th><th>ID</th><th>Cargo</th><th>Estado</th><th>Entrada</th><th>Salida</th><th>Detalle</th></tr>';

    rows.forEach(r => {
      const e = r.marcaciones.find(a=>a.tipo==='ENTRADA');
      const s = r.marcaciones.find(a=>a.tipo==='SALIDA');
      let statusText = 'Faltó';
      let statusCls = 'falta';
      if (r.estado === 'ASISTIO') {
        statusText = 'Asistió';
        statusCls = 'asistio';
      } else if (r.estado === 'PERMISO') {
        statusText = 'Permiso Pagado';
        statusCls = 'permiso';
      }

      html += `<tr>
        ${cell(r.emp.nombre, 'nombre')}
        ${cell(r.emp.id)}
        ${cell(r.emp.cargo)}
        ${cell(statusText, statusCls)}
        ${cell(e ? new Date(e.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
        ${cell(s ? new Date(s.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
        ${cell(r.estado === 'PERMISO' ? 'Día Cobrado' : '')}
      </tr>`;
    });

    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `asistencia-${fechaFiltro}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
  };

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div className="p-6 xl:p-8 w-full animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .kpi-card { position: relative; overflow: hidden; }
        .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 2px 2px 0 0; }
        .kpi-card.total::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
        .kpi-card.asistencias::before { background: linear-gradient(90deg, #10b981, #34d399); }
        .kpi-card.faltas::before { background: linear-gradient(90deg, #ef4444, #f87171); }
        .kpi-card.permisos::before { background: linear-gradient(90deg, #6366f1, #818cf8); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Control de Asistencia Diario</h1>
          <p className="text-sm text-slate-500">Supervisión diaria, control de ausencias y asignación de permisos.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 transition-all shadow-sm cursor-pointer border-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5Z" />
            </svg>
            Escanear QR
          </button>
          <button onClick={descargarExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-gray-50 transition-all shadow-sm cursor-pointer border-solid">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar Día
          </button>
        </div>
      </div>

      {/* KPIs Grid - placed above calendar selector, in a single row */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-6">
        {[
          { label: 'Colaboradores', value: kpis.total, cssClass: 'total', color: 'text-blue-600' },
          { label: 'Asistencias', value: kpis.asistieron, cssClass: 'asistencias', color: 'text-emerald-600' },
          { label: 'Faltas', value: kpis.faltaron, cssClass: 'faltas', color: 'text-red-600' },
          { label: 'Permisos', value: kpis.permisos, cssClass: 'permisos', color: 'text-indigo-600' },
        ].map(s => (
          <div key={s.label} className={`bg-white shadow-card kpi-card ${s.cssClass} rounded-xl p-2.5 sm:px-4 sm:py-3.5 border border-gray-100`}>
            <p className="text-[8px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">{s.label}</p>
            <p className={`text-base sm:text-2xl font-black mt-0.5 sm:mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Selector de Semana / Fecha en forma de Cards Navigables */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevWeek} 
              className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 font-bold transition-all cursor-pointer"
              title="Semana Anterior"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            
            <button 
              onClick={() => setFechaFiltro(new Date().toISOString().split('T')[0])} 
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
            >
              Hoy
            </button>

            <button 
              onClick={handleNextWeek} 
              className="w-9 h-9 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 font-bold transition-all cursor-pointer"
              title="Semana Siguiente"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <span className="text-sm font-bold text-slate-700 ml-2">
              Semana del {weekDays[0] && formatFecha(weekDays[0])} al {weekDays[6] && formatFecha(weekDays[6])}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ir a fecha / cambiar mes o año:</span>
              <input
                type="date"
                value={fechaFiltro}
                onChange={e => setFechaFiltro(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Tarjetas de Días de la Semana */}
        <div className="flex justify-start md:justify-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {weekDays.map((d, i) => {
            const iso = toISODate(d);
            const isSelected = iso === fechaFiltro;
            const isToday = iso === new Date().toISOString().split('T')[0];
            
            return (
              <button 
                key={i} 
                onClick={() => setFechaFiltro(iso)}
                className={`flex flex-col items-center p-3 rounded-2xl text-[10px] font-bold transition-all min-w-[70px] shrink-0 border cursor-pointer ${
                  isSelected 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md transform scale-[1.02]' 
                    : isToday
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`uppercase tracking-wider text-[9px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {DIAS_LABEL[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                </span>
                <span className="text-lg font-black mt-1 leading-none">
                  {d.getDate()}
                </span>
                {isToday && (
                  <span className={`text-[7px] font-bold mt-1 px-1 rounded-sm ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-200/50 text-blue-700'}`}>
                    HOY
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador y Filtros de Estado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" placeholder="Buscar empleado por nombre, ID o cargo..."
            value={busqueda} onChange={e=>setBusqueda(e.target.value)}
            className="w-full border border-gray-200 bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-gray-400 shadow-sm" />
          {busqueda && (
            <button onClick={()=>setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'TODOS', label: 'Todos' },
            { key: 'ASISTIO', label: 'Asistieron' },
            { key: 'FALTO', label: 'Faltaron' },
            { key: 'PERMISO', label: 'Permisos' },
          ].map(t => (
            <button key={t.key} onClick={() => setFiltroEstado(t.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filtroEstado === t.key ? 'bg-blue-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Main List Table */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            <span className="text-xs font-medium text-slate-400">Cargando registros...</span>
          </div>
        </div>
      ) : rowsFiltrados.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-card">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <h3 className="text-base font-bold text-slate-700">No se encontraron colaboradores</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Prueba ajustando el filtro de búsqueda o el estado seleccionado.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left">
                  <th className="px-6 py-4">Colaborador / Cargo</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-4 py-4 text-center">Entrada</th>
                  <th className="px-4 py-4 text-center">Salida Almuerzo</th>
                  <th className="px-4 py-4 text-center">Regreso Almuerzo</th>
                  <th className="px-4 py-4 text-center">Salida</th>
                  <th className="px-6 py-4 text-center">Total Horas</th>
                  <th className="px-6 py-4 text-right">Acción / Mapa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rowsFiltrados.map(({ emp, marcaciones, estado }) => {
                  const entrada = marcaciones.find(m => m.tipo === 'ENTRADA');
                  const inicioAlm = marcaciones.find(m => m.tipo === 'INICIO_ALMUERZO');
                  const finAlm = marcaciones.find(m => m.tipo === 'FIN_ALMUERZO');
                  const salida = marcaciones.find(m => m.tipo === 'SALIDA');
                  
                  const isFalto = estado === 'FALTO';
                  const isPermiso = estado === 'PERMISO';
                  const isAsistio = estado === 'ASISTIO';

                  const anyMarcacionConUbicacion = marcaciones.find(m => m.ubicacionLat && m.ubicacionLng);
                  const mapsUrl = anyMarcacionConUbicacion 
                    ? `https://www.google.com/maps/search/?api=1&query=${anyMarcacionConUbicacion.ubicacionLat},${anyMarcacionConUbicacion.ubicacionLng}` 
                    : null;
                  
                  let lapsos = { trabajo: '—', almuerzo: '—' };
                  if (isAsistio) {
                    lapsos = calculateLapses(marcaciones);
                  }

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Colaborador / Cargo */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <PersonInitialsAvatar name={emp.nombre} seed={emp.id} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate normal-case">{emp.nombre}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {emp.id} • {emp.cargo || 'General'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isAsistio && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Asistió
                          </span>
                        )}
                        {isFalto && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-700 bg-red-50 border border-red-200/60 px-2.5 py-1 rounded-xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Faltó
                          </span>
                        )}
                        {isPermiso && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Permiso Pagado
                          </span>
                        )}
                      </td>

                      {/* Entrada */}
                      <td className={`px-4 py-4 whitespace-nowrap text-center font-mono text-xs font-bold ${entrada ? 'text-slate-800' : 'text-slate-300'}`}>
                        {formatTime(entrada?.fechaHora)}
                      </td>

                      {/* Salida Almuerzo */}
                      <td className={`px-4 py-4 whitespace-nowrap text-center font-mono text-xs font-bold ${inicioAlm ? 'text-slate-800' : 'text-slate-300'}`}>
                        {formatTime(inicioAlm?.fechaHora)}
                      </td>

                      {/* Regreso Almuerzo */}
                      <td className={`px-4 py-4 whitespace-nowrap text-center font-mono text-xs font-bold ${finAlm ? 'text-slate-800' : 'text-slate-300'}`}>
                        {formatTime(finAlm?.fechaHora)}
                      </td>

                      {/* Salida */}
                      <td className={`px-4 py-4 whitespace-nowrap text-center font-mono text-xs font-bold ${salida ? 'text-slate-800' : 'text-slate-300'}`}>
                        {formatTime(salida?.fechaHora)}
                      </td>

                      {/* Total Horas */}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-semibold text-slate-600">
                        {isAsistio ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-800">{lapsos.trabajo}</span>
                            {lapsos.almuerzo !== '—' && (
                              <span className="text-[9px] text-slate-400 font-medium mt-0.5">Alm: {lapsos.almuerzo}</span>
                            )}
                          </div>
                        ) : isPermiso ? (
                          <span className="text-indigo-600 font-bold">Día Cobrado</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Acción / Mapa */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isFalto ? (
                          <button
                            onClick={() => handleConcederPermiso(emp.id)}
                            className="px-3 py-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-sm hover:shadow transition-all shrink-0 cursor-pointer border-none"
                          >
                            Conceder Permiso
                          </button>
                        ) : mapsUrl ? (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                            </svg>
                            Ver Mapa
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
