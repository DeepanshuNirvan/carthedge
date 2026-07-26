import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useScrollLock } from '@/hooks/useScrollLock';
import { IconButton } from './Button';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
};

function useEscape(open: boolean, onClose: () => void) {
  useScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

const scrim = 'absolute inset-0 bg-bg/60 backdrop-blur-md';

/** Flick a sheet past the threshold (or fast enough) to dismiss it. */
const shouldDismiss = (info: PanInfo, axis: 'x' | 'y') =>
  info.offset[axis] > 110 || info.velocity[axis] > 700;

/** Thumb target that starts the drag — the only place a sheet gesture begins,
 *  so scrolling the sheet body never fights the dismissal. */
function Grabber({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      aria-hidden
      onPointerDown={onPointerDown}
      className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing sm:hidden"
    >
      <span className="h-1 w-9 rounded-full bg-low/40" />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  useEscape(open, onClose);
  const drag = useDragControls();
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
              'glass sheen relative flex max-h-[92dvh] w-full flex-col rounded-t-xl shadow-float sm:rounded-xl',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
            )}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => shouldDismiss(info, 'y') && onClose()}
          >
            <Grabber onPointerDown={(e) => drag.start(e)} />
            {title && (
              <div className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3 sm:py-4">
                <h2 className="font-display text-lg font-semibold tracking-tight text-hi">{title}</h2>
                <IconButton label="Close" onClick={onClose}>
                  <X className="size-[18px]" />
                </IconButton>
              </div>
            )}
            <div className="overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
              {children}
            </div>
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
  const drag = useDragControls();
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
            drag={fromRight ? 'x' : 'y'}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={fromRight ? { left: 0, right: 0.55 } : { top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => shouldDismiss(info, fromRight ? 'x' : 'y') && onClose()}
          >
            {!fromRight && <Grabber onPointerDown={(e) => drag.start(e)} />}
            <div
              onPointerDown={(e) => fromRight && drag.start(e)}
              className={cn(
                'flex shrink-0 items-center justify-between gap-4 border-b px-5 py-4',
                fromRight && 'touch-pan-y',
              )}
            >
              <h2 className="truncate font-display text-lg font-semibold tracking-tight text-hi">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <X className="size-[18px]" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
