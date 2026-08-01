import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { getAsistencias, registrarAsistencia, getTodayMarcaciones, getProximaMarcacion, registrarPermiso, eliminarPermiso, getHorarioDelDia, getHorarioConfig, saveHorarioConfig } from '../../application/asistenciaService';
import { getOpcionesMarcacion, puedeRegistrarMarcacion } from '../../helpers/asistenciaHelpers';
import { MarcacionPickerModal } from '../components/MarcacionPickerModal';
import { getHorarioEsperado, getHorarioLabel, getEstadoAlmuerzo, normalizeHorariosConfig, DEFAULT_HORARIOS_CONFIG } from '../../helpers/horarioLaboral';
import { HorarioDelDiaBanner, HorarioEditModal } from '../components/HorarioDelDiaBanner';
import { MarcacionHorarioCell } from '../components/MarcacionHorarioCell';
import { MarcacionesTimeline } from '../components/MarcacionesTimeline';
import { KioskMarcadoresPanel } from '../components/KioskMarcadoresPanel';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { Scanner } from '@yudiel/react-qr-scanner';
import { toast } from '../../../../shared/ui/components/Toast';
import { PersonInitialsAvatar } from '../../../../shared/ui/components/PersonInitialsAvatar.jsx';
import { isAsistenciaUser, normalizeUserForSession } from '../../../../shared/utils/userRoleHelpers';
import { useGeolocation, getGpsBadgeProps } from '../../../../shared/hooks/useGeolocation';
import { OverlayPortal } from '../../../../shared/ui/components/ModalPortal';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';


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
    case 'FIN_HORAS_EXTRA':
      return {
        label: 'Fin Horas Extras',
        bg: 'bg-violet-950/90 border-violet-500',
        text: 'text-violet-300',
        iconColor: 'text-violet-500',
        iconBg: 'bg-violet-950/50 border-violet-500/30'
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [pendingScan, setPendingScan] = useState(null);
  const [kioskSession, setKioskSession] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { error: ubicacionError, status: gpsStatus, secure: gpsSecure, resolveUbicacion, retryGeolocation } = useGeolocation();
  const gpsBadge = getGpsBadgeProps({ status: gpsStatus, error: ubicacionError, secure: gpsSecure });
  const [horarioHoy, setHorarioHoy] = useState(null);
  const [recentRegistros, setRecentRegistros] = useState([]);


  // Usuario actualmente logueado en la sesión
  const currentUser = useMemo(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? normalizeUserForSession(JSON.parse(userStr)) : null;
    } catch {
      return null;
    }
  }, []);

  const [userEmpleadoId, setUserEmpleadoId] = useState(currentUser?.empleadoId || null);

  // Buscar el empleado asociado al usuario logueado
  useEffect(() => {
    let isMounted = true;
    getEmpleados()
      .then((empleados) => {
        if (!isMounted || !empleados || !empleados.length) return;
        let found = null;
        if (currentUser?.empleadoId) {
          found = empleados.find((e) => String(e.id).trim() === String(currentUser.empleadoId).trim());
        }
        if (!found && currentUser?.nombre) {
          found = empleados.find(
            (e) => e.nombre?.toLowerCase().trim() === currentUser.nombre?.toLowerCase().trim()
          );
        }
        if (!found && currentUser?.username) {
          found = empleados.find(
            (e) => e.codigo?.toLowerCase().trim() === currentUser.username?.toLowerCase().trim()
          );
        }
        if (found) {
          setUserEmpleadoId(found.id);
        }
      })
      .catch((err) => console.error('Error identificando empleado de usuario', err));
    return () => { isMounted = false; };
  }, [currentUser]);

  // Cargar marcaciones diarias del usuario logueado en el panel de control
  const loadUserTodaySession = useCallback(async (empId) => {
    const targetId = empId || userEmpleadoId;
    if (!targetId) return;
    try {
      const marcaciones = await getTodayMarcaciones(targetId);
      if (marcaciones) {
        const lapsos = calculateLapses(marcaciones);
        setKioskSession({
          empleadoId: targetId,
          nombreEmpleado: marcaciones[0]?.nombreEmpleado || currentUser?.nombre || targetId,
          marcaciones,
          lapsos,
        });
      }
    } catch (err) {
      console.error('Error cargando marcaciones del usuario logueado', err);
    }
  }, [userEmpleadoId, currentUser]);

  useEffect(() => {
    if (userEmpleadoId) {
      loadUserTodaySession(userEmpleadoId);
    }
  }, [userEmpleadoId, loadUserTodaySession]);

  // Cargar solo los registros recientes del usuario logueado
  const loadRecentRegistros = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const data = await getAsistencias(todayStr, todayStr);
      data.sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));

      if (userEmpleadoId || currentUser) {
        const filtered = data.filter((reg) => {
          if (userEmpleadoId && String(reg.empleadoId).trim() === String(userEmpleadoId).trim()) return true;
          if (currentUser?.nombre && reg.nombreEmpleado?.toLowerCase().trim() === currentUser.nombre?.toLowerCase().trim()) return true;
          return false;
        });
        setRecentRegistros(filtered.slice(0, 10));
      } else {
        setRecentRegistros(data.slice(0, 5));
      }
    } catch (err) {
      console.error('Error loading recent registrations:', err);
    }
  }, [userEmpleadoId, currentUser]);

  useEffect(() => {
    loadRecentRegistros();
  }, [loadRecentRegistros]);

  const [isKioskDesktop, setIsKioskDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );

  const hoyStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (event) => setIsKioskDesktop(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    getHorarioDelDia(hoyStr)
      .then(setHorarioHoy)
      .catch((err) => console.error('Error cargando horario del día', err));
  }, [hoyStr]);

  // Reloj digital para Quiosco
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ejecutarRegistroKiosk = async (empleadoId, tipo) => {
    setIsProcessingScan(true);
    setScanError(null);
    setPendingScan(null);

    try {
      const ubicacionFinal = await resolveUbicacion();
      if (!ubicacionFinal) {
        throw new Error('La ubicación (GPS) es obligatoria para registrar la asistencia. Por favor, activa los permisos de ubicación en tu navegador y vuelve a intentarlo.');
      }
      const registro = await registrarAsistencia({
        empleadoId: empleadoId.trim(),
        ubicacion: ubicacionFinal,
        tipo,
      });

      const marcaciones = await getTodayMarcaciones(empleadoId.trim());
      const lapsos = calculateLapses(marcaciones);

      // Mostrar overlay de confirmación para quien escaneó su QR
      setLastScan({
        empleadoId: empleadoId.trim(),
        nombreEmpleado: registro.nombreEmpleado || empleadoId,
        tipo: registro.tipo,
        label: registro.label,
        fechaHora: registro.fechaHora,
        marcaciones,
        lapsos,
        horasExtra: registro.horasExtra,
      });

      // Si quien escaneó es el usuario logueado, actualizar el panel principal
      if (userEmpleadoId && String(empleadoId).trim() === String(userEmpleadoId).trim()) {
        setKioskSession({
          empleadoId: empleadoId.trim(),
          nombreEmpleado: registro.nombreEmpleado || empleadoId,
          marcaciones,
          lapsos,
          horasExtra: registro.horasExtra,
        });
      } else if (userEmpleadoId) {
        // Mantener la sesión del usuario logueado en la pantalla
        loadUserTodaySession(userEmpleadoId);
      }

      setIsCameraActive(false);
      loadRecentRegistros();
      setTimeout(() => setLastScan(null), 8000);
    } catch (err) {
      console.error(err);
      setScanError(err.message || 'Error al procesar el código QR.');
      setIsCameraActive(false);
      setTimeout(() => setScanError(null), 5000);
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleKioskScan = async (result) => {
    if (!result || result.length === 0 || isProcessingScan || pendingScan) return;
    const empleadoId = result[0].rawValue.trim();
    setIsProcessingScan(true);
    setScanError(null);

    try {
      // Validar GPS antes de continuar con la marcación
      if (gpsStatus === 'denied' || gpsStatus === 'unavailable' || gpsStatus === 'unsupported' || ubicacionError) {
        throw new Error('La ubicación (GPS) es obligatoria para registrar la asistencia. Por favor, activa los permisos de ubicación en tu navegador.');
      }

      const [marcaciones, proxima] = await Promise.all([
        getTodayMarcaciones(empleadoId),
        getProximaMarcacion(empleadoId),
      ]);

      const lapsos = calculateLapses(marcaciones);

      setKioskSession({
        empleadoId,
        nombreEmpleado: marcaciones[0]?.nombreEmpleado || empleadoId,
        marcaciones,
        lapsos,
      });

      if (!puedeRegistrarMarcacion(marcaciones, proxima.tipoContrato, horarioHoy?.diaConfig?.salida)) {
        throw new Error('El colaborador ya completó las marcaciones del día.');
      }

      const horaSalidaConfig = horarioHoy?.diaConfig?.salida ?? null;
      const opciones = proxima.opciones?.length
        ? proxima.opciones.filter(op => {
            if (op.tipo === 'SALIDA_PERMISO') {
              const now = new Date();
              if (horaSalidaConfig) {
                const [sh, sm] = horaSalidaConfig.split(':').map(Number);
                if (now.getHours() * 60 + now.getMinutes() >= sh * 60 + sm) return false;
              }
            }
            return true;
          })
        : getOpcionesMarcacion(marcaciones, proxima.tipoContrato, horaSalidaConfig);

      setPendingScan({
        empleadoId,
        nombreEmpleado: marcaciones[0]?.nombreEmpleado || empleadoId,
        marcaciones,
        opciones,
        tipoContrato: proxima.tipoContrato,
      });
      setIsCameraActive(false);
      setIsProcessingScan(false);
    } catch (err) {
      console.error(err);
      setScanError(err.message || 'Error al procesar el código QR.');
      setIsCameraActive(false);
      setTimeout(() => setScanError(null), 5000);
      setIsProcessingScan(false);
    }
  };

  const getExpectedReturnTime = (fechaHoraStr) => {
    if (!horarioHoy?.diaConfig?.inicioAlmuerzo || !horarioHoy?.diaConfig?.finAlmuerzo) {
      const d = new Date(fechaHoraStr);
      d.setHours(d.getHours() + 1);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const [ish, ism] = horarioHoy.diaConfig.inicioAlmuerzo.split(':').map(Number);
    const [fsh, fsm] = horarioHoy.diaConfig.finAlmuerzo.split(':').map(Number);
    const durationMinutes = (fsh * 60 + fsm) - (ish * 60 + ism);
    
    const d = new Date(fechaHoraStr);
    d.setMinutes(d.getMinutes() + durationMinutes);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toastDetails = lastScan ? getMarcacionToastDetails(lastScan.tipo) : null;

  useEffect(() => {
    document.documentElement.classList.add('kiosk-no-scroll');
    document.body.classList.add('kiosk-no-scroll');
    return () => {
      document.documentElement.classList.remove('kiosk-no-scroll');
      document.body.classList.remove('kiosk-no-scroll');
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 p-6 flex flex-col gap-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        html.kiosk-no-scroll,
        body.kiosk-no-scroll {
          overflow-y: auto !important;
          height: auto !important;
        }
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(16, 185, 129, 0.4); box-shadow: 0 0 15px rgba(16, 185, 129, 0.1); }
          50% { border-color: rgba(16, 185, 129, 0.9); box-shadow: 0 0 25px rgba(16, 185, 129, 0.3); }
        }
        .pulse-border-active { animation: borderPulse 2s infinite; }
        .scan-overlay-line {
          animation: scannerSweep 2.5s ease-in-out infinite;
        }
        @keyframes scannerSweep {
          0%, 100% { top: 5%; }
          50% { top: 95%; }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Registro de asistencia</h1>
          <p className="text-xs text-slate-500 font-medium capitalize mt-1">
            {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div>
          {gpsBadge.tone === 'amber' ? (
            <button
              type="button"
              onClick={retryGeolocation}
              className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full inline-flex items-center gap-2 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {gpsBadge.text.includes('limitado') || gpsBadge.text.includes('inactivo') ? 'GPS inactivo · Marcación bloqueada' : gpsBadge.text}
            </button>
          ) : gpsBadge.tone === 'emerald' ? (
            <span className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              GPS activo y listo
            </span>
          ) : (
            <span className="px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Obteniendo GPS…
            </span>
          )}
        </div>
      </div>


      {/* Main Grid: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Card: Horario */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-800">Horario laboral</h2>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
              </svg>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Entrada', key: 'ENTRADA', time: '08:00', icon: 'bg-emerald-50 text-emerald-600', svg: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                )},
                { label: 'Almuerzo', key: 'INICIO_ALMUERZO', time: '13:00 - 14:00', icon: 'bg-amber-50 text-amber-600', svg: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                )},
                { label: 'Regreso almuerzo', key: 'FIN_ALMUERZO', time: '14:00', icon: 'bg-blue-50 text-blue-600', svg: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                )},
                { label: 'Salida', key: 'SALIDA', time: '17:30', icon: 'bg-purple-50 text-purple-600', svg: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                )}
              ].map((slot) => {
                const valorEsperado = horarioHoy?.esperado?.[slot.key];
                const timeText = slot.key === 'INICIO_ALMUERZO' && horarioHoy?.esperado?.INICIO_ALMUERZO && horarioHoy?.esperado?.FIN_ALMUERZO
                  ? `${horarioHoy.esperado.INICIO_ALMUERZO.label} - ${horarioHoy.esperado.FIN_ALMUERZO.label}`
                  : valorEsperado?.label || slot.time;
                
                return (
                  <div key={slot.key} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-none">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${slot.icon} shrink-0`}>
                        {slot.svg}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{slot.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-800">{timeText}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        Pendiente
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100/80">
            <p className="text-xs font-medium text-slate-400">
              Tu jornada laboral: <span className="font-extrabold text-blue-900">8h 30m</span>
            </p>
          </div>
        </div>

        {/* Center Card: Scanner / Reloj */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center min-h-[350px]">
          <p className="text-4xl font-extrabold text-slate-800 tracking-tight leading-none tabular-nums">
            {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs font-semibold text-slate-400 mt-2 capitalize">
            {currentTime.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          {!isCameraActive ? (
            <div className="flex flex-col items-center gap-4 mt-6 w-full">
              <button
                onClick={() => {
                  if (gpsBadge.tone === 'amber') {
                    toast.error('La ubicación (GPS) es obligatoria para registrar asistencia. Actívala e intenta nuevamente.');
                  } else {
                    setIsCameraActive(true);
                  }
                }}
                className={`w-40 h-40 border-2 rounded-full flex flex-col items-center justify-center gap-1.5 transition-all duration-300 transform hover:scale-[1.03] cursor-pointer ${
                  gpsBadge.tone === 'amber'
                    ? 'border-dashed border-rose-300 bg-rose-50/10'
                    : 'border-dashed border-emerald-400 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40'
                }`}
              >
                <svg className={`w-8 h-8 ${gpsBadge.tone === 'amber' ? 'text-rose-400' : 'text-emerald-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 15.75h4.5M16.5 14.25v4.5" />
                </svg>
                <span className={`text-xs font-black ${gpsBadge.tone === 'amber' ? 'text-rose-700' : 'text-emerald-800'}`}>Escanear QR</span>
                <span className={`text-[9px] font-semibold ${gpsBadge.tone === 'amber' ? 'text-rose-500/80' : 'text-emerald-600/70'}`}>para registrar</span>
              </button>
              
              <button
                onClick={() => {
                  if (gpsBadge.tone === 'amber') {
                    toast.error('La ubicación (GPS) es obligatoria para registrar asistencia. Actívala en tu navegador.');
                  } else {
                    setIsCameraActive(true);
                  }
                }}
                className={`w-full max-w-xs py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                  gpsBadge.tone === 'amber'
                    ? 'bg-rose-50/50 border-rose-100 text-rose-400 cursor-not-allowed'
                    : 'bg-blue-950 hover:bg-blue-900 text-white border-blue-900/40 shadow-sm shadow-blue-900/20'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
                Abrir cámara
              </button>
              
              {gpsBadge.tone === 'amber' && (
                <p className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 rounded-lg p-2.5 mt-2 leading-relaxed">
                  ⚠️ Ubicación GPS obligatoria desactivada. Activa los permisos de ubicación en tu navegador para poder registrar asistencia.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 animate-fade-in w-full mt-4">
              <div className="w-full max-w-[15rem] aspect-square rounded-2xl overflow-hidden relative border border-slate-200 bg-black shadow-inner shrink-0 pulse-border-active">
                {isProcessingScan && (
                  <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
                    <p className="text-[11px] font-semibold text-white mt-2">Procesando marcación...</p>
                  </div>
                )}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent z-40 scan-overlay-line opacity-95" />
                <Scanner
                  onScan={handleKioskScan}
                  onError={(err) => console.error('Error en Scanner Kiosco', err)}
                  constraints={{ facingMode: 'environment' }}
                  styles={{
                    container: { width: '100%', height: '100%', paddingTop: 0, margin: 0 },
                    video: { width: '100%', height: '100%', objectFit: 'cover' },
                  }}
                />
              </div>

              <button
                onClick={() => setIsCameraActive(false)}
                className="w-full max-w-[15rem] py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 shrink-0"
              >
                Cerrar cámara
              </button>
            </div>
          )}
        </div>

        {/* Right Card: Marcaciones del día */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex flex-col gap-1 mb-5">
              <h2 className="text-base font-bold text-slate-800">Marcaciones del día</h2>
              {kioskSession?.nombreEmpleado && (
                <p className="text-xs font-bold text-blue-600 truncate uppercase">
                  Colaborador: {kioskSession.nombreEmpleado}
                </p>
              )}
            </div>

            <div className="space-y-3.5">
              {[
                { label: 'Entrada', type: 'ENTRADA' },
                { label: 'Salida almuerzo', type: 'INICIO_ALMUERZO' },
                { label: 'Regreso almuerzo', type: 'FIN_ALMUERZO' },
                { label: 'Salida', type: 'SALIDA' },
                { label: 'Horas extras', type: 'FIN_HORAS_EXTRA' }
              ].map((slot) => {
                const mark = kioskSession?.marcaciones?.find(m => m.tipo === slot.type);
                const isRegistered = !!mark;
                const timeVal = mark?.fechaHora 
                  ? new Date(mark.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                
                return (
                  <div key={slot.type} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-none">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isRegistered ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-sm font-semibold text-slate-700 truncate">{slot.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-600">{timeVal}</span>
                      {isRegistered ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          Registrado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100/80">
            <p className="text-[10px] text-slate-400 font-medium">
              ℹ️ Los registros se realizan en la fecha y hora actual.
            </p>
          </div>
        </div>
      </div>



      {/* Recent Logs Table */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4">
          {currentUser?.nombre ? `Mis registros recientes (${currentUser.nombre.split(' ')[0]})` : 'Registros recientes (Hoy)'}
        </h2>
        {recentRegistros.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            {currentUser?.nombre ? 'No tienes marcaciones registradas el día de hoy.' : 'No hay marcaciones registradas el día de hoy.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Colaborador</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3 text-center">Tipo</th>
                  <th className="py-2.5 px-3 text-center">Hora</th>
                  <th className="py-2.5 px-3 text-center">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentRegistros.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-700 normal-case">{reg.nombreEmpleado}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-medium">
                      {new Date(reg.fechaHora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block font-extrabold px-2 py-0.5 rounded text-[9px] uppercase ${
                        reg.tipo === 'ENTRADA' ? 'text-emerald-700 bg-emerald-50' :
                        reg.tipo === 'INICIO_ALMUERZO' ? 'text-amber-700 bg-amber-50' :
                        reg.tipo === 'FIN_ALMUERZO' ? 'text-blue-700 bg-blue-50' :
                        'text-purple-700 bg-purple-50'
                      }`}>
                        {reg.tipo.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                      {new Date(reg.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      {reg.ubicacionLat && reg.ubicacionLng ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${reg.ubicacionLat},${reg.ubicacionLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                          title="Ver en Google Maps"
                        >
                          <span className="text-rose-500">📍</span> {reg.ubicacionLat.toFixed(5)}, {reg.ubicacionLng.toFixed(5)}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-medium">Sin GPS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Success / Error / Picker Overlays */}
      {(lastScan || scanError || pendingScan) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-[100] animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            {scanError ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
                  <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-700">Error de marcación</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{scanError}</p>
                </div>
                <button
                  onClick={() => { setScanError(null); setIsCameraActive(true); }}
                  className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Entendido
                </button>
              </div>
            ) : pendingScan ? (
              <MarcacionPickerModal
                empleadoId={pendingScan.empleadoId}
                nombreEmpleado={pendingScan.nombreEmpleado}
                marcaciones={pendingScan.marcaciones}
                opciones={pendingScan.opciones}
                loading={isProcessingScan}
                horaSalidaConfig={horarioHoy?.diaConfig?.salida ?? null}
                onSelect={(tipo) => ejecutarRegistroKiosk(pendingScan.empleadoId, tipo)}
                onCancel={() => { setPendingScan(null); setIsCameraActive(true); }}
              />
            ) : (
              <div className="space-y-5 w-full flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div className="space-y-1 text-center">
                  <h3 className="text-xl font-black text-slate-800">¡Hola, {lastScan.nombreEmpleado}!</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {lastScan.empleadoId}</p>
                </div>
                <div className="py-2 px-5 rounded-2xl bg-emerald-50 border border-emerald-100 inline-block text-center">
                  <p className="text-sm font-extrabold text-emerald-800 uppercase tracking-wide">
                    {lastScan.label} Registrada
                  </p>
                  <p className="text-[10px] font-mono text-emerald-600 mt-0.5">
                    Hora: {new Date(lastScan.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>

                {lastScan.tipo === 'INICIO_ALMUERZO' && (
                  <div className="py-3 px-5 rounded-2xl bg-amber-50 border border-amber-100 text-center shadow-xs animate-bounce max-w-[280px]">
                    <p className="text-xs font-black text-amber-800">
                      Debes regresar a las {getExpectedReturnTime(lastScan.fechaHora)}
                    </p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                      Tu tiempo de almuerzo autorizado ha comenzado.
                    </p>
                  </div>
                )}
                <div className="w-full">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Marcaciones del día</p>
                  <MarcacionesTimeline marcaciones={lastScan.marcaciones} highlightTipo={lastScan.tipo} compact theme="light" />
                </div>
                {(lastScan.lapsos?.trabajo !== '—' || lastScan.lapsos?.almuerzo !== '—') && (
                  <div className="flex gap-2 justify-center text-[10px] flex-wrap w-full">
                    {lastScan.lapsos.trabajo !== '—' && (
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                        Trabajo: <span className="font-extrabold text-slate-800">{lastScan.lapsos.trabajo}</span>
                      </span>
                    )}
                    {lastScan.lapsos.almuerzo !== '—' && (
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                        Almuerzo: <span className="font-extrabold text-slate-800">{lastScan.lapsos.almuerzo}</span>
                      </span>
                    )}
                  </div>
                )}
                {lastScan.horasExtra && (
                  <div className="w-full px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-100 text-center">
                    <p className="text-purple-700 text-[10px] font-bold uppercase tracking-wide">Horas extras registradas</p>
                    <p className="text-purple-900 font-black text-sm mt-0.5">{lastScan.horasExtra.horas} h</p>
                    <p className="text-purple-600 text-[9px] mt-0.5">{lastScan.horasExtra.detalleHorario}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const RegistrosPage = () => {
  const userStr = localStorage.getItem('user');
  const userObj = userStr ? normalizeUserForSession(JSON.parse(userStr)) : null;
  
  const queryParams = new URLSearchParams(window.location.search);
  const forceKiosk = queryParams.get('kiosk') === 'true' || queryParams.get('vista') === 'kiosk';
  const isKioskMode = isAsistenciaUser(userObj) || forceKiosk;

  if (isKioskMode) {
    return <KioskView />;
  }

  return <AdminView />;
};

const buildAsistenciaRowMeta = (marcaciones, estado) => {
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
  if (isAsistio) lapsos = calculateLapses(marcaciones);
  return { entrada, inicioAlm, finAlm, salida, isFalto, isPermiso, isAsistio, mapsUrl, lapsos };
};

const EstadoAsistenciaBadge = ({ estado }) => {
  if (estado === 'ASISTIO') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-xl shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Asistió
      </span>
    );
  }
  if (estado === 'FALTO') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-700 bg-red-50 border border-red-200/60 px-2.5 py-1 rounded-xl shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Faltó
      </span>
    );
  }
  if (estado === 'PERMISO') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-xl shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        Permiso Pagado
      </span>
    );
  }
  return null;
};

const AlmuerzoStatusBadge = ({ almuerzo }) => {
  if (almuerzo?.status === 'SIN_DATOS') {
    return <span className="text-slate-300 text-xs">—</span>;
  }
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold border ${
      almuerzo.cls === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
      almuerzo.cls === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
      almuerzo.cls === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200' :
      almuerzo.cls === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
      'bg-slate-50 text-slate-500 border-slate-200'
    }`}>
      {almuerzo.label}
    </span>
  );
};

const TotalHorasDisplay = ({ isAsistio, isPermiso, lapsos }) => {
  if (isAsistio) {
    return (
      <div className="flex flex-col items-center">
        <span className="font-bold text-slate-800 text-xs">{lapsos.trabajo}</span>
        {lapsos.almuerzo !== '—' && (
          <span className="text-[9px] text-slate-400 font-medium mt-0.5">Alm: {lapsos.almuerzo}</span>
        )}
      </div>
    );
  }
  if (isPermiso) return <span className="text-indigo-600 font-bold text-xs">Día Cobrado</span>;
  return <span className="text-slate-300 text-xs">—</span>;
};

const AsistenciaAcciones = ({ isPermiso, onConcederPermiso, onCancelarPermiso }) => {
  if (isPermiso) {
    return (
      <button
        type="button"
        onClick={onCancelarPermiso}
        className="w-full sm:w-auto px-3 py-1.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow transition-all shrink-0 cursor-pointer border-none"
      >
        Cancelar Permiso
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onConcederPermiso}
      className="w-full sm:w-auto px-3 py-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all shrink-0 cursor-pointer border-none"
    >
      Conceder Permiso
    </button>
  );
};

const AsistenciaColaboradorCard = ({ emp, marcaciones, estado, almuerzo, horarioDia, onConcederPermiso, onCancelarPermiso }) => {
  const { entrada, inicioAlm, finAlm, salida, isFalto, isPermiso, isAsistio, mapsUrl, lapsos } =
    buildAsistenciaRowMeta(marcaciones, estado);

  const marcacionFields = [
    { label: 'Entrada', marcacion: entrada, esperado: horarioDia.ENTRADA },
    { label: 'Sal. almuerzo', marcacion: inicioAlm, esperado: horarioDia.INICIO_ALMUERZO, omitidoEsperado: !horarioDia.INICIO_ALMUERZO },
    { label: 'Reg. almuerzo', marcacion: finAlm, esperado: horarioDia.FIN_ALMUERZO, omitidoEsperado: !horarioDia.FIN_ALMUERZO },
    { label: 'Salida', marcacion: salida, esperado: horarioDia.SALIDA },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <PersonInitialsAvatar name={emp.nombre} seed={emp.id} size="sm" image={emp.foto} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 leading-snug normal-case">{emp.nombre}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {emp.id} • {emp.cargo || 'General'}</p>
          </div>
        </div>
        <EstadoAsistenciaBadge estado={estado} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
        {marcacionFields.map(({ label, marcacion, esperado, omitidoEsperado }) => (
          <div key={label} className="bg-slate-50/80 rounded-lg px-2 py-2 text-center min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1 truncate">{label}</p>
            <MarcacionHorarioCell marcacion={marcacion} esperado={esperado} omitidoEsperado={omitidoEsperado} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Almuerzo</p>
          <div className="mt-1">
            <AlmuerzoStatusBadge almuerzo={almuerzo} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total horas</p>
          <div className="mt-1">
            <TotalHorasDisplay isAsistio={isAsistio} isPermiso={isPermiso} lapsos={lapsos} />
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100">
        <AsistenciaAcciones
          isFalto={isFalto}
          isPermiso={isPermiso}
          onConcederPermiso={onConcederPermiso}
          onCancelarPermiso={onCancelarPermiso}
        />
      </div>
    </div>
  );
};

const AdminView = () => {
  const [fechaFiltro, setFechaFiltro] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [asistencias, setAsistencias] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [horariosConfig, setHorariosConfig] = useState(DEFAULT_HORARIOS_CONFIG);

  const horarioDia = useMemo(() => getHorarioEsperado(fechaFiltro, horariosConfig), [fechaFiltro, horariosConfig]);
  const horarioLabel = useMemo(() => getHorarioLabel(fechaFiltro, horariosConfig), [fechaFiltro, horariosConfig]);

  useEffect(() => {
    getHorarioConfig()
      .then((cfg) => setHorariosConfig(normalizeHorariosConfig(cfg)))
      .catch((err) => console.error('Error cargando horarios', err));
  }, []);

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

  const handleCancelarPermiso = async (empleadoId) => {
    try {
      await eliminarPermiso({ empleadoId, fecha: fechaFiltro });
      toast.success('Permiso pagado cancelado con éxito');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error al cancelar el permiso');
    }
  };

  const requestConcederPermiso = async (empleadoId, nombreEmpleado) => {
    const confirmed = await confirmDialog(
      'Conceder Permiso Pagado',
      `¿Estás seguro de que deseas conceder un permiso pagado para ${nombreEmpleado} en la fecha ${fechaFiltro}? Esto registrará el día como laborado.`,
      { confirmLabel: 'Sí, continuar', cancelLabel: 'No, cancelar', type: 'primary' }
    );
    if (confirmed) {
      handleConcederPermiso(empleadoId);
    }
  };

  const requestCancelarPermiso = async (empleadoId, nombreEmpleado) => {
    const confirmed = await confirmDialog(
      'Cancelar Permiso Pagado',
      `¿Estás seguro de que deseas revocar el permiso pagado para ${nombreEmpleado} el día ${fechaFiltro}? El registro volverá a estar pendiente o ausente.`,
      { confirmLabel: 'Sí, continuar', cancelLabel: 'No, cancelar', type: 'primary' }
    );
    if (confirmed) {
      handleCancelarPermiso(empleadoId);
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
        estado,
        almuerzo: getEstadoAlmuerzo(marcaciones, fechaFiltro, horariosConfig, emp.tipoContrato),
      };
    });
  }, [empleados, asistencias, fechaFiltro, horariosConfig]);

  const rowsFiltrados = useMemo(() => {
    return rows.filter(r => {
      const matchBusqueda = busqueda.trim() === '' || 
        r.emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.emp.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        (r.emp.cargo && r.emp.cargo.toLowerCase().includes(busqueda.toLowerCase()));
      
      const matchEstado = filtroEstado === 'TODOS'
        || r.estado === filtroEstado
        || (filtroEstado === 'SIN_ALMUERZO' && r.almuerzo?.status === 'OMITIDO');
      
      return matchBusqueda && matchEstado;
    });
  }, [rows, busqueda, filtroEstado]);

  const kpis = useMemo(() => {
    const total = empleados.length;
    const asistieron = rows.filter(r => r.estado === 'ASISTIO').length;
    const faltaron = rows.filter(r => r.estado === 'FALTO').length;
    const permisos = rows.filter(r => r.estado === 'PERMISO').length;
    const sinAlmuerzo = rows.filter(r => r.almuerzo?.status === 'OMITIDO').length;
    return { total, asistieron, faltaron, permisos, sinAlmuerzo };
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

    html += `<tr><td colspan="10" class="title">REPORTE DIARIO DE ASISTENCIA - ${fechaFiltro}</td></tr>`;
    html += `<tr><td colspan="10">${horarioLabel}</td></tr>`;
    html += '<tr><td colspan="10" style="height:6px;border:none"></td></tr>';
    html += '<tr><th>Empleado</th><th>ID</th><th>Cargo</th><th>Estado</th><th>Entrada</th><th>Sal. Almuerzo</th><th>Reg. Almuerzo</th><th>Salida</th><th>Almuerzo</th><th>Total Horas</th></tr>';

    rows.forEach(r => {
      const e = r.marcaciones.find(a=>a.tipo==='ENTRADA');
      const ia = r.marcaciones.find(a=>a.tipo==='INICIO_ALMUERZO');
      const fa = r.marcaciones.find(a=>a.tipo==='FIN_ALMUERZO');
      const s = r.marcaciones.find(a=>a.tipo==='SALIDA');
      const lapsos = r.estado === 'ASISTIO' ? calculateLapses(r.marcaciones) : { trabajo: '', almuerzo: '' };
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
        ${cell(ia ? new Date(ia.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
        ${cell(fa ? new Date(fa.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
        ${cell(s ? new Date(s.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
        ${cell(r.almuerzo?.label ?? '')}
        ${cell(lapsos.trabajo || (r.estado === 'PERMISO' ? 'Día Cobrado' : ''))}
      </tr>`;
    });

    html += '</table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `asistencia-${fechaFiltro}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
  };



  return (
    <div className="space-y-4 sm:space-y-6 animate-slide-up w-full" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
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
      <div className="bg-white border border-slate-200 rounded-xl px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">Control de Asistencia Diario</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                Activo
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Supervisión diaria, control de ausencias y asignación de permisos.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
      <div className="flex flex-wrap lg:flex-nowrap gap-3">
        {[
          { label: 'Colaboradores', value: kpis.total, cssClass: 'total', color: 'text-blue-600' },
          { label: 'Asistencias', value: kpis.asistieron, cssClass: 'asistencias', color: 'text-emerald-600' },
          { label: 'Faltas', value: kpis.faltaron, cssClass: 'faltas', color: 'text-red-600' },
          { label: 'Permisos', value: kpis.permisos, cssClass: 'permisos', color: 'text-indigo-600' },
          { label: 'Sin almuerzo', value: kpis.sinAlmuerzo, cssClass: 'faltas', color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className={`flex-1 min-w-[120px] bg-white shadow-card kpi-card ${s.cssClass} rounded-xl p-3 border border-gray-100`}>
            <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{s.label}</p>
            <p className={`text-lg sm:text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Selector de Semana / Fecha */}
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
          {/* Controles de semana */}
          <div className="flex items-center justify-between gap-2 lg:justify-start lg:shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevWeek}
                className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                title="Semana anterior"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>

              <button
                onClick={() => setFechaFiltro(new Date().toISOString().split('T')[0])}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
              >
                Hoy
              </button>

              <button
                onClick={handleNextWeek}
                className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
                title="Semana siguiente"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              <span className="text-[11px] font-semibold text-slate-500 ml-1 hidden sm:inline whitespace-nowrap">
                {weekDays[0] && formatFecha(weekDays[0])} – {weekDays[6] && formatFecha(weekDays[6])}
              </span>
            </div>

            <div className="flex items-center gap-1.5 lg:hidden">
              <label htmlFor="fecha-filtro-mobile" className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fecha</label>
              <input
                id="fecha-filtro-mobile"
                type="date"
                value={fechaFiltro}
                onChange={e => setFechaFiltro(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all bg-white cursor-pointer"
              />
            </div>
          </div>

          {/* Días de la semana */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1 lg:justify-center min-w-0">
            {weekDays.map((d, i) => {
              const iso = toISODate(d);
              const isSelected = iso === fechaFiltro;
              const isToday = iso === new Date().toISOString().split('T')[0];

              return (
                <button
                  key={i}
                  onClick={() => setFechaFiltro(iso)}
                  className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all min-w-[44px] shrink-0 border cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : isToday
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`uppercase tracking-wide leading-none ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {DIAS_LABEL[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                  </span>
                  <span className="text-sm font-black mt-0.5 leading-none">
                    {d.getDate()}
                  </span>
                  {isToday && (
                    <span className={`text-[6px] font-bold mt-0.5 leading-none ${isSelected ? 'text-slate-300' : 'text-blue-500'}`}>
                      hoy
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selector de fecha (escritorio) */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <label htmlFor="fecha-filtro-desktop" className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Ir a fecha</label>
            <input
              id="fecha-filtro-desktop"
              type="date"
              value={fechaFiltro}
              onChange={e => setFechaFiltro(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all bg-white cursor-pointer"
            />
          </div>
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

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 sm:flex-wrap sm:overflow-visible">
          {[
            { key: 'TODOS', label: 'Todos' },
            { key: 'ASISTIO', label: 'Asistieron' },
            { key: 'FALTO', label: 'Faltaron' },
            { key: 'PERMISO', label: 'Permisos' },
            { key: 'SIN_ALMUERZO', label: 'Sin almuerzo' },
          ].map(t => (
            <button key={t.key} onClick={() => setFiltroEstado(t.key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
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
        <>
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left">
                    <th className="px-6 py-4" rowSpan={2}>Colaborador / Cargo</th>
                    <th className="px-6 py-4 text-center" rowSpan={2}>Estado</th>
                    <th className="px-4 py-3 text-center border-l border-slate-200/80" colSpan={4}>Marcaciones por horario</th>
                    <th className="px-4 py-4 text-center" rowSpan={2}>Almuerzo</th>
                    <th className="px-6 py-4 text-center" rowSpan={2}>Total Horas</th>
                    <th className="px-6 py-4 text-right" rowSpan={2}>Acción</th>
                  </tr>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    <th className="px-4 py-2 border-l border-slate-200/80">
                      Entrada
                      {horarioDia.ENTRADA && <div className="text-[9px] font-mono text-blue-500 normal-case mt-0.5">ref. {horarioDia.ENTRADA.label}</div>}
                    </th>
                    <th className="px-4 py-2">
                      Sal. Almuerzo
                      {horarioDia.INICIO_ALMUERZO
                        ? <div className="text-[9px] font-mono text-blue-500 normal-case mt-0.5">ref. {horarioDia.INICIO_ALMUERZO.label}</div>
                        : <div className="text-[9px] text-slate-400 normal-case mt-0.5">opcional</div>}
                    </th>
                    <th className="px-4 py-2">
                      Reg. Almuerzo
                      {horarioDia.FIN_ALMUERZO
                        ? <div className="text-[9px] font-mono text-blue-500 normal-case mt-0.5">ref. {horarioDia.FIN_ALMUERZO.label}</div>
                        : <div className="text-[9px] text-slate-400 normal-case mt-0.5">opcional</div>}
                    </th>
                    <th className="px-4 py-2">
                      Salida
                      {horarioDia.SALIDA && <div className="text-[9px] font-mono text-blue-500 normal-case mt-0.5">ref. {horarioDia.SALIDA.label}</div>}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rowsFiltrados.map(({ emp, marcaciones, estado, almuerzo }) => {
                    const { entrada, inicioAlm, finAlm, salida, isFalto, isPermiso, isAsistio, mapsUrl, lapsos } =
                      buildAsistenciaRowMeta(marcaciones, estado);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <PersonInitialsAvatar name={emp.nombre} seed={emp.id} size="sm" image={emp.foto} />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate normal-case">{emp.nombre}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {emp.id} • {emp.cargo || 'General'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <EstadoAsistenciaBadge estado={estado} />
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center border-l border-slate-100">
                          <MarcacionHorarioCell marcacion={entrada} esperado={horarioDia.ENTRADA} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <MarcacionHorarioCell
                            marcacion={inicioAlm}
                            esperado={horarioDia.INICIO_ALMUERZO}
                            omitidoEsperado={!horarioDia.INICIO_ALMUERZO}
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <MarcacionHorarioCell
                            marcacion={finAlm}
                            esperado={horarioDia.FIN_ALMUERZO}
                            omitidoEsperado={!horarioDia.FIN_ALMUERZO}
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <MarcacionHorarioCell marcacion={salida} esperado={horarioDia.SALIDA} />
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <AlmuerzoStatusBadge almuerzo={almuerzo} />
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-semibold text-slate-600">
                          <TotalHorasDisplay isAsistio={isAsistio} isPermiso={isPermiso} lapsos={lapsos} />
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <AsistenciaAcciones
                            isFalto={isFalto}
                            isPermiso={isPermiso}
                            onConcederPermiso={() => requestConcederPermiso(emp.id, emp.nombre)}
                            onCancelarPermiso={() => requestCancelarPermiso(emp.id, emp.nombre)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {rowsFiltrados.map(({ emp, marcaciones, estado, almuerzo }) => (
              <AsistenciaColaboradorCard
                key={emp.id}
                emp={emp}
                marcaciones={marcaciones}
                estado={estado}
                almuerzo={almuerzo}
                horarioDia={horarioDia}
                onConcederPermiso={() => requestConcederPermiso(emp.id, emp.nombre)}
                onCancelarPermiso={() => requestCancelarPermiso(emp.id, emp.nombre)}
              />
            ))}
          </div>
        </>
      )}

    </div>
  );
};
