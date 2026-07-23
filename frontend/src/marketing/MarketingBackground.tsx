import { motion, useScroll, useTransform, useReducedMotion, useSpring } from 'framer-motion';

/**
 * The product story told as light: jade (money confirmed) and gold (₹ saved)
 * aurora over a structured grid — messy chat resolving into structured orders.
 *
 * Perf: the blobs drift via CSS keyframes (compositor-only). Scroll adds ONE
 * cheap parallax transform on a single wrapper, not per-blob transforms, so we
 * never repaint the big blur layers each frame (that was the scroll lag).
 */
export function MarketingBackground() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // smooth the scroll value so the single parallax never stutters
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const y = useTransform(p, [0, 1], ['0%', '14%']);
  const gridOpacity = useTransform(p, [0, 0.4, 1], [0.5, 0.85, 1]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base wash — static, subtly brand-graded for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_-10%,rgb(var(--bg-2)),rgb(var(--bg))_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(80%_50%_at_15%_0%,rgb(var(--aurora-1)/0.08),transparent_60%),radial-gradient(70%_50%_at_100%_100%,rgb(var(--aurora-2)/0.07),transparent_60%)]" />

      {/* aurora field — one wrapper carries the scroll parallax; blobs drift via CSS */}
      <motion.div
        style={reduced ? undefined : { y }}
        className="absolute inset-0 will-change-transform [transform:translateZ(0)]"
      >
        <div className="cart-aurora cart-aurora--jade" />
        <div className="cart-aurora cart-aurora--gold" />
        <div className="cart-aurora cart-aurora--blue" />
      </motion.div>

      {/* structure grid — chat noise becoming ordered rows/columns */}
      <motion.div
        style={reduced ? { opacity: 0.8 } : { opacity: gridOpacity }}
        className="absolute inset-0"
      >
        <div className="cart-grid" />
      </motion.div>

      {/* vignette for depth — deeper edges make glass cards pop */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_45%,transparent_38%,rgb(var(--bg))_98%)] opacity-80" />
    </div>
  );
}
