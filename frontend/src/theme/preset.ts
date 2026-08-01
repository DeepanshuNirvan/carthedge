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
      white: '#ffffff',
      black: '#000000',
      // `ink` is the text/icon-safe step of each brand hue; the numbered steps
      // are fills. Both themes define ink, so text-jade-ink reads everywhere.
      jade: {
        300: v('jade-300'),
        400: v('jade-400'),
        500: v('jade-500'),
        600: v('jade-600'),
        700: v('jade-700'),
        ink: v('jade-ink'),
      },
      gold: { 300: v('gold-300'), 400: v('gold-400'), 500: v('gold-500'), 600: v('gold-600'), ink: v('gold-ink') },
      ink: { 700: v('ink-700'), 800: v('ink-800'), 850: v('ink-850'), 900: v('ink-900'), 950: v('ink-950') },
      paper: { 50: v('paper-50'), 100: v('paper-100'), 200: v('paper-200') },
      bg: { DEFAULT: v('bg'), 2: v('bg-2') },
      surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
      hi: v('text-hi'),
      mid: v('text-mid'),
      low: v('text-low'),
      dim: v('text-dim'),
      line: v('line'),
      success: v('success'),
      warning: v('warning'),
      danger: v('danger'),
      'danger-ink': v('danger-ink'),
      info: v('info'),
      'info-ink': v('info-ink'),
    },
    fontFamily: {
      display: ['"Clash Display"', 'system-ui', 'sans-serif'],
      sans: ['Satoshi', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
    },
    extend: {
      // env() through the spacing scale so pb-safe / h-safe work anywhere.
      // 4.5/5.5 fill the gap Tailwind's default scale stops at (3.5) — size-4.5
      // is the icon size this UI uses, and without it the class emits nothing.
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
        4.5: '1.125rem',
        5.5: '1.375rem',
      },
      fontSize: {
        d0: ['clamp(3.25rem, 2.2rem + 5.4vw, 7.5rem)', { lineHeight: '0.96', letterSpacing: '-0.035em' }],
        d1: ['clamp(2.75rem, 2rem + 4vw, 6rem)', { lineHeight: '1.0', letterSpacing: '-0.032em' }],
        d2: ['clamp(2.25rem, 1.6rem + 2.6vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.027em' }],
        d3: ['clamp(1.75rem, 1.4rem + 1.6vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        d4: ['clamp(1.35rem, 1.2rem + 0.8vw, 1.75rem)', { lineHeight: '1.2', letterSpacing: '-0.012em' }],
      },
      borderRadius: {
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-2xl)',
      },
      backdropBlur: {
        sm: 'var(--blur-sm)',
        md: 'var(--blur-md)',
        lg: 'var(--blur-lg)',
        xl: 'var(--blur-xl)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        raised: 'var(--shadow-raised)',
        float: 'var(--shadow-float)',
        glow: '0 0 48px -8px rgb(var(--jade-500) / 0.45)',
        'glow-gold': '0 0 48px -8px rgb(var(--gold-400) / 0.45)',
      },
      transitionDuration: { micro: '130ms', std: '240ms', expr: '480ms', cine: '720ms' },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--jade-500) / 0.5)' },
          '70%': { boxShadow: '0 0 0 12px rgb(var(--jade-500) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--jade-500) / 0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        rise: 'rise 480ms cubic-bezier(0.16,1,0.3,1) both',
        floaty: 'floaty 6s ease-in-out infinite',
        pulseRing: 'pulseRing 2s cubic-bezier(0.16,1,0.3,1) infinite',
      },
    },
  },
} satisfies Config;
