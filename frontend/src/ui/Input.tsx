import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

const fieldClass =
  'w-full rounded-md bg-surface-2 px-3.5 text-sm text-hi placeholder:text-low hairline transition-shadow duration-micro focus:shadow-[inset_0_0_0_1.5px_rgb(var(--jade-500))] focus:outline-none disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(fieldClass, 'h-11', className)} {...rest} />;
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
      <select ref={ref} className={cn(fieldClass, 'h-11 appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
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
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-hi">
        {label}
        {optional && <span className="text-xs font-normal text-low">optional</span>}
      </label>
      {control}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-low">{hint}</p>
      ) : null}
    </div>
  );
}
