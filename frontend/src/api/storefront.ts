import { useQuery } from '@tanstack/react-query';
import { get, post } from './http';
import type {
  Address,
  CheckoutInfo,
  OrderRef,
  OtpVerifyResult,
  PlacedOrder,
  PublicProduct,
  ResolvedLink,
  StoreHome,
  TrackedOrder,
} from './types';

// All buyer endpoints are tokenless — auth: 'none' keeps seller/admin headers out.

export const useStore = (code: string) =>
  useQuery({
    queryKey: ['store', code],
    queryFn: () => get<StoreHome>(`/p/${code}/store`, undefined, 'none'),
    staleTime: 60_000,
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

export const useResolvedLink = (code: string, token: string) =>
  useQuery({
    queryKey: ['link', code, token],
    queryFn: () => get<ResolvedLink>(`/p/${code}/${token}`, undefined, 'none'),
  });

export const sendOtp = (code: string, phone: string, email?: string) =>
  post<{ ok: boolean }>(`/p/${code}/otp`, { phone, email }, 'none');

export const verifyOtp = (code: string, phone: string, otp: string) =>
  post<OtpVerifyResult>(`/p/${code}/otp/verify`, { phone, code: otp }, 'none');

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

export const buyerVerifyPayment = (payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) => post<{ ok: boolean }>('/p/payments/verify', payload, 'none');

// token arrives in the buyer's WhatsApp confirmation link
export const confirmCod = (orderCode: string, token: string) =>
  post<{ ok: boolean }>(`/p/orders/${orderCode}/confirm`, { token }, 'none');
