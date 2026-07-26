import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  FileEdit,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Receipt,
  X,
} from 'lucide-react';
import { useAdminAuth } from '@/store/adminAuth';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/cn';
import { Wordmark } from '@/marketing/Wordmark';
import { ThemeToggle } from '@/ui/ThemeToggle';
import { IconButton } from '@/ui/Button';
import { Badge } from '@/ui/Badge';

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
  { to: '/admin/plans', label: 'Plans', icon: Layers },
  { to: '/admin/requests', label: 'Plan requests', icon: Inbox },
  { to: '/admin/payments', label: 'Payments', icon: Receipt },
  { to: '/admin/site', label: 'Site content', icon: FileEdit },
  { to: '/admin/account', label: 'Account', icon: KeyRound },
];

export function AdminShell() {
  const { name, clear } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useScrollLock(open);

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-micro',
              isActive ? 'panel text-gold-500 shadow-soft' : 'text-mid hover:bg-surface-2 hover:text-hi',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span aria-hidden className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold-400" />
              )}
              <item.icon className="size-[18px] shrink-0" aria-hidden />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="relative flex min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(90%_60%_at_100%_0%,rgb(var(--gold-400)/0.06),transparent_60%),radial-gradient(60%_50%_at_0%_100%,rgb(var(--jade-500)/0.04),transparent_60%)]"
      />
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-surface/70 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <Wordmark />
          <Badge tone="gold">Admin</Badge>
        </div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-bg/60 backdrop-blur-md" onClick={() => setOpen(false)} />
          <aside className="glass-nav relative flex h-full w-[17rem] max-w-[82vw] flex-col pb-safe pt-safe-t shadow-float">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <Wordmark />
              <IconButton label="Close menu" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </IconButton>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-nav sticky top-0 z-30 flex items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </IconButton>
          <p className="truncate text-sm font-medium text-hi">{name}</p>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <IconButton
              label="Sign out"
              onClick={() => {
                clear();
                navigate('/admin/login');
              }}
            >
              <LogOut className="size-4.5" />
            </IconButton>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
