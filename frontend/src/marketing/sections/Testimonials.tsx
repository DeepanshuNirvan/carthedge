import { Quote } from 'lucide-react';
import { testimonials } from '@/strings/marketing';
import { Section, SectionHead, Reveal } from '../Section';

export function Testimonials() {
  return (
    <Section id="stories" className="py-16 md:py-24">
      <SectionHead eyebrow={testimonials.eyebrow} title={testimonials.title} />
      <div className="grid gap-5 md:grid-cols-3">
        {testimonials.items.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.07}>
            <figure className="flex h-full flex-col rounded-lg bg-surface p-7 shadow-soft hairline">
              <Quote className="size-5 text-jade-500/60" aria-hidden />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-hi">“{t.quote}”</blockquote>
              <figcaption className="mt-6 border-t pt-4">
                <p className="text-sm font-semibold text-hi">{t.name}</p>
                <p className="text-xs text-low">{t.business}</p>
                <p className="mt-2 w-fit rounded-full bg-jade-500/10 px-2.5 py-1 font-mono text-xs text-jade-500 tnum">
                  {t.metric}
                </p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
