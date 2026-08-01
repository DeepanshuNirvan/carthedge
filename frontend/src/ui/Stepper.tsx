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
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-std ease-spring',
                  done && 'bg-gradient-to-b from-jade-400 to-jade-500 text-[rgb(var(--text-on-accent))] clay',
                  active && 'neu text-jade-ink shadow-[inset_0_0_0_1.5px_rgb(var(--jade-400)),0_0_0_4px_rgb(var(--jade-500)/0.14)]',
                  !done && !active && 'neu-inset text-dim',
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('hidden text-sm sm:block', active ? 'font-semibold text-hi' : 'text-low')}>
                {step}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'h-0.5 flex-1 rounded-full transition-colors duration-expr',
                  done ? 'bg-jade-500' : 'bg-surface-3',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
