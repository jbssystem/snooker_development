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
          primary: '#0E1116',
          secondary: '#161B22',
          elevated: '#1F2630',
        },
        brand: {
          primary: '#0E6B4D',
          accent: '#19A974',
          gold: '#C8A45D',
        },
        text: {
          primary: '#E9E6DF',
          secondary: '#A8B0B8',
          disabled: '#6F7A86',
        },
        state: {
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
      },
    },
  },
  plugins: [],
};
