import { useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { Landmark, Lock, Plus, ShieldCheck } from 'lucide-react';
import { guides, trust } from '@/strings/marketing';
import { useSite } from '@/api/site';
import { cn } from '@/lib/cn';
import { Reveal, SectionHead } from '../Section';

const trustIcons = [Landmark, Lock, ShieldCheck];

/** Getting started is a real sequence, so it is drawn as one: four bulbs on a wire, lighting in order. */
function Steps() {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  return (
    <ol ref={ref} className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      <span aria-hidden className="absolute left-[5px] right-0 top-[5px] hidden h-px bg-wire/15 lg:block" />
      {guides.steps.map((step, i) => (
        <li key={step.title} className="relative pl-7 lg:pl-0 lg:pt-8">
          <span
            className="bulb absolute left-0 top-1 size-3 lg:top-0"
            data-lit={inView}
            style={{ transitionDelay: `${i * 260}ms` }}
          />
          <p className="text-[12px] font-medium tnum text-low">Step {i + 1}</p>
          <h3 className="mt-1 text-[16px] font-semibold tracking-snug text-hi">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-mid">{step.copy}</p>
        </li>
      ))}
    </ol>
  );
}

export function Guides() {
  const [open, setOpen] = useState<number | null>(0);
  const faqs = useSite().data?.faqs ?? guides.faqs;
  return (
    <section id="guides" className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
      <SectionHead title={guides.title} />
      <Steps />

      <div className="mt-24 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal>
          <h3 className="text-d3 font-semibold text-hi">{guides.faqTitle}</h3>
          <div className="mt-8 flex flex-col gap-5">
            <p className="text-sm font-medium text-low">{trust.title}</p>
            {trust.points.map((point, i) => {
              const Icon = trustIcons[i];
              return (
                <div key={point.title} className="flex gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-400/14 text-gold-ink">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-semibold tracking-snug text-hi">{point.title}</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-mid">{point.copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="panel divide-y overflow-hidden rounded-xl">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              return (
                <div key={faq.q}>
                  <button
                    className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span className="text-[15px] font-medium tracking-snug text-hi">{faq.q}</span>
                    <Plus
                      className={cn(
                        'size-[18px] shrink-0 text-low transition-transform duration-std ease-spring',
                        isOpen && 'rotate-45 text-jade-ink',
                      )}
                      aria-hidden
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-[62ch] px-5 pb-5 text-sm leading-relaxed text-mid sm:px-6">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
