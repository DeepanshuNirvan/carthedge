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
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col items-start gap-4">
          <Wordmark />
          <p className="max-w-xs text-sm text-mid">{site?.site.tagline || footer.tagline}</p>
          {site?.contact.email && (
            <a href={`mailto:${site.contact.email}`} className="text-sm text-jade-500 hover:underline">
              {site.contact.email}
            </a>
          )}
          {socials.length > 0 && (
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noreferrer"
                  className="text-low transition-colors hover:text-hi"
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
            <ul className="flex flex-col gap-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith('#') ? (
                    <a href={l.href} className="text-sm text-mid transition-colors hover:text-hi">
                      {l.label}
                    </a>
                  ) : (
                    <Link to={l.href} className="text-sm text-mid transition-colors hover:text-hi">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-t px-5 py-5 sm:px-8">
        <p className="text-xs text-low">
          © {new Date().getFullYear()} CartHedge · {footer.madeIn}
        </p>
        <ThemeToggle />
      </div>
    </footer>
  );
}
