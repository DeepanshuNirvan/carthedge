// Privacy, terms and the data-deletion route Meta requires before an app can be
// published. Content describes what the platform actually does today — update it
// alongside any change to what CartHedge collects or who it shares data with.

export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = {
  title: string;
  seoTitle: string;
  description: string;
  path: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const CONTACT = 'privacy@carthedge.in';
const UPDATED = '4 October 2026';

export const legalDocs = {
  privacy: {
    title: 'Privacy Policy',
    seoTitle: 'Privacy Policy — CartHedge',
    description:
      'What CartHedge collects from sellers and buyers, how connected Instagram and WhatsApp accounts are used, and how to have your data deleted.',
    path: '/privacy',
    updated: UPDATED,
    intro:
      'CartHedge is an order desk for Instagram and WhatsApp sellers in India. This policy explains what we collect, why, and how to get it removed.',
    sections: [
      {
        heading: 'Who we are',
        body: [
          'CartHedge provides software that helps a seller turn chat conversations into confirmed orders. Sellers are our customers. Buyers interact with a seller’s storefront and checkout links, which we host on the seller’s behalf.',
          `For any privacy question or request, write to ${CONTACT}.`,
        ],
      },
      {
        heading: 'What we collect from sellers',
        body: [
          'Account and business details you enter: name, email address, phone number, WhatsApp and Instagram handles, business address, and GSTIN where provided.',
          'Payment gateway credentials for your own Razorpay account, stored encrypted at rest. Buyer payments settle directly to you — CartHedge never holds your money.',
          'Access tokens for any Instagram or WhatsApp account you connect, stored encrypted at rest and used only to read and send messages for your business.',
          'Usage records needed to run your subscription: order counts, plan and billing status, and how many AI requests your account made (counts only, not message content).',
          'Your plan payments are processed by Razorpay. If you turn on autopay, the card or UPI AutoPay mandate is held by Razorpay; we keep only its reference, the amounts charged and the GST invoices we issue you.',
          'If you turn on notifications on a device, the push address your browser gives us for it. It is removed when you turn notifications off or the browser stops accepting them.',
        ],
      },
      {
        heading: 'What we collect from buyers',
        body: [
          'Buyers never create an account. At checkout we collect the name, phone number and delivery address needed to fulfil the order, plus the order contents.',
          'A phone number is verified by one-time password. That verification token is short-lived and consumed when the order is created.',
          'Buyer information is processed on behalf of the seller you are ordering from. That seller is responsible for how they use it.',
          'If you return or exchange an item, the request details, any photos you upload and the record of any refund.',
          'If you buy for a business, the GSTIN and company name you add for a tax invoice.',
          'If you verify your number but do not finish checking out, the store may send you one reminder about the order. That record is deleted after 30 days.',
          'If you choose to get offers from a store on WhatsApp, a record of that choice: the words you agreed to, when, where you said yes (checkout, your order page, WhatsApp or a link) and the network address and browser it came from. Stopping offers is recorded the same way.',
          'Card and UPI details are handled entirely by Razorpay. CartHedge never sees or stores them; we keep only Razorpay’s payment and refund references, amounts and status, for refunds and tax records.',
        ],
      },
      {
        heading: 'Connected Instagram and WhatsApp accounts',
        body: [
          'Connecting an account is optional and always initiated by the seller through Meta’s own login screen. We never ask for, see, or store your Instagram or WhatsApp password.',
          'Once connected, we receive messages and comments sent to that business account from the moment of connection onward. We do not download or read your message history from before you connected.',
          'Message content is used for one purpose: drafting an order card that you review and confirm. We also use it to send replies and order updates that you or your configured automations trigger.',
          'Message text is sent to our AI provider (OpenAI or Google Gemini) to understand the buyer, draft the assistant’s replies and extract order details such as item, size, address and payment preference. It is not used to train third-party models.',
          'You can disconnect an account at any time from Settings. Disconnecting immediately stops all message access and deletes the stored access token.',
        ],
      },
      {
        heading: 'Offers on WhatsApp',
        body: [
          'A store sends you offers and new arrivals on WhatsApp only if you said yes: by ticking the box at checkout (it is never ticked for you), on your order page, or by replying START to the store. Buying something does not sign you up.',
          'Updates about your own orders, such as confirmation, dispatch and delivery, are not offers. They come whether or not you subscribe.',
          'You can stop offers at any time and it takes effect at once: reply STOP to the store on WhatsApp, tap the link at the end of any offer, or use your order page.',
          'The record of each yes and no is kept while the store uses CartHedge, so the store can show what you agreed to. If the store erases your details at your request, or closes its account, the record is deleted too.',
        ],
      },
      {
        heading: 'Who we share data with',
        body: [
          'Service providers that operate the platform: our hosting and database providers, Razorpay for payments, our AI providers (OpenAI, Google Gemini), our email and messaging providers, the browser makers’ push services that deliver device notifications, and courier partners when you hand an order over for shipping.',
          'CartHedge support staff can open a read-only view of a seller’s workspace to help with a request. They cannot change anything in it, and every such access is recorded.',
          'We do not sell personal information, and we do not share it for advertising.',
          'Each seller’s data is isolated. One seller can never see another seller’s orders, customers or messages.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Seller account and order records are kept while the account is active, and for as long afterwards as tax and accounting rules require.',
          'Buyer order records are kept as part of the seller’s order history, since the seller needs them for fulfilment, returns and invoicing.',
          'Encrypted channel access tokens are deleted as soon as the channel is disconnected.',
          'When a seller deletes their account, the store closes at once and its data is erased after 30 days; signing in before then restores it. GST invoices CartHedge issued for the subscription, and the matching payment records, are kept as tax law requires.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You can access and correct your business details at any time from Settings, and download all your store data from Settings → Account.',
          'You can disconnect Instagram or WhatsApp without closing your CartHedge account.',
          'You can delete your account yourself from Settings → Account — see the data deletion page.',
          'Buyers who want their details removed should contact the seller they ordered from; the seller can erase a buyer’s personal details while keeping the order for their accounts. You can also write to us and we will pass the request on.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'Payment credentials and channel access tokens are encrypted at rest with AES-GCM. Traffic is served over HTTPS.',
          'Incoming webhooks from Meta are verified against a cryptographic signature before they are processed, so third parties cannot inject messages into your account.',
        ],
      },
      {
        heading: 'Changes',
        body: [
          `This policy was last updated on ${UPDATED}. If we make a material change we will notify account holders by email before it takes effect.`,
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    seoTitle: 'Terms of Service — CartHedge',
    description:
      'The terms that apply when you use CartHedge to run your Instagram or WhatsApp storefront, order board and checkout links.',
    path: '/terms',
    updated: UPDATED,
    intro: 'These terms apply to every CartHedge account. By creating one, you agree to them.',
    sections: [
      {
        heading: 'Your account',
        body: [
          'You must give accurate business details and keep your login credentials secure. You are responsible for activity carried out under your account.',
          'Every new account starts with a free trial. After it ends, continued access requires an active subscription.',
        ],
      },
      {
        heading: 'What CartHedge does and does not do',
        body: [
          'CartHedge is software that helps you capture, confirm and track orders. We are not a party to any sale between you and your buyer.',
          'You are the merchant of record. You are responsible for your products, your pricing, your delivery commitments, your tax obligations and your dealings with buyers.',
          'You are responsible for the product information you publish, including the MRP, country of origin and maker or importer details where India’s consumer protection and legal metrology rules require them. Never sell above the MRP you state.',
          'Buyer payments settle directly into your own Razorpay account. CartHedge does not hold, route or refund customer money.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Do not use CartHedge to sell anything illegal, to send messages that violate Meta’s platform policies, to message people who have not contacted you first, or to send marketing to anyone who has not opted in to it (see Broadcasts and marketing messages below).',
          'Do not attempt to access another seller’s data, probe the platform for vulnerabilities without permission, or resell access to the platform.',
          'Accounts that put connected Instagram or WhatsApp numbers at risk of a platform ban may be suspended.',
        ],
      },
      {
        heading: 'Broadcasts and marketing messages',
        body: [
          'Send offers, new arrivals and other marketing only to buyers who opted in through CartHedge (the unticked box at checkout, their order page or a START reply) or for whom you hold equal proof of consent. A purchase is not consent.',
          'Every marketing message CartHedge sends ends with the buyer’s own stop link, and buyers can also reply STOP. Honour every stop request at once and never add back someone who stopped.',
          'Follow WhatsApp’s Business Messaging Policy and Commerce Policy: no prohibited goods, no misleading claims, and no more messages than your buyers expect.',
          'For your buyers’ personal data you are the data fiduciary under India’s Digital Personal Data Protection Act, 2023, and CartHedge processes it on your behalf and on your instructions.',
          'You accept these rules in the app before your first broadcast, and that acceptance is recorded with its date. We may pause broadcasts on an account that draws complaints, spam reports or a low WhatsApp quality rating, to protect your number and the platform.',
        ],
      },
      {
        heading: 'Subscription and billing',
        body: [
          'Plans are billed monthly and include a monthly order quota. Orders beyond the quota are charged a per-order fee at the rate shown on the pricing page.',
          'You can renew by hand each month or turn on autopay. With autopay, your plan renews automatically through Razorpay on the card or UPI AutoPay mandate you approve, and fees for orders beyond the quota are added to that charge. Razorpay sends the notices that card and UPI rules require before each charge. You can turn autopay off at any time in Billing.',
          'Every subscription payment comes with a GST invoice from CartHedge, available in Billing.',
          'You can cancel at any time. Access continues until the end of the paid period. Fees already paid are not refunded except where required by law.',
          'If a subscription lapses, seller access and the public storefront are paused until it is renewed. Your data is retained.',
        ],
      },
      {
        heading: 'Availability',
        body: [
          'We work to keep CartHedge available, but we do not guarantee uninterrupted service. Features may change as the product develops.',
          'Third-party outages — Meta, Razorpay, couriers — can interrupt parts of the product and are outside our control.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'To the extent permitted by law, CartHedge is not liable for lost profits, lost sales or indirect damages. Our total liability is limited to the subscription fees you paid in the three months before the claim.',
        ],
      },
      {
        heading: 'Contact',
        body: [`Questions about these terms: ${CONTACT}.`],
      },
    ],
  },

  dataDeletion: {
    title: 'Delete Your Data',
    seoTitle: 'Delete Your Data — CartHedge',
    description:
      'How to disconnect a linked Instagram or WhatsApp account and how to request full deletion of your CartHedge data.',
    path: '/data-deletion',
    updated: UPDATED,
    intro:
      'You can remove a connected messaging account yourself in seconds, or ask us to delete your account entirely.',
    sections: [
      {
        heading: 'Disconnect Instagram or WhatsApp',
        body: [
          'Sign in to CartHedge, open Settings, find the connected channel and choose Disconnect.',
          'This takes effect immediately: the stored access token is deleted and CartHedge stops receiving any further messages or comments from that account.',
          'You can also revoke CartHedge from Instagram directly, under Settings and privacy → Website permissions → Apps and websites.',
        ],
      },
      {
        heading: 'Delete your whole account',
        body: [
          'Sign in, open Settings → Account and choose Delete account. You can download all your data there first.',
          'Your store closes and the assistant stops at once. After 30 days we delete your business profile, products, customer records, orders, messages and stored credentials. Signing in before then restores everything.',
          `If you cannot sign in, email ${CONTACT} from the address registered on the account, with the subject "Delete my account".`,
        ],
      },
      {
        heading: 'What is kept, and why',
        body: [
          'Invoices and payment records are retained where Indian tax and accounting rules require it. These are kept for compliance only and are not used for anything else.',
          'Deletion is permanent. Order history, customer ledger and analytics cannot be restored afterwards.',
        ],
      },
      {
        heading: 'If you are a buyer',
        body: [
          'Your order details sit in the ledger of the seller you bought from. Contact that seller to have them removed.',
          `If you cannot reach them, write to ${CONTACT} with your phone number and order code and we will forward the request.`,
        ],
      },
    ],
  },
} satisfies Record<string, LegalDoc>;

export type LegalDocId = keyof typeof legalDocs;
