import { cn } from '@/lib/cn';

/** Button-styled classes for <Link>/<a> — mirrors <Button> so anchors stay semantic. */
export function buttonLink(
  variant: 'primary' | 'secondary' | 'gold' | 'ghost' | 'glass' = 'primary',
  size: 'md' | 'lg' = 'md',
) {
  return cn(
    'group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-semibold',
    'transition-[transform,filter,background-color] duration-micro ease-spring hover:-translate-y-px active:scale-[0.97]',
    size === 'md' ? 'h-11 px-5 text-sm rounded-md' : 'h-[3.25rem] px-7 text-base rounded-lg',
    variant === 'primary' &&
      'bg-gradient-to-b from-jade-400 to-jade-500 text-[rgb(var(--text-on-accent))] clay hover:from-jade-300 hover:to-jade-400',
    variant === 'gold' &&
      'bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 shadow-soft hover:from-gold-400 hover:to-gold-500',
    variant === 'secondary' && 'panel text-hi hover:bg-surface-2',
    variant === 'glass' && 'glass sheen text-hi hover:brightness-110',
    variant === 'ghost' && 'text-mid hover:text-hi hover:bg-surface-2',
  );
}
