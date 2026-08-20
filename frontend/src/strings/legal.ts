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
const UPDATED = '20 August 2026';

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
          'Usage records needed to run your subscription: order counts, plan and billing status.',
        ],
      },
      {
        heading: 'What we collect from buyers',
        body: [
          'Buyers never create an account. At checkout we collect the name, phone number and delivery address needed to fulfil the order, plus the order contents.',
          'A phone number is verified by one-time password. That verification token is short-lived and consumed when the order is created.',
          'Buyer information is processed on behalf of the seller you are ordering from. That seller is responsible for how they use it.',
          'Card and UPI details are handled entirely by Razorpay. CartHedge never sees or stores them.',
        ],
      },
      {
        heading: 'Connected Instagram and WhatsApp accounts',
        body: [
          'Connecting an account is optional and always initiated by the seller through Meta’s own login screen. We never ask for, see, or store your Instagram or WhatsApp password.',
          'Once connected, we receive messages and comments sent to that business account from the moment of connection onward. We do not download or read your message history from before you connected.',
          'Message content is used for one purpose: drafting an order card that you review and confirm. We also use it to send replies and order updates that you or your configured automations trigger.',
          'Message text is sent to our AI provider (Google Gemini) to extract order details such as item, size, address and payment preference. It is not used to train third-party models.',
          'You can disconnect an account at any time from Settings. Disconnecting immediately stops all message access and deletes the stored access token.',
        ],
      },
      {
        heading: 'Who we share data with',
        body: [
          'Service providers that operate the platform: our hosting and database providers, Razorpay for payments, Google Gemini for order parsing, our email provider for transactional mail, and courier partners when you hand an order over for shipping.',
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
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You can access and correct your business details at any time from Settings.',
          'You can disconnect Instagram or WhatsApp without closing your CartHedge account.',
          'You can request deletion of your account and associated data — see the data deletion page.',
          'Buyers who want an order record removed should contact the seller they ordered from, or write to us and we will pass the request on.',
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
          'Buyer payments settle directly into your own Razorpay account. CartHedge does not hold, route or refund customer money.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Do not use CartHedge to sell anything illegal, to send messages that violate Meta’s platform policies, or to message people who have not contacted you first.',
          'Do not attempt to access another seller’s data, probe the platform for vulnerabilities without permission, or resell access to the platform.',
          'Accounts that put connected Instagram or WhatsApp numbers at risk of a platform ban may be suspended.',
        ],
      },
      {
        heading: 'Subscription and billing',
        body: [
          'Plans are billed monthly and include a monthly order quota. Orders beyond the quota are charged a per-order fee at the rate shown on the pricing page.',
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
          `Email ${CONTACT} from the address registered on the account, with the subject "Delete my account".`,
          'We confirm the request, then delete your business profile, products, customer records, orders, messages and stored credentials.',
          'We aim to complete deletions within 30 days. We will tell you when it is done.',
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
