import { Link } from 'react-router-dom';
import { finalCta } from '@/strings/marketing';
import { Reveal } from '../Section';
import { buttonLink } from '@/ui/buttonLink';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-28 md:py-40">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-jade-500/15 blur-[140px]" />
        <div className="absolute left-[62%] top-[42%] size-[280px] rounded-full bg-gold-400/12 blur-[110px]" />
      </div>
      <Reveal className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 text-center">
        <h2 className="font-display text-d1 font-semibold text-hi">{finalCta.title}</h2>
        <p className="text-lg text-mid">{finalCta.sub}</p>
        <Link to="/app/register" className={buttonLink('primary', 'lg')}>
          {finalCta.cta}
        </Link>
        <p className="text-sm text-low">{finalCta.noCard}</p>
      </Reveal>
    </section>
  );
}
