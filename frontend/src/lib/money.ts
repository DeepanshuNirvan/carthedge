const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Backend money is always paise (int). Format at the edge, never do float math. */
export function formatPaise(paise: number) {
  return inr.format(Math.round(paise) / 100);
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
