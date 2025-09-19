/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontFeatureSettings: {
        sans: '"cv11"',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}