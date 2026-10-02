import { cn } from '@/lib/cn';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

/** iOS switch: the track floods jade, the white knob stretches while pressed. */
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
        // 31px track, with a 44px invisible hit area so a thumb never misses
        'group/sw relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-std ease-enter disabled:opacity-45',
        "before:absolute before:left-1/2 before:top-1/2 before:size-11 before:min-w-[3.25rem] before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
        checked
          ? 'bg-jade-500 shadow-[inset_0_1px_2px_rgb(0_0_0/0.18)]'
          : 'bg-[rgb(var(--field)/0.14)] shadow-[inset_0_0_0_1px_rgb(var(--line)/var(--line-a))]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.06)]',
          'transition-[transform,width] duration-std ease-spring group-active/sw:w-[33px]',
          checked && 'translate-x-5 group-active/sw:translate-x-[14px]',
        )}
      />
    </button>
  );
}
