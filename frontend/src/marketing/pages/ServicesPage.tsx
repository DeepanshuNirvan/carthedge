import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { hero as homeHero, services } from '@/strings/marketing';
import { cn } from '@/lib/cn';
import { buttonLink } from '@/ui/buttonLink';
import { Tilt } from '@/ui/Tilt';
import { MarketingBackground } from '../MarketingBackground';
import { MarketingNav } from '../MarketingNav';
import { Footer } from '../Footer';
import { FaqList } from '../FaqList';
import { Reveal, RevealGroup, RevealItem, SectionHead } from '../Section';
import { ServiceChat } from '../sections/ServiceChat';
import { Steps } from '../sections/TrustAndGuides';
import { FinalCta } from '../sections/FinalCta';

const ease = [0.16, 1, 0.3, 1] as const;
/** Signup opens already set to services, so the first screen a visitor sees matches this page. */
const signup = '/app/register?sells=services';
const section = 'relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20';

// title, description and the FAQ schema match what the server injects for
// crawlers (internal/web servicesMeta); the questions are the ones rendered below
export default function ServicesPage() {
  const reduced = useReducedMotion();
  const { hero, demo, steps, never, fits, faqs, faqTitle, final, seo } = services;

  return (
    <div className="grain relative">
      <Seo
        title={seo.title}
        description={seo.description}
        path="/services"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <MarketingBackground />
      <MarketingNav />
      <main>
        <section className="relative mx-auto w-full max-w-6xl px-5 pb-6 pt-[calc(8.5rem+env(safe-area-inset-top))] sm:px-8 lg:pt-36">
          <h1 className="max-w-[20ch] text-hero font-semibold">
            {[hero.title, hero.titleAccent].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-1">
                <motion.span
                  className={cn('block', i === 0 ? 'text-hi' : 'text-mid')}
                  initial={reduced ? false : { y: '106%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.95, delay: 0.08 + i * 0.12, ease }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease }}
            className="mt-6 flex flex-col gap-7 lg:mt-7 lg:flex-row lg:items-end lg:justify-between"
          >
            <p className="max-w-[50ch] text-lead leading-relaxed text-mid sm:text-lg">{hero.sub}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Tilt className="w-full sm:w-auto">
                <Link to={signup} className={cn(buttonLink('primary', 'lg'), 'w-full sm:w-auto')}>
                  {hero.ctaPrimary}
                  <ArrowRight className="size-4 transition-transform duration-std ease-spring group-hover:translate-x-0.5" />
                </Link>
              </Tilt>
              <a href="#demo" className={buttonLink('glass', 'lg')}>
                {hero.ctaSecondary}
              </a>
            </div>
          </motion.div>
          <p className="mt-4 text-note text-low">{homeHero.trial}</p>
        </section>

        <section id="demo" className={cn(section, 'scroll-mt-20')}>
          <SectionHead title={demo.title} sub={demo.sub} />
          <Reveal>
            <ServiceChat />
          </Reveal>
        </section>

        <section className={section}>
          <SectionHead title={steps.title} />
          <Steps items={steps.items} />
        </section>

        <section className={section}>
          <SectionHead title={never.title} sub={never.sub} />
          {/* a ledger, not a row of cards: four plain promises under one rule */}
          <RevealGroup className="grid gap-x-10 gap-y-8 border-t pt-10 sm:grid-cols-2">
            {never.items.map((item) => (
              <RevealItem key={item.title}>
                <h3 className="text-base font-semibold tracking-snug text-hi">{item.title}</h3>
                <p className="mt-1.5 max-w-[46ch] text-copy leading-relaxed text-mid">{item.copy}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <section className={section}>
          <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <h2 className="max-w-[18ch] text-d3 font-semibold text-hi">{fits.title}</h2>
            <p className="max-w-[58ch] text-base leading-relaxed text-mid sm:text-lg">{fits.copy}</p>
          </Reveal>
        </section>

        <section className={section}>
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <Reveal>
              <h2 className="max-w-[16ch] text-d3 font-semibold text-hi">{faqTitle}</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <FaqList faqs={faqs} />
            </Reveal>
          </div>
        </section>

        <FinalCta title={final.title} sub={final.sub} cta={final.cta} to={signup} />
      </main>
      <Footer />
    </div>
  );
}
