/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        panel: '#18181b',
        panelLight: '#27272a',
        accent: '#7c3aed',
        accentHover: '#6d28d9',
        borderDark: '#27272a',
        textMuted: '#a1a1aa'
      }
    },
  },
  plugins: [],
}
