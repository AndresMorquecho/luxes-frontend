import { getPersonInitials, getAvatarPalette } from '../../utils/personInitials.js';

const SIZES = {
  sm: 'w-9 h-9 text-[10px] rounded-full',
  md: 'w-11 h-11 text-xs rounded-full',
  lg: 'w-32 h-32 text-2xl rounded-2xl',
};

export function PersonInitialsAvatar({ name, seed, size = 'sm', className = '' }) {
  const palette = getAvatarPalette(seed || name);
  const initials = getPersonInitials(name);

  return (
    <div
      className={`flex items-center justify-center font-bold shrink-0 overflow-hidden normal-case leading-none tracking-tight select-none ${SIZES[size] || SIZES.sm} ${className}`}
      style={{ backgroundColor: palette.bg, color: palette.text }}
      title={name || undefined}
      aria-hidden="true"
    >
      <span className="normal-case">{initials}</span>
    </div>
  );
}
