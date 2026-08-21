import { useMemo, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { calculator } from '@/strings/marketing';
import { Section, SectionHead, Reveal } from '../Section';
import { formatPaise } from '@/lib/money';

const CARTHEDGE_RTO = 8; // avg post-confirmation RTO across sellers
const GROWTH_PLAN_PAISE = 99900;

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <p className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-hi">{label}</span>
        <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-jade-ink tnum">{format(value)}</span>
      </p>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider mt-3.5 w-full cursor-pointer"
        style={{
          background: `linear-gradient(90deg, rgb(var(--jade-500)) ${pct}%, rgb(var(--surface-3)) ${pct}%)`,
        }}
      />
    </div>
  );
}

function AnimatedRupees({ paise }: { paise: number }) {
  const spring = useSpring(paise, { stiffness: 90, damping: 22 });
  spring.set(paise);
  const text = useTransform(spring, (v) => formatPaise(Math.round(v)));
  return <motion.span className="font-mono tnum">{text}</motion.span>;
}

/** The conversion centerpiece — live rupee savings from the seller's own numbers. */
export function RtoCalculator() {
  const [orders, setOrders] = useState(200);
  const [aovRupees, setAovRupees] = useState(1200);
  const [rtoPct, setRtoPct] = useState(25);

  const { lossNow, lossWith, saved, paysFor } = useMemo(() => {
    const aov = aovRupees * 100;
    const lossNow = Math.round(orders * (rtoPct / 100) * aov);
    const effective = Math.min(rtoPct, CARTHEDGE_RTO);
    const lossWith = Math.round(orders * (effective / 100) * aov);
    const saved = Math.max(0, lossNow - lossWith);
    return { lossNow, lossWith, saved, paysFor: Math.max(1, Math.floor(saved / GROWTH_PLAN_PAISE)) };
  }, [orders, aovRupees, rtoPct]);

  const maxBar = Math.max(lossNow, 1);

  return (
    <Section id="calculator">
      <SectionHead eyebrow={calculator.eyebrow} title={calculator.title} sub={calculator.sub} tone="gold" />
      <Reveal>
        <div className="glass sheen grid gap-8 rounded-2xl p-5 shadow-float sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          {/* the seller's numbers */}
          <div className="flex flex-col gap-8">
            <Slider
              label={calculator.orders}
              value={orders}
              min={20}
              max={2000}
              step={10}
              format={(v) => String(v)}
              onChange={setOrders}
            />
            <Slider
              label={calculator.aov}
              value={aovRupees}
              min={200}
              max={10000}
              step={100}
              format={(v) => `₹${v.toLocaleString('en-IN')}`}
              onChange={setAovRupees}
            />
            <Slider
              label={calculator.rto}
              value={rtoPct}
              min={5}
              max={50}
              step={1}
              format={(v) => `${v}%`}
              onChange={setRtoPct}
            />
            <p className="text-xs leading-relaxed text-low">{calculator.assumption}</p>
          </div>

          {/* the money */}
          <div className="relative flex flex-col justify-center gap-7 overflow-hidden rounded-xl panel p-5 sm:p-8">
            <div aria-hidden className="absolute -right-20 -top-20 size-56 rounded-full bg-jade-500/12 blur-3xl" />

            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-jade-ink">
                {calculator.savedLabel}
              </p>
              {/* tabular + nowrap: a rupee figure must never wrap mid-number,
                  which is exactly what break-all was doing here */}
              <p className="mt-2 whitespace-nowrap font-display text-[clamp(2.4rem,1.2rem+4vw,4.25rem)] font-semibold leading-[0.95] tracking-tight text-brand-grad">
                <AnimatedRupees paise={saved} />
              </p>
            </div>

            {/* One track, not two. The full width is today's loss; the jade part
                is the share CartHedge removes. Two separate bars made the reader
                do the subtraction themselves — this shows the cut directly. */}
            <div className="relative">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-mid">{calculator.lossNow}</span>
                <span className="font-mono tnum text-danger-ink">{formatPaise(lossNow)}</span>
              </div>

              <div
                className="mt-2 flex h-4 overflow-hidden rounded-full neu-inset"
                role="img"
                aria-label={`${formatPaise(saved)} of ${formatPaise(lossNow)} recovered`}
              >
                <motion.div
                  className="h-full bg-[linear-gradient(90deg,rgb(var(--jade-400)),rgb(var(--jade-600)))] shadow-[inset_0_1px_0_rgb(255_255_255/0.28)]"
                  animate={{ width: `${(saved / maxBar) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
                <motion.div
                  className="h-full bg-[linear-gradient(90deg,rgb(var(--danger)/0.85),rgb(var(--danger)/0.6))]"
                  animate={{ width: `${(lossWith / maxBar) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>

              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="flex items-center gap-1.5 text-jade-ink">
                  <span className="size-2 rounded-full bg-jade-500" aria-hidden />
                  recovered
                </span>
                <span className="text-mid">
                  {calculator.withUs}{' '}
                  <span className="font-mono tnum text-hi">{formatPaise(lossWith)}</span> still lost
                </span>
              </div>
            </div>

            <p className="relative border-l-2 border-gold-400/60 pl-4 text-sm font-medium text-gold-ink">
              {calculator.paysFor(paysFor)}
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
