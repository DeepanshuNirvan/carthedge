import { cn } from '@/lib/cn';

export function Avatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return src ? (
    <img src={src} alt={name} className={cn('size-9 rounded-full object-cover hairline', className)} />
  ) : (
    <span
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-jade-500/15 text-sm font-semibold text-jade-ink',
        className,
      )}
    >
      {initials || '?'}
    </span>
  );
}
