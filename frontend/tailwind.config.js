/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#161514',
          900: '#211F1D',
          800: '#2B2926',
          700: '#3A3733',
          600: '#4C4842',
        },
        amber: {
          400: '#F2A93B',
          500: '#E8961F',
          600: '#C97D14',
        },
        teal: {
          400: '#5FA3A3',
          500: '#3F7C7C',
          600: '#306363',
        },
        alert: {
          400: '#E06B5A',
          500: '#C0392B',
        },
        bone: '#F2EFE9',
      },
      fontFamily: {
        display: ['"Oswald"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
