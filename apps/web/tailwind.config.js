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
        background: {
          sunken: '#111821',
          primary: '#18212C',
          secondary: '#222D3A',
          elevated: '#2D3A49',
          raised: '#394858',
        },
        brand: {
          primary: '#12815C',
          accent: '#1FBE8A',
          gold: '#D3B16C',
        },
        text: {
          primary: '#F1EFE9',
          secondary: '#BDC6D0',
          disabled: '#8694A2',
        },
        state: {
          success: '#43C078',
          error: '#E16969',
          warning: '#E3A84F',
          info: '#59A7F0',
        },
        border: {
          subtle: '#3D4A59',
          active: '#1FBE8A',
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
