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
  // Set after a successful registration → show "check your email" panel.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  // Set when login is rejected because the email is not verified yet.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setUnverifiedEmail(null);
    setSubmitting(true);
    try {
      if (mode === 'register') {
        const result = await api.auth.register({
          email: values.email,
          password: values.password,
          displayName: values.displayName ?? '',
        });
        setPendingEmail(result.email);
        return;
      }
      const session = await api.auth.login({ email: values.email, password: values.password });
      setSession(session);
      router.replace('/dashboard');
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'auth.emailNotVerified') {
          setUnverifiedEmail(values.email);
        }
        setServerError(safeTranslate(tErr, e.code));
      } else {
        setServerError(safeTranslate(tErr, 'generic.internal'));
      }
    } finally {
      setSubmitting(false);
    }
  });

  async function resend(email: string) {
    setResendState('sending');
    try {
      await api.auth.resendVerification({ email });
    } catch {
      /* resend always succeeds silently server-side */
    } finally {
      setResendState('sent');
    }
  }

  if (pendingEmail) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-brand-accent/40 bg-brand-accent/10 px-4 py-3 text-sm text-text-primary">
          <p className="font-medium">{t('verify.checkEmailTitle')}</p>
          <p className="mt-1 text-text-secondary">{t('verify.checkEmailBody', { email: pendingEmail })}</p>
        </div>
        <ResendButton
          label={resendState === 'sent' ? t('verify.resent') : t('verify.resend')}
          disabled={resendState !== 'idle'}
          onClick={() => resend(pendingEmail)}
        />
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {mode === 'register' && (
        <Field label={t('fields.displayName')} error={formState.errors.displayName?.message}>
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
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 8 : 1}
            {...register('password', { required: t('errors.required') })}
            className={`${inputClass} pr-11`}
          />
          <button
            type="button"
            aria-label={showPassword ? t('togglePassword.hide') : t('togglePassword.show')}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary transition hover:text-text-primary"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </Field>

      {serverError && (
        <div className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
          <p>{serverError}</p>
          {unverifiedEmail && (
            <button
              type="button"
              disabled={resendState !== 'idle'}
              onClick={() => resend(unverifiedEmail)}
              className="mt-2 font-medium text-brand-accent hover:underline disabled:opacity-60"
            >
              {resendState === 'sent' ? t('verify.resent') : t('verify.resend')}
            </button>
          )}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
        {submitting ? t('submitting') : mode === 'login' ? t('login.cta') : t('register.cta')}
      </button>
    </form>
  );
}

const inputClass = 'input-field';

function ResendButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-subtle px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:border-brand-accent hover:text-text-primary disabled:opacity-60"
    >
      {label}
    </button>
  );
}

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

function EyeIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.5-7 9.75-7 9.75 7 9.75 7-3.5 7-9.75 7-9.75-7-9.75-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58a3 3 0 004.24 4.24" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.36 5.36A9.3 9.3 0 0112 5c6.25 0 9.75 7 9.75 7a16.7 16.7 0 01-3.06 3.94M6.3 6.3A16.7 16.7 0 002.25 12s3.5 7 9.75 7a9.3 9.3 0 003.36-.63" />
    </svg>
  );
}

function safeTranslate(t: (k: string) => string, code: string): string {
  try {
    return t(code);
  } catch {
    return code;
  }
}
