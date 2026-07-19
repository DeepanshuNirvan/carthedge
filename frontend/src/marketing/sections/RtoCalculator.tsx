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
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-hi">{label}</span>
        <span className="font-mono text-jade-500 tnum">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full accent-jade-500"
        style={{
          background: `linear-gradient(90deg, rgb(var(--jade-500)) ${pct}%, rgb(var(--surface-3)) ${pct}%)`,
        }}
      />
    </label>
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
      <SectionHead eyebrow={calculator.eyebrow} title={calculator.title} sub={calculator.sub} />
      <Reveal>
        <div className="grid gap-8 rounded-xl bg-surface p-6 shadow-raised hairline sm:p-10 lg:grid-cols-[1fr_1.1fr]">
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

          <div className="flex flex-col justify-center gap-6 rounded-lg bg-surface-2 p-6 sm:p-8">
            <div>
              <p className="font-display text-5xl font-semibold tracking-tight text-jade-500 sm:text-6xl">
                <AnimatedRupees paise={saved} />
              </p>
              <p className="mt-1.5 text-sm font-medium uppercase tracking-wider text-mid">
                {calculator.savedLabel}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-xs text-mid">
                  <span>{calculator.lossNow}</span>
                  <span className="font-mono tnum text-danger">{formatPaise(lossNow)}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-danger/80 transition-all duration-expr ease-enter" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-mid">
                  <span>{calculator.withUs}</span>
                  <span className="font-mono tnum text-jade-500">{formatPaise(lossWith)}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-jade-500 transition-all duration-expr ease-enter"
                    style={{ width: `${(lossWith / maxBar) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="rounded-md bg-gold-400/10 px-4 py-3 text-sm font-medium text-gold-500">
              {calculator.paysFor(paysFor)}
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
