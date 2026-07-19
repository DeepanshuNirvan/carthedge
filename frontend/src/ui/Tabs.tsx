import { cn } from '@/lib/cn';

type Tab<T extends string> = { value: T; label: string; count?: number };

type TabsProps<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto rounded-md bg-surface-2 p-1 hairline', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3.5 py-1.5 text-sm font-medium transition-colors duration-micro',
            value === t.value ? 'bg-surface text-hi shadow-soft' : 'text-mid hover:text-hi',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="rounded-full bg-surface-3 px-1.5 text-xs tnum text-low">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
