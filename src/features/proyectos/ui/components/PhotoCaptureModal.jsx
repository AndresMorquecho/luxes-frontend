// src/features/proyectos/ui/components/PhotoCaptureModal.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, CheckCircle2, User, Clock, AlertCircle, SwitchCamera } from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';

export function PhotoCaptureModal({
  isOpen,
  onClose,
  onUploadPhoto,
  currentUser,
}) {
  const [mode, setMode] = useState('select'); // 'select' | 'camera' | 'preview'
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  // Limpiar stream al cerrar o desmontar
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setMode('select');
      setCapturedBlob(null);
      setPreviewUrl(null);
      setCameraError('');
      setIsUploading(false);
    }
  }, [isOpen]);

  // Iniciar la cámara si el modo es 'camera'
  useEffect(() => {
    if (mode === 'camera' && isOpen) {
      startCamera();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [mode, facingMode]);

  const startCamera = async () => {
    stopStream();
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador o dispositivo no soporta acceso directo a la cámara.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Error accediendo a la cámara:', err);
      setCameraError(err.message || 'No se pudo acceder a la cámara.');
    }
  };

  // Capturar foto desde el video stream
  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const now = new Date();
          const timestamp = now.toISOString().replace(/[:.]/g, '-');
          const generatedName = `evidencia_${timestamp}.jpg`;
          const file = new File([blob], generatedName, { type: 'image/jpeg' });

          setCapturedBlob(file);
          setPreviewUrl(url);
          setFileName(generatedName);
          stopStream();
          setMode('preview');
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Manejar selección de archivo desde explorador
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCapturedBlob(file);
    setPreviewUrl(url);
    setFileName(file.name);
    setMode('preview');
  };

  // Alternar cámara frontal / trasera
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Confirmar y subir
  const handleConfirmUpload = async () => {
    if (!capturedBlob) return;
    setIsUploading(true);
    try {
      await onUploadPhoto(capturedBlob);
      onClose();
    } catch (err) {
      alert('Error al guardar evidencia: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const userName = currentUser?.nombre || currentUser?.usuario || 'Usuario';
  const nowFormatted = new Date().toLocaleString('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4"
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Camera size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">
                  {mode === 'select' && 'Cargar Evidencia Fotográfica'}
                  {mode === 'camera' && 'Tomar Fotografía'}
                  {mode === 'preview' && 'Confirmar Evidencia'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {mode === 'select' && 'Selecciona el método para registrar la foto'}
                  {mode === 'camera' && 'Enfoca la cámara y presiona capturar'}
                  {mode === 'preview' && 'Verifica los detalles antes de registrar'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            
            {/* VISTA 1: SELECCIÓN DE MÉTODO (Tomar Foto / Subir Archivo) */}
            {mode === 'select' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                {/* Opción Tomar Foto */}
                <button
                  type="button"
                  onClick={() => setMode('camera')}
                  className="group p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 flex flex-col items-center text-center gap-3 transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-[0.98]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                    <Camera size={28} />
                  </div>
                  <div>
                    <span className="font-black text-slate-800 text-sm block group-hover:text-blue-700">
                      Tomar Foto
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 block leading-tight">
                      Usa la cámara web o del móvil en vivo
                    </span>
                  </div>
                </button>

                {/* Opción Subir Foto de Archivo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group p-5 rounded-2xl border-2 border-slate-200 hover:border-slate-800 bg-white hover:bg-slate-50 flex flex-col items-center text-center gap-3 transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-[0.98]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                    <Upload size={28} />
                  </div>
                  <div>
                    <span className="font-black text-slate-800 text-sm block group-hover:text-slate-900">
                      Subir Foto
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 block leading-tight">
                      Selecciona desde tus archivos o galería
                    </span>
                  </div>
                </button>

                {/* Inputs ocultos */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={nativeCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* VISTA 2: CÁMARA EN VIVO */}
            {mode === 'camera' && (
              <div className="space-y-4">
                {cameraError ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 text-center">
                    <AlertCircle size={24} className="mx-auto text-amber-600" />
                    <p className="text-xs text-amber-800 font-semibold">{cameraError}</p>
                    <p className="text-[11px] text-slate-500">
                      Puedes usar la cámara nativa del dispositivo como alternativa:
                    </p>
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-900 cursor-pointer"
                    >
                      Abrir Cámara Nativa
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-4/3 flex items-center justify-center shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Botón cambiar cámara frontal/trasera */}
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors cursor-pointer backdrop-blur-xs"
                      title="Cambiar cámara"
                    >
                      <SwitchCamera size={18} />
                    </button>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />

                {!cameraError && (
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('select')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Volver
                    </button>

                    <button
                      type="button"
                      onClick={handleTakeSnapshot}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <Camera size={16} />
                      Capturar Foto
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VISTA 3: PREVIEW Y CONFIRMACIÓN CON METADATOS */}
            {mode === 'preview' && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video sm:aspect-4/3 flex items-center justify-center">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Evidencia preview"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Metadatos de Registro: Quién y Cuándo */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Información que se registrará con la evidencia
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <User size={12} />
                      </div>
                      <span className="truncate">
                        <strong>Subido por:</strong> {userName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Clock size={12} />
                      </div>
                      <span className="truncate">
                        <strong>Fecha/Hora:</strong> {nowFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('select');
                      setCapturedBlob(null);
                      setPreviewUrl(null);
                    }}
                    disabled={isUploading}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Repetir / Elegir otra
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmUpload}
                    disabled={isUploading}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        Guardar Evidencia
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </ModalPortal>
  );
}
