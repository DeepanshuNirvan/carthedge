import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-semibold tracking-tight text-hi sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-mid">{subtitle}</p>}
      </div>
      {/* actions stack to full width on phones so nothing gets squeezed to 40px */}
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:max-sm:flex-1">{actions}</div>}
    </div>
  );
}
