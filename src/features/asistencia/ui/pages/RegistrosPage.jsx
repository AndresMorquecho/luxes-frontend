import React, { useEffect, useState, useMemo } from 'react';
import { getAsistencias, registrarAsistencia, getTodayMarcaciones, registrarPermiso } from '../../application/asistenciaService';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { Scanner } from '@yudiel/react-qr-scanner';
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [ubicacion, setUbicacion] = useState(null);
  const [ubicacionError, setUbicacionError] = useState(null);

  // Reloj digital para Quiosco
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Solicitar ubicación al montar y cuando se activa la cámara
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
  }, [isCameraActive]);

  const handleKioskScan = async (result) => {
    if (!result || result.length === 0 || isProcessingScan) return;
    const empleadoId = result[0].rawValue;
    setIsProcessingScan(true);
    setScanError(null);

    try {
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
      if (!ubicacionFinal) ubicacionFinal = { lat: -2.19616, lng: -79.88621 }; // Fallback predeterminado

      const registro = await registrarAsistencia({
        empleadoId: empleadoId.trim(),
        ubicacion: ubicacionFinal,
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

      // Cerrar la cámara tras escanear exitosamente
      setIsCameraActive(false);

      // Limpiar el aviso de confirmación automáticamente tras 4 segundos
      setTimeout(() => {
        setLastScan(null);
      }, 4000);

    } catch (err) {
      console.error(err);
      setScanError(err.message || 'Error al procesar el código QR.');
      setIsCameraActive(false);
      setTimeout(() => {
        setScanError(null);
      }, 4000);
    } finally {
      setIsProcessingScan(false);
    }
  };

  const toastDetails = lastScan ? getMarcacionToastDetails(lastScan.tipo) : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-70px)] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
          50% { border-color: rgba(59, 130, 246, 0.9); box-shadow: 0 0 30px rgba(59, 130, 246, 0.5); }
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
        .animate-pulse-glow {
          animation: pulseGlow 2s infinite ease-in-out;
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.3)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(59, 130, 246, 0.6)); }
        }
      `}</style>

      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col items-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        
        {/* Reloj y Fecha */}
        <div className="text-center flex flex-col items-center">
          <p className="text-6xl font-black text-white tracking-tight leading-none drop-shadow-md">
            {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs font-bold text-slate-400 mt-3.5 uppercase tracking-widest leading-relaxed">
            {currentTime.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          {ubicacionError ? (
            <span className="mt-3 px-2.5 py-1 text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/25 rounded-full inline-flex items-center gap-1 animate-pulse">
              ⚠️ Sin GPS: {ubicacionError}
            </span>
          ) : ubicacion ? (
            <span className="mt-3 px-2.5 py-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/25 rounded-full inline-flex items-center gap-1">
              📍 GPS Activo y Listo
            </span>
          ) : (
            <span className="mt-3 px-2.5 py-1 text-[9px] font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-full inline-flex items-center gap-1">
              ⌛ Buscando GPS...
            </span>
          )}
        </div>

        {/* Contenido Dinámico: Cámara o Pantalla de Espera */}
        {!isCameraActive ? (
          <div className="w-full flex flex-col items-center space-y-8 py-4 animate-fade-in">
            {/* Icono de Registro de Asistencia */}
            <div className="w-32 h-32 rounded-full bg-slate-950/50 border border-slate-800 flex items-center justify-center shadow-inner relative group">
              <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
              <svg className="w-16 h-16 text-blue-500 animate-pulse-glow drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.75 3.75 0 01-3.296-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.75 3.75 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0114 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.75 3.75 0 0121 12z" />
              </svg>
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-white">Marcar Asistencia</h2>
              <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">Presiona el botón de abajo para activar la cámara y escanear tu credencial QR.</p>
            </div>

            <button
              onClick={() => setIsCameraActive(true)}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
              Abrir Cámara para Escanear
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center space-y-5 animate-fade-in">
            <div className="w-full aspect-square rounded-2xl overflow-hidden relative border-2 bg-slate-950 flex flex-col items-center justify-center shadow-inner border-blue-500 pulse-border-active">
              {isProcessingScan && (
                <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white" />
                  <p className="text-xs font-semibold text-white mt-3">Procesando marcación...</p>
                </div>
              )}
              
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent z-40 scan-overlay-line opacity-95" />
              
              <div className="absolute inset-0 z-30 pointer-events-none p-4">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-md" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-md" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-md" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-md" />
              </div>

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
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Cerrar Cámara
            </button>
          </div>
        )}

        {(lastScan || scanError) && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-[100] animate-fade-in">
            {scanError ? (
              <div className="space-y-4">
                <div className="w-20 h-20 rounded-full bg-red-950/50 border border-red-500/50 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                  <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-red-500">Error de Registro</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">{scanError}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto shadow-lg ${toastDetails.iconBg}`}>
                  <svg className={`w-10 h-10 ${toastDetails.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white">¡Hola, {lastScan.nombreEmpleado}!</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">ID: {lastScan.empleadoId}</p>
                </div>
                <div className="py-2.5 px-6 rounded-2xl bg-slate-900 border border-slate-800/80 inline-block">
                  <p className={`text-base font-extrabold uppercase tracking-wider ${toastDetails.text}`}>
                    {toastDetails.label} Registrada
                  </p>
                  <p className="text-xs font-mono text-slate-400 mt-1 flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hora: {new Date(lastScan.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
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
    </div>
  );
};
