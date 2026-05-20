import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n/config';

// Root path "/" — fall back to default locale.
// next-intl middleware handles the redirect, but this is a safety net.
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
