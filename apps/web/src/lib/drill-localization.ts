import type { DrillMetrics, DrillTemplate, TableLayout } from '@snooker/shared';

type Translator = {
  (key: string): string;
  raw: (key: string) => unknown;
  has?: (key: string) => boolean;
};

export function localizeDrillTemplate(template: DrillTemplate, t: Translator): DrillTemplate {
  const key = drillTranslationKey(template.id, template.name, template.defaultTableLayout?.id);
  if (!key) return template;

  return {
    ...template,
    name: text(t, `${key}.name`, template.name),
    description: text(t, `${key}.description`, template.description),
    goal: text(t, `${key}.goal`, template.goal),
    rules: text(t, `${key}.rules`, template.rules),
    successCriteria: text(t, `${key}.successCriteria`, template.successCriteria),
    metricsSchema: localizeMetrics(template.metricsSchema, t, key),
    defaultTableLayout: template.defaultTableLayout
      ? localizeLayout(template.defaultTableLayout, t, key)
      : undefined,
    tags: stringArray(t, `${key}.tags`, template.tags),
  };
}

export function localizeDrillName(id: string | undefined, fallback: string | null | undefined, t: Translator): string | undefined {
  const key = drillTranslationKey(id, fallback, undefined);
  if (!key) return fallback ?? undefined;
  return text(t, `${key}.name`, fallback ?? '');
}

function drillTranslationKey(
  id: string | undefined,
  fallbackName: string | null | undefined,
  layoutId: string | undefined,
): string | null {
  if (id?.startsWith('cmseeddrill')) return `templates.${id}`;

  const demoTemplateKey = demoTemplateKeyByLayoutId(layoutId) ?? demoTemplateKeyByName(fallbackName);
  return demoTemplateKey ? `demoTemplates.${demoTemplateKey}` : null;
}

function demoTemplateKeyByLayoutId(layoutId: string | undefined): string | null {
  if (!layoutId) return null;
  return demoTemplateIds.has(layoutId) ? layoutId : null;
}

function demoTemplateKeyByName(name: string | null | undefined): string | null {
  if (!name) return null;
  const normalizedName = normalizeDemoTemplateName(name);
  return demoTemplateNames.get(normalizedName) ?? demoTemplateKeyByPattern(normalizedName);
}

function demoTemplateKeyByPattern(normalizedName: string): string | null {
  if (normalizedName.startsWith('customer routine:') || normalizedName.includes('straight cue check')) {
    return 'customer-straight-cue';
  }
  if (normalizedName.startsWith('customer pattern:') || normalizedName.includes('black spot recovery')) {
    return 'customer-black-recovery';
  }
  if (normalizedName.startsWith('customer safety:') || normalizedName.includes('baulk lock')) {
    return 'customer-baulk-lock';
  }
  if (normalizedName.startsWith('customer match sim:') || normalizedName.startsWith('customer match simulation:')) {
    return 'customer-first-visit-30';
  }
  return null;
}

function localizeMetrics(metrics: DrillMetrics, t: Translator, key: string): DrillMetrics {
  return {
    ...metrics,
    metrics: metrics.metrics.map((metric) => ({
      ...metric,
      label: text(t, `${key}.metrics.${metric.key}`, metric.label),
    })),
  };
}

function localizeLayout(layout: TableLayout, t: Translator, key: string): TableLayout {
  return {
    ...layout,
    targetZones: layout.targetZones.map((zone) => ({
      ...zone,
      label: zone.label ? text(t, `${key}.layout.targetZones.${zone.id}`, zone.label) : zone.label,
    })),
    shotPaths: layout.shotPaths.map((path) => ({
      ...path,
      label: path.label ? text(t, `${key}.layout.shotPaths.${path.id}`, path.label) : path.label,
    })),
    annotations: layout.annotations.map((annotation) => ({
      ...annotation,
      text: text(t, `${key}.layout.annotations.${annotation.id}`, annotation.text),
    })),
  };
}

function text(t: Translator, key: string, fallback: string): string {
  // Short-circuit when the key is absent so next-intl does not log a
  // MISSING_MESSAGE error for optional labels (zones, paths, metrics, …).
  if (t.has && !t.has(key)) return fallback;
  try {
    const value = t(key);
    return value === key || value.startsWith('templates.') || value.startsWith('demoTemplates.') ? fallback : value;
  } catch {
    return fallback;
  }
}

function stringArray(t: Translator, key: string, fallback: string[]): string[] {
  if (t.has && !t.has(key)) return fallback;
  try {
    const value = t.raw(key);
    return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : fallback;
  } catch {
    return fallback;
  }
}

const demoTemplateIds = new Set([
  'customer-straight-cue',
  'customer-black-recovery',
  'customer-baulk-lock',
  'customer-first-visit-30',
]);

const demoTemplateNames = new Map([
  [normalizeDemoTemplateName('Личная рутина: 20-минутная проверка прямого кия'), 'customer-straight-cue'],
  [normalizeDemoTemplateName('Customer cue routine: 20-minute straight-cue check'), 'customer-straight-cue'],
  [normalizeDemoTemplateName('Customer straight cue: 20-minute check'), 'customer-straight-cue'],
  [normalizeDemoTemplateName('Customer routine: 20-minute straight cue check'), 'customer-straight-cue'],
  [normalizeDemoTemplateName('Личный паттерн: восстановление позиции на чёрном'), 'customer-black-recovery'],
  [normalizeDemoTemplateName('Customer pattern: black-position recovery'), 'customer-black-recovery'],
  [normalizeDemoTemplateName('Customer pattern: black spot recovery'), 'customer-black-recovery'],
  [normalizeDemoTemplateName('Customer black recovery'), 'customer-black-recovery'],
  [normalizeDemoTemplateName('Личная защита: тонкий красный и замок в баульте'), 'customer-baulk-lock'],
  [normalizeDemoTemplateName('Customer safety: thin red and baulk lock'), 'customer-baulk-lock'],
  [normalizeDemoTemplateName('Customer baulk lock'), 'customer-baulk-lock'],
  [normalizeDemoTemplateName('Личная симуляция матча: первый визит на 30+'), 'customer-first-visit-30'],
  [normalizeDemoTemplateName('Customer match sim: first visit 30+'), 'customer-first-visit-30'],
  [normalizeDemoTemplateName('Customer match simulation: first visit 30+'), 'customer-first-visit-30'],
  [normalizeDemoTemplateName('Personal match simulation: first visit to 30+'), 'customer-first-visit-30'],
]);

function normalizeDemoTemplateName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
