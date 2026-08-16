import { LogoMark } from '@/marketing/Wordmark';

export function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      {/* the mark breathing beats a bare spinner on a full-page wait */}
      <LogoMark size={40} className="animate-pulse" />
    </div>
  );
}
