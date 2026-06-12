// Renders a player avatar: a cropped photo (data URL), a coloured preset with a
// person glyph, or initials as a final fallback.

export const AVATAR_PRESETS: Record<string, [string, string]> = {
  emerald: ['#12815C', '#1FBE8A'],
  sky: ['#1E5FB3', '#59A7F0'],
  gold: ['#9D7E16', '#D3B16C'],
  rose: ['#9E4E6A', '#F08FB0'],
  violet: ['#5B3FB3', '#8B6DF0'],
  slate: ['#3A4452', '#7A8694'],
};

export const AVATAR_PRESET_IDS = Object.keys(AVATAR_PRESETS);

function PersonGlyph() {
  return (
    <svg aria-hidden="true" className="h-1/2 w-1/2 text-white/90" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0Z" />
    </svg>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const value = parts.slice(0, 2).map((p) => p[0]).join('');
  return value.toUpperCase() || '?';
}

export function PlayerAvatar({
  avatar,
  name = '',
  className = 'h-12 w-12',
}: {
  avatar?: string | null;
  name?: string;
  className?: string;
}) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`;

  if (avatar && avatar.startsWith('data:image/')) {
    // eslint-disable-next-line @next/next/no-img-element -- user data URL, not a static asset
    return <img alt={name} className={`${base} object-cover`} src={avatar} />;
  }

  if (avatar && avatar.startsWith('preset:')) {
    const id = avatar.slice('preset:'.length);
    const colors = AVATAR_PRESETS[id];
    if (colors) {
      return (
        <span
          aria-label={name || undefined}
          className={base}
          style={{ backgroundImage: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
        >
          <PersonGlyph />
        </span>
      );
    }
  }

  return (
    <span className={`${base} bg-brand-primary text-sm font-semibold uppercase text-text-primary`}>
      {initials(name)}
    </span>
  );
}
