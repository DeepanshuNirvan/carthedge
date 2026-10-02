import { cn } from '@/lib/cn';
import { buttonBase, buttonVariants } from './Button';

/** Button-styled classes for <Link>/<a>; mirrors <Button> so anchors stay semantic. */
export function buttonLink(
  variant: 'primary' | 'secondary' | 'gold' | 'ghost' | 'glass' = 'primary',
  size: 'md' | 'lg' = 'md',
) {
  return cn(
    'group',
    buttonBase,
    buttonVariants[variant],
    size === 'md' ? 'h-11 gap-2 px-5 text-sm' : 'h-[3.25rem] gap-2.5 px-7 text-[15px]',
  );
}
