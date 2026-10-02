import type { ReactNode } from 'react';
import { Seo } from '@/lib/seo';
import { Wordmark } from '@/marketing/Wordmark';
import { Avatar } from '@/ui/Avatar';
import { EmptyState } from '@/ui/EmptyState';
import { LaneGround } from '@/ui/LaneGround';
import { ThemeToggle } from '@/ui/ThemeToggle';

/**
 * A buyer page that cannot go on (an expired link, a paused store, a broken
 * confirm link). It still says whose shop this is and offers the one step that
 * helps, so the buyer is never left on a blank screen.
 */
export function BuyerNotice({
  business,
  icon,
  title,
  message,
  actions,
}: {
  business?: { name: string; logoUrl?: string } | null;
  icon: ReactNode;
  title: string;
  message: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Seo
        title={business ? `${title} | ${business.name}` : `${title} | CartHedge`}
        description={message}
        noIndex
      />
      <LaneGround />
      <header className="glass-bar sticky top-0 z-30 shadow-[0_1px_0_rgb(var(--line)/var(--line-a))]">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          {business ? (
            <>
              <Avatar name={business.name} src={business.logoUrl || undefined} className="size-10" />
              <p className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-snug text-hi">{business.name}</p>
            </>
          ) : (
            <span className="flex-1">
              <Wordmark />
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-[calc(3rem+env(safe-area-inset-bottom))]">
        <EmptyState
          titleAs="h1"
          icon={icon}
          title={title}
          message={message}
          action={
            actions && <div className="flex w-full max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">{actions}</div>
          }
        />
      </main>
    </div>
  );
}
