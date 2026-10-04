import type { ReactNode } from 'react';
import type { ProductOption } from '@/api/types';
import { cn } from '@/lib/cn';
import { isPlainList, pick, valueState, type Picks } from '@/lib/options';

type Sellable = { options: string[]; inStock: boolean };

/**
 * One row of choices per option group (Size, Colour, Storage…). A value sold
 * out in every combination is struck through; one that only exists without
 * the buyer's other pick stays tappable and clears that pick. A value with
 * photos shows the first as a swatch, so "Pink" looks pink.
 */
export function OptionPicker({
  options,
  variants,
  picks,
  onPicks,
  compact,
  aside,
}: {
  options: ProductOption[];
  variants: Sellable[];
  picks: Picks;
  onPicks: (picks: Picks) => void;
  /** smaller chips for a line inside a list (link checkout) */
  compact?: boolean;
  /** extra content beside a group's label, e.g. the size chart link */
  aside?: (option: ProductOption) => ReactNode;
}) {
  const plain = isPlainList(options);
  return (
    <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-5')}>
      {options.map((o, g) => (
        <fieldset key={o.name}>
          {!compact && (
            <legend className="mb-2 flex w-full items-baseline gap-2 text-sm">
              <span className="font-medium text-hi">{plain ? 'Choose an option' : o.name}</span>
              {!plain && picks[g] && <span className="text-mid">{picks[g]}</span>}
              {aside && <span className="ml-auto">{aside(o)}</span>}
            </legend>
          )}
          {compact && !plain && <legend className="sr-only">{o.name}</legend>}
          <div className={cn('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>
            {o.values.map((v) => {
              const state = valueState(variants, picks, g, v.name);
              const selected = picks[g] === v.name;
              const swatch = v.images?.[0];
              return (
                <button
                  key={v.name}
                  type="button"
                  aria-pressed={selected}
                  disabled={state === 'soldOut'}
                  onClick={() => onPicks(pick(variants, picks, g, selected ? undefined : v.name))}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full font-medium transition-all duration-micro ease-spring active:scale-95',
                    compact ? 'min-h-9 px-3.5 py-1.5 text-xs' : 'min-h-11 min-w-12 justify-center px-4 py-2.5 text-sm',
                    swatch && (compact ? 'pl-1' : 'pl-1.5'),
                    selected ? 'bg-hi text-bg shadow-raised' : 'neu text-hi hover:bg-surface-3',
                    state === 'elsewhere' && !selected && 'text-low',
                    state === 'soldOut' && 'cursor-not-allowed text-low line-through opacity-50',
                  )}
                >
                  {swatch && (
                    <img
                      src={swatch}
                      alt=""
                      loading="lazy"
                      className={cn('shrink-0 rounded-full object-cover hairline', compact ? 'size-7' : 'size-8')}
                    />
                  )}
                  {v.name}
                  {state === 'soldOut' && <span className="sr-only">, sold out</span>}
                  {state === 'elsewhere' && !selected && <span className="sr-only">, available with another choice</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
