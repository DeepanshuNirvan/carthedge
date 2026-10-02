import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Building2, FileEdit, Inbox, KeyRound, LayoutDashboard, Layers, LogOut, Menu, Receipt } from 'lucide-react';
import { useAdminAuth } from '@/store/adminAuth';
import { cn } from '@/lib/cn';
import { LogoMark } from '@/marketing/Wordmark';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { IconButton } from '@/ui/Button';
import { LaneGround } from '@/ui/LaneGround';
import { Sheet } from '@/ui/Modal';

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
  { to: '/admin/plans', label: 'Plans', icon: Layers },
  { to: '/admin/requests', label: 'Plan requests', icon: Inbox },
  { to: '/admin/payments', label: 'Payments', icon: Receipt },
  { to: '/admin/site', label: 'Site content', icon: FileEdit },
  { to: '/admin/account', label: 'Account', icon: KeyRound },
];

function Nav({ onNavigate, pillId }: { onNavigate?: () => void; pillId: string }) {
  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative flex min-h-11 items-center gap-3 rounded-full px-3 text-[13.5px] font-medium transition-colors duration-micro',
              isActive ? 'text-hi' : 'text-mid hover:bg-[rgb(var(--field)/0.05)] hover:text-hi',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId={pillId}
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[rgb(var(--field)/0.08)] shadow-[inset_0_0_0_1px_rgb(var(--line)/var(--line-a))]"
                  transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                />
              )}
              <item.icon className={cn('relative size-[18px] shrink-0', isActive && 'text-gold-ink')} aria-hidden />
              <span className="relative">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Staff console: the seller app's shell, with gold standing in for jade so nobody mistakes one for the other. */
export function AdminShell() {
  const { name, clear } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const signOut = () => {
    clear();
    navigate('/admin/login');
  };

  return (
    <div className="relative flex min-h-dvh">
      <LaneGround />
      <aside className="sticky top-0 hidden h-dvh w-[15rem] shrink-0 p-3 pr-0 lg:block">
        <div className="glass-nav sheen flex h-full flex-col rounded-xl">
          <div className="flex items-center gap-2.5 border-b px-4 py-3.5">
            <LogoMark size={30} />
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold tracking-snug text-hi">CartHedge</p>
              <p className="text-[11px] font-medium text-gold-ink">Platform console</p>
            </div>
          </div>
          <Nav pillId="adminNavPill" />
          <div className="border-t p-2.5">
            <button
              onClick={signOut}
              className="flex min-h-10 w-full items-center gap-3 rounded-full px-3 text-[13.5px] font-medium text-mid transition-colors hover:bg-[rgb(var(--field)/0.05)] hover:text-hi"
            >
              <LogOut className="size-[18px]" aria-hidden /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <Sheet open={open} onClose={() => setOpen(false)} title="Console" side="bottom">
        <div className="-mx-2.5 -my-4">
          <Nav onNavigate={() => setOpen(false)} pillId="adminSheetPill" />
        </div>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-bar scroll-edge sticky top-0 z-30 flex items-center gap-2 px-4 lg:after:hidden pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] sm:px-6 lg:top-3 lg:mx-3 lg:mt-3 lg:rounded-xl lg:pb-2 lg:pt-2 lg:shadow-[inset_0_0_0_1px_rgb(var(--line)/var(--glass-rim-a)),var(--shadow-soft)]">
          <IconButton label="Open menu" className="-ml-2 lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </IconButton>
          <span className="flex min-w-0 items-center gap-2 lg:hidden">
            <LogoMark size={24} />
            <span className="truncate text-sm font-semibold text-hi">Console</span>
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden truncate text-[13px] text-low sm:block">{name}</span>
            <ThemeToggle />
            <IconButton label="Sign out" onClick={signOut}>
              <LogOut className="size-[18px]" />
            </IconButton>
          </div>
        </header>
        <motion.main
          key={location.pathname}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          className="mx-auto w-full min-w-0 max-w-[90rem] flex-1 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pt-4"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
