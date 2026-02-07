/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eaf0ff',
          100: '#d6e2ff',
          200: '#acccff',
          300: '#80b4ff',
          400: '#4f98ff',
          500: '#2a3b6e', // base (your deep navy) kept for compatibility
          600: '#253360',
          700: '#1f294f',
          800: '#18203e',
          900: '#0f1528'
        },
        success: {
          50: '#ebf7ee',
          100: '#d6f0dd',
          200: '#b0e4bb',
          300: '#86d99c',
          400: '#55c66f',
          500: '#2f8f3f', // darkened green base
          600: '#267934',
          700: '#1d5f28',
          800: '#15461d',
          900: '#0e2e14'
        }
      }
    }
  },
  plugins: [],
}