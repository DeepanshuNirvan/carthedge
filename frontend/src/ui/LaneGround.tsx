/**
 * The lane every working surface sits in: a strand of lamps strung across the
 * top edge, the warm fall-off they throw, and a soft reflection pool on the
 * ground. Fixed and compositor-only. It is what the glass chrome (sidebar,
 * header, tab bar, sheets) frosts: the lamps read through the header as warm
 * light, the pool through the tab bar.
 */
const LAMPS = 9;

/** `strand={false}` keeps the light but drops the wire and lamps, for pages whose
 *  header starts transparent and would put lamps behind its icons. */
export function LaneGround({ strand = true }: { strand?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      {/* the light the strand throws down onto the lane */}
      <div className="absolute inset-x-0 top-0 h-[75vh] bg-[radial-gradient(85%_65%_at_50%_0%,rgb(var(--bulb)/0.17),transparent_72%)]" />
      <div className="absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(38%_55%_at_90%_0%,rgb(var(--jade-500)/0.12),transparent_72%)]" />
      {/* the wet-lane reflection pool */}
      <div className="absolute inset-x-0 bottom-0 h-[50vh] bg-[radial-gradient(60%_85%_at_25%_115%,rgb(var(--jade-500)/0.13),transparent_72%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[42vh] bg-[radial-gradient(45%_75%_at_78%_118%,rgb(var(--bulb)/0.11),transparent_72%)]" />

      {strand && <LampStrand />}
    </div>
  );
}

/** The wire and its lamps, 56px tall, filling the width of its positioned parent. */
export function LampStrand() {
  return (
    <>
      {/* a wire in two sags, lamps hung on it, each with its own pool of light */}
      <svg className="absolute inset-x-0 top-0 h-14 w-full" viewBox="0 0 100 24" preserveAspectRatio="none">
        <path
          d="M0 1 Q 25 23 50 8 Q 75 23 100 1"
          fill="none"
          stroke="rgb(var(--wire) / calc(var(--wire-a) * 1.4))"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {Array.from({ length: LAMPS }, (_, i) => {
        const t = (i + 0.5) / LAMPS;
        // sit exactly on the wire: the same quadratic as the path, in px (56px tall box, 24-unit viewBox)
        const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
        const [y0, y2] = t < 0.5 ? [1, 8] : [8, 1];
        const y = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * 23 + u * u * y2;
        const top = (y * 56) / 24 - 4;
        // p-3 is a finger-sized hit area round the 8px bulb; hovering (or tapping) one turns it up
        return (
          <span
            key={i}
            className="group pointer-events-auto absolute -translate-x-1/2 p-3"
            style={{ left: `${t * 100}%`, top: top - 12 }}
          >
            <span className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(var(--bulb)/0.22),transparent_65%)] transition-transform duration-expr ease-spring group-hover:scale-150" />
            <span className="relative block transition-transform duration-std ease-spring group-hover:scale-150">
              <span className="bulb block size-2" data-lit="true" />
            </span>
          </span>
        );
      })}
    </>
  );
}
