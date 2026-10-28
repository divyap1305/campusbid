/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36abf7',
          500: '#0c8fe9',
          600: '#0271c7',
          700: '#035aa2',
          800: '#074c85',
          900: '#0c406e',
          950: '#082949',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
        }
      },
    },
  },
  plugins: [],
}
