'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type {
  CreateDrillTemplateInput,
  DrillCategory,
  DrillDifficulty,
  DrillMetricType,
  DrillTemplate,
  DrillVisibility,
  TableLayout,
  UserDrillVisibility,
} from '@snooker/shared';
import { Link } from '@/i18n/navigation';
import { Modal } from '@/components/layout/Modal';
import { Field, InfoTooltip, PageHeader } from '@/components/ui';
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

type VisibilityFilter = 'all' | DrillVisibility;
const visibilityFilters: VisibilityFilter[] = ['all', 'private', 'system', 'shared'];

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<DrillCategory | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DrillDifficulty | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const form = useForm<FormValues>({ defaultValues });

  const templatesQuery = useQuery({
    queryKey: ['drill-templates'],
    queryFn: () => api.drills.listTemplates(token ?? ''),
    enabled: Boolean(token),
  });

  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data]);

  // Category/difficulty narrow the pool first; visibility chip counts then
  // reflect what's left, so the numbers stay truthful as filters combine.
  const pool = useMemo(
    () =>
      templates.filter(
        (tpl) =>
          (categoryFilter === 'all' || tpl.category === categoryFilter) &&
          (difficultyFilter === 'all' || tpl.difficulty === difficultyFilter),
      ),
    [templates, categoryFilter, difficultyFilter],
  );
  const visibilityCounts = useMemo(() => {
    const counts: Record<VisibilityFilter, number> = { all: pool.length, private: 0, system: 0, shared: 0 };
    for (const template of pool) counts[template.visibility] += 1;
    return counts;
  }, [pool]);
  const visibleTemplates = useMemo(
    () => (visibilityFilter === 'all' ? pool : pool.filter((tpl) => tpl.visibility === visibilityFilter)),
    [pool, visibilityFilter],
  );
  const hasActiveFilters = visibilityFilter !== 'all' || categoryFilter !== 'all' || difficultyFilter !== 'all';
  const resetFilters = () => {
    setVisibilityFilter('all');
    setCategoryFilter('all');
    setDifficultyFilter('all');
  };

  const resetForm = () => {
    setEditingId(null);
    setServerError(null);
    setShowForm(false);
    form.reset(defaultValues);
    setMetrics([
      { key: 'attempts', label: t('defaultMetrics.attempts'), type: 'number', unit: '', required: true },
      { key: 'successes', label: t('defaultMetrics.successes'), type: 'number', unit: '', required: true },
    ]);
    setLayout(createStandardTableLayout());
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const createTemplate = useMutation({
    mutationFn: (input: CreateDrillTemplateInput) => api.drills.createTemplate(token ?? '', input),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['drill-templates'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const updateTemplate = useMutation({
    mutationFn: (input: { id: string; data: CreateDrillTemplateInput }) =>
      api.drills.updateTemplate(token ?? '', input.id, input.data),
    onSuccess: () => {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['drill-templates'] });
    },
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => api.drills.deleteTemplate(token ?? '', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drill-templates'] }),
    onError: (e) => setServerError(errorMessage(e, tErr)),
  });

  const loadIntoForm = (template: DrillTemplate, clone: boolean) => {
    // Clone uses the localized (display) text so duplicating a system/library
    // drill produces a readable editable copy; in-place edit keeps own text.
    const source = clone ? localizeDrillTemplate(template, tSystemDrills) : template;
    setEditingId(clone ? null : template.id);
    setServerError(null);
    form.reset({
      name: clone ? `${source.name} (${t('copySuffix')})` : source.name,
      category: source.category,
      difficulty: source.difficulty,
      visibility: !clone && source.visibility === 'shared' ? 'shared' : 'private',
      description: source.description,
      goal: source.goal,
      rules: source.rules,
      successCriteria: source.successCriteria,
      tags: source.tags.join(', '),
    });
    setMetrics(
      source.metricsSchema.metrics.length > 0
        ? source.metricsSchema.metrics.map((metric) => ({
            key: clone ? '' : metric.key,
            label: metric.label,
            type: metric.type,
            unit: metric.unit ?? '',
            required: metric.required ?? false,
          }))
        : [{ key: '', label: '', type: 'number', unit: '', required: false }],
    );
    setLayout(source.defaultTableLayout ?? createStandardTableLayout());
    setShowForm(true);
  };

  const submitTemplate = (values: FormValues) => {
    const data = buildTemplateInput(values, metrics, layout);
    if (editingId) {
      updateTemplate.mutate({ id: editingId, data });
    } else {
      createTemplate.mutate(data);
    }
  };

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
    <main className="min-w-0">
      <PageHeader
        eyebrow={templates.length > 0 ? t('countLabel', { count: templates.length }) : ''}
        subtitle={t('subtitle')}
        title={t('title')}
        actions={
          <button className="btn-primary" onClick={openCreate} type="button">
            + {t('newDrill')}
          </button>
        }
      />

      {templates.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label={t('filter.label')}>
          {visibilityFilters.map((filter) => (
            <FilterChip
              key={filter}
              active={visibilityFilter === filter}
              count={visibilityCounts[filter]}
              label={filter === 'all' ? t('filter.all') : t(`visibility.${filter}`)}
              onClick={() => setVisibilityFilter(filter)}
            />
          ))}

          <span aria-hidden className="mx-1 hidden h-6 w-px bg-border-subtle sm:block" />

          <FilterSelect
            active={categoryFilter !== 'all'}
            label={t('fields.category')}
            onChange={(value) => setCategoryFilter(value as DrillCategory | 'all')}
            value={categoryFilter}
          >
            <option value="all">{t('filter.allCategories')}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            active={difficultyFilter !== 'all'}
            label={t('fields.difficulty')}
            onChange={(value) => setDifficultyFilter(value as DrillDifficulty | 'all')}
            value={difficultyFilter}
          >
            <option value="all">{t('filter.allDifficulties')}</option>
            {difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {t(`difficulties.${difficulty}`)}
              </option>
            ))}
          </FilterSelect>

          {hasActiveFilters && (
            <button
              className="ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-text-secondary transition hover:text-text-primary"
              onClick={resetFilters}
              type="button"
            >
              × {t('filter.reset')}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templatesQuery.isLoading &&
          Array.from({ length: 6 }).map((_, index) => <TemplateCardSkeleton key={index} />)}
        {!templatesQuery.isLoading &&
          visibleTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              t={t}
              tSystemDrills={tSystemDrills}
              onClone={() => loadIntoForm(template, true)}
              onDelete={() => deleteTemplate.mutate(template.id)}
              onEdit={() => loadIntoForm(template, false)}
            />
          ))}
        {!templatesQuery.isLoading && templates.length === 0 && (
          <p className="surface rounded-xl p-5 text-text-secondary">
            {t('empty')}
          </p>
        )}
        {!templatesQuery.isLoading && templates.length > 0 && visibleTemplates.length === 0 && (
          <p className="surface rounded-xl p-5 text-text-secondary">
            {t('filter.noResults')}
          </p>
        )}
      </div>

      <Modal
        className="sm:max-w-2xl"
        closeLabel={t('close')}
        onClose={resetForm}
        open={showForm}
        title={editingId ? t('form.editTitle') : t('form.title')}
      >
        <form className="grid gap-4" data-testid="drill-template-form" onSubmit={form.handleSubmit(submitTemplate)}>
          {editingId && <p className="text-sm text-text-secondary">{t('form.editingSubtitle')}</p>}
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
              <span className="flex items-center gap-1.5 font-medium text-text-primary">
                {t('metrics.title')}
                <InfoTooltip label={t('metrics.title')} text={t('metrics.examples')} />
              </span>
              <button className={secondaryButtonClass} onClick={() => setMetrics((items) => [...items, emptyMetric()])} type="button">
                {t('metrics.add')}
              </button>
            </div>
            {metrics.length === 0 && <p className="text-xs text-text-disabled">{t('metrics.empty')}</p>}
            {metrics.map((metric, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_7.5rem_4.5rem_auto] items-center gap-2">
                <input
                  className={inputClass}
                  placeholder={t('metrics.label')}
                  value={metric.label}
                  onChange={(e) => updateMetric(index, { label: e.target.value }, setMetrics)}
                />
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
                  aria-label={t('metrics.remove')}
                  className="flex h-11 w-9 items-center justify-center rounded-md border border-border-subtle text-text-secondary transition hover:border-state-error hover:text-state-error"
                  onClick={() => setMetrics((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </section>

          <DrillLayoutEditor value={layout} onChange={setLayout} />

          {serverError && (
            <p className="rounded-md border border-state-error/40 bg-state-error/10 px-3 py-2 text-sm text-state-error">
              {serverError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button className={`${primaryButtonClass} flex-1`} disabled={createTemplate.isPending || updateTemplate.isPending} type="submit">
              {createTemplate.isPending || updateTemplate.isPending
                ? t('saving')
                : editingId
                  ? t('form.saveEdit')
                  : t('form.submit')}
            </button>
            {editingId && (
              <button className={secondaryButtonClass} onClick={resetForm} type="button">
                {t('form.cancelEdit')}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </main>
  );
}

function FilterChip({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-brand-accent bg-brand-accent/15 text-brand-accent shadow-[0_0_0_1px_rgba(25,169,116,0.25)]'
          : 'border-border-subtle bg-background-secondary text-text-secondary hover:border-brand-accent/60 hover:text-text-primary'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[11px] tabular-nums ${
          active ? 'bg-brand-accent/20 text-brand-accent' : 'bg-background-elevated text-text-disabled'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function FilterSelect({
  active,
  label,
  value,
  onChange,
  children,
}: {
  active: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative inline-flex items-center rounded-full border text-sm font-medium transition ${
        active
          ? 'border-brand-accent bg-brand-accent/15 text-brand-accent shadow-[0_0_0_1px_rgba(25,169,116,0.25)]'
          : 'border-border-subtle bg-background-secondary text-text-secondary hover:border-brand-accent/60 hover:text-text-primary'
      }`}
    >
      <select
        aria-label={label}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-1.5 pl-3.5 pr-8 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-border-active"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-3 h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function TemplateCardSkeleton() {
  return (
    <article className="surface flex animate-pulse flex-col rounded-xl p-4 sm:p-5" aria-hidden>
      <div className="flex gap-1.5">
        <div className="h-4 w-20 rounded-md bg-background-elevated" />
        <div className="h-4 w-16 rounded-md bg-background-elevated" />
      </div>
      <div className="mt-3 h-5 w-2/3 rounded bg-background-elevated" />
      <div className="mt-3 h-3 w-full rounded bg-background-elevated" />
      <div className="mt-2 h-3 w-4/5 rounded bg-background-elevated" />
      <div className="mt-4 h-28 rounded-lg bg-background-elevated" />
      <div className="mt-4 h-3 w-1/2 rounded bg-background-elevated" />
    </article>
  );
}

function TemplateCard({
  template,
  t,
  tSystemDrills,
  onClone,
  onDelete,
  onEdit,
}: {
  template: DrillTemplate;
  t: (key: string) => string;
  tSystemDrills: ReturnType<typeof useTranslations>;
  onClone: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const localizedTemplate = localizeDrillTemplate(template, tSystemDrills);
  const isSystem = template.visibility === 'system';

  return (
    <article
      className={`surface surface-hover flex flex-col rounded-xl p-4 sm:p-5 ${isSystem ? 'accent-top' : ''}`}
    >
      <header>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-background-elevated px-2 py-0.5 text-[11px] uppercase tracking-wide text-brand-accent">
            {t(`categories.${template.category}`)}
          </span>
          <span className={`rounded-md px-2 py-0.5 text-[11px] uppercase tracking-wide ${difficultyBadgeClass(template.difficulty)}`}>
            {t(`difficulties.${template.difficulty}`)}
          </span>
          <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${visibilityBadgeClass(template.visibility)}`}>
            {t(`visibility.${template.visibility}`)}
          </span>
        </div>
        <h2 className="mt-2 text-lg font-semibold leading-snug text-text-primary">{localizedTemplate.name}</h2>
      </header>

      <p className="mt-3 line-clamp-2 text-sm text-text-secondary">{localizedTemplate.description}</p>

      <div className="mt-4 rounded-lg border border-border-subtle bg-background-primary p-2">
        <TableLayoutPreview layout={localizedTemplate.defaultTableLayout ?? EMPTY_PREVIEW_LAYOUT} />
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <Meta label={t('fields.goal')} value={localizedTemplate.goal} />
        <Meta label={t('fields.successCriteria')} value={localizedTemplate.successCriteria} />
      </dl>

      {localizedTemplate.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {localizedTemplate.tags.map((tag) => (
            <span key={tag} className="text-xs text-text-disabled transition hover:text-brand-accent">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-border-subtle pt-4">
        {isSystem ? (
          <button className={cardButtonClass} onClick={onClone} type="button">
            {t('duplicate')}
          </button>
        ) : (
          <>
            <button className={cardButtonClass} onClick={onEdit} type="button">
              {t('edit')}
            </button>
            <button className={cardButtonClass} onClick={onClone} type="button">
              {t('duplicate')}
            </button>
            <button
              className="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition hover:border-state-error hover:text-state-error"
              onClick={onDelete}
              type="button"
            >
              {t('delete')}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

const cardButtonClass =
  'rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition hover:border-brand-accent hover:text-text-primary';

function visibilityBadgeClass(visibility: DrillTemplate['visibility']): string {
  if (visibility === 'system') return 'border-brand-gold/40 bg-brand-gold/15 text-brand-gold';
  if (visibility === 'shared') return 'border-state-info/40 bg-state-info/15 text-state-info';
  return 'border-border-subtle bg-background-elevated text-text-secondary';
}

// Color-code difficulty so the grid is scannable at a glance: cool green for
// entry levels warming to gold for the hardest.
function difficultyBadgeClass(difficulty: DrillTemplate['difficulty']): string {
  switch (difficulty) {
    case 'beginner':
      return 'bg-state-success/15 text-state-success';
    case 'intermediate':
      return 'bg-brand-accent/15 text-brand-accent';
    case 'advanced':
      return 'bg-state-warning/15 text-state-warning';
    case 'professional':
      return 'bg-brand-gold/15 text-brand-gold';
  }
}

const inputClass =
  'w-full rounded-md border border-border-subtle bg-background-primary px-3 py-2 text-text-primary placeholder:text-text-disabled focus:border-border-active focus:outline-none';
const primaryButtonClass = 'btn-primary w-full justify-center';
const secondaryButtonClass =
  'min-h-11 rounded-md border border-border-subtle px-3 py-2 text-sm text-text-secondary hover:border-brand-accent hover:text-text-primary';

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

// Auto-derive a stable metric key from its label (latin slug), falling back to a
// positional key so non-latin labels still get a unique id.
function slugifyMetric(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `metric_${index + 1}`;
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function buildTemplateInput(values: FormValues, metrics: MetricRow[], layout: TableLayout): CreateDrillTemplateInput {
  return {
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
        .filter((metric) => metric.label.trim())
        .map((metric, index) => ({
          key: metric.key.trim() || slugifyMetric(metric.label, index),
          label: metric.label.trim(),
          type: metric.type,
          unit: metric.unit.trim() || undefined,
          required: metric.required,
        })),
    },
    defaultTableLayout: layout,
  };
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
