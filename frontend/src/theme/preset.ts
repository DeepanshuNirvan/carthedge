import type { Config } from 'tailwindcss';

// Every color reads a CSS variable so both themes are complete by construction.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export const carthedgePreset = {
  content: [],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      jade: { 400: v('jade-400'), 500: v('jade-500'), 600: v('jade-600'), 700: v('jade-700') },
      gold: { 400: v('gold-400'), 500: v('gold-500') },
      ink: { 700: v('ink-700'), 800: v('ink-800'), 850: v('ink-850'), 900: v('ink-900'), 950: v('ink-950') },
      paper: { 50: v('paper-50'), 100: v('paper-100'), 200: v('paper-200') },
      bg: v('bg'),
      surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
      hi: v('text-hi'),
      mid: v('text-mid'),
      low: v('text-low'),
      line: v('line'),
      success: v('success'),
      warning: v('warning'),
      danger: v('danger'),
      info: v('info'),
    },
    fontFamily: {
      display: ['"Clash Display"', 'system-ui', 'sans-serif'],
      sans: ['Satoshi', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
    },
    extend: {
      fontSize: {
        d1: ['clamp(2.75rem, 2rem + 4vw, 6rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        d2: ['clamp(2.25rem, 1.6rem + 2.6vw, 4rem)', { lineHeight: '1.06', letterSpacing: '-0.025em' }],
        d3: ['clamp(1.75rem, 1.4rem + 1.6vw, 2.75rem)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        d4: ['clamp(1.35rem, 1.2rem + 0.8vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '24px' },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        raised: 'var(--shadow-raised)',
        glow: '0 0 40px -8px rgb(var(--jade-500) / 0.35)',
      },
      transitionDuration: { micro: '120ms', std: '240ms', expr: '480ms', cine: '700ms' },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        rise: 'rise 480ms cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
} satisfies Config;
