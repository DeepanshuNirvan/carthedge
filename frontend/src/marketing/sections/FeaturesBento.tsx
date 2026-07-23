import {
  Bell,
  Bot,
  ClipboardCheck,
  FileText,
  KanbanSquare,
  Link2,
  MessageCircle,
  Podcast,
  Radio,
  ShieldCheck,
  Tags,
  Truck,
  Users,
} from 'lucide-react';
import { features } from '@/strings/marketing';
import { Section, SectionHead, Reveal } from '../Section';
import { Badge } from '@/ui/Badge';
import { cn } from '@/lib/cn';

const icons = [MessageCircle, KanbanSquare, Link2, ShieldCheck, Podcast, Tags, Users, Bell, Truck, ClipboardCheck, FileText, Bot, Radio];

// bento rhythm: the two anchor features span two columns and carry a jade wash
const wide = new Set(['capture', 'cod']);

function spotlight(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
}

export function FeaturesBento() {
  return (
    <Section id="features">
      <SectionHead eyebrow={features.eyebrow} title={features.title} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.items.map((item, i) => {
          const Icon = icons[i];
          const isWide = wide.has(item.key);
          return (
            <Reveal key={item.key} delay={(i % 4) * 0.05} className={cn(isWide && 'sm:col-span-2')}>
              <article
                onMouseMove={spotlight}
                className={cn(
                  'spotlight group relative h-full overflow-hidden rounded-lg p-6 transition-transform duration-std ease-enter hover:-translate-y-1',
                  isWide ? 'glass sheen shadow-float' : 'panel shadow-soft',
                )}
              >
                {isWide && (
                  <div
                    aria-hidden
                    className="absolute inset-0 -z-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgb(var(--jade-500)/0.14),transparent_55%)]"
                  />
                )}
                <div className="relative flex items-start justify-between">
                  <span
                    className={cn(
                      'flex size-11 items-center justify-center rounded-md transition-colors duration-std',
                      isWide ? 'bg-jade-500/18 text-jade-300' : 'neu text-jade-400 group-hover:text-jade-300',
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {item.badge && <Badge tone="gold">{item.badge}</Badge>}
                </div>
                <h3 className={cn('relative mt-4 font-display font-semibold text-hi', isWide ? 'text-xl' : 'text-lg')}>
                  {item.title}
                </h3>
                <p className="relative mt-1.5 max-w-md text-sm leading-relaxed text-mid">{item.copy}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
