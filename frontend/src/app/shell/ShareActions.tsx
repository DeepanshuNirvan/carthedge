import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, MessageCircle, QrCode, Share2 } from 'lucide-react';
import { useCopy } from '@/hooks/useCopy';
import { IconButton } from '@/ui/Button';
import { Modal } from '@/ui/Modal';

/** Absolute buyer-facing URL for a page this app serves. */
export const appUrl = (path: string) => `${window.location.origin}${path}`;
export const storeUrl = (businessCode: string) => appUrl(`/s/${businessCode}`);
export const productUrl = (businessCode: string, productId: string) => appUrl(`/s/${businessCode}/p/${productId}`);

function QrModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) QRCode.toCanvas(canvasRef.current, url, { width: 240, margin: 1 });
  }, [url]);
  return (
    <Modal open onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-lg bg-white p-3">
          <canvas ref={canvasRef} aria-label="QR code" />
        </div>
        <p className="break-all text-center font-mono text-xs text-mid">{url}</p>
      </div>
    </Modal>
  );
}

/** Copy · QR · share — every shareable URL in the app goes out through this.
    On a phone that means the OS share sheet (Instagram, WhatsApp, Telegram,
    Messages — wherever the seller's buyers actually are); on desktop, where
    there is no sheet, it falls back to the WhatsApp web hand-off. */
export function ShareActions({ url, title, className }: { url: string; title: string; className?: string }) {
  const { copied, copy } = useCopy();
  const [qrOpen, setQrOpen] = useState(false);
  const [nativeShare] = useState(() => typeof navigator !== 'undefined' && !!navigator.share);
  const waShare = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

  const share = async () => {
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      // the user dismissing the sheet rejects too — nothing to report either way
    }
  };

  return (
    <div className={className ?? 'flex items-center gap-1'}>
      <IconButton label={copied ? 'Copied' : 'Copy link'} onClick={() => copy(url)}>
        {copied ? <Check className="size-4 text-jade-ink" /> : <Copy className="size-4" />}
      </IconButton>
      <IconButton label="Show QR code" onClick={() => setQrOpen(true)}>
        <QrCode className="size-4" />
      </IconButton>
      {nativeShare ? (
        <IconButton label="Share" onClick={share}>
          <Share2 className="size-4" />
        </IconButton>
      ) : (
        <a
          href={waShare}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on WhatsApp"
          className="inline-flex size-11 items-center justify-center rounded-md text-mid transition-colors hover:bg-surface-2 hover:text-hi sm:size-10"
        >
          <MessageCircle className="size-4" />
        </a>
      )}
      {qrOpen && <QrModal url={url} title={title} onClose={() => setQrOpen(false)} />}
    </div>
  );
}
