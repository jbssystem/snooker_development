/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens are CSS-variable backed (space-separated RGB
        // triplets) so they swap with the `html.dark` / `html.light` theme
        // class while still honouring Tailwind opacity modifiers (e.g.
        // `bg-background-secondary/90`). Source of truth: globals.css.
        background: {
          sunken: 'rgb(var(--color-bg-sunken) / <alpha-value>)',
          primary: 'rgb(var(--color-bg-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-bg-secondary) / <alpha-value>)',
          elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',
          raised: 'rgb(var(--color-bg-raised) / <alpha-value>)',
        },
        brand: {
          primary: 'rgb(var(--color-brand-primary) / <alpha-value>)',
          accent: 'rgb(var(--color-brand-accent) / <alpha-value>)',
          gold: 'rgb(var(--color-brand-gold) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          disabled: 'rgb(var(--color-text-disabled) / <alpha-value>)',
        },
        state: {
          success: 'rgb(var(--color-state-success) / <alpha-value>)',
          error: 'rgb(var(--color-state-error) / <alpha-value>)',
          warning: 'rgb(var(--color-state-warning) / <alpha-value>)',
          info: 'rgb(var(--color-state-info) / <alpha-value>)',
        },
        border: {
          subtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
          active: 'rgb(var(--color-border-active) / <alpha-value>)',
        },
        // Snooker ball semantic colors — table renderer and match data only.
        ball: {
          white: '#F5F1E6',
          red: '#C1121F',
          yellow: '#F4C430',
          green: '#2F8F53',
          brown: '#6B4423',
          blue: '#1E5FB3',
          pink: '#F08FB0',
          black: '#1A1A1A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(31, 190, 138, 0.2)',
        'elev-1': 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 1px 2px -1px rgba(0,0,0,0.45), 0 8px 24px -16px rgba(0,0,0,0.55)',
        'elev-2': 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 2px 6px -2px rgba(0,0,0,0.45), 0 16px 40px -22px rgba(0,0,0,0.65)',
        'elev-3': 'inset 0 1px 0 0 rgba(255,255,255,0.07), 0 8px 16px -8px rgba(0,0,0,0.45), 0 28px 64px -28px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
};
