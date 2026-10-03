import type { Capability } from '@/api/types';

/** Human names for the entitlements the API gates on — one source for the admin
 *  plan editor, the seller's locked screens and the billing page. */
export const capabilityLabels: Record<Capability, { label: string; blurb: string }> = {
  ai: { label: 'AI order capture', blurb: 'Turn Instagram and WhatsApp DMs into ready order drafts' },
  aiReply: { label: 'AI reply assistant', blurb: 'Drafted answers to price, fabric and delivery questions' },
  broadcasts: { label: 'Broadcast drops', blurb: 'Collection blasts to past buyers, segmented' },
  offers: { label: 'Offers & reseller pricing', blurb: 'Discount codes and a second price list for resellers' },
  invoices: { label: 'GST invoices', blurb: 'Tax invoices with HSN, CGST/SGST or IGST, and credit notes on refunds' },
  courier: { label: 'Courier handoff', blurb: 'Push shipments to your courier and track them back' },
  waitlist: { label: 'Back-in-stock waitlist', blurb: 'Buyers leave their number on sold-out items' },
  recovery: { label: 'Abandoned checkout reminder', blurb: 'One WhatsApp nudge to buyers who verified but did not order' },
};

export const capabilityLabel = (c: Capability) => capabilityLabels[c]?.label ?? c;
