import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from './http';
import type { LinkCreateInput, ShareLink } from './types';

export const useLinks = () =>
  useQuery({
    queryKey: ['links'],
    queryFn: () => get<{ links: ShareLink[] }>('/api/v1/links'),
    select: (d) => d.links,
  });

export function useLinkMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['links'] });
  return {
    create: useMutation({
      mutationFn: (input: LinkCreateInput) => post<ShareLink>('/api/v1/links', input),
      onSuccess: invalidate,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        patch<{ ok: boolean }>(`/api/v1/links/${id}`, { active }),
      onSuccess: invalidate,
    }),
  };
}
