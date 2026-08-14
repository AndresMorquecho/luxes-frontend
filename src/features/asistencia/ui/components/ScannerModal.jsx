import React, { useState, useEffect } from 'react';
import { ModalPortal, deferClose, useModalVisibility } from '../../../../shared/ui/components/ModalPortal.jsx';
import { Scanner } from '@yudiel/react-qr-scanner';
import { registrarAsistencia, getProximaMarcacion, getTodayMarcaciones } from '../../application/asistenciaService';
import { isDiaLaboralCompleto } from '../../helpers/asistenciaHelpers';
import { StepIndicator } from './scanner/StepIndicator';
import { MarcacionesTimeline } from './MarcacionesTimeline';
import { useGeolocation, getGpsBadgeProps } from '../../../../shared/hooks/useGeolocation';
import { checkBiometricSupport, requestBiometricScan } from '../../helpers/biometricHelper';
import { getEmpleados } from '../../../empleados/application/empleadosService';
import { Fingerprint, QrCode, ShieldCheck } from 'lucide-react';

const STEP_COLORS = {
  ENTRADA:         { ring: 'ring-blue-400' },
  INICIO_ALMUERZO: { ring: 'ring-amber-400' },
  FIN_ALMUERZO:    { ring: 'ring-blue-400' },
  SALIDA:          { ring: 'ring-indigo-400' },
};

export const ScannerModal = ({ isOpen, onClose, onSuccess }) => {
  const { error: ubicacionError, status: gpsStatus, secure: gpsSecure, resolveUbicacion } = useGeolocation();
  const gpsBadge = getGpsBadgeProps({ status: gpsStatus, error: ubicacionError, secure: gpsSecure });
  
  const [modo, setModo] = useState('BIOMETRICO'); // 'BIOMETRICO' | 'QR'
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [proximaInfo, setProximaInfo] = useState(null);
  const [marcacionesHoy, setMarcacionesHoy] = useState([]);
  const [pendingScan, setPendingScan] = useState(null);

  // Lista de empleados para marcación por huella
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setMessage(null);
      setIsProcessing(false);
      setProximaInfo(null);
      setMarcacionesHoy([]);
      setPendingScan(null);
    } else {
      checkBiometricSupport().then(supported => setBiometricSupported(supported));
      getEmpleados().then(list => {
        const empList = Array.isArray(list) ? list : list?.data || [];
        setEmpleados(empList);
        if (empList.length > 0 && !selectedEmpleadoId) {
          setSelectedEmpleadoId(empList[0].id);
        }
      }).catch(err => console.error(err));
    }
  }, [isOpen]);

  const ejecutarRegistro = async (empleadoId, omitirAlmuerzo = false) => {
    setIsProcessing(true);
    try {
      const ubicacionFinal = await resolveUbicacion();
      if (!ubicacionFinal) {
        throw new Error('La ubicación (GPS) es obligatoria para registrar la asistencia. Por favor, activa los permisos de ubicación en tu navegador y vuelve a intentarlo.');
      }
      const registro = await registrarAsistencia({ empleadoId, ubicacion: ubicacionFinal, omitirAlmuerzo });
      const marcaciones = await getTodayMarcaciones(empleadoId);
      const proxima = await getProximaMarcacion(empleadoId);

      setMarcacionesHoy(marcaciones);
      setProximaInfo(proxima);
      setPendingScan(null);
      setMessage({ type: 'success', text: `${registro.label} registrado — ${empleadoId}`, tipo: registro.tipo });

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al registrar.' });
      setPendingScan(null);
      setTimeout(() => {
        setIsProcessing(false);
        setMessage(null);
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScan = async (result) => {
    if (!result || result.length === 0 || isProcessing || pendingScan) return;

    const empleadoId = result[0].rawValue.trim();
    await procesarIdentificacionEmpleado(empleadoId);
  };

  const procesarIdentificacionEmpleado = async (empleadoId) => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const [marcaciones, proxima] = await Promise.all([
        getTodayMarcaciones(empleadoId),
        getProximaMarcacion(empleadoId),
      ]);

      setMarcacionesHoy(marcaciones);
      setProximaInfo(proxima);

      if (proxima.completado || isDiaLaboralCompleto(marcaciones)) {
        throw new Error('El colaborador ya completó las marcaciones del día.');
      }

      if (proxima.permiteOmitirAlmuerzo) {
        const hora = new Date().getHours();
        if (hora >= 14) {
          await ejecutarRegistro(empleadoId, false);
          return;
        }
        setPendingScan({ empleadoId, proxima });
        setIsProcessing(false);
        return;
      }

      await ejecutarRegistro(empleadoId, false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al validar empleado.' });
      setTimeout(() => {
        setIsProcessing(false);
        setMessage(null);
      }, 3000);
    }
  };

  // Marcación Biométrica por Huella
  const handleMarcacionBiometrica = async () => {
    if (!selectedEmpleadoId) {
      setMessage({ type: 'error', text: 'Por favor selecciona un colaborador.' });
      return;
    }

    const empObj = empleados.find(e => e.id === selectedEmpleadoId);
    setIsProcessing(true);
    setMessage(null);

    try {
      const res = await requestBiometricScan(empObj);
      if (res.success) {
        setMessage({ type: 'success', text: '👆 Huella biométrica verificada correctamente.' });
        await procesarIdentificacionEmpleado(selectedEmpleadoId);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error en la verificación de huella dactilar.' });
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
          
          {/* Encabezado y selector de Modo */}
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Marcación de Asistencia
              </h2>
              <p className="text-xs text-slate-500">
                Registro seguro con biometría o escáner QR
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          {/* Selector Tabs: Biometrico vs QR */}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setModo('BIOMETRICO')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                modo === 'BIOMETRICO'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fingerprint size={16} />
              Huella Dactilar / Biometría
            </button>

            <button
              type="button"
              onClick={() => setModo('QR')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                modo === 'QR'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode size={16} />
              Escáner Código QR
            </button>
          </div>

          {/* MODO BIOMÉTRICO */}
          {modo === 'BIOMETRICO' ? (
            <div className="space-y-4 text-center py-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block text-left mb-1.5">
                  Seleccionar Colaborador:
                </label>
                <select
                  className="co-input w-full text-xs font-semibold"
                  value={selectedEmpleadoId}
                  onChange={(e) => setSelectedEmpleadoId(e.target.value)}
                >
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} — {emp.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón de Huella Principal */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={handleMarcacionBiometrica}
                  disabled={isProcessing}
                  className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/30 flex flex-col items-center justify-center mx-auto transition-transform active:scale-95 group border-4 border-blue-100"
                >
                  <Fingerprint size={48} className="group-hover:scale-110 transition-transform animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase mt-1 tracking-wider">
                    Escanear Huella
                  </span>
                </button>
                <p className="text-[11px] text-slate-500 mt-3 font-medium">
                  Toca el botón para activar el sensor de huella de tu teléfono o computadora
                </p>
              </div>
            </div>
          ) : (
            /* MODO ES CÁNER QR */
            <div className="py-2">
              <div className="w-full aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-black relative">
                <Scanner
                  onScan={handleScan}
                  onError={(err) => console.error('Error en Scanner', err)}
                  constraints={{ facingMode: 'environment' }}
                />
              </div>
            </div>
          )}

          {/* Mensajes de Resultado */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-bold text-center ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
