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
import { useSubscription } from '@/api/plans';
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

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/orders', label: 'Orders', icon: KanbanSquare },
  { to: '/app/products', label: 'Products', icon: Package },
  { to: '/app/links', label: 'Links', icon: Link2 },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/ai', label: 'AI Desk', icon: Bot },
  { to: '/app/insights', label: 'Insights', icon: Sparkles },
  { to: '/app/broadcasts', label: 'Broadcasts', icon: Podcast },
  { to: '/app/invoices', label: 'Invoices', icon: FileText },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
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
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-micro',
              isActive ? 'bg-jade-500/12 text-jade-500' : 'text-mid hover:bg-surface-2 hover:text-hi',
            )
          }
        >
          <item.icon className="size-4.5 shrink-0" aria-hidden />
          {item.label}
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
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-gold-400/12 px-4 py-2 text-center text-xs font-medium text-gold-500">
        Trial — {left} {left === 1 ? 'day' : 'days'} left.
        <Link to="/app/billing" className="underline underline-offset-2 hover:text-gold-400">
          Pick a plan
        </Link>
      </div>
    );
  }
  if (sub.status === 'expired' || left === 0) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-danger/12 px-4 py-2 text-center text-xs font-medium text-danger">
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

  const signOut = async () => {
    await logout();
    navigate('/app/login');
  };

  return (
    <div className="flex min-h-dvh">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-surface lg:flex">
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
            <button aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setMobileNav(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex h-full w-64 flex-col bg-surface shadow-raised"
            >
              <div className="flex items-center justify-between border-b px-5 py-4">
                <Wordmark />
                <IconButton label="Close menu" onClick={() => setMobileNav(false)}>
                  <X className="size-5" />
                </IconButton>
              </div>
              <NavList onNavigate={() => setMobileNav(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <TrialBanner />
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-bg/85 px-4 py-3 backdrop-blur sm:px-6">
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileNav(true)}>
            <Menu className="size-5" />
          </IconButton>
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

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="min-w-0 flex-1 p-4 sm:p-6"
        >
          <Outlet />
        </motion.main>
      </div>
      <PaywallGate />
    </div>
  );
}
