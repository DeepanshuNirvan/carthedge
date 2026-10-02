/** Full-page wait: the mark draws its own ring, the cart settles in and the
 *  two coin-wheels light. Same 64-unit geometry as LogoMark; vector only, so
 *  it is crisp at any DPR and costs nothing to ship. */
export function PageLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5" role="status" aria-label="Loading">
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden className="overflow-visible">
        <path
          d="M50.84 18.81A23 23 0 1 0 50.84 45.19"
          stroke="rgb(var(--line) / var(--line-strong-a))"
          strokeWidth="6.2"
          strokeLinecap="round"
        />
        <path
          d="M50.84 18.81A23 23 0 1 0 50.84 45.19"
          stroke="rgb(var(--brand-mark))"
          strokeWidth="6.2"
          strokeLinecap="round"
          pathLength={100}
          className="loader-ring"
        />
        <g className="loader-cart">
          <path d="M23.2 21.4 28.6 34.2" stroke="rgb(var(--brand-mark))" strokeWidth="4.4" strokeLinecap="round" />
          <path d="M26 25.2h18.4l-4 11H30z" fill="rgb(var(--brand-mark))" />
        </g>
        <circle cx="31.9" cy="41" r="2.9" fill="rgb(var(--brand-coin))" className="loader-coin" />
        <circle
          cx="38.5"
          cy="41"
          r="2.9"
          fill="rgb(var(--brand-coin))"
          className="loader-coin"
          style={{ animationDelay: '0.18s' }}
        />
      </svg>
      <style>{`
        .loader-ring { stroke-dasharray: 100; animation: loaderRing 1.6s var(--ease-enter) infinite; }
        .loader-cart { animation: loaderCart 1.6s var(--ease-enter) infinite; transform-box: fill-box; transform-origin: center; }
        .loader-coin { animation: loaderCoin 1.6s var(--ease-enter) infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes loaderRing { 0% { stroke-dashoffset: 100 } 55%, 100% { stroke-dashoffset: 0 } }
        @keyframes loaderCart { 0%, 20% { opacity: 0; transform: translateX(-4px) } 55%, 100% { opacity: 1; transform: none } }
        @keyframes loaderCoin { 0%, 45% { opacity: 0.2; transform: scale(0.6) } 70%, 100% { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .loader-ring, .loader-cart, .loader-coin { animation: none; stroke-dashoffset: 0; opacity: 1 } }
      `}</style>
    </div>
  );
}
