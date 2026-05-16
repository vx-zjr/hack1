export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        void: '#05080A',
        panel: '#0A0F12',
        phosphor: '#3AFF7C',
        cyan: '#00E5FF',
        danger: '#FF3B5C',
        warn: '#FFB020',
      },
    },
  },
};
