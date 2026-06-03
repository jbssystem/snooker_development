type WordmarkProps = {
  label: string;
  className?: string;
};

/**
 * Crisp SVG wordmark for the pre-login hero. Replaces the stretched logo.png:
 * a cue-and-ball glyph next to the product name, scaling cleanly at any size.
 */
export function Wordmark({ label, className }: WordmarkProps) {
  return (
    <div className={className} role="img" aria-label={label}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent/30 to-brand-primary/5 text-brand-accent ring-1 ring-brand-accent/25">
          <svg
            aria-hidden="true"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* cue */}
            <path d="M4 4.5 13 13.5" />
            <rect x="2.5" y="2" width="3.5" height="5.5" rx="1" transform="rotate(-45 4.25 4.75)" />
            {/* ball */}
            <circle cx="16.5" cy="16.5" r="4.5" />
            <circle cx="16.5" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-text-primary">Snooker </span>
          <span className="text-gradient">Player OS</span>
        </span>
      </div>
    </div>
  );
}
