import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate, useParams } from 'react-router-dom';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { toast } from '../../../../shared/ui/components/Toast';
import {
  getEmpleadoById,
  saveEmpleado,
  getEmpleadoDocumentos,
  uploadEmpleadoDocumento,
  uploadEmpleadoDocumentos,
  deleteEmpleadoDocumento,
  DOCUMENTO_TIPOS
} from '../../application/empleadosService';
import { getRoles } from '../../../usuarios/application/usuariosService';
import {
  sueldoDiarioFromMensual,
  sueldoMensualForForm,
  sueldoQuincenaBase,
} from '../../../../shared/utils/sueldoHelpers.js';

const EMPTY_FORM = {
  nombre: '',
  cedula: '',
  telefono: '',
  correo: '',
  username: '',
  contraseña: '123456',
  rol: '',
  roleId: '',
  cuentaBanco: '',
  banco: '',
  tipoContrato: 'Tiempo Completo',
  tieneContrato: true,
  sueldoDiario: '',
  decimoTerceroValor: '',
  decimoCuartoValor: '',
  iessValor: '',
  direccion: '',
  foto: '',
};

const BANCOS = ['Pichincha', 'Guayaquil', 'Bolivariano', 'Pacifico', 'Internacional', 'Produbanco', 'Austro', 'Machala'];
const CONTRATOS = ['Tiempo Completo', 'Medio Día'];

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

const getBankTheme = (banco) => BANCO_THEMES[normalizeBancoKey(banco)] || BANCO_THEMES[''];

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

  const dropdownMenu = open && menuStyle ? (
    <ModalPortal>
    <div
      ref={menuRef}
      style={menuStyle}
      className="rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
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
    </div>
    </ModalPortal>
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
      className="relative rounded-2xl p-5 shadow-lg transition-all duration-300 w-full max-w-[360px] aspect-[1.6/1] flex flex-col justify-between overflow-hidden"
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
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Chip EMV realista */}
            <div
              className={`relative w-8 h-[22px] rounded overflow-hidden ${light ? 'border border-[#003087]/25 shadow-sm' : 'border border-black/20 shadow-sm'}`}
              style={{ background: `linear-gradient(135deg, #fde047 0%, #eab308 100%)` }}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[0.5px] bg-black/20"></div>
              <div className="absolute inset-y-0 left-[30%] w-[0.5px] bg-black/20"></div>
              <div className="absolute inset-y-0 right-[30%] w-[0.5px] bg-black/20"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-2 border-[0.5px] border-black/20 rounded-sm"></div>
            </div>
            {/* Ícono Contactless */}
            <svg className={`w-4 h-4 opacity-70 ${light ? 'text-[#003087]' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 ml-1">
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

      <div className="relative z-10 flex flex-col justify-end h-full">
        <label className={`text-[9px] font-bold uppercase tracking-widest mb-1 block ${light ? 'text-[#003087]/55' : 'text-white/50'}`}>
          Número de cuenta
        </label>
        <div className="flex items-center gap-3">
          <input
            name="cuentaBanco"
            value={cuentaBanco}
            onChange={onChange}
            placeholder="0000 0000 0000"
            className={`flex-1 rounded-lg px-3 py-2 font-mono text-sm tracking-wider outline-none transition-colors ${
              light
                ? 'bg-[#003087]/10 border border-[#003087]/25 text-[#003087] placeholder:text-[#003087]/35 focus:bg-[#003087]/15 focus:border-[#003087]/40'
                : 'bg-white/15 border border-white/25 text-white placeholder:text-white/30 focus:bg-white/20 focus:border-white/40'
            }`}
          />
          {/* Logo Casa Financiera (Mastercard style) */}
          <div className="shrink-0 flex items-center pointer-events-none mt-1">
            <svg viewBox="0 0 44 28" className="w-10 h-auto drop-shadow-sm" fill="none">
              <circle cx="14" cy="14" r="14" fill="#EB001B" fillOpacity="0.9"/>
              <circle cx="30" cy="14" r="14" fill="#F79E1B" fillOpacity="0.9"/>
            </svg>
          </div>
        </div>
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
  planilla_luz: { desc: 'Planilla de servicios básicos reciente', group: 'optional' },
  otro: { desc: 'Cualquier otro documento relevante', group: 'optional' },
};

const generateUsername = (fullName) => {
  if (!fullName) return '';
  const normalized = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const parts = normalized.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const firstName = parts[0];
  const secondPart = parts[1] || '';
  const initial = secondPart ? secondPart[0] : '';
  return firstName + initial;
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
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-emerald-100 text-emerald-600">
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
      id={`doc-card-${id}`}
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

export const EmpleadoFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('personal');
  const [documentos, setDocumentos] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [documentsChanged, setDocumentsChanged] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null); // Para mostrar la pantalla de éxito
  const [docFile, setDocFile] = useState(null);
  const [docComment, setDocComment] = useState('');
  const [activePreviewDoc, setActivePreviewDoc] = useState(null); // { nombre: string, url: string, isPdf: boolean, isImg: boolean }
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const list = await getRoles();
        setRoles(list);
        if (!isEdit) {
          const defRole = list.find(r => ['user', 'colaborador', 'visor'].includes(r.name.toLowerCase())) || list[0];
          if (defRole) {
            setForm(prev => ({
              ...prev,
              roleId: defRole.id,
              rol: defRole.name
            }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRoles();
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;

    const fetchEmpleado = async () => {
      setLoading(true);
      try {
        const [emp, docs] = await Promise.all([
          getEmpleadoById(id),
          getEmpleadoDocumentos(id)
        ]);
        const loadedForm = {
          ...emp,
          sueldoDiario: sueldoMensualForForm(emp.sueldoDiario),
          contraseña: emp.contraseña || '123456',
          username: emp.username || emp.correo?.split('@')[0] || '',
          rol: emp.rol || '',
          roleId: emp.roleId || '',
          decimoTerceroValor: emp.decimoTerceroValor !== null && emp.decimoTerceroValor !== undefined ? Number(emp.decimoTerceroValor) : '',
          decimoCuartoValor: emp.decimoCuartoValor !== null && emp.decimoCuartoValor !== undefined ? Number(emp.decimoCuartoValor) : '',
          iessValor: emp.iessValor !== null && emp.iessValor !== undefined ? Number(emp.iessValor) : '',
        };
        setForm(loadedForm);
        setInitialForm(loadedForm);
        setDocumentos(docs);
      } catch (err) {
        console.error(err);
        toast.error('No se pudo cargar la información del colaborador.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpleado();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    if (name === 'nombre' && !isEdit) {
      const username = generateUsername(value);
      const email = username ? `${username}@luxes.com` : '';
      setForm((prev) => ({ 
        ...prev, 
        nombre: value,
        username: username,
        correo: email,
        contraseña: prev.contraseña || '123456'
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: val }));
    }
  };

  const handleFotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, foto: ev.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  const focusField = (fieldName) => {
    setTimeout(() => {
      const element = document.getElementsByName(fieldName)[0] || document.getElementById(fieldName);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleDocumentSelect = (file) => {
    if (!file) return;
    setDocFile(file);
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setDocComment(nameWithoutExt);
  };

  const handleRemovePendingDoc = (tempId) => {
    setPendingDocs((prev) => {
      const target = prev.find(d => d.tempId === tempId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((d) => d.tempId !== tempId);
    });
  };

  const handleDeleteExistingDoc = async (docId) => {
    if (!id) return;
    const confirmed = await confirmDialog(
      '¿Eliminar documento?',
      '¿Eliminar este documento del expediente? Esta acción no se puede deshacer.',
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteEmpleadoDocumento(id, docId);
      setDocumentos((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Documento eliminado con éxito');
      setDocumentsChanged(true);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo eliminar el documento');
    }
  };

  const validateRequiredDocs = () => {
    return null;
  };

  const handleAddDocToList = async () => {
    if (!docFile) {
      toast.error('Por favor, selecciona o arrastra un archivo.');
      return;
    }
    if (!docComment.trim()) {
      toast.error('Por favor, ingresa un comentario o descripción del documento.');
      return;
    }

    if (isEdit) {
      setSaving(true);
      try {
        const doc = await uploadEmpleadoDocumento(id, {
          tipo: 'otro',
          nombre: docComment.trim(),
          file: docFile
        });
        setDocumentos(prev => [...prev, doc]);
        toast.success('Documento subido correctamente');
        setDocFile(null);
        setDocComment('');
        setDocumentsChanged(true);
      } catch (err) {
        toast.error('No se pudo subir el documento: ' + err.message);
      } finally {
        setSaving(false);
      }
    } else {
      const isPdf = docFile.type === 'application/pdf' || /\.pdf$/i.test(docFile.name);
      const isImg = docFile.type.startsWith('image/');
      
      let previewUrl = null;
      if (isImg || isPdf) {
        previewUrl = URL.createObjectURL(docFile);
      }

      const newPending = {
        tempId: Date.now().toString(),
        file: docFile,
        nombre: docComment.trim(),
        previewUrl,
        isPdf,
        isImg
      };

      setPendingDocs(prev => [...prev, newPending]);
      setDocFile(null);
      setDocComment('');
      toast.success('Documento añadido a la lista');
    }
  };

  const getDocPreviewDetails = (doc) => {
    if (doc.archivoUrl) {
      const isPdf = doc.mimeType === 'application/pdf' || /\.pdf$/i.test(doc.archivoUrl) || /\.pdf$/i.test(doc.nombre);
      const isImg = doc.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.archivoUrl);
      return { url: doc.archivoUrl, isPdf, isImg, nombre: doc.nombre };
    }
    return { url: doc.previewUrl, isPdf: doc.isPdf, isImg: doc.isImg, nombre: doc.nombre };
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const isQuickSave = e.nativeEvent?.submitter?.name === 'quickSave';

    // Prevent submitting the form when pressing 'Enter' in early tabs unless the quick save button was clicked
    if (!isQuickSave && tab === 'personal') {
      setTab('documentos');
      return;
    }
    if (!isQuickSave && tab === 'documentos') {
      setTab('credenciales');
      return;
    }

    if (!form.nombre.trim()) {
      toast.error('El nombre completo es obligatorio');
      setTab('personal');
      focusField('nombre');
      return;
    }
    if (!form.cedula.trim() || !/^\d{10}$/.test(form.cedula.trim())) {
      toast.error('La cédula es obligatoria y debe tener 10 dígitos');
      setTab('personal');
      focusField('cedula');
      return;
    }
    if (form.sueldoDiario !== '' && form.sueldoDiario !== null && form.sueldoDiario !== undefined) {
      const sueldoNum = Number(form.sueldoDiario);
      if (isNaN(sueldoNum) || sueldoNum < 0) {
        toast.error('El sueldo mensual debe ser un número positivo');
        setTab('personal');
        focusField('sueldoDiario');
        return;
      }
    }

    if (!form.correo.trim()) {
      toast.error('El correo electrónico es obligatorio');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.correo.trim())) {
      toast.error('El formato del correo electrónico no es válido');
      return;
    }
    if (!form.username.trim()) {
      toast.error('El nombre de usuario es obligatorio');
      return;
    }

    const missingDocId = validateRequiredDocs();
    if (missingDocId) {
      const label = DOCUMENTO_TIPOS.find(d => d.id === missingDocId)?.label || missingDocId;
      toast.error(`Falta el documento obligatorio: ${label}`);
      setTab('documentos');
      focusField(`doc-card-${missingDocId}`);
      return;
    }

    setSaving(true);
    try {
      const saved = await saveEmpleado({
        ...form,
        sueldoDiario: sueldoDiarioFromMensual(Number(form.sueldoDiario) || 0),
        decimoTerceroValor: form.decimoTerceroValor !== '' && form.decimoTerceroValor !== null ? Number(form.decimoTerceroValor) : null,
        decimoCuartoValor: form.decimoCuartoValor !== '' && form.decimoCuartoValor !== null ? Number(form.decimoCuartoValor) : null,
        iessValor: form.iessValor !== '' && form.iessValor !== null ? Number(form.iessValor) : null,
      });

      const docsToUpload = pendingDocs.map((doc) => ({
        tipo: 'otro',
        file: doc.file,
        nombre: doc.nombre,
      }));

      if (docsToUpload.length > 0) {
        await uploadEmpleadoDocumentos(saved.id, docsToUpload);
      }

      if (isEdit) {
        toast.success('Colaborador actualizado correctamente');
        navigate('/nomina/empleados');
      } else {
        toast.success('Colaborador guardado correctamente');
        // En creación exitosa, mostramos los datos del usuario autogenerado
        setSuccessInfo({
          nombre: form.nombre,
          username: form.username || form.correo.split('@')[0],
          correo: form.correo,
          contraseña: '123456',
        });
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || 'Error al guardar el colaborador';
      toast.error(msg);

      const normalizedMsg = msg.toLowerCase();
      if (normalizedMsg.includes('cédula') || normalizedMsg.includes('cedula')) {
        setTab('personal');
        focusField('cedula');
      } else if (normalizedMsg.includes('correo') || normalizedMsg.includes('email')) {
        setTab('credenciales');
        focusField('correo');
      } else if (normalizedMsg.includes('usuario') || normalizedMsg.includes('username') || normalizedMsg.includes('nombre de usuario')) {
        setTab('credenciales');
        focusField('username');
      } else if (normalizedMsg.includes('nombre')) {
        setTab('personal');
        focusField('nombre');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-5 animate-slide-up empleado-form-page" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .empleado-form-page, .empleado-form-page * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .input-field { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.625rem 0.875rem; font-size: 0.875rem; font-weight: 500; color: #1e293b; outline: none; transition: all 0.15s ease; background: white; width: 100%; }
        .input-field:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .input-field::placeholder { color: #94a3b8; }
        .btn-primary { background: #2563eb; color: white; transition: all 0.15s ease; }
        .btn-primary:hover { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .btn-ghost { transition: all 0.15s ease; }
        .btn-ghost:hover { background: #f1f5f9; }
        @keyframes modal-in {
          from { transform: scale(0.96) translateY(12px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-in { animation: modal-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>

      {/* Header + Tabs — same card as EmpleadosPage */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 sm:mb-6">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/nomina/empleados')}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
              title="Volver"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="w-11 h-11 rounded-xl border bg-blue-50 border-blue-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">{isEdit ? 'Editar Colaborador' : 'Nuevo Colaborador'}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  {isEdit ? 'Edición' : 'Registro'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {isEdit ? `Modifique los datos de ${form.nombre}` : 'Registro y gestión de colaboradores'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar — same style as EmpleadosPage */}
        <div className="px-4 sm:px-5 pb-4 flex gap-1 border-t border-slate-100 pt-3 bg-slate-50/50">
          {[
            { id: 'personal', label: 'Datos Personales', icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z' },
            { id: 'documentos', label: 'Documentos', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z' },
            { id: 'credenciales', label: 'Acceso al Sistema', icon: 'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-500 mb-3" />
          <p className="text-sm text-slate-400 font-medium">Cargando información del colaborador...</p>
        </div>
      ) : (
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          {/* Form content */}

          <form onSubmit={handleSave} className="flex flex-col">
            <div className="px-5 sm:px-6 py-6 min-h-[380px]">
              {tab === 'personal' && (
                <div className="space-y-8">
                  {/* Foto, Nombre, Cédula */}
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                        {form.foto ? (
                          <img src={form.foto} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Nombre completo *</label>
                        <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Carlos Mendoza" className="input-field" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Cédula *</label>
                        <input name="cedula" value={form.cedula} onChange={handleChange} placeholder="0912345678" className="input-field" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Teléfono</label>
                        <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="0991234567" className="input-field" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Dirección de residencia</label>
                        <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Ciudad / Dirección" className="input-field" />
                      </div>
                    </div>
                  </div>

                  {/* Contrato y Datos Bancarios */}
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-blue-500 rounded-full" />
                      Información de Contratación y Cuenta Bancaria
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                        <label htmlFor="tieneContrato" className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-semibold text-slate-700">Contrato formal</span>
                            {form.tieneContrato && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700">
                                IESS 9.45% · D3 · D4
                              </span>
                            )}
                          </div>
                          <div className="relative inline-flex items-center shrink-0">
                            <input
                              id="tieneContrato"
                              type="checkbox"
                              name="tieneContrato"
                              checked={form.tieneContrato}
                              onChange={handleChange}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                          </div>
                        </label>


                        {/* Jornada / Horario — visible para TODOS los empleados */}
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Jornada / Horario</label>
                          <select name="tipoContrato" value={form.tipoContrato} onChange={handleChange} className="input-field">
                            {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                            {form.tipoContrato === 'Medio Día'
                              ? 'Salida a la 1:00 PM · Sin descuento por salida a las 13:00'
                              : 'Jornada completa · Lun–Vie 8h · Sáb hasta 14:00'}
                          </p>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Sueldo base mensual ($)</label>
                          <input name="sueldoDiario" type="number" step="0.01" min="0" value={form.sueldoDiario} onChange={handleChange} placeholder="500.00" className="input-field" />
                          {Number(form.sueldoDiario) > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                              Quincena: ${sueldoQuincenaBase(Number(form.sueldoDiario)).toFixed(2)} (mitad del mes)
                            </p>
                          )}
                        </div>
                        {form.tieneContrato && (
                          <>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Décimo Tercero Mensual ($)</label>
                              <input name="decimoTerceroValor" type="number" step="0.01" min="0" value={form.decimoTerceroValor} onChange={handleChange} placeholder="Auto (1/12 sueldo)" className="input-field" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Décimo Cuarto Mensual ($)</label>
                              <input name="decimoCuartoValor" type="number" step="0.01" min="0" value={form.decimoCuartoValor} onChange={handleChange} placeholder="Auto ($40.16)" className="input-field" />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Descuento IESS Mensual ($)</label>
                              <input name="iessValor" type="number" step="0.01" min="0" value={form.iessValor} onChange={handleChange} placeholder="Auto (9.45% sueldo)" className="input-field" />
                            </div>
                          </>
                        )}
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

              {tab === 'credenciales' && (
                <div className="space-y-8 animate-slide-up">
                  <div>
                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-blue-500 rounded-full" />
                      Credenciales y Permisos de Acceso
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 font-medium">
                      Configure el acceso del colaborador al sistema. Las credenciales se generan automáticamente, pero puede modificarlas si es necesario.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Nombre de Usuario *</label>
                        <input 
                          name="username" 
                          value={form.username} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(prev => ({
                              ...prev,
                              username: val,
                              correo: val ? `${val}@luxes.com` : prev.correo
                            }));
                          }} 
                          placeholder="Ej. carlosm" 
                          className="input-field" 
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Correo Electrónico *</label>
                        <input 
                          name="correo" 
                          value={form.correo} 
                          onChange={handleChange} 
                          placeholder="Ej. carlosm@luxes.com" 
                          className="input-field" 
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Contraseña Temporal *</label>
                        <input 
                          name="contraseña" 
                          type="text" 
                          value={form.contraseña} 
                          onChange={handleChange} 
                          placeholder="Contraseña" 
                          className="input-field font-mono" 
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Rol en el Sistema *</label>
                        <select 
                          name="roleId" 
                          value={form.roleId} 
                          onChange={(e) => {
                            const rId = e.target.value;
                            const rObj = roles.find(r => r.id === rId);
                            setForm(prev => ({
                              ...prev,
                              roleId: rId,
                              rol: rObj ? rObj.name : ''
                            }));
                          }} 
                          className="input-field"
                        >
                          <option value="">Seleccionar rol...</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name} - {r.description || 'Sin descripción'}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="rounded-xl bg-blue-50/70 border border-blue-200/50 p-4 text-xs text-blue-800 flex gap-3">
                      <svg className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                      <div>
                        <span className="font-bold block mb-0.5">Nota de Seguridad:</span>
                        <span>Las credenciales se utilizan para el acceso al sistema y para que el colaborador pueda registrar su asistencia. Al guardar, se creará/actualizará su cuenta vinculada.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'documentos' && (
                <div className="space-y-8 animate-slide-up">
                  <div>
                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                      Expediente Digital del Colaborador
                    </h3>
                    <p className="text-xs text-slate-500 mb-6 font-medium">
                      Sube los documentos de soporte (Cédula, Contrato, Hojas de Vida, etc.) del colaborador. Escribe un comentario describiendo el documento antes de agregarlo.
                    </p>
                  </div>

                  {/* Zona de Carga y Comentario */}
                  <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr] gap-6">
                    {/* Dropzone */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">1</span>
                        Seleccionar Documento
                      </label>
                      <div 
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleDocumentSelect(file);
                        }}
                        className={`mx-auto rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer aspect-square w-full max-w-[220px] ${
                          docFile 
                            ? 'bg-slate-50/50 border border-slate-100 hover:bg-slate-100/50 hover:border-slate-200' 
                            : 'p-6 border border-dashed border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          className="hidden" 
                          id="empleado-doc-picker"
                          onChange={(e) => handleDocumentSelect(e.target.files?.[0])}
                        />
                        <label htmlFor="empleado-doc-picker" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                          {docFile ? (() => {
                            const isPdf = docFile.name.toLowerCase().endsWith('.pdf');
                            return (
                              <>
                                <div className="relative flex flex-col items-center justify-center mb-3">
                                  <svg className={`w-14 h-14 ${isPdf ? 'text-red-400' : 'text-emerald-400'} drop-shadow-sm`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                  </svg>
                                  {/* Badge superpuesto */}
                                  <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded shadow-sm font-black text-[9px] tracking-wider border ${
                                    isPdf ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  }`}>
                                    {isPdf ? 'PDF' : 'IMG'}
                                  </div>
                                </div>
                                <span className="font-bold text-slate-700 text-xs truncate max-w-[180px] px-2">{docFile.name}</span>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[9px] text-slate-500 font-medium bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
                                    {(docFile.size / 1024).toFixed(1)} KB
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDocFile(null);
                                      setDocComment('');
                                      const input = document.getElementById('empleado-doc-picker');
                                      if (input) input.value = '';
                                    }}
                                    className="text-[9px] text-red-600 font-bold bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 px-2 py-0.5 rounded shadow-sm transition-colors flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Quitar
                                  </button>
                                </div>
                              </>
                            );
                          })() : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-2 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                                </svg>
                              </div>
                              <span className="font-semibold text-slate-600 text-xs">Arrastra tu archivo aquí o haz clic</span>
                              <span className="text-[10px] text-slate-400 mt-1">Formatos permitidos: JPG, PNG, WEBP, PDF</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="flex flex-col justify-start gap-4">
                      <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wide mb-2 flex items-center gap-2 transition-colors ${docFile ? 'text-slate-600' : 'text-slate-400'}`}>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors ${docFile ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>2</span>
                          Descripción del Archivo
                        </label>
                        <input
                          type="text"
                          value={docComment}
                          onChange={(e) => setDocComment(e.target.value)}
                          placeholder={docFile ? "Ej. Cédula de Identidad, Certificado de Curso, etc." : "Selecciona un documento primero..."}
                          disabled={!docFile}
                          className={`input-field transition-all ${!docFile ? 'opacity-60 bg-slate-50 cursor-not-allowed select-none border-slate-200 text-slate-400 w-full' : 'bg-white'}`}
                          style={docFile ? { width: `${Math.max(28, docComment.length + 3)}ch`, maxWidth: '100%' } : {}}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddDocToList}
                        disabled={saving || !docFile || !docComment.trim()}
                        className="w-fit px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 mt-1 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Agregar al Expediente
                      </button>
                    </div>
                  </div>

                  {/* Listado de Documentos */}
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Documentos en Expediente ({documentos.length + pendingDocs.length})
                    </h4>

                    {documentos.length === 0 && pendingDocs.length === 0 ? (
                      <div className="text-center py-12 border border-slate-100 rounded-xl bg-white text-slate-500 text-xs font-medium flex flex-col items-center justify-center gap-3 shadow-sm">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <span>No hay documentos cargados en el expediente de este colaborador.</span>
                      </div>
                    ) : (
                      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-card">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                              <th className="px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Comentario / Descripción</th>
                              <th className="px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Archivo Original</th>
                              <th className="px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                              <th className="px-5 py-3.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-sm">
                            {/* DB Guardados */}
                            {documentos.map((doc) => {
                              const preview = getDocPreviewDetails(doc);
                              return (
                                <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-5 py-3">
                                    {preview.isPdf ? (
                                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded uppercase">PDF</span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase">IMG</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 font-medium text-gray-800">{doc.nombre}</td>
                                  <td className="px-5 py-3 text-xs text-gray-400 truncate max-w-xs font-mono">{doc.archivoUrl.split('/').pop()}</td>
                                  <td className="px-5 py-3">
                                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">Guardado</span>
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => setActivePreviewDoc(preview)}
                                        className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                      >
                                        Ver
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteExistingDoc(doc.id)}
                                        className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Pendientes locales */}
                            {pendingDocs.map((doc) => {
                              const preview = getDocPreviewDetails(doc);
                              return (
                                <tr key={doc.tempId} className="hover:bg-blue-50/20 transition-colors bg-blue-50/10">
                                  <td className="px-5 py-3">
                                    {preview.isPdf ? (
                                      <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded uppercase">PDF</span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase">IMG</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 font-medium text-gray-800">{doc.nombre}</td>
                                  <td className="px-5 py-3 text-xs text-gray-400 truncate max-w-xs font-mono">{doc.file.name}</td>
                                  <td className="px-5 py-3">
                                    <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">Por guardar</span>
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <div className="flex gap-2 justify-end">
                                      {preview.url && (
                                        <button
                                          type="button"
                                          onClick={() => setActivePreviewDoc(preview)}
                                          className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                        >
                                          Ver
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePendingDoc(doc.tempId)}
                                        className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}


            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <div className="flex gap-2">
                {/* Botones de navegación movidos a la derecha */}
              </div>

              <div className="flex items-center gap-3">
                {tab === 'personal' ? (
                  <button
                    type="button"
                    onClick={() => navigate('/nomina/empleados')}
                    className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-slate-600"
                  >
                    Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (tab === 'documentos') setTab('personal');
                      else if (tab === 'credenciales') setTab('documentos');
                    }}
                    className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold text-slate-600"
                  >
                    Atrás
                  </button>
                )}

                {(() => {
                  const isDirty = isEdit && ((initialForm && JSON.stringify(form) !== JSON.stringify(initialForm)) || pendingDocs.length > 0 || documentsChanged);
                  
                  if (tab === 'credenciales') {
                    return (
                      <button
                        key="btn-submit"
                        type="submit"
                        disabled={saving || (isEdit && !isDirty)}
                        className={`btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 shadow-sm ${
                          isEdit && isDirty ? '!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white' : ''
                        }`}
                      >
                        {saving && (
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" aria-hidden="true" />
                        )}
                        {isEdit ? 'Guardar Cambios' : 'Registrar Colaborador'}
                      </button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-3">
                      {isDirty && (
                        <button
                          key="btn-save-quick"
                          type="submit"
                          name="quickSave"
                          disabled={saving}
                          className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 shadow-sm !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !text-white"
                          title="Guardar cambios ahora"
                        >
                          {saving && (
                            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" aria-hidden="true" />
                          )}
                          Guardar Cambios
                        </button>
                      )}
                      <button
                        key="btn-next"
                        type="button"
                        onClick={() => {
                          if (tab === 'personal') setTab('documentos');
                          else if (tab === 'documentos') setTab('credenciales');
                        }}
                        className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                      >
                        Siguiente
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Éxito */}
      {successInfo && (
        <ModalPortal>
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/10 backdrop-blur-[5px] empleado-form-page">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full flex flex-col overflow-hidden animate-modal-in">
              {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-7.5" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">¡Colaborador Registrado!</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/nomina/empleados')}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
                title="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 sm:px-8 pb-10 pt-8 text-center flex flex-col items-center">
              <p className="text-sm text-slate-500 max-w-lg mb-8">
                Los datos de <span className="font-semibold text-slate-700">{successInfo.nombre}</span> han sido registrados. Su cuenta ha sido creada con las credenciales a continuación.
              </p>

              <div className="w-full max-w-md bg-gray-50 border border-gray-100 rounded-xl p-6 text-left mb-8 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Credenciales de Acceso</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-slate-500">Nombre de Usuario</span>
                    <span className="font-semibold text-sm text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{successInfo.username}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-slate-500">Correo Electrónico</span>
                    <span className="font-medium text-sm text-slate-700">{successInfo.correo}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Contraseña Temporal</span>
                    <span className="font-bold text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg font-mono">
                      {successInfo.contraseña}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 flex gap-2">
                  <svg className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <span>
                    El usuario ha sido habilitado con privilegios básicos (Visor). Por favor, comparta estas credenciales con el colaborador para que pueda registrar asistencia.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/nomina/empleados')}
                className="inline-flex items-center justify-center min-w-[140px] px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-sm"
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal Visor de Documentos */}
      {activePreviewDoc && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[5px] z-[1100] flex items-center justify-center p-6 md:p-12 animate-fade-in">
            <div className="relative w-full max-w-4xl max-h-[80vh] h-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-modal-in">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <div className="text-left min-w-0">
                    <h2 className="text-sm font-bold text-slate-800 truncate">Vista Previa de Documento</h2>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-lg">{activePreviewDoc.nombre}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Botón Descargar */}
                  <a
                    href={activePreviewDoc.url}
                    download={activePreviewDoc.nombre}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Descargar
                  </a>

                  <button
                    onClick={() => setActivePreviewDoc(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Viewer Content */}
              <div className="flex-1 bg-slate-900/5 overflow-hidden relative">
                {activePreviewDoc.isPdf ? (
                  <iframe
                    src={`${activePreviewDoc.url}#toolbar=0&navpanes=0`}
                    className="w-full h-full border-none bg-white"
                    title={activePreviewDoc.nombre}
                  />
                ) : activePreviewDoc.isImg ? (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-6 bg-slate-900/[0.02]">
                    <img
                      src={activePreviewDoc.url}
                      alt={activePreviewDoc.nombre}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-slate-200 bg-white"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">No hay vista previa disponible</h3>
                      <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">Este formato de archivo no se puede previsualizar directamente en el navegador. Puedes descargarlo para visualizarlo localmente.</p>
                    </div>
                    <a
                      href={activePreviewDoc.url}
                      download={activePreviewDoc.nombre}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                      Descargar archivo
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setActivePreviewDoc(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Cerrar Vista Previa
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
