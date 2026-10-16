import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
        paper: 'var(--paper)',
        panel: 'var(--panel)',
        rule: 'var(--rule)',
        gold: { DEFAULT: 'var(--gold)', soft: 'var(--gold-soft)' },
        up: 'var(--up)',
        down: 'var(--down)',
        band: { DEFAULT: 'var(--band)', text: 'var(--band-text)', muted: 'var(--band-muted)' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        cond: ['var(--font-cond)', 'var(--font-sans)', 'sans-serif'],
      },
      maxWidth: { page: '76rem' },
    },
  },
  plugins: [],
};
export default config;
