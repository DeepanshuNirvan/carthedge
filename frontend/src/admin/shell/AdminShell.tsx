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

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-0.5 px-3 py-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-micro',
              isActive ? 'bg-gold-400/12 text-gold-500' : 'text-mid hover:bg-surface-2 hover:text-hi',
            )
          }
        >
          <item.icon className="size-4.5 shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r bg-surface lg:flex">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <Wordmark />
          <Badge tone="gold">Admin</Badge>
        </div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-surface shadow-raised">
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-bg/85 px-4 py-3 backdrop-blur sm:px-6">
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </IconButton>
          <p className="text-sm font-medium text-hi">{name}</p>
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
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
