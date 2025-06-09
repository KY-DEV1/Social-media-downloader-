/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'rose': {
          100: '#ffe4e6',
          600: '#e11d48',
        },
        'purple': {
          100: '#f3e8ff',
          600: '#9333ea',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
  safelist: [
    'bg-rose-100',
    'text-rose-600',
    'bg-red-100',
    'text-red-600',
    'bg-purple-100',
    'text-purple-600',
    'bg-blue-100',
    'text-blue-600',
  ],
  plugins: [],
};