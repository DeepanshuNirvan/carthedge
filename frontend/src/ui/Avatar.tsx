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
        'flex size-9 items-center justify-center rounded-full bg-jade-500/15 text-[13px] font-semibold tracking-snug text-jade-ink shadow-[inset_0_0_0_1px_rgb(var(--jade-500)/0.2)]',
        className,
      )}
    >
      {initials || '?'}
    </span>
  );
}
