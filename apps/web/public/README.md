# Static assets

Committed brand assets used by the app shell, landing page and PWA manifest:

| File | Source | Size | Purpose |
| --- | --- | --- | --- |
| `logo.png` | brand logo (horizontal) | original size (≥ 420×120) | Header / landing hero |
| `icon-192.png` | square brand icon | 192×192 | Header, auth shell, PWA manifest |
| `icon-512.png` | square brand icon | 512×512 | PWA manifest |
| `apple-touch-icon.png` | square brand icon | 180×180 | iOS home-screen icon |
| `favicon.ico` | multi-size .ico | 16/32/48 | Browser tab favicon |
| `favicon-96x96.png` | square brand icon | 96×96 | Browser favicon fallback |
| `favicon.svg` | vector brand icon | scalable | Browser favicon fallback |

Quick way to regenerate the favicon + icons from a source square icon:
- Online: https://realfavicongenerator.net/
- CLI (optional): `npx pwa-asset-generator icon-512.png ./ --background "#0E1116" --padding "10%"`

Files referenced from code:
- `apps/web/src/app/layout.tsx` — `<head>` icons.
- `apps/web/src/components/layout/Header.tsx` — app shell icon.
- `apps/web/src/app/[locale]/(auth)/layout.tsx` — auth shell icon.
- `apps/web/src/app/[locale]/page.tsx` — landing `<Image src="/logo.png" …>`.
