import { CheckCircle2 } from 'lucide-react';
import { storefrontPreview } from '@/strings/marketing';
import { Section, SectionHead, Reveal } from '../Section';
import { MoneyText } from '@/ui/MoneyText';

const demoProducts = [
  { name: 'Chikankari Kurti', price: 149900, tone: 'bg-jade-500/20' },
  { name: 'Silver Jhumkas', price: 89900, tone: 'bg-gold-400/25' },
  { name: 'Banarasi Dupatta', price: 219900, tone: 'bg-info/20' },
  { name: 'Block-print Saree', price: 329900, tone: 'bg-danger/15' },
];

/** Device mockup of the buyer storefront — pure CSS, no images to load. */
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
                  <CheckCircle2 className="size-4.5 shrink-0 text-jade-500" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="relative mx-auto w-full max-w-[300px]">
            <div aria-hidden className="absolute -inset-10 rounded-full bg-jade-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border-4 border-ink-800 bg-surface shadow-raised">
              <div className="flex items-center gap-2 border-b bg-surface-2 px-4 py-3">
                <span className="size-7 rounded-full bg-gradient-to-br from-jade-500 to-gold-400" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-hi">Ritika&apos;s Closet</p>
                  <p className="font-mono text-[10px] text-low">/s/ritikas-closet</p>
                </div>
                <span className="ml-auto rounded-full bg-jade-500/12 px-2 py-0.5 text-[10px] font-medium text-jade-500">
                  Verified
                </span>
              </div>
              <p className="border-b bg-surface-2/50 px-4 py-1.5 text-center text-[10px] text-low">
                Payments secured by Razorpay
              </p>
              <div className="grid grid-cols-2 gap-2.5 p-3.5">
                {demoProducts.map((p) => (
                  <div key={p.name} className="overflow-hidden rounded-md bg-surface-2 hairline">
                    <div className={`h-20 ${p.tone}`} aria-hidden />
                    <div className="p-2">
                      <p className="truncate text-[11px] font-medium text-hi">{p.name}</p>
                      <MoneyText paise={p.price} className="text-[11px] text-jade-500" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3.5 pb-4">
                <div className="rounded-md bg-jade-500 py-2.5 text-center text-xs font-semibold text-white">
                  Buy now — no signup
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
