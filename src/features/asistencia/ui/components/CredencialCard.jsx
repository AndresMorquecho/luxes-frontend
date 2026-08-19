import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import headerBg from '../../../../assets/header-bg.png';

const ALUX_NAVY = '#09152b';
const HEADER_BG_STYLE = {
  backgroundColor: ALUX_NAVY,
  backgroundImage: `linear-gradient(135deg, rgba(9, 21, 43, 0.95) 0%, rgba(14, 36, 77, 0.85) 50%, rgba(6, 13, 27, 0.95) 100%), url(${headerBg})`,
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
};

const formatNombreApellidos = (fullName = '') => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { nombres: fullName, apellidos: '' };
  }
  if (parts.length === 2) {
    return { nombres: parts[0], apellidos: parts[1] };
  }
  if (parts.length === 3) {
    return { nombres: parts[0], apellidos: `${parts[1]} ${parts[2]}` };
  }
  const mid = Math.min(2, Math.floor(parts.length / 2));
  const nombres = parts.slice(0, mid).join(' ');
  const apellidos = parts.slice(mid).join(' ');
  return { nombres, apellidos };
};

export const CredencialCard = ({ emp, isPrinting, onFotoUpload }) => {
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const hasFoto = Boolean(emp.foto?.trim());
  const { nombres, apellidos } = formatNombreApellidos(emp.nombre);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFotoUpload) {
      onFotoUpload(emp, file);
    }
    e.target.value = '';
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 4,
        backgroundColor: '#ffffff',
        cacheBust: true,
        filter: (node) => {
          if (node?.hasAttribute && node.hasAttribute('data-exclude')) {
            return false;
          }
          return true;
        },
      });

      const link = document.createElement('a');
      link.download = `credencial-alux-${emp.nombre.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generando credencial:', err);
    }
  };

  return (
    <div className={`relative group w-full max-w-[275px] ${isPrinting ? 'print-target' : 'perspective'}`}>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0e244d]/30 to-[#09152b]/45 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />

      {/* Tarjeta con proporción exacta de 5.5 cm x 8.5 cm (1:1.545) */}
      <div
        ref={cardRef}
        className="relative flex flex-col bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl w-full h-[425px] select-none"
        style={{ aspectRatio: '5.5 / 8.5' }}
      >
        {/* Card Header Band */}
        <div className="h-16 relative shrink-0 flex items-end px-4 pb-2 overflow-hidden" style={HEADER_BG_STYLE}>
          <div className="absolute top-2.5 right-3 bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded text-[9px] font-black text-white/95 border border-white/20 tracking-widest uppercase">
            ALUX · 2026
          </div>
          <span className="text-white/45 text-[9px] font-mono font-semibold tracking-widest">CREDENCIAL</span>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-9 relative z-10 shrink-0">
          <div className="relative cursor-pointer group/avatar" onClick={handleAvatarClick}>
            {hasFoto ? (
              <img
                src={emp.foto}
                alt={emp.nombre}
                crossOrigin="anonymous"
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-gray-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
            )}
            {/* Camera overlay */}
            <div
              data-exclude="true"
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-80 transition-opacity pointer-events-none"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>
        </div>

        {/* Info: Nombres en Fila 1 y Apellidos en Fila 2 */}
        <div className="text-center px-4 pt-2 pb-2 grow flex flex-col justify-center min-h-0">
          <div className="uppercase font-bold text-gray-800 leading-tight">
            <span className="block text-sm font-bold text-slate-800 tracking-tight">{nombres}</span>
            {apellidos && <span className="block text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">{apellidos}</span>}
          </div>
          {emp.cargo && <p className="text-[#09152b] font-semibold text-[11px] mt-1 truncate">{emp.cargo}</p>}
          {emp.departamento && (
            <span className="inline-block self-center mt-1 bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wide truncate max-w-[90%]">
              {emp.departamento}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-dashed border-gray-200" />

        {/* QR Section */}
        <div className="flex flex-col items-center py-3 shrink-0">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <QRCodeSVG value={emp.id} size={120} level="H" fgColor={ALUX_NAVY} />
          </div>
          <p className="text-[9px] text-gray-400 mt-1 font-mono tracking-widest">{emp.id}</p>
        </div>

        {/* Print Button */}
        <div data-exclude="true" className="p-3 flex justify-center print-hidden border-t border-slate-100">
          <button
            type="button"
            onClick={handleDownload}
            className="bg-[#09152b] hover:bg-[#050d1b] active:scale-[0.99] text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer border-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar carnet
          </button>
        </div>
      </div>
    </div>
  );
};
