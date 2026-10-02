import { useState } from 'react';
import { Check, ExternalLink, Link2, MousePointerClick, Plus, ShoppingBag, Store } from 'lucide-react';
import type { ShareLink } from '@/api/types';
import { useLinkMutations, useLinks } from '@/api/links';
import { useProducts } from '@/api/products';
import { useBusiness } from '@/api/business';
import { toast } from '@/store/ui';
import { rupeesToPaise } from '@/lib/money';
import { timeAgo } from '@/lib/date';
import { PageHeader } from '../shell/PageHeader';
import { ShareActions, storeUrl } from '../shell/ShareActions';
import { Button } from '@/ui/Button';
import { Field, Input, Select } from '@/ui/Input';
import { Modal } from '@/ui/Modal';
import { MoneyText } from '@/ui/MoneyText';
import { Switch } from '@/ui/Switch';
import { Badge } from '@/ui/Badge';
import { Tabs } from '@/ui/Tabs';
import { cn } from '@/lib/cn';
import { SkeletonRows } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';

/** The whole-catalog link — the one a seller puts in their Instagram bio. */
function StorefrontCard() {
  const { data: business } = useBusiness();
  if (!business) return null;
  const url = storeUrl(business.code);
  return (
    <div className="panel relative mb-5 flex flex-wrap items-center gap-4 overflow-hidden rounded-xl p-5 sm:p-6">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-jade-500 text-[rgb(var(--text-on-accent))] clay">
        <Store className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-60">
        <p className="text-[15px] font-semibold tracking-snug text-hi">Your store link</p>
        <p className="mt-1 truncate font-mono text-[13px] text-jade-ink">{url.replace(/^https?:\/\//, '')}</p>
        <p className="mt-1.5 text-[13px] text-mid">Your whole catalog on one link. Put it in your Instagram bio and WhatsApp about.</p>
      </div>
      <div className="flex items-center gap-1 rounded-full neu p-1">
        <ShareActions url={url} title={`${business.name} | shop the full collection`} />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open storefront"
          className="inline-flex size-11 items-center justify-center rounded-full text-mid transition-colors hover:bg-[rgb(var(--field)/0.08)] hover:text-hi sm:size-10"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>
    </div>
  );
}

function LinkRow({ link }: { link: ShareLink }) {
  const { setActive } = useLinkMutations();
  const url = link.url;

  return (
    <li className={cn('flex flex-wrap items-center gap-3 py-4 transition-opacity', !link.active && 'opacity-60')}>
      <span className="bulb size-2.5 shrink-0" data-lit={link.active} />
      <div className="min-w-0 flex-1 basis-52">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14.5px] font-medium text-hi">{link.title || 'Untitled link'}</p>
          <Badge tone={link.kind === 'custom' ? 'gold' : link.kind === 'cart' ? 'jade' : 'info'} className="capitalize">
            {link.kind}
          </Badge>
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-low">{url.replace(/^https?:\/\//, '')}</p>
      </div>
      <div className="flex items-center gap-2 text-xs tnum">
        <span title="Clicks" className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--field)/0.07)] px-2.5 py-1 text-mid">
          <MousePointerClick className="size-3.5" aria-hidden /> {link.clicks}
        </span>
        <span title="Orders" className="inline-flex items-center gap-1 rounded-full bg-jade-500/12 px-2.5 py-1 font-semibold text-jade-ink">
          <ShoppingBag className="size-3.5" aria-hidden /> {link.ordersCount}
        </span>
        {link.amount ? <MoneyText paise={link.amount} className="text-[13px] font-semibold text-hi" /> : null}
        <span className="hidden text-low sm:inline">{timeAgo(link.createdAt)}</span>
      </div>
      <div className="flex items-center gap-1">
        <ShareActions url={url} title={link.title || 'Order here'} />
        <Switch
          checked={link.active}
          label={`Toggle ${link.title}`}
          onChange={(active) => setActive.mutate({ id: link.id, active })}
        />
      </div>
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

      <StorefrontCard />

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : links && links.length > 0 ? (
        <ul className="panel divide-y rounded-xl px-4 sm:px-5">
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
          <Tabs
            className="w-full [&>button]:flex-1 [&>button]:justify-center"
            value={kind}
            onChange={(v) => setKind(v)}
            tabs={[
              { value: 'product', label: 'Product' },
              { value: 'cart', label: 'Cart' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          <p className="-mt-1 text-xs text-low">
            {kind === 'product'
              ? 'One item. The buyer picks size and pays.'
              : kind === 'cart'
                ? 'Several items pre-loaded in one checkout.'
                : 'Type what it is and the price. Made-to-order in ten seconds.'}
          </p>

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
              <legend className="mb-1.5 flex w-full justify-between text-[13px] font-medium text-hi">
                Products <span className="text-low tnum">{cartIds.length} picked</span>
              </legend>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto overscroll-contain rounded-lg bg-[rgb(var(--field)/0.04)] p-1.5 hairline">
                {products?.map((p) => {
                  const on = cartIds.includes(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      aria-pressed={on}
                      onClick={() => setCartIds(on ? cartIds.filter((id) => id !== p.id) : [...cartIds, p.id])}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                        on ? 'bg-jade-500/12 text-hi' : 'text-mid hover:bg-[rgb(var(--field)/0.06)]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full transition-colors',
                          on ? 'bg-jade-500 text-[rgb(var(--text-on-accent))]' : 'shadow-[inset_0_0_0_1.5px_rgb(var(--line)/var(--line-strong-a))]',
                        )}
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="size-8 rounded-[8px] object-cover" />}
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <MoneyText paise={p.price} className="text-xs text-low" />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {kind === 'custom' ? (
            <>
              <Field label="What is it for?">
                <Input placeholder="Custom kurti stitching, Priya" value={title} onChange={(e) => setTitle(e.target.value)} />
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

          <Button size="lg" onClick={submit} loading={create.isPending}>
            Create link
          </Button>
        </div>
      </Modal>
    </>
  );
}
