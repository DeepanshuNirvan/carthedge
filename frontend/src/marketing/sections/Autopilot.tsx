import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ClipboardCheck, Hand, MessageCircleReply, ScanText, ShieldCheck, Undo2 } from 'lucide-react';
import { autopilot } from '@/strings/marketing';
import { cn } from '@/lib/cn';
import { Switch } from '@/ui/Switch';
import { Reveal, SectionHead } from '../Section';

const icons = {
  reply: MessageCircleReply,
  capture: ScanText,
  confirm: ClipboardCheck,
  status: Bell,
  cod: ShieldCheck,
  handover: Hand,
  followup: Undo2,
} as const;

// control-centre rhythm: one big tile, two wide ones, four squares; 12 cells on 4 columns
const span: Record<string, string> = {
  reply: 'sm:col-span-2 lg:row-span-2',
  capture: 'sm:col-span-2',
  followup: 'sm:col-span-2',
};

type Key = keyof typeof icons;

function ReplyPreview({ on }: { on: boolean }) {
  return (
    <div className="mt-auto flex flex-col gap-2 pt-6" aria-hidden>
      <span className="w-fit max-w-[80%] rounded-2xl rounded-bl-md bg-field/10 px-3.5 py-2 text-ui text-hi">
        {autopilot.sampleIn}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        {on ? (
          <motion.span
            key="on"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-fit max-w-[85%] self-end rounded-2xl rounded-br-md bg-jade-500/16 px-3.5 py-2 text-ui text-hi ring-1 ring-inset ring-jade-500/20"
          >
            {autopilot.sampleReply}
            <span className="mt-1 block text-nano font-medium text-jade-ink">Sent in 4s</span>
          </motion.span>
        ) : (
          <motion.span
            key="off"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 self-end text-note text-low"
          >
            <span className="bulb size-1.5" data-lit="true" /> Waiting for you
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function CapturePreview({ on }: { on: boolean }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.1fr]" aria-hidden>
      <pre className="whitespace-pre-wrap rounded-md bg-field/7 p-3 font-sans text-note leading-relaxed text-mid">
        {autopilot.capturePaste}
      </pre>
      <dl className="flex flex-col justify-center gap-1.5">
        {autopilot.captureFields.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-caption text-low">{k}</dt>
            <dd
              className={cn(
                'text-note transition-colors duration-expr',
                on ? 'font-medium text-hi' : 'text-mid underline decoration-dotted underline-offset-2',
              )}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Autopilot() {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(autopilot.items.map((i) => [i.key, i.defaultOn])),
  );

  return (
    <section id="autopilot" className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <SectionHead title={autopilot.title} sub={autopilot.sub} />

      <Reveal>
        {/* the wallpaper: real glass on a dark ground, so the tiles above it are real glass too */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 shadow-float sm:p-3.5">
          <img
            src="/demo/aurora-texture.webp"
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full scale-110 object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-bg/45" />

          <div className="relative grid gap-2.5 sm:grid-cols-2 sm:gap-3.5 lg:auto-rows-[minmax(11.5rem,auto)] lg:grid-cols-4">
            {autopilot.items.map((item) => {
              const Icon = icons[item.key as Key];
              const on = state[item.key];
              return (
                <article
                  key={item.key}
                  className={cn(
                    'glass sheen flex flex-col rounded-xl p-4 transition-[background-color,box-shadow] duration-expr sm:p-5',
                    span[item.key],
                    on && 'bg-gradient-to-b from-jade-500/13 to-transparent to-70%',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        'flex size-10 items-center justify-center rounded-full transition-colors duration-std',
                        on ? 'bg-jade-500 text-on-accent' : 'bg-field/10 text-mid',
                      )}
                    >
                      <Icon className="size-4.5" aria-hidden />
                    </span>
                    <span>
                      <Switch
                        checked={on}
                        disabled={item.locked}
                        label={item.title}
                        onChange={(v) => setState((s) => ({ ...s, [item.key]: v }))}
                      />
                    </span>
                  </div>
                  <h3 className={cn('mt-4 font-semibold tracking-snug text-hi', item.key === 'reply' ? 'text-xl' : 'text-title')}>
                    {item.title}
                  </h3>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={String(on)}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className={cn('mt-1.5 text-ui leading-relaxed text-mid', item.key === 'reply' && 'max-w-[38ch] text-sm')}
                    >
                      {on ? item.on : item.off}
                    </motion.p>
                  </AnimatePresence>
                  {item.key === 'reply' && <ReplyPreview on={on} />}
                  {item.key === 'capture' && <CapturePreview on={on} />}
                </article>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
