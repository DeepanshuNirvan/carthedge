import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Banknote, CreditCard, MapPinOff, ShieldCheck, Smartphone, Tag, Truck } from 'lucide-react';
import type { Address, CheckoutInfo, OnlinePayment, OrderRef, PlacedOrder, Quote } from '@/api/types';
import {
  buyerPay,
  buyerVerifyPayment,
  fetchQuote,
  placeLinkOrder,
  placeStoreOrder,
  sendOtp,
  useServiceability,
  verifyOtp,
  type BuyerOrderInput,
} from '@/api/storefront';
import { useRazorpay } from '@/hooks/useRazorpay';
import { addressSchema, phoneSchema } from '@/lib/validators';
import { toast } from '@/store/ui';
import { cn } from '@/lib/cn';
import { MoneyText } from '@/ui/MoneyText';
import { SuccessMark } from '@/ui/SuccessMark';
import { Spinner } from '@/ui/Spinner';
import { buttonLink } from '@/ui/buttonLink';
import { Button } from '@/ui/Button';
import { Field, Input, Textarea } from '@/ui/Input';
import { Stepper } from '@/ui/Stepper';
import { UpiPayPanel } from './UpiPayPanel';

type Step = 'details' | 'otp' | 'payment' | 'done';

export type CheckoutContext = {
  businessCode: string;
  businessName: string;
  linkToken?: string;
  items?: OrderRef[];
  subtotal: number;
  shippingFee: number;
  codEnabled: boolean;
  /** 'gateway' = Razorpay checkout, 'upi' = direct transfer to the seller's VPA,
   *  'none' = the seller can only take COD. */
  onlinePayment: OnlinePayment;
};

const steps = ['Details', 'Verify', 'Pay'];
const stepIndex: Record<Step, number> = { details: 0, otp: 1, payment: 2, done: 3 };

const emptyAddress: Address = { line: '', city: '', state: '', pincode: '' };
const gstinShape = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function CheckoutFlow({ ctx, onDone }: { ctx: CheckoutContext; onDone: () => void }) {
  const [step, setStep] = useState<Step>('details');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [orderToken, setOrderToken] = useState('');
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  // set when the seller collects on UPI instead of a gateway
  const [upiInfo, setUpiInfo] = useState<CheckoutInfo | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  // the server prices the cart (coupon, reseller price, free shipping, COD
  // charge, online discount); the page only shows what it says
  const [quote, setQuote] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);
  const [gstOpen, setGstOpen] = useState(false);
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerCompany, setBuyerCompany] = useState('');

  const openRazorpay = useRazorpay();

  const { data: reach, isFetching: checkingPincode } = useServiceability(ctx.businessCode, address.pincode, ctx.codEnabled);
  const undeliverable = reach?.checked === true && !reach.serviceable;
  // COD is only offered where the courier actually collects it
  const codAvailable = ctx.codEnabled && (reach?.checked !== true || reach.codAvailable);
  const prepaidAvailable = ctx.onlinePayment !== 'none';
  const [method, setMethod] = useState<'prepaid' | 'cod'>(prepaidAvailable ? 'prepaid' : 'cod');
  const codAllowed = codAvailable && quote?.codAvailable !== false;
  const totals = quote ? quote[method] : null;
  const total = totals?.total ?? ctx.subtotal + ctx.shippingFee;

  const loadQuote = async (offerCode: string, token = orderToken) => {
    const q = await fetchQuote(ctx.businessCode, {
      items: ctx.items,
      linkToken: ctx.linkToken,
      offerCode: offerCode || undefined,
      phone,
      orderToken: token || undefined,
    });
    setQuote(q);
    return q;
  };

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    setApplying(true);
    setCouponError('');
    try {
      const q = await loadQuote(code);
      if (q.offerError) {
        setCouponError(q.offerError);
        await loadQuote('');
      } else if (code) {
        toast('success', `${code} applied`);
      }
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : 'Could not check this code');
    } finally {
      setApplying(false);
    }
  };

  // never leave a method selected that this seller cannot actually accept
  useEffect(() => {
    if (!codAllowed && method === 'cod' && prepaidAvailable) setMethod('prepaid');
    if (!prepaidAvailable && method === 'prepaid') setMethod('cod');
  }, [codAllowed, prepaidAvailable, method]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const validateDetails = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Tell us who to deliver to';
    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) next.phone = phoneResult.error.issues[0].message;
    const addressResult = addressSchema.safeParse(address);
    if (!addressResult.success) {
      for (const issue of addressResult.error.issues) next[String(issue.path[0])] = issue.message;
    }
    setErrors(next);
    return Object.keys(next).length === 0 ? phoneResult.data : null;
  };

  const requestOtp = async () => {
    const cleanPhone = validateDetails();
    if (!cleanPhone) return;
    setBusy(true);
    try {
      await sendOtp(ctx.businessCode, cleanPhone, email || undefined);
      setPhone(cleanPhone);
      setStep('otp');
      setResendIn(30);
      setTimeout(() => otpRef.current?.focus(), 320);
    } catch (e) {
      toast('error', 'Could not send OTP', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = async () => {
    if (otp.length < 4) return;
    setBusy(true);
    try {
      const res = await verifyOtp(ctx.businessCode, phone, otp, { items: ctx.items, linkToken: ctx.linkToken });
      setOrderToken(res.orderToken);
      // a verified buyer gets their own price (reseller) and coupon limits
      loadQuote('', res.orderToken).catch(() => setQuote(null));
      // repeat buyers get their saved details back
      if (res.prefill) {
        if (res.prefill.name && !name) setName(res.prefill.name);
        if (res.prefill.email && !email) setEmail(res.prefill.email);
        if (res.prefill.address?.line && !address.line) setAddress(res.prefill.address);
      }
      setStep('payment');
    } catch (e) {
      toast('error', 'Wrong or expired code', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const placeOrder = async () => {
    setBusy(true);
    try {
      const input: BuyerOrderInput = {
        orderToken,
        name,
        phone,
        email: email || undefined,
        address,
        items: ctx.items,
        paymentMethod: method,
        notes: notes || undefined,
        offerCode: quote?.offerCode && !quote.offerError ? quote.offerCode : undefined,
        buyerGstin: gstOpen && buyerGstin.trim() ? buyerGstin.trim().toUpperCase() : undefined,
        buyerCompany: gstOpen && buyerCompany.trim() ? buyerCompany.trim() : undefined,
      };
      const order = ctx.linkToken
        ? await placeLinkOrder(ctx.businessCode, ctx.linkToken, input)
        : await placeStoreOrder(ctx.businessCode, input);
      setPlaced(order);

      if (order.next === 'pay') {
        const info = await buyerPay(order.orderCode, 'order');
        if (info.mode === 'upi') {
          // no gateway on this seller — buyer transfers to their VPA and reports it
          setUpiInfo(info);
          setStep('done');
          onDone();
          return;
        }
        const res = await openRazorpay(info, { name, contact: phone, email });
        await buyerVerifyPayment({
          razorpayOrderId: res.razorpay_order_id,
          razorpayPaymentId: res.razorpay_payment_id,
          signature: res.razorpay_signature,
        });
      }
      setStep('done');
      onDone();
    } catch (e) {
      // order may exist even if payment failed — tracking still works
      toast('error', 'Payment not completed', e instanceof Error ? e.message : 'You can retry from the tracking page.');
      if (placed) setStep('done');
    } finally {
      setBusy(false);
    }
  };

  const payCodToken = async () => {
    if (!placed) return;
    setBusy(true);
    try {
      const info = await buyerPay(placed.orderCode, 'token');
      if (info.mode === 'upi') {
        setUpiInfo(info);
        return;
      }
      const res = await openRazorpay(info, { name, contact: phone });
      await buyerVerifyPayment({
        razorpayOrderId: res.razorpay_order_id,
        razorpayPaymentId: res.razorpay_payment_id,
        signature: res.razorpay_signature,
      });
      toast('success', 'Token paid', 'Your order is now confirmed for delivery.');
    } catch (e) {
      toast('error', 'Token payment failed', e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const slide = {
    initial: { opacity: 0, x: 28 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -28 },
    transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <div className="flex flex-col gap-5">
      {step !== 'done' && <Stepper steps={steps} current={stepIndex[step]} />}

      <AnimatePresence mode="wait">
        {step === 'details' && (
          <motion.div key="details" {...slide} className="flex flex-col gap-4">
            <Field label="Full name" error={errors.name}>
              <Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Mobile number" error={errors.phone} hint="We send a one-time code to confirm">
              <Input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98xxxxxxx0"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Email" optional>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Delivery address" error={errors.line}>
              <Textarea
                rows={2}
                autoComplete="street-address"
                placeholder="House / flat, street, landmark"
                value={address.line}
                onChange={(e) => setAddress({ ...address, line: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" error={errors.city}>
                <Input autoComplete="address-level2" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </Field>
              <Field label="State" error={errors.state}>
                <Input autoComplete="address-level1" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              </Field>
            </div>
            <Field label="Pincode" error={errors.pincode} hint="Wrong pincodes are the top cause of failed deliveries">
              <Input
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={address.pincode}
                onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })}
                aria-describedby="pincodeReach"
              />
            </Field>
            <p id="pincodeReach" aria-live="polite" className="-mt-2 flex items-start gap-1.5 text-xs">
              {checkingPincode ? (
                <span className="flex items-center gap-1.5 text-low">
                  <Spinner className="size-3.5" /> Checking delivery to this pincode
                </span>
              ) : undeliverable ? (
                <span className="flex items-start gap-1.5 text-danger-ink">
                  <MapPinOff className="mt-px size-3.5 shrink-0" aria-hidden />
                  Couriers do not deliver to {address.pincode}. Check the pincode, or message the seller for options.
                </span>
              ) : reach?.checked ? (
                <span className="flex items-start gap-1.5 text-jade-ink">
                  <Truck className="mt-px size-3.5 shrink-0" aria-hidden />
                  Delivers to {address.pincode}
                  {reach.estimatedDays > 0 && ` in about ${reach.estimatedDays} days`}
                  {ctx.codEnabled && !reach.codAvailable && ' · cash on delivery not available here'}
                </span>
              ) : null}
            </p>
            <Field label="Note for the seller" optional>
              <Input placeholder="Gift wrap, delivery time…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button size="lg" loading={busy} disabled={undeliverable} onClick={requestOtp}>
              Continue
            </Button>
            {/* notice at collection (DPDP Act): what the details are for */}
            <p className="text-center text-xs leading-relaxed text-low">
              {ctx.businessName} uses these details to deliver this order and message you about it, including one reminder if you
              verify your number but don’t finish.{' '}
              <Link to="/privacy" target="_blank" className="underline underline-offset-2 hover:text-mid">
                How your data is handled
              </Link>
            </p>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div key="otp" {...slide} className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-jade-500/12 text-jade-ink">
                <Smartphone className="size-6" />
              </span>
              <p className="text-sm text-mid">
                Code sent to <span className="font-mono font-medium text-hi">+91 {phone}</span>
              </p>
              <button onClick={() => setStep('details')} className="text-xs text-jade-ink hover:underline">
                Change number
              </button>
            </div>
            <Field label="Enter the 6-digit code">
              <Input
                ref={otpRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="h-14 text-center text-2xl font-semibold tracking-[0.55em] tnum"
              />
            </Field>
            <Button size="lg" loading={busy} disabled={otp.length < 4} onClick={confirmOtp}>
              Verify
            </Button>
            <button
              disabled={resendIn > 0 || busy}
              onClick={requestOtp}
              className="text-center text-xs text-mid transition-colors hover:text-hi disabled:opacity-50"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
          </motion.div>
        )}

        {step === 'payment' && (
          <motion.div key="payment" {...slide} className="flex flex-col gap-4">
            <div className="rounded-lg bg-[rgb(var(--field)/0.05)] p-4 hairline">
              <dl className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-mid">
                  <dt>Items</dt>
                  <dd><MoneyText paise={totals?.subtotal ?? ctx.subtotal} /></dd>
                </div>
                {!!totals?.discount && (
                  <div className="flex justify-between text-jade-ink">
                    <dt>Coupon {quote?.offerCode}</dt>
                    <dd>-<MoneyText paise={totals.discount} /></dd>
                  </div>
                )}
                {!!totals?.prepaidDiscount && (
                  <div className="flex justify-between text-jade-ink">
                    <dt>Online payment discount</dt>
                    <dd>-<MoneyText paise={totals.prepaidDiscount} /></dd>
                  </div>
                )}
                <div className="flex justify-between text-mid">
                  <dt>Shipping</dt>
                  <dd>{(totals?.shipping ?? ctx.shippingFee) > 0 ? <MoneyText paise={totals?.shipping ?? ctx.shippingFee} /> : 'Free'}</dd>
                </div>
                {!!totals?.codFee && (
                  <div className="flex justify-between text-mid">
                    <dt>Cash on delivery charge</dt>
                    <dd><MoneyText paise={totals.codFee} /></dd>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold text-hi">
                  <dt>Total</dt>
                  <dd><MoneyText paise={total} /></dd>
                </div>
              </dl>
            </div>

            <form
              className="flex flex-col gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                applyCoupon();
              }}
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-low" aria-hidden />
                  <Input
                    aria-label="Coupon code"
                    placeholder="Coupon code"
                    autoCapitalize="characters"
                    value={coupon}
                    onChange={(e) => {
                      setCoupon(e.target.value);
                      setCouponError('');
                    }}
                    className="pl-10 uppercase"
                  />
                </div>
                <Button type="submit" variant="secondary" loading={applying} disabled={!coupon.trim() && !quote?.offerCode}>
                  {quote?.offerCode && coupon.trim().toUpperCase() === quote.offerCode ? 'Applied' : 'Apply'}
                </Button>
              </div>
              {couponError && (
                <p role="alert" className="text-xs font-medium text-danger-ink">
                  {couponError}
                </p>
              )}
            </form>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-hi">Payment method</legend>
              <div className="flex flex-col gap-2">
                {prepaidAvailable && (
                  <button
                    onClick={() => setMethod('prepaid')}
                    className={cn(
                      'flex min-h-16 items-center gap-3 rounded-lg p-4 text-left transition-all duration-micro ease-spring active:scale-[0.99]',
                      method === 'prepaid' ? 'bg-jade-500/10 shadow-[inset_0_0_0_1.5px_rgb(var(--jade-500))]' : 'neu',
                    )}
                  >
                    <CreditCard className={cn('size-5', method === 'prepaid' ? 'text-jade-ink' : 'text-mid')} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-hi">
                        {ctx.onlinePayment === 'upi' ? 'Pay now by UPI' : 'Pay now by UPI or card'}
                      </span>
                      <span className="block text-xs text-low">
                        {quote?.prepaid.prepaidDiscount ? (
                          <span className="font-medium text-jade-ink">
                            Save <MoneyText paise={quote.prepaid.prepaidDiscount} className="text-xs" />.{' '}
                          </span>
                        ) : null}
                        {ctx.onlinePayment === 'upi'
                          ? `GPay, PhonePe or Paytm, straight to ${ctx.businessName}`
                          : 'Fastest dispatch, secured by Razorpay'}
                      </span>
                    </span>
                    {method === 'prepaid' && <BadgeCheck className="size-5 text-jade-ink" />}
                  </button>
                )}

                {codAvailable && !codAllowed && quote?.codLimit ? (
                  <p className="rounded-lg p-4 text-xs text-low neu">
                    Cash on delivery is available on orders up to <MoneyText paise={quote.codLimit} className="text-xs" />.
                  </p>
                ) : null}
                {codAllowed && (
                  <button
                    onClick={() => setMethod('cod')}
                    className={cn(
                      'flex min-h-16 items-center gap-3 rounded-lg p-4 text-left transition-all duration-micro ease-spring active:scale-[0.99]',
                      method === 'cod' ? 'bg-gold-400/10 shadow-[inset_0_0_0_1.5px_rgb(var(--gold-400))]' : 'neu',
                    )}
                  >
                    <Banknote className={cn('size-5', method === 'cod' ? 'text-gold-ink' : 'text-mid')} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-hi">Cash on delivery</span>
                      <span className="block text-xs text-low">
                        {quote?.cod.codFee ? (
                          <>
                            <MoneyText paise={quote.cod.codFee} className="text-xs" /> extra.{' '}
                          </>
                        ) : null}
                        Confirm the order after placing it
                      </span>
                    </span>
                    {method === 'cod' && <BadgeCheck className="size-5 text-gold-ink" />}
                  </button>
                )}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setGstOpen((v) => !v)}
                className="self-start text-xs font-medium text-jade-ink hover:underline"
                aria-expanded={gstOpen}
              >
                {gstOpen ? 'Remove GST details' : 'Buying for a business? Add GST details'}
              </button>
              {gstOpen && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="GSTIN"
                    error={buyerGstin && !gstinShape.test(buyerGstin.trim().toUpperCase()) ? 'Check the 15-character GSTIN' : undefined}
                  >
                    <Input value={buyerGstin} maxLength={15} autoCapitalize="characters" onChange={(e) => setBuyerGstin(e.target.value)} className="uppercase" />
                  </Field>
                  <Field label="Business name">
                    <Input value={buyerCompany} maxLength={200} onChange={(e) => setBuyerCompany(e.target.value)} />
                  </Field>
                </div>
              )}
            </div>

            <Button
              size="lg"
              loading={busy}
              disabled={gstOpen && !!buyerGstin && !gstinShape.test(buyerGstin.trim().toUpperCase())}
              onClick={placeOrder}
            >
              {method === 'cod' ? 'Place COD order' : <>Pay <MoneyText paise={total} className="font-semibold" /></>}
            </Button>
            <p className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-low">
              <ShieldCheck className="size-3.5" /> Your payment goes directly to {ctx.businessName}.
              <Link to={`/s/${ctx.businessCode}/policies`} target="_blank" className="underline underline-offset-2 hover:text-mid">
                Returns and policies
              </Link>
            </p>
            {!prepaidAvailable && (
              <p className="text-center text-xs text-low">
                {ctx.businessName} accepts cash on delivery only right now.
              </p>
            )}
          </motion.div>
        )}

        {step === 'done' && placed && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4 py-6 text-center"
          >
            <SuccessMark />
            <div>
              <h3 className="text-d4 font-semibold text-hi">Order placed</h3>
              <p className="mt-1 text-sm text-mid">
                Order <span className="font-mono font-medium text-hi">{placed.orderCode}</span>,{' '}
                <MoneyText paise={placed.total} className="font-semibold text-hi" />
              </p>
            </div>

            {upiInfo && (
              <div className="w-full">
                <UpiPayPanel info={upiInfo} />
              </div>
            )}

            {placed.next === 'codPending' && (
              <div className="w-full rounded-lg bg-gold-400/10 p-4 text-left shadow-[inset_0_0_0_1px_rgb(var(--gold-400)/0.25)]">
                <p className="text-sm font-medium text-gold-ink">One last step</p>
                <p className="mt-1 text-xs leading-relaxed text-mid">
                  {ctx.businessName} will message you on WhatsApp to confirm this COD order before dispatch.
                  {placed.tokenAmount > 0 && (
                    <>
                      {' '}
                      Paying a small token of <MoneyText paise={placed.tokenAmount} className="text-xs" /> now confirms it
                      instantly and it is adjusted in your bill.
                    </>
                  )}
                </p>
                {placed.tokenAmount > 0 && (
                  <Button variant="gold" size="sm" className="mt-3" loading={busy} onClick={payCodToken}>
                    Pay <MoneyText paise={placed.tokenAmount} className="font-semibold" /> token
                  </Button>
                )}
              </div>
            )}

            <Link to={`/o/${placed.orderCode}`} state={{ phone }} className={buttonLink('secondary')}>
              Track this order
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
