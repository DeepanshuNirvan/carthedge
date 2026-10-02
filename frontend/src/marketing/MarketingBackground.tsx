import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/**
 * The lane at night (or by day): one warm wash falling from the strand
 * overhead, and the ground deepening toward the edges. No floating blobs.
 * The light is anchored to the top edge like a real lamp, and it drifts a
 * few pixels with scroll so the page has depth without anything moving on
 * its own.
 */
export function MarketingBackground() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1200], [0, -60]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <motion.div
        style={reduced ? undefined : { y }}
        className="absolute inset-x-0 top-0 h-[120vh] will-change-transform"
      >
        <div className="absolute inset-0 bg-[radial-gradient(110%_55%_at_50%_-8%,rgb(var(--bulb)/0.085),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_40%_at_82%_0%,rgb(var(--jade-500)/0.05),transparent_60%)]" />
      </motion.div>
      <div className="absolute inset-0 bg-[radial-gradient(140%_100%_at_50%_30%,transparent_55%,rgb(var(--ink-950)/0.22)_100%)]" />
    </div>
  );
}
