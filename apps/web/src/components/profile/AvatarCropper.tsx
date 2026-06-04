'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const BOX = 280;
const OUTPUT = 256;

type Labels = { zoom: string; cancel: string; save: string };

/**
 * Circular photo cropper: drag to reposition, slider to zoom, then export a
 * centered 256px square as a JPEG data URL. Self-contained, no dependencies.
 */
export function AvatarCropper({
  imageSrc,
  labels,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  labels: Labels;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imgRef.current = image;
      setNatural({ w: image.naturalWidth, h: image.naturalHeight });
      setOffset({ x: 0, y: 0 });
      setZoom(1);
    };
    image.src = imageSrc;
  }, [imageSrc]);

  if (!natural) {
    return <div className="grid h-72 place-items-center text-sm text-text-secondary">…</div>;
  }

  const coverScale = Math.max(BOX / natural.w, BOX / natural.h);
  const dispW = natural.w * coverScale * zoom;
  const dispH = natural.h * coverScale * zoom;
  const maxOffX = Math.max(0, (dispW - BOX) / 2);
  const maxOffY = Math.max(0, (dispH - BOX) / 2);
  const clampedX = clamp(offset.x, -maxOffX, maxOffX);
  const clampedY = clamp(offset.y, -maxOffY, maxOffY);
  const imgLeft = (BOX - dispW) / 2 + clampedX;
  const imgTop = (BOX - dispH) / 2 + clampedY;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, baseX: clampedX, baseY: clampedY };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: clamp(drag.baseX + (event.clientX - drag.startX), -maxOffX, maxOffX),
      y: clamp(drag.baseY + (event.clientY - drag.startY), -maxOffY, maxOffY),
    });
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const confirm = () => {
    const image = imgRef.current;
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = coverScale * zoom;
    const srcSize = BOX / scale;
    const srcX = -imgLeft / scale;
    const srcY = -imgTop / scale;
    ctx.drawImage(image, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);
    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="glass grid gap-4 rounded-xl p-4">
      <div
        className="sunken relative mx-auto touch-none overflow-hidden rounded-lg"
        style={{ width: BOX, height: BOX, maxWidth: '100%' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-selected image */}
        <img
          alt=""
          draggable={false}
          src={imageSrc}
          style={{ position: 'absolute', left: imgLeft, top: imgTop, width: dispW, height: dispH, maxWidth: 'none' }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-brand-accent/80"
          style={{ width: BOX, height: BOX, boxShadow: '0 0 0 9999px rgba(14,17,22,0.66)' }}
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-text-secondary">
        <span className="w-16 shrink-0">{labels.zoom}</span>
        <input
          className="w-full accent-brand-accent"
          max={3}
          min={1}
          onChange={(event) => setZoom(Number(event.target.value))}
          step={0.01}
          type="range"
          value={zoom}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          className="min-h-11 rounded-md border border-border-subtle px-4 py-2 text-sm text-text-secondary transition hover:border-brand-accent hover:text-text-primary"
          onClick={onCancel}
          type="button"
        >
          {labels.cancel}
        </button>
        <button className="btn-primary press" onClick={confirm} type="button">
          {labels.save}
        </button>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
