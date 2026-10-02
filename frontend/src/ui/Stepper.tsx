import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Steps as bulbs on a wire: done ones are jade, the current one is lit, the rest wait unlit. */
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
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tnum transition-all duration-std ease-spring',
                  done && 'bg-jade-500 text-[rgb(var(--text-on-accent))] clay',
                  active &&
                    'bg-bulb text-ink-950 shadow-[0_0_0_4px_rgb(var(--bulb)/0.18),0_4px_14px_-2px_rgb(var(--bulb)/0.6)]',
                  !done && !active && 'neu-inset text-low',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('hidden text-[13px] sm:block', active ? 'font-semibold text-hi' : 'text-low')}>
                {step}
              </span>
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className="relative h-px flex-1 bg-wire/20">
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 bg-jade-500 transition-[width] duration-expr ease-enter',
                    done ? 'w-full' : 'w-0',
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
