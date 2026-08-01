import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Sparkles } from 'lucide-react';
import { aiDemo } from '@/strings/marketing';
import { Section, SectionHead, Reveal } from '../Section';
import { MoneyText } from '@/ui/MoneyText';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

const messages = aiDemo.conversation.split('\n');

/** Replayable canned demo: DM types out, then the parsed order card fills field-by-field. */
export function AiDemo() {
  const reduced = usePrefersReducedMotion();
  const [run, setRun] = useState(0);
  const [visibleMsgs, setVisibleMsgs] = useState(reduced ? messages.length : 0);
  const [filledFields, setFilledFields] = useState(reduced ? 7 : 0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (reduced) return;
    setVisibleMsgs(0);
    setFilledFields(0);
    timers.current.forEach(clearTimeout);
    timers.current = messages.map((_, i) =>
      window.setTimeout(() => setVisibleMsgs(i + 1), 500 + i * 620),
    );
    const parseStart = 500 + messages.length * 620 + 400;
    for (let f = 1; f <= 7; f++) {
      timers.current.push(window.setTimeout(() => setFilledFields(f), parseStart + f * 300));
    }
    return () => timers.current.forEach(clearTimeout);
  }, [run, reduced]);

  const p = aiDemo.parsed;
  const fields: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Item', value: `${p.item} · ${p.variant}` },
    { label: 'Qty', value: p.qty },
    { label: 'Price', value: <MoneyText paise={p.price} /> },
    { label: 'Payment', value: p.payment },
    { label: 'Buyer', value: p.name },
    { label: 'Phone', value: p.phone },
    { label: 'Address', value: p.address },
  ];

  return (
    <Section id="ai">
      <SectionHead eyebrow={aiDemo.eyebrow} title={aiDemo.title} sub={aiDemo.sub} />
      <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_1.05fr]">
        {/* the DM thread */}
        <Reveal className="h-full">
          <div className="glass sheen flex h-full flex-col rounded-2xl p-5 shadow-float sm:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b pb-3.5">
              <span className="size-9 rounded-full bg-gradient-to-br from-jade-500 to-gold-400 shadow-[inset_0_1px_1px_rgb(255_255_255/0.3)]" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-hi">priya.sharma_11</p>
                <p className="text-xs text-low">Instagram DM · Hinglish</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 rounded-full bg-surface-2/70 px-2.5 py-1 text-[11px] text-low">
                <span className="size-1.5 animate-pulse rounded-full bg-jade-400" /> live
              </span>
            </div>
            <div className="flex min-h-56 flex-1 flex-col gap-2.5">
              {messages.slice(0, visibleMsgs).map((msg) => (
                <motion.p
                  key={msg}
                  initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-surface-2/80 px-4 py-2.5 text-sm text-hi"
                >
                  {msg}
                </motion.p>
              ))}
            </div>
            <Button
              variant="glass"
              size="sm"
              className="mt-4 self-start"
              icon={<RotateCcw className="size-4" />}
              onClick={() => setRun((r) => r + 1)}
            >
              {aiDemo.replay}
            </Button>
          </div>
        </Reveal>

        {/* the parsed order card */}
        <Reveal delay={0.1} className="h-full">
          <div className="glass sheen relative flex h-full flex-col rounded-2xl p-5 shadow-float sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b pb-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-hi">
                <span className="grid size-7 place-items-center rounded-full bg-jade-500/15 text-jade-ink">
                  <Sparkles className="size-4" />
                </span>
                AI-drafted order
              </p>
              {filledFields >= 7 && <Badge tone="jade">{p.confidence}% confident</Badge>}
            </div>
            <dl className="flex flex-1 flex-col">
              {fields.map((f, i) => (
                <div key={f.label} className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0">
                  <dt className="text-xs font-medium uppercase tracking-wider text-low">{f.label}</dt>
                  <dd className="text-right text-sm font-medium text-hi">
                    {i < filledFields ? (
                      <motion.span
                        initial={reduced ? false : { opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.24 }}
                      >
                        {f.value}
                      </motion.span>
                    ) : (
                      <span className="inline-block h-4 w-24 animate-shimmer rounded bg-[linear-gradient(90deg,rgb(var(--surface-2)),rgb(var(--surface-3)),rgb(var(--surface-2)))] bg-[length:200%_100%]" />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <Button className="mt-5 w-full" disabled={filledFields < 7}>
              {aiDemo.confirm}
            </Button>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
