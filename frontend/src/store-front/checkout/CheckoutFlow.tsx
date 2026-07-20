import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Banknote, CreditCard, PartyPopper, ShieldCheck, Smartphone } from 'lucide-react';
import type { Address, OrderRef, PlacedOrder } from '@/api/types';
import {
  buyerPay,
  buyerVerifyPayment,
  placeLinkOrder,
  placeStoreOrder,
  sendOtp,
  verifyOtp,
  type BuyerOrderInput,
} from '@/api/storefront';
import { useRazorpay } from '@/hooks/useRazorpay';
import { addressSchema, phoneSchema } from '@/lib/validators';
import { toast } from '@/store/ui';
import { cn } from '@/lib/cn';
import { MoneyText } from '@/ui/MoneyText';
import { Button } from '@/ui/Button';
import { Field, Input, Textarea } from '@/ui/Input';
import { Stepper } from '@/ui/Stepper';

type Step = 'details' | 'otp' | 'payment' | 'done';

export type CheckoutContext = {
  businessCode: string;
  businessName: string;
  linkToken?: string;
  items?: OrderRef[];
  subtotal: number;
  shippingFee: number;
  codEnabled: boolean;
};

const steps = ['Details', 'Verify', 'Pay'];
const stepIndex: Record<Step, number> = { details: 0, otp: 1, payment: 2, done: 3 };

const emptyAddress: Address = { line: '', city: '', state: '', pincode: '' };

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
  const [method, setMethod] = useState<'prepaid' | 'cod'>('prepaid');
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  const openRazorpay = useRazorpay();
  const total = ctx.subtotal + ctx.shippingFee;

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
      const res = await verifyOtp(ctx.businessCode, phone, otp);
      setOrderToken(res.orderToken);
      // repeat buyers get their saved details back
      if (res.prefill) {
        if (res.prefill.name && !name) setName(res.prefill.name);
        if (res.prefill.email && !email) setEmail(res.prefill.email);
        if (res.prefill.address?.line && !address.line) setAddress(res.prefill.address);
      }
      setStep('payment');
      if (!ctx.codEnabled) setMethod('prepaid');
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
      };
      const order = ctx.linkToken
        ? await placeLinkOrder(ctx.businessCode, ctx.linkToken, input)
        : await placeStoreOrder(ctx.businessCode, input);
      setPlaced(order);

      if (order.next === 'pay') {
        const info = await buyerPay(order.orderCode, 'order');
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
              />
            </Field>
            <Field label="Note for the seller" optional>
              <Input placeholder="Gift wrap, delivery time…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button size="lg" loading={busy} onClick={requestOtp}>
              Continue
            </Button>
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div key="otp" {...slide} className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-jade-500/12 text-jade-500">
                <Smartphone className="size-6" />
              </span>
              <p className="text-sm text-mid">
                Code sent to <span className="font-mono font-medium text-hi">+91 {phone}</span>
              </p>
              <button onClick={() => setStep('details')} className="text-xs text-jade-500 hover:underline">
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
                className="text-center font-mono text-xl tracking-[0.5em]"
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
            <div className="rounded-lg bg-surface-2 p-4">
              <dl className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between text-mid">
                  <dt>Items</dt>
                  <dd><MoneyText paise={ctx.subtotal} /></dd>
                </div>
                <div className="flex justify-between text-mid">
                  <dt>Shipping</dt>
                  <dd>{ctx.shippingFee > 0 ? <MoneyText paise={ctx.shippingFee} /> : 'Free'}</dd>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-hi">
                  <dt>Total</dt>
                  <dd><MoneyText paise={total} /></dd>
                </div>
              </dl>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-hi">Payment method</legend>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setMethod('prepaid')}
                  className={cn(
                    'flex items-center gap-3 rounded-md p-4 text-left transition-all duration-micro',
                    method === 'prepaid' ? 'bg-jade-500/10 shadow-[inset_0_0_0_1.5px_rgb(var(--jade-500))]' : 'bg-surface-2 hairline',
                  )}
                >
                  <CreditCard className={cn('size-5', method === 'prepaid' ? 'text-jade-500' : 'text-mid')} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-hi">Pay now — UPI or card</span>
                    <span className="block text-xs text-low">Fastest dispatch · secured by Razorpay</span>
                  </span>
                  {method === 'prepaid' && <BadgeCheck className="size-5 text-jade-500" />}
                </button>

                {ctx.codEnabled && (
                  <button
                    onClick={() => setMethod('cod')}
                    className={cn(
                      'flex items-center gap-3 rounded-md p-4 text-left transition-all duration-micro',
                      method === 'cod' ? 'bg-gold-400/10 shadow-[inset_0_0_0_1.5px_rgb(var(--gold-400))]' : 'bg-surface-2 hairline',
                    )}
                  >
                    <Banknote className={cn('size-5', method === 'cod' ? 'text-gold-500' : 'text-mid')} />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-hi">Cash on delivery</span>
                      <span className="block text-xs text-low">Confirm the order after placing it</span>
                    </span>
                    {method === 'cod' && <BadgeCheck className="size-5 text-gold-500" />}
                  </button>
                )}
              </div>
            </fieldset>

            <Button size="lg" loading={busy} onClick={placeOrder}>
              {method === 'cod' ? 'Place COD order' : <>Pay <MoneyText paise={total} className="font-semibold" /></>}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-low">
              <ShieldCheck className="size-3.5" /> Your payment goes directly to {ctx.businessName}
            </p>
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
            <span className="flex size-16 items-center justify-center rounded-full bg-jade-500/15">
              <PartyPopper className="size-8 text-jade-500" />
            </span>
            <div>
              <h3 className="font-display text-xl font-semibold text-hi">Order placed!</h3>
              <p className="mt-1 text-sm text-mid">
                Order <span className="font-mono font-medium text-hi">{placed.orderCode}</span> ·{' '}
                <MoneyText paise={placed.total} />
              </p>
            </div>

            {placed.next === 'codPending' && (
              <div className="w-full rounded-lg bg-gold-400/10 p-4 text-left">
                <p className="text-sm font-medium text-gold-500">One last step</p>
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

            <Link
              to={`/o/${placed.orderCode}`}
              className="text-sm font-medium text-jade-500 hover:underline"
            >
              Track this order →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
