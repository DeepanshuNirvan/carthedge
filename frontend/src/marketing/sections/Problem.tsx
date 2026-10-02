import { useEffect, useRef } from 'react';
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { problem, seededStatLabels } from '@/strings/marketing';
import { useSite } from '@/api/site';
import { Reveal } from '../Section';

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!inView || reduced || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, to, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (node.textContent = String(Math.round(v))),
    });
    return () => controls.stop();
  }, [inView, to, reduced]);
  return <span ref={ref}>{to}</span>;
}

/** The inbox at midnight: the same questions piling up like a lock screen nobody can clear. */
export function Problem() {
  const live = useSite().data?.stats;
  // untouched seed placeholders are not measured numbers: use the figures from the product brief instead
  const stats = !live || live.every((s) => seededStatLabels.includes(s.label)) ? problem.stats : live;
  const reduced = useReducedMotion();
  const pileRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pileRef, offset: ['start end', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section id="problem" className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-12">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <Reveal>
          <h2 className="max-w-[16ch] text-d2 font-semibold text-hi">{problem.title}</h2>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-mid">{problem.copy}</p>
        </Reveal>

        <motion.div
          ref={pileRef}
          style={reduced ? undefined : { y: drift }}
          className="relative mx-auto flex w-full max-w-sm flex-col gap-2"
          initial={reduced ? false : 'hidden'}
          whileInView="shown"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.11 } } }}
          aria-label="Unanswered buyer messages"
        >
          {problem.pile.map((n, i) => (
            <motion.div
              key={n.from}
              variants={{
                hidden: { opacity: 0, y: -24, scale: 0.94 },
                shown: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 24 } },
              }}
              className="glass-nav sheen flex items-center gap-3 rounded-[22px] p-3"
              style={{ marginLeft: `${(i % 3) * 10}px`, marginRight: `${((i + 1) % 3) * 8}px` }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,rgb(var(--gold-400)),rgb(var(--danger))_55%,rgb(var(--info)))] text-white">
                <Instagram className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="truncate font-semibold text-hi">{n.from}</span>
                  <span className="shrink-0 text-[11px] text-low">{i < 2 ? 'now' : `${i * 7}m ago`}</span>
                </p>
                <p className="truncate text-[13px] text-mid">{n.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* the cost, said as sentences rather than a row of big numbers */}
      <ul className="mt-16 grid gap-x-10 gap-y-4 border-t pt-8 md:grid-cols-3">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 0.06}>
            <li className="text-[15px] leading-relaxed text-mid">
              <span className="mr-1.5 text-[17px] font-semibold tnum text-hi">
                <CountUp to={stat.value} />
                {stat.suffix}
              </span>
              {stat.label}
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
