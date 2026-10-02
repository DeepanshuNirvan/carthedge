import { languages } from '@/strings/marketing';
import { Reveal } from '../Section';

/** The page's one marquee: real buyer questions in the scripts they arrive in. */
export function Languages() {
  const row = [...languages.lines, ...languages.lines];
  return (
    <section aria-labelledby="languages-title" className="relative py-16 sm:py-20 md:pb-0">
      <Reveal className="mx-auto mb-10 w-full max-w-6xl px-5 sm:px-8">
        <h2 id="languages-title" className="max-w-[20ch] text-d3 font-semibold text-hi">
          {languages.title}
        </h2>
        <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-mid">{languages.sub}</p>
      </Reveal>

      <div
        className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
        aria-label={languages.lines.join(', ')}
        role="img"
      >
        <div className="flex w-max animate-marquee gap-3 py-2 motion-reduce:animate-none motion-reduce:flex-wrap [@media(hover:hover)]:group-hover:[animation-play-state:paused]">
          {row.map((line, i) => (
            <span
              key={i}
              aria-hidden
              className="panel shrink-0 rounded-[22px] rounded-bl-md px-5 py-3 text-lg text-hi sm:text-xl"
            >
              {line}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
