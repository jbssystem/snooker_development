import type { ReactNode } from 'react';
import { isLocale } from '@/i18n/config';
import { Header } from '@/components/layout/Header';
import { MobileTabBar } from '@/components/layout/MobileTabBar';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const activeLocale = isLocale(locale) ? locale : 'ru';

  return (
    <div className="flex min-h-screen flex-col bg-background-primary">
      <Header locale={activeLocale} />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-8">{children}</div>
      <MobileTabBar />
    </div>
  );
}
