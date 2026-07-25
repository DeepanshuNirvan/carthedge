import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post } from './http';
import type { Channel, ConversationDetail, ConversationSummary } from './types';

export const useChannels = () =>
  useQuery({
    queryKey: ['channels'],
    queryFn: () => get<{ channels: Channel[] }>('/api/v1/channels'),
    select: (d) => d.channels ?? [],
  });

export const useConversations = () =>
  useQuery({
    queryKey: ['conversations'],
    queryFn: () => get<{ conversations: ConversationSummary[] }>('/api/v1/conversations'),
    select: (d) => d.conversations ?? [],
    refetchInterval: 10_000, // new DMs land without SSE
  });

export const useConversation = (id: string | null) =>
  useQuery({
    queryKey: ['conversation', id],
    enabled: !!id,
    queryFn: () => get<ConversationDetail>(`/api/v1/conversations/${id}`),
  });

type ConnectInput = { channel: string; externalId: string; accessToken: string; displayName: string };

export function useChannelMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['channels'] });
  return {
    connect: useMutation({
      mutationFn: (input: ConnectInput) => post<{ ok: boolean }>('/api/v1/channels', input),
      onSuccess: invalidate,
    }),
    disconnect: useMutation({
      mutationFn: (channel: string) => del<{ ok: boolean }>(`/api/v1/channels/${channel}`),
      onSuccess: invalidate,
    }),
    reply: useMutation({
      mutationFn: ({ id, text }: { id: string; text: string }) =>
        post<{ ok: boolean }>(`/api/v1/conversations/${id}/reply`, { text }),
      onSuccess: (_r, v) => {
        qc.invalidateQueries({ queryKey: ['conversation', v.id] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      },
    }),
  };
}
