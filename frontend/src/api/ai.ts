import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from './http';
import type { AiDraft, ChatCart, ChatStage, DraftData, PracticeTurn } from './types';

export const useDrafts = () =>
  useQuery({
    queryKey: ['ai', 'drafts'],
    queryFn: () => get<{ drafts: AiDraft[] }>('/api/v1/ai/drafts'),
    select: (d) => d.drafts ?? [],
    refetchInterval: 10_000, // DM drafts are created server-side; same cadence as the inbox
  });

export function useAiMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['ai', 'drafts'] });
  return {
    parse: useMutation({
      mutationFn: (conversation: string) => post<AiDraft>('/api/v1/ai/parse', { conversation }),
      onSuccess: invalidate,
    }),
    confirm: useMutation({
      mutationFn: ({ id, overrides }: { id: string; overrides?: DraftData }) =>
        post<{ ok: boolean }>(`/api/v1/ai/drafts/${id}/confirm`, { overrides }),
      onSuccess: () => {
        invalidate();
        qc.invalidateQueries({ queryKey: ['orders'] });
      },
    }),
    discard: useMutation({
      mutationFn: (id: string) => post<{ ok: boolean }>(`/api/v1/ai/drafts/${id}/discard`),
      onSuccess: invalidate,
    }),
    reply: useMutation({
      mutationFn: (question: string) => post<{ reply: string }>('/api/v1/ai/reply', { question }),
    }),
  };
}

/** One real assistant turn on a chat the seller types; nothing is placed. */
export const practiceTurn = (input: {
  messages: { who: 'buyer' | 'shop'; text: string }[];
  cart?: ChatCart;
  stage?: ChatStage;
  summaryHash?: string;
}) => post<PracticeTurn>('/api/v1/ai/practice', input);
