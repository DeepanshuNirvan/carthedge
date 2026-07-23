// All marketing copy lives here — sections stay purely presentational.

export const nav = {
  links: [
    { label: 'Product', href: '#product' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Guides', href: '#guides' },
    { label: 'Contact', href: '/contact' },
  ],
  login: 'Log in',
  cta: 'Start free trial',
};

export const hero = {
  eyebrow: 'For Instagram & WhatsApp sellers',
  title: 'You sell in the chat.',
  titleAccent: 'We run the business.',
  sub: 'CartHedge reads the chat, drafts the order, cuts COD losses, and gets you paid. Keep selling where your buyers already are.',
  ctaPrimary: 'Start 15-day free trial',
  ctaSecondary: 'See how it works',
  noCard: 'No credit card needed',
  scrollCue: 'Scroll',
};

export const problem = {
  eyebrow: 'The hidden tax on DM selling',
  title: 'Every month, the chaos quietly bills you',
  stats: [
    { value: 30, suffix: '%', label: 'of COD orders refused at the door — pure RTO loss' },
    { value: 6, suffix: ' hrs', label: 'a week chasing "payment kar diya?" screenshots' },
    { value: 100, suffix: 's', label: 'of orders living in chat scrolls and notebooks' },
  ],
  copy: 'Refused deliveries, forgotten follow-ups, addresses typed wrong at midnight. You built the audience — the workflow is what leaks money.',
};

export const coreLoop = {
  eyebrow: 'The CartHedge loop',
  title: 'From chat to cash, one motion',
  steps: [
    { key: 'dm', title: 'Buyer DMs you', copy: '"pink wali kurti M size, COD" — the order starts where it always has.' },
    { key: 'ai', title: 'AI drafts the order', copy: 'Item matched to your catalog, size, address and payment intent parsed from the thread.' },
    { key: 'card', title: 'You confirm in one tap', copy: 'A clean order card, editable before it ships anywhere.' },
    { key: 'pay', title: 'Buyer pays or confirms COD', copy: 'UPI link, card checkout, or a COD confirmation that filters out the flakes.' },
    { key: 'board', title: 'Order lands on your board', copy: 'Kanban from new → delivered with courier handoff built in.' },
    { key: 'saved', title: 'You see rupees saved', copy: 'The RTO meter shows what CartHedge protected this month.' },
  ],
};

export const aiDemo = {
  eyebrow: 'AI order capture',
  title: 'Paste the chat. Get an order.',
  sub: 'A real Hinglish thread, parsed live — this is the exact flow inside the app.',
  conversation:
    'pink wali kurti M size chahiye\nCOD karwa do please\n45 Civil Lines, Delhi 110054\nPriya — 9811043210',
  parsed: {
    item: 'Rose Pink Chikankari Kurti',
    variant: 'Size M',
    qty: 1,
    price: 149900,
    payment: 'Cash on delivery',
    name: 'Priya',
    phone: '98110 43210',
    address: '45 Civil Lines, Delhi — 110054',
    confidence: 94,
  },
  replay: 'Replay',
  confirm: 'Confirm order',
};

export const calculator = {
  eyebrow: 'The RTO math',
  title: 'See what refused deliveries cost you',
  sub: 'CartHedge sellers cut RTO by confirming COD intent before shipping. Move the sliders — this is your money.',
  orders: 'Orders per month',
  aov: 'Average order value',
  rto: 'Current RTO rate',
  savedLabel: 'saved every month',
  lossNow: 'Lost to RTO today',
  withUs: 'With CartHedge',
  paysFor: (times: number) => `That pays for your plan ${times}× over.`,
  assumption: 'Assumes COD confirmation cuts RTO to ~8% — the average across CartHedge sellers.',
};

export const features = {
  eyebrow: 'Everything you get',
  title: 'A full order desk, not another link-in-bio',
  items: [
    { key: 'capture', title: 'DM order capture', copy: 'Paste any thread; AI drafts the order with catalog matching.' },
    { key: 'board', title: 'Order board', copy: 'Kanban from new to delivered, drag to advance, courier status inline.' },
    { key: 'store', title: 'Storefront + links', copy: 'A branded store and instant checkout links — buyers never sign up.' },
    { key: 'cod', title: 'COD confirmation', copy: 'WhatsApp confirm flow with optional token that filters serial refusers.' },
    { key: 'broadcast', title: 'Broadcast drops', copy: 'New collection? Message every buyer, or only resellers, in one go.' },
    { key: 'reseller', title: 'Reseller pricing', copy: 'Two price lists, one catalog. Resellers see their rate automatically.' },
    { key: 'ledger', title: 'Customer ledger', copy: 'LTV, repeat rate and COD-risk flags on every buyer.' },
    { key: 'status', title: 'Auto status updates', copy: 'Buyers get confirmed / shipped / delivered messages without you typing.' },
    { key: 'courier', title: 'Courier handoff', copy: 'Push to Shiprocket with address validation already done.' },
    { key: 'waitlist', title: 'Back-in-stock waitlists', copy: 'Sold out sells later — buyers queue themselves.' },
    { key: 'invoice', title: 'GST-lite invoices', copy: 'Numbered, printable invoices from any delivered order.' },
    { key: 'reply', title: 'AI reply assistant', copy: 'Pre-sales answers drafted in your tone, ready to send.' },
    { key: 'live', title: 'Live selling', copy: 'Comment-to-order during lives.', badge: 'Roadmap' },
  ],
};

export const storefrontPreview = {
  eyebrow: 'Your brand, one link',
  title: 'A store buyers trust inside Instagram',
  copy: 'Your logo, your products, your business code in the URL. It opens fast inside the IG browser and checks out with a phone number — no app, no account.',
  bullets: ['Loads in under a second on 4G', 'Phone OTP instead of passwords', 'UPI, cards and COD built in'],
};

export const pricing = {
  eyebrow: 'Pricing',
  title: 'Plans that cost less than one saved order',
  sub: 'Every plan starts with 15 days free. No credit card to try.',
  popular: 'Most popular',
  perMonth: '/month',
  quotaNote: (quota: number, fee: string) => `${quota} orders included, then ${fee}/order`,
  cta: 'Start free trial',
  custom: {
    title: 'Custom',
    copy: 'Doing serious volume or need something specific? We build plans around your numbers.',
    cta: 'Talk to us',
  },
  roi: 'Still deciding? Scroll back to the calculator — most sellers save 4–10× their plan price.',
};

export const trust = {
  eyebrow: 'Built on trust',
  title: 'Your money settles in your account',
  points: [
    { title: 'Razorpay-secured payments', copy: 'Buyers pay through Razorpay directly into your account — CartHedge never holds your money.' },
    { title: 'Per-business isolation', copy: 'Your catalog, customers and orders are isolated per business, encrypted at rest.' },
    { title: 'Seller-verified stores', copy: 'Every storefront carries a verified badge buyers can check.' },
  ],
};

export const guides = {
  eyebrow: 'How it works',
  title: 'Selling smarter by tonight',
  steps: [
    { title: 'Create your business', copy: 'Name, WhatsApp and Instagram — 2 minutes, trial starts instantly.' },
    { title: 'Add products', copy: 'One by one or bulk CSV. Variants, reseller prices and photos included.' },
    { title: 'Share your link', copy: 'Drop your store link in bio and DMs, or send per-product checkout links.' },
    { title: 'Let orders flow', copy: 'AI drafts from DMs, buyers self-checkout, the board tracks everything.' },
  ],
  faqTitle: 'Questions sellers ask',
  faqs: [
    { q: 'Do my buyers need to install anything?', a: 'No. The storefront and checkout open in any browser — including the Instagram and WhatsApp in-app browsers. Buyers verify with a phone OTP and pay by UPI, card or COD.' },
    { q: 'How does CartHedge cut RTO?', a: 'Before a COD order ships, the buyer confirms intent on WhatsApp — optionally with a small token payment. Serial refusers get flagged in your ledger, so you decide who still gets COD.' },
    { q: 'Does it work with my courier?', a: 'CartHedge hands orders to Shiprocket with validated addresses, and tracks status back to your board. More couriers are on the roadmap.' },
    { q: 'Where does the payment go?', a: 'Straight to your Razorpay account or UPI. CartHedge charges a flat monthly plan — we never take a cut of your sales.' },
    { q: 'Can I import my existing catalog?', a: 'Yes — bulk CSV or JSON import with a mapping preview, including variants and reseller prices.' },
    { q: 'What happens after the trial?', a: 'Pick a plan inside the app. If you wait, your data stays safe — the store just pauses until you subscribe.' },
  ],
};

export const testimonials = {
  eyebrow: 'Seller stories',
  title: 'Sellers who stopped leaking money',
  items: [
    { quote: 'RTO went from 27% to 9% in the first month. The COD confirm flow alone pays for the year.', name: 'Ritika S.', business: 'Jaipur juttis & bags', metric: '₹31,000 saved in month one' },
    { quote: 'I used to screenshot orders into a notebook. Now the DM becomes an order in one tap.', name: 'Farheen A.', business: 'Modest fashion, Hyderabad', metric: '4 hours saved weekly' },
    { quote: 'My resellers get their prices automatically. No more two price lists on WhatsApp.', name: 'Devanshi P.', business: 'Silver jewellery, Rajkot', metric: '2× reseller volume' },
  ],
};

export const finalCta = {
  title: 'Start selling smarter today',
  sub: '15 days free. Set up in minutes. Cancel anytime.',
  cta: 'Start your free trial',
  noCard: 'No credit card required',
};

export const footer = {
  tagline: 'The AI order desk for Instagram & WhatsApp sellers.',
  product: { title: 'Product', links: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Guides', href: '#guides' },
    { label: 'Seller login', href: '/app/login' },
  ]},
  company: { title: 'Company', links: [
    { label: 'Contact', href: '/contact' },
    { label: 'Admin', href: '/admin/login' },
  ]},
  legal: { title: 'Legal', links: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ]},
  madeIn: 'Made in India 🇮🇳',
};

export const contact = {
  title: 'Talk to a human',
  sub: 'Questions about plans, migrations or anything else — we reply within a working day.',
  form: {
    name: 'Your name',
    business: 'Business name',
    email: 'Email',
    phone: 'Phone',
    message: 'What do you need?',
    submit: 'Send message',
    success: 'Message sent — we usually reply within a day.',
  },
};
