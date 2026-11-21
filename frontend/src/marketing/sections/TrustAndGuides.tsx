import { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Landmark, Lock, ShieldCheck } from 'lucide-react';
import { guides, trust } from '@/strings/marketing';
import { useSite } from '@/api/site';
import { Reveal, SectionHead } from '../Section';
import { FaqList } from '../FaqList';

const trustIcons = [Landmark, Lock, ShieldCheck];

/** Getting started is a real sequence, so it is drawn as one: four bulbs on a wire, lighting in order. */
export function Steps({ items }: { items: { title: string; copy: string }[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  return (
    <ol ref={ref} className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      <span aria-hidden className="absolute left-[5px] right-0 top-[5px] hidden h-px bg-wire/15 lg:block" />
      {items.map((step, i) => (
        <li key={step.title} className="relative pl-7 lg:pl-0 lg:pt-8">
          <span
            className="bulb absolute left-0 top-1 size-3 lg:top-0"
            data-lit={inView}
            style={{ transitionDelay: `${i * 260}ms` }}
          />
          <p className="text-note font-medium tnum text-low">Step {i + 1}</p>
          <h3 className="mt-1 text-base font-semibold tracking-snug text-hi">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-mid">{step.copy}</p>
        </li>
      ))}
    </ol>
  );
}

export function Guides() {
  const faqs = useSite().data?.faqs ?? guides.faqs;
  return (
    <section id="guides" className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <SectionHead title={guides.title} />
      <Steps items={guides.steps} />

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
                    <p className="text-copy font-semibold tracking-snug text-hi">{point.title}</p>
                    <p className="mt-0.5 text-ui leading-relaxed text-mid">{point.copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <FaqList faqs={faqs} />
        </Reveal>
      </div>
    </section>
  );
}
