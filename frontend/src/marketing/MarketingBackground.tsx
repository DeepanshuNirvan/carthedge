import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/**
 * The lane at night (or by day): one warm wash falling from the strand
 * overhead, and lamps from the stalls either side. No floating blobs: every
 * light is anchored to an edge like a real lamp just out of frame.
 * The overhead wash drifts a few pixels with scroll. The side lamps trade
 * strength as the page goes by, as if walking past lit stalls, so no
 * stretch of the page goes flat. Opacity and transform only.
 */
export function MarketingBackground() {
  const reduced = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const y = useTransform(scrollY, [0, 1200], [0, -60]);
  // both stay low through the hero, which has the strand overhead, then take turns
  const right = useTransform(scrollYProgress, [0, 0.07, 0.3, 0.55, 0.8, 1], [0.15, 1, 0.5, 1, 0.55, 0.9]);
  const left = useTransform(scrollYProgress, [0, 0.07, 0.3, 0.55, 0.8, 1], [0.1, 0.45, 1, 0.5, 1, 0.75]);
  const drift = useTransform(scrollYProgress, [0, 1], ['6vh', '-6vh']);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <motion.div
        style={reduced ? undefined : { y }}
        className="absolute inset-x-0 top-0 h-[120vh] will-change-transform"
      >
        <div className="absolute inset-0 lane-wash" />
        <div className="absolute inset-0 lane-wash-jade" />
      </motion.div>
      <div className="absolute inset-0 lane-vignette" />
      {/* the side lamps sit above the edge shading; --lamp-a dims them by day */}
      <div className="absolute inset-0 opacity-[var(--lamp-a)]">
        {/* a warm stall lamp off the right edge, lighting mid to low */}
        <motion.div
          style={reduced ? { opacity: 0.8 } : { opacity: right, y: drift }}
          className="absolute inset-y-0 right-0 w-[75vw] lamp-warm"
        />
        {/* its jade reflection on the ground, low on the left */}
        <motion.div
          style={reduced ? { opacity: 0.8 } : { opacity: left }}
          className="absolute inset-y-0 left-0 w-[70vw] lamp-jade"
        />
      </div>
    </div>
  );
}
