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
      // the recessed-well tint (white by night, ink by day); always used with an alpha step
      field: v('field'),
      'on-accent': v('text-on-accent'),
      bulb: v('bulb'),
      wire: v('wire'),
      success: v('success'),
      warning: v('warning'),
      danger: v('danger'),
      'danger-ink': v('danger-ink'),
      info: v('info'),
      'info-ink': v('info-ink'),
    },
    fontFamily: {
      // one family: display and UI are the same Geist at different sizes,
      // weights and tracking — the hierarchy is in the setting, not the face
      display: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
    },
    // preflight paints borders with this default; without it every border/divide falls back to currentColor
    borderColor: ({ theme }: { theme: (path: string) => Record<string, string> }) => ({
      ...theme('colors'),
      DEFAULT: 'rgb(var(--line) / var(--line-a))',
    }),
    extend: {
      // every whole step 1-99, so `bg-jade-500/14` works: Tailwind's default
      // scale skips most of these and silently emits nothing for them
      opacity: Object.fromEntries(Array.from({ length: 99 }, (_, i) => [String(i + 1), String((i + 1) / 100)])),
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
        'safe-t': 'env(safe-area-inset-top)',
        4.5: '1.125rem',
        5.5: '1.375rem',
      },
      fontSize: {
        // UI and marketing text: one half-pixel step scale (~8% apart) instead of
        // ad-hoc px values. Names avoid colour keys so `text-*` stays unambiguous.
        nano: ['10.5px', { lineHeight: '1.3' }], // inside sample screens and device mockups
        caption: ['11.5px', { lineHeight: '1.4' }], // chips, meta, small labels
        note: ['12.5px', { lineHeight: '1.45' }], // secondary lines, captions under controls
        ui: ['13.5px', { lineHeight: '1.45' }], // controls, nav links, compact body
        copy: ['14.5px', { lineHeight: '1.6' }], // ledger and list copy
        title: ['15.5px', { lineHeight: '1.35' }], // item and card titles
        lead: ['17px', { lineHeight: '1.6' }], // intro paragraphs
        figure: ['2.6rem', { lineHeight: '1', letterSpacing: '-0.04em' }], // a price
        stat: ['clamp(2.2rem, 1.6rem + 2vw, 3.25rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
        quote: ['clamp(1.6rem, 1.2rem + 1.7vw, 2.6rem)', { lineHeight: '1.18', letterSpacing: '-0.03em' }],
        hero: ['clamp(2.4rem, 1.3rem + 3.7vw, 4.35rem)', { lineHeight: '1.02', letterSpacing: '-0.04em' }],
        d0: ['clamp(2.75rem, 1.6rem + 4.6vw, 5.75rem)', { lineHeight: '0.98', letterSpacing: '-0.04em' }],
        d1: ['clamp(2.5rem, 1.7rem + 3.4vw, 4.75rem)', { lineHeight: '1.0', letterSpacing: '-0.04em' }],
        d2: ['clamp(2rem, 1.5rem + 2.2vw, 3.5rem)', { lineHeight: '1.04', letterSpacing: '-0.035em' }],
        d3: ['clamp(1.6rem, 1.3rem + 1.3vw, 2.4rem)', { lineHeight: '1.1', letterSpacing: '-0.028em' }],
        d4: ['clamp(1.3rem, 1.15rem + 0.7vw, 1.65rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
        snug: '-0.012em',
      },
      borderRadius: {
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-2xl)',
        // the phone mockup: bezel, and the screen inset 8px inside it
        device: '2.75rem',
        screen: '2.25rem',
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
        // a lit pane casts warm light downward, offset like a real lamp
        glow: '0 18px 40px -18px rgb(var(--jade-500) / 0.55)',
        'glow-gold': '0 18px 40px -18px rgb(var(--gold-400) / 0.55)',
      },
      transitionDuration: { micro: '140ms', std: '260ms', expr: '520ms', cine: '760ms' },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
        exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        marquee: {
          from: { transform: 'translate3d(0,0,0)' },
          to: { transform: 'translate3d(-50%,0,0)' },
        },
      },
      animation: {
        rise: 'rise 520ms cubic-bezier(0.16,1,0.3,1) both',
        breathe: 'breathe 2.4s ease-in-out infinite',
        marquee: 'marquee 60s linear infinite',
      },
    },
  },
} satisfies Config;
