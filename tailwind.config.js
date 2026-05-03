/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base:       '#0a0a0f',
        surface:    '#111118',
        card:       '#16161f',
        elevated:   '#1c1c28',
        border:     'rgba(255,255,255,0.06)',
        borderHi:   'rgba(255,255,255,0.13)',
        ink:        '#f0f0f5',
        muted:      '#6b6b80',
        subtle:     '#3a3a4a',
        accent:     '#7c5cfc',
        accentHi:   '#9274fd',
        rose:       '#f43f5e',
        amber:      '#f59e0b',
        emerald:    '#10b981',
        sky:        '#38bdf8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow:  '0 0 0 1px rgba(124,92,252,0.35), 0 8px 32px rgba(124,92,252,0.12)',
        card:  '0 1px 2px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
        modal: '0 24px 80px rgba(0,0,0,0.8)',
      },
    },
  },
  plugins: [],
};
