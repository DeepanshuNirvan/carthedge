import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  ExternalLink,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  Lock,
  LogOut,
  Package,
  Podcast,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';
import { useSubscription } from '@/api/plans';
import type { Capability } from '@/api/types';
import { logout } from '@/api/auth';
import { daysLeft } from '@/lib/date';
import { cn } from '@/lib/cn';
import { LogoMark } from '@/marketing/Wordmark';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { Avatar } from '@/ui/Avatar';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Dropdown, DropdownItem } from '@/ui/Dropdown';
import { LaneGround } from '@/ui/LaneGround';
import { Modal, Sheet } from '@/ui/Modal';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; cap?: Capability };

const groups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Sell',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/orders', label: 'Orders', icon: KanbanSquare },
      { to: '/app/products', label: 'Products', icon: Package },
      { to: '/app/links', label: 'Links', icon: Link2 },
      { to: '/app/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Assistant',
    items: [
      { to: '/app/ai', label: 'AI Desk', icon: Bot, cap: 'ai' },
      { to: '/app/insights', label: 'Insights', icon: Sparkles },
      { to: '/app/broadcasts', label: 'Broadcasts', icon: Podcast, cap: 'broadcasts' },
    ],
  },
  {
    title: 'Money',
    items: [
      { to: '/app/invoices', label: 'Invoices', icon: FileText, cap: 'invoices' },
      { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/app/billing', label: 'Billing', icon: Wallet },
      { to: '/app/settings', label: 'Settings', icon: Settings },
    ],
  },
];
const navItems = groups.flatMap((g) => g.items);

// the four daily destinations get a native-style tab bar; the rest live behind "More"
const tabItems = navItems.filter((i) => ['/app', '/app/orders', '/app/products', '/app/ai'].includes(i.to));
const moreItems = navItems.filter((i) => !tabItems.includes(i));

function useLocked() {
  const { data: sub } = useSubscription();
  return (cap?: Capability) => !!cap && !!sub && !sub.capabilities.includes(cap);
}

/** iOS-style floating tab bar: a glass capsule with one pill that slides to the current tab. */
function BottomTabs({ onMore }: { onMore: () => void }) {
  const { pathname } = useLocation();
  const moreActive = moreItems.some((i) => pathname.startsWith(i.to));
  return (
    <nav
      aria-label="Primary"
      className="glass-nav sheen fixed inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-40 flex rounded-full p-1.5 shadow-float lg:hidden"
    >
      {tabItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10.5px] font-medium transition-colors duration-micro',
              isActive ? 'text-jade-ink' : 'text-low',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="tabPill"
                  className="absolute inset-0 rounded-full bg-[rgb(var(--field)/0.09)]"
                  transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                />
              )}
              <item.icon className="relative size-[21px]" aria-hidden strokeWidth={isActive ? 2.3 : 1.9} />
              <span className="relative">{item.label === 'AI Desk' ? 'AI' : item.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        onClick={onMore}
        className={cn(
          'relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10.5px] font-medium transition-colors duration-micro active:scale-95',
          moreActive ? 'text-jade-ink' : 'text-low',
        )}
      >
        {moreActive && <span className="absolute inset-0 rounded-full bg-[rgb(var(--field)/0.09)]" />}
        <LayoutGrid className="relative size-[21px]" aria-hidden strokeWidth={1.9} />
        <span className="relative">More</span>
      </button>
    </nav>
  );
}

function SideNav() {
  const locked = useLocked();
  return (
    <nav aria-label="Workspace" className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 py-4">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-1.5 text-[11.5px] font-medium text-low">{g.title}</p>
          <div className="flex flex-col gap-0.5">
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-10 items-center gap-3 rounded-full px-3 text-[13.5px] font-medium transition-colors duration-micro',
                    isActive ? 'text-hi' : 'text-mid hover:bg-[rgb(var(--field)/0.05)] hover:text-hi',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sideNavPill"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-[rgb(var(--field)/0.08)] shadow-[inset_0_0_0_1px_rgb(var(--line)/var(--line-a))]"
                        transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                      />
                    )}
                    <item.icon
                      className={cn('relative size-[18px] shrink-0', isActive && 'text-jade-ink')}
                      aria-hidden
                    />
                    <span className="relative">{item.label}</span>
                    {locked(item.cap) && (
                      <Lock className="relative ml-auto size-3.5 shrink-0 text-low" aria-label="Not on your plan" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function PlanCard() {
  const { data: sub } = useSubscription();
  if (!sub) return null;
  const left = daysLeft(sub.endsAt);
  const tone = sub.status === 'trial' ? 'gold' : sub.status === 'expired' ? 'danger' : 'jade';
  return (
    <Link
      to="/app/billing"
      className="mx-2.5 mb-2.5 flex items-center gap-3 rounded-lg bg-[rgb(var(--field)/0.05)] p-3 transition-colors hover:bg-[rgb(var(--field)/0.08)]"
    >
      <span className="bulb size-2" data-lit={sub.status === 'trial'} data-state={sub.status === 'active' ? 'done' : undefined} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold capitalize text-hi">{sub.planName || sub.planCode}</span>
        <span className="block text-[11.5px] text-low">
          {sub.status === 'trial' ? `${left} ${left === 1 ? 'day' : 'days'} of trial left` : sub.status === 'expired' ? 'Renew to reopen your store' : 'Active plan'}
        </span>
      </span>
      <Badge tone={tone}>{sub.status}</Badge>
    </Link>
  );
}

function TrialBanner() {
  const { data: sub } = useSubscription();
  if (!sub) return null;
  const left = daysLeft(sub.endsAt);
  if (sub.status === 'expired' || (sub.status !== 'trial' && left === 0)) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-danger/12 px-4 py-2 text-center text-xs font-medium text-danger-ink">
        Your subscription has expired and your store is paused.
        <Link to="/app/billing" className="underline underline-offset-2">
          Renew now
        </Link>
      </div>
    );
  }
  if (sub.status === 'trial') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-gold-400/12 px-4 py-2 text-center text-xs font-medium text-gold-ink lg:hidden">
        Trial: {left} {left === 1 ? 'day' : 'days'} left.
        <Link to="/app/billing" className="underline underline-offset-2">
          Pick a plan
        </Link>
      </div>
    );
  }
  return null;
}

/** Soft paywall: mounted by the 402 interceptor via ui store. */
function PaywallGate() {
  const { paywallOpen, setPaywall } = useUi();
  const navigate = useNavigate();
  return (
    <Modal open={paywallOpen} onClose={() => setPaywall(false)} title="Subscription needed">
      <p className="text-sm leading-relaxed text-mid">
        This part of CartHedge needs an active plan. Your data is safe. Renew to pick up exactly where you left off.
      </p>
      <div className="mt-5 flex gap-3">
        <Button
          onClick={() => {
            setPaywall(false);
            navigate('/app/billing');
          }}
          icon={<Wallet className="size-4" />}
        >
          Renew subscription
        </Button>
        <Button variant="ghost" onClick={() => setPaywall(false)}>
          Not now
        </Button>
      </div>
    </Modal>
  );
}

function MoreSheet({ open, onClose, onSignOut }: { open: boolean; onClose: () => void; onSignOut: () => void }) {
  const locked = useLocked();
  return (
    <Sheet open={open} onClose={onClose} title="More" side="bottom">
      <div className="grid grid-cols-3 gap-2.5">
        {moreItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'relative flex aspect-[1.05] flex-col items-center justify-center gap-2 rounded-lg text-[12.5px] font-medium transition-transform duration-micro active:scale-95',
                isActive ? 'bg-jade-500/12 text-jade-ink' : 'neu text-hi',
              )
            }
          >
            <item.icon className="size-[22px]" aria-hidden />
            {item.label}
            {locked(item.cap) && <Lock className="absolute right-2.5 top-2.5 size-3 text-low" aria-label="Not on your plan" />}
          </NavLink>
        ))}
      </div>
      <Button variant="ghost" className="mt-5 w-full text-danger-ink" icon={<LogOut className="size-4" />} onClick={onSignOut}>
        Sign out
      </Button>
    </Sheet>
  );
}

export function AppShell() {
  const { businessName, businessCode } = useAuth();
  const [more, setMore] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();

  const signOut = async () => {
    await logout();
    navigate('/app/login');
  };

  return (
    <div className="relative flex min-h-dvh">
      <LaneGround />

      {/* desktop: a floating glass sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[15.5rem] shrink-0 p-3 pr-0 lg:block">
        <div className="glass-nav sheen flex h-full flex-col rounded-xl">
          <div className="flex items-center gap-2.5 border-b px-4 py-3.5">
            <Link to="/app" aria-label="Dashboard" className="shrink-0">
              <LogoMark size={30} />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold tracking-snug text-hi">{businessName}</p>
              <p className="truncate font-mono text-[11px] text-low">/s/{businessCode}</p>
            </div>
          </div>
          <SideNav />
          <PlanCard />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TrialBanner />
        <header className="glass-bar glass-float sheen scroll-edge sticky top-0 z-30 flex items-center gap-3 px-4 lg:after:hidden pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] sm:px-6 lg:top-3 lg:mx-3 lg:mt-3 lg:rounded-xl lg:pb-2 lg:pt-2">
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <LogoMark size={28} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-snug text-hi">{businessName}</p>
              <p className="truncate font-mono text-[11px] text-low">/s/{businessCode}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {businessCode && (
              <a
                href={`/s/${businessCode}`}
                target="_blank"
                rel="noreferrer"
                className="hidden h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-mid transition-colors hover:bg-[rgb(var(--field)/0.08)] hover:text-hi sm:flex"
              >
                View store <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
            <ThemeToggle />
            <Dropdown trigger={<Avatar name={businessName ?? 'Seller'} className="size-9" />}>
              <DropdownItem onClick={() => navigate('/app/settings')}>
                <Settings className="size-4" /> Settings
              </DropdownItem>
              <DropdownItem onClick={() => navigate('/app/billing')}>
                <Wallet className="size-4" /> Billing
              </DropdownItem>
              <DropdownItem danger onClick={signOut}>
                <LogOut className="size-4" /> Sign out
              </DropdownItem>
            </Dropdown>
          </div>
        </header>

        {/* separate px/pt/pb: a p-* shorthand would out-cascade the tab-bar clearance */}
        <motion.main
          key={location.pathname}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="w-full min-w-0 flex-1 px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pt-4 lg:pb-8"
        >
          <Outlet />
        </motion.main>
      </div>
      <BottomTabs onMore={() => setMore(true)} />
      <MoreSheet open={more} onClose={() => setMore(false)} onSignOut={signOut} />
      <PaywallGate />
    </div>
  );
}
