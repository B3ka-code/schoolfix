/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"IBM Plex Sans"', 'system-ui', 'Segoe UI', 'sans-serif'] },
      colors: {
        bg: '#0E1116',
        panel: '#151A21',
        raised: '#1B212A',
        line: '#262E39',
        ink: '#E8EBF0',
        mute: '#8C96A5',
        st: { new: '#5AA9FF', progress: '#F0B24B', resolved: '#4CC38A', rejected: '#E0736F' },
      },
    },
  },
  plugins: [],
}
