'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import type { useTranslations } from 'next-intl';
import { Modal } from '@/components/layout/Modal';
import { AvatarCropper } from './AvatarCropper';
import { AVATAR_PRESET_IDS, PlayerAvatar } from './PlayerAvatar';

export function AvatarPicker({
  open,
  value,
  name,
  onClose,
  onChange,
  t,
}: {
  open: boolean;
  value?: string | null;
  name: string;
  onClose: () => void;
  onChange: (value: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const close = () => {
    setCropSrc(null);
    onClose();
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <Modal closeLabel={t('avatar.close')} onClose={close} open={open} title={t('avatar.title')}>
      {cropSrc ? (
        <AvatarCropper
          imageSrc={cropSrc}
          labels={{ zoom: t('avatar.zoom'), cancel: t('avatar.cancel'), save: t('avatar.save') }}
          onCancel={() => setCropSrc(null)}
          onConfirm={(dataUrl) => {
            onChange(dataUrl);
            close();
          }}
        />
      ) : (
        <div className="grid gap-5">
          <div className="flex justify-center">
            <PlayerAvatar avatar={value ?? null} className="h-24 w-24 ring-2 ring-border-subtle" name={name} />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-disabled">{t('avatar.presets')}</p>
            <div className="grid grid-cols-6 gap-3">
              {AVATAR_PRESET_IDS.map((id) => {
                const active = value === `preset:${id}`;
                return (
                  <button
                    key={id}
                    aria-label={id}
                    className={`rounded-full ring-2 transition ${active ? 'ring-brand-accent' : 'ring-transparent hover:ring-border-active'}`}
                    onClick={() => {
                      onChange(`preset:${id}`);
                      close();
                    }}
                    type="button"
                  >
                    <PlayerAvatar avatar={`preset:${id}`} className="h-12 w-12" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <input accept="image/*" className="hidden" onChange={handleFile} ref={fileRef} type="file" />
            <button className="btn-primary w-full justify-center" onClick={() => fileRef.current?.click()} type="button">
              {t('avatar.upload')}
            </button>
            <p className="mt-2 text-xs text-text-disabled">{t('avatar.hint')}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
