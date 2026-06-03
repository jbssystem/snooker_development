import Image from 'next/image';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const tCommon = await getTranslations('common');
  return (
    <div className="grid min-h-screen place-items-center bg-background-primary px-6 py-12">
      <div className="surface accent-top w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/icon-192.png"
            alt={tCommon('appName')}
            width={56}
            height={56}
            className="rounded-lg"
            priority
          />
          <h1 className="text-lg font-semibold text-text-primary">{tCommon('appName')}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
