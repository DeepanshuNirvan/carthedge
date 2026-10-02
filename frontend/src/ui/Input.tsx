import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactElement,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

// Recessed well that brightens to the surface on focus, with a jade ring.
// text-base below sm is load-bearing: iOS Safari zooms into any field under 16px.
const fieldClass =
  'w-full rounded-md neu-inset px-3.5 text-base text-hi placeholder:text-dim sm:text-[14px] ' +
  'transition-[box-shadow,background-color] duration-micro ease-enter hover:bg-[rgb(var(--field)/0.07)] ' +
  'focus:bg-surface focus:shadow-[inset_0_0_0_1.5px_rgb(var(--jade-400)),0_0_0_4px_rgb(var(--jade-500)/0.16)] focus:outline-none ' +
  'disabled:opacity-50 aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_rgb(var(--danger))]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(fieldClass, 'h-11', className)} {...rest} />;
  },
);

/** Password field with a show/hide control inside the well. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ className, ...rest }, ref) {
    const [shown, setShown] = useState(false);
    return (
      <div className="relative">
        <input ref={ref} type={shown ? 'text' : 'password'} className={cn(fieldClass, 'h-11 pr-12', className)} {...rest} />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-low transition-colors hover:text-hi"
        >
          {shown ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(fieldClass, 'min-h-24 py-3', className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(fieldClass, 'h-11 appearance-none pr-9', className)} {...rest}>
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-low"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  },
);

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean }>;
};

/** Label + control + error in one accessible block. Pass a single form control as child. */
export function Field({ label, error, hint, optional, children }: FieldProps) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children, { id, 'aria-invalid': error ? true : undefined })
    : children;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between text-[13px] font-medium text-hi">
        {label}
        {optional && <span className="text-xs font-normal text-low">Optional</span>}
      </label>
      {control}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-low">{hint}</p>
      ) : null}
    </div>
  );
}
