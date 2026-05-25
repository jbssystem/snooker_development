'use client';

import { useEffect, useRef, type RefObject } from 'react';

export function useDismissable<T extends HTMLElement>(
  open: boolean,
  onDismiss: () => void,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: PointerEvent) => {
      const node = ref.current;
      if (!node) return;
      if (event.target instanceof Node && node.contains(event.target)) return;
      onDismiss();
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onDismiss]);

  return ref;
}
