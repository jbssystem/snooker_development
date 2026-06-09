'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Modal } from '@/components/layout/Modal';
import { ChevronDown } from '@/components/layout/ChevronDown';
import { EmptyState, Field, InfoTooltip, PageHeader } from '@/components/ui';
import { useDismissable } from '@/lib/use-dismissable';
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

type FavoriteFilter = 'all' | 'favorites';

type FormTab = 'details' | 'metrics' | 'table';
const formTabs: FormTab[] = ['details', 'metrics', 'table'];

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
  const [importingPhoto, setImportingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<DrillCategory | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DrillDifficulty | 'all'>('all');
  const [favoriteFilter, setFavoriteFilter] = useState<FavoriteFilter>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formTab, setFormTab] = useState<FormTab>('details');
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
  const byVisibility = useMemo(
    () => (visibilityFilter === 'all' ? pool : pool.filter((tpl) => tpl.visibility === visibilityFilter)),
    [pool, visibilityFilter],
  );
  const byFavorite = useMemo(
    () => (favoriteFilter === 'favorites' ? byVisibility.filter((tpl) => tpl.isFavorited) : byVisibility),
    [byVisibility, favoriteFilter],
  );
  // Free-text search across the localized name and tags.
  const visibleTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return byFavorite;
    return byFavorite.filter((tpl) => {
      const display = localizeDrillTemplate(tpl, tSystemDrills);
      const haystack = `${display.name} ${tpl.tags.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [byFavorite, search, tSystemDrills]);
  const hasActiveFilters =
    visibilityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    difficultyFilter !== 'all' ||
    favoriteFilter !== 'all' ||
    search.trim() !== '';
  const resetFilters = () => {
    setVisibilityFilter('all');
    setCategoryFilter('all');
    setDifficultyFilter('all');
    setFavoriteFilter('all');
    setSearch('');
  };

  const resetForm = () => {
    setEditingId(null);
    setServerError(null);
    setPhotoError(null);
    setImportingPhoto(false);
    setShowForm(false);
    setFormTab('details');
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

  // Open the create form when arriving via the command palette (?new=1).
  // Read from the URL directly to avoid a Suspense boundary requirement.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') {
      resetForm();
      setShowForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const toggleFavorite = useMutation({
    mutationFn: (id: string) => api.drills.toggleFavorite(token ?? '', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drill-templates'] }),
  });

  const loadIntoForm = (template: DrillTemplate, clone: boolean) => {
    // Clone uses the localized (display) text so duplicating a system/library
    // drill produces a readable editable copy; in-place edit keeps own text.
    const source = clone ? localizeDrillTemplate(template, tSystemDrills) : template;
    setEditingId(clone ? null : template.id);
    setServerError(null);
    setFormTab('details');
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

  const handleImportFromPhoto = useCallback(
    async (file: File) => {
      setPhotoError(null);
      setImportingPhoto(true);
      try {
        const imageBase64 = await resizeImageToJpegBase64(file);
        const recognized = await api.drills.recognizeLayout(token ?? '', {
          imageBase64,
          mediaType: 'image/jpeg',
          tableSize: layout.tableSize,
        });
        setLayout(recognized);
      } catch (e) {
        setPhotoError(errorMessage(e, tErr));
      } finally {
        setImportingPhoto(false);
      }
    },
    [token, layout.tableSize, tErr],
  );

  const submitTemplate = (values: FormValues) => {
    const data = buildTemplateInput(values, metrics, layout);
    if (editingId) {
      updateTemplate.mutate({ id: editingId, data });
    } else {
      createTemplate.mutate(data);
    }
  };

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
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled">
              <svg aria-hidden fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              aria-label={t('searchPlaceholder')}
              className="input-field pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchPlaceholder')}
              type="search"
              value={search}
            />
          </div>

          <FilterSelect
            active={visibilityFilter !== 'all'}
            label={t('filter.label')}
            options={visibilityFilters.map((filter) => ({
              value: filter,
              label: `${filter === 'all' ? t('filter.all') : t(`visibility.${filter}`)} (${visibilityCounts[filter]})`,
            }))}
            onChange={(value) => setVisibilityFilter(value as VisibilityFilter)}
            value={visibilityFilter}
          />

          <FilterSelect
            active={categoryFilter !== 'all'}
            label={t('fields.category')}
            options={[
              { value: 'all', label: t('filter.allCategories') },
              ...categories.map((category) => ({ value: category, label: t(`categories.${category}`) })),
            ]}
            onChange={(value) => setCategoryFilter(value as DrillCategory | 'all')}
            value={categoryFilter}
          />

          <FilterSelect
            active={difficultyFilter !== 'all'}
            label={t('fields.difficulty')}
            options={[
              { value: 'all', label: t('filter.allDifficulties') },
              ...difficulties.map((difficulty) => ({ value: difficulty, label: t(`difficulties.${difficulty}`) })),
            ]}
            onChange={(value) => setDifficultyFilter(value as DrillDifficulty | 'all')}
            value={difficultyFilter}
          />

          <button
            aria-pressed={favoriteFilter === 'favorites'}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              favoriteFilter === 'favorites'
                ? 'border-brand-gold/60 bg-brand-gold/15 text-brand-gold'
                : 'border-border-subtle bg-background-secondary text-text-secondary hover:border-brand-gold/40 hover:text-text-primary'
            }`}
            onClick={() => setFavoriteFilter((f) => (f === 'favorites' ? 'all' : 'favorites'))}
            title={t('filter.favorites')}
            type="button"
          >
            <StarIcon filled={favoriteFilter === 'favorites'} />
            {t('filter.favorites')}
          </button>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              onToggleFavorite={() => toggleFavorite.mutate(template.id)}
            />
          ))}
        {!templatesQuery.isLoading && templates.length === 0 && (
          <EmptyState
            className="col-span-full"
            illustration
            title={t('empty')}
            action={
              <button className="btn-primary" onClick={openCreate} type="button">
                + {t('newDrill')}
              </button>
            }
          />
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
        <form className="grid gap-4" data-testid="drill-template-form" onSubmit={form.handleSubmit(submitTemplate, () => setFormTab('details'))}>
          {editingId && <p className="text-sm text-text-secondary">{t('form.editingSubtitle')}</p>}

          <div className="sunken flex gap-1 rounded-lg p-1" role="tablist">
            {formTabs.map((tab) => (
              <button
                key={tab}
                aria-selected={formTab === tab}
                className={`press flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                  formTab === tab
                    ? 'bg-background-elevated text-brand-accent shadow-elev-1 ring-1 ring-brand-accent/30'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setFormTab(tab)}
                role="tab"
                type="button"
              >
                {t(`form.tabs.${tab}`)}
              </button>
            ))}
          </div>

          <div className={formTab === 'details' ? 'grid gap-4' : 'hidden'}>
            <Field error={form.formState.errors.name?.message} hint={t('hints.name')} label={t('fields.name')}>
              <input
                className={inputClass}
                placeholder={t('placeholders.name')}
                {...form.register('name', { required: t('required') })}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
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
              <Field hint={t('hints.visibility')} label={t('fields.visibility')}>
                <select className={inputClass} {...form.register('visibility')}>
                  <option value="private">{t('visibility.private')}</option>
                  <option value="shared">{t('visibility.shared')}</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field error={form.formState.errors.description?.message} hint={t('hints.description')} label={t('fields.description')}>
                <textarea
                  className={`${inputClass} min-h-16`}
                  placeholder={t('placeholders.description')}
                  {...form.register('description', { required: t('required') })}
                />
              </Field>
              <Field error={form.formState.errors.goal?.message} hint={t('hints.goal')} label={t('fields.goal')}>
                <textarea
                  className={`${inputClass} min-h-16`}
                  placeholder={t('placeholders.goal')}
                  {...form.register('goal', { required: t('required') })}
                />
              </Field>
              <Field error={form.formState.errors.rules?.message} hint={t('hints.rules')} label={t('fields.rules')}>
                <textarea
                  className={`${inputClass} min-h-16`}
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
                  className={`${inputClass} min-h-16`}
                  placeholder={t('placeholders.successCriteria')}
                  {...form.register('successCriteria', { required: t('required') })}
                />
              </Field>
            </div>
            <Field hint={t('hints.tags')} label={t('fields.tags')}>
              <input className={inputClass} placeholder={t('placeholders.tags')} {...form.register('tags')} />
            </Field>
          </div>

          <section className={formTab === 'metrics' ? 'grid gap-3 rounded-md border border-border-subtle bg-background-primary p-3' : 'hidden'}>
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

          <div className={formTab === 'table' ? 'block' : 'hidden'}>
            <DrillLayoutEditor
              value={layout}
              onChange={setLayout}
              onImportFromPhoto={handleImportFromPhoto}
              importing={importingPhoto}
              importError={photoError}
            />
          </div>

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

type FilterOption = { value: string; label: string };

function FilterSelect({
  active,
  label,
  value,
  options,
  onChange,
}: {
  active: boolean;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
          active
            ? 'border-brand-accent bg-brand-accent/15 text-brand-accent shadow-[0_0_0_1px_rgba(25,169,116,0.25)]'
            : 'border-border-subtle bg-background-secondary text-text-secondary hover:border-brand-accent/60 hover:text-text-primary'
        }`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {selectedLabel}
        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          className="absolute left-0 z-30 mt-2 max-h-72 w-60 overflow-y-auto rounded-md border border-border-subtle bg-background-secondary py-1 shadow-glow"
          role="listbox"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                aria-selected={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                  selected
                    ? 'bg-background-elevated text-brand-accent'
                    : 'text-text-secondary hover:bg-background-elevated hover:text-text-primary'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.label}
                {selected && (
                  <svg aria-hidden className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
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
  onToggleFavorite,
}: {
  template: DrillTemplate;
  t: (key: string) => string;
  tSystemDrills: ReturnType<typeof useTranslations>;
  onClone: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
}) {
  const localizedTemplate = localizeDrillTemplate(template, tSystemDrills);
  const isSystem = template.visibility === 'system';

  return (
    <article
      className={`surface surface-hover relative flex flex-col rounded-xl p-4 sm:p-5 ${isSystem ? 'accent-top' : ''}`}
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

      <TablePreview
        layout={localizedTemplate.defaultTableLayout ?? EMPTY_PREVIEW_LAYOUT}
        title={localizedTemplate.name}
        t={t}
      />

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

      {/* Star button — bottom-right corner */}
      <button
        aria-label={template.isFavorited ? t('favorite.remove') : t('favorite.add')}
        className={`press absolute bottom-4 right-4 rounded-full p-1.5 transition focus-ring ${
          template.isFavorited
            ? 'text-brand-gold hover:text-brand-gold/70'
            : 'text-text-disabled hover:text-brand-gold'
        }`}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        title={template.isFavorited ? t('favorite.remove') : t('favorite.add')}
        type="button"
      >
        <StarIcon filled={template.isFavorited} />
      </button>
    </article>
  );
}

/**
 * Drill table thumbnail that enlarges for a closer look. On pointer devices the
 * thumbnail scales up on hover; on every device (incl. touch) tapping it opens a
 * full-size preview in a modal — so the small table stays readable everywhere.
 */
function TablePreview({
  layout,
  title,
  t,
}: {
  layout: TableLayout;
  title: string;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={t('enlargePreview')}
        className="group/preview sunken mt-4 block w-full overflow-hidden rounded-lg border border-border-subtle p-2 transition focus-ring hover:border-brand-accent/60"
        onClick={() => setOpen(true)}
        title={t('enlargePreview')}
        type="button"
      >
        <span className="block origin-center transition-transform duration-200 ease-out group-hover/preview:scale-[1.06]">
          <TableLayoutPreview layout={layout} />
        </span>
      </button>

      <Modal className="sm:max-w-3xl" closeLabel={t('close')} onClose={() => setOpen(false)} open={open} title={title}>
        <div className="sunken rounded-lg border border-border-subtle p-2 sm:p-3">
          <TableLayoutPreview layout={layout} />
        </div>
      </Modal>
    </>
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

const inputClass = 'input-field';
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

// Re-encode the chosen photo to a downscaled JPEG before upload: keeps the
// synchronous request small (long edge ≤ 1600px) and normalises any browser-
// decodable format to image/jpeg so the API only ever sees one media type.
async function resizeImageToJpegBase64(file: File, maxEdge = 1600, quality = 0.85): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode image'));
    image.src = src;
  });
}

const EMPTY_PREVIEW_LAYOUT = createEmptyTableLayout('empty-preview');

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

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
