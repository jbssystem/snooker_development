import type { Locale } from '@/i18n/config';

// CSS-drawn locale flags. Emoji flags don't render on Windows (they fall back to
// the bare region letters, e.g. "RU"), so we draw them with gradients/blocks to
// keep the language switcher crisp and consistent on every platform.
export function FlagIcon({ locale }: { locale: Locale }) {
  const commonClass =
    'inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[2px] border border-border-subtle shadow-sm';
  if (locale === 'ru') {
    return (
      <span
        aria-hidden="true"
        className={commonClass}
        style={{ background: 'linear-gradient(to bottom, #fff 0 33.33%, #1c57a7 33.33% 66.66%, #d52b1e 66.66% 100%)' }}
      />
    );
  }
  if (locale === 'uk') {
    return (
      <span
        aria-hidden="true"
        className={commonClass}
        style={{ background: 'linear-gradient(to bottom, #0057b7 0 50%, #ffd700 50% 100%)' }}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`${commonClass} relative bg-[#012169]`}>
      <span className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-white" />
      <span className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-white" />
      <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-[#c8102e]" />
      <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-[#c8102e]" />
    </span>
  );
}
