/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.svelte'],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Roboto Condensed'],
        'sans': ['Roboto']
      },
      colors: {
        slate: {
          250: "#D7DFE9",
          550: "#56657A",
        }
      },
    },
    screens: {
      '2xl': {'max': '1535px'},
      'xl': {'max': '1279px'},
      'lg': {'max': '1023px'},
      'md': {'max': '767px'},
      'sm': {'max': '639px'},
    }
  },
  plugins: [],
}
