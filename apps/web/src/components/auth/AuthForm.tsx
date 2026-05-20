'use client';

import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { api, ApiError } from '@/lib/api-client';
import { useRouter } from '@/i18n/navigation';

type Mode = 'login' | 'register';
type FormValues = { email: string; password: string; displayName?: string };

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations('auth');
  const tErr = useTranslations('errors.api');
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const session =
        mode === 'login'
          ? await api.auth.login({ email: values.email, password: values.password })
          : await api.auth.register({
              email: values.email,
              password: values.password,
              displayName: values.displayName ?? '',
            });
      setSession(session);
      router.replace('/dashboard');
    } catch (e) {
      if (e instanceof ApiError) {
        setServerError(safeTranslate(tErr, e.code));
      } else {
        setServerError(safeTranslate(tErr, 'generic.internal'));
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {mode === 'register' && (
        <Field
          label={t('fields.displayName')}
          error={formState.errors.displayName?.message}
        >
          <input
            type="text"
            autoComplete="name"
            required
            {...register('displayName', { required: t('errors.required') })}
            className={inputClass}
          />
        </Field>
      )}

      <Field label={t('fields.email')} error={formState.errors.email?.message}>
        <input
          type="email"
          autoComplete="email"
          required
          {...register('email', { required: t('errors.required') })}
          className={inputClass}
        />
      </Field>

      <Field label={t('fields.password')} error={formState.errors.password?.message}>
        <input
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'register' ? 8 : 1}
          {...register('password', { required: t('errors.required') })}
          className={inputClass}
        />
      </Field>

      {serverError && (
        <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-brand-primary px-4 py-2.5 font-medium text-text-primary shadow-glow transition hover:bg-brand-accent disabled:opacity-60"
      >
        {submitting ? t('submitting') : mode === 'login' ? t('login.cta') : t('register.cta')}
      </button>
    </form>
  );
}

const inputClass =
  'w-full rounded-md border border-border-subtle bg-background-secondary px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
      {error && <span className="text-xs text-state-error">{error}</span>}
    </label>
  );
}

function safeTranslate(t: (k: string) => string, code: string): string {
  try {
    return t(code);
  } catch {
    return code;
  }
}
