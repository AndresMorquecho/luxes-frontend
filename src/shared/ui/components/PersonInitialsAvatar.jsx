import { getPersonInitials, getAvatarPalette } from '../../utils/personInitials.js';

const SIZES = {
  xs: 'w-7 h-7 text-[9px] rounded-full',
  sm: 'w-9 h-9 text-[10px] rounded-full',
  md: 'w-11 h-11 text-xs rounded-full',
  lg: 'w-32 h-32 text-2xl rounded-2xl',
};

export function PersonInitialsAvatar({ name, seed, size = 'sm', className = '', image, foto }) {
  const palette = getAvatarPalette(seed || name);
  const initials = getPersonInitials(name);
  const avatarImage = image || foto;

  return (
    <div
      className={`flex items-center justify-center font-bold shrink-0 overflow-hidden uppercase leading-none tracking-tight select-none ${SIZES[size] || SIZES.sm} ${className}`}
      style={avatarImage ? undefined : { backgroundColor: palette.bg, color: palette.text }}
      title={name || undefined}
      aria-label={name ? (avatarImage ? `Avatar de: ${name}` : `Iniciales: ${initials}`) : undefined}
    >
      {avatarImage ? (
        <img src={avatarImage} alt={name} className="w-full h-full object-cover rounded-full" />
      ) : (
        <span className="block max-w-full truncate px-0.5 text-center">{initials}</span>
      )}
    </div>
  );
}
