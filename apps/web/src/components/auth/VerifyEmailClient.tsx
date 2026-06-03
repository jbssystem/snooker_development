'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api-client';
import { useRouter, Link } from '@/i18n/navigation';

type Status = 'verifying' | 'success' | 'error' | 'missing';

export function VerifyEmailClient({ token }: { token: string | null }) {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors.api');
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    (async () => {
      try {
        const session = await api.auth.verifyEmail({ token });
        setSession(session);
        setStatus('success');
        setTimeout(() => router.replace('/dashboard'), 1200);
      } catch (e) {
        setErrorCode(e instanceof ApiError ? e.code : 'generic.internal');
        setStatus('error');
      }
    })();
  }, [token, router, setSession]);

  if (status === 'verifying') {
    return <p className="text-sm text-text-secondary">{t('verify.verifying')}</p>;
  }
  if (status === 'success') {
    return (
      <div className="rounded-md border border-brand-accent/40 bg-brand-accent/10 px-4 py-3 text-sm text-text-primary">
        {t('verify.success')}
      </div>
    );
  }
  // missing or error
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-state-error/40 bg-state-error/10 px-4 py-3 text-sm text-state-error">
        {status === 'missing'
          ? t('verify.missingToken')
          : safeTranslate(tErr, errorCode ?? 'generic.internal')}
      </div>
      <Link href="/login" className="text-sm text-brand-accent hover:underline">
        {t('login.cta')}
      </Link>
    </div>
  );
}

function safeTranslate(t: (k: string) => string, code: string): string {
  try {
    return t(code);
  } catch {
    return code;
  }
}
