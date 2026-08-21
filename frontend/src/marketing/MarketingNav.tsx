import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { nav } from '@/strings/marketing';
import { useSite } from '@/api/site';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/cn';
import { buttonLink } from '@/ui/buttonLink';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { IconButton } from '@/ui/Button';
import { Wordmark } from './Wordmark';

export function MarketingNav() {
  const announcement = useSite().data?.site.announcement?.trim();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  useScrollLock(open);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkCls =
    'relative isolate rounded-lg px-3 py-1.5 text-sm text-mid transition-colors duration-micro hover:text-hi';

  // One pill, shared across links via layoutId, so it glides from item to item
  // instead of each link fading its own background in and out.
  const pill = (
    <motion.span
      layoutId="navHover"
      className="absolute inset-0 -z-10 rounded-lg bg-[rgb(var(--text-hi)/0.07)] hairline"
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    />
  );

  const linkEl = (l: { label: string; href: string }) => {
    const body = (
      <>
        {hovered === l.href && pill}
        {l.label}
      </>
    );
    return l.href.startsWith('#') ? (
      <a key={l.href} href={l.href} onPointerEnter={() => setHovered(l.href)} className={linkCls}>
        {body}
      </a>
    ) : (
      <Link key={l.href} to={l.href} onPointerEnter={() => setHovered(l.href)} className={linkCls}>
        {body}
      </Link>
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      {/* set by CartHedge staff in the admin console; empty hides it */}
      {announcement && (
        <p className="line-clamp-2 max-w-6xl rounded-xl bg-gold-400/14 px-4 py-1.5 text-center text-xs font-medium leading-snug text-gold-ink backdrop-blur">
          {announcement}
        </p>
      )}
      <nav
        aria-label="Main"
        className={cn(
          'flex w-full max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-all duration-std sm:px-5',
          scrolled ? 'glass-nav sheen shadow-raised' : 'bg-transparent',
        )}
      >
        <Link to="/" aria-label="CartHedge home" className="shrink-0">
          <Wordmark />
        </Link>
        <div
          className="hidden items-center gap-1 md:flex"
          onPointerLeave={() => setHovered(null)}
        >
          {nav.links.map(linkEl)}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link to="/app/login" className={buttonLink('ghost')}>
            {nav.login}
          </Link>
          <Link to="/app/register" className={buttonLink('primary')}>
            {nav.cta}
          </Link>
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <IconButton label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
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
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-bg/95 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(6rem+env(safe-area-inset-top))] backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-2 px-7">
              {nav.links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  {l.href.startsWith('#') ? (
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-3 font-display text-d3 font-semibold text-hi"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      to={l.href}
                      onClick={() => setOpen(false)}
                      className="block py-3 font-display text-d3 font-semibold text-hi"
                    >
                      {l.label}
                    </Link>
                  )}
                </motion.div>
              ))}
              <div className="mt-6 flex flex-col gap-3">
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
