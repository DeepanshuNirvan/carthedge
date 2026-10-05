import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Instagram, Sparkles } from 'lucide-react';
import { voice } from '@/strings/marketing';
import { Tabs } from '@/ui/Tabs';
import { Switch } from '@/ui/Switch';
import { Reveal, RevealGroup, RevealItem, SectionHead } from '../Section';

type Tone = keyof typeof voice.replies;
type Address = 'aap' | 'tum';

/**
 * The assistant's settings, played back live: change the tone and the practice
 * chat answers the same buyer again, the way it would in the seller's DMs.
 */
export function Voice() {
  const reduced = useReducedMotion();
  const [tone, setTone] = useState<Tone>('warm');
  const [address, setAddress] = useState<Address>('aap');
  const [emoji, setEmoji] = useState(true);
  const [typing, setTyping] = useState(false);

  // every change is a fresh reply: a beat of typing, then the new answer
  useEffect(() => {
    if (reduced) return;
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 700);
    return () => {
      clearTimeout(t);
    };
  }, [tone, address, emoji, reduced]);

  const reply = `${voice.replies[tone][address]}${emoji ? ` ${voice.emoji[tone]}` : ''}`;

  return (
    <section id="voice" className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <SectionHead title={voice.title} sub={voice.sub} />

      <Reveal>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr] lg:gap-4">
          {/* the chat, floating over the product it is selling */}
          <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-2xl p-4 shadow-float sm:min-h-96 sm:p-10">
            <img
              src="/demo/chikankari.webp"
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full scale-105 object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-bg/50" />

            <div className="glass sheen relative w-full max-w-md rounded-xl">
              <div className="flex items-center gap-2.5 border-b px-4 py-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-jade-500/15 text-caption font-semibold text-jade-ink">
                  RC
                </span>
                <div className="min-w-0">
                  <p className="truncate text-ui font-semibold tracking-snug text-hi">{voice.store}</p>
                  <p className="flex items-center gap-1 text-caption text-low">
                    <Instagram className="size-3" aria-hidden /> Instagram DM
                  </p>
                </div>
              </div>

              <div className="flex min-h-44 flex-col gap-2 p-4" aria-live="polite">
                <p className="max-w-[86%] self-start rounded-2xl rounded-bl-md bg-field/9 px-3.5 py-2 text-ui leading-snug text-hi">
                  {voice.buyer}
                </p>
                <AnimatePresence mode="wait" initial={false}>
                  {typing ? (
                    <motion.span
                      key="typing"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      className="flex w-fit items-center gap-1 self-end rounded-2xl rounded-br-md bg-jade-500/12 px-3.5 py-3 text-jade-ink"
                      aria-label="Assistant is typing"
                    >
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </motion.span>
                  ) : (
                    <motion.p
                      key={reply}
                      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="max-w-[88%] origin-bottom-right self-end rounded-2xl rounded-br-md bg-jade-500/20 px-3.5 py-2 text-ui leading-snug text-hi ring-1 ring-inset ring-jade-500/24"
                    >
                      {reply}
                      <span className="mt-1 flex items-center gap-1 text-nano font-medium text-jade-ink">
                        <Sparkles className="size-3" aria-hidden /> From your catalog and settings
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* the settings that shaped that reply; on phones they sit right under the chat, so a tap shows its answer */}
          <div className="panel flex flex-wrap gap-x-8 gap-y-5 rounded-2xl p-5 sm:p-7 lg:flex-col lg:flex-nowrap lg:justify-center lg:gap-6">
            <div>
              <p className="mb-2.5 text-ui font-medium text-mid">{voice.toneLabel}</p>
              <Tabs tabs={voice.tones as { value: Tone; label: string }[]} value={tone} onChange={setTone} className="w-fit" />
            </div>
            <div>
              <p className="mb-2.5 text-ui font-medium text-mid">{voice.addressLabel}</p>
              <Tabs tabs={voice.addresses as { value: Address; label: string }[]} value={address} onChange={setAddress} className="w-fit" />
            </div>
            <div className="flex w-full items-center justify-between gap-4">
              <p className="text-ui font-medium text-mid">{voice.emojiLabel}</p>
              <span>
                <Switch checked={emoji} onChange={setEmoji} label={voice.emojiLabel} />
              </span>
            </div>
            <p className="hidden w-full border-t pt-5 text-note leading-relaxed text-low lg:block">{voice.practice}</p>
          </div>
        </div>
      </Reveal>

      {/* everything else it learns from the seller, said as a ledger */}
      <RevealGroup className="mt-12 grid gap-x-10 gap-y-7 border-t pt-10 sm:grid-cols-2 lg:grid-cols-3">
        {voice.teach.map((t) => (
          <RevealItem key={t.title}>
            <h3 className="text-base font-semibold tracking-snug text-hi">{t.title}</h3>
            <p className="mt-1.5 max-w-[40ch] text-copy leading-relaxed text-mid">{t.copy}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
