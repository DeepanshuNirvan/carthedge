import { cn } from '@/lib/cn';

/** An unlit pane with a sheen of light passing over it, shaped like what loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} />;
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className={cn('h-3 rounded-full', i % 2 ? 'w-3/5' : 'w-4/5')} />
            <Skeleton className={cn('h-2.5 rounded-full', i % 2 ? 'w-1/3' : 'w-1/2')} />
          </div>
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
