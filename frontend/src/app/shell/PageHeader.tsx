import type { ReactNode } from 'react';

/** iOS large title: the page name set big and tight, its one-line context under it, actions to the right. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-hi sm:text-[2rem]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[60ch] text-sm text-mid">{subtitle}</p>}
      </div>
      {/* actions stack to full width on phones so nothing gets squeezed */}
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:max-sm:grow">{actions}</div>}
    </div>
  );
}
