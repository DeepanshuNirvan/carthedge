import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, Instagram } from 'lucide-react';
import { services } from '@/strings/marketing';
import { cn } from '@/lib/cn';
import { Tabs } from '@/ui/Tabs';
import { Badge } from '@/ui/Badge';
import { Reveal, SectionHead } from '../Section';

const { demo } = services;
type Trade = (typeof demo.trades)[number]['value'];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/**
 * A service enquiry, played out: pick a trade and the same assistant holds that
 * business's chat, then the enquiry it wrote down lights up beside it. Every
 * bubble keeps its place from the start, so nothing on the page moves as the
 * chat fills in.
 */
export function ServiceChat() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  const [trade, setTrade] = useState<Trade>(demo.trades[0].value);
  const chat = demo.trades.find((t) => t.value === trade) ?? demo.trades[0];
  const total = chat.messages.length;
  const [shown, setShown] = useState(0);

  useEffect(() => setShown(0), [trade]);
  useEffect(() => {
    if (reduced || !inView || shown >= total) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : 1050);
    return () => clearTimeout(t);
  }, [shown, total, inView, reduced]);

  const visible = reduced ? total : shown;
  const noted = visible >= total;

  return (
    <div ref={ref}>
      {/* four trades do not fit a narrow phone: the rail scrolls inside the page gutter */}
      <div className="-mx-5 mb-4 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <Tabs tabs={demo.trades.map((t) => ({ value: t.value, label: t.label }))} value={trade} onChange={setTrade} className="w-max" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr] lg:gap-4">
        <div className="relative flex items-center justify-center overflow-hidden rounded-2xl p-4 shadow-float sm:p-10">
          <img src="/demo/aurora-texture.webp" alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-bg/55" />

          <div className="glass sheen relative w-full max-w-md rounded-xl">
            <div className="flex items-center gap-2.5 border-b px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-jade-500/15 text-caption font-semibold text-jade-ink">
                {initials(chat.business)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-ui font-semibold tracking-snug text-hi">{chat.business}</p>
                <p className="flex items-center gap-1 text-caption text-low">
                  <Instagram className="size-3" aria-hidden /> {chat.handle}
                </p>
              </div>
            </div>

            <ol className="flex flex-col gap-2 p-4" aria-label={`A buyer's chat with ${chat.business}`}>
              {chat.messages.map((m, i) => (
                <motion.li
                  key={`${trade}-${i}`}
                  initial={false}
                  animate={{ opacity: i < visible ? 1 : 0, y: i < visible ? 0 : 8 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className={cn(
                    'max-w-[88%] rounded-2xl px-3.5 py-2 text-ui leading-snug text-hi',
                    m.from === 'buyer' ? 'self-start rounded-bl-md bg-field/9' : 'self-end rounded-br-md bg-jade-500/20 ring-1 ring-inset ring-jade-500/24',
                  )}
                >
                  {m.text}
                </motion.li>
              ))}
            </ol>
          </div>
        </div>

        {/* what the owner gets: dim while the chat is still going, lit once it is written down */}
        <div className={cn('panel flex flex-col rounded-2xl p-5 transition-opacity duration-expr sm:p-7', noted ? 'opacity-100' : 'opacity-45')} aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2.5 text-ui font-semibold tracking-snug text-hi">
              <span className="bulb size-2.5" data-lit={noted} />
              {demo.cardTitle}
            </p>
            <Badge tone="gold">New</Badge>
          </div>
          <p className="mt-0.5 text-caption text-low">{demo.cardMeta}</p>

          <p className="mt-5 text-title font-semibold tracking-snug text-hi">{chat.enquiry.about}</p>
          <dl className="mt-3 divide-y border-y">
            {chat.enquiry.answers.map((a) => (
              <div key={a.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-note text-low">{a.label}</dt>
                <dd className="text-right text-ui text-hi">{a.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-ui font-medium text-hi">{chat.enquiry.who}</p>
          <p className="mt-auto pt-5 text-note leading-relaxed text-low">{demo.cardFoot}</p>
        </div>
      </div>
    </div>
  );
}

/** The home page's word on services: the same demo, and the way to the full page. */
export function ServicesTeaser() {
  return (
    <section id="services" className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <SectionHead title={services.home.title} sub={services.home.sub} />
      <Reveal>
        <ServiceChat />
      </Reveal>
      <Link
        to="/services"
        className="group mt-6 inline-flex min-h-11 items-center gap-1.5 text-copy font-semibold text-jade-ink underline-offset-4 hover:underline"
      >
        {services.home.link}
        <ArrowRight className="size-4 transition-transform duration-std ease-spring group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </section>
  );
}
