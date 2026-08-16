/* The CartHedge mark: an open jade ring (the hedge that protects the order)
   cradling a solid cart with two gold coin-wheels. Geometry is fixed in a
   64-unit box; colour comes from --brand-mark/--brand-coin so both themes
   stay on-brand. Same artwork ships as public/favicon.svg and the icon PNGs. */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        d="M50.84 18.81A23 23 0 1 0 50.84 45.19"
        stroke="rgb(var(--brand-mark))"
        strokeWidth="6.2"
        strokeLinecap="round"
      />
      <path
        d="M23.2 21.4 28.6 34.2"
        stroke="rgb(var(--brand-mark))"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
      <path d="M26 25.2h18.4l-4 11H30z" fill="rgb(var(--brand-mark))" />
      <circle cx="31.9" cy="41" r="2.9" fill="rgb(var(--brand-coin))" />
      <circle cx="38.5" cy="41" r="2.9" fill="rgb(var(--brand-coin))" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight text-hi">
        Cart<span className="text-jade-ink">Hedge</span>
      </span>
    </span>
  );
}
