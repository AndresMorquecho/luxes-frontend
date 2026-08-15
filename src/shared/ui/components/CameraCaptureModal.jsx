import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { ModalPortal, deferClose } from './ModalPortal.jsx';

export function CameraCaptureModal({ isOpen, onClose, onCapture, title = 'Tomar foto' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setError(null);
      setFacingMode('environment');
      return undefined;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador o dispositivo no permite acceso directo a la cámara. Usa la opción "Galería / Archivos".');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const startCamera = async () => {
      try {
        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setError(null);
      } catch (err) {
        if (facingMode === 'environment') {
          // Fallback a cámara frontal/user si environment falla (ej. en laptops y computadoras de escritorio)
          setFacingMode('user');
          return;
        }
        setError(
          err?.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador para continuar.'
            : 'No se pudo acceder a la cámara. Asegúrate de que no esté en uso por otra aplicación o usa "Galería / Archivos".',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode]);

  const handleClose = () => {
    stopStream();
    if (deferClose) {
      deferClose(onClose);
    } else {
      onClose();
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    const maxSide = 1600;
    let { videoWidth: w, videoHeight: h } = video;

    if (w > h && w > maxSide) {
      h = Math.round((h * maxSide) / w);
      w = maxSide;
    } else if (h > maxSide) {
      w = Math.round((w * maxSide) / h);
      h = maxSide;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `control-foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopStream();
        onCapture(file);
        handleClose();
      },
      'image/jpeg',
      0.88,
    );
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <ModalPortal open={isOpen}>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
        <div
          className="relative w-full max-w-md bg-slate-900 text-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700/60 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Camera size={16} />
              </div>
              <h3 className="font-bold text-sm text-slate-100">{title}</h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Viewfinder Frame */}
          <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
            {flash && (
              <div className="absolute inset-0 bg-white z-30 transition-opacity duration-150 animate-fadeOut" />
            )}

            {loading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-slate-300 text-xs z-10 bg-black/60">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" />
                <span className="font-medium">Iniciando visor de cámara...</span>
              </div>
            )}

            {error ? (
              <div className="flex flex-col items-center justify-center p-6 text-center z-10 max-w-xs">
                <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                  <AlertCircle size={20} />
                </div>
                <p className="text-xs text-red-200 font-medium mb-4 leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                >
                  Entendido / Cerrar
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Controls Bottom Bar */}
          {!error && (
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-t border-slate-800">
              {/* Botón Voltear Cámara */}
              <button
                type="button"
                onClick={toggleCamera}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 cursor-pointer active:scale-95 disabled:opacity-50"
                title="Voltear / Cambiar cámara"
              >
                <RefreshCw size={15} />
                <span className="hidden sm:inline">Voltear</span>
              </button>

              {/* Botón Disparador / Capturar Foto */}
              <button
                type="button"
                onClick={handleCapture}
                disabled={loading}
                className="relative w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer disabled:opacity-50 group border-4 border-slate-700"
                title="Tomar Foto"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 group-hover:bg-blue-500 transition-colors flex items-center justify-center text-white shadow-inner">
                  <Camera size={22} />
                </div>
              </button>

              {/* Botón Cancelar */}
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
