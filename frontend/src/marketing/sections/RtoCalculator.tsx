import { useEffect, useMemo, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { calculator } from '@/strings/marketing';
import { formatPaise } from '@/lib/money';
import { Reveal } from '../Section';

const CARTHEDGE_RTO = 8; // refusal rate assumed after COD confirmation
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
        <span className="font-medium text-mid">{label}</span>
        <span className="text-[15px] font-semibold tnum text-hi">{format(value)}</span>
      </p>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider mt-1 w-full cursor-pointer"
        style={{
          backgroundImage: `linear-gradient(90deg, rgb(var(--jade-500)) ${pct}%, rgb(var(--field) / 0.12) ${pct}%)`,
        }}
      />
    </div>
  );
}

function AnimatedRupees({ paise }: { paise: number }) {
  const spring = useSpring(paise, { stiffness: 90, damping: 22 });
  useEffect(() => spring.set(paise), [paise, spring]);
  const text = useTransform(spring, (v) => formatPaise(Math.round(v)));
  return <motion.span className="tnum">{text}</motion.span>;
}

/** One instrument: the seller's own numbers in, rupees kept out. */
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
    <section id="calculator" className="relative mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
      <Reveal className="mb-8">
        <h2 className="text-d3 font-semibold text-hi">{calculator.title}</h2>
        <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-mid">{calculator.sub}</p>
      </Reveal>
      <Reveal>
        <div className="panel grid overflow-hidden rounded-xl lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-5 p-5 sm:p-8">
            <Slider label={calculator.orders} value={orders} min={20} max={2000} step={10} format={String} onChange={setOrders} />
            <Slider
              label={calculator.aov}
              value={aovRupees}
              min={200}
              max={10000}
              step={100}
              format={(v) => `₹${v.toLocaleString('en-IN')}`}
              onChange={setAovRupees}
            />
            <Slider label={calculator.rto} value={rtoPct} min={5} max={50} step={1} format={(v) => `${v}%`} onChange={setRtoPct} />
            <p className="text-xs leading-relaxed text-low">{calculator.assumption}</p>
          </div>

          <div className="flex flex-col justify-center gap-6 border-t bg-[rgb(var(--field)/0.03)] p-5 sm:p-8 lg:border-l lg:border-t-0">
            <div>
              <p className="text-sm font-medium text-mid">{calculator.savedLabel}</p>
              <p className="mt-1 whitespace-nowrap text-[clamp(2.2rem,1.6rem+2vw,3.25rem)] font-semibold leading-none tracking-tightest text-gold-ink">
                <AnimatedRupees paise={saved} />
              </p>
            </div>

            <div className="flex flex-col gap-3" role="img" aria-label={`${formatPaise(lossNow)} lost today, ${formatPaise(lossWith)} with COD confirmation`}>
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-mid">{calculator.lossNow}</span>
                  <span className="font-semibold tnum text-danger-ink">{formatPaise(lossNow)}</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-danger/70" />
              </div>
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-mid">{calculator.withUs}</span>
                  <span className="font-semibold tnum text-hi">{formatPaise(lossWith)}</span>
                </div>
                <motion.div
                  className="mt-1.5 h-2 rounded-full bg-jade-500"
                  animate={{ width: `${Math.max(2, (lossWith / maxBar) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
            </div>

            <p className="text-sm font-medium text-mid">{calculator.paysFor(paysFor)}</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
