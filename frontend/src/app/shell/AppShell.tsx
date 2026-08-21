import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  Link2,
  Lock,
  LogOut,
  Menu,
  Package,
  Podcast,
  Settings,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useSubscription } from '@/api/plans';
import type { Capability } from '@/api/types';
import { logout } from '@/api/auth';
import { daysLeft } from '@/lib/date';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/marketing/Wordmark';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { Avatar } from '@/ui/Avatar';
import { Badge } from '@/ui/Badge';
import { Button, IconButton } from '@/ui/Button';
import { Dropdown, DropdownItem } from '@/ui/Dropdown';
import { Modal } from '@/ui/Modal';

const navItems: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; cap?: Capability }[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/orders', label: 'Orders', icon: KanbanSquare },
  { to: '/app/products', label: 'Products', icon: Package },
  { to: '/app/links', label: 'Links', icon: Link2 },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/ai', label: 'AI Desk', icon: Bot, cap: 'ai' },
  { to: '/app/insights', label: 'Insights', icon: Sparkles },
  { to: '/app/broadcasts', label: 'Broadcasts', icon: Podcast, cap: 'broadcasts' },
  { to: '/app/invoices', label: 'Invoices', icon: FileText, cap: 'invoices' },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

// the four daily destinations get a native-style tab bar; the rest live behind "More"
const tabItems = navItems.filter((i) => ['/app', '/app/orders', '/app/products', '/app/ai'].includes(i.to));

function BottomTabs({ onMore }: { onMore: () => void }) {
  return (
    <nav
      aria-label="Primary"
      className="glass-nav fixed inset-x-0 bottom-0 z-40 flex pb-safe lg:hidden"
    >
      {tabItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-micro',
              isActive ? 'text-jade-ink' : 'text-low',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className="size-[22px]" aria-hidden strokeWidth={isActive ? 2.4 : 1.9} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
      <button
        onClick={onMore}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-low transition-colors duration-micro active:text-hi"
      >
        <Menu className="size-[22px]" aria-hidden strokeWidth={1.9} />
        More
      </button>
    </nav>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { data: sub } = useSubscription();
  const locked = (cap?: Capability) => !!cap && !!sub && !sub.capabilities.includes(cap);
  return (
    <nav aria-label="Workspace" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-micro',
              isActive
                ? 'panel text-jade-ink shadow-soft'
                : 'text-mid hover:bg-surface-2 hover:text-hi',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                // shared layout: the marker slides between items instead of
                // popping, matching the marketing nav's hover pill
                <motion.span
                  layoutId="appNavMarker"
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-jade-400"
                  transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                />
              )}
              <item.icon className="size-[18px] shrink-0" aria-hidden />
              {item.label}
              {locked(item.cap) && (
                <Lock className="ml-auto size-3.5 shrink-0 text-low" aria-label="Not on your plan" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function TrialBanner() {
  const { data: sub } = useSubscription();
  if (!sub) return null;
  const left = daysLeft(sub.endsAt);
  if (sub.status === 'trial') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-gold-400/12 px-4 py-2 text-center text-xs font-medium text-gold-ink">
        Trial — {left} {left === 1 ? 'day' : 'days'} left.
        <Link to="/app/billing" className="underline underline-offset-2 hover:text-gold-ink">
          Pick a plan
        </Link>
      </div>
    );
  }
  if (sub.status === 'expired' || left === 0) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-danger/12 px-4 py-2 text-center text-xs font-medium text-danger-ink">
        Your subscription has expired — your store is paused.
        <Link to="/app/billing" className="underline underline-offset-2">
          Renew now
        </Link>
      </div>
    );
  }
  return null;
}

/** Soft paywall — mounted by the 402 interceptor via ui store. */
function PaywallGate() {
  const { paywallOpen, setPaywall } = useUi();
  const navigate = useNavigate();
  return (
    <Modal open={paywallOpen} onClose={() => setPaywall(false)} title="Subscription needed">
      <p className="text-sm leading-relaxed text-mid">
        This part of CartHedge needs an active plan. Your data is safe — renew to pick up exactly where you
        left off.
      </p>
      <div className="mt-5 flex gap-3">
        <Button
          onClick={() => {
            setPaywall(false);
            navigate('/app/billing');
          }}
        >
          <Wallet className="size-4" />
          Renew subscription
        </Button>
        <Button variant="ghost" onClick={() => setPaywall(false)}>
          Not now
        </Button>
      </div>
    </Modal>
  );
}

export function AppShell() {
  const { businessName, businessCode } = useAuth();
  const { data: sub } = useSubscription();
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useScrollLock(mobileNav);

  const signOut = async () => {
    await logout();
    navigate('/app/login');
  };

  return (
    <div className="relative flex min-h-dvh">
      {/* faint workspace depth — focused, not loud */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(90%_60%_at_100%_0%,rgb(var(--jade-500)/0.06),transparent_60%),radial-gradient(70%_50%_at_0%_100%,rgb(var(--gold-400)/0.05),transparent_60%)]"
      />
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-surface/70 backdrop-blur-xl lg:flex">
        <div className="border-b px-5 py-4">
          <Link to="/app" aria-label="Dashboard">
            <Wordmark />
          </Link>
        </div>
        <NavList />
        <div className="border-t p-3">
          <Link
            to="/app/billing"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-mid transition-colors hover:bg-surface-2 hover:text-hi"
          >
            <Wallet className="size-4.5" aria-hidden />
            Billing
            {sub && <Badge tone={sub.status === 'trial' ? 'gold' : sub.status === 'expired' ? 'danger' : 'jade'} className="ml-auto">{sub.status}</Badge>}
          </Link>
        </div>
      </aside>

      {/* mobile nav drawer */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex lg:hidden"
          >
            <button aria-label="Close menu" className="absolute inset-0 bg-bg/60 backdrop-blur-md" onClick={() => setMobileNav(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="glass-nav relative flex h-full w-[17rem] max-w-[82vw] flex-col pb-safe pt-safe-t shadow-float"
            >
              <div className="flex items-center justify-between border-b px-5 py-4">
                <Wordmark />
                <IconButton label="Close menu" onClick={() => setMobileNav(false)}>
                  <X className="size-5" />
                </IconButton>
              </div>
              <NavList onNavigate={() => setMobileNav(false)} />
              <div className="border-t p-3">
                <Link
                  to="/app/billing"
                  onClick={() => setMobileNav(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-mid"
                >
                  <Wallet className="size-4.5" aria-hidden />
                  Billing
                  {sub && <Badge tone={sub.status === 'trial' ? 'gold' : sub.status === 'expired' ? 'danger' : 'jade'} className="ml-auto">{sub.status}</Badge>}
                </Link>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <TrialBanner />
        <header className="glass-nav scroll-edge sticky top-0 z-30 flex items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-hi">{businessName}</p>
            <p className="font-mono text-xs text-low">/{businessCode}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Dropdown
              trigger={<Avatar name={businessName ?? 'Seller'} />}
            >
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

        {/* no p-* shorthand below: sm:p-6 would out-cascade the tab-bar clearance on tablets */}
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:pb-6"
        >
          <Outlet />
        </motion.main>
      </div>
      <BottomTabs onMore={() => setMobileNav(true)} />
      <PaywallGate />
    </div>
  );
}
