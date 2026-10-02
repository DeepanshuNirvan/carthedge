import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, PackageSearch } from 'lucide-react';
import type { StoreBusiness } from '@/api/types';
import { LogoMark } from '@/marketing/Wordmark';
import { whatsappHref } from '@/lib/validators';

export function StoreFooter({ business }: { business: StoreBusiness }) {
  return (
    <footer className="mt-10 border-t px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
        <Link
          to="/track"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-jade-ink hover:underline"
        >
          <PackageSearch className="size-4" />
          Track your order
        </Link>

        {/* the DM is where these buyers came from and where they ask questions —
            give both channels a real, thumb-sized target, not just a header icon */}
        {(business.instagram || business.whatsapp) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {business.instagram && (
              <a
                href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="neu inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-mid transition-colors hover:text-hi"
              >
                <Instagram className="size-4" aria-hidden /> DM on Instagram
              </a>
            )}
            {business.whatsapp && (
              <a
                href={whatsappHref(business.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="neu inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-mid transition-colors hover:text-hi"
              >
                <MessageCircle className="size-4" aria-hidden /> Chat on WhatsApp
              </a>
            )}
          </div>
        )}
        <p className="text-xs leading-relaxed text-low">
          {business.name}
          {business.city && ` · ${business.city}`}
          {business.codEnabled && ' · Cash on delivery available'}
        </p>
        <a
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[11px] text-low transition-colors hover:text-mid"
        >
          <LogoMark size={14} />
          Powered by <span className="font-medium text-mid">CartHedge</span>
        </a>
      </div>
    </footer>
  );
}
