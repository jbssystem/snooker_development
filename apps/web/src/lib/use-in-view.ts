'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Lazy-mount helper: reports when the observed element first scrolls into view.
 * Used to defer mounting heavy previews (Konva canvases) until their card is
 * near the viewport. Once seen, the element stays "in view" and the observer
 * disconnects so we never tear a mounted canvas back down.
 */
export function useInView<T extends Element>(
  options: IntersectionObserverInit = { rootMargin: '200px' },
): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    // Older / SSR environments without IntersectionObserver: render eagerly.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return { ref, inView };
}
