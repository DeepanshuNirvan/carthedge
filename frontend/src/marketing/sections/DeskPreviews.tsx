import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
  ArchiveRestore,
  Bell,
  Check,
  Copy,
  FileDown,
  Instagram,
  KeyRound,
  MonitorSmartphone,
  ScrollText,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, StatusChip } from '@/ui/Badge';
import { MoneyText } from '@/ui/MoneyText';

/*
  One small, real-shaped screen per desk of the feature section. Each is built
  from the app's own pieces (panels, chips, bulbs, money) at sample scale, and
  plays its one moment once it is on screen: stock ticks down, orders get
  packed in bulk, a return walks its steps. Every preview fits the stage's
  fixed height so switching desks never moves the page.
*/

/** Steps through cumulative delays once the preview is on screen; reduced motion starts at the end. */
function useSequence(ref: RefObject<Element>, delays: readonly number[]) {
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [step, setStep] = useState(reduced ? delays.length : 0);
  useEffect(() => {
    if (reduced || !inView) return;
    const timers = delays.map((d, i) => setTimeout(() => setStep(i + 1), d));
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [delays, inView, reduced]);
  return step;
}

function Card({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div
      className={cn('panel w-full rounded-xl text-left', className)}
      role={label ? 'group' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </div>
  );
}

/* ---------- catalog: option grid with stock that counts itself ---------- */

const catalogSteps = [1400] as const;
const colours = ['Pink', 'Ivory', 'Sage'];
const stock: (number | null)[][] = [
  [8, 5, 3],
  [12, 0, 6],
  [6, 4, null],
  [3, 2, 1],
];
const sizes = ['S', 'M', 'L', 'XL'];

function CatalogPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const sold = useSequence(ref, catalogSteps) > 0;
  return (
    <div ref={ref} className="w-full">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <img src="/demo/kurti.webp" alt="" loading="lazy" decoding="async" className="h-14 w-11 rounded-md object-cover" />
          <div className="min-w-0">
            <p className="truncate text-ui font-semibold tracking-snug text-hi">Rose Chikankari Kurti</p>
            <p className="mt-0.5 flex items-baseline gap-1.5 text-note">
              <MoneyText paise={149900} className="font-semibold text-hi" />
              <span className="text-low">MRP</span>
              <MoneyText paise={199900} strike className="text-caption" />
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1.75rem_repeat(3,1fr)] gap-1.5 text-caption">
          <span />
          {colours.map((c, i) => (
            <span key={c} className={cn('pb-0.5 text-center font-medium', i === 0 ? 'text-jade-ink' : 'text-low')}>
              {c}
            </span>
          ))}
          {sizes.map((size, r) => (
            <div key={size} className="contents">
              <span className="flex items-center font-medium text-low">{size}</span>
              {stock[r].map((n, c) => {
                // M in Pink: an order lands and the count drops on its own
                const live = r === 1 && c === 0;
                const qty = live && sold ? (n ?? 0) - 1 : n;
                return n === null ? (
                  <span key={c} className="flex h-7 items-center justify-center rounded-md border border-dashed text-nano text-dim">
                    Not made
                  </span>
                ) : (
                  <span
                    key={c}
                    className={cn(
                      'neu-inset flex h-7 items-center justify-center rounded-md tnum transition-[background-color,box-shadow,color] duration-expr',
                      qty === 0 ? 'text-nano text-low' : 'font-medium text-hi',
                      live && sold && 'bg-bulb/14 text-gold-ink ring-1 ring-inset ring-bulb/40',
                    )}
                  >
                    {qty === 0 ? 'Sold out' : qty}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <p className="mt-3 flex h-4 items-center gap-1.5 text-caption text-low">
          <span className="bulb size-1.5" data-lit={sold} />
          <span className={cn('transition-opacity duration-std', sold ? 'opacity-100' : 'opacity-0')}>
            Order CH-4F7K2Q took one Pink M
          </span>
        </p>
      </Card>
    </div>
  );
}

/* ---------- links: a custom link with its real QR ---------- */

const linkUrl = 'carthedge.in/l/ritikas-closet/7Q2KD9';

/** A real QR for the sample link, drawn in the current text colour; the encoder loads only when this desk opens. */
function Qr({ text, className }: { text: string; className?: string }) {
  const [path, setPath] = useState<{ size: number; d: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    import('qrcode')
      .then(({ default: QR }) => {
        const { size, data } = QR.create(`https://${text}`, { errorCorrectionLevel: 'M' }).modules;
        let d = '';
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) d += `M${x} ${y}h1v1h-1z`;
        if (live) setPath({ size, d });
      })
      // a chunk that fails to load (flaky network) leaves a quiet blank tile, not an endless shimmer
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [text]);
  if (failed) return <span className={cn('block rounded-md bg-white', className)} />;
  if (!path) return <span className={cn('skeleton block rounded-md', className)} />;
  return (
    <svg viewBox={`-2 -2 ${path.size + 4} ${path.size + 4}`} className={cn('rounded-md bg-white text-ink-950', className)} shapeRendering="crispEdges">
      <path d={path.d} fill="currentColor" />
    </svg>
  );
}

function LinksPreview() {
  return (
    <Card className="p-4">
      <div className="neu-inset flex w-fit gap-0.5 rounded-full p-1 text-caption font-medium">
        {['Product', 'Cart', 'Custom'].map((t) => (
          <span key={t} className={cn('rounded-full px-3 py-1', t === 'Custom' ? 'bg-surface text-hi shadow-soft' : 'text-low')}>
            {t}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="truncate text-ui font-semibold tracking-snug text-hi">Bridal blouse, made to measure</p>
        <MoneyText paise={240000} className="shrink-0 text-ui font-semibold text-hi" />
      </div>
      <div className="mt-3 flex gap-3.5">
        <Qr text={linkUrl} className="size-20 shrink-0" />
        <div className="flex min-w-0 flex-col justify-between">
          <p className="break-all font-mono text-caption leading-snug text-mid">{linkUrl}</p>
          <div className="flex gap-4">
            <p>
              <span className="block text-title font-semibold tnum text-hi">214</span>
              <span className="text-nano text-low">clicks</span>
            </p>
            <p>
              <span className="block text-title font-semibold tnum text-hi">31</span>
              <span className="text-nano text-low">orders</span>
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-note font-medium">
        <span className="neu flex h-9 items-center justify-center gap-1.5 rounded-full text-hi">
          <Copy className="size-3.5" aria-hidden /> Copy link
        </span>
        <span className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-jade-500 text-on-accent clay">
          <Share2 className="size-3.5" aria-hidden /> WhatsApp
        </span>
      </div>
    </Card>
  );
}

/* ---------- orders: three get packed in one move, and a new one arrives ---------- */

const orderSteps = [500, 800, 1100, 1800, 2600] as const;
const orders = [
  { code: 'CH-4F7K2Q', buyer: 'Priya', item: 'Rose Chikankari Kurti, M' },
  { code: 'CH-8M2XQ1', buyer: 'Ananya', item: 'Oxidised Silver Jhumkas' },
  { code: 'CH-2LR9TD', buyer: 'Meher', item: 'Emerald Juttis, 7' },
  { code: 'CH-6PW3KZ', buyer: 'Sana', item: 'Block-print Cushion Cover' },
];

function OrdersPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useSequence(ref, orderSteps);
  const picked = Math.min(step, 3);
  const packed = step >= 4;
  return (
    <div ref={ref} className="relative w-full">
      <Card className="overflow-hidden">
        <div className="flex items-baseline gap-2 border-b px-4 py-2.5 text-caption">
          <span className="font-semibold text-hi">Orders</span>
          <span className="tnum text-low">{picked} selected</span>
        </div>
        <ul>
          {orders.map((o, i) => {
            const on = i < picked;
            return (
              <li key={o.code} className={cn('flex items-center gap-3 px-4 py-2 transition-colors duration-std', on && 'bg-jade-500/6')}>
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded transition-colors duration-micro',
                    on ? 'bg-jade-500 text-on-accent' : 'hairline-strong',
                  )}
                >
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2 text-note">
                    <span className="font-semibold text-hi">{o.buyer}</span>
                    <span className="font-mono text-nano text-low">{o.code}</span>
                  </p>
                  <p className="truncate text-caption text-mid">{o.item}</p>
                </div>
                <StatusChip status={i === 3 ? 'new' : packed ? 'packed' : 'confirmed'} />
              </li>
            );
          })}
        </ul>
        <div className="flex gap-1.5 border-t p-2.5 text-caption font-medium">
          <span className={cn('flex h-8 flex-1 items-center justify-center rounded-full transition-colors duration-std', packed ? 'bg-jade-500/16 text-jade-ink' : 'neu text-hi')}>
            Mark packed
          </span>
          <span className="neu flex h-8 flex-1 items-center justify-center rounded-full text-hi">Packing slips</span>
          <span className="neu flex h-8 flex-1 items-center justify-center rounded-full text-hi">Pick list</span>
        </div>
      </Card>

      {/* the seller's alert, arriving while they work */}
      <AnimatePresence>
        {step >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="glass-nav absolute -right-2 -top-5 flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 text-caption sm:-right-5"
            aria-hidden
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-bulb/18 text-gold-ink">
              <Bell className="size-3.5" />
            </span>
            <span className="font-semibold text-hi">New order</span>
            <MoneyText paise={129900} className="font-medium text-mid" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- returns: an exchange walks its steps ---------- */

const returnSteps = [700, 1500, 2300, 3100] as const;
const returnStages = ['Requested', 'Approved', 'Picked up', 'Received', 'Done'];
const returnStatus = ['requested', 'approved', 'picked_up', 'received', 'completed'];

function ReturnsPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const step = useSequence(ref, returnSteps);
  const done = step === returnStages.length - 1;
  return (
    <div ref={ref} className="w-full">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <img src="/demo/juttis.webp" alt="" loading="lazy" decoding="async" className="size-11 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-ui font-semibold tracking-snug text-hi">Exchange for size 8</p>
            <p className="truncate text-caption text-mid">Emerald Juttis, size 7</p>
          </div>
          <StatusChip status={returnStatus[step]} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <p className="min-w-0 flex-1 text-note italic text-mid">“Thoda tight hai, ek size bada chahiye”</p>
          <img src="/demo/juttis.webp" alt="" loading="lazy" decoding="async" className="size-9 rounded-xs object-cover object-left" />
          <img src="/demo/juttis.webp" alt="" loading="lazy" decoding="async" className="size-9 rounded-xs object-cover object-right" />
        </div>

        {/* the request's own strand: settled steps jade, the current one lit */}
        <div className="relative mt-4 grid grid-cols-5">
          <span className="absolute inset-x-[10%] top-[5px] h-px bg-wire/15" />
          {returnStages.map((s, i) => (
            <div key={s} className="relative flex flex-col items-center gap-1.5">
              <span className="bulb size-2.5" data-lit={i === step && !done} data-state={i < step || done ? 'done' : undefined} />
              <span className={cn('text-nano transition-colors duration-std', i <= step ? 'text-hi' : 'text-low')}>{s}</span>
            </div>
          ))}
        </div>

        <dl className="mt-4 flex flex-col gap-1.5 border-t pt-3 text-caption">
          <div className={cn('flex justify-between gap-3 transition-opacity duration-std', step >= 3 ? 'opacity-100' : 'opacity-30')}>
            <dt className="text-low">Back in stock</dt>
            <dd className="font-medium text-jade-ink">+1 Emerald Juttis, 7</dd>
          </div>
          <div className={cn('flex justify-between gap-3 transition-opacity duration-std', step >= 4 ? 'opacity-100' : 'opacity-30')}>
            <dt className="text-low">Replacement</dt>
            <dd className="font-medium text-hi">
              <span className="font-mono text-nano">CH-9T4LQ8</span>, nothing extra to pay
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

/* ---------- money: a GST invoice that splits by place of supply ---------- */

const destinations = [
  { key: 'jaipur', label: 'Jaipur', state: 'Rajasthan (08)', inter: false },
  { key: 'pune', label: 'Pune', state: 'Maharashtra (27)', inter: true },
];

function MoneyPreview() {
  const [to, setTo] = useState(0);
  const dest = destinations[to];
  const rows = dest.inter
    ? [{ k: 'IGST 5%', v: 7138 }]
    : [
        { k: 'CGST 2.5%', v: 3569 },
        { k: 'SGST 2.5%', v: 3569 },
      ];
  return (
    <Card className="p-4" label="Sample GST invoice">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-ui font-semibold tracking-snug text-hi">Tax invoice</p>
        <p className="font-mono text-caption text-mid">RC/2627/0042</p>
      </div>
      <p className="mt-0.5 text-caption text-low">
        Ritika’s Closet, Jaipur
        <span className="mt-0.5 block font-mono text-nano">GSTIN 08ABCDE1234F1Z5</span>
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-caption text-low">Deliver to</span>
        <div className="neu-inset flex gap-0.5 rounded-full p-0.5" role="group" aria-label="Deliver to">
          {destinations.map((d, i) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={to === i}
              onClick={() => setTo(i)}
              className={cn(
                'relative min-h-10 rounded-full px-3.5 text-caption sm:min-h-8 font-medium transition-colors duration-micro',
                to === i ? 'bg-surface text-hi shadow-soft' : 'text-low hover:text-hi',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-3 flex flex-col gap-1 border-t pt-3 text-note">
        <div className="flex justify-between gap-3">
          <dt className="min-w-0 text-mid">
            Rose Chikankari Kurti <span className="text-low">HSN 6204</span>
          </dt>
          <dd className="tnum text-hi">
            <MoneyText paise={142762} />
          </dd>
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map((r) => (
            <motion.div
              key={r.k}
              layout
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="flex justify-between gap-3"
            >
              <dt className="text-low">{r.k}</dt>
              <dd className="tnum text-mid">
                <MoneyText paise={r.v} />
              </dd>
            </motion.div>
          ))}
        </AnimatePresence>
        <motion.div layout className="mt-1 flex justify-between gap-3 border-t pt-2 text-ui">
          <dt className="font-semibold text-hi">Total</dt>
          <dd className="font-semibold tnum text-hi">
            <MoneyText paise={149900} />
          </dd>
        </motion.div>
      </dl>
      <motion.p layout className="mt-2 text-caption text-low">
        Place of supply {dest.state}
      </motion.p>
    </Card>
  );
}

/* ---------- insights: the fortnight, and what to do next ---------- */

const bars = [38, 52, 44, 61, 47, 72, 58, 49, 66, 80, 57, 69, 74, 92];

function InsightsPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const grown = reduced || inView;
  return (
    <div ref={ref} className="w-full">
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: 'Today', v: <MoneyText paise={1248000} />, tone: 'text-hi' },
            { k: 'Repeat buyers', v: '34%', tone: 'text-hi' },
            { k: 'Kept from RTO', v: <MoneyText paise={621000} />, tone: 'text-gold-ink' },
          ].map((m) => (
            <div key={m.k}>
              <p className="truncate text-nano text-low">{m.k}</p>
              <p className={cn('mt-0.5 text-title font-semibold tnum tracking-snug', m.tone)}>{m.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex h-20 items-end gap-1">
          {bars.map((h, i) => (
            <span
              key={i}
              className={cn(
                'flex-1 origin-bottom rounded-t transition-transform duration-cine ease-enter',
                i === bars.length - 1 ? 'bg-bulb' : 'bg-jade-500/55',
              )}
              style={{ height: `${h}%`, transform: grown ? 'scaleY(1)' : 'scaleY(0)', transitionDelay: `${i * 35}ms` }}
            />
          ))}
        </div>

        <ul className="mt-3 flex flex-col gap-1.5 border-t pt-3 text-caption leading-snug">
          <li className="flex items-start gap-2 text-hi">
            <span className="bulb mt-1 size-1.5 shrink-0" data-lit="true" />
            Send your next drop on Sunday, 8 to 10 pm
          </li>
          <li className="flex items-start gap-2 text-mid">
            <span className="bulb mt-1 size-1.5 shrink-0" data-state="done" />
            Best seller: Rose Chikankari Kurti, 41 this month
          </li>
          <li className="flex items-start gap-2 text-mid">
            <span className="bulb mt-1 size-1.5 shrink-0" />
            Watch +91 98•••••417: two COD refusals
          </li>
        </ul>
      </Card>
    </div>
  );
}

/* ---------- security: the account page, every switch already on ---------- */

const guards = [
  { icon: KeyRound, title: 'Razorpay keys', meta: 'rzp_live_••••••3f9a, encrypted', chip: 'Protected' },
  { icon: Instagram, title: 'Instagram', meta: 'Official login, no password shared', chip: 'Connected' },
  { icon: MonitorSmartphone, title: 'Other devices', meta: 'Signed out when your password changes' },
  { icon: ScrollText, title: 'Offers consent', meta: '1,284 answers on record' },
  { icon: FileDown, title: 'Your data', meta: 'Export everything as one file' },
  { icon: ArchiveRestore, title: 'Delete account', meta: '30 days to change your mind' },
];

function SecurityPreview() {
  return (
    <Card className="divide-y">
      {guards.map((g) => (
        <div key={g.title} className="flex items-center gap-3 px-4 py-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-field/8 text-mid">
            <g.icon className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-note font-semibold text-hi">{g.title}</p>
            <p className="truncate text-caption text-low">{g.meta}</p>
          </div>
          {g.chip && (
            <Badge tone="jade" className="hidden sm:inline-flex">
              {g.chip}
            </Badge>
          )}
        </div>
      ))}
    </Card>
  );
}

export const deskPreviews: Record<string, () => JSX.Element> = {
  catalog: CatalogPreview,
  links: LinksPreview,
  orders: OrdersPreview,
  returns: ReturnsPreview,
  money: MoneyPreview,
  insights: InsightsPreview,
  security: SecurityPreview,
};
