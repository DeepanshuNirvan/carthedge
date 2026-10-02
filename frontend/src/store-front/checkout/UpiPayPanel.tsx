import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import type { CheckoutInfo } from '@/api/types';
import { claimUpiPayment } from '@/api/storefront';
import { useCopy } from '@/hooks/useCopy';
import { toast } from '@/store/ui';
import { MoneyText } from '@/ui/MoneyText';
import { Button } from '@/ui/Button';
import { Field, Input } from '@/ui/Input';

/**
 * Payment for sellers who have no gateway — most small Instagram sellers have a
 * UPI ID and nothing else. The buyer pays that VPA directly (GPay / PhonePe /
 * Paytm / any UPI app), then reports the reference so the seller can match it to
 * their bank alert and release the order. CartHedge never touches the money and
 * never claims the payment succeeded — only the seller can confirm that.
 */
export function UpiPayPanel({ info, onClaimed }: { info: CheckoutInfo; onClaimed?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { copied, copy } = useCopy();
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (canvasRef.current && info.upiIntent) {
      QRCode.toCanvas(canvasRef.current, info.upiIntent, { width: 200, margin: 1 });
    }
  }, [info.upiIntent]);

  const submit = async () => {
    setBusy(true);
    try {
      await claimUpiPayment(info.orderCode, reference.trim());
      setDone(true);
      onClaimed?.();
      toast('success', 'Thanks, payment reported', `${info.businessName} will confirm it shortly.`);
    } catch (e) {
      toast('error', 'Could not submit', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-lg bg-jade-500/10 p-4 text-left">
        <p className="flex items-center gap-2 text-sm font-medium text-jade-ink">
          <Check className="size-4" aria-hidden /> Payment reported
        </p>
        <p className="mt-1 text-xs leading-relaxed text-mid">
          {info.businessName} is checking their bank for reference{' '}
          <span className="font-mono text-hi">{reference.trim().toUpperCase()}</span>. Your order moves to packing as
          soon as they confirm, track it any time with your order code.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-[rgb(var(--field)/0.05)] p-4 text-left hairline">
      <div>
        <p className="text-sm font-medium text-hi">
          Pay <MoneyText paise={info.amount} className="font-semibold" /> to {info.businessName}
        </p>
        <p className="mt-0.5 text-xs text-low">Straight to their UPI ID | CartHedge never holds your money.</p>
      </div>

      <a
        href={info.upiIntent}
        className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-jade-500 px-4 text-sm font-medium text-white transition-transform active:scale-[0.98]"
      >
        <Smartphone className="size-4" aria-hidden /> Open GPay / PhonePe / Paytm
      </a>

      <div className="flex items-center gap-3 rounded-md bg-surface p-3 shadow-soft hairline">
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-low">UPI ID</span>
          <span className="block break-all font-mono text-sm text-hi">{info.upiId}</span>
        </span>
        <button
          type="button"
          onClick={() => copy(info.upiId ?? '')}
          aria-label={copied ? 'Copied' : 'Copy UPI ID'}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-mid transition-colors hover:bg-surface-2 hover:text-hi"
        >
          {copied ? <Check className="size-4 text-jade-ink" /> : <Copy className="size-4" />}
        </button>
      </div>

      <details className="text-xs text-mid">
        <summary className="flex cursor-pointer items-center gap-1.5 py-1 text-jade-ink">
          <QrCode className="size-3.5" aria-hidden /> Paying from another phone? Scan the QR
        </summary>
        <div className="mt-3 flex justify-center rounded-md bg-white p-3">
          <canvas ref={canvasRef} aria-label={`UPI QR code for order ${info.orderCode}`} />
        </div>
      </details>

      <div className="border-t pt-3">
        <Field
          label="Payment reference / UTR"
          hint="Your UPI app shows it on the success screen, the seller checks it against their bank"
        >
          <Input
            value={reference}
            autoComplete="off"
            placeholder="e.g. 418923456789"
            onChange={(e) => setReference(e.target.value)}
            className="font-mono"
          />
        </Field>
        <Button className="mt-3 w-full" loading={busy} disabled={reference.trim().length < 6} onClick={submit}>
          I have paid
        </Button>
        <p className="mt-2.5 flex items-start gap-1.5 text-xs text-low">
          <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
          The seller verifies the transfer before dispatch. Nothing ships on an unmatched reference.
        </p>
      </div>
    </div>
  );
}
