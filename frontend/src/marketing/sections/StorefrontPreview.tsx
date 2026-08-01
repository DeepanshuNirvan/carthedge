import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { storefrontPreview } from '@/strings/marketing';
import { Section, SectionHead, Reveal } from '../Section';
import { MoneyText } from '@/ui/MoneyText';
import { demoCatalog } from '../demoCatalog';

/** Real phone mockup of the buyer storefront with art-directed product photos. */
export function StorefrontPreview() {
  return (
    <Section id="storefront">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHead
            align="left"
            eyebrow={storefrontPreview.eyebrow}
            title={storefrontPreview.title}
            sub={storefrontPreview.copy}
          />
          <Reveal>
            <ul className="-mt-6 flex flex-col gap-3">
              {storefrontPreview.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm text-mid">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-jade-500/14 text-jade-ink">
                    <CheckCircle2 className="size-4" aria-hidden />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="relative mx-auto w-full max-w-[310px]">
            <div aria-hidden className="absolute -inset-12 rounded-full bg-jade-500/10 blur-3xl" />
            {/* phone shell — double-bezel */}
            <div className="relative rounded-[2.6rem] bg-gradient-to-b from-ink-800 to-ink-950 p-2 shadow-float">
              <div className="overflow-hidden rounded-[2.1rem] bg-surface">
                {/* store header */}
                <div className="glass-nav flex items-center gap-2.5 px-4 py-3">
                  <span
                    className="size-8 rounded-full bg-gradient-to-br from-jade-500 to-gold-400 shadow-[inset_0_1px_1px_rgb(255_255_255/0.3)]"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-hi">Ritika&apos;s Closet</p>
                    <p className="font-mono text-[10px] text-low">/s/ritikas-closet</p>
                  </div>
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-jade-500/14 px-2 py-0.5 text-[10px] font-semibold text-jade-ink">
                    <ShieldCheck className="size-3" /> Verified
                  </span>
                </div>
                <p className="border-b bg-surface-2/50 px-4 py-1.5 text-center text-[10px] text-low">
                  Payments secured by Razorpay
                </p>
                {/* product grid */}
                <div className="grid grid-cols-2 gap-2.5 p-3">
                  {demoCatalog.map((p) => (
                    <div key={p.name} className="group overflow-hidden rounded-lg panel">
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <img
                          src={p.img}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover transition-transform duration-expr ease-enter group-hover:scale-105"
                        />
                        {p.tag && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur">
                            {p.tag}
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[11px] font-medium text-hi">{p.name}</p>
                        <div className="flex items-baseline gap-1.5">
                          <MoneyText paise={p.price} className="text-[11px] text-jade-ink" />
                          {p.compareAt && <MoneyText paise={p.compareAt} strike className="text-[9px]" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-4">
                  <div className="flex h-10 items-center justify-center rounded-md bg-gradient-to-b from-jade-400 to-jade-500 text-xs font-semibold text-[rgb(var(--text-on-accent))] clay">
                    Buy now · no signup
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
