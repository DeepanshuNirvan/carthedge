export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="16" className="fill-ink-950" />
        <path
          d="M40.5 22.5a12 12 0 1 0 0 19"
          stroke="rgb(var(--jade-500))"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="46" cy="46" r="5" fill="rgb(var(--gold-400))" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-hi">
        Cart<span className="text-jade-ink">Hedge</span>
      </span>
    </span>
  );
}
