import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post } from './http';
import type { Enquiry, EnquiryInput, EnquiryStatus } from './types';

type EnquiryPage = { enquiries: Enquiry[]; counts: Record<EnquiryStatus, number> };

/** One status tab, plus the count in every status for the tabs themselves. */
export const useEnquiries = (status: EnquiryStatus, enabled = true) =>
  useQuery({
    queryKey: ['enquiries', status],
    queryFn: () => get<EnquiryPage>('/api/v1/enquiries', { status, limit: 100 }),
    enabled,
  });

export type EnquiryPatch = Partial<Pick<Enquiry, 'status' | 'quotedAmount' | 'quoteNote' | 'sellerNotes'>>;

export function useEnquiryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['enquiries'] });
  return {
    create: useMutation({
      mutationFn: (input: EnquiryInput) => post<Enquiry>('/api/v1/enquiries', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch: body }: { id: string; patch: EnquiryPatch }) => patch<Enquiry>(`/api/v1/enquiries/${id}`, body),
      onSuccess: invalidate,
    }),
    /** Erases one enquiry, for a buyer who asks for their details to go. */
    remove: useMutation({
      mutationFn: (id: string) => del<{ ok: boolean }>(`/api/v1/enquiries/${id}`),
      onSuccess: invalidate,
    }),
    /** Saves the price and sends it on the buyer's chat; `sent` is false when the chat could not carry it. */
    quote: useMutation({
      mutationFn: ({ id, amount, note }: { id: string; amount: number; note: string }) =>
        post<{ enquiry: Enquiry; sent: boolean }>(`/api/v1/enquiries/${id}/quote`, { amount, note }),
      onSuccess: invalidate,
    }),
  };
}
