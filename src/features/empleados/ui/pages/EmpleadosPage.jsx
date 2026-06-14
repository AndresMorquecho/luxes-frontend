import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import headerBg from '../../../../assets/header-bg.png';
import { getEmpleados, saveEmpleado, deleteEmpleado, getEmpleadoDocumentos, uploadEmpleadoDocumentos, deleteEmpleadoDocumento, DOCUMENTO_TIPOS } from '../../application/empleadosService';

const MODAL_HEADER_STYLE = {
  backgroundColor: '#02188E',
  backgroundImage: `linear-gradient(90deg, rgba(1, 12, 72, 0.55) 0%, rgba(4, 51, 255, 0.25) 50%, rgba(1, 12, 72, 0.55) 100%), url(${headerBg})`,
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
};

const EMPTY_FORM = {
  nombre: '', cedula: '', cargo: '', departamento: '', telefono: '', correo: '',
  contraseña: '123456',
  cuentaBanco: '', banco: '', tipoContrato: 'Fijo', sueldoDiario: '', direccion: '', foto: '',
};

const BANCOS = ['Pichincha', 'Guayaquil', 'Bolivariano', 'Pacifico', 'Internacional', 'Produbanco', 'Austro', 'Machala'];
const DEPARTAMENTOS = ['Tecnología', 'Diseño', 'Operaciones', 'Finanzas', 'RRHH', 'Marketing', 'Ventas'];
const CONTRATOS = ['Fijo', 'Indefinido', 'Temporal', 'Por obra'];

const BANCO_THEMES = {
  '': {
    gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    accent: '#cbd5e1',
    chip: '#94a3b8',
  },
  Pichincha: {
    gradient: 'linear-gradient(135deg, #ffdd00 0%, #ffc800 50%, #f5b000 100%)',
    accent: '#003087',
    chip: '#003087',
    light: true,
  },
  Guayaquil: {
    gradient: 'linear-gradient(135deg, #c41230 0%, #e31837 50%, #9b0f24 100%)',
    accent: '#ffffff',
    chip: '#ffd6dc',
  },
  Bolivariano: {
    gradient: 'linear-gradient(135deg, #004d2e 0%, #006b3f 50%, #003322 100%)',
    accent: '#ffd700',
    chip: '#c5e86c',
  },
  Pacifico: {
    gradient: 'linear-gradient(135deg, #002d72 0%, #003da5 50%, #001a45 100%)',
    accent: '#5eb6ff',
    chip: '#7ec8ff',
  },
  Internacional: {
    gradient: 'linear-gradient(135deg, #003087 0%, #f47920 120%)',
    accent: '#ffffff',
    chip: '#ffb380',
  },
  Produbanco: {
    gradient: 'linear-gradient(135deg, #6b0015 0%, #c8102e 50%, #4a000e 100%)',
    accent: '#f5c6ce',
    chip: '#e8a0ab',
  },
  Austro: {
    gradient: 'linear-gradient(135deg, #005a28 0%, #00843d 50%, #003d18 100%)',
    accent: '#ffffff',
    chip: '#7ddea0',
  },
  Machala: {
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #065f46 120%)',
    accent: '#7dd3fc',
    chip: '#6ee7b7',
  },
};

const BANCO_BADGES = {
  Pichincha: { letter: 'p', background: '#ffdd00', color: '#003087' },
  Guayaquil: { letter: 'G', background: '#e31837', color: '#ffffff' },
  Bolivariano: { letter: 'B', background: '#006b3f', color: '#ffffff' },
  Pacifico: { letter: 'P', background: '#003da5', color: '#ffffff' },
  Internacional: { letter: 'I', background: '#f47920', color: '#ffffff' },
  Produbanco: { letter: 'P', background: '#c8102e', color: '#ffffff' },
  Austro: { letter: 'A', background: '#00843d', color: '#ffffff' },
  Machala: { letter: 'M', background: '#0369a1', color: '#ffffff' },
};

const normalizeBancoKey = (banco = '') => {
  const trimmed = String(banco).trim();
  if (!trimmed) return '';

  if (BANCO_BADGES[trimmed]) return trimmed;

  const stripped = trimmed.replace(/^banco\s+(de(l?)\s+)?/i, '');
  if (BANCO_BADGES[stripped]) return stripped;

  const normalized = stripped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return BANCOS.find((name) => {
    const candidate = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized === candidate || normalized.includes(candidate);
  }) || '';
};

const getBankBadge = (banco) => {
  const key = normalizeBancoKey(banco);
  if (!key) {
    if (!banco) return { letter: '?', background: '#e2e8f0', color: '#64748b' };
    return {
      letter: banco.charAt(0).toUpperCase(),
      background: '#e2e8f0',
      color: '#475569',
    };
  }
  return BANCO_BADGES[key];
};

const getBankTheme = (banco) => BANCO_THEMES[normalizeBancoKey(banco)] || BANCO_THEMES[''];

const AVATAR_PALETTES = [
  { bg: '#dbeafe', text: '#2563eb' },
  { bg: '#d1fae5', text: '#059669' },
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#ffedd5', text: '#ea580c' },
  { bg: '#fce7f3', text: '#db2777' },
];

const DEPTO_STYLES = {
  'Tecnología': { bg: '#dbeafe', text: '#1d4ed8' },
  IT: { bg: '#ede9fe', text: '#6d28d9' },
  Diseño: { bg: '#fce7f3', text: '#be185d' },
  Operaciones: { bg: '#ffedd5', text: '#c2410c' },
  Finanzas: { bg: '#d1fae5', text: '#047857' },
  RRHH: { bg: '#e0e7ff', text: '#4338ca' },
  Marketing: { bg: '#fef3c7', text: '#b45309' },
  Ventas: { bg: '#ccfbf1', text: '#0f766e' },
};

const getAvatarStyle = (seed = '') => {
  const idx = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
};

const getDeptoStyle = (depto = '') => {
  if (DEPTO_STYLES[depto]) return DEPTO_STYLES[depto];
  const idx = [...depto].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_PALETTES.length;
  const palette = AVATAR_PALETTES[idx];
  return { bg: palette.bg, text: palette.text };
};

const EmpleadoBankCell = ({ banco, cuentaBanco }) => {
  if (!banco && !cuentaBanco) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  const badge = getBankBadge(banco);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm"
        style={{ background: badge.background, color: badge.color }}
      >
        {badge.letter}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{banco || 'Sin banco'}</p>
        <p className="text-xs text-slate-500 truncate">{cuentaBanco || 'Sin cuenta'}</p>
      </div>
    </div>
  );
};

const BankSelect = ({ value, onChange, light = false }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const computeMenuStyle = () => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();

    return {
      position: 'fixed',
      left: `${rect.left}px`,
      width: `${Math.max(rect.width, 220)}px`,
      top: `${rect.top - 6}px`,
      transform: 'translateY(-100%)',
      zIndex: 10050,
    };
  };

  const openMenu = () => {
    const style = computeMenuStyle();
    if (!style) return;
    setMenuStyle(style);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setMenuStyle(null);
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    setMenuStyle(computeMenuStyle());

    const handleReposition = () => setMenuStyle(computeMenuStyle());
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e) => {
      const target = e.target;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectBank = (bank) => {
    onChange({ target: { name: 'banco', value: bank } });
    closeMenu();
  };

  const label = value || 'Seleccionar banco...';

  const dropdownMenu = open && menuStyle ? createPortal(
    <div
      ref={menuRef}
      style={menuStyle}
      className="rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-[bank-drop_0.15s_ease-out]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Elegir banco</p>
      </div>
      <ul className="max-h-52 overflow-y-auto py-1">
        <li>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectBank('')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
              !value ? 'bg-blue-50 text-slate-800 font-semibold' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" />
            <span className="flex-1">Sin seleccionar</span>
            {!value && (
              <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-7.5" />
              </svg>
            )}
          </button>
        </li>
        {BANCOS.map(bank => {
          const bankTheme = BANCO_THEMES[bank];
          const selected = value === bank;
          return (
            <li key={bank}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectBank(bank)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                  selected ? 'bg-blue-50 font-semibold text-slate-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
                  style={{ background: bankTheme.gradient }}
                />
                <span className="flex-1">{bank}</span>
                {selected && (
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-7.5" />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className={`relative mt-1 w-full max-w-[200px] ${open ? 'z-30' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => (open ? closeMenu() : openMenu())}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all ${
          light
            ? open
              ? 'bg-[#003087]/15 border-[#003087]/35 shadow-md'
              : 'bg-[#003087]/10 border-[#003087]/25 hover:bg-[#003087]/15 hover:border-[#003087]/35'
            : open
              ? 'bg-white/25 border-white/40 shadow-md'
              : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
        }`}
      >
        <span className={`text-sm font-bold truncate ${
          light ? (value ? 'text-[#003087]' : 'text-[#003087]/60') : (value ? 'text-white' : 'text-white/60')
        }`}>
          {label}
        </span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${
            light ? 'text-[#003087]/80' : 'text-white/80'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {dropdownMenu}
    </div>
  );
};

const BankAccountCard = ({ banco, cuentaBanco, onChange }) => {
  const theme = getBankTheme(banco);
  const light = theme.light === true;

  return (
    <div
      className="relative rounded-2xl p-4 sm:p-5 shadow-lg transition-all duration-300 w-full max-w-[340px] aspect-[1.586/1] flex flex-col justify-between overflow-visible"
      style={{ background: theme.gradient }}
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div
          className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20"
          style={{ background: theme.accent }}
        />
        <div
          className="absolute -right-4 bottom-0 w-28 h-28 rounded-full opacity-10"
          style={{ background: theme.chip }}
        />
      </div>

      <div className="relative flex items-start justify-between gap-2 mb-3 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-7 rounded-md shrink-0 ${light ? 'border border-[#003087]/25' : 'border border-white/30'}`}
            style={{ background: `linear-gradient(135deg, ${theme.chip} 0%, ${theme.accent} 100%)` }}
          />
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-bold uppercase tracking-widest ${light ? 'text-[#003087]/65' : 'text-white/60'}`}>
              Institución financiera
            </p>
            <BankSelect value={banco} onChange={onChange} light={light} />
          </div>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 pt-0.5 ${light ? 'text-[#003087]/55' : 'text-white/50'}`}>
          Cuenta
        </span>
      </div>

      <div className="relative z-10">
        <label className={`text-[9px] font-bold uppercase tracking-widest mb-1 block ${light ? 'text-[#003087]/55' : 'text-white/50'}`}>
          Número de cuenta
        </label>
        <input
          name="cuentaBanco"
          value={cuentaBanco}
          onChange={onChange}
          placeholder="0000 0000 0000"
          className={`w-full rounded-lg px-3 py-2 font-mono text-sm tracking-wider outline-none transition-colors ${
            light
              ? 'bg-[#003087]/10 border border-[#003087]/25 text-[#003087] placeholder:text-[#003087]/35 focus:bg-[#003087]/15 focus:border-[#003087]/40'
              : 'bg-white/15 border border-white/25 text-white placeholder:text-white/30 focus:bg-white/20 focus:border-white/40'
          }`}
        />
      </div>
    </div>
  );
};

const DOC_META = {
  cedula_frontal: { desc: 'Foto o escaneo del frente', group: 'required' },
  cedula_posterior: { desc: 'Foto o escaneo del reverso', group: 'required' },
  contrato: { desc: 'Contrato firmado vigente', group: 'required' },
  titulo: { desc: 'Copia del título o diploma', group: 'optional' },
  certificado: { desc: 'Certificados de cursos o capacitaciones', group: 'optional' },
  antecedentes: { desc: 'Record policial o antecedentes penales', group: 'optional' },
  curriculum: { desc: 'Hoja de vida actualizada', group: 'optional' },
  otro: { desc: 'Cualquier otro documento relevante', group: 'optional' },
};

const isImageMime = (mime) => mime?.startsWith('image/');
const isImageName = (name) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name || '');

const DocPreview = ({ previewUrl, fileName, isPdf }) => {
  if (previewUrl) {
    return (
      <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 mb-3">
        <img src={previewUrl} alt={fileName} className="w-full h-full object-contain" />
      </div>
    );
  }
  if (isPdf) {
    return (
      <div className="w-full h-36 rounded-xl flex flex-col items-center justify-center bg-red-50 border border-red-100 mb-3">
        <svg className="w-12 h-12 text-red-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">PDF</span>
      </div>
    );
  }
  return (
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-emerald-100 text-emerald-600`}>
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    </div>
  );
};

const DocUploadCard = ({ id, label, required, existing, pending, onSelect, onRemovePending, onDeleteExisting, canDelete }) => {
  const done = existing || pending;
  const meta = DOC_META[id] || { desc: 'Imagen, PDF o Word', group: 'optional' };
  const fileName = pending?.name || existing?.nombre;
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (pending && isImageMime(pending.type)) {
      const url = URL.createObjectURL(pending);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (existing && !pending && (isImageMime(existing.mimeType) || isImageName(existing.archivoUrl) || isImageName(existing.nombre))) {
      setPreviewUrl(existing.archivoUrl);
      return undefined;
    }
    setPreviewUrl(null);
    return undefined;
  }, [pending, existing]);

  const isPdf = pending?.type === 'application/pdf' || existing?.mimeType === 'application/pdf' || /\.pdf$/i.test(fileName || '');

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) onSelect(id, file);
  };

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
      className={`doc-upload-card group relative flex flex-col rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden ${
        done
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-sm'
          : required
            ? 'border-amber-200/80 bg-gradient-to-br from-amber-50/30 to-white hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-md'
            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 hover:shadow-md'
      }`}
    >
      <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => onSelect(id, e.target.files?.[0])} />

      {required && !done && (
        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          Requerido
        </span>
      )}
      {done && (
        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-7.5" />
          </svg>
          Listo
        </span>
      )}

      <div className="flex flex-col items-center text-center px-5 pt-6 pb-5 flex-1 w-full">
        {done ? (
          <DocPreview previewUrl={previewUrl} fileName={fileName} isPdf={isPdf && !previewUrl} />
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-transform group-hover:scale-105">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </div>
        )}

        <p className="text-sm font-bold text-slate-800 leading-tight">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
        {!done && <p className="text-xs text-slate-400 mt-1.5 leading-snug">{meta.desc}</p>}

        {done ? (
          <p className="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg max-w-full truncate w-full">
            {fileName}
          </p>
        ) : (
          <p className="mt-3 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            Clic o arrastra aquí
          </p>
        )}
      </div>

      {done && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-100/80 bg-white/60">
          {(previewUrl || (existing && !pending)) && (
            <a
              href={previewUrl || existing.archivoUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              {previewUrl ? 'Ampliar' : 'Ver archivo'}
            </a>
          )}
          <span className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 group-hover:bg-slate-200 rounded-lg transition-colors">
            Cambiar
          </span>
          {(pending || (existing && canDelete)) && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (pending) onRemovePending(id);
                else if (existing) onDeleteExisting(existing.id);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
      )}
    </label>
  );
};

export const EmpleadosPage = () => {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [documentos, setDocumentos] = useState([]);
  const [pendingDocs, setPendingDocs] = useState({});
  const [formError, setFormError] = useState('');
  const [modalTab, setModalTab] = useState('personal');
  const perPage = 5;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getEmpleados();
      setEmpleados(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDocumentos([]);
    setPendingDocs({});
    setFormError('');
    setModalTab('personal');
    setFormOpen(true);
  };

  const openEdit = async (emp) => {
    setEditing(emp);
    setForm({ ...emp, contraseña: emp.contraseña || '123456' });
    setPendingDocs({});
    setFormError('');
    setModalTab('personal');
    setFormOpen(true);
    try {
      const docs = await getEmpleadoDocumentos(emp.id);
      setDocumentos(docs);
    } catch {
      setDocumentos([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(prev => ({ ...prev, foto: ev.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentSelect = (tipo, file) => {
    if (!file) return;
    setPendingDocs(prev => ({ ...prev, [tipo]: file }));
    setFormError('');
  };

  const handleRemovePendingDoc = (tipo) => {
    setPendingDocs(prev => {
      const next = { ...prev };
      delete next[tipo];
      return next;
    });
  };

  const handleDeleteExistingDoc = async (docId) => {
    if (!editing?.id) return;
    const confirmed = await confirmDialog(
      '¿Eliminar documento?',
      '¿Eliminar este documento del expediente? Esta acción no se puede deshacer.',
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteEmpleadoDocumento(editing.id, docId);
      setDocumentos(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'No se pudo eliminar el documento');
    }
  };

  const getDocForTipo = (tipo) => documentos.find(d => d.tipo === tipo);

  const validateRequiredDocs = () => {
    const required = DOCUMENTO_TIPOS.filter(d => d.required);
    for (const doc of required) {
      const hasPending = !!pendingDocs[doc.id];
      const hasExisting = !!getDocForTipo(doc.id);
      if (!hasPending && !hasExisting) {
        return `Falta el documento obligatorio: ${doc.label}`;
      }
    }
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    const docError = validateRequiredDocs();
    if (docError) {
      setFormError(docError);
      return;
    }

    setSaving(true);
    try {
      const saved = await saveEmpleado({ ...form, sueldoDiario: Number(form.sueldoDiario) });
      const docsToUpload = Object.entries(pendingDocs).map(([tipo, file]) => ({
        tipo,
        file,
        nombre: DOCUMENTO_TIPOS.find(d => d.id === tipo)?.label || file.name,
      }));

      if (docsToUpload.length > 0) {
        await uploadEmpleadoDocumentos(saved.id, docsToUpload);
      }

      if (editing) {
        setEmpleados(prev => prev.map(emp => emp.id === saved.id ? saved : emp));
        setFormOpen(false);
      } else {
        navigate('/nomina/credenciales');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Error al guardar el colaborador');
    } finally {
      setSaving(false);
    }
  };

  const q = search.toLowerCase();
  const filteredAll = empleados.filter(e =>
    e.nombre.toLowerCase().includes(q) ||
    e.id.toLowerCase().includes(q) ||
    e.cedula.includes(q) ||
    e.cargo.toLowerCase().includes(q) ||
    e.departamento.toLowerCase().includes(q) ||
    e.cuentaBanco.includes(q) ||
    e.banco.toLowerCase().includes(q)
  );
  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = page > totalPages ? 1 : page;
  if (safePage !== page) setPage(safePage);
  const filtered = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);

  const handleDelete = async (emp) => {
    const confirmed = await confirmDialog(
      '¿Eliminar colaborador?',
      `¿Eliminar permanentemente a ${emp.nombre}? Se borrarán también sus documentos y registros asociados.`,
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteEmpleado(emp.id);
      setEmpleados(prev => prev.filter(e => e.id !== emp.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 xl:p-8 w-full animate-slide-up empleados-page" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <style>{`
        .empleados-page, .empleados-page * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .btn-primary { background: #2563eb; transition: all 0.15s ease; }
        .btn-primary:hover { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .btn-ghost { transition: all 0.15s ease; }
        .btn-ghost:hover { background: #f1f5f9; }
        .input-field { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; font-weight: 500; color: #1e293b; outline: none; transition: all 0.15s ease; background: white; width: 100%; }
        .input-field:focus { border-color: #93c5fd; ring: 2px; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .input-field::placeholder { color: #94a3b8; }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Colaboradores</h1>
            <p className="text-sm text-slate-500">Registro y gestión de colaboradores</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 shadow-sm shrink-0"
          style={{ backgroundColor: '#1d4ed8' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Colaborador
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Lista de Colaboradores</h2>
            <span className="text-xs font-medium text-gray-400">{filtered.length} registros</span>
          </div>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar colaborador..."
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-80 min-w-[280px] transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm empleados-table">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cédula</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Depto.</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cuenta Bancaria</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(emp => {
                  const avatar = getAvatarStyle(emp.id || emp.nombre);
                  const depto = getDeptoStyle(emp.departamento);

                  return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                          style={{ backgroundColor: avatar.bg, color: avatar.text }}
                        >
                          {emp.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 leading-tight">{emp.nombre}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{emp.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{emp.cedula}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{emp.cargo || '—'}</td>
                    <td className="px-5 py-4">
                      {emp.departamento ? (
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: depto.bg, color: depto.text }}
                        >
                          {emp.departamento}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <EmpleadoBankCell banco={emp.banco} cuentaBanco={emp.cuentaBanco} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                          title="Editar colaborador"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                          title="Eliminar colaborador"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-slate-400">{search ? 'No se encontraron colaboradores' : 'No hay colaboradores registrados'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-[11px] font-medium text-gray-400">
              Página {safePage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${n === safePage ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {formOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md" onClick={() => setFormOpen(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl animate-modal-in flex flex-col border border-gray-100 max-h-[min(860px,94vh)] min-h-[520px] overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 shrink-0" style={MODAL_HEADER_STYLE}>
                <div>
                  <h2 className="text-xl font-bold text-white">{editing ? 'Editar Colaborador' : 'Nuevo Colaborador'}</h2>
                  <p className="text-xs text-white/60 mt-0.5">Complete la información por secciones</p>
                </div>
                <button type="button" onClick={() => setFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-8 pt-4 shrink-0 border-b border-gray-100">
                {[
                  { id: 'personal', label: 'Personal y contrato' },
                  { id: 'credenciales', label: 'Credenciales' },
                  { id: 'documentos', label: 'Documentos' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalTab(tab.id)}
                    className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                      modalTab === tab.id
                        ? 'text-blue-700 border-blue-600 bg-blue-50/50'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                    {tab.id === 'documentos' && (
                      <span className="ml-1.5 text-[10px] font-bold text-red-500">*</span>
                    )}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {modalTab === 'personal' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                            {form.foto ? (
                              <img src={form.foto} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                              </svg>
                            )}
                          </div>
                          <label className="cursor-pointer w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                            {form.foto ? 'Cambiar' : 'Subir foto'}
                            <input type="file" accept="image/*" onChange={handleFotoUpload} className="hidden" />
                          </label>
                          {form.foto && (
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, foto: '' }))} className="text-[11px] text-red-500 font-semibold">
                              Quitar foto
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Nombre completo</label>
                            <input name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej. Carlos Mendoza" className="input-field" />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Cédula</label>
                            <input name="cedula" value={form.cedula} onChange={handleChange} required placeholder="0912345678" className="input-field" />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Teléfono</label>
                            <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="0991234567" className="input-field" />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Dirección</label>
                            <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Ciudad / Dirección" className="input-field" />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
                          Contrato y datos bancarios
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                            <div>
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Cargo</label>
                              <input name="cargo" value={form.cargo} onChange={handleChange} placeholder="Ej. Desarrollador" className="input-field" />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Departamento</label>
                              <select name="departamento" value={form.departamento} onChange={handleChange} className="input-field">
                                <option value="">Seleccionar...</option>
                                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Tipo de contrato</label>
                              <select name="tipoContrato" value={form.tipoContrato} onChange={handleChange} className="input-field">
                                {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Sueldo diario ($)</label>
                              <input name="sueldoDiario" type="number" step="0.01" value={form.sueldoDiario} onChange={handleChange} placeholder="0.00" className="input-field" />
                            </div>
                          </div>
                          <div className="flex justify-center md:justify-end">
                            <BankAccountCard
                              banco={form.banco}
                              cuentaBanco={form.cuentaBanco}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {modalTab === 'credenciales' && (
                    <div className="max-w-lg space-y-5">
                      <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
                          Acceso del colaborador
                        </h3>
                        <p className="text-sm text-slate-500 mb-5">
                          Credenciales para el acceso del colaborador al sistema y su carnet digital.
                        </p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Correo electrónico</label>
                        <input
                          name="correo"
                          type="email"
                          value={form.correo}
                          onChange={handleChange}
                          placeholder="correo@luxes.com"
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Contraseña</label>
                        <input
                          name="contraseña"
                          type="text"
                          value={form.contraseña}
                          onChange={handleChange}
                          className="input-field"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                          Se genera automáticamente con la contraseña <span className="font-semibold text-slate-500">123456</span>. Puedes cambiarla si lo necesitas.
                        </p>
                      </div>
                    </div>
                  )}

                  {modalTab === 'documentos' && (() => {
                    const requiredDocs = DOCUMENTO_TIPOS.filter(d => d.required);
                    const optionalDocs = DOCUMENTO_TIPOS.filter(d => !d.required);

                    return (
                      <div className="space-y-6">
                        {/* Obligatorios */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
                            Documentos obligatorios
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {requiredDocs.map(({ id, label, required }) => (
                              <DocUploadCard
                                key={id}
                                id={id}
                                label={label}
                                required={required}
                                existing={getDocForTipo(id)}
                                pending={pendingDocs[id]}
                                onSelect={handleDocumentSelect}
                                onRemovePending={handleRemovePendingDoc}
                                onDeleteExisting={handleDeleteExistingDoc}
                                canDelete={!!editing}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Opcionales */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-slate-300 rounded-full" />
                            Documentos opcionales
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {optionalDocs.map(({ id, label, required }) => (
                              <DocUploadCard
                                key={id}
                                id={id}
                                label={label}
                                required={required}
                                existing={getDocForTipo(id)}
                                pending={pendingDocs[id]}
                                onSelect={handleDocumentSelect}
                                onRemovePending={handleRemovePendingDoc}
                                onDeleteExisting={handleDeleteExistingDoc}
                                canDelete={!!editing}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {formError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {formError}
                    </div>
                  )}
                </div>

                {/* Footer fijo */}
                <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50 shrink-0 rounded-b-2xl">
                  <div className="flex gap-2">
                    {modalTab === 'credenciales' && (
                      <button
                        type="button"
                        onClick={() => setModalTab('personal')}
                        className="btn-ghost px-3 py-2 rounded-xl text-xs font-semibold text-gray-500"
                      >
                        ← Anterior
                      </button>
                    )}
                    {modalTab === 'documentos' && (
                      <button
                        type="button"
                        onClick={() => setModalTab('credenciales')}
                        className="btn-ghost px-3 py-2 rounded-xl text-xs font-semibold text-gray-500"
                      >
                        ← Anterior
                      </button>
                    )}
                    {modalTab === 'personal' && (
                      <button
                        type="button"
                        onClick={() => setModalTab('credenciales')}
                        className="btn-ghost px-3 py-2 rounded-xl text-xs font-semibold text-blue-600"
                      >
                        Siguiente →
                      </button>
                    )}
                    {modalTab === 'credenciales' && (
                      <button
                        type="button"
                        onClick={() => setModalTab('documentos')}
                        className="btn-ghost px-3 py-2 rounded-xl text-xs font-semibold text-blue-600"
                      >
                        Siguiente →
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormOpen(false)} className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-gray-600">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="btn-primary px-6 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60">
                      {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
                      {editing ? 'Guardar cambios' : 'Registrar Colaborador'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes modal-in {
          from { transform: scale(0.95) translateY(8px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes bank-drop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-modal-in { animation: modal-in 0.2s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}} />
    </div>
  );
};
