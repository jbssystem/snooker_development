'use client';

import { useEffect, useState } from 'react';

export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`glass sticky top-0 z-20 transition-all duration-200 ${
        compact ? 'shadow-elev-2' : 'shadow-none'
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 transition-all duration-200 sm:px-4 md:gap-4 md:px-6 ${
          compact ? 'py-1.5' : 'py-3'
        }`}
      >
        {children}
      </div>
    </header>
  );
}