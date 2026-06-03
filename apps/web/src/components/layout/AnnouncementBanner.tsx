'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActiveAnnouncement } from '@snooker/shared';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api-client';

const SEVERITY_STYLES: Record<ActiveAnnouncement['severity'], string> = {
  info: 'border-brand-accent/40 bg-brand-accent/10 text-text-primary',
  warning: 'border-brand-gold/50 bg-brand-gold/10 text-text-primary',
  critical: 'border-state-error/50 bg-state-error/10 text-text-primary',
};

export function AnnouncementBanner() {
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['announcements-active', token],
    queryFn: () => api.announcements.listActive(token ?? ''),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
  const dismiss = useMutation({
    mutationFn: (id: string) => api.announcements.dismiss(token ?? '', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements-active', token] }),
  });

  const items = query.data ?? [];
  if (items.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
      <div className="flex flex-col gap-2">
        {items.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${SEVERITY_STYLES[a.severity]}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {a.title}
                {a.version && <span className="ml-2 text-xs text-text-secondary">{a.version}</span>}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-text-secondary">{a.bodyMarkdown}</p>
            </div>
            {a.dismissible && (
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss.mutate(a.id)}
                disabled={dismiss.isPending}
                className="shrink-0 rounded p-1 text-text-disabled transition hover:text-text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
