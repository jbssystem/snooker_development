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
          sunken: '#090C10',
          primary: '#0D1014',
          secondary: '#161B22',
          elevated: '#1F2630',
          raised: '#28303C',
        },
        brand: {
          primary: '#0E6B4D',
          accent: '#19A974',
          gold: '#C8A45D',
        },
        text: {
          primary: '#ECE9E2',
          secondary: '#B2BAC3',
          disabled: '#76818D',
        },
        state: {
          success: '#3FB36B',
          error: '#D65A5A',
          warning: '#D89A3A',
          info: '#4A90E2',
        },
        border: {
          subtle: '#2A323D',
          active: '#19A974',
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
        glow: '0 0 24px rgba(25, 169, 116, 0.18)',
        'elev-1': 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 2px -1px rgba(0,0,0,0.6), 0 8px 24px -16px rgba(0,0,0,0.7)',
        'elev-2': 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 2px 6px -2px rgba(0,0,0,0.6), 0 16px 40px -22px rgba(0,0,0,0.85)',
        'elev-3': 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 8px 16px -8px rgba(0,0,0,0.6), 0 28px 64px -28px rgba(0,0,0,0.9)',
      },
    },
  },
  plugins: [],
};
