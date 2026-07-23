import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/**
 * The product story told as light.
 * Two aurora light sources (jade = money confirmed, gold = ₹ saved) drift and
 * cross as you scroll — the "chaos" up top. A structured dot-grid fades and
 * sharpens on the way down: messy chat resolving into structured orders.
 * GPU-only (transform/opacity), fixed layer, never repaints on scroll content.
 */
export function MarketingBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // aurora parallax + convergence
  const jadeY = useTransform(scrollYProgress, [0, 1], ['-6%', '38%']);
  const jadeX = useTransform(scrollYProgress, [0, 1], ['-4%', '10%']);
  const goldY = useTransform(scrollYProgress, [0, 1], ['4%', '-30%']);
  const goldX = useTransform(scrollYProgress, [0, 1], ['6%', '-12%']);
  // structure emerging: grid sharpens as you descend
  const gridOpacity = useTransform(scrollYProgress, [0, 0.35, 1], [0.04, 0.09, 0.14]);
  const gridScale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  const still = reduced ?? false;

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,rgb(var(--bg-2)),rgb(var(--bg))_60%)]" />

      {/* jade aurora */}
      <motion.div
        style={still ? undefined : { y: jadeY, x: jadeX }}
        className="absolute left-[-10%] top-[-8%] h-[60vw] w-[60vw] rounded-full opacity-[var(--aurora-a)] blur-[var(--blur-xl)]"
      >
        <div className="size-full rounded-full bg-[radial-gradient(circle,rgb(var(--aurora-1)),transparent_62%)]" />
      </motion.div>

      {/* gold aurora */}
      <motion.div
        style={still ? undefined : { y: goldY, x: goldX }}
        className="absolute bottom-[-12%] right-[-8%] h-[52vw] w-[52vw] rounded-full opacity-[var(--aurora-a)] blur-[var(--blur-xl)]"
      >
        <div className="size-full rounded-full bg-[radial-gradient(circle,rgb(var(--aurora-2)),transparent_62%)]" />
      </motion.div>

      {/* deep-blue depth accent */}
      <div className="absolute left-1/2 top-1/3 h-[40vw] w-[40vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(var(--aurora-3)),transparent_65%)] opacity-[0.12] blur-[var(--blur-xl)]" />

      {/* structure grid — chat noise resolving to ordered rows/columns */}
      <motion.div
        style={still ? { opacity: 0.08 } : { opacity: gridOpacity, scale: gridScale }}
        className="absolute inset-0 origin-center [background-image:linear-gradient(rgb(var(--line))_1px,transparent_1px),linear-gradient(90deg,rgb(var(--line))_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(100%_100%_at_50%_20%,black,transparent_78%)]"
      />
    </div>
  );
}
