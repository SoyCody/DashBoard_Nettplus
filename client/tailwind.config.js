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
        },
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
