'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  CreateDrillTemplateInput,
  DrillCategory,
  DrillDifficulty,
  DrillMetricType,
  DrillTemplate,
  TableLayout,
  UserDrillVisibility,
} from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { AccordionSection } from '@/components/layout/AccordionSection';
import { PageHeader } from '@/components/ui';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { localizeDrillTemplate } from '@/lib/drill-localization';
import {
  DrillLayoutEditor,
  TableLayoutPreview,
  createEmptyTableLayout,
  createStandardTableLayout,
} from '@/components/table-renderer';

type FormValues = {
  name: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  visibility: UserDrillVisibility;
  description: string;
  goal: string;
  rules: string;
  successCriteria: string;
  tags: string;
};

type MetricRow = {
  key: string;
  label: string;
  type: DrillMetricType;
  unit: string;
  required: boolean;
};

const categories: DrillCategory[] = [
  'cue_action',
  'potting',
  'positional_play',
  'break_building',
  'safety',
  'snooker_escape',
  'tactical_play',
  'match_simulation',
  'pressure_training',
  'mental_routine',
  'custom',
];
const difficulties: DrillDifficulty[] = ['beginner', 'intermediate', 'advanced', 'professional'];
const metricTypes: DrillMetricType[] = ['number', 'boolean', 'percentage', 'time_ms', 'text'];

const defaultValues: FormValues = {
  name: '',
  category: 'potting',
  difficulty: 'beginner',
  visibility: 'private',
  description: '',
  goal: '',
  rules: '',
  successCriteria: '',
  tags: '',
};

export function DrillLibraryClient() {
  const t = useTranslations('drills');
  const tSystemDrills = useTranslations('systemDrills');
  const tErr = useTranslations('errors.api');
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricRow[]>([
    { key: 'attempts', label: t('defaultMetrics.attempts'), type: 'number', unit: '', required: true },
    { key: 'successes', label: t('defaultMetrics.successes'), type: 'number', unit: '', required: true },
  ]);
  const [layout, setLayout] = useState<TableLayout>(() => createStandardTableLayout());
  const form = useForm<FormValues>({ defaultValues });

  const templatesQuery = useQuery({
    queryKey: ['drill-templates'],
    queryFn: () => api.drills.listTemplates(token ?? ''),
    enabled: Boolean(token),
  });

  const createTemplate = useMutation({
    mutationFn: (input: CreateDrillTemplateInput) => api.drills.createTemplate(token ?? '', input),
    onSuccess: () => {
      setServerError(null);
      form.reset(defaultValues);
      setMetrics([
        { key: 'attempts', label: t('defaultMetrics.attempts'), type: 'number', unit: '', required: true },
        { key: 'successes', label: t('defaultMetrics.successes'), type: 'number', unit: '', required: true },
      ]);
      setLayout(createStandardTableLayout());
      queryClient.invalidateQueries({ queryKey: ['drill-templates'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => api.drills.deleteTemplate(token ?? '', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drill-templates'] }),
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  if (!token) {
    return (
      <main className="max-w-2xl">
        <PageHeader subtitle={t('authRequired')} title={t('title')} />
        <Link href="/login" className="btn-primary">
          {t('loginCta')}
        </Link>
      </main>
    );
  }

  return (
    <main className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      <section className="min-w-0">
        <PageHeader subtitle={t('subtitle')} title={t('title')} />

        <div className="grid gap-4 md:grid-cols-2">
          {(templatesQuery.data ?? []).map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              t={t}
              tSystemDrills={tSystemDrills}
              onDelete={() => deleteTemplate.mutate(template.id)}
            />
          ))}
          {templatesQuery.data?.length === 0 && (
            <p className="surface rounded-xl p-5 text-text-secondary">
              {t('empty')}
            </p>
          )}
        </div>
      </section>

      <aside className="content-start">
        <AccordionSection defaultOpen testId="drill-template-form" title={t('form.title')}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) =>
              createTemplate.mutate({
                name: values.name,
                category: values.category,
                difficulty: values.difficulty,
                visibility: values.visibility,
                description: values.description,
                goal: values.goal,
                rules: values.rules,
                successCriteria: values.successCriteria,
                tags: parseTags(values.tags),
                metricsSchema: {
                  version: 1,
                  metrics: metrics
                    .filter((metric) => metric.key.trim() && metric.label.trim())
                    .map((metric) => ({
                      key: metric.key.trim(),
                      label: metric.label.trim(),
                      type: metric.type,
                      unit: metric.unit.trim() || undefined,
                      required: metric.required,
                    })),
                },
                defaultTableLayout: layout,
              }),
            )}
          >
          <Field error={form.formState.errors.name?.message} hint={t('hints.name')} label={t('fields.name')}>
            <input
              className={inputClass}
              placeholder={t('placeholders.name')}
              {...form.register('name', { required: t('required') })}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field hint={t('hints.category')} label={t('fields.category')}>
              <select className={inputClass} {...form.register('category')}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {t(`categories.${category}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field hint={t('hints.difficulty')} label={t('fields.difficulty')}>
              <select className={inputClass} {...form.register('difficulty')}>
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {t(`difficulties.${difficulty}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field hint={t('hints.visibility')} label={t('fields.visibility')}>
            <select className={inputClass} {...form.register('visibility')}>
              <option value="private">{t('visibility.private')}</option>
              <option value="shared">{t('visibility.shared')}</option>
            </select>
          </Field>

          <Field error={form.formState.errors.description?.message} hint={t('hints.description')} label={t('fields.description')}>
            <textarea
              className={`${inputClass} min-h-20`}
              placeholder={t('placeholders.description')}
              {...form.register('description', { required: t('required') })}
            />
          </Field>
          <Field error={form.formState.errors.goal?.message} hint={t('hints.goal')} label={t('fields.goal')}>
            <textarea
              className={`${inputClass} min-h-20`}
              placeholder={t('placeholders.goal')}
              {...form.register('goal', { required: t('required') })}
            />
          </Field>
          <Field error={form.formState.errors.rules?.message} hint={t('hints.rules')} label={t('fields.rules')}>
            <textarea
              className={`${inputClass} min-h-24`}
              placeholder={t('placeholders.rules')}
              {...form.register('rules', { required: t('required') })}
            />
          </Field>
          <Field
            error={form.formState.errors.successCriteria?.message}
            hint={t('hints.successCriteria')}
            label={t('fields.successCriteria')}
          >
            <textarea
              className={`${inputClass} min-h-20`}
              placeholder={t('placeholders.successCriteria')}
              {...form.register('successCriteria', { required: t('required') })}
            />
          </Field>
          <Field hint={t('hints.tags')} label={t('fields.tags')}>
            <input className={inputClass} placeholder={t('placeholders.tags')} {...form.register('tags')} />
          </Field>

          <section className="grid gap-3 rounded-md border border-border-subtle bg-background-primary p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium text-text-primary">{t('metrics.title')}</h3>
              <button className={secondaryButtonClass} onClick={() => setMetrics((items) => [...items, emptyMetric()])} type="button">
                {t('metrics.add')}
              </button>
            </div>
            {metrics.map((metric, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border-subtle p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder={t('metrics.key')}
                    value={metric.key}
                    onChange={(e) => updateMetric(index, { key: e.target.value }, setMetrics)}
                  />
                  <input
                    className={inputClass}
                    placeholder={t('metrics.label')}
                    value={metric.label}
                    onChange={(e) => updateMetric(index, { label: e.target.value }, setMetrics)}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <select
                    className={inputClass}
                    value={metric.type}
                    onChange={(e) => updateMetric(index, { type: e.target.value as DrillMetricType }, setMetrics)}
                  >
                    {metricTypes.map((type) => (
                      <option key={type} value={type}>
                        {t(`metricTypes.${type}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    placeholder={t('metrics.unit')}
                    value={metric.unit}
                    onChange={(e) => updateMetric(index, { unit: e.target.value }, setMetrics)}
                  />
                  <button
                    className="min-h-11 rounded-md border border-border-subtle px-2 text-sm text-text-secondary hover:border-state-error hover:text-state-error"
                    onClick={() => setMetrics((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                    type="button"
                  >
                    {t('metrics.remove')}
                  </button>
                </div>
              </div>
            ))}
          </section>

          <DrillLayoutEditor value={layout} onChange={setLayout} />

          {serverError && (
            <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
              {serverError}
            </p>
          )}

          <button className={primaryButtonClass} disabled={createTemplate.isPending} type="submit">
            {createTemplate.isPending ? t('saving') : t('form.submit')}
          </button>
        </form>
        </AccordionSection>
      </aside>
    </main>
  );
}

function TemplateCard({
  template,
  t,
  tSystemDrills,
  onDelete,
}: {
  template: DrillTemplate;
  t: (key: string) => string;
  tSystemDrills: ReturnType<typeof useTranslations>;
  onDelete: () => void;
}) {
  const localizedTemplate = localizeDrillTemplate(template, tSystemDrills);

  return (
    <article className="surface rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{localizedTemplate.name}</h2>
          <p className="mt-1 text-xs uppercase text-brand-accent">
            {t(`categories.${template.category}`)} · {t(`difficulties.${template.difficulty}`)}
          </p>
        </div>
        {template.visibility !== 'system' && (
          <button
            className="rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:border-state-error hover:text-state-error"
            onClick={onDelete}
            type="button"
          >
            {t('delete')}
          </button>
        )}
      </div>
      <p className="mt-3 text-sm text-text-secondary">{localizedTemplate.description}</p>
      <div className="mt-4">
        <TableLayoutPreview layout={localizedTemplate.defaultTableLayout ?? EMPTY_PREVIEW_LAYOUT} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <Meta label={t('fields.goal')} value={localizedTemplate.goal} />
        <Meta label={t('fields.successCriteria')} value={localizedTemplate.successCriteria} />
      </dl>
      {localizedTemplate.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {localizedTemplate.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-background-primary px-2 py-1 text-xs text-text-secondary">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

const inputClass =
  'w-full rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none';
const primaryButtonClass = 'btn-primary w-full justify-center';
const secondaryButtonClass =
  'min-h-11 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary hover:border-brand-accent hover:text-text-primary';

function Field({
  children,
  error,
  hint,
  label,
}: {
  children: React.ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
      {hint && <span className="text-xs leading-5 text-text-disabled">{hint}</span>}
      {error && <span className="text-xs text-state-error">{error}</span>}
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-disabled">{label}</dt>
      <dd className="text-text-secondary">{value}</dd>
    </div>
  );
}

function updateMetric(
  index: number,
  patch: Partial<MetricRow>,
  setMetrics: React.Dispatch<React.SetStateAction<MetricRow[]>>,
): void {
  setMetrics((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
}

function emptyMetric(): MetricRow {
  return { key: '', label: '', type: 'number', unit: '', required: false };
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

const EMPTY_PREVIEW_LAYOUT = createEmptyTableLayout('empty-preview');

function errorMessage(e: unknown, t: (key: string) => string): string {
  if (e instanceof ApiError) {
    try {
      return t(e.code);
    } catch {
      return e.code;
    }
  }
  try {
    return t('generic.internal');
  } catch {
    return 'generic.internal';
  }
}
