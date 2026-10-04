import { useQuery } from '@tanstack/react-query';
import { get, post, request } from './http';
import type {
  Address,
  CheckoutInfo,
  OrderRef,
  OtpVerifyResult,
  PlacedOrder,
  PublicProduct,
  Quote,
  ResolvedLink,
  ReturnInput,
  StoreHome,
  StorePolicyPage,
  TrackedOrder,
} from './types';

// All buyer endpoints are tokenless — auth: 'none' keeps seller/admin headers out.

export const useStore = (code: string, enabled = true) =>
  useQuery({
    queryKey: ['store', code],
    queryFn: () => get<StoreHome>(`/p/${code}/store`, undefined, 'none'),
    staleTime: 60_000,
    enabled: enabled && !!code,
  });

export const useStoreProducts = (code: string, filters: { search?: string; category?: string } = {}) =>
  useQuery({
    queryKey: ['store', code, 'products', filters],
    queryFn: () => get<{ products: PublicProduct[] }>(`/p/${code}/store/products`, { ...filters }, 'none'),
    select: (d) => d.products,
  });

export const useStoreProduct = (code: string, id: string | undefined) =>
  useQuery({
    queryKey: ['store', code, 'products', id],
    queryFn: () => get<{ product: PublicProduct }>(`/p/${code}/store/products/${id}`, undefined, 'none'),
    select: (d) => d.product,
    enabled: !!id,
  });

export type Serviceability = {
  serviceable: boolean;
  codAvailable: boolean;
  estimatedDays: number;
  /** false when no courier aggregator is configured — never block the sale on it */
  checked: boolean;
};

/** Courier reach for a pincode, checked before the order exists — undeliverable
 *  addresses are the top RTO cause. */
export const useServiceability = (code: string, pincode: string, cod: boolean) =>
  useQuery({
    queryKey: ['serviceability', code, pincode, cod],
    queryFn: () => get<Serviceability>(`/p/${code}/serviceability`, { pincode, cod }, 'none'),
    enabled: /^[1-9][0-9]{5}$/.test(pincode),
    staleTime: 10 * 60_000,
    retry: false,
  });

export const useResolvedLink = (code: string, token: string) =>
  useQuery({
    queryKey: ['link', code, token],
    queryFn: () => get<ResolvedLink>(`/p/${code}/${token}`, undefined, 'none'),
  });

export const sendOtp = (code: string, phone: string, email?: string) =>
  post<{ ok: boolean }>(`/p/${code}/otp`, { phone, email }, 'none');

/** cart (items or the link token) lets a buyer who stops here get one reminder */
export const verifyOtp = (code: string, phone: string, otp: string, cart?: { items?: OrderRef[]; linkToken?: string }) =>
  post<OtpVerifyResult>(`/p/${code}/otp/verify`, { phone, code: otp, ...cart }, 'none');

/** Server-side pricing for both payment methods: coupon, charges, free shipping. */
export const fetchQuote = (
  code: string,
  input: { items?: OrderRef[]; linkToken?: string; offerCode?: string; phone?: string; orderToken?: string },
) => post<Quote>(`/p/${code}/quote`, input, 'none');

export const useStorePolicies = (code: string) =>
  useQuery({
    queryKey: ['store', code, 'policies'],
    queryFn: () => get<StorePolicyPage>(`/p/${code}/policies`, undefined, 'none'),
    staleTime: 60_000,
  });

export type BuyerOrderInput = {
  orderToken: string;
  name: string;
  phone: string;
  email?: string;
  address: Address;
  items?: OrderRef[];
  paymentMethod: 'cod' | 'prepaid';
  offerCode?: string;
  notes?: string;
  buyerGstin?: string;
  buyerCompany?: string;
  /** the unticked "offers on WhatsApp" box; true only when the buyer ticked it */
  marketingOptIn?: boolean;
};

export const placeStoreOrder = (code: string, input: BuyerOrderInput) =>
  post<PlacedOrder>(`/p/${code}/store/order`, input, 'none');

export const placeLinkOrder = (code: string, token: string, input: BuyerOrderInput) =>
  post<PlacedOrder>(`/p/${code}/${token}/order`, input, 'none');

export const joinWaitlist = (code: string, productId: string, phone: string) =>
  post<{ ok: boolean }>(`/p/${code}/waitlist`, { productId, phone }, 'none');

export const trackOrder = (orderCode: string, phone: string) =>
  get<TrackedOrder>(`/p/orders/${orderCode}/track`, { phone }, 'none');

export const buyerPay = (orderCode: string, kind: 'order' | 'token') =>
  post<CheckoutInfo>(`/p/orders/${orderCode}/pay`, { kind }, 'none');

/** Buyer reports the UTR of a UPI transfer they made straight to the seller's
 *  VPA. The seller verifies it against their bank alert. */
export const claimUpiPayment = (orderCode: string, reference: string) =>
  post<{ ok: boolean }>(`/p/orders/${orderCode}/upi-claim`, { reference }, 'none');

export const buyerVerifyPayment = (payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) => post<{ ok: boolean }>('/p/payments/verify', payload, 'none');

// token arrives in the buyer's WhatsApp confirmation link
export const confirmCod = (orderCode: string, token: string) =>
  post<{ ok: boolean }>(`/p/orders/${orderCode}/confirm`, { token }, 'none');

// buyer self-service on the tracking page; each call carries a fresh OTP token
type BuyerAuth = { phone: string; orderToken: string };

export const buyerCancel = (orderCode: string, auth: BuyerAuth, reason: string) =>
  post<{ ok: boolean }>(`/p/orders/${orderCode}/cancel`, { ...auth, reason }, 'none');

export const buyerChangeAddress = (orderCode: string, auth: BuyerAuth, address: Address) =>
  post<{ ok: boolean }>(`/p/orders/${orderCode}/address`, { ...auth, address }, 'none');

export const buyerRequestReturn = (orderCode: string, auth: BuyerAuth, input: ReturnInput) =>
  post<{ code: string; status: string }>(`/p/orders/${orderCode}/returns`, { ...auth, ...input }, 'none');

export const buyerWithdrawReturn = (orderCode: string, returnId: string, auth: BuyerAuth) =>
  post<{ ok: boolean }>(`/p/orders/${orderCode}/returns/${returnId}/withdraw`, auth, 'none');

export const buyerSetMarketing = (orderCode: string, auth: BuyerAuth, optIn: boolean) =>
  post<{ ok: boolean; optedIn: boolean }>(`/p/orders/${orderCode}/marketing`, { ...auth, optIn }, 'none');

// the stop link at the foot of every broadcast: a signed token, no code needed
export type MarketingLink = { store: string; optedIn: boolean };
export const useMarketingLink = (token: string) =>
  useQuery({
    queryKey: ['marketingLink', token],
    queryFn: () => get<MarketingLink>(`/api/v1/marketing/${token}`, undefined, 'none'),
    enabled: !!token,
    retry: false,
  });
export const setMarketingLink = (token: string, optIn: boolean) =>
  post<MarketingLink>(`/api/v1/marketing/${token}`, { optIn }, 'none');

export async function buyerUploadPhoto(orderCode: string, auth: BuyerAuth, file: File) {
  const formData = new FormData();
  formData.append('phone', auth.phone);
  formData.append('orderToken', auth.orderToken);
  formData.append('file', file);
  const { url } = await request<{ url: string }>(`/p/orders/${orderCode}/uploads`, { method: 'POST', formData, auth: 'none' });
  return url;
}
