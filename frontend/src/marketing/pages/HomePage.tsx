import { Seo, organizationJsonLd } from '@/lib/seo';
import { guides } from '@/strings/marketing';
import { useLenis } from '../useLenis';
import { MarketingBackground } from '../MarketingBackground';
import { MarketingNav } from '../MarketingNav';
import { Strand } from '../Strand';
import { Footer } from '../Footer';
import { LampStrand } from '@/ui/LaneGround';
import { Hero } from '../sections/Hero';
import { Problem } from '../sections/Problem';
import { Autopilot } from '../sections/Autopilot';
import { Languages } from '../sections/Languages';
import { OrderJourney } from '../sections/OrderJourney';
import { StorefrontPreview } from '../sections/StorefrontPreview';
import { FeaturesBento } from '../sections/FeaturesBento';
import { RtoCalculator } from '../sections/RtoCalculator';
import { Pricing } from '../sections/Pricing';
import { Testimonials } from '../sections/Testimonials';
import { Guides } from '../sections/TrustAndGuides';
import { FinalCta } from '../sections/FinalCta';

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: guides.faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function HomePage() {
  useLenis();
  return (
    <div className="grain relative">
      <Seo
        title="CartHedge | AI sales assistant and order desk for Instagram & WhatsApp sellers"
        description="CartHedge answers every buyer DM in seconds from your catalog, closes the order in the chat, and gives you a no-signup storefront, order board and COD confirmation. 15-day free trial."
        path="/"
        jsonLd={[organizationJsonLd, faqJsonLd]}
      />
      <MarketingBackground />
      {/* the strand the app hangs over every working surface, strung across the top of the page */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-14">
        <LampStrand />
      </div>
      <MarketingNav />
      <Strand />
      <main>
        <Hero />
        <Problem />
        <Autopilot />
        <Languages />
        <OrderJourney />
        <StorefrontPreview />
        <FeaturesBento />
        <RtoCalculator />
        <Pricing />
        <Testimonials />
        <Guides />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
