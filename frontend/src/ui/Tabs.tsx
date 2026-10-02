import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type Tab<T extends string> = { value: T; label: string; count?: number };

type TabsProps<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** iOS segmented control: a recessed groove with one raised pill sliding between segments. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  // the pill is shared across the tabs of ONE control; two controls on a page
  // must not animate into each other
  const pillId = useId();
  return (
    <div role="tablist" className={cn('rail relative flex gap-0.5 rounded-full neu-inset p-1', className)}>
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              // 40px tall on touch, 34px where a cursor can aim
              'relative flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-micro sm:min-h-[2.125rem]',
              active ? 'text-hi' : 'text-low hover:text-hi',
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(var(--glass-lo)/0.25),0_3px_10px_-4px_rgb(var(--glass-lo)/0.4),inset_0_0_0_0.5px_rgb(var(--line)/var(--line-strong-a))]"
                transition={{ type: 'spring', stiffness: 460, damping: 36 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
            {t.count !== undefined && (
              <span
                className={cn(
                  'relative z-10 rounded-full px-1.5 text-[11px] tnum',
                  active ? 'bg-jade-500/14 text-jade-ink' : 'bg-[rgb(var(--field)/0.08)] text-low',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
