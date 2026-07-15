import React, { useState, useEffect } from 'react';
import { ModalPortal, deferClose, useModalVisibility } from '../../../../shared/ui/components/ModalPortal.jsx';
import { Scanner } from '@yudiel/react-qr-scanner';
import { registrarAsistencia, getProximaMarcacion, getTodayMarcaciones } from '../../application/asistenciaService';
import { isDiaLaboralCompleto } from '../../helpers/asistenciaHelpers';
import { StepIndicator } from './scanner/StepIndicator';
import { MarcacionesTimeline } from './MarcacionesTimeline';
import { useGeolocation, getGpsBadgeProps } from '../../../../shared/hooks/useGeolocation';

const STEP_COLORS = {
  ENTRADA:         { ring: 'ring-blue-400' },
  INICIO_ALMUERZO: { ring: 'ring-amber-400' },
  FIN_ALMUERZO:    { ring: 'ring-blue-400' },
  SALIDA:          { ring: 'ring-indigo-400' },
};

export const ScannerModal = ({ isOpen, onClose, onSuccess }) => {
  const { error: ubicacionError, status: gpsStatus, secure: gpsSecure, resolveUbicacion } = useGeolocation();
  const gpsBadge = getGpsBadgeProps({ status: gpsStatus, error: ubicacionError, secure: gpsSecure });
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [proximaInfo, setProximaInfo] = useState(null);
  const [marcacionesHoy, setMarcacionesHoy] = useState([]);
  const [pendingScan, setPendingScan] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setMessage(null);
      setIsProcessing(false);
      setProximaInfo(null);
      setMarcacionesHoy([]);
      setPendingScan(null);
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
      setMessage({ type: 'error', text: error.message || 'Error al registrar.' });
      setTimeout(() => {
        setIsProcessing(false);
        setMessage(null);
      }, 3000);
      setIsProcessing(false);
    }
  };

  const tipoActivo = proximaInfo?.proxima?.tipo ?? pendingScan?.proxima?.proxima?.tipo ?? 'ENTRADA';
  const colActivo = STEP_COLORS[tipoActivo] ?? STEP_COLORS.ENTRADA;
  const marcacionesCount = proximaInfo?.marcacionesRegistradas ?? marcacionesHoy.filter((m) =>
    ['ENTRADA', 'INICIO_ALMUERZO', 'FIN_ALMUERZO', 'SALIDA'].includes(m.tipo)
  ).length;

  const visible = useModalVisibility(isOpen);

  if (!visible) return null;

  const handleClose = () => deferClose(() => onClose?.());

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-[90vw] sm:max-w-sm md:max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 animate-modal-in max-h-[95vh] overflow-y-auto border border-gray-100">

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-4 sm:mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
              </svg>
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-900">Escanear QR</h2>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium">Apunta al código QR de tu credencial</p>
        </div>

        <StepIndicator proximaTipo={tipoActivo} marcaciones={marcacionesHoy} />

        {marcacionesHoy.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Marcaciones de hoy</p>
            <MarcacionesTimeline marcaciones={marcacionesHoy} highlightTipo={message?.tipo} theme="light" compact />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-5 sm:mb-6">
          <span className="text-[10px] sm:text-xs font-semibold text-gray-400">{marcacionesCount}/4 marcaciones</span>
          <span className="w-1 h-1 rounded-full bg-gray-300" />
          <span className={`text-[10px] sm:text-xs font-bold ${proximaInfo?.proxima || pendingScan ? 'text-blue-600' : 'text-gray-400'}`}>
            {pendingScan
              ? 'Elige tipo de marcación'
              : proximaInfo?.proxima
                ? `Siguiente: ${proximaInfo.proxima.label}`
                : proximaInfo?.completado
                  ? 'Completado'
                  : 'Listo para escanear'}
          </span>
          {(gpsBadge.tone === 'amber' || gpsBadge.tone === 'slate') && gpsStatus !== 'ready' && gpsStatus !== 'cached' && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className={`text-[10px] sm:text-xs font-semibold ${gpsBadge.tone === 'amber' ? 'text-amber-600' : 'text-gray-400'}`}>
                {gpsBadge.text}
              </span>
            </>
          )}
        </div>

        {pendingScan ? (
          <div className="space-y-3 mb-4">
            <p className="text-xs text-center text-gray-600 font-medium">
              ¿Qué deseas registrar para <span className="font-bold">{pendingScan.empleadoId}</span>?
            </p>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => ejecutarRegistro(pendingScan.empleadoId, false)}
              className="w-full py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-sm hover:bg-amber-100 transition-colors"
            >
              Inicio almuerzo
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => ejecutarRegistro(pendingScan.empleadoId, true)}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors"
            >
              Salida sin almuerzo / horas extras
            </button>
            <button
              type="button"
              onClick={() => setPendingScan(null)}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div
            className={`relative rounded-xl sm:rounded-2xl overflow-hidden ring-2 ${colActivo.ring} ring-offset-2 bg-black w-full mx-auto shadow-lg`}
            style={{ minHeight: '260px', maxHeight: '50vh' }}
          >
            {isProcessing && (
              <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-2 border-white/20 border-t-white" />
                <p className="text-xs sm:text-sm font-semibold text-white mt-3">Procesando...</p>
              </div>
            )}

            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 w-5 h-5 sm:w-7 sm:h-7 border-t-2 border-l-2 border-white/70 rounded-tl-md" />
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-7 sm:h-7 border-t-2 border-r-2 border-white/70 rounded-tr-md" />
              <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-5 h-5 sm:w-7 sm:h-7 border-b-2 border-l-2 border-white/70 rounded-bl-md" />
              <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-5 h-5 sm:w-7 sm:h-7 border-b-2 border-r-2 border-white/70 rounded-br-md" />
            </div>

            <div className="absolute left-2 right-2 sm:left-3 sm:right-3 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent z-10 animate-scan pointer-events-none opacity-80" />

            <div className="w-full h-full" style={{ minHeight: '260px' }}>
              <Scanner
                onScan={handleScan}
                onError={(err) => console.error('Error en Scanner', err)}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%', height: '260px', minHeight: '260px', paddingTop: 0, margin: 0 },
                  video: { width: '100%', height: '100%', objectFit: 'cover' },
                }}
              />
            </div>
          </div>
        )}

        {message && (
          <div className={`mt-4 sm:mt-5 px-4 py-3 rounded-xl sm:rounded-2xl flex items-center gap-3 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              message.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {message.type === 'success' ? (
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold truncate">{message.type === 'success' ? 'Registrado exitosamente' : 'Error'}</p>
              <p className="text-[10px] sm:text-xs mt-0.5 opacity-80 truncate">{message.text}</p>
            </div>
          </div>
        )}

        <p className="text-center text-[9px] sm:text-[10px] mt-4 sm:mt-5 font-medium text-gray-300">Escanea el código QR de tu credencial</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 8%; }
          50% { top: 88%; }
        }
        .animate-scan { animation: scan 2.2s ease-in-out infinite; }
        @keyframes modal-in {
          from { transform: scale(0.95) translateY(8px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-in { animation: modal-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}} />
    </div>
    </ModalPortal>
  );
};
