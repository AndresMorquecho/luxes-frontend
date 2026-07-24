import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';

export function CameraCaptureModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [loading, setLoading] = useState(false);

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
      setError('Tu navegador no permite acceder a la cámara. Usa "Elegir de Galería".');
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
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
          setFacingMode('user');
          return;
        }
        setError(
          err?.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilítalo en el navegador e intenta de nuevo.'
            : 'No se pudo abrir la cámara. Usa "Elegir de Galería" como alternativa.',
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
    deferClose(onClose);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    const maxSide = 1280;
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
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `evidencia-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopStream();
        onCapture(file);
        deferClose(onClose);
      },
      'image/jpeg',
      0.85,
    );
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <ModalPortal open={isOpen}>
      <>
        <div
          className="fixed inset-0 z-[1100] bg-slate-200/60 backdrop-blur-md"
          onClick={handleClose}
        />
        <div className="fixed inset-0 z-[1101] flex items-center justify-center p-4 pointer-events-none">
          <div
            className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-600">
                  <Camera size={18} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800">Tomar foto de evidencia</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Captura para el cierre de obra</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-slate-900">
              {error ? (
                <div className="flex flex-col items-center justify-center min-h-[240px] text-center px-4">
                  <p className="text-sm text-rose-300 mb-3">{error}</p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 cursor-pointer border-0"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div className="relative aspect-[4/3] bg-slate-800 rounded-xl overflow-hidden">
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-white text-sm z-10">
                      Iniciando cámara...
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {!error && (
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer bg-white"
                  title="Cambiar cámara"
                >
                  <RefreshCw size={14} />
                  Voltear
                </button>
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold cursor-pointer border-0 transition-colors"
                >
                  Capturar foto
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    </ModalPortal>
  );
}
