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

// bento rhythm: featured tiles span 2 columns on desktop
const wide = new Set(['capture', 'cod']);

export function FeaturesBento() {
  return (
    <Section id="features">
      <SectionHead eyebrow={features.eyebrow} title={features.title} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.items.map((item, i) => {
          const Icon = icons[i];
          return (
            <Reveal key={item.key} delay={(i % 4) * 0.05} className={cn(wide.has(item.key) && 'sm:col-span-2')}>
              <article className="group relative h-full overflow-hidden rounded-lg bg-surface p-6 shadow-soft hairline transition-transform duration-std ease-enter hover:-translate-y-1">
                <div
                  aria-hidden
                  className="absolute -right-10 -top-10 size-28 rounded-full bg-jade-500/0 blur-2xl transition-colors duration-expr group-hover:bg-jade-500/15"
                />
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-md bg-surface-2 text-jade-500 transition-colors duration-std group-hover:bg-jade-500/12">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {item.badge && <Badge tone="gold">{item.badge}</Badge>}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-hi">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mid">{item.copy}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
