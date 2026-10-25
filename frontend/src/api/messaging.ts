import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post, put } from './http';
import type { Channel, ConversationDetail, ConversationSummary } from './types';

/** Meta's WhatsApp Embedded Signup; solutionId is empty unless "CartHedge pays" is offered. */
export type WhatsAppSignup = { appId: string; configId: string; version: string; solutionId: string };

type ChannelsResponse = {
  channels: Channel[];
  oauth: Record<'whatsapp' | 'instagram', boolean>;
  /** sellers can connect their own WhatsApp; false = assisted (they reply from the WhatsApp Business app) */
  whatsappChannel: boolean;
  whatsappSignup: WhatsAppSignup | null;
};

export const useChannelsInfo = () =>
  useQuery({
    queryKey: ['channels'],
    queryFn: () => get<ChannelsResponse>('/api/v1/channels'),
  });

export const useChannels = () => {
  const { data, ...rest } = useChannelsInfo();
  return { ...rest, data: data?.channels ?? [] };
};

/** One-tap connect: the API mints a signed state and returns the Meta consent URL. */
export const getChannelConnectUrl = (channel: string) =>
  get<{ url: string }>(`/api/v1/channels/${channel}/connect-url`);

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
    /** finishes Embedded Signup: the popup's code, and who pays Meta */
    connectWhatsApp: useMutation({
      mutationFn: (input: { code: string; billing: '' | 'partner' }) =>
        post<{ ok: boolean }>('/api/v1/channels/whatsapp/embedded', input),
      onSuccess: invalidate,
    }),
    disconnect: useMutation({
      mutationFn: (channel: string) => del<{ ok: boolean }>(`/api/v1/channels/${channel}`),
      onSuccess: invalidate,
    }),
    setAi: useMutation({
      mutationFn: ({ id, paused }: { id: string; paused: boolean }) =>
        put<{ ok: boolean }>(`/api/v1/conversations/${id}/ai`, { paused }),
      onSuccess: (_r, v) => {
        qc.invalidateQueries({ queryKey: ['conversation', v.id] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      },
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
