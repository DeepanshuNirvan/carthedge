import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';

const icons = {
  success: <CheckCircle2 className="size-5 text-jade-ink" />,
  error: <AlertCircle className="size-5 text-danger-ink" />,
  info: <Info className="size-5 text-info-ink" />,
};

const accent = {
  success: 'before:bg-jade-500',
  error: 'before:bg-danger',
  info: 'before:bg-info',
};

export function Toaster() {
  const { toasts, dismissToast } = useUi();
  return (
    /* on mobile toasts clear the tab bar / sticky buy bar; on desktop they tuck into the corner */
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex flex-col gap-2.5 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-full sm:max-w-sm"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'glass sheen pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg p-4 pl-5 shadow-float',
              'before:absolute before:inset-y-2 before:left-1.5 before:w-1 before:rounded-full',
              accent[t.kind],
            )}
          >
            {icons[t.kind]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-hi">{t.title}</p>
              {t.message && <p className="mt-0.5 text-sm text-mid">{t.message}</p>}
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
              className="text-low transition-colors hover:text-hi"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
