import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { storefrontPreview } from '@/strings/marketing';
import { MoneyText } from '@/ui/MoneyText';
import { SectionHead } from '../Section';
import { demoCatalog } from '../demoCatalog';

function Float({
  y,
  className,
  children,
}: {
  y: MotionValue<number> | undefined;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div style={y ? { y } : undefined} className={className}>
      {children}
    </motion.div>
  );
}

/** The buyer's side: the phone a buyer actually holds, with the catalogue's real photos at different depths around it. */
export function StorefrontPreview() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start end', 'end start'] });
  const deep = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const mid = useTransform(scrollYProgress, [0, 1], [60, -70]);
  const near = useTransform(scrollYProgress, [0, 1], [-30, 40]);
  const v = (m: MotionValue<number>) => (reduced ? undefined : m);

  return (
    <section id="storefront" className="relative mx-auto w-full max-w-6xl px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-20 md:pt-0">
      <SectionHead title={storefrontPreview.title} sub={storefrontPreview.copy} />

      <div ref={stage} className="relative mx-auto mt-4 flex max-w-4xl justify-center py-6 sm:py-12">
        {/* real product photos, hung at three depths around the phone */}
        <Float y={v(deep)} className="absolute left-0 top-6 hidden w-40 md:block lg:-left-6 lg:w-48">
          <img src="/demo/jhumka.webp" alt="" aria-hidden loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-lg object-cover shadow-float" />
        </Float>
        <Float y={v(mid)} className="absolute bottom-10 left-10 hidden w-32 md:block lg:left-20 lg:w-36">
          <img src="/demo/cushion.webp" alt="" aria-hidden loading="lazy" decoding="async" className="aspect-square w-full rounded-lg object-cover shadow-float" />
        </Float>
        <Float y={v(deep)} className="absolute right-0 top-20 hidden w-36 md:block lg:-right-4 lg:w-44">
          <img src="/demo/juttis.webp" alt="" aria-hidden loading="lazy" decoding="async" className="aspect-[4/5] w-full rounded-lg object-cover shadow-float" />
        </Float>

        {/* notes, the closest layer */}
        <Float y={v(near)} className="absolute left-[4%] top-[46%] z-20 hidden lg:block">
          <p className="glass-nav sheen flex items-center gap-2 rounded-full px-4 py-2.5 text-ui font-medium text-hi">
            <CheckCircle2 className="size-4 text-jade-ink" aria-hidden /> {storefrontPreview.notes[0]}
          </p>
        </Float>
        <Float y={v(near)} className="absolute right-[2%] top-[8%] z-20 hidden lg:block">
          <p className="glass-nav sheen flex items-center gap-2 rounded-full px-4 py-2.5 text-ui font-medium text-hi">
            <CheckCircle2 className="size-4 text-jade-ink" aria-hidden /> {storefrontPreview.notes[1]}
          </p>
        </Float>
        <Float y={v(mid)} className="absolute bottom-16 right-[6%] z-20 hidden lg:block">
          <p className="glass-nav sheen flex items-center gap-2 rounded-full px-4 py-2.5 text-ui font-medium text-hi">
            <CheckCircle2 className="size-4 text-jade-ink" aria-hidden /> {storefrontPreview.notes[2]}
          </p>
        </Float>

        {/* the phone */}
        <div className="relative z-10 w-full max-w-[300px] rounded-device bg-gradient-to-br from-ink-700 to-ink-950 p-2 shadow-float">
          <div className="relative overflow-hidden rounded-screen bg-bg">
            <div className="glass-bar flex items-center gap-2.5 border-b px-4 pb-3 pt-4">
              <span className="flex size-8 items-center justify-center rounded-full bg-jade-500/15 text-caption font-semibold text-jade-ink">
                RC
              </span>
              <div className="min-w-0">
                <p className="truncate text-note font-semibold text-hi">Ritika&apos;s Closet</p>
                <p className="font-mono text-nano text-low">/s/ritikas-closet</p>
              </div>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-jade-500/14 px-2 py-0.5 text-nano font-semibold text-jade-ink">
                <ShieldCheck className="size-3" aria-hidden /> Verified
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2.5">
              {demoCatalog.map((p) => (
                <div key={p.name} className="overflow-hidden rounded-md panel">
                  <img src={p.img} alt={p.name} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
                  <div className="p-2">
                    <p className="truncate text-nano font-medium text-hi">{p.name}</p>
                    <div className="flex items-baseline gap-1.5">
                      <MoneyText paise={p.price} className="text-nano font-semibold text-hi" />
                      {p.compareAt && <MoneyText paise={p.compareAt} strike className="text-nano" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* checkout sheet rising over the grid: phone OTP, then UPI */}
            <motion.div
              initial={reduced ? false : { y: '100%' }}
              whileInView={{ y: '0%' }}
              viewport={{ once: true, margin: '-30%' }}
              transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.3 }}
              className="glass-nav absolute inset-x-0 bottom-0 rounded-t-xl px-4 pb-5 pt-2"
            >
              <span aria-hidden className="mx-auto mb-3 block h-1 w-9 rounded-full bg-low/35" />
              <p className="text-note font-semibold text-hi">Verify your number</p>
              <p className="text-nano text-low">Sent to 98110 43210. No account needed.</p>
              <div className="mt-2.5 flex gap-1.5" aria-hidden>
                {['4', '8', '2', '9', '1', '6'].map((d, i) => (
                  <span
                    key={i}
                    className="flex h-9 flex-1 items-center justify-center rounded-sm neu-inset font-mono text-ui font-semibold text-hi"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <span className="mt-3 flex h-10 items-center justify-center rounded-full bg-gradient-to-b from-jade-400 to-jade-500 text-note font-semibold text-on-accent clay">
                Pay <MoneyText paise={149900} className="mx-1" /> with UPI
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* the same three notes, readable on phones where the floating layer is hidden */}
      <ul className="mx-auto mt-10 flex max-w-md flex-col gap-2.5 lg:hidden">
        {storefrontPreview.notes.map((n) => (
          <li key={n} className="flex items-center gap-2.5 text-sm text-mid">
            <CheckCircle2 className="size-4 shrink-0 text-jade-ink" aria-hidden /> {n}
          </li>
        ))}
      </ul>
    </section>
  );
}
