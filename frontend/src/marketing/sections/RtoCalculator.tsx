import { useMemo, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { PiggyBank, TrendingDown } from 'lucide-react';
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
        <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-jade-400 tnum">{format(value)}</span>
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
        <div className="glass sheen grid gap-8 rounded-2xl p-6 shadow-float sm:p-10 lg:grid-cols-[1fr_1.1fr]">
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
          <div className="relative flex flex-col justify-center gap-6 overflow-hidden rounded-xl neu p-6 sm:p-8">
            <div
              aria-hidden
              className="absolute -right-16 -top-16 size-48 rounded-full bg-jade-500/15 blur-3xl"
            />
            <div className="relative">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-jade-400">
                <PiggyBank className="size-4" /> {calculator.savedLabel}
              </p>
              <p className="mt-2 font-display text-[3.25rem] font-semibold leading-none tracking-tight text-brand-grad sm:text-[4.25rem]">
                <AnimatedRupees paise={saved} />
              </p>
            </div>

            <div className="relative flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-mid">{calculator.lossNow}</span>
                  <span className="font-mono tnum text-danger">{formatPaise(lossNow)}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full neu-inset">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-danger to-[rgb(210_78_66)]"
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-mid">
                    <TrendingDown className="size-3.5 text-jade-400" /> {calculator.withUs}
                  </span>
                  <span className="font-mono tnum text-jade-400">{formatPaise(lossWith)}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full neu-inset">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-jade-400 to-jade-500 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]"
                    animate={{ width: `${(lossWith / maxBar) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </div>

            <p className="relative rounded-md bg-gold-400/12 px-4 py-3 text-sm font-semibold text-gold-500 shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.25)]">
              {calculator.paysFor(paysFor)}
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
