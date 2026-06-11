import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from '@/components/ui/Toaster';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }
  const activeLocale = locale as Locale;
  setRequestLocale(activeLocale);
  const messages = await getMessages({ locale: activeLocale });

  return (
    <NextIntlClientProvider locale={activeLocale} messages={messages}>
      <QueryProvider>
        {children}
        <Toaster />
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
