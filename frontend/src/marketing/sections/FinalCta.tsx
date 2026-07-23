import { Link } from 'react-router-dom';
import { finalCta } from '@/strings/marketing';
import { Reveal } from '../Section';
import { buttonLink } from '@/ui/buttonLink';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-5 py-28 md:py-36">
      <Reveal className="relative z-10 mx-auto max-w-4xl">
        <div className="glass sheen relative overflow-hidden rounded-2xl px-6 py-16 text-center shadow-float sm:px-12 sm:py-20">
          <div aria-hidden className="absolute inset-0">
            <div className="absolute left-1/2 top-0 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-jade-500/20 blur-[130px]" />
            <div className="absolute right-[10%] bottom-0 size-[240px] translate-y-1/3 rounded-full bg-gold-400/16 blur-[100px]" />
          </div>
          <div className="relative flex flex-col items-center gap-6">
            <h2 className="font-display text-d2 font-semibold text-hi">{finalCta.title}</h2>
            <p className="max-w-lg text-lg text-mid">{finalCta.sub}</p>
            <Link to="/app/register" className={buttonLink('primary', 'lg')}>
              {finalCta.cta}
            </Link>
            <p className="text-sm text-low">{finalCta.noCard}</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
