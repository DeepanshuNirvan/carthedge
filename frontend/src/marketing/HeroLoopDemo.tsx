import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ShieldCheck, Sparkles } from 'lucide-react';
import { aiDemo } from '@/strings/marketing';
import { formatPaise } from '@/lib/money';

/** The whole product in one looping vignette: Hinglish DM → AI-parsed order
 *  card → one-tap confirm → rupees saved. The hero's proof, not a screenshot. */

const bubbles = aiDemo.conversation.split('\n');
const fields: Array<[string, string]> = [
  ['Item', aiDemo.parsed.item],
  ['Variant', `${aiDemo.parsed.variant} · Qty ${aiDemo.parsed.qty}`],
  ['Customer', `${aiDemo.parsed.name} · ${aiDemo.parsed.phone}`],
  ['Deliver to', aiDemo.parsed.address],
  ['Payment', aiDemo.parsed.payment],
];

// 0 chat · 1 parsing · 2 parsed · 3 confirmed
const HOLD = [2600, 1500, 3200, 2400];

export function HeroLoopDemo() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? 3 : 0);
  const [conf, setConf] = useState(reduced ? aiDemo.parsed.confidence : 0);
  const tilt = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % 4), HOLD[step]);
    return () => clearTimeout(t);
  }, [step, reduced]);

  // count the confidence up during the parsing → parsed transition
  useEffect(() => {
    if (reduced) return;
    if (step < 1) {
      setConf(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setConf(Math.round(aiDemo.parsed.confidence * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, reduced]);

  // subtle cursor tilt — the card feels like a physical object
  const onMove = (e: React.MouseEvent) => {
    if (reduced || !tilt.current) return;
    const r = tilt.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
    tilt.current.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  };
  const onLeave = () => {
    if (tilt.current) tilt.current.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
  };

  const parsing = step === 1;
  const showOrder = step >= 2;
  const confirmed = step === 3;

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="w-full [transform-style:preserve-3d]"
    >
      <div
        ref={tilt}
        className="glass sheen relative rounded-2xl p-5 shadow-float transition-transform duration-std ease-enter sm:p-6"
      >
        {/* header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-hi">
            <span className="grid size-7 place-items-center rounded-full bg-jade-500/15 text-jade-400">
              <Sparkles className="size-4" />
            </span>
            AI order desk
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2/70 px-2.5 py-1 text-[11px] font-medium text-low">
            <span className="size-1.5 animate-pulse rounded-full bg-jade-400" /> live
          </span>
        </div>

        {/* chat */}
        <div className="mt-4 flex flex-col gap-1.5">
          {bubbles.map((b, i) => (
            <motion.div
              key={b}
              initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: reduced ? 0 : i * 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-surface-2/80 px-3.5 py-2 text-[13px] leading-snug text-mid"
            >
              {b}
            </motion.div>
          ))}
        </div>

        {/* parse scanline */}
        <AnimatePresence>
          {parsing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden rounded-2xl"
            >
              <motion.div
                initial={{ y: '-20%' }}
                animate={{ y: '120%' }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="h-16 w-full bg-[linear-gradient(180deg,transparent,rgb(var(--jade-400)/0.18),transparent)]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* divider with confidence */}
        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-line/10" />
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-low">
            {parsing ? 'reading thread…' : 'drafted order'}
            <span className="tnum text-jade-400">{conf}%</span>
          </span>
          <span className="h-px flex-1 bg-line/10" />
        </div>

        {/* order card */}
        <div className="relative mt-4 min-h-[13.5rem]">
          <AnimatePresence>
            {showOrder && (
              <motion.div
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2.5"
              >
                {fields.map(([k, val], i) => (
                  <motion.div
                    key={k}
                    initial={reduced ? false : { opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduced ? 0 : i * 0.09, duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start justify-between gap-4"
                  >
                    <span className="shrink-0 text-xs font-medium text-low">{k}</span>
                    <span className="text-right text-[13px] font-medium text-hi">{val}</span>
                  </motion.div>
                ))}

                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-low">Total</span>
                  <span className="font-mono text-base font-semibold tnum text-hi">
                    {formatPaise(aiDemo.parsed.price)}
                  </span>
                </div>

                <motion.button
                  type="button"
                  aria-label={confirmed ? 'Order confirmed' : aiDemo.confirm}
                  className={
                    'mt-2 flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors duration-std ' +
                    (confirmed
                      ? 'bg-jade-500/15 text-jade-400 shadow-[inset_0_0_0_1px_rgb(var(--jade-500)/0.3)]'
                      : 'bg-gradient-to-b from-jade-400 to-jade-500 text-[rgb(var(--text-on-accent))] clay')
                  }
                  animate={confirmed || reduced ? {} : { scale: [1, 1.02, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                >
                  {confirmed ? (
                    <>
                      <Check className="size-4" strokeWidth={3} /> Confirmed · saved from RTO
                    </>
                  ) : (
                    <>
                      <Check className="size-4" strokeWidth={3} /> {aiDemo.confirm}
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* floating trust chip */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-low">
        <ShieldCheck className="size-3.5 text-jade-400" />
        No signup for buyers · phone OTP only
      </div>
    </div>
  );
}
