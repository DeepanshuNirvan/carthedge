import { useQuery } from '@tanstack/react-query';
import { get } from './http';
import type { SiteSettings } from './types';

const fallback: SiteSettings = {
  contact: { email: 'hello@carthedge.in', phone: '', address: '', supportHours: 'Mon–Sat 10am–7pm IST' },
  social: { instagram: '', twitter: '', linkedin: '', youtube: '' },
  site: { tagline: 'The AI order desk for Instagram & WhatsApp sellers', announcement: '' },
};

export const useSite = () =>
  useQuery({
    queryKey: ['site'],
    queryFn: () => get<SiteSettings>('/api/v1/site', undefined, 'none'),
    staleTime: 10 * 60_000,
    placeholderData: fallback,
    retry: 1,
  });
