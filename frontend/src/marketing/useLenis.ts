import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

// the page's one Lenis, so sections can scroll through it instead of around it
let active: Lenis | null = null;

/** Scroll an element to the top of the page, under the fixed nav. The clearance is
 *  the element's CSS scroll-margin (sections get it in glass.css), which both
 *  Lenis and the native fallback honour, so there is no second offset to keep in
 *  step. Goes through Lenis when it runs: a native scrollIntoView mid-glide is
 *  undone on the next frame by Lenis's own target. */
export function scrollToSection(el: HTMLElement, immediate = false) {
  if (active) active.scrollTo(el, { immediate });
  else el.scrollIntoView({ block: 'start', behavior: immediate ? 'auto' : 'smooth' });
}

/** Smooth, weighted scrolling for the marketing surface only. Lenis drives the
 *  native scroll position, so framer's useScroll and CSS sticky keep working. */
export function useLenis() {
  const reduced = usePrefersReducedMotion();
  const { hash } = useLocation();

  useEffect(() => {
    if (reduced) return;
    // allowNestedScroll: a wheel or swipe over something that scrolls itself
    // (the desk chips on phones, the mobile menu) scrolls that, not the page
    const l = new Lenis({ lerp: 0.11, wheelMultiplier: 1, allowNestedScroll: true });
    active = l;
    let id = 0;
    const raf = (time: number) => {
      l.raf(time);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(id);
      l.destroy();
      if (active === l) active = null;
    };
  }, [reduced]);

  // Arriving from another route with a section hash. Route it through Lenis:
  // a plain scrollIntoView is undone on the next frame by Lenis's own position.
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector<HTMLElement>(hash);
    if (!el) return;
    // a tick after mount so the sections are laid out before we measure
    const id = setTimeout(() => scrollToSection(el, true), 0);
    return () => clearTimeout(id);
  }, [hash]);
}
