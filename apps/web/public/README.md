# Static assets

Put the following files here (binary files cannot be committed by an AI agent —
the user must drop them in manually):

| File | Source | Size | Purpose |
| --- | --- | --- | --- |
| `logo.png` | brand logo (horizontal) | original size (≥ 420×120) | Header / landing hero |
| `icon.png` | square brand icon | 768×768 (or 512×512) | PWA icon, Apple touch icon |
| `apple-touch-icon.png` | downscale of `icon.png` | 180×180 | iOS home-screen icon |
| `favicon.ico` | multi-size .ico generated from `icon.png` | 16/32/48 | Browser tab favicon |
| `icon-192.png` | downscale of `icon.png` | 192×192 | PWA manifest |
| `icon-512.png` | downscale of `icon.png` | 512×512 | PWA manifest |

Quick way to generate the favicon + icons from `icon.png`:
- Online: https://realfavicongenerator.net/
- CLI (optional): `npx pwa-asset-generator icon.png ./ --background "#0E1116" --padding "10%"`

Files referenced from code:
- `apps/web/src/app/[locale]/layout.tsx` — `<head>` icons.
- `apps/web/src/app/[locale]/page.tsx` — landing `<Image src="/logo.png" …>`.
