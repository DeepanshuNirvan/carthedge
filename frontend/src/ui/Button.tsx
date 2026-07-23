import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'glass';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-jade-400 to-jade-500 text-[rgb(var(--text-on-accent))] clay hover:from-jade-300 hover:to-jade-400 disabled:opacity-50',
  gold: 'bg-gradient-to-b from-gold-300 to-gold-400 text-ink-950 shadow-soft hover:from-gold-400 hover:to-gold-500 disabled:opacity-50',
  secondary: 'panel text-hi hover:bg-surface-2 disabled:opacity-50',
  glass: 'glass sheen text-hi hover:brightness-110 disabled:opacity-50',
  ghost: 'text-mid hover:text-hi hover:bg-surface-2 disabled:opacity-50',
  danger:
    'bg-gradient-to-b from-danger to-[rgb(210_78_66)] text-white shadow-soft hover:brightness-110 disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5 rounded-sm',
  md: 'h-11 px-5 text-sm gap-2 rounded-md',
  lg: 'h-[3.25rem] px-7 text-base gap-2.5 rounded-lg',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center overflow-hidden whitespace-nowrap font-semibold',
        'transition-[transform,filter,background-color] duration-micro ease-spring',
        'hover:-translate-y-px active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }
>(function IconButton({ label, active, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-md transition-all duration-micro ease-spring',
        'hover:bg-surface-2 hover:text-hi active:scale-90 disabled:opacity-50',
        active ? 'bg-surface-2 text-hi hairline' : 'text-mid',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
