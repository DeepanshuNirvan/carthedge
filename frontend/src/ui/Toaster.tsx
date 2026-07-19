import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/cn';

const icons = {
  success: <CheckCircle2 className="size-5 text-jade-500" />,
  error: <AlertCircle className="size-5 text-danger" />,
  info: <Info className="size-5 text-info" />,
};

export function Toaster() {
  const { toasts, dismissToast } = useUi();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg bg-surface p-4 shadow-raised hairline',
            )}
          >
            {icons[t.kind]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-hi">{t.title}</p>
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
