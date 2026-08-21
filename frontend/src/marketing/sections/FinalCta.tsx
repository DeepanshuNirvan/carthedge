import { Link } from 'react-router-dom';
import { finalCta } from '@/strings/marketing';
import { Reveal } from '../Section';
import { buttonLink } from '@/ui/buttonLink';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-5 py-20 sm:py-28 md:py-36">
      <Reveal className="relative z-10 mx-auto max-w-4xl">
        <div className="glass sheen relative overflow-hidden rounded-2xl px-5 py-14 text-center shadow-float sm:px-12 sm:py-20">
          {/* The craft our sellers actually sell, sitting under the panel as
              material rather than another pair of coloured blobs. */}
          <img
            src="/demo/chikankari.webp"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover opacity-[0.17] saturate-[0.7] [mask-image:radial-gradient(100%_120%_at_50%_100%,black,transparent_72%)]"
          />
          <div aria-hidden className="absolute inset-0">
            <div className="absolute left-1/2 top-0 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-jade-500/16 blur-[130px]" />
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
