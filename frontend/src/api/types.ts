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
  /** DM assistant answers buyers automatically */
  aiAutoReply: boolean;
  /** buyer's chat "yes" places the order without the seller's tap */
  aiAutoOrder: boolean;
  /** facts the assistant may quote: delivery time, exchange policy, sizing */
  aiNotes: string;
  freeShippingAbove: number;
  policies: StorePolicies;
  aiProfile: AiProfile;
  checkout: CheckoutRules;
  gst: GstProfile;
  alerts: AlertPrefs;
  /** set while a deleted account waits out its 30-day restore window */
  deletionScheduledAt?: string;
};

// seller settings documents (mirror internal/shop in Go)
export const returnReasons = ['size', 'damaged', 'wrong_item', 'quality', 'not_as_described', 'changed_mind', 'other'] as const;
export type ReturnReason = (typeof returnReasons)[number];
export type ReturnPolicy = {
  windowDays: number;
  exchange: boolean;
  refund: boolean;
  reasons: ReturnReason[] | null;
  photoRequired: boolean;
  pickup: '' | 'pickup' | 'self_ship';
  conditions: string;
};
export type Faq = { q: string; a: string };
export type StorePolicies = {
  returns: ReturnPolicy;
  cancelBefore: '' | 'confirmed' | 'packed' | 'shipped' | 'never';
  delivery: { dispatchDays: number; metro: string; rest: string; note: string };
  codMaxOrder: number;
  warranty: string;
  terms: string;
  supportEmail: string;
  supportPhone: string;
  faqs: Faq[] | null;
};
export type OpenDay = { open: boolean; from: string; to: string };
export type AiProfile = {
  tone: '' | 'warm' | 'formal' | 'fun';
  language: '' | 'auto' | 'english' | 'hinglish' | 'hindi';
  emoji: '' | 'light' | 'none' | 'lots';
  address: '' | 'aap' | 'tum';
  hours: { enabled: boolean; days: OpenDay[] };
  away: string;
  replyWhen: '' | 'always' | 'closed';
  handles: { bargain: boolean; returns: boolean; cancel: boolean; bulk: boolean; offers: boolean };
  handoffAbove: number;
};
export type Charge = { kind: '' | 'flat' | 'percent'; value: number; max: number };
export type CheckoutRules = {
  codFee: Charge & { freeAbove: number };
  prepaidDiscount: Charge & { minOrder: number };
  /** abandoned-checkout reminder; null = on */
  recovery: boolean | null;
};
export type GstProfile = {
  registration: '' | 'unregistered' | 'regular' | 'composition';
  legalName: string;
  defaultRate: number | null;
  defaultHsn: string;
  prefix: string;
  note: string;
};
export type AlertPrefs = { email: boolean | null; whatsapp: boolean | null; push: boolean | null };
export const gstRates = [0, 3, 5, 12, 18, 28, 40] as const;

// plans & subscription
/** Entitlement keys the API gates paid routes on — mirrors admin.Capabilities in Go. */
export type Capability = 'ai' | 'aiReply' | 'broadcasts' | 'offers' | 'invoices' | 'courier' | 'waitlist' | 'recovery';

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
  /** Razorpay mandate: '' never set up | pending | active | halted | cancelled */
  autopay: '' | 'pending' | 'active' | 'halted' | 'cancelled';
  autopayPlan?: string;
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
/** One choice inside an option group; images are product photos of this choice. */
export type OptionValue = { name: string; images?: string[] };
/** How a product varies: Size, Colour, Storage, Finish… (up to 3 groups). */
export type ProductOption = { name: string; values: OptionValue[] };
export type Variant = {
  id?: string;
  /** the option values joined, "M / Pink" */
  name: string;
  /** one value per option group, in group order */
  options: string[];
  price: number;
  sku: string;
  inStock: boolean;
  stockQty?: number;
};
export type ProductDetail = { label: string; value: string };
/** What India's e-commerce and packaged-goods rules ask a listing to state. */
export type ProductLegal = {
  /** paise, inclusive of all taxes; 0 = not stated */
  mrp: number;
  originCountry: string;
  /** name and address of the maker, packer or importer */
  manufacturer: string;
};
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
  options: ProductOption[];
  variants: Variant[];
  details: ProductDetail[] | null;
  sizeChart: string;
  hsn: string;
  /** percent; -1 = the store default */
  gstRate: number;
  createdAt: string;
} & ProductLegal;
/** Omitted optional fields keep what is stored, so a stock-sheet re-import never wipes photos or options. */
export type ProductInput = {
  name: string;
  description: string;
  category: string;
  price: number;
  resellerPrice: number;
  comparePrice: number;
  sku: string;
  images?: string[];
  inStock: boolean;
  trending: boolean;
  options?: ProductOption[];
  variants?: Variant[];
  /** omitted keeps the counted stock on an edit; -1 = untracked */
  stockQty?: number;
  details?: ProductDetail[];
  sizeChart?: string;
  hsn?: string;
  gstRate?: number;
} & Partial<ProductLegal>;
export type Offer = {
  id: string;
  code: string;
  kind: 'percent' | 'flat';
  value: number;
  minAmount: number;
  productIds?: string[];
  active: boolean;
  expiresAt?: string;
  /** limits: 0 / false = none */
  maxDiscount?: number;
  maxUses?: number;
  maxPerCustomer?: number;
  firstOrderOnly?: boolean;
  /** orders that used it, cancelled excluded (seller list only) */
  uses?: number;
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
export type OrderLine = { productId?: string; variantId?: string; name: string; variant?: string; qty: number; price: number };
export type OrderEvent = { status: string; note: string; createdAt: string };
export type Order = {
  id: string;
  code: string;
  status: OrderStatus;
  /** moves the API allows from the current status (detail endpoint only) */
  nextStatuses?: OrderStatus[];
  paymentMethod: 'cod' | 'prepaid';
  /** pending | claimed (buyer reported a UPI transfer) | paid | token_paid | failed */
  paymentStatus: string;
  /** UTR the buyer submitted for a direct UPI transfer, awaiting the seller's check. */
  paymentRef?: string;
  source: string;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  prepaidDiscount: number;
  shipping: number;
  codFee: number;
  total: number;
  tokenAmount: number;
  offerCode?: string;
  notes?: string;
  buyerGstin?: string;
  buyerCompany?: string;
  /** the order an exchange ships against */
  replacementOf?: string;
  replacementOfId?: string;
  invoiceId?: string;
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
  returnsCount: number;
  riskFlagged: boolean;
  lastOrderAt?: string;
  createdAt: string;
  /** WhatsApp offers: only the buyer's own yes turns this on */
  marketingOptIn: boolean;
  marketingUpdatedAt?: string;
};
export type ConsentSource = 'checkout' | 'order_page' | 'whatsapp' | 'unsubscribe_link' | 'seller';
/** One yes or no to WhatsApp offers, with what the buyer agreed to or sent. */
export type ConsentEvent = { optIn: boolean; source: ConsentSource; wording: string; orderCode?: string; at: string };

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
/** Who a broadcast reaches: buyers who said yes to offers, per segment. */
export type BroadcastAudience = {
  customers: number;
  optedIn: Record<Broadcast['segment'], number>;
  termsVersion: string;
  termsAcceptedAt?: string;
};

// invoices
export type GstParty = {
  name: string;
  legalName?: string;
  address: string;
  state: string;
  stateCode: string;
  gstin?: string;
  phone?: string;
};
export type GstLine = {
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  gross: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
};
/** The printable GST document, computed and frozen by the server. */
export type GstDoc = {
  type: 'tax_invoice' | 'bill_of_supply' | 'invoice' | 'credit_note';
  seller: GstParty;
  buyer: GstParty;
  placeOfSupply: string;
  intra: boolean;
  lines: GstLine[];
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  orderCode: string;
  orderDate: string;
  paymentMethod: string;
  note?: string;
  againstInvoice?: string;
};
export type CreditNote = { id: string; number: string; total: number; doc: GstDoc; createdAt: string };
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
  docType: 'tax_invoice' | 'bill_of_supply' | 'invoice';
  /** detail view only; absent on invoices issued before GST snapshots */
  doc?: GstDoc;
  creditNotes?: CreditNote[];
  createdAt: string;
};
export type InvoiceCreateInput = {
  orderId: string;
  gstRate?: number;
  placeOfSupply?: string;
  buyerGstin?: string;
  buyerName?: string;
};
export type PlatformInvoice = { id: string; number: string; total: number; doc: GstDoc; createdAt: string };

// after-sales
export type ReturnStatus = 'requested' | 'approved' | 'picked_up' | 'received' | 'completed' | 'rejected' | 'cancelled';
export type ReturnItem = {
  index: number;
  productId?: string;
  variantId?: string;
  name: string;
  variant?: string;
  qty: number;
  price: number;
  restock: boolean;
  exchangeVariantId?: string;
  exchangeLabel?: string;
};
export type ReturnRequest = {
  id: string;
  code: string;
  orderId: string;
  orderCode: string;
  kind: 'return' | 'exchange';
  reason: ReturnReason;
  note?: string;
  photos: string[];
  items: ReturnItem[];
  value: number;
  status: ReturnStatus;
  resolution?: string;
  source: 'buyer' | 'seller';
  sellerNote?: string;
  pickupCourier?: string;
  pickupTracking?: string;
  replacementOrderId?: string;
  replacementOrderCode?: string;
  customerName: string;
  customerPhone: string;
  refunded: number;
  nextStatuses: ReturnStatus[];
  createdAt: string;
  updatedAt: string;
};
export type RefundMethod = 'razorpay' | 'upi' | 'bank' | 'cash' | 'other';
export type Refund = {
  id: string;
  orderId: string;
  orderCode: string;
  returnId?: string;
  amount: number;
  method: RefundMethod | '';
  status: 'pending' | 'processed' | 'failed' | 'cancelled';
  reference?: string;
  reason?: string;
  createdAt: string;
  processedAt?: string;
};
export type OrderAfterSale = {
  returns: ReturnRequest[];
  refunds: Refund[];
  paid: number;
  refundable: number;
  razorpay: boolean;
};
export type ReturnInput = {
  kind: 'return' | 'exchange';
  reason: ReturnReason;
  note?: string;
  photos?: string[];
  items: { index: number; qty: number; exchangeVariantId?: string; exchangeLabel?: string }[];
};
export type AbandonedCheckout = { phone: string; name?: string; items: string; verifiedAt: string; remindedAt?: string };

/** What checkout shows before the order exists: the server's own pricing. */
export type Totals = { subtotal: number; discount: number; prepaidDiscount: number; shipping: number; codFee: number; total: number };
export type Quote = {
  lines: OrderLine[];
  offerCode?: string;
  offerError?: string;
  prepaid: Totals;
  cod: Totals;
  codLimit?: number;
  codAvailable: boolean;
};

// AI order desk
export type DraftItem = { productId: string; name: string; variant: string; qty: number; price: number };

/** One turn of the seller trying their own assistant. */
export type PracticeTurn = {
  messages: string[];
  cart: ChatCart;
  stage: ChatStage;
  summaryHash: string;
  action: 'silent' | 'reply' | 'summary' | 'place' | 'handoff';
  note: string;
};
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
  /** a draft still waiting for the seller; empty once confirmed or discarded */
  draftId: string;
  preview: string;
  stage: ChatStage;
  aiPaused: boolean;
  lastOrderCode: string;
  lastOrderStatus: string;
};

/** open · confirming (summary shown) · awaiting_seller (buyer said yes) · handoff (needs the seller) */
export type ChatStage = 'open' | 'confirming' | 'awaiting_seller' | 'handoff';

export type ConversationMessage = {
  direction: 'in' | 'out';
  body: string;
  createdAt: string;
  /** buyer · ai · seller · system (order updates) */
  author: string;
};

export type ChatCart = {
  items: { productId: string; name: string; variant: string; qty: number }[] | null;
  name: string;
  phone: string;
  address: { line: string; city: string; state: string; pincode: string };
  payment: string;
};

export type ConversationDetail = {
  id: string;
  channel: 'whatsapp' | 'instagram';
  contactId: string;
  contactName: string;
  draftId: string;
  messages: ConversationMessage[];
  stage: ChatStage;
  aiPaused: boolean;
  cart: ChatCart;
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
export type AiUsageTotals = { calls: number; inputTokens: number; outputTokens: number; cost: number };
export type AiUsage = {
  days: number;
  usdInr: number;
  totals: AiUsageTotals;
  businesses: (AiUsageTotals & { id: string; name: string; code: string })[];
  daily: (AiUsageTotals & { day: string })[];
};
export type AuditEntry = { action: string; detail: Record<string, unknown>; ip: string; adminEmail: string; createdAt: string };
export type SupportSession = {
  accessToken: string;
  businessId: string;
  businessCode: string;
  businessName: string;
  expiresAt: string;
};
export type AdminBusinessRow = {
  id: string;
  code: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  status: 'active' | 'suspended' | 'deleted' | 'purged';
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
  aiUsage?: AiUsage;
  audit?: AuditEntry[];
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
  invoiceNumber: string;
  autopay: boolean;
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
  /** CartHedge's own identity on the invoices sellers get for their plan (staff-only). */
  billing?: { legalName: string; gstin: string; address: string; email: string; sac: string; rate: number };
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
  freeShippingAbove: number;
  codFee: CheckoutRules['codFee'];
  prepaidDiscount: CheckoutRules['prepaidDiscount'];
};
export type PublicVariant = { id: string; name: string; options: string[]; price: number; inStock: boolean };
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
  options: ProductOption[];
  variants: PublicVariant[];
  details: ProductDetail[];
  sizeChart?: string;
} & ProductLegal;
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
  /** what the seller put in the link: checkout opens on these options and quantities */
  refs?: OrderRef[];
  paused: boolean;
};
/** The WhatsApp-offers box: the exact sentence shown, and the buyer's current answer. */
export type MarketingConsent = { wording: string; optedIn: boolean };
export type OtpVerifyResult = {
  orderToken: string;
  prefill?: { name: string; email: string; address: Address };
  marketing?: MarketingConsent;
};
export type PlacedOrder = {
  orderCode: string;
  total: number;
  tokenAmount: number;
  paymentMethod: 'cod' | 'prepaid';
  next: 'pay' | 'codPending';
};
export type BuyerAfterSale = {
  canCancel: boolean;
  canChangeAddress: boolean;
  canReturn: boolean;
  returnBy?: string;
  returnPolicy: ReturnPolicy;
  returns: ReturnRequest[];
  refunds: Refund[];
  options: Record<string, { id: string; name: string; inStock: boolean }[]>;
  returnable: Record<string, number>;
};
export type TrackedOrder = {
  orderCode: string;
  businessName: string;
  businessCode: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  paymentRef?: string;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  prepaidDiscount: number;
  shipping: number;
  codFee: number;
  tokenAmount: number;
  total: number;
  courierName?: string;
  courierTrackingId?: string;
  address: Address;
  replacementOf?: string;
  afterSale?: BuyerAfterSale;
  marketing?: MarketingConsent;
  events: OrderEvent[];
  createdAt: string;
};
export type StorePolicyPage = {
  business: {
    code: string;
    name: string;
    logoUrl: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    whatsapp: string;
    instagram: string;
    gstin: string;
    legalName: string;
  };
  policies: StorePolicies;
  hours: string;
  shippingFee: number;
  freeShippingAbove: number;
  codEnabled: boolean;
  codFee: CheckoutRules['codFee'];
  prepaidDiscount: CheckoutRules['prepaidDiscount'];
  onlinePayment: OnlinePayment;
};
