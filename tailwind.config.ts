import type { Config } from 'tailwindcss'

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.ts'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: token('surface'),
        raised: token('raised'),
        line: token('line'),
        text: token('text'),
        muted: token('muted'),
        faint: token('faint'),
        primary: token('primary'),
        them: token('them'),
        strength: token('strength'),
        weakness: token('weakness'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgb(255 255 255 / 0.03) inset, 0 1px 2px rgb(0 0 0 / 0.35)',
        lift: '0 1px 0 rgb(255 255 255 / 0.04) inset, 0 28px 56px -28px rgb(0 0 0 / 0.7)',
      },
      keyframes: {
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        grow: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 320ms ease-out both',
        'fade-in': 'fade-in 200ms ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        grow: 'grow 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
}

export default config
