import { Link } from 'react-router-dom';
import { Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import { footer } from '@/strings/marketing';
import { useSite } from '@/api/site';
import { Wordmark } from './Wordmark';
import { ThemeToggle } from '@/ui/ThemeToggle';

export function Footer() {
  const { data: site } = useSite();
  const socials = [
    { href: site?.social.instagram, icon: Instagram, label: 'Instagram' },
    { href: site?.social.twitter, icon: Twitter, label: 'Twitter' },
    { href: site?.social.linkedin, icon: Linkedin, label: 'LinkedIn' },
    { href: site?.social.youtube, icon: Youtube, label: 'YouTube' },
  ].filter((s) => s.href);

  const columns = [footer.product, footer.company, footer.legal];

  return (
    <footer className="border-t bg-surface/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-8 sm:py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 flex flex-col items-start gap-4 md:col-span-1">
          <Wordmark />
          <p className="max-w-xs text-sm text-mid">{site?.site.tagline || footer.tagline}</p>
          {site?.contact.email && (
            <a href={`mailto:${site.contact.email}`} className="inline-flex min-h-9 items-center text-sm text-jade-ink hover:underline">
              {site.contact.email}
            </a>
          )}
          {/* -ml-2.5 keeps the row optically flush with the text above it
              while each icon still carries a 40px touch target */}
          {socials.length > 0 && (
            <div className="-ml-2.5 flex gap-1">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-10 items-center justify-center rounded-md text-low transition-colors hover:bg-surface-2 hover:text-hi"
                >
                  <s.icon className="size-4.5" />
                </a>
              ))}
            </div>
          )}
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-low">{col.title}</p>
            {/* the row height IS the spacing here — a 36px link is both
                comfortably tappable and visually the same rhythm as gap-2 */}
            <ul className="flex flex-col">
              {col.links.map((l) => (
                <li key={l.href} className="flex">
                  {l.href.startsWith('#') ? (
                    <a href={l.href} className="inline-flex min-h-9 items-center text-sm text-mid transition-colors hover:text-hi">
                      {l.label}
                    </a>
                  ) : (
                    <Link to={l.href} className="inline-flex min-h-9 items-center text-sm text-mid transition-colors hover:text-hi">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-t px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-8">
        <p className="text-xs text-low">
          © {new Date().getFullYear()} CartHedge · {footer.madeIn}
        </p>
        <ThemeToggle />
      </div>
    </footer>
  );
}
