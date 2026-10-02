import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'glass';
type Size = 'sm' | 'md' | 'lg';

// Controls are capsules everywhere (the shape lock); cards and sheets carry
// the larger radii. Shared with buttonLink so <a> and <button> never drift.
export const buttonVariants: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(180deg,rgb(var(--jade-400)),rgb(var(--jade-500)))] text-[rgb(var(--text-on-accent))] clay hover:brightness-[1.07]',
  gold: 'bg-[linear-gradient(180deg,rgb(var(--gold-300)),rgb(var(--gold-400)))] text-ink-950 shadow-soft hover:brightness-[1.05]',
  secondary: 'neu text-hi hover:bg-surface-3',
  glass: 'glass sheen text-hi hover:bg-[rgb(var(--glass-bg)/0.8)]',
  ghost: 'text-mid hover:bg-[rgb(var(--field)/0.07)] hover:text-hi',
  danger: 'bg-[rgb(var(--danger-fill))] text-white shadow-soft hover:brightness-110',
};

export const buttonSizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-4 text-[13px]',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-[3.25rem] gap-2.5 px-7 text-[15px]',
};

export const buttonBase =
  'relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-snug ' +
  'transition-[transform,filter,background-color,box-shadow] duration-micro ease-spring ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45';

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
      aria-busy={loading || undefined}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
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
        // 44px on touch, 40px where a cursor can be precise
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-[transform,background-color,color] duration-micro ease-spring sm:size-10',
        'hover:bg-[rgb(var(--field)/0.08)] hover:text-hi active:scale-90 disabled:opacity-45',
        active ? 'bg-[rgb(var(--field)/0.08)] text-hi' : 'text-mid',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
