import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background-primary">
      <Header />
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
