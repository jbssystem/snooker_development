import type { ReactNode } from 'react';
import { isLocale } from '@/i18n/config';
import { Header } from '@/components/layout/Header';
import { AnnouncementBanner } from '@/components/layout/AnnouncementBanner';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ActiveProfileSync } from '@/components/layout/ActiveProfileSync';
import { AuthGuard } from '@/components/auth/AuthGuard';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const activeLocale = isLocale(locale) ? locale : 'ru';

  return (
    <div className="flex min-h-screen flex-col bg-background-primary">
      <ActiveProfileSync />
      <Header locale={activeLocale} />
      <AnnouncementBanner />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AuthGuard>{children}</AuthGuard>
      </div>
      <CommandPalette />
    </div>
  );
}
