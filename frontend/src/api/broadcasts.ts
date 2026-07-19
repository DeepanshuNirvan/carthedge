import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post } from './http';
import type { Broadcast } from './types';

export const useBroadcasts = () =>
  useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => get<{ broadcasts: Broadcast[] }>('/api/v1/broadcasts'),
    select: (d) => d.broadcasts,
  });

export function useBroadcastMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['broadcasts'] });
  return {
    create: useMutation({
      mutationFn: (input: { name: string; message: string; segment: string; scheduledAt?: string }) =>
        post<Broadcast>('/api/v1/broadcasts', input),
      onSuccess: invalidate,
    }),
    send: useMutation({
      mutationFn: (id: string) => post<{ ok: boolean; status: string }>(`/api/v1/broadcasts/${id}/send`),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => del<{ ok: boolean }>(`/api/v1/broadcasts/${id}`),
      onSuccess: invalidate,
    }),
  };
}
