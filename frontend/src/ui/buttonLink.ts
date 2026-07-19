import { cn } from '@/lib/cn';

/** Button-styled classes for <Link>/<a> — keeps anchors semantic. */
export function buttonLink(variant: 'primary' | 'secondary' | 'gold' | 'ghost' = 'primary', size: 'md' | 'lg' = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-micro select-none whitespace-nowrap',
    size === 'md' ? 'h-11 px-5 text-sm' : 'h-12 px-7 text-base',
    variant === 'primary' && 'bg-jade-500 text-white hover:bg-jade-600 active:bg-jade-700 shadow-soft',
    variant === 'secondary' && 'bg-surface-2 text-hi hairline hover:bg-surface-3',
    variant === 'gold' && 'bg-gold-400 text-ink-950 hover:bg-gold-500 shadow-soft',
    variant === 'ghost' && 'text-mid hover:text-hi hover:bg-surface-2',
  );
}
