import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Link2, MessageCircle, Plus, QrCode } from 'lucide-react';
import type { ShareLink } from '@/api/types';
import { useLinkMutations, useLinks } from '@/api/links';
import { useProducts } from '@/api/products';
import { toast } from '@/store/ui';
import { useCopy } from '@/hooks/useCopy';
import { rupeesToPaise } from '@/lib/money';
import { timeAgo } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { Button, IconButton } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Input';
import { Modal } from '@/ui/Modal';
import { MoneyText } from '@/ui/MoneyText';
import { Switch } from '@/ui/Switch';
import { Badge } from '@/ui/Badge';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';

const linkUrl = (link: ShareLink) => link.url || `${location.origin}${link.token}`;

function QrModal({ link, onClose }: { link: ShareLink | null; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (link && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, linkUrl(link), { width: 240, margin: 1 });
    }
  }, [link]);
  return (
    <Modal open={!!link} onClose={onClose} title={link?.title || 'Share QR'}>
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-lg bg-white p-3">
          <canvas ref={canvasRef} aria-label="QR code for share link" />
        </div>
        <p className="break-all text-center font-mono text-xs text-mid">{link && linkUrl(link)}</p>
      </div>
    </Modal>
  );
}

function LinkRow({ link }: { link: ShareLink }) {
  const { copied, copy } = useCopy();
  const { setActive } = useLinkMutations();
  const [qrOpen, setQrOpen] = useState(false);
  const url = linkUrl(link);
  const waShare = `https://wa.me/?text=${encodeURIComponent(`${link.title}\n${url}`)}`;

  return (
    <li className="flex flex-wrap items-center gap-3 py-4">
      <div className="min-w-0 flex-1 basis-52">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-hi">{link.title || 'Untitled link'}</p>
          <Badge tone={link.kind === 'custom' ? 'gold' : 'info'}>{link.kind}</Badge>
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-low">{url}</p>
      </div>
      <div className="flex items-center gap-4 text-xs text-mid tnum">
        <span title="Clicks">{link.clicks} clicks</span>
        <span title="Orders">{link.ordersCount} orders</span>
        {link.amount ? <MoneyText paise={link.amount} className="text-xs" /> : null}
        <span className="hidden sm:inline">{timeAgo(link.createdAt)}</span>
      </div>
      <div className="flex items-center gap-1">
        <IconButton label={copied ? 'Copied' : 'Copy link'} onClick={() => copy(url)}>
          {copied ? <Check className="size-4 text-jade-500" /> : <Copy className="size-4" />}
        </IconButton>
        <IconButton label="Show QR" onClick={() => setQrOpen(true)}>
          <QrCode className="size-4" />
        </IconButton>
        <a
          href={waShare}
          target="_blank"
          rel="noreferrer"
          aria-label="Share to WhatsApp"
          className="inline-flex size-9 items-center justify-center rounded-md text-mid transition-colors hover:bg-surface-2 hover:text-hi"
        >
          <MessageCircle className="size-4" />
        </a>
        <Switch
          checked={link.active}
          label={`Toggle ${link.title}`}
          onChange={(active) => setActive.mutate({ id: link.id, active })}
        />
      </div>
      <QrModal link={qrOpen ? link : null} onClose={() => setQrOpen(false)} />
    </li>
  );
}

export default function LinksPage() {
  const { data: links, isLoading } = useLinks();
  const { data: products } = useProducts();
  const { create } = useLinkMutations();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ShareLink['kind']>('product');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [productId, setProductId] = useState('');
  const [cartIds, setCartIds] = useState<string[]>([]);

  const submit = () => {
    if (kind === 'custom') {
      const paise = rupeesToPaise(amount);
      if (!title || !paise) {
        toast('error', 'Custom links need a title and amount');
        return;
      }
      create.mutate(
        { kind, title, amount: paise },
        { onSuccess: done, onError: (e) => toast('error', 'Could not create link', e.message) },
      );
    } else if (kind === 'product') {
      if (!productId) {
        toast('error', 'Pick a product');
        return;
      }
      const product = products?.find((p) => p.id === productId);
      create.mutate(
        { kind, title: title || product?.name || 'Product', items: [{ productId, qty: 1 }] },
        { onSuccess: done, onError: (e) => toast('error', 'Could not create link', e.message) },
      );
    } else {
      if (cartIds.length === 0) {
        toast('error', 'Pick at least one product');
        return;
      }
      create.mutate(
        { kind, title: title || 'Cart', items: cartIds.map((id) => ({ productId: id, qty: 1 })) },
        { onSuccess: done, onError: (e) => toast('error', 'Could not create link', e.message) },
      );
    }
  };

  const done = () => {
    toast('success', 'Link ready to share');
    setOpen(false);
    setTitle('');
    setAmount('');
    setProductId('');
    setCartIds([]);
  };

  return (
    <>
      <PageHeader
        title="Share links"
        subtitle="Checkout links buyers open straight from DMs"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            New link
          </Button>
        }
      />

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : links && links.length > 0 ? (
        <ul className="divide-y rounded-lg bg-surface px-5 shadow-soft hairline">
          {links.map((l) => (
            <LinkRow key={l.id} link={l} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Link2 className="size-5" />}
          title="No links yet"
          message="A product link in a DM converts better than 'DM to order'. Make your first one."
          action={
            <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
              New link
            </Button>
          }
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New share link">
        <div className="flex flex-col gap-4">
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as ShareLink['kind'])}>
              <option value="product">Single product</option>
              <option value="cart">Cart (multiple products)</option>
              <option value="custom">Custom amount</option>
            </Select>
          </Field>

          {kind === 'product' && (
            <Field label="Product">
              <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Choose…</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {kind === 'cart' && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-hi">Products</legend>
              <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-md bg-surface-2 p-2 hairline">
                {products?.map((p) => (
                  <label key={p.id} className="flex items-center gap-2.5 rounded px-2 py-1.5 text-sm text-hi hover:bg-surface-3">
                    <input
                      type="checkbox"
                      checked={cartIds.includes(p.id)}
                      onChange={(e) =>
                        setCartIds(e.target.checked ? [...cartIds, p.id] : cartIds.filter((id) => id !== p.id))
                      }
                      className="size-4 accent-jade-500"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {kind === 'custom' ? (
            <>
              <Field label="What is it for?">
                <Input placeholder="Custom kurti stitching — Priya" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Amount ₹">
                <Input inputMode="decimal" placeholder="1499" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
            </>
          ) : (
            <Field label="Title" optional>
              <Input placeholder="Shown to the buyer" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          )}

          <Button onClick={submit} loading={create.isPending}>
            Create link
          </Button>
        </div>
      </Modal>
    </>
  );
}
