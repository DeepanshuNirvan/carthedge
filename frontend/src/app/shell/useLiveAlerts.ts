import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSupport } from '@/store/support';
import { toast } from '@/store/ui';
import { formatPaise } from '@/lib/money';

type LiveEvent = { type: string; data: Record<string, unknown> };

/** A short two-note chime, made on the spot (no audio file to load). */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.14);
      osc.stop(ctx.currentTime + i * 0.14 + 0.32);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // no audio (autoplay policy, old browser): the toast still shows
  }
}

/**
 * While the app is open: new orders, returns and chats that need the seller
 * arrive as a toast with a chime, the lists refresh, and the tab title counts
 * what came in while the seller was looking elsewhere. Rides the server's
 * event stream; reconnects with backoff when it drops.
 */
export function useLiveAlerts() {
  const qc = useQueryClient();
  const token = useAuth((s) => s.accessToken);
  const supportToken = useSupport((s) => s.session?.accessToken);
  const unseen = useRef(0);
  const baseTitle = useRef(document.title);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        unseen.current = 0;
        document.title = baseTitle.current;
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const access = supportToken ?? token;
    if (!access) return;
    const base = import.meta.env.VITE_API_BASE_URL || '';
    let es: EventSource | null = null;
    let retry = 2000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const bump = () => {
      if (document.visibilityState === 'visible') return;
      unseen.current += 1;
      document.title = `(${unseen.current}) ${baseTitle.current}`;
    };

    const onEvent = (raw: MessageEvent<string>) => {
      let ev: LiveEvent;
      try {
        ev = JSON.parse(raw.data);
      } catch {
        return;
      }
      switch (ev.type) {
        case 'orderCreated': {
          qc.invalidateQueries({ queryKey: ['orders'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          const d = ev.data as { code?: string; total?: number; customerName?: string; source?: string };
          if (d.source === 'manual' || d.source === 'exchange') return; // the seller made it themselves
          toast('success', `New order #${d.code}`, `${d.customerName ?? 'A buyer'}, ${formatPaise(d.total ?? 0)}`);
          chime();
          bump();
          break;
        }
        case 'returnUpdated': {
          qc.invalidateQueries({ queryKey: ['returns'] });
          qc.invalidateQueries({ queryKey: ['aftersale'] });
          const d = ev.data as { code?: string; status?: string; source?: string; customerName?: string };
          if (d.status === 'requested' && d.source === 'buyer') {
            toast('info', `Return request ${d.code}`, `${d.customerName ?? 'A buyer'} asked for a return or exchange.`);
            chime();
            bump();
          }
          break;
        }
        case 'chatNeedsSeller':
          qc.invalidateQueries({ queryKey: ['conversations'] });
          toast('info', 'A buyer needs you', String(ev.data.reason ?? 'Open the AI desk to reply.'));
          chime();
          bump();
          break;
        case 'orderStatusChanged':
        case 'orderUpdated':
        case 'orderPaid':
        case 'paymentClaimed':
        case 'codConfirmed':
          qc.invalidateQueries({ queryKey: ['orders'] });
          qc.invalidateQueries({ queryKey: ['aftersale'] });
          break;
      }
    };

    const connect = () => {
      if (closed) return;
      es = new EventSource(`${base}/api/v1/events?accessToken=${encodeURIComponent(access)}`);
      es.onopen = () => {
        retry = 2000;
      };
      es.onmessage = onEvent;
      // an expired plan or token closes the stream; back off instead of hammering
      es.onerror = () => {
        es?.close();
        timer = setTimeout(connect, retry);
        retry = Math.min(retry * 2, 60_000);
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      es?.close();
    };
  }, [token, supportToken, qc]);
}
