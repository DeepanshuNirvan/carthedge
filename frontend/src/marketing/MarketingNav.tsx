import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { nav } from '@/strings/marketing';
import { cn } from '@/lib/cn';
import { buttonLink } from '@/ui/buttonLink';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { IconButton } from '@/ui/Button';
import { Wordmark } from './Wordmark';

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkEl = (l: { label: string; href: string }) =>
    l.href.startsWith('#') ? (
      <a key={l.href} href={l.href} className="text-sm text-mid transition-colors duration-micro hover:text-hi">
        {l.label}
      </a>
    ) : (
      <Link key={l.href} to={l.href} className="text-sm text-mid transition-colors duration-micro hover:text-hi">
        {l.label}
      </Link>
    );

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        aria-label="Main"
        className={cn(
          'flex w-full max-w-6xl items-center justify-between gap-4 rounded-xl px-4 py-2.5 transition-all duration-std sm:px-5',
          scrolled ? 'glass shadow-soft' : 'bg-transparent',
        )}
      >
        <Link to="/" aria-label="CartHedge home" className="shrink-0">
          <Wordmark />
        </Link>
        <div className="hidden items-center gap-7 md:flex">{nav.links.map(linkEl)}</div>
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
            className="fixed inset-0 z-40 flex flex-col bg-bg/95 pt-24 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-2 px-8">
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
