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
            <figure className="glass sheen flex h-full flex-col rounded-2xl p-7 shadow-float transition-transform duration-std ease-enter hover:-translate-y-1">
              <Quote className="size-6 text-jade-400/70" aria-hidden />
              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-hi">“{t.quote}”</blockquote>
              <figcaption className="mt-6 border-t pt-4">
                <p className="text-sm font-semibold text-hi">{t.name}</p>
                <p className="text-xs text-low">{t.business}</p>
                <p className="mt-2.5 w-fit rounded-full bg-jade-500/12 px-2.5 py-1 font-mono text-xs font-semibold text-jade-400 tnum shadow-[inset_0_0_0_1px_rgb(var(--jade-500)/0.25)]">
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
