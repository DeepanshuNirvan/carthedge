import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileX2 } from 'lucide-react';
import { useStorePolicies } from '@/api/storefront';
import { returnReasonLabels } from '@/api/aftersale';
import type { StorePolicyPage } from '@/api/types';
import { formatPaise } from '@/lib/money';
import { whatsappHref } from '@/lib/validators';
import { Seo } from '@/lib/seo';
import { Avatar } from '@/ui/Avatar';
import { LaneGround } from '@/ui/LaneGround';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { Skeleton } from '@/ui/Skeleton';
import { BuyerNotice } from '../BuyerNotice';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t px-5 py-6 first:border-t-0 sm:px-7">
      <h2 className="text-[17px] font-semibold tracking-snug text-hi">{title}</h2>
      <div className="mt-2.5 flex max-w-[68ch] flex-col gap-2 text-[14.5px] leading-relaxed text-mid">{children}</div>
    </section>
  );
}

const cancelWords: Record<string, string> = {
  '': 'You can cancel your order from its tracking page until it is shipped.',
  shipped: 'You can cancel your order from its tracking page until it is shipped.',
  packed: 'You can cancel your order from its tracking page until it is packed.',
  confirmed: 'You can cancel your order from its tracking page until the store confirms it.',
  never: 'Orders cannot be cancelled once they are placed.',
};

function returnsText(p: StorePolicyPage['policies']['returns']) {
  if (p.windowDays <= 0 || (!p.exchange && !p.refund)) return null;
  const kinds = [p.exchange && 'exchange', p.refund && 'return for a refund'].filter(Boolean).join(' or ');
  return `You can ask for an ${kinds} within ${p.windowDays} ${p.windowDays === 1 ? 'day' : 'days'} of delivery, from your order’s tracking page.`;
}

/**
 * The store's public policies: returns, cancellation, shipping, payments,
 * terms and contact. Payment gateways ask a seller for exactly these pages,
 * and buyers read them before paying.
 */
export default function StorePoliciesPage() {
  const { businessCode = '' } = useParams();
  const { data, isLoading, error } = useStorePolicies(businessCode);

  if (error)
    return (
      <BuyerNotice
        icon={<FileX2 className="size-5" />}
        title="Store not found"
        message="This store link is not available. Check the link the seller shared with you."
      />
    );

  const b = data?.business;
  const p = data?.policies;
  const returns = p && returnsText(p.returns);
  const address = b ? [b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ') : '';

  return (
    <div className="flex min-h-dvh flex-col">
      <Seo
        title={b ? `Policies — ${b.name}` : 'Store policies'}
        description={b ? `Returns, exchanges, cancellation, shipping, payment terms and contact details for ${b.name}.` : 'Store policies'}
        path={`/s/${businessCode}/policies`}
      />
      <LaneGround strand={false} />
      <header className="glass-bar scroll-edge sticky top-0 z-30 shadow-[0_1px_0_rgb(var(--line)/var(--line-a))]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))]">
          <Link to={`/s/${businessCode}`} aria-label="Back to the store" className="flex size-10 items-center justify-center rounded-full text-mid hover:text-hi">
            <ArrowLeft className="size-5" />
          </Link>
          {b && <Avatar name={b.name} src={b.logoUrl || undefined} className="size-9" />}
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-snug text-hi">{b?.name ?? ' '}</p>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-6">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-hi">Store policies</h1>
        <nav aria-label="On this page" className="mt-3 flex flex-wrap gap-2 text-[13px]">
          {[
            ['returns', 'Returns and refunds'],
            ['cancellation', 'Cancellation'],
            ['shipping', 'Shipping'],
            ['payments', 'Payments'],
            ...(p?.warranty || p?.terms ? [['terms', 'Terms']] : []),
            ['contact', 'Contact'],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-full px-3 py-1.5 text-mid neu hover:text-hi">
              {label}
            </a>
          ))}
        </nav>

        {isLoading || !data || !p || !b ? (
          <Skeleton className="mt-6 h-96" />
        ) : (
          <div className="panel mt-6 overflow-hidden rounded-xl">
            <Section id="returns" title="Returns, exchanges and refunds">
              {returns ? (
                <>
                  <p>{returns}</p>
                  {p.returns.reasons && p.returns.reasons.length > 0 && (
                    <p>Accepted reasons: {p.returns.reasons.map((r) => returnReasonLabels[r].toLowerCase()).join(', ')}.</p>
                  )}
                  {p.returns.photoRequired && <p>For a damaged, wrong or faulty item, add a photo with your request.</p>}
                  {p.returns.pickup === 'pickup' && <p>Once approved, we arrange a pickup from your address.</p>}
                  {p.returns.pickup === 'self_ship' && <p>Once approved, please send the item back to us; we share the address.</p>}
                  {p.returns.conditions && <p>{p.returns.conditions}</p>}
                  {p.returns.refund && (
                    <p>
                      Refunds go back to your original payment method for online payments, or by UPI or bank transfer for cash on
                      delivery orders, once the return is accepted.
                    </p>
                  )}
                  {p.returns.exchange && <p>An exchange ships as a new order; you pay only any price difference.</p>}
                </>
              ) : (
                <p>Returns and exchanges are handled case by case. Message us with your order code and we will help.</p>
              )}
            </Section>

            <Section id="cancellation" title="Cancellation">
              <p>{cancelWords[p.cancelBefore] ?? cancelWords['']}</p>
              {p.cancelBefore !== 'never' && <p>If you already paid, the refund is sent back to you after cancellation.</p>}
              <p>You can change your delivery address from the tracking page until the order is shipped.</p>
            </Section>

            <Section id="shipping" title="Shipping and delivery">
              {p.delivery.dispatchDays > 0 && (
                <p>
                  Orders are dispatched within {p.delivery.dispatchDays} {p.delivery.dispatchDays === 1 ? 'day' : 'days'}.
                </p>
              )}
              {(p.delivery.metro || p.delivery.rest) && (
                <p>
                  Delivery takes {[p.delivery.metro && `${p.delivery.metro} in metro cities`, p.delivery.rest && `${p.delivery.rest} elsewhere in India`].filter(Boolean).join(' and ')}.
                </p>
              )}
              <p>
                {data.shippingFee > 0 ? `Shipping costs ${formatPaise(data.shippingFee)}` : 'Shipping is free'}
                {data.shippingFee > 0 && data.freeShippingAbove > 0 && `, free on orders above ${formatPaise(data.freeShippingAbove)}`}.
              </p>
              {p.delivery.note && <p>{p.delivery.note}</p>}
              <p>Track any order with its code and your phone number on the tracking page.</p>
            </Section>

            <Section id="payments" title="Payments">
              <p>
                {data.onlinePayment === 'gateway'
                  ? 'Pay online by UPI or card through Razorpay.'
                  : data.onlinePayment === 'upi'
                    ? 'Pay online by UPI, straight to the store.'
                    : 'Online payment is not available right now.'}
                {data.codEnabled && ' Cash on delivery is available.'}
              </p>
              {data.codEnabled && data.codFee.kind && data.codFee.value > 0 && (
                <p>
                  Cash on delivery orders carry a charge of {data.codFee.kind === 'percent' ? `${data.codFee.value}%` : formatPaise(data.codFee.value)}
                  {data.codFee.freeAbove > 0 && `, waived above ${formatPaise(data.codFee.freeAbove)}`}.
                </p>
              )}
              {data.codEnabled && p.codMaxOrder > 0 && <p>Cash on delivery is available on orders up to {formatPaise(p.codMaxOrder)}.</p>}
              {data.prepaidDiscount.kind && data.prepaidDiscount.value > 0 && data.onlinePayment !== 'none' && (
                <p>
                  Paying online saves {data.prepaidDiscount.kind === 'percent' ? `${data.prepaidDiscount.value}%` : formatPaise(data.prepaidDiscount.value)}
                  {data.prepaidDiscount.minOrder > 0 && ` on orders above ${formatPaise(data.prepaidDiscount.minOrder)}`}.
                </p>
              )}
              <p>Prices include GST.</p>
            </Section>

            {(p.warranty || p.terms) && (
              <Section id="terms" title="Terms of sale">
                {p.warranty && <p>{p.warranty}</p>}
                {p.terms && <p className="whitespace-pre-line">{p.terms}</p>}
              </Section>
            )}

            {p.faqs && p.faqs.length > 0 && (
              <Section id="faq" title="Questions">
                <dl className="flex flex-col gap-3">
                  {p.faqs.map((f, i) => (
                    <div key={i}>
                      <dt className="font-medium text-hi">{f.q}</dt>
                      <dd>{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}

            <Section id="contact" title="Contact">
              <p className="font-medium text-hi">{b.legalName || b.name}</p>
              {address && <p>{address}</p>}
              {b.gstin && <p className="font-mono text-[13px]">GSTIN {b.gstin}</p>}
              {data.hours && <p>Open {data.hours}</p>}
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                {(p.supportPhone || b.whatsapp) && (
                  <a href={whatsappHref(p.supportPhone || b.whatsapp)} target="_blank" rel="noreferrer" className="text-jade-ink hover:underline">
                    WhatsApp {p.supportPhone || b.whatsapp}
                  </a>
                )}
                {p.supportEmail && (
                  <a href={`mailto:${p.supportEmail}`} className="text-jade-ink hover:underline">
                    {p.supportEmail}
                  </a>
                )}
                {b.instagram && (
                  <a href={`https://instagram.com/${b.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-jade-ink hover:underline">
                    Instagram @{b.instagram.replace('@', '')}
                  </a>
                )}
              </p>
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}
