import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, patch, post, put } from './http';
import type { Offer, Product, ProductInput } from './types';

type ProductFilters = { search?: string; category?: string; trending?: boolean };

export const useProducts = (filters: ProductFilters = {}) =>
  useQuery({
    queryKey: ['products', filters],
    queryFn: () =>
      get<{ products: Product[] }>('/api/v1/products', {
        search: filters.search,
        category: filters.category,
        trending: filters.trending ? 'true' : undefined,
      }),
    select: (d) => d.products,
  });

/** Counted stock at or below the threshold — untracked products never appear. */
export const useLowStock = (threshold = 5) =>
  useQuery({
    queryKey: ['products', 'lowStock', threshold],
    queryFn: () => get<{ products: Product[] }>('/api/v1/products/low-stock', { threshold }),
    select: (d) => d.products ?? [],
    staleTime: 60_000,
  });

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: ['products', id],
    queryFn: () => get<Product>(`/api/v1/products/${id}`),
    enabled: !!id,
  });

export function useProductMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });
  return {
    create: useMutation({
      mutationFn: (input: ProductInput) => post<Product>('/api/v1/products', input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
        put<Product>(`/api/v1/products/${id}`, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => del<{ ok: boolean }>(`/api/v1/products/${id}`),
      onSuccess: invalidate,
    }),
    setStock: useMutation({
      mutationFn: ({ id, inStock }: { id: string; inStock: boolean }) =>
        patch<{ ok: boolean }>(`/api/v1/products/${id}/stock`, { inStock }),
      onSuccess: invalidate,
    }),
    setTrending: useMutation({
      mutationFn: ({ id, trending }: { id: string; trending: boolean }) =>
        patch<{ ok: boolean }>(`/api/v1/products/${id}/trending`, { trending }),
      onSuccess: invalidate,
    }),
    bulkImport: useMutation({
      mutationFn: (products: ProductInput[]) =>
        post<{ created: number }>('/api/v1/products/bulk', { products }),
      onSuccess: invalidate,
    }),
  };
}

export const useOffers = () =>
  useQuery({
    queryKey: ['offers'],
    queryFn: () => get<{ offers: Offer[] }>('/api/v1/offers'),
    select: (d) => d.offers ?? [],
  });

export function useOfferMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['offers'] });
  return {
    create: useMutation({
      mutationFn: (input: Omit<Offer, 'id'>) => post<Offer>('/api/v1/offers', input),
      onSuccess: invalidate,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        patch<{ ok: boolean }>(`/api/v1/offers/${id}`, { active }),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Omit<Offer, 'id'> }) => put<{ ok: boolean }>(`/api/v1/offers/${id}`, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => del<{ ok: boolean }>(`/api/v1/offers/${id}`),
      onSuccess: invalidate,
    }),
  };
}
