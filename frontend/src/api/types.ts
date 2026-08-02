// Mirrors the Go backend contract exactly: camelCase JSON, money in paise.

export type Address = { line: string; city: string; state: string; pincode: string };

// auth
export type Tokens = { accessToken: string; refreshToken: string };
export type Session = Tokens & {
  businessId: string;
  businessCode: string;
  businessName: string;
  trialEndsAt?: string;
};
export type RegisterInput = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  /** The seller's chosen public URL segment: /s/<storeCode>. */
  storeCode: string;
  /** From POST /auth/signup/otp/verify — proves the mobile before a trial starts. */
  phoneToken: string;
  whatsapp?: string;
  instagram?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  upiId?: string;
};

/** GET /auth/store-code — advisory; Register re-validates server-side. */
export type StoreCodeStatus = {
  /** canonical form of what was typed */
  code: string;
  available: boolean;
  reason?: string;
  suggestions?: string[];
};

// business
export type BusinessProfile = {
  id: string;
  code: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  upiId: string;
  logoUrl: string;
  shippingFee: number;
  codEnabled: boolean;
  codTokenAmount: number;
  baselineRtoPercent: number;
  razorpayKeyId: string;
  razorpayConfigured: boolean;
};

// plans & subscription
/** Entitlement keys the API gates paid routes on — mirrors admin.Capabilities in Go. */
export type Capability = 'ai' | 'aiReply' | 'broadcasts' | 'offers' | 'invoices' | 'courier' | 'waitlist';

export type Plan = {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  orderQuota: number;
  perOrderFee: number;
  features: string[];
  capabilities: Capability[];
  isCustom: boolean;
  active?: boolean;
  activeSubscriptions?: number;
};
export type Subscription = {
  planCode: string;
  planName: string;
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  priceMonthly: number;
  orderQuota: number;
  perOrderFee: number;
  startsAt: string;
  endsAt: string;
  capabilities: Capability[];
  ordersUsed: number;
};
/** How the buyer pays: a Razorpay checkout, or a direct UPI transfer to the
 *  seller's own VPA when they have no gateway. Money never routes via CartHedge
 *  either way. */
export type CheckoutInfo = {
  mode: 'gateway' | 'upi';
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  amount: number;
  currency: string;
  orderCode: string;
  businessName: string;
  kind: string;
  upiId?: string;
  /** upi://pay?… — opens GPay/PhonePe/Paytm, and renders as the QR. */
  upiIntent?: string;
};

// catalog
export type Variant = { id?: string; name: string; price: number; sku: string; inStock: boolean };
export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  resellerPrice: number;
  comparePrice: number;
  sku: string;
  images: string[];
  inStock: boolean;
  /** -1 = untracked, otherwise the counted quantity orders draw down */
  stockQty: number;
  trending: boolean;
  active: boolean;
  variants: Variant[];
  createdAt: string;
};
export type ProductInput = {
  name: string;
  description: string;
  category: string;
  price: number;
  resellerPrice: number;
  comparePrice: number;
  sku: string;
  images: string[];
  inStock: boolean;
  trending: boolean;
  variants: Variant[];
};
export type Offer = {
  id: string;
  code: string;
  kind: 'percent' | 'flat';
  value: number;
  minAmount: number;
  productIds?: string[];
  active: boolean;
  expiresAt?: string;
};

// links
export type LinkItemRef = { productId: string; variantId?: string; qty: number };
export type ShareLink = {
  id: string;
  token: string;
  url: string;
  kind: 'product' | 'cart' | 'custom';
  title: string;
  items?: LinkItemRef[];
  amount?: number;
  active: boolean;
  clicks: number;
  ordersCount: number;
  expiresAt?: string;
  createdAt: string;
};
export type LinkCreateInput = {
  kind: ShareLink['kind'];
  title: string;
  items?: LinkItemRef[];
  amount?: number;
  expiresAt?: string;
};

// orders
export const orderStatuses = ['new', 'confirmed', 'packed', 'shipped', 'delivered', 'rto', 'cancelled'] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export type OrderLine = { productId?: string; name: string; variant?: string; qty: number; price: number };
export type OrderEvent = { status: string; note: string; createdAt: string };
export type Order = {
  id: string;
  code: string;
  status: OrderStatus;
  paymentMethod: 'cod' | 'prepaid';
  /** pending | claimed (buyer reported a UPI transfer) | paid | token_paid | failed */
  paymentStatus: string;
  /** UTR the buyer submitted for a direct UPI transfer, awaiting the seller's check. */
  paymentRef?: string;
  source: string;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  tokenAmount: number;
  offerCode?: string;
  notes?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: Address;
  courierName?: string;
  courierTrackingId?: string;
  riskFlagged: boolean;
  codConfirmedAt?: string;
  createdAt: string;
  events?: OrderEvent[];
};
export type OrderBoard = {
  counts: Partial<Record<OrderStatus, number>>;
  columns: Record<OrderStatus, Order[]>;
};
export type OrderRef = { productId: string; variantId?: string; qty: number };
export type OrderCreateInput = {
  name: string;
  phone: string;
  email?: string;
  address: Address;
  items?: OrderRef[];
  customItems?: OrderLine[];
  paymentMethod: 'cod' | 'prepaid';
  offerCode?: string;
  notes?: string;
};

// customers
export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  segment: 'retail' | 'reseller';
  lastAddress: Address;
  ordersCount: number;
  totalSpent: number;
  codRefusals: number;
  riskFlagged: boolean;
  lastOrderAt?: string;
  createdAt: string;
};

// analytics
export type RtoMeter = {
  baselinePercent: number;
  actualPercent: number;
  codOutcomes: number;
  savedThisMonth: number;
};
export type QuotaUsage = {
  plan: string;
  used: number;
  included: number;
  overageOrders: number;
  overageFee: number;
};
export type Dashboard = {
  todayOrders: number;
  todayRevenue: number;
  monthOrders: number;
  monthRevenue: number;
  pendingOrders: number;
  codAtRisk: number;
  totalCustomers: number;
  repeatRatePercent: number;
  rtoMeter?: RtoMeter;
  quota?: QuotaUsage;
};
/** GET /api/v1/insights — derived from the seller's own data, no model call. */
export type Insights = {
  bestSellers: { name: string; units: number; revenue: number }[];
  codRiskBuyers: { id: string; name: string; phone: string; codRefusals: number; openCodOrders: number }[];
  repeatBuyers: { thisMonth: number; lastMonth: number };
  suggestedBroadcastWindow?: { hour: number; label: string; orders: number };
  rtoTrend?: RtoMeter & { lastMonthPercent?: number };
};
export type SalesPoint = { date: string; orders: number; revenue: number };
export type TopProduct = { productId?: string; name: string; units: number; revenue: number };
export type MonthlyReport = {
  month: string;
  orders: number;
  ordersByStatus: Record<string, number>;
  revenue: number;
  codRevenue: number;
  prepaidRevenue: number;
  quota?: QuotaUsage;
  rtoMeter?: RtoMeter;
};

// broadcasts
export type Broadcast = {
  id: string;
  name: string;
  message: string;
  segment: 'all' | 'retail' | 'reseller' | 'repeat';
  status: string;
  scheduledAt?: string;
  sentCount: number;
  createdAt: string;
};

// invoices
export type Invoice = {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  subtotal: number;
  discount: number;
  shipping: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  createdAt: string;
};

// AI order desk
export type DraftItem = { productId: string; name: string; variant: string; qty: number; price: number };
export type DraftData = {
  items: DraftItem[];
  customerName: string;
  phone: string;
  address: Address;
  paymentMethod: string;
  notes: string;
  confidence: number;
};
export type AiDraft = {
  id: string;
  conversation: string;
  draft: DraftData;
  confidence: number;
  status: string;
  source?: 'manual' | 'whatsapp' | 'instagram';
  conversationId?: string;
  orderId?: string;
  createdAt: string;
};

export type Channel = {
  channel: 'whatsapp' | 'instagram';
  externalId: string;
  displayName: string;
  status: string;
  connectedAt: string;
};

export type ConversationSummary = {
  id: string;
  channel: 'whatsapp' | 'instagram';
  contactId: string;
  contactName: string;
  unread: number;
  status: string;
  lastMessageAt: string;
  draftId: string;
  preview: string;
};

export type ConversationMessage = { direction: 'in' | 'out'; body: string; createdAt: string };

export type ConversationDetail = {
  id: string;
  channel: 'whatsapp' | 'instagram';
  contactId: string;
  contactName: string;
  draftId: string;
  messages: ConversationMessage[];
};

// admin
export type AdminSession = { accessToken: string; name: string; email: string };
export type AdminOverview = {
  totalBusinesses: number;
  suspended: number;
  newLast30Days: number;
  trials: number;
  paying: number;
  expired: number;
  mrr: number;
  totalOrders: number;
  gmv: number;
  ordersLast30Days: number;
  gmvLast30Days: number;
  revenueTotal: number;
  revenueThisMonth: number;
  openPlanRequests: number;
  openEnquiries: number;
};
export type AdminBusinessRow = {
  id: string;
  code: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  status: 'active' | 'suspended';
  planCode: string;
  subscriptionStatus: string;
  subscriptionEndsAt: string;
  ordersCount: number;
  createdAt: string;
};
export type AdminBusinessDetail = {
  business: {
    id: string;
    name: string;
    code: string;
    ownerName: string;
    email: string;
    phone: string;
    whatsapp: string;
    instagram: string;
    city: string;
    state: string;
    status: string;
    gstin: string;
    createdAt: string;
  };
  subscription?: {
    planCode: string;
    planName: string;
    status: string;
    endsAt: string;
    customPrice?: number;
  };
  usage: {
    ordersTotal: number;
    gmv: number;
    ordersLast30Days: number;
    products: number;
    customers: number;
  };
};
export type PlanRequest = {
  id: string;
  businessId: string;
  businessName: string;
  email: string;
  phone: string;
  message: string;
  expectedOrders: number;
  status: 'open' | 'contacted' | 'closed';
  adminNote: string;
  createdAt: string;
};
export type ContactMessage = {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  message: string;
  status: 'open' | 'contacted' | 'closed';
  adminNote: string;
  createdAt: string;
};
export type AdminPayment = {
  id: string;
  businessName: string;
  businessCode: string;
  amount: number;
  status: string;
  razorpayOrderId: string;
  planCode: string;
  createdAt: string;
};
export type SiteStat = { value: number; suffix: string; label: string };
export type SiteTestimonial = { quote: string; name: string; business: string; metric: string };
export type SiteFaq = { q: string; a: string };

export type SiteSettings = {
  contact: { email: string; phone: string; address: string; supportHours: string };
  social: { instagram: string; twitter: string; linkedin: string; youtube: string };
  site: { tagline: string; announcement: string };
  stats: SiteStat[];
  testimonials: SiteTestimonial[];
  faqs: SiteFaq[];
};

// public storefront

/** Which prepaid rail the seller can actually collect on. */
export type OnlinePayment = 'gateway' | 'upi' | 'none';

export type StoreBusiness = {
  code: string;
  name: string;
  logoUrl: string;
  city: string;
  state: string;
  instagram: string;
  whatsapp: string;
  codEnabled: boolean;
  shippingFee: number;
  onlinePayment: OnlinePayment;
};
export type PublicVariant = { id: string; name: string; price: number; inStock: boolean };
export type PublicProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  comparePrice: number;
  images: string[];
  inStock: boolean;
  trending: boolean;
  variants: PublicVariant[];
};
export type StoreHome = {
  business: StoreBusiness;
  categories: string[];
  trending: PublicProduct[];
  offers: Offer[];
  paused: boolean;
};
export type ResolvedLink = {
  business: {
    code: string;
    name: string;
    logoUrl: string;
    whatsapp: string;
    codEnabled: boolean;
    shippingFee: number;
    verified: boolean;
    onlinePayment: OnlinePayment;
  };
  kind: ShareLink['kind'];
  title: string;
  amount?: number;
  items?: Product[];
  paused: boolean;
};
export type OtpVerifyResult = {
  orderToken: string;
  prefill?: { name: string; email: string; address: Address };
};
export type PlacedOrder = {
  orderCode: string;
  total: number;
  tokenAmount: number;
  paymentMethod: 'cod' | 'prepaid';
  next: 'pay' | 'codPending';
};
export type TrackedOrder = {
  orderCode: string;
  businessName: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  paymentRef?: string;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  courierName?: string;
  courierTrackingId?: string;
  events: OrderEvent[];
  createdAt: string;
};
