/** @type {import('tailwindcss').Config} */
// Paleta del curso: tomada de la plantilla de los teóricos de Química Analítica I
// (tema "Azul II": #0F6FC6, #009DD9, #0BD0D9, #10CF9B, #7CCA62, #A5C249; oscuro #17406D).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5fc',
          100: '#d7e8f8',
          200: '#b0d1f1',
          300: '#80b4e7',
          400: '#4a92d4',
          500: '#2580d3',
          600: '#1576cc',
          700: '#0f6fc6',
          800: '#0c5aa2',
          900: '#17406d',
          950: '#0e2747',
        },
        celeste: '#009dd9',
        turquesa: '#0bd0d9',
        aguamarina: '#10cf9b',
        lima: '#7cca62',
      },
      fontFamily: {
        titulo: ['Cambria', 'Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
