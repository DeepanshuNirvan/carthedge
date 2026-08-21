import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

gsap.registerPlugin(ScrollTrigger);

// the fixed nav floats over the page — land the section below it, not under it
const NAV_OFFSET = -104;

/** Smooth scroll + GSAP ScrollTrigger sync for the marketing surface only. */
export function useLenis() {
  const reduced = usePrefersReducedMotion();
  const { hash } = useLocation();
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (reduced) return;
    const l = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
    lenis.current = l;
    l.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => l.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      l.destroy();
      lenis.current = null;
    };
  }, [reduced]);

  // Arriving from another route with a section hash (nav/footer links off the
  // home page). Route it through Lenis — a plain scrollIntoView gets undone on
  // the next frame because Lenis restores its own animated position.
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector<HTMLElement>(hash);
    if (!el) return;
    // a tick after mount so the freshly-rendered sections are laid out before
    // we measure (a timer, not rAF — rAF never fires in a backgrounded tab)
    const id = setTimeout(() => {
      if (lenis.current) lenis.current.scrollTo(el, { offset: NAV_OFFSET, immediate: true });
      else window.scrollTo({ top: el.offsetTop + NAV_OFFSET });
    }, 0);
    return () => clearTimeout(id);
  }, [hash]);
}
