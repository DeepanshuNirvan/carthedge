import { useEffect, useRef, useState, type ReactNode } from 'react';
import { paiseToRupees, rupeesToPaise } from '@/lib/money';
import { Field, Input } from '@/ui/Input';
import { Switch } from '@/ui/Switch';

/**
 * A local copy of one settings document. It follows the server until the
 * seller edits it, then holds their edits until saved (or reset).
 */
export function useDraft<T>(source: T | undefined) {
  const [draft, setDraft] = useState<T | undefined>(source);
  const dirty = useRef(false);
  // compared by value: callers build the source object during render, and an
  // identity dependency would reset the draft on every render (a render loop)
  const key = JSON.stringify(source);
  useEffect(() => {
    if (!dirty.current) setDraft(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = (patch: Partial<T>) => {
    dirty.current = true;
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };
  const saved = () => {
    dirty.current = false;
  };
  return { draft, update, saved, isDirty: () => dirty.current };
}

/** A switch with its title and one line of what it does. */
export function ToggleRow({
  checked,
  onChange,
  title,
  children,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="pt-0.5">
        <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-hi">{title}</p>
        {children && <p className="text-xs leading-relaxed text-low">{children}</p>}
      </div>
    </div>
  );
}

/** Rupees on screen, paise in state. Empty means zero. */
export function RupeeField({
  label,
  hint,
  value,
  onChange,
  optional,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (paise: number) => void;
  optional?: boolean;
}) {
  const [text, setText] = useState(value ? paiseToRupees(value) : '');
  const [error, setError] = useState('');
  useEffect(() => {
    setText((t) => (rupeesToPaise(t) === value ? t : value ? paiseToRupees(value) : ''));
  }, [value]);
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      <Input
        inputMode="decimal"
        placeholder="0"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const paise = rupeesToPaise(e.target.value);
          setError(paise === null ? 'Enter an amount in rupees' : '');
          if (paise !== null) onChange(paise);
        }}
      />
    </Field>
  );
}

/** Whole-number field (days, percent). */
export function NumberField({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        inputMode="numeric"
        value={value ? String(value) : ''}
        placeholder="0"
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, '') || 0);
          onChange(max !== undefined ? Math.min(Math.max(n, min), max) : Math.max(n, min));
        }}
      />
    </Field>
  );
}
