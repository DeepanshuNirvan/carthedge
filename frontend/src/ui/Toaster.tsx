import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUi } from '@/store/ui';

const icons = {
  success: <CheckCircle2 className="size-[18px] text-jade-ink" />,
  error: <AlertCircle className="size-[18px] text-danger-ink" />,
  info: <Info className="size-[18px] text-info-ink" />,
};

const wells = {
  success: 'bg-jade-500/14',
  error: 'bg-danger/14',
  info: 'bg-info/14',
};

export function Toaster() {
  const { toasts, dismissToast } = useUi();
  return (
    /* on mobile toasts clear the tab bar / sticky buy bar; on desktop they tuck into the corner */
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-full sm:max-w-sm sm:items-stretch"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 18, scale: 0.94, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-nav sheen pointer-events-auto relative flex w-full items-start gap-3 rounded-xl p-3 pr-2 shadow-float"
          >
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${wells[t.kind]}`}>
              {icons[t.kind]}
            </span>
            <div className="min-w-0 flex-1 py-0.5">
              <p className="text-[14px] font-semibold tracking-snug text-hi">{t.title}</p>
              {t.message && <p className="mt-0.5 text-[13px] leading-snug text-mid">{t.message}</p>}
            </div>
            <button
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-low transition-colors hover:bg-[rgb(var(--field)/0.08)] hover:text-hi"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
