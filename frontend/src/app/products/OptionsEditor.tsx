import { useState } from 'react';
import { Check, ImagePlus, Images, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { Product, ProductOption, Variant } from '@/api/types';
import { uploadFile } from '@/api/uploads';
import { toast } from '@/store/ui';
import { cn } from '@/lib/cn';
import { paiseToRupees, rupeesToPaise } from '@/lib/money';
import { Input } from '@/ui/Input';
import { Button, IconButton } from '@/ui/Button';
import { Switch } from '@/ui/Switch';
import { Spinner } from '@/ui/Spinner';

// The seller describes how a product varies (up to three groups: Size,
// Colour, Storage…) and CartHedge lists every combination with its own price,
// SKU and stock. Values carry stable keys, so renaming "Pnk" to "Pink" keeps
// that combination's id — share links and orders already point at it.

export type EditorValue = { key: string; name: string; images: string[] };
export type EditorGroup = { key: string; name: string; photos: boolean; values: EditorValue[] };
export type EditorRow = {
  id?: string;
  /** group key → value key */
  combo: Record<string, string>;
  price: string;
  sku: string;
  inStock: boolean;
  stockQty: string;
};
export type OptionsState = { groups: EditorGroup[]; rows: EditorRow[]; removed: string[] };

export const MAX_GROUPS = 3;
const MAX_VALUES = 30;
const MAX_COMBOS = 100;
const MAX_VALUE_PHOTOS = 10;

let seq = 0;
const newKey = () => `o${++seq}`;

const qtyText = (n: number | undefined) => (n === undefined || n < 0 ? '' : String(n));
const qtyOf = (s: string) => (s === '' ? -1 : Number(s));

/** Groups whose choices usually look different get photo slots by default. */
const looksVisual = (name: string) => /colou?r|shade|finish|design|print|pattern|style|metal|stone|plating/i.test(name);

/** One-tap choices for groups every seller types the same way. */
function suggestionsFor(name: string): string[] {
  if (/shoe|foot/i.test(name)) return ['5', '6', '7', '8', '9', '10', '11'];
  if (/ring/i.test(name)) return ['6', '7', '8', '9', '10', '11', '12'];
  if (/size|fit/i.test(name)) return ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free size'];
  if (/storage|memory|ram/i.test(name)) return ['64 GB', '128 GB', '256 GB', '512 GB'];
  if (/pack|set of/i.test(name)) return ['Pack of 1', 'Pack of 2', 'Pack of 3'];
  return [];
}

const groupNames = ['Size', 'Colour', 'Material', 'Style', 'Storage', 'Finish', 'Weight', 'Pack'];

export const emptyOptions: OptionsState = { groups: [], rows: [], removed: [] };

/** The editor state for a stored product. */
export function optionsFrom(product: Product | null): OptionsState {
  if (!product || product.variants.length === 0) return emptyOptions;
  const groups: EditorGroup[] = product.options.map((o) => ({
    key: newKey(),
    name: o.name,
    photos: o.values.some((v) => (v.images ?? []).length > 0) || looksVisual(o.name),
    values: o.values.map((v) => ({ key: newKey(), name: v.name, images: v.images ?? [] })),
  }));
  const rows = product.variants.map((v) => ({
    id: v.id,
    combo: Object.fromEntries(groups.map((g, i) => [g.key, g.values.find((x) => x.name === v.options[i])?.key ?? ''])),
    price: v.price ? paiseToRupees(v.price) : '',
    sku: v.sku,
    inStock: v.inStock,
    stockQty: qtyText(v.stockQty),
  }));
  const made = new Set(rows.map((r) => comboKey(groups, r.combo)));
  return { groups, rows, removed: combos(groups).map((c) => comboKey(groups, c)).filter((k) => !made.has(k)) };
}

const active = (groups: EditorGroup[]) => groups.filter((g) => g.values.length > 0);

/** Every combination of the groups that have choices, in group order. */
function combos(groups: EditorGroup[]): Record<string, string>[] {
  return active(groups).reduce<Record<string, string>[]>(
    (acc, g) => acc.flatMap((c) => g.values.map((v) => ({ ...c, [g.key]: v.key }))),
    [{}],
  ).filter((c) => Object.keys(c).length > 0);
}

const comboKey = (groups: EditorGroup[], combo: Record<string, string>) =>
  active(groups)
    .map((g) => combo[g.key] ?? '')
    .join('|');

const comboLabel = (groups: EditorGroup[], combo: Record<string, string>) =>
  active(groups)
    .map((g) => g.values.find((v) => v.key === combo[g.key])?.name.trim() || '…')
    .join(' / ');

/**
 * Rows for new groups. A combination keeps its row (id, price, stock); a new
 * one inherits from the row it grew out of — adding Colour to sizes keeps each
 * size's id on its first colour, removing a group folds rows back the same way.
 */
function withGroups(state: OptionsState, groups: EditorGroup[]): OptionsState {
  const live = active(groups);
  const taken = new Set<EditorRow>();
  const rows = combos(groups)
    .filter((c) => !state.removed.includes(comboKey(groups, c)))
    .slice(0, MAX_COMBOS)
    .map((c): EditorRow => {
      const exact = state.rows.find((r) => !taken.has(r) && live.every((g) => r.combo[g.key] === c[g.key]));
      if (exact) {
        taken.add(exact);
        return { ...exact, combo: c };
      }
      const parent = state.rows.find((r) => live.every((g) => r.combo[g.key] === undefined || r.combo[g.key] === c[g.key]));
      if (parent && !taken.has(parent)) {
        taken.add(parent);
        return { ...parent, combo: c };
      }
      return { combo: c, price: parent?.price ?? '', sku: '', inStock: parent?.inStock ?? true, stockQty: '' };
    });
  return { ...state, groups, rows };
}

/** The first thing wrong with the options, in the seller's words, or null. */
export function checkOptions(state: OptionsState, mrp: number | null): string | null {
  const names = new Set<string>();
  for (const g of state.groups) {
    const name = g.name.trim();
    if (!name) return 'Give each option a name, like Size or Colour.';
    if (name.length > 30) return `Keep "${name}" under 30 characters.`;
    if (names.has(name.toLowerCase())) return `There are two options called ${name}.`;
    names.add(name.toLowerCase());
    if (g.values.length === 0) return `Add at least one ${name.toLowerCase()}, or remove that option.`;
    const values = new Set<string>();
    for (const v of g.values) {
      const value = v.name.trim();
      if (!value) return `One of the ${name.toLowerCase()} choices is empty.`;
      if (value.length > 40) return `Keep "${value}" under 40 characters.`;
      if (values.has(value.toLowerCase())) return `${name} has "${value}" twice.`;
      values.add(value.toLowerCase());
    }
  }
  if (state.groups.length > 0 && state.rows.length === 0) return 'Bring back at least one combination, or remove the options.';
  for (const r of state.rows) {
    const label = comboLabel(state.groups, r.combo);
    const price = r.price === '' ? 0 : rupeesToPaise(r.price);
    if (price === null) return `Check the price of ${label}.`;
    if (mrp && price > mrp) return `${label} costs more than the MRP.`;
    if (r.stockQty !== '' && !/^\d{1,6}$/.test(r.stockQty)) return `Pieces for ${label} must be a whole number, or empty.`;
  }
  return null;
}

/**
 * What the API takes. Stock goes only for new rows or a count the seller
 * changed: orders draw it down while the form is open, and resending the old
 * number would undo those sales.
 */
export function optionsInput(state: OptionsState, gallery: string[], loaded: Product | null): { options: ProductOption[]; variants: Variant[] } {
  const groups = active(state.groups);
  const loadedQty = new Map((loaded?.variants ?? []).map((v) => [v.id, qtyText(v.stockQty)]));
  return {
    options: groups.map((g) => ({
      name: g.name.trim(),
      values: g.values.map((v) => ({ name: v.name.trim(), images: g.photos ? v.images.filter((i) => gallery.includes(i)) : [] })),
    })),
    variants: state.rows.map((r) => {
      const values = groups.map((g) => g.values.find((v) => v.key === r.combo[g.key])?.name.trim() ?? '');
      return {
        id: r.id,
        name: values.join(' / '),
        options: values,
        price: r.price ? (rupeesToPaise(r.price) ?? 0) : 0,
        sku: r.sku,
        inStock: r.inStock,
        stockQty: !r.id || loadedQty.get(r.id) !== r.stockQty ? qtyOf(r.stockQty) : undefined,
      };
    }),
  };
}

/** Chooses which product photos show one choice, or uploads new ones into the gallery. */
function PhotoPicker({
  value,
  gallery,
  onGallery,
  onImages,
  onDone,
  maxGallery,
}: {
  value: EditorValue;
  gallery: string[];
  onGallery: (images: string[]) => void;
  onImages: (images: string[]) => void;
  onDone: () => void;
  maxGallery: number;
}) {
  const [uploading, setUploading] = useState(false);
  const toggle = (url: string) =>
    onImages(value.images.includes(url) ? value.images.filter((i) => i !== url) : [...value.images, url].slice(0, MAX_VALUE_PHOTOS));
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).slice(0, maxGallery - gallery.length).map(uploadFile));
      onGallery([...gallery, ...urls]);
      onImages([...value.images, ...urls].slice(0, MAX_VALUE_PHOTOS));
    } catch (e) {
      toast('error', 'Upload failed', e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="mt-3 rounded-md bg-surface p-3 hairline">
      <p className="text-xs text-mid">
        Photos of <span className="font-medium text-hi">{value.name || 'this choice'}</span>. Buyers who pick it see these first.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {gallery.map((url, i) => {
          const on = value.images.includes(url);
          return (
            <button
              key={url}
              type="button"
              aria-pressed={on}
              aria-label={`Photo ${i + 1}`}
              onClick={() => toggle(url)}
              className={cn(
                'relative size-16 overflow-hidden rounded-md transition-[box-shadow,opacity] duration-micro',
                on ? 'shadow-[0_0_0_2px_rgb(var(--jade-500))]' : 'opacity-60 hairline hover:opacity-100',
              )}
            >
              <img src={url} alt="" className="size-full object-cover" />
              {on && (
                <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-jade-500 text-[rgb(var(--text-on-accent))]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
        {gallery.length < maxGallery && (
          <label className="flex size-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-dashed text-xs text-mid transition-colors hover:border-jade-500 hover:text-jade-ink">
            {uploading ? <Spinner className="size-4" /> : <ImagePlus className="size-4" />}
            {uploading ? 'Adding' : 'Upload'}
            <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => upload(e.target.files)} />
          </label>
        )}
      </div>
      <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

export function OptionsEditor({
  state,
  onChange,
  gallery,
  onGallery,
  maxGallery,
  basePrice,
  error,
}: {
  state: OptionsState;
  onChange: (state: OptionsState) => void;
  gallery: string[];
  onGallery: (images: string[]) => void;
  maxGallery: number;
  /** the product price in rupees, shown in an empty combination price */
  basePrice: string;
  error?: string | null;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [photosFor, setPhotosFor] = useState<string | null>(null);
  const { groups, rows, removed } = state;

  const setGroups = (next: EditorGroup[]) => onChange(withGroups(state, next));
  const updateGroup = (key: string, patch: Partial<EditorGroup>) =>
    setGroups(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const addGroup = (name: string) => {
    if (groups.length >= MAX_GROUPS) return;
    setGroups([...groups, { key: newKey(), name, photos: looksVisual(name), values: [] }]);
  };
  const addValues = (g: EditorGroup, text: string) => {
    const known = new Set(g.values.map((v) => v.name.trim().toLowerCase()));
    const fresh = text
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !known.has(t.toLowerCase()) && (known.add(t.toLowerCase()), true));
    if (fresh.length === 0) return;
    updateGroup(g.key, { values: [...g.values, ...fresh.map((name) => ({ key: newKey(), name, images: [] }))].slice(0, MAX_VALUES) });
    setDrafts((d) => ({ ...d, [g.key]: '' }));
  };
  const setValue = (g: EditorGroup, key: string, patch: Partial<EditorValue>) =>
    updateGroup(g.key, { values: g.values.map((v) => (v.key === key ? { ...v, ...patch } : v)) });
  const setRow = (i: number, patch: Partial<EditorRow>) =>
    onChange({ ...state, rows: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const removeRow = (i: number) =>
    onChange({ ...state, rows: rows.filter((_, j) => j !== i), removed: [...removed, comboKey(groups, rows[i].combo)] });
  const restore = () => onChange(withGroups({ ...state, removed: [] }, groups));

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-hi">Options</p>
        {groups.length > 0 && groups.length < MAX_GROUPS && (
          <Button type="button" variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => addGroup('')}>
            Add option
          </Button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-low">
        What a buyer picks: size, colour, storage, finish. Every combination gets its own price and stock.
      </p>

      {groups.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {['Size', 'Colour', 'Material'].map((name) => (
            <Button key={name} type="button" variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => addGroup(name)}>
              {name}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={() => addGroup('')}>
            Something else
          </Button>
        </div>
      )}

      <datalist id="option-names">
        {groupNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="mt-3 flex flex-col gap-3">
        {groups.map((g) => {
          const unused = suggestionsFor(g.name).filter((s) => !g.values.some((v) => v.name.trim().toLowerCase() === s.toLowerCase()));
          const picking = g.values.find((v) => v.key === photosFor);
          return (
            <div key={g.key} className="rounded-lg bg-surface-2 p-3 hairline sm:p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Input
                  value={g.name}
                  list="option-names"
                  maxLength={30}
                  placeholder="Option name, like Size"
                  aria-label="Option name"
                  className="h-10 min-w-0 flex-1 sm:max-w-60"
                  // naming it Colour, Finish or Print turns its photo slots on; never off, so a seller's own choice stands
                  onChange={(e) => updateGroup(g.key, { name: e.target.value, photos: g.photos || looksVisual(e.target.value) })}
                />
                <span className="flex items-center gap-2 text-xs text-mid">
                  <Switch
                    checked={g.photos}
                    label={`Photos for each ${g.name || 'choice'}`}
                    onChange={(photos) => updateGroup(g.key, { photos })}
                  />
                  Photos per choice
                </span>
                <IconButton
                  label={`Remove ${g.name || 'option'}`}
                  onClick={() => {
                    setGroups(groups.filter((x) => x.key !== g.key));
                    if (picking) setPhotosFor(null);
                  }}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {g.values.map((v) => (
                  <span key={v.key} className="inline-flex h-10 items-center gap-1 rounded-full pl-1 pr-1 neu">
                    {g.photos && (
                      <button
                        type="button"
                        onClick={() => setPhotosFor(photosFor === v.key ? null : v.key)}
                        aria-label={`Photos of ${v.name || 'this choice'} (${v.images.length})`}
                        aria-expanded={photosFor === v.key}
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-low transition-colors hover:text-jade-ink',
                          photosFor === v.key ? 'shadow-[0_0_0_2px_rgb(var(--jade-500))]' : 'bg-[rgb(var(--field)/0.06)]',
                        )}
                      >
                        {v.images[0] ? <img src={v.images[0]} alt="" className="size-full object-cover" /> : <Images className="size-4" />}
                      </button>
                    )}
                    <input
                      value={v.name}
                      maxLength={40}
                      size={Math.max(v.name.length, 2)}
                      aria-label={`${g.name || 'Option'} choice`}
                      onChange={(e) => setValue(g, v.key, { name: e.target.value })}
                      className={cn('min-w-0 bg-transparent text-base text-hi focus:outline-none sm:text-sm', !g.photos && 'pl-2.5')}
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${v.name}`}
                      onClick={() => {
                        updateGroup(g.key, { values: g.values.filter((x) => x.key !== v.key) });
                        if (photosFor === v.key) setPhotosFor(null);
                      }}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-low transition-colors hover:text-hi"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                {g.values.length < MAX_VALUES && (
                  <Input
                    value={drafts[g.key] ?? ''}
                    placeholder={g.values.length ? 'Add another' : `Add ${g.name ? g.name.toLowerCase() : 'choices'}, comma between`}
                    aria-label={`Add a ${g.name || 'choice'}`}
                    className="h-10 w-auto min-w-0 flex-1 basis-40"
                    onChange={(e) => setDrafts((d) => ({ ...d, [g.key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addValues(g, drafts[g.key] ?? '');
                      }
                    }}
                    onBlur={() => addValues(g, drafts[g.key] ?? '')}
                  />
                )}
              </div>

              {unused.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-low">Quick add</span>
                  {unused.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addValues(g, s)}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-jade-ink transition-colors hover:bg-jade-500/10"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}

              {g.photos && picking && (
                <PhotoPicker
                  value={picking}
                  gallery={gallery}
                  maxGallery={maxGallery}
                  onGallery={onGallery}
                  onImages={(images) => setValue(g, picking.key, { images })}
                  onDone={() => setPhotosFor(null)}
                />
              )}
              {g.photos && !picking && g.values.length > 0 && (
                <p className="mt-2 text-xs text-low">Tap the photo slot on a choice to pick its photos.</p>
              )}
            </div>
          );
        })}
      </div>

      {rows.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-mid">
              {rows.length} {rows.length === 1 ? 'combination' : 'combinations'}
            </p>
            {removed.length > 0 && (
              <button type="button" onClick={restore} className="inline-flex items-center gap-1 text-xs font-medium text-jade-ink hover:underline">
                <RotateCcw className="size-3.5" /> Bring back {removed.length} removed
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const label = comboLabel(groups, r.combo);
              return (
                <div
                  key={comboKey(groups, r.combo)}
                  className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_90px_90px_80px_auto_auto]"
                >
                  <span className="col-span-5 truncate text-sm font-medium text-hi sm:col-span-1">{label}</span>
                  <Input
                    placeholder={basePrice || 'Same'}
                    aria-label={`Price of ${label}`}
                    inputMode="decimal"
                    value={r.price}
                    onChange={(e) => setRow(i, { price: e.target.value })}
                  />
                  <Input placeholder="SKU" aria-label={`SKU of ${label}`} value={r.sku} onChange={(e) => setRow(i, { sku: e.target.value })} />
                  <Input
                    placeholder="Qty"
                    aria-label={`Pieces of ${label} (empty = not counted)`}
                    inputMode="numeric"
                    value={r.stockQty}
                    onChange={(e) => setRow(i, { stockQty: e.target.value.replace(/\D/g, '') })}
                  />
                  <Switch checked={r.inStock} onChange={(inStock) => setRow(i, { inStock })} label={`${label} in stock`} />
                  <IconButton label={`Remove ${label}`} onClick={() => removeRow(i)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-low">
            Empty price uses the product price. Qty is the pieces you have of that combination; orders draw it down, empty means not
            counted. Remove a combination you don&apos;t make.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
