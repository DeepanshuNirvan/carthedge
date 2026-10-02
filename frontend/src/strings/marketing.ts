// All marketing copy lives here; sections stay purely presentational.

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

// the page-level strand: one bulb per stop, lit as the visitor reaches it
export const strand = [
  { id: 'product', label: 'The chat' },
  { id: 'autopilot', label: 'Automations' },
  { id: 'journey', label: 'The board' },
  { id: 'storefront', label: 'Your store' },
  { id: 'pricing', label: 'Plans' },
  { id: 'guides', label: 'Get started' },
];

export const hero = {
  title: 'Every DM answered.',
  titleAccent: 'Every order closed in the chat.',
  sub: 'CartHedge replies to buyers in their language from your real catalog, collects the order and confirms it. You approve with a tap.',
  ctaPrimary: 'Start free trial',
  ctaSecondary: 'See the automations',
  trial: '15 days free. No card.',
};

// the hero counter: one real-shaped conversation, played on a loop
export const counter = {
  chatTitle: 'priya.sharma_11',
  chatMeta: 'Instagram DM',
  summaryTitle: 'Order summary',
  summaryMeta: 'Worked out by CartHedge, not the AI',
  placedTitle: 'Order placed',
  messages: [
    { from: 'buyer', text: 'pink wali kurti hai? M size chahiye' },
    {
      from: 'ai',
      text: 'Haan ji, Rose Chikankari Kurti in M is in stock. Pure cotton, hand embroidered. ₹1,499 with free delivery, COD available.',
    },
    { from: 'buyer', text: 'COD karwa do. Priya, 98110 43210, 45 Civil Lines, Delhi 110054' },
    { from: 'ai', text: 'Done. Aapka order summary neeche hai. Sab sahi hai toh "haan" bol dijiye.' },
    { from: 'buyer', text: 'haan' },
  ],
  order: {
    item: 'Rose Chikankari Kurti',
    variant: 'Size M',
    qty: 1,
    price: 149900,
    shipping: 0,
    payment: 'Cash on delivery',
    name: 'Priya',
    phone: '98110 43210',
    address: '45 Civil Lines, Delhi 110054',
    code: 'CH-4F7K2Q',
  },
  replied: 'Replied in 4s',
  awaiting: 'Waiting for the buyer',
  confirmedByBuyer: 'Buyer said haan',
  sentInChat: 'Order code and tracking link sent in the chat',
  buyerGets: (code: string) => `Order ${code} confirmed. Track it or pay here: carthedge.in/o/${code}`,
  autoConfirm: 'Auto-confirm',
  demoNote: 'Sample conversation',
};

export const problem = {
  title: 'Your inbox has quietly become a full-time job.',
  copy: 'The same few questions, hundreds of times a week, often after midnight. Leave a buyer on seen for an hour and they have usually bought somewhere else.',
  pile: [
    { from: 'riya.k', text: 'Price?' },
    { from: 'meher_closet', text: 'M size hai?' },
    { from: 'anjali.p', text: 'COD milega?' },
    { from: '+91 98•••••210', text: 'kitne din me aayega' },
    { from: 'sana.designs', text: 'order kahan hai bhaiya' },
    { from: 'pooja_r', text: 'Do you ship to Pune?' },
  ],
  stats: [
    { value: 80, suffix: '%', label: 'of DMs are the same questions: price, size, COD, delivery time' },
    { value: 30, suffix: '%', label: 'of COD orders can be refused at the door (20 to 30% is common), paid for in shipping twice' },
    { value: 1, suffix: ' hr', label: 'left on seen is usually enough for a buyer to order from someone else' },
  ],
};

export const autopilot = {
  title: 'Every automation is a switch you hold.',
  sub: 'Turn on what you trust. Reply to any chat yourself and the assistant steps back on it.',
  items: [
    {
      key: 'reply',
      title: 'Auto-reply',
      on: 'Answers every DM in seconds, day and night, as your shop. Prices, sizes and stock come from your catalog, never invented.',
      off: 'Chats wait for you. The assistant still reads them and drafts orders.',
      defaultOn: true,
    },
    {
      key: 'capture',
      title: 'Order capture',
      on: 'Item, size, name, number and address are pulled out of the chat into an order draft.',
      off: 'Paste any chat into the AI desk and it becomes an order card in one tap.',
      defaultOn: true,
    },
    {
      key: 'confirm',
      title: 'Auto-confirm',
      on: 'The buyer says haan to the exact summary and the order is placed instantly.',
      off: 'The buyer’s haan becomes a ready draft. You approve it in one tap.',
      defaultOn: false,
    },
    {
      key: 'status',
      title: 'Status updates',
      on: 'Confirmed, shipped and delivered go to the buyer on the same chat.',
      off: 'You send updates yourself.',
      defaultOn: true,
    },
    {
      key: 'cod',
      title: 'COD confirmation',
      on: 'Link and store orders re-confirm intent before dispatch, with an optional ₹50 to ₹100 UPI token.',
      off: 'COD orders ship as placed.',
      defaultOn: true,
    },
    {
      key: 'handover',
      title: 'Handover to you',
      on: 'Complaints, refunds, bargaining and bulk deals come to you with a WhatsApp alert.',
      off: 'Always on. The assistant never argues with a buyer.',
      defaultOn: true,
      locked: true,
    },
    {
      key: 'followup',
      title: 'One gentle follow-up',
      on: 'If a buyer goes quiet halfway through an order, one polite nudge. Never a second.',
      off: 'Unfinished chats stay as they are.',
      defaultOn: true,
    },
  ],
  sampleReply: 'Haan ji, M is in stock. ₹1,499, COD available.',
  sampleIn: 'M size hai? COD?',
  capturePaste: 'pink wali kurti M size chahiye\nCOD karwa do please\n45 Civil Lines, Delhi 110054\nPriya, 98110 43210',
  captureFields: [
    ['Item', 'Rose Chikankari Kurti, M'],
    ['Payment', 'Cash on delivery'],
    ['Deliver to', '45 Civil Lines, Delhi 110054'],
  ],
};

export const languages = {
  title: 'It replies the way your buyers type.',
  sub: 'Hinglish, Hindi, English and regional scripts, answered in the same language and script.',
  lines: [
    'pink wali kurti hai?',
    'कितने दिन में आएगा?',
    'M size milega kya',
    'இது எவ்வளவு?',
    'COD available hai?',
    'এটা কি স্টকে আছে?',
    'Do you ship to Pune?',
    'ఇంకా colours ఉన్నాయా?',
    'order kahan pahuncha',
    'ಇದರ ಬೆಲೆ ಎಷ್ಟು?',
    'ek aur chahiye, same address',
    'हरा वाला भी है क्या?',
  ],
};

export const journey = {
  title: 'One board for every order, from DM to doorstep.',
  sub: 'Orders from chats, links and your store land in the same place, and the buyer hears about every step on the chat they came from.',
  columns: [
    { status: 'new', label: 'New', note: 'Order code and payment link sent in the chat' },
    { status: 'confirmed', label: 'Confirmed', note: 'Paid by UPI, or COD intent re-confirmed' },
    { status: 'packed', label: 'Packed', note: 'Packing slip and invoice ready' },
    { status: 'shipped', label: 'Shipped', note: 'Courier and tracking id sent on WhatsApp' },
    { status: 'delivered', label: 'Delivered', note: 'Buyer told, invoice numbered, customer ledger updated' },
  ],
  card: { buyer: 'Priya', item: 'Rose Chikankari Kurti, M', code: 'CH-4F7K2Q', total: 149900, source: 'Instagram' },
};

export const aiDemo = {
  confirm: 'Confirm order',
};

export const calculator = {
  title: 'And when COD comes back unopened.',
  sub: 'Re-confirming COD before dispatch is one of the switches above. Put in your numbers to see what it keeps.',
  orders: 'Orders per month',
  aov: 'Average order value',
  rto: 'Current refusal rate',
  savedLabel: 'Kept every month',
  lossNow: 'Lost to refusals today',
  withUs: 'With COD confirmation',
  paysFor: (times: number) => `That covers the Growth plan ${times} times over.`,
  assumption: 'Assumes COD confirmation brings refusals down to about 8%. Your results depend on your buyers.',
};

export const features = {
  title: 'And the rest of the desk.',
  groups: [
    {
      title: 'Sell',
      items: [
        { key: 'store', title: 'Storefront and share links', copy: 'Product, cart or custom links with QR codes and live click counts.' },
        { key: 'reseller', title: 'Offers and reseller pricing', copy: 'Percent or flat offers, and a second price list for resellers.' },
        { key: 'broadcast', title: 'Broadcast drops', copy: 'New collection to past buyers, retail, resellers or repeat customers.' },
        { key: 'waitlist', title: 'Back-in-stock waitlists', copy: 'Sold out items collect numbers and sell again on restock.' },
      ],
    },
    {
      title: 'Run',
      items: [
        { key: 'board', title: 'Order board', copy: 'Kanban across every source, with filters, search and a table view.' },
        { key: 'ledger', title: 'Customer ledger', copy: 'Lifetime value, repeat rate and COD refusals on every buyer.' },
        { key: 'courier', title: 'Courier handoff', copy: 'Hand orders to the courier with addresses already checked.' },
        { key: 'insights', title: 'Insights and reports', copy: 'Best sellers, buyers to watch and a monthly report for your accountant.' },
      ],
    },
    {
      title: 'Get paid',
      items: [
        { key: 'razorpay', title: 'Your own Razorpay', copy: 'Buyer money settles in your account. CartHedge never holds it.' },
        { key: 'checkout', title: 'UPI, cards and COD', copy: 'UPI intent opens GPay or PhonePe directly. COD with an optional token.' },
        { key: 'invoice', title: 'GST-lite invoices', copy: 'Numbered, printable invoices from any order.' },
        { key: 'live', title: 'Live selling', copy: 'Comment-to-order during Instagram Lives.', badge: 'Coming soon' },
      ],
    },
  ],
};

export const storefrontPreview = {
  title: 'A shop link buyers trust inside Instagram.',
  copy: 'Your logo, your products and your business code in the URL. It opens fast in the Instagram and WhatsApp browsers and checks out with a phone number. No app, no account.',
  notes: ['Phone OTP instead of a password', 'UPI opens GPay or PhonePe directly', 'Track the order at the same link'],
};

export const pricing = {
  title: 'Plans that grow with your DMs.',
  sub: 'Every plan starts with 15 days free. No card to try.',
  popular: 'Most popular',
  perMonth: '/month',
  quotaNote: (quota: number, fee: string) => `${quota} orders included, then ${fee} an order`,
  cta: 'Start free trial',
  custom: {
    title: 'Doing serious volume?',
    copy: 'We price custom plans around your numbers and assign them to your account.',
    cta: 'Talk to us',
  },
};

export const trust = {
  title: 'Your money settles in your account',
  points: [
    { title: 'Razorpay in your name', copy: 'Buyers pay through your own Razorpay account. CartHedge never holds seller money.' },
    { title: 'Your data stays yours', copy: 'Catalog, customers and orders are isolated per business, and channel tokens are encrypted at rest.' },
    { title: 'Official Instagram login', copy: 'Connect with the official Instagram API. No password sharing, disconnect anytime.' },
  ],
};

export const guides = {
  title: 'Live by tonight.',
  steps: [
    { title: 'Create your business', copy: 'Name, WhatsApp and Instagram. Your trial starts at once.' },
    { title: 'Add your products', copy: 'One by one or a bulk CSV, with variants, reseller prices and photos.' },
    { title: 'Connect Instagram', copy: 'One tap with the official login, and the assistant starts replying.' },
    { title: 'Share your link', copy: 'Put the store link in your bio and approve orders as they arrive.' },
  ],
  faqTitle: 'Questions sellers ask',
  faqs: [
    { q: 'Do my buyers need to install anything?', a: 'No. The store and checkout open in any browser, including the Instagram and WhatsApp in-app browsers. Buyers verify with a phone OTP and pay by UPI, card or COD.' },
    { q: 'Will the assistant make things up?', a: 'No. Prices, sizes, stock and delivery come from your catalog and your notes. Anything it cannot answer, it checks with you, and complaints or bargaining are handed over to you.' },
    { q: 'Can I stop it replying?', a: 'Yes. Auto-reply is a switch, and replying to a chat yourself (from CartHedge or the Instagram app) pauses the assistant on that chat.' },
    { q: 'Where does the payment go?', a: 'Straight to your own Razorpay account or UPI. CartHedge charges a monthly plan and never takes a cut of your sales.' },
    { q: 'How does it cut COD refusals?', a: 'Before a COD order ships, the buyer re-confirms the exact order, optionally with a small UPI token. Serial refusers are flagged in your customer ledger.' },
    { q: 'What happens after the trial?', a: 'Pick a plan inside the app. Until then your data stays safe and the store simply pauses.' },
  ],
};

// The placeholders the site_settings migration seeded. Until the owner replaces them
// in admin, they are not real customers or measured numbers, so the page must not
// present them as such: seeded quotes are hidden, seeded stats fall back to the
// figures stated in the product brief.
export const seededQuotes = [
  'RTO went from 27% to 9% in the first month. The COD confirm flow alone pays for the year.',
  'I used to screenshot orders into a notebook. Now the DM becomes an order in one tap.',
  'My resellers get their prices automatically. No more two price lists on WhatsApp.',
];
export const seededStatLabels = [
  'of COD orders refused at the door — pure RTO loss',
  'a week chasing "payment kar diya?" screenshots',
  'of orders living in chat scrolls and notebooks',
];

export const testimonials = {
  title: 'From sellers on CartHedge',
  items: [
    // seed fallback only; the live list comes from site_settings via the admin console
    { quote: 'RTO went from 27% to 9% in the first month. The COD confirm flow alone pays for the year.', name: 'Ritika S.', business: 'Jaipur juttis and bags', metric: '₹31,000 saved in month one' },
    { quote: 'I used to screenshot orders into a notebook. Now the DM becomes an order in one tap.', name: 'Farheen A.', business: 'Modest fashion, Hyderabad', metric: '4 hours saved weekly' },
    { quote: 'My resellers get their prices automatically. No more two price lists on WhatsApp.', name: 'Devanshi P.', business: 'Silver jewellery, Rajkot', metric: '2x reseller volume' },
  ],
};

export const finalCta = {
  title: 'The stall stays open. Even at 2 a.m.',
  sub: '15 days free. Set up in an evening. Cancel anytime.',
  cta: 'Start free trial',
};

export const footer = {
  tagline: 'The AI sales assistant and order desk for Instagram and WhatsApp sellers.',
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Guides', href: '#guides' },
      { label: 'Seller login', href: '/app/login' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Admin', href: '/admin/login' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Data deletion', href: '/data-deletion' },
    ],
  },
  madeIn: 'Made in India',
};

export const contact = {
  title: 'Talk to a human',
  sub: 'Questions about plans, moving your catalog or anything else. We reply within a working day.',
  form: {
    name: 'Your name',
    business: 'Business name',
    email: 'Email',
    phone: 'Phone',
    message: 'What do you need?',
    submit: 'Send message',
    success: 'Message sent. We usually reply within a day.',
  },
};
