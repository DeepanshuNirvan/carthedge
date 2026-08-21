import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

/**
 * Pointer lighting: a soft jade glow that trails the cursor, and a thin ring
 * that snaps tight over anything clickable.
 *
 * Deliberate choices:
 * - The native cursor is NOT hidden. Hiding it looks slick on a landing page and
 *   is a liability everywhere else — text carets, resize handles and table
 *   selection all stop reading correctly. This adds light, it doesn't replace UI.
 * - Position is written to motion values, never React state. A setState per
 *   mousemove re-renders the tree ~120x/second, which is exactly the "laggy
 *   premium site" failure. Framer writes these straight to the compositor.
 * - Skipped entirely on coarse pointers (phones, tablets) and under
 *   prefers-reduced-motion, so it costs those users nothing at all.
 */
export function CursorGlow() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hot, setHot] = useState(false);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  // the glow lags behind the pointer; the ring is tighter and quicker
  const glowX = useSpring(x, { stiffness: 140, damping: 22, mass: 0.6 });
  const glowY = useSpring(y, { stiffness: 140, damping: 22, mass: 0.6 });
  const ringX = useSpring(x, { stiffness: 520, damping: 34, mass: 0.35 });
  const ringY = useSpring(y, { stiffness: 520, damping: 34, mass: 0.35 });

  useEffect(() => {
    if (reduced) return;
    // only devices that actually have a hovering pointer
    const fine = window.matchMedia('(pointer: fine)');
    if (!fine.matches) return;
    setEnabled(true);

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    // one delegated listener rather than per-element handlers
    const over = (e: PointerEvent) => {
      const el = e.target as Element | null;
      setHot(!!el?.closest?.('a, button, [role="button"], input, select, textarea, [data-cursor]'));
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerover', over, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
    };
  }, [reduced, x, y]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      <motion.div
        style={{ x: glowX, y: glowY }}
        className="absolute -left-[180px] -top-[180px] size-[360px] rounded-full
                   bg-[radial-gradient(circle,rgb(var(--jade-400)/0.10),transparent_66%)]
                   blur-[6px] will-change-transform"
      />
      <motion.div
        style={{ x: ringX, y: ringY }}
        animate={{ scale: hot ? 1.9 : 1, opacity: hot ? 0.85 : 0.4 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        className="absolute -left-3 -top-3 size-6 rounded-full border
                   border-[rgb(var(--jade-400)/0.6)] will-change-transform"
      />
    </div>
  );
}
