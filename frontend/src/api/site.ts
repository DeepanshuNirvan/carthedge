import { useQuery } from '@tanstack/react-query';
import { get, post } from './http';
import type { SiteSettings } from './types';
import { problem, testimonials, guides } from '@/strings/marketing';

// Shipped defaults; also the fallback that keeps the site whole when the API is unreachable.
export const siteFallback: SiteSettings = {
  contact: { email: 'hello@carthedge.in', phone: '', address: '', supportHours: 'Mon–Sat 10am–7pm IST' },
  social: { instagram: '', twitter: '', linkedin: '', youtube: '' },
  site: { tagline: 'The AI order desk for Instagram & WhatsApp sellers', announcement: '' },
  stats: problem.stats,
  testimonials: testimonials.items,
  faqs: guides.faqs,
};

export type ContactInput = { name: string; business: string; email: string; phone: string; message: string };

/** Marketing enquiry — stored as a lead and mailed to the platform team. */
export const sendContactMessage = (input: ContactInput) =>
  post<{ ok: boolean }>('/api/v1/contact', input, 'none');

export const useSite = () =>
  useQuery({
    queryKey: ['site'],
    queryFn: () => get<SiteSettings>('/api/v1/site', undefined, 'none'),
    staleTime: 10 * 60_000,
    placeholderData: siteFallback,
    retry: 1,
  });
