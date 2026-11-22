// All marketing copy lives here; sections stay purely presentational.

export const nav = {
  links: [
    { label: 'Product', href: '#product' },
    { label: 'Features', href: '#features' },
    { label: 'Services', href: '/services' },
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
  { id: 'voice', label: 'Your voice' },
  { id: 'journey', label: 'The board' },
  { id: 'storefront', label: 'Your store' },
  { id: 'features', label: 'The whole shop' },
  { id: 'pricing', label: 'Plans' },
  { id: 'guides', label: 'Get started' },
];

export const hero = {
  title: 'Every DM answered',
  titleAccent: 'Every order closed in the chat',
  sub: 'CartHedge replies to buyers in their language from your real catalog, collects the order and confirms it. You approve with a tap.',
  ctaPrimary: 'Start free trial',
  ctaSecondary: 'See the automations',
  trial: '30 days free. No card.',
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
  title: 'Your inbox has quietly become a full-time job',
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
  title: 'Every automation is a switch you hold',
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

// the assistant's settings, played back as a practice chat
export const voice = {
  title: 'It sells in your voice, by your rules',
  sub: 'Set the tone once. It quotes your policies, keeps your hours and hands you the chats you choose.',
  store: 'Ritika’s Closet',
  practice: 'Practice chat. Nothing is sent.',
  toneLabel: 'Tone',
  tones: [
    { value: 'polite', label: 'Polite' },
    { value: 'warm', label: 'Warm' },
    { value: 'fun', label: 'Fun' },
  ],
  addressLabel: 'Speaks to buyers as',
  addresses: [
    { value: 'aap', label: 'Aap' },
    { value: 'tum', label: 'Tum' },
  ],
  emojiLabel: 'Emoji',
  buyer: 'ye pink kurti M me milegi? price kya hai',
  replies: {
    polite: {
      aap: 'Ji, Rose Chikankari Kurti pink mein M size available hai. Keemat ₹1,499 hai, delivery free. Kya aap order karna chahenge?',
      tum: 'Ji, Rose Chikankari Kurti pink mein M size available hai. Keemat ₹1,499 hai, delivery free. Kya tum order karna chahoge?',
    },
    warm: {
      aap: 'Haan ji, pink M bilkul hai! Pure cotton, haath ki kadhai. ₹1,499 free delivery ke saath. Aapke liye rakh doon?',
      tum: 'Haan, pink M bilkul hai! Pure cotton, haath ki kadhai. ₹1,499 free delivery ke saath. Tumhare liye rakh doon?',
    },
    fun: {
      aap: 'Pink M ready hai aapke liye! ₹1,499 aur delivery free. Yeh kurti har function mein hit hai. Aapka order bana doon?',
      tum: 'Pink M ready hai tumhare liye! ₹1,499 aur delivery free. Yeh kurti har function mein hit hai. Tumhara order bana doon?',
    },
  },
  emoji: { polite: '🙏', warm: '😊', fun: '✨' },
  teach: [
    { title: 'Your policies, quoted', copy: 'Returns, cancellation, delivery and payment rules, in the exact words of your store policy.' },
    { title: 'FAQ answers, word for word', copy: 'Your answer to “fabric kaisa hai?” goes out exactly as you wrote it.' },
    { title: 'Business hours', copy: 'One away message per chat while you are closed, or answers around the clock.' },
    { title: 'What comes to you', copy: 'Pick bargaining, bulk deals, returns or any order above an amount. Those chats come straight to you.' },
    { title: 'Product details and size charts', copy: 'Fabric, fit, care and the size chart, used in its answers instead of guesses.' },
    { title: 'Practice before buyers do', copy: 'Write as a buyer and see the exact reply with your live catalog and settings.' },
  ],
};

export const languages = {
  title: 'It replies the way your buyers type',
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
  title: 'One board for every order, from DM to doorstep',
  sub: 'Orders from chats, links and your store land in the same place, and the buyer hears about every step on the chat they came from.',
  columns: [
    { status: 'new', label: 'New', note: 'Order code and payment link sent in the chat' },
    { status: 'confirmed', label: 'Confirmed', note: 'Paid by UPI, or COD intent re-confirmed' },
    { status: 'packed', label: 'Packed', note: 'Packing slip and invoice ready' },
    { status: 'shipped', label: 'Shipped', note: 'Courier and tracking id sent on WhatsApp' },
    { status: 'delivered', label: 'Delivered', note: 'Buyer told, invoice numbered, customer ledger updated' },
  ],
  card: { buyer: 'Priya', item: 'Rose Chikankari Kurti, M', code: 'CH-4F7K2Q', total: 149900, source: 'Instagram' },
  // the other orders already on the board, one per lane, from every way an order arrives
  others: [
    { buyer: 'Ananya', source: 'link', total: 89900 },
    { buyer: 'Meher', source: 'store', total: 169900 },
    { buyer: 'Sana', source: 'phone', total: 129900 },
    { buyer: 'Riya', source: 'instagram', total: 249800 },
    { buyer: 'Pooja', source: 'store', total: 219800 },
  ],
};

export const aiDemo = {
  confirm: 'Confirm order',
};

export const calculator = {
  title: 'And when COD comes back unopened',
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

// the whole shop behind the chat: one desk per job, each with a sample of the real screen
export const features = {
  title: 'The whole shop, already built',
  sub: 'Catalog, links, orders, returns, GST and reports live in the same app the assistant works from. Open any desk.',
  sample: 'Sample data',
  desks: [
    {
      key: 'catalog',
      label: 'Catalog & stock',
      lede: 'Every size, colour and photo, with stock that keeps itself honest',
      items: [
        { title: 'Options that fit the product', copy: 'Up to three groups, like size, colour or finish. Every combination gets its own price, SKU, stock and photos.' },
        { title: 'Stock that counts itself', copy: 'Orders draw it down and sold out shows at zero. Cancellations and received returns put it back.' },
        { title: 'Label details', copy: 'MRP, country of origin and maker on every product page. A price can never cross its MRP.' },
        { title: 'Bulk import', copy: 'Bring the whole catalog in one CSV, checked row by row before anything is saved.' },
        { title: 'Offers with limits', copy: 'Percent or flat codes with a cap, minimum order, first order only and uses per buyer.' },
        { title: 'Reseller prices and waitlists', copy: 'A second price list for resellers. Sold-out items collect numbers for the restock.' },
      ],
    },
    {
      key: 'links',
      label: 'Links & storefront',
      lede: 'One branded link takes the buyer from browsing to paying to tracking',
      items: [
        { title: 'Product, cart and custom links', copy: 'Send one item or a ready cart, or type any item and price in ten seconds.' },
        { title: 'QR codes and live counts', copy: 'Every link gets a QR code and a WhatsApp share, with clicks and orders counted.' },
        { title: 'A storefront in your name', copy: 'Your logo and code in the URL, with filters, a trending row, live offers and a policies page.' },
        { title: 'Checkout without an account', copy: 'Phone OTP, a coupon box, then UPI, card or COD. Totals are quoted by the server.' },
        { title: 'Buyers track it themselves', copy: 'The order page shows live status, courier and tracking id. “Order kahan hai?” stops.' },
        { title: 'Self-service inside your rules', copy: 'Buyers cancel, change the address or ask for a return, each step confirmed by OTP.' },
      ],
    },
    {
      key: 'orders',
      label: 'Orders & shipping',
      lede: 'Every source lands on one board, and the busywork comes in bulk',
      items: [
        { title: 'One board for every order', copy: 'Instagram, links, storefront and walk-ins on one kanban, with search, filters and a table view.' },
        { title: 'Bulk actions', copy: 'Select up to 100 orders to change status, print packing slips or a pick list, or cancel.' },
        { title: 'Packing slips with a QR', copy: 'Both addresses, the items and the COD amount to collect, with a QR to the order page.' },
        { title: 'Dropped checkouts', copy: 'See who verified their number but did not order this week, and what was in the cart.' },
        { title: 'Courier handoff', copy: 'Hand orders over with checked addresses. The tracking id reaches the buyer on the chat.' },
        { title: 'Alerts where you are', copy: 'New orders, returns and chats that need you, on WhatsApp, email and phone notifications.' },
      ],
    },
    {
      key: 'returns',
      label: 'Returns & refunds',
      lede: 'After-sales that runs on the return rules you set',
      items: [
        { title: 'Requests with photos', copy: 'Buyers ask from their order page with the reason, the pieces and photos.' },
        { title: 'Approve, pick up, receive', copy: 'Each step is one tap, and the buyer hears about every one of them.' },
        { title: 'Stock back on receipt', copy: 'Pieces return to stock only when they arrive, so a damaged one stays off the shelf.' },
        { title: 'Exchanges in one tap', copy: 'A linked replacement order is created and the buyer pays only the difference.' },
        { title: 'Refunds on record', copy: 'Through your Razorpay for online payments, or UPI, bank or cash with a reference. Never above what was paid.' },
        { title: 'Credit notes', copy: 'Every refund on an invoiced order gets its GST credit note.' },
      ],
    },
    {
      key: 'money',
      label: 'GST & payments',
      lede: 'Paid into your account, invoiced the way your CA expects',
      items: [
        { title: 'Real GST invoices', copy: 'Tax invoice or bill of supply, HSN and rate per product, numbered fresh each financial year.' },
        { title: 'CGST and SGST, or IGST', copy: 'Split by the place of supply on the delivery address, with the buyer’s GSTIN for B2B.' },
        { title: 'Your own Razorpay', copy: 'Buyer money settles in your account. CartHedge never holds it and takes no cut.' },
        { title: 'UPI, cards and COD', copy: 'UPI opens GPay or PhonePe directly. COD can ask for a ₹50 to ₹100 token first.' },
        { title: 'Checkout charges', copy: 'Free delivery above an amount, a COD charge, a pay-online discount and a COD limit. One total everywhere.' },
        { title: 'Your plan, invoiced too', copy: 'Every CartHedge payment comes with its own GST invoice, with autopay if you want it.' },
      ],
    },
    {
      key: 'insights',
      label: 'Insights & reports',
      lede: 'Numbers in rupees, and what to do about them',
      items: [
        { title: 'Today at a glance', copy: 'Sales today, month revenue, pending orders, COD at risk and your repeat rate.' },
        { title: 'Money kept from RTO', copy: 'A meter of rupees saved from refused COD this month, against your old refusal rate.' },
        { title: 'Suggestions that point somewhere', copy: 'Best sellers, buyers to watch, and the best window for your next drop.' },
        { title: 'Customer ledger', copy: 'Lifetime value, repeat orders, returns and COD refusals on every buyer.' },
        { title: 'Monthly report', copy: 'Export the month for your accountant in one tap.' },
        { title: 'Drops to buyers who said yes', copy: 'Plan new-collection broadcasts by segment. Only buyers who opted in receive them.' },
      ],
    },
    {
      key: 'security',
      label: 'Security & data',
      lede: 'Built like it handles money, because it does',
      items: [
        { title: 'Keys kept locked', copy: 'Your Razorpay keys and Instagram connection are stored encrypted, and the connection renews itself.' },
        { title: 'Official Instagram login', copy: 'No password sharing. Every message from Instagram is checked to be genuine. Disconnect anytime.' },
        { title: 'Your business, walled off', copy: 'Each store is isolated. No seller can ever see another seller’s orders or buyers.' },
        { title: 'Sessions you control', copy: 'Changing your password signs out every other device at once.' },
        { title: 'Consent on record', copy: 'Every buyer’s yes or no to offers is kept with the words, the place and the time.' },
        { title: 'Ready for India’s data law', copy: 'Export everything in one file, erase a buyer on request, or delete your account with 30 days to undo it.' },
      ],
    },
  ],
  roadmapTitle: 'Coming next',
  roadmap: [
    { title: 'Comment-to-DM', copy: 'Reply to “price?” comments on posts and Reels with a DM that starts the sale.' },
    { title: 'Live selling', copy: 'Comment-to-order while you are live on Instagram.' },
    { title: 'Auto-replies on WhatsApp', copy: 'The same assistant on your own WhatsApp number, while you keep the Business app.' },
    { title: 'Photo and story replies', copy: 'Match “ye wala” screenshots and story replies to your catalog.' },
  ],
};

export const storefrontPreview = {
  title: 'A shop link buyers trust inside Instagram',
  copy: 'Your logo, your products and your business code in the URL. It opens fast in the Instagram and WhatsApp browsers and checks out with a phone number. No app, no account.',
  notes: ['Phone OTP instead of a password', 'UPI opens GPay or PhonePe directly', 'Track the order at the same link'],
};

export const pricing = {
  title: 'Plans that grow with your DMs',
  sub: 'Every plan starts with 30 days free. No card to try.',
  replacesLead: 'One plan replaces',
  replaces: ['the DM chatbot', 'the store builder', 'the Google Form', 'the invoice app', 'the Excel sheet', 'the order notebook'],
  popular: 'Recommended',
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
  title: 'Live by tonight',
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

// For businesses that sell a service, not a parcel. One page (/services) and one
// section on the home page read from here. The server's no-JavaScript copy of
// the page (internal/web servicesFallback) mirrors these words: change one,
// change the other.
export const services = {
  seo: {
    title: 'CartHedge for Services: AI Replies to Instagram & WhatsApp Enquiries',
    description:
      'Sell a service, not a parcel? CartHedge answers every Instagram and WhatsApp enquiry from your own details, collects what you need to quote, and hands you the enquiry. For trips, events, bookings, transport, classes and more.',
  },
  hero: {
    title: 'Every enquiry answered',
    titleAccent: 'Every detail collected before you pick up the phone',
    sub: "For businesses that sell a service, not a parcel. CartHedge replies in the buyer's language from your own details, asks what you need to know, and hands you the enquiry ready to quote.",
    ctaPrimary: 'Start free trial',
    ctaSecondary: 'Watch a chat',
  },
  demo: {
    title: 'One assistant, whatever you do',
    sub: 'You choose the questions. It asks them the way you would, then writes the enquiry down for you.',
    cardTitle: 'New enquiry',
    cardMeta: 'Written down by CartHedge, not typed by you',
    cardFoot: 'Lands in your Enquiries with an alert. You reply or send your price from there.',
    trades: [
      {
        value: 'trips',
        label: 'Trips',
        business: 'Wander Co',
        handle: 'ananya.goes',
        messages: [
          { from: 'buyer', text: 'Goa trip ka kya rate hai? 4 log hain' },
          { from: 'ai', text: 'Goa Beach Trip ₹2,500 per person se shuru hota hai, Deluxe ₹4,000. Stay aur breakfast included hai. Kab jaana hai aapko?' },
          { from: 'buyer', text: '12 se 15 Dec, Deluxe. Ananya, 98110 43210' },
          { from: 'ai', text: 'Note kar liya, Ananya. Owner yahin aapko poori details aur final price bhej denge.' },
        ],
        enquiry: {
          about: 'Goa Beach Trip (Deluxe) × 4',
          answers: [
            { label: 'Travel dates', value: '12 se 15 Dec' },
            { label: 'Number of people', value: '4' },
          ],
          who: 'Ananya · 98110 43210',
        },
      },
      {
        value: 'events',
        label: 'Events',
        business: 'Phool & Parda Decor',
        handle: 'meher.k',
        messages: [
          { from: 'buyer', text: "Hi, do you do haldi decor? What's the price?" },
          { from: 'ai', text: 'Yes, we do. The price depends on the venue and the setup, so the owner shares it once we know a little more. What is the date, and where is it?' },
          { from: 'buyer', text: "8 Feb, a farmhouse in Chattarpur, around 80 guests. I'm Meher, 99100 22110" },
          { from: 'ai', text: 'Noted, Meher. The owner will send you the price and a few ideas right here.' },
        ],
        enquiry: {
          about: 'Haldi Decor',
          answers: [
            { label: 'Event date', value: '8 Feb' },
            { label: 'Venue and city', value: 'a farmhouse in Chattarpur' },
            { label: 'Number of guests', value: 'around 80' },
          ],
          who: 'Meher · 99100 22110',
        },
      },
      {
        value: 'transport',
        label: 'Transport',
        business: 'Sahyadri Movers',
        handle: 'rohit_pune',
        messages: [
          { from: 'buyer', text: 'Tempo chahiye Pune se Nashik, kal subah' },
          { from: 'ai', text: 'Ji, Pune se Nashik hum jaate hain. Saaman kya hai, aur pickup kahan se hoga?' },
          { from: 'buyer', text: '1BHK ka saaman, Kothrud se. Rohit 98220 11873' },
          { from: 'ai', text: 'Note kar liya, Rohit. Owner gaadi aur rate confirm karke yahin batayenge.' },
        ],
        enquiry: {
          about: 'Pune to Nashik Tempo',
          answers: [
            { label: 'Pickup location', value: 'Kothrud' },
            { label: 'Date and time', value: 'kal subah' },
            { label: 'What is being moved', value: '1BHK ka saaman' },
          ],
          who: 'Rohit · 98220 11873',
        },
      },
      {
        value: 'classes',
        label: 'Classes',
        business: 'Sur Guitar Studio',
        handle: 'tara.plays',
        messages: [
          { from: 'buyer', text: 'Guitar classes ki fees kya hai?' },
          { from: 'ai', text: 'Beginner batch ₹2,000 per month hai, hafte me do classes. Aap kaunse din aana chahenge?' },
          { from: 'buyer', text: 'Weekends. Tara, 98991 04521' },
          { from: 'ai', text: 'Note kar liya, Tara. Sir aapko batch ka time yahin bhej denge.' },
        ],
        enquiry: {
          about: 'Beginner Guitar Batch',
          answers: [{ label: 'Preferred days', value: 'Weekends' }],
          who: 'Tara · 98991 04521',
        },
      },
    ],
  },
  steps: {
    title: 'Set up in an evening',
    items: [
      { title: 'List what you do', copy: 'Each service with its details: what is included, how long, where. A fixed price, a starting price, or price on request.' },
      { title: 'Choose what to ask', copy: 'The date, the place, how many people. Your questions, in your words, for each service.' },
      { title: 'Connect Instagram', copy: 'One tap with the official login. The assistant starts answering enquiries from what you wrote.' },
      { title: 'Quote and close', copy: 'Each enquiry arrives with the answers. Send your price from the app and it goes out on the same chat.' },
    ],
  },
  never: {
    title: 'What it will not do',
    sub: 'An assistant that guesses loses you customers. This one is built to stop and hand over.',
    items: [
      { title: 'Confirm a date or a slot', copy: 'Only you know your calendar. It notes the date and tells the buyer you will confirm it.' },
      { title: 'Make up a price', copy: 'It says the price you set, word for word. For a service priced on request, it says you will share it and nothing more.' },
      { title: 'Answer what it should not', copy: 'Medical, legal and money advice is politely declined. So is anything that has nothing to do with your business.' },
      { title: 'Close a booking without you', copy: 'It hands you the enquiry. Payment and the final yes stay with you.' },
    ],
  },
  fits: {
    title: 'If people message you to ask "kitna lagega?", it fits',
    copy: 'Travel and trip planners, event and wedding decorators, photographers, makeup artists, salons, tutors and coaching, movers and transport, caterers, rentals, repairs and home services. If you also sell products, orders and enquiries run side by side in one app.',
  },
  faqTitle: 'Questions service businesses ask',
  faqs: [
    { q: 'I do not sell products. Is CartHedge still for me?', a: 'Yes. Choose "Services" when you sign up. You list what you do, the assistant answers enquiries about it on Instagram and WhatsApp, and each one reaches you with the details already collected. There is no cart, stock or delivery to set up.' },
    { q: 'My price depends on the job. What does the assistant say?', a: 'Set the service to "price on request". The assistant never guesses a number. It tells the buyer you will share the price, collects what you need to work it out, and you send your quote from the app.' },
    { q: 'Will it confirm a booking or a date on its own?', a: 'No. It notes the date the buyer wants and says you will confirm. Availability, the final price and payment are always yours.' },
    { q: 'What kind of business can use it?', a: 'Any business that takes enquiries in chat. You write the questions the assistant should ask, so the same setup works for a trip planner, a decorator, a tutor or a transporter.' },
    { q: 'I sell products and services. Do I need two accounts?', a: 'No. Choose "Both". Products are ordered and paid for as usual, services become enquiries, and both sit in the same app.' },
    { q: 'What if the buyer asks something I never wrote down?', a: 'The assistant says the business will check and get back, and hands the chat to you when it needs a person. It answers only from what you entered.' },
  ],
  final: {
    title: 'A slow reply sends the enquiry to someone else',
    sub: '30 days free. Set up in an evening. Cancel anytime.',
    cta: 'Start free trial',
  },
  home: {
    title: 'Sell a service, not a parcel?',
    sub: 'The same assistant answers enquiries, collects the details you need, and hands them to you ready to quote.',
    link: 'See how it works for services',
  },
};

export const finalCta = {
  title: 'The stall stays open, even at 2 a.m.',
  sub: '30 days free. Set up in an evening. Cancel anytime.',
  cta: 'Start free trial',
};

export const footer = {
  tagline: 'The AI sales assistant and order desk for Instagram and WhatsApp sellers.',
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'For services', href: '/services' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Guides', href: '#guides' },
      { label: 'Seller login', href: '/app/login' },
    ],
  },
  company: {
    title: 'Company',
    // the staff console is not advertised to every visitor; staff use /admin/login directly
    links: [{ label: 'Contact', href: '/contact' }],
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
