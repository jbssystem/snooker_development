'use client';

import { useTranslations } from 'next-intl';
import type { DrillTemplate } from '@snooker/shared';
import { Modal } from '@/components/layout/Modal';
import { TableLayoutPreview } from '@/components/table-renderer';
import { localizeDrillTemplate } from '@/lib/drill-localization';

/**
 * Reusable drill details modal: shows the drill's table layout (image) plus its
 * description, goal, rules and success criteria. Pass the raw (un-localized)
 * template — localization happens here so callers can stay simple.
 */
export function DrillDetailsModal({
  template,
  open,
  onClose,
}: {
  template: DrillTemplate | null;
  open: boolean;
  onClose: () => void;
}) {
  const tDrills = useTranslations('drills');
  const tSystemDrills = useTranslations('systemDrills');
  const tActions = useTranslations('training.actions');

  const view = template ? localizeDrillTemplate(template, tSystemDrills) : null;

  return (
    <Modal
      closeLabel={tActions('close')}
      enableFullscreen
      exitFullscreenLabel={tActions('exitFullscreen')}
      fullscreenLabel={tActions('fullscreen')}
      onClose={onClose}
      open={open && view !== null}
      title={view?.name ?? ''}
    >
      {view && <DrillDetailsBody template={view} tDrills={tDrills} />}
    </Modal>
  );
}

function DrillDetailsBody({
  template,
  tDrills,
}: {
  template: DrillTemplate;
  tDrills: ReturnType<typeof useTranslations>;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: tDrills('fields.description'), value: template.description },
    { label: tDrills('fields.goal'), value: template.goal },
    { label: tDrills('fields.rules'), value: template.rules },
    { label: tDrills('fields.successCriteria'), value: template.successCriteria },
  ];
  return (
    <div className="grid gap-3">
      {template.defaultTableLayout && (
        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-border-subtle">
          <TableLayoutPreview layout={template.defaultTableLayout} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-md bg-background-elevated px-2.5 py-1 text-xs text-text-secondary shadow-elev-1">
          {tDrills(`categories.${template.category}`)}
        </span>
        <span className="rounded-md bg-background-elevated px-2.5 py-1 text-xs text-text-secondary shadow-elev-1">
          {tDrills(`difficulties.${template.difficulty}`)}
        </span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="sunken rounded-lg px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-disabled">{row.label}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">{row.value}</p>
        </div>
      ))}
      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {template.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border-subtle px-2 py-0.5 text-xs text-text-disabled">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
