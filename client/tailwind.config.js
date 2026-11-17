/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nettplus: {
          navy: '#0A2A8F',
          blue: '#1F4BFF',
          lime: '#B4F000',
          white: '#FFFFFF',
          ice: '#EEF2FF',
          red: '#DC2626',
          amber: '#F59E0B',
          // Paleta "Alta Fidelidad" (Figma)
          deep: '#001763',
          royal: '#0033D3',
          neon: '#B9F612',
          'neon-ink': '#141F00',
          ink: '#131B2E',
          mist: '#F2F3FF',
          haze: '#EAEDFF',
          canvas: '#FAF8FF',
          periwinkle: '#8399FF',
          lavender: '#BAC3FF',
          frost: '#DBDEFF',
          danger: '#BA1A1A',
          'danger-soft': '#FFDAD6',
        },
      },
      fontFamily: {
        hanken: ['"Hanken Grotesk"', 'Inter', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(10, 42, 143, 0.08)',
      },
      borderRadius: {
        xl: '12px',
      },
    },
  },
  plugins: [],
};
