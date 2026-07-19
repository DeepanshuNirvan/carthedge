import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className="flex items-center gap-2">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-std',
                  done && 'bg-jade-500 text-white',
                  active && 'bg-jade-500/15 text-jade-500 shadow-[inset_0_0_0_1.5px_rgb(var(--jade-500))]',
                  !done && !active && 'bg-surface-2 text-low hairline',
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn('hidden text-sm sm:block', active ? 'font-medium text-hi' : 'text-low')}>{step}</span>
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className={cn('h-px flex-1 rounded', done ? 'bg-jade-500' : 'bg-surface-3')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
