import React from 'react';

const BANCOS = ['Pichincha', 'Guayaquil', 'Bolivariano', 'Pacifico', 'Internacional', 'Produbanco', 'Austro', 'Machala'];

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

const normalizeBancoKey = (banco = '') => {
  const trimmed = String(banco).trim();
  if (!trimmed) return '';

  if (BANCO_THEMES[trimmed]) return trimmed;

  const stripped = trimmed.replace(/^banco\s+(de(l?)\s+)?/i, '');
  if (BANCO_THEMES[stripped]) return stripped;

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

export const NominaPayBankCard = ({ banco, cuentaBanco, titular }) => {
  const theme = getBankTheme(banco);
  const light = theme.light === true;
  const bankLabel = normalizeBancoKey(banco) || banco || 'Sin banco';

  return (
    <div
      className="relative rounded-2xl p-4 sm:p-5 shadow-lg w-full max-w-[340px] mx-auto aspect-[1.586/1] flex flex-col justify-between overflow-hidden"
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

      <div className="relative flex items-start justify-between gap-2 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-7 rounded-md shrink-0 ${light ? 'border border-[#003087]/25' : 'border border-white/30'}`}
            style={{ background: `linear-gradient(135deg, ${theme.chip} 0%, ${theme.accent} 100%)` }}
          />
          <div className="min-w-0">
            <p className={`text-[9px] font-bold uppercase tracking-widest ${light ? 'text-[#003087]/65' : 'text-white/60'}`}>
              Institución financiera
            </p>
            <p className={`text-sm font-bold truncate ${light ? 'text-[#003087]' : 'text-white'}`}>
              {bankLabel}
            </p>
          </div>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${light ? 'text-[#003087]/55' : 'text-white/50'}`}>
          Débito
        </span>
      </div>

      <div className="relative z-10 space-y-3">
        <div>
          <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${light ? 'text-[#003087]/55' : 'text-white/50'}`}>
            Número de cuenta
          </p>
          <p className={`font-mono text-base sm:text-lg tracking-wider ${light ? 'text-[#003087]' : 'text-white'}`}>
            {cuentaBanco || '— — — — — — — —'}
          </p>
        </div>
        {titular && (
          <div>
            <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${light ? 'text-[#003087]/55' : 'text-white/50'}`}>
              Titular
            </p>
            <p className={`text-xs font-bold uppercase truncate ${light ? 'text-[#003087]/80' : 'text-white/90'}`}>
              {titular}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
