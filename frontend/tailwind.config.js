export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aged-dark': '#0a0a0f',
        'aged-card': 'rgba(20, 20, 30, 0.6)',
        'aged-cyan': '#00f2ff',
        'aged-purple': '#9d4edd',
        'aged-border': 'rgba(255, 255, 255, 0.08)',
      },
      boxShadow: {
        'aged-glow': '0 0 30px rgba(0, 242, 255, 0.2)',
      }
    },
  },
  plugins: [],
}
