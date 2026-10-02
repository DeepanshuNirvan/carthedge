import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

// the fixed nav floats over the page: land the section below it, not under it
const NAV_OFFSET = -96;

/** Smooth, weighted scrolling for the marketing surface only. Lenis drives the
 *  native scroll position, so framer's useScroll and CSS sticky keep working. */
export function useLenis() {
  const reduced = usePrefersReducedMotion();
  const { hash } = useLocation();
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (reduced) return;
    const l = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.current = l;
    let id = 0;
    const raf = (time: number) => {
      l.raf(time);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      l.destroy();
      lenis.current = null;
    };
  }, [reduced]);

  // Arriving from another route with a section hash. Route it through Lenis:
  // a plain scrollIntoView is undone on the next frame by Lenis's own position.
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector<HTMLElement>(hash);
    if (!el) return;
    // a tick after mount so the sections are laid out before we measure
    const id = setTimeout(() => {
      if (lenis.current) lenis.current.scrollTo(el, { offset: NAV_OFFSET, immediate: true });
      else window.scrollTo({ top: el.offsetTop + NAV_OFFSET });
    }, 0);
    return () => clearTimeout(id);
  }, [hash]);
}
