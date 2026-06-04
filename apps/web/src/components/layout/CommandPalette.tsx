'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useHotkey } from '@/lib/use-hotkeys';
import {
  AiIcon,
  AnalyticsIcon,
  CalendarIcon,
  DashboardIcon,
  DrillsIcon,
  ExternalIcon,
  MatchesIcon,
  PlusIcon,
  ProfileIcon,
  TrainingIcon,
} from '@/components/ui/icons';

type Item = {
  id: string;
  label: string;
  group: 'navigate' | 'actions';
  href: string;
  Icon: ComponentType<{ className?: string }>;
};

/**
 * Global command palette (Cmd/Ctrl+K). Jump between sections or fire a quick
 * "create" action. Quick actions append `?new=1`; target pages open their
 * create modal when they see it.
 */
export function CommandPalette() {
  const t = useTranslations('command');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useHotkey('mod+k', () => setOpen((v) => !v), { allowInInput: true });

  // The header trigger (and anything else) can open the palette by dispatching
  // this event, so the button doesn't need shared state.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('commandpalette:open', onOpen);
    return () => window.removeEventListener('commandpalette:open', onOpen);
  }, []);

  const items = useMemo<Item[]>(
    () => [
      { id: 'dashboard', label: tNav('dashboard'), group: 'navigate', href: '/dashboard', Icon: DashboardIcon },
      { id: 'training', label: tNav('training'), group: 'navigate', href: '/training', Icon: TrainingIcon },
      { id: 'drills', label: tNav('drills'), group: 'navigate', href: '/drills', Icon: DrillsIcon },
      { id: 'matches', label: tNav('matches'), group: 'navigate', href: '/matches', Icon: MatchesIcon },
      { id: 'calendar', label: tNav('calendar'), group: 'navigate', href: '/calendar', Icon: CalendarIcon },
      { id: 'ai', label: tNav('ai'), group: 'navigate', href: '/ai', Icon: AiIcon },
      { id: 'analytics', label: tNav('analytics'), group: 'navigate', href: '/analytics', Icon: AnalyticsIcon },
      { id: 'externalData', label: tNav('externalData'), group: 'navigate', href: '/external-data', Icon: ExternalIcon },
      { id: 'profile', label: tNav('profile'), group: 'navigate', href: '/profile', Icon: ProfileIcon },
      { id: 'newSession', label: t('newSession'), group: 'actions', href: '/training?new=1', Icon: PlusIcon },
      { id: 'newExercise', label: t('newExercise'), group: 'actions', href: '/drills?new=1', Icon: PlusIcon },
      { id: 'newMatch', label: t('newMatch'), group: 'actions', href: '/matches?new=1', Icon: PlusIcon },
    ],
    [t, tNav],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  // Reset transient state whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the element mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  if (!open) return null;

  const go = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href as never);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % Math.max(1, filtered.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(filtered[active]);
    }
  };

  let runningIndex = -1;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
    >
      <div
        className="glass ui-pop-in w-full max-w-xl overflow-hidden rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border-subtle/70 px-4">
          <SearchIcon />
          <input
            aria-label={t('placeholder')}
            className="w-full bg-transparent py-4 text-sm text-text-primary outline-none placeholder:text-text-disabled"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('placeholder')}
            ref={inputRef}
            value={query}
          />
          <kbd className="hidden rounded border border-border-subtle bg-background-sunken px-1.5 py-0.5 text-[10px] text-text-disabled sm:block">
            ESC
          </kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-disabled">{t('empty')}</p>
          ) : (
            (['navigate', 'actions'] as const).map((group) => {
              const groupItems = filtered.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div className="mb-1" key={group}>
                  <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-text-disabled">
                    {t(group)}
                  </p>
                  {groupItems.map((item) => {
                    runningIndex += 1;
                    const isActive = runningIndex === active;
                    const index = runningIndex;
                    return (
                      <button
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          isActive
                            ? 'bg-brand-accent/15 text-text-primary'
                            : 'text-text-secondary hover:bg-background-elevated'
                        }`}
                        key={item.id}
                        onClick={() => go(item)}
                        onMouseEnter={() => setActive(index)}
                        type="button"
                      >
                        <span className={`h-4 w-4 shrink-0 ${item.group === 'actions' ? 'text-brand-accent' : ''}`}>
                          <item.Icon className="h-4 w-4" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden className="h-4 w-4 shrink-0 text-text-disabled" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" strokeLinecap="round" />
    </svg>
  );
}
