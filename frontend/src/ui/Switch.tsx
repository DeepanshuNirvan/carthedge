import { cn } from '@/lib/cn';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

/** Neumorphic toggle — recessed track, physical raised knob. */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-std ease-enter disabled:opacity-50',
        checked
          ? 'bg-gradient-to-b from-jade-400 to-jade-500 shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)]'
          : 'neu-inset',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-1 left-1 size-5 rounded-full bg-white shadow-[0_2px_4px_rgb(0_0_0/0.3)] transition-transform duration-std ease-spring',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}
