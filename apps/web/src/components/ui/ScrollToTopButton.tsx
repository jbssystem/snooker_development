'use client';

import { useEffect, useState } from 'react';

/**
 * Floating "back to top" button. The app scrolls at the document level (see the
 * (app) layout), so this listens to window scroll and smooth-scrolls the window.
 * Appears once the user has scrolled past `threshold` px.
 */
export function ScrollToTopButton({ label, threshold = 400 }: { label: string; threshold?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return (
    <button
      aria-hidden={!visible}
      aria-label={label}
      className={`press fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-background-elevated text-text-secondary shadow-glow transition hover:border-brand-accent hover:text-brand-accent focus-ring ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      tabIndex={visible ? 0 : -1}
      title={label}
      type="button"
    >
      <svg aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
