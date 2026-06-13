import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Snooker Player OS',
  description: 'Long-term snooker player development system',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#12815C',
};

// Runs before first paint to apply the persisted theme, preventing a flash of
// the wrong theme. Mirrors the shape written by the zustand persist store
// (`snooker.theme` → {"state":{"theme":"dark|light"}}). Defaults to dark.
const themeInitScript = `(function(){try{var d=document.documentElement;var t='dark';var raw=localStorage.getItem('snooker.theme');if(raw){var v=JSON.parse(raw);var s=v&&v.state&&v.state.theme;if(s==='light'||s==='dark')t=s;}d.classList.remove('dark','light');d.classList.add(t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}