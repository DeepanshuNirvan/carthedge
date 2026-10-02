import { useRef, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * 3D inclination for the prime calls to action: the control leans toward the
 * pointer and a highlight follows it across the surface. Pure style writes on
 * pointermove (the rect is read once on enter), no React state per frame.
 * Touch and reduced-motion users get a flat, ordinary control.
 */
export function Tilt({ children, className, max = 9 }: { children: ReactNode; className?: string; max?: number }) {
  const el = useRef<HTMLSpanElement>(null);
  const rect = useRef<DOMRect | null>(null);

  const allowed = () =>
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onEnter = (e: PointerEvent<HTMLSpanElement>) => {
    if (!allowed()) return;
    rect.current = e.currentTarget.getBoundingClientRect();
  };
  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    const r = rect.current;
    const node = el.current;
    if (!r || !node) return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    node.style.transform = `perspective(520px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max * 1.4}deg) translateZ(0)`;
    node.style.setProperty('--tx', `${px * 100}%`);
    node.style.setProperty('--ty', `${py * 100}%`);
  };
  const onLeave = () => {
    rect.current = null;
    if (el.current) el.current.style.transform = '';
  };

  return (
    <span
      ref={el}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        'group/tilt relative inline-flex transition-transform duration-std ease-enter [transform-style:preserve-3d] will-change-transform',
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-std [background:radial-gradient(90px_circle_at_var(--tx,50%)_var(--ty,50%),rgb(255_255_255/0.32),transparent_70%)] [@media(hover:hover)]:group-hover/tilt:opacity-100"
      />
    </span>
  );
}
