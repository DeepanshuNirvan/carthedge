import { cn } from '@/lib/cn';

const sizes = { xs: 'text-xs', sm: 'text-base', md: 'text-3xl', lg: 'text-5xl' };

/**
 * A product with no photo yet: its initials set quietly on the shelf, so the
 * card reads as "photo to come", never as a broken image. Carries the product
 * name for screen readers, which also names the link it sits in.
 */
export function NoPhoto({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'flex size-full items-center justify-center bg-[linear-gradient(160deg,rgb(var(--field)/0.07),transparent_65%)]',
        className,
      )}
    >
      <span aria-hidden className={cn('font-semibold tracking-tightest text-dim', sizes[size])}>
        {initials}
      </span>
    </span>
  );
}
