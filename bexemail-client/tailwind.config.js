/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#d90a2c',
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          500: '#f43f5e',
          600: '#d90a2c',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        secondary: {
          DEFAULT: '#161519',
          50: '#f6f6f7',
          100: '#e7e7e9',
          200: '#d0cfd4',
          500: '#525059',
          800: '#222026',
          900: '#161519',
        }
      }
    },
  },
  plugins: [],
}
