import { features } from '@/strings/marketing';
import { Badge } from '@/ui/Badge';
import { RevealGroup, RevealItem, SectionHead } from '../Section';

/**
 * Everything that is not an automation, set as a ledger: the job on the left,
 * what CartHedge does for it on the right. Words carry it, no icon tiles.
 */
export function FeaturesBento() {
  return (
    <section id="features" className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
      <SectionHead title={features.title} />
      <div className="flex flex-col">
        {features.groups.map((group) => (
          <RevealGroup
            key={group.title}
            className="grid gap-x-10 gap-y-5 border-t py-8 first:border-t-0 first:pt-0 lg:grid-cols-[13rem_1fr] lg:py-10"
          >
            <RevealItem>
              <h3 className="text-d4 font-semibold text-hi lg:sticky lg:top-28">{group.title}</h3>
            </RevealItem>
            <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {group.items.map((item) => (
                <RevealItem key={item.key}>
                  <dt className="flex flex-wrap items-center gap-2 text-[16px] font-semibold tracking-snug text-hi">
                    {item.title}
                    {'badge' in item && item.badge && <Badge tone="gold">{item.badge}</Badge>}
                  </dt>
                  <dd className="mt-1.5 max-w-[42ch] text-[14.5px] leading-relaxed text-mid">{item.copy}</dd>
                </RevealItem>
              ))}
            </dl>
          </RevealGroup>
        ))}
      </div>
    </section>
  );
}
