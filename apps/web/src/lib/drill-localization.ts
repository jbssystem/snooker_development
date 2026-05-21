import type { DrillMetrics, DrillTemplate, TableLayout } from '@snooker/shared';

type Translator = {
  (key: string): string;
  raw: (key: string) => unknown;
};

export function localizeDrillTemplate(template: DrillTemplate, t: Translator): DrillTemplate {
  const key = systemDrillKey(template.id);
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
  const key = systemDrillKey(id);
  if (!key) return fallback ?? undefined;
  return text(t, `${key}.name`, fallback ?? '');
}

function systemDrillKey(id: string | undefined): string | null {
  return id?.startsWith('cmseeddrill') ? `templates.${id}` : null;
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
  try {
    return t(key);
  } catch {
    return fallback;
  }
}

function stringArray(t: Translator, key: string, fallback: string[]): string[] {
  try {
    const value = t.raw(key);
    return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : fallback;
  } catch {
    return fallback;
  }
}
