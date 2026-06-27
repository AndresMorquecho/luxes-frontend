import React from 'react';
import { Scanner, outline } from '@yudiel/react-qr-scanner';

/**
 * Visor de cámara con marco de escaneo integrado (finder) para credenciales QR.
 */
export function QrScannerViewport({
  onScan,
  onError,
  paused = false,
  processing = false,
  variant = 'dark',
  className = '',
}) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border-2 ${
        isDark ? 'border-blue-500/70 bg-slate-950 shadow-inner shadow-blue-500/10' : 'border-blue-200 bg-black'
      } ${className}`}
      style={{ aspectRatio: '1 / 1', maxHeight: 'min(72vw, 420px)' }}
    >
      {processing && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white" />
          <p className="text-xs font-semibold text-white mt-3">Procesando marcación…</p>
        </div>
      )}

      <div className="absolute top-3 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
        <span
          className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${
            isDark
              ? 'text-white/90 bg-black/50 border-white/20 backdrop-blur-sm'
              : 'text-white bg-black/40 border-white/30'
          }`}
        >
          Centra el QR dentro del marco
        </span>
      </div>

      <Scanner
        onScan={onScan}
        onError={onError}
        paused={paused || processing}
        allowMultiple={false}
        scanDelay={2000}
        sound
        components={{ finder: true, tracker: outline }}
        constraints={{
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }}
        styles={{
          container: { width: '100%', height: '100%', padding: 0, margin: 0 },
          video: { width: '100%', height: '100%', objectFit: 'cover' },
        }}
      />
    </div>
  );
}
