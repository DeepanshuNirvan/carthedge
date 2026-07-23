import { Seo, organizationJsonLd } from '@/lib/seo';
import { guides } from '@/strings/marketing';
import { useLenis } from '../useLenis';
import { MarketingBackground } from '../MarketingBackground';
import { MarketingNav } from '../MarketingNav';
import { Footer } from '../Footer';
import { Hero } from '../sections/Hero';
import { Problem } from '../sections/Problem';
import { CoreLoop } from '../sections/CoreLoop';
import { AiDemo } from '../sections/AiDemo';
import { RtoCalculator } from '../sections/RtoCalculator';
import { FeaturesBento } from '../sections/FeaturesBento';
import { StorefrontPreview } from '../sections/StorefrontPreview';
import { Pricing } from '../sections/Pricing';
import { Trust, Guides } from '../sections/TrustAndGuides';
import { Testimonials } from '../sections/Testimonials';
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
    <div className="grain">
      <Seo
        title="CartHedge — The AI order desk for Instagram & WhatsApp sellers"
        description="CartHedge reads your DMs, drafts orders, cuts COD losses with RTO protection, and gives every seller a no-signup storefront. 15-day free trial."
        path="/"
        jsonLd={[organizationJsonLd, faqJsonLd]}
      />
      <MarketingBackground />
      <MarketingNav />
      <main>
        <Hero />
        <Problem />
        <CoreLoop />
        <AiDemo />
        <RtoCalculator />
        <FeaturesBento />
        <StorefrontPreview />
        <Pricing />
        <Trust />
        <Guides />
        <Testimonials />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
