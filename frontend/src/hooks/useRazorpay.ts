import { useCallback } from 'react';
import type { CheckoutInfo } from '@/api/types';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load payment SDK'));
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  /** set instead of the order id when an autopay mandate was authorised */
  razorpay_subscription_id?: string;
};

/** Opens Razorpay checkout for a backend-created order (or an autopay
 *  subscription); resolves with the signature payload. */
export function useRazorpay() {
  return useCallback(
    async (info: CheckoutInfo & { subscriptionId?: string }, prefill?: { name?: string; contact?: string; email?: string }) => {
      await loadScript();
      return new Promise<RazorpaySuccess>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: info.razorpayKeyId,
          ...(info.subscriptionId
            ? { subscription_id: info.subscriptionId }
            : { order_id: info.razorpayOrderId, amount: info.amount, currency: info.currency }),
          name: info.businessName,
          description: info.orderCode,
          prefill,
          theme: { color: '#0FA968' },
          handler: (res: RazorpaySuccess) => resolve(res),
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.open();
      });
    },
    [],
  );
}
