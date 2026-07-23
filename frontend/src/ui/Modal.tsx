import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
};

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
}

const scrim =
  'absolute inset-0 bg-[rgb(var(--bg))/0.55] backdrop-blur-md';

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.button
            aria-label="Close"
            className={scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className={cn(
              'glass sheen relative max-h-[92dvh] w-full overflow-y-auto rounded-t-xl shadow-float sm:rounded-xl',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
            )}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {title && (
              <div className="glass-nav sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4">
                <h2 className="font-display text-lg font-semibold tracking-tight text-hi">{title}</h2>
                <IconButton label="Close" onClick={onClose}>
                  <X className="size-[18px]" />
                </IconButton>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Side drawer on desktop, bottom sheet on mobile — order details & buyer checkout. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  side = 'right',
}: ModalProps & { side?: 'right' | 'bottom' }) {
  useEscape(open, onClose);
  const fromRight = side === 'right';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-50 flex', fromRight ? 'justify-end' : 'items-end justify-center')}>
          <motion.button
            aria-label="Close"
            className={scrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className={cn(
              'glass sheen relative flex flex-col overflow-hidden shadow-float',
              fromRight
                ? 'h-dvh w-full max-w-xl sm:rounded-l-2xl'
                : 'max-h-[94dvh] w-full max-w-2xl rounded-t-2xl',
            )}
            initial={fromRight ? { x: '100%' } : { y: '100%' }}
            animate={{ x: 0, y: 0 }}
            exit={fromRight ? { x: '100%' } : { y: '100%' }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-hi">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <X className="size-[18px]" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
