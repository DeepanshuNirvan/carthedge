const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

// paise that do not land on a whole rupee keep both digits — a ₹2.50/order fee
// rounded to ₹3 misquotes the price list
const inrPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Backend money is always paise (int). Format at the edge, never do float math. */
export function formatPaise(paise: number) {
  const p = Math.round(paise);
  return (p % 100 === 0 ? inr : inrPaise).format(p / 100);
}

/** ₹1.2L / ₹3.4Cr for dense dashboards. */
export function formatPaiseCompact(paise: number) {
  const r = Math.abs(paise) / 100;
  const sign = paise < 0 ? '-' : '';
  if (r >= 1e7) return `${sign}₹${(r / 1e7).toFixed(r >= 1e8 ? 0 : 1)}Cr`;
  if (r >= 1e5) return `${sign}₹${(r / 1e5).toFixed(r >= 1e6 ? 0 : 1)}L`;
  if (r >= 1e3) return `${sign}₹${(r / 1e3).toFixed(1)}k`;
  return inr.format(paise / 100);
}

/** Rupee text input → paise int. Returns null when not a valid amount. */
export function rupeesToPaise(input: string): number | null {
  const n = Number(input.replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function paiseToRupees(paise: number) {
  return (paise / 100).toString();
}
