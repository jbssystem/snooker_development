export const SUPPORTED_LOCALES = ['ru', 'en', 'uk'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'ru';
