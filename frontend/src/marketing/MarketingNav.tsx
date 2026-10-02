import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { nav } from '@/strings/marketing';
import { useSite } from '@/api/site';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/cn';
import { buttonLink } from '@/ui/buttonLink';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { IconButton } from '@/ui/Button';
import { Wordmark } from './Wordmark';
import { SectionLink } from './SectionLink';

/** A floating glass capsule. Transparent over the hero, frosted once the page moves under it. */
export function MarketingNav() {
  const announcement = useSite().data?.site.announcement?.trim();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  useScrollLock(open);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 20));

  const linkCls =
    'relative isolate rounded-full px-3.5 py-2 text-[13.5px] font-medium text-mid transition-colors duration-micro hover:text-hi';

  // one pill shared across links via layoutId, so it glides from item to item
  const pill = (
    <motion.span
      layoutId="navHover"
      className="absolute inset-0 -z-10 rounded-full bg-[rgb(var(--field)/0.08)]"
      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
    />
  );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-3 [&>*]:pointer-events-auto pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-4">
      {/* set by CartHedge staff in the admin console; empty hides it */}
      {/* folds away once the page moves, so it never sits on top of content */}
      <AnimatePresence initial={false}>
        {announcement && !scrolled && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, marginBottom: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-nav line-clamp-2 max-w-3xl overflow-hidden rounded-full px-4 py-1.5 text-center text-xs font-medium leading-snug text-gold-ink"
          >
            {announcement}
          </motion.p>
        )}
      </AnimatePresence>
      <nav
        aria-label="Main"
        className={cn(
          'flex w-full max-w-6xl items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 transition-[background-color,box-shadow,max-width] duration-std ease-enter sm:pl-5',
          scrolled ? 'glass-nav sheen max-w-5xl' : 'bg-transparent',
        )}
      >
        <Link to="/" aria-label="CartHedge home" className="shrink-0">
          <Wordmark />
        </Link>
        <div className="hidden items-center md:flex" onPointerLeave={() => setHovered(null)}>
          {nav.links.map((l) => (
            <SectionLink key={l.href} href={l.href} onPointerEnter={() => setHovered(l.href)} className={linkCls}>
              {hovered === l.href && pill}
              {l.label}
            </SectionLink>
          ))}
        </div>
        <div className="hidden items-center gap-1 md:flex">
          <ThemeToggle />
          <Link to="/app/login" className={cn(buttonLink('ghost'), 'h-10 px-4')}>
            {nav.login}
          </Link>
          <Link to="/app/register" className={cn(buttonLink('primary'), 'h-10 px-4')}>
            {nav.cta}
          </Link>
        </div>
        <div className="flex items-center gap-0.5 md:hidden">
          <ThemeToggle />
          <IconButton label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </IconButton>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-bar fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(5.5rem+env(safe-area-inset-top))] md:hidden"
          >
            <div className="flex flex-col px-6">
              {nav.links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, type: 'spring', stiffness: 380, damping: 32 }}
                  className="border-b"
                >
                  <SectionLink
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-4 text-d4 font-semibold text-hi"
                  >
                    {l.label}
                    <ArrowUpRight className="size-5 text-low" aria-hidden />
                  </SectionLink>
                </motion.div>
              ))}
              <div className="mt-8 flex flex-col gap-3">
                <Link to="/app/register" className={buttonLink('primary', 'lg')} onClick={() => setOpen(false)}>
                  {nav.cta}
                </Link>
                <Link to="/app/login" className={buttonLink('secondary', 'lg')} onClick={() => setOpen(false)}>
                  {nav.login}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
