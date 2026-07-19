import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Landmark, Lock, ShieldCheck } from 'lucide-react';
import { guides, trust } from '@/strings/marketing';
import { Section, SectionHead, Reveal } from '../Section';
import { cn } from '@/lib/cn';

const trustIcons = [Landmark, Lock, ShieldCheck];

export function Trust() {
  return (
    <Section id="trust" className="py-16 md:py-20">
      <SectionHead eyebrow={trust.eyebrow} title={trust.title} />
      <div className="grid gap-5 md:grid-cols-3">
        {trust.points.map((point, i) => {
          const Icon = trustIcons[i];
          return (
            <Reveal key={point.title} delay={i * 0.07}>
              <article className="h-full rounded-lg bg-surface p-6 shadow-soft hairline">
                <Icon className="size-6 text-gold-400" aria-hidden />
                <h3 className="mt-4 font-display text-base font-semibold text-hi">{point.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mid">{point.copy}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

export function Guides() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="guides">
      <SectionHead eyebrow={guides.eyebrow} title={guides.title} />

      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {guides.steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 0.07}>
            <li className="relative h-full rounded-lg bg-surface p-6 pt-8 shadow-soft hairline">
              <span className="absolute -top-4 left-6 flex size-8 items-center justify-center rounded-full bg-jade-500 font-mono text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="font-display text-base font-semibold text-hi">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mid">{step.copy}</p>
            </li>
          </Reveal>
        ))}
      </ol>

      <Reveal className="mt-20">
        <h3 className="mb-6 text-center font-display text-d3 font-semibold text-hi">{guides.faqTitle}</h3>
        <div className="mx-auto max-w-2xl divide-y rounded-lg bg-surface shadow-soft hairline">
          {guides.faqs.map((faq, i) => (
            <div key={faq.q}>
              <button
                className="flex w-full items-center justify-between gap-4 px-6 py-4.5 text-left"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="py-1 text-sm font-medium text-hi">{faq.q}</span>
                <ChevronDown
                  className={cn('size-4.5 shrink-0 text-low transition-transform duration-std', open === i && 'rotate-180')}
                  aria-hidden
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-sm leading-relaxed text-mid">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
