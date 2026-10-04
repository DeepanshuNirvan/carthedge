import type { ProductOption } from '@/api/types';

// A product varies by up to three option groups (Size, Colour, Storage…), and
// each variant is one value from every group. These helpers turn the buyer's
// picks into a variant, and the variant's choices into the photos they see.

/** One pick per option group, in group order; undefined = not chosen yet. */
export type Picks = (string | undefined)[];

type Sellable = { options: string[]; inStock: boolean };

/** Groups made from a plain variant list (older products) are named this. */
export const plainOption = 'Option';

/** A product whose only group is the plain list reads as "Choose an option". */
export const isPlainList = (options: ProductOption[]) => options.length === 1 && options[0].name === plainOption;

const fits = (v: Sellable, picks: Picks, skip?: number) =>
  picks.every((p, g) => g === skip || p === undefined || v.options[g] === p);

/** Picks with every single-choice group already chosen: there is nothing to ask. */
export function settledPicks(options: ProductOption[], picks: Picks): Picks {
  return options.map((o, g) => picks[g] ?? (o.values.length === 1 ? o.values[0].name : undefined));
}

/** The variant the picks settle, once every group has a pick. */
export function variantFor<V extends Sellable>(options: ProductOption[], variants: V[], picks: Picks): V | undefined {
  if (options.length === 0 || options.some((_, g) => picks[g] === undefined)) return undefined;
  return variants.find((v) => fits(v, picks));
}

/**
 * How a value reads beside the other picks: available, only in another
 * combination (picking it clears the clash), or sold out in every one.
 */
export type ValueState = 'available' | 'elsewhere' | 'soldOut';

export function valueState(variants: Sellable[], picks: Picks, group: number, value: string): ValueState {
  const stocked = variants.filter((v) => v.inStock && v.options[group] === value);
  if (stocked.length === 0) return 'soldOut';
  return stocked.some((v) => fits(v, picks, group)) ? 'available' : 'elsewhere';
}

/** Picks after choosing a value: other picks it cannot be bought with are dropped. */
export function pick(variants: Sellable[], picks: Picks, group: number, value: string | undefined): Picks {
  const next = [...picks];
  next[group] = value;
  if (value === undefined) return next;
  next.forEach((other, g) => {
    if (g === group || other === undefined) return;
    if (!variants.some((v) => v.inStock && v.options[group] === value && v.options[g] === other)) next[g] = undefined;
  });
  return next;
}

/** The first group still without a pick, to name in "choose a size first". */
export const missingGroup = (options: ProductOption[], picks: Picks) => options.find((_, g) => picks[g] === undefined);

/**
 * Photos for the picks: the chosen values' own photos first, then the photos
 * that belong to no other choice (the general shots). A choice without photos
 * of its own still hides the other choices' photos. With nothing picked, all.
 */
export function galleryFor(images: string[], options: ProductOption[], picks: Picks): string[] {
  const chosen = new Set<string>();
  const others = new Set<string>();
  options.forEach((o, g) => {
    if (picks[g] === undefined) return;
    for (const v of o.values) for (const img of v.images ?? []) (v.name === picks[g] ? chosen : others).add(img);
  });
  const shown = [...images.filter((i) => chosen.has(i)), ...images.filter((i) => !chosen.has(i) && !others.has(i))];
  return shown.length > 0 ? shown : images;
}
