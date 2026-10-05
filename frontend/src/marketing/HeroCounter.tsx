import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { Check, Instagram, Sparkles } from 'lucide-react';
import { counter } from '@/strings/marketing';
import { formatPaise } from '@/lib/money';
import { cn } from '@/lib/cn';
import { StatusChip } from '@/ui/Badge';
import { BulbString } from '@/ui/BulbString';

/*
  The hero's proof: one conversation played on a loop across a glass counter.
  0 reset · 1 buyer asks · 2 typing · 3 AI answers · 4 buyer gives details ·
  5 typing · 6 summary sent · 7 buyer says haan · 8 draft ready · 9 approved
*/
const HOLD = [500, 1000, 1300, 1500, 1000, 1200, 1700, 1300, 1500, 3600];
const FINAL = 9;
const msgAt = [1, 3, 4, 6, 7]; // step at which each message appears

const o = counter.order;

function Pane({
  children,
  className,
  y,
}: {
  children: ReactNode;
  className?: string;
  y?: MotionValue<number>;
}) {
  return (
    <motion.div style={y ? { y } : undefined} className={cn('glass sheen flex flex-col rounded-xl', className)}>
      {children}
    </motion.div>
  );
}

function PaneHead({ icon, title, meta }: { icon: ReactNode; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b px-4 py-3">
      {icon}
      <div className="min-w-0">
        <p className="truncate text-ui font-semibold tracking-snug text-hi">{title}</p>
        <p className="truncate text-caption text-low">{meta}</p>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className="flex w-fit items-center gap-1 self-end rounded-2xl rounded-br-md bg-jade-500/12 px-3.5 py-3 text-jade-ink"
      aria-label="Assistant is typing"
    >
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </motion.div>
  );
}

/** Field that is AI-inferred (hairline, dotted) until the buyer confirms it (solid, inked). */
function Fact({ k, v, solid }: { k: string; v: ReactNode; solid: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-note text-low">{k}</span>
      <span
        className={cn(
          'text-right text-note transition-[color,text-decoration-color] duration-expr',
          solid
            ? 'font-medium text-hi decoration-transparent'
            : 'text-mid underline decoration-dotted decoration-low/60 underline-offset-2',
        )}
      >
        {v}
      </span>
    </div>
  );
}

export function HeroCounter() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? FINAL : 0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % (FINAL + 1)), HOLD[step]);
    return () => clearTimeout(t);
  }, [step, reduced]);

  // micro-parallax: the three panes drift at different depths as the hero scrolls away
  const { scrollYProgress } = useScroll({ target: root, offset: ['start end', 'end start'] });
  const yA = useTransform(scrollYProgress, [0.3, 1], [0, -18]);
  const yB = useTransform(scrollYProgress, [0.3, 1], [0, -46]);
  const yC = useTransform(scrollYProgress, [0.3, 1], [0, -30]);

  // the counter leans a few degrees toward the pointer, like an object on a table
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), { stiffness: 120, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 120, damping: 20 });
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const summarised = step >= 6;
  const saidYes = step >= 7;
  const drafted = step >= 8;
  const approved = step >= 9;

  // the strand over the counter: small bulbs light in order as the sale moves along it
  const progress = [0, 0.05, 0.12, 0.3, 0.38, 0.45, 0.6, 0.72, 0.85, 1][step];
  const smallBulbs = 17;

  const big = [
    { at: 0.17, label: 'Answered', lit: step >= 2, done: summarised },
    { at: 0.53, label: 'Summarised', lit: summarised, done: saidYes },
    { at: 0.86, label: 'Placed', lit: drafted, done: approved },
  ];

  return (
    <div ref={root} className="relative [perspective:1600px]" onPointerMove={onMove} onPointerLeave={onLeave}>
      {/* strand */}
      <div aria-hidden className="relative mb-3 h-9 sm:mb-4">
        <svg className="absolute inset-x-0 top-0 h-6 w-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
          <path
            d="M0 4 Q 8.5 18 17 8 Q 35 22 53 8 Q 69.5 21 86 8 Q 93 15 100 4"
            fill="none"
            stroke="rgb(var(--wire) / var(--wire-a))"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {Array.from({ length: smallBulbs }, (_, i) => {
          const at = (i + 0.5) / smallBulbs;
          if (big.some((b) => Math.abs(b.at - at) < 0.04)) return null;
          return (
            <span
              key={i}
              className="bulb absolute top-[11px] size-1.5 -translate-x-1/2"
              data-lit={at <= progress}
              style={{ left: `${at * 100}%` }}
            />
          );
        })}
        {big.map((b) => (
          <span
            key={b.label}
            className="absolute top-[5px] flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ left: `${b.at * 100}%` }}
          >
            <span className="bulb size-3" data-lit={b.lit && !b.done} data-state={b.done ? 'done' : undefined} />
            <span className="text-nano font-medium text-low lg:hidden">{b.label}</span>
          </span>
        ))}
      </div>

      <motion.div
        style={reduced ? undefined : { rotateX: rx, rotateY: ry }}
        className="grid gap-3 [transform-style:preserve-3d] sm:gap-4 lg:grid-cols-[1.15fr_1fr_0.85fr]"
      >
        {/* A: the DM */}
        <Pane y={reduced ? undefined : yA} className="h-[23rem] overflow-hidden">
          <PaneHead
            icon={
              <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full ig-mark text-note font-semibold text-white">
                P
              </span>
            }
            title={counter.chatTitle}
            meta={counter.chatMeta}
          />
          <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3.5 pb-3.5 pt-3">
            <AnimatePresence initial={false}>
              {counter.messages.map((m, i) =>
                step >= msgAt[i] ? (
                  <motion.div
                    key={i}
                    layout
                    initial={reduced ? false : { opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className={cn(
                      'max-w-[86%] rounded-2xl px-3.5 py-2 text-note leading-snug',
                      m.from === 'buyer'
                        ? 'self-start rounded-bl-md bg-field/9 text-hi'
                        : 'self-end rounded-br-md bg-jade-500/20 text-hi ring-1 ring-inset ring-jade-500/24',
                    )}
                  >
                    {m.text}
                    {m.from === 'ai' && i === 1 && (
                      <span className="mt-1 flex items-center gap-1 text-nano font-medium text-jade-ink">
                        <Sparkles className="size-3" aria-hidden /> {counter.replied}
                      </span>
                    )}
                  </motion.div>
                ) : null,
              )}
              {(step === 2 || step === 5) && <Typing key={`typing-${step}`} />}
            </AnimatePresence>
          </div>
        </Pane>

        {/* B: the summary CartHedge computed */}
        <Pane y={reduced ? undefined : yB} className="z-10 shadow-float lg:-mt-3 lg:mb-3">
          <PaneHead
            icon={
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-jade-500/14 text-jade-ink">
                <Check className="size-4" strokeWidth={2.6} />
              </span>
            }
            title={counter.summaryTitle}
            meta={counter.summaryMeta}
          />
          <div className="flex flex-1 flex-col px-4 py-3">
            {summarised ? (
              <motion.div initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col">
                <div className="flex items-center gap-3 pb-2.5">
                  <img
                    src="/demo/kurti.webp"
                    alt=""
                    width={48}
                    height={56}
                    className="h-14 w-12 shrink-0 rounded-md object-cover shadow-soft"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ui font-semibold text-hi">{o.item}</p>
                    <p className="text-note text-low">
                      {o.variant}, qty {o.qty}
                    </p>
                  </div>
                  <span className="text-ui font-semibold tnum text-hi">{formatPaise(o.price)}</span>
                </div>
                <div className="border-t pt-1">
                  <Fact k="Delivery" v="Free" solid={saidYes} />
                  <Fact k="Payment" v={o.payment} solid={saidYes} />
                  <Fact k="Name" v={`${o.name}, ${o.phone}`} solid={saidYes} />
                  <Fact k="Deliver to" v={o.address} solid={saidYes} />
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-2.5">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 text-caption font-medium',
                      saidYes ? 'text-jade-ink' : 'text-gold-ink',
                    )}
                  >
                    <span className="bulb size-1.5" data-lit={!saidYes} data-state={saidYes ? 'done' : undefined} />
                    {saidYes ? counter.confirmedByBuyer : counter.awaiting}
                  </span>
                  <span className="text-title font-semibold tracking-snug tnum text-hi">{formatPaise(o.price + o.shipping)}</span>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-1 flex-col gap-3 py-1" aria-hidden>
                <div className="flex items-center gap-3">
                  <span className="skeleton h-14 w-12 rounded-md" />
                  <span className="flex-1 space-y-2">
                    <span className="skeleton block h-3 w-3/4 rounded-full" />
                    <span className="skeleton block h-2.5 w-1/3 rounded-full" />
                  </span>
                </div>
                <span className="skeleton block h-2.5 w-full rounded-full" />
                <span className="skeleton block h-2.5 w-5/6 rounded-full" />
                <span className="skeleton block h-2.5 w-2/3 rounded-full" />
              </div>
            )}
          </div>
        </Pane>

        {/* C: placed, with the seller's one tap */}
        <Pane y={reduced ? undefined : yC} className="min-h-[15rem]">
          <PaneHead
            icon={
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-400/16 text-gold-ink">
                <Instagram className="size-4" />
              </span>
            }
            title={counter.placedTitle}
            meta={`${counter.autoConfirm}: off`}
          />
          <div className="flex flex-1 flex-col gap-3 px-4 py-3.5">
            {drafted ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-note text-low">#{o.code}</span>
                  <StatusChip status={approved ? 'confirmed' : 'draft'} />
                </div>
                <p className="text-ui leading-snug text-mid">
                  {o.name} · {o.item}
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  {approved ? (
                    <motion.p
                      key="sent"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 rounded-md bg-jade-500/10 p-2.5 text-note leading-snug text-jade-ink"
                    >
                      <Check className="mt-px size-3.5 shrink-0" strokeWidth={3} />
                      {counter.sentInChat}
                    </motion.p>
                  ) : (
                    <motion.span
                      key="approve"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: [1, 0.96, 1] }}
                      transition={{ scale: { delay: 1.1, duration: 0.3 } }}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-gradient-to-b from-jade-400 to-jade-500 text-ui font-semibold text-on-accent clay"
                    >
                      <Check className="size-4" strokeWidth={3} /> Approve order
                    </motion.span>
                  )}
                </AnimatePresence>
                {approved && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0.25 }}
                    className="ml-auto max-w-[92%] rounded-lg rounded-br-md bg-jade-500/20 px-3 py-2 text-caption leading-snug text-hi ring-1 ring-inset ring-jade-500/24"
                  >
                    {counter.buyerGets(o.code)}
                    <span className="mt-0.5 block text-nano font-medium text-jade-ink">In {o.name}&apos;s Instagram chat</span>
                  </motion.div>
                )}
                <div className="mt-auto flex items-center gap-1.5 pt-1" aria-hidden>
                  {['new', 'confirmed', 'packed', 'shipped', 'delivered'].map((s, i) => (
                    <span key={s} className="flex flex-1 items-center gap-1.5">
                      <span className="bulb size-2" data-lit={approved ? i === 1 : i === 0} data-state={approved && i === 0 ? 'done' : undefined} />
                      {i < 4 && <span className="h-px flex-1 bg-wire/15" />}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <BulbString count={5} />
                <p className="max-w-[18ch] text-note text-low">Orders to approve show up here</p>
              </div>
            )}
          </div>
        </Pane>
      </motion.div>
      <p className="mt-3 text-right text-caption text-dim">{counter.demoNote}</p>
    </div>
  );
}
