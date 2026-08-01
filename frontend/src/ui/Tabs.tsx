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

/** Glass segmented control with a shared animated pill behind the active tab. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  // the pill is shared across the tabs of ONE control; two controls on a page
  // must not animate into each other
  const pillId = useId();
  return (
    <div
      role="tablist"
      className={cn('rail relative flex gap-1 rounded-md neu-inset p-1', className)}
    >
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              // 40px tall on touch, tightened to 34px where a cursor can aim
              'relative flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3.5 py-1.5 text-sm font-medium transition-colors duration-micro sm:min-h-[2.125rem]',
              active ? 'text-hi' : 'text-mid hover:text-hi',
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-[10px] panel"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
            {t.count !== undefined && (
              <span className="relative z-10 rounded-full bg-surface-3 px-1.5 text-xs tnum text-low">
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
